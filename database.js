const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, 'school_ranking.db');
    this.init();
  }

  init() {
    try {
      // Create database file if it doesn't exist
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ Database initialization failed:', err);
          return;
        }
        console.log('✅ Database initialized successfully');
        
        // Add error handler to catch missing column errors gracefully
        this.db.on('error', (err) => {
          if (err && err.message && err.message.includes('no such column: vote_date')) {
            console.log('⚠️ vote_date column not found, triggering migration...');
            // Trigger migration if column is missing
            this.migrateVotesTable().catch(migrationErr => {
              console.error('❌ Migration failed after error:', migrationErr);
            });
          } else {
            console.error('❌ Database error:', err);
          }
        });
        
        this.createTables();
      });
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  createTables() {
    try {
      // Create votes table
      const createVotesTable = `
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          school_id TEXT NOT NULL,
          school_name TEXT NOT NULL,
          school_region TEXT NOT NULL,
          school_level TEXT NOT NULL,
          voter_ip TEXT NOT NULL,
          voter_user_agent TEXT,
          vote_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          vote_date DATE,
          week_start DATE NOT NULL
        )
      `;

      // Create indexes for better performance (excluding vote_date - will be created after migration)
      const createIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_votes_school_id ON votes(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_votes_week_start ON votes(week_start)',
        'CREATE INDEX IF NOT EXISTS idx_votes_voter_ip ON votes(voter_ip)',
        'CREATE INDEX IF NOT EXISTS idx_votes_school_region ON votes(school_region)',
        'CREATE INDEX IF NOT EXISTS idx_votes_school_level ON votes(school_level)',
        'CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(vote_timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_votes_ip_week ON votes(voter_ip, week_start)'
      ];

      // Create school_badges table for achievements
      const createBadgesTable = `
        CREATE TABLE IF NOT EXISTS school_badges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          school_id TEXT NOT NULL,
          school_name TEXT NOT NULL,
          badge_type TEXT NOT NULL,
          badge_name TEXT NOT NULL,
          badge_description TEXT,
          earned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          UNIQUE(school_id, badge_type)
        )
      `;

      // Create indexes for badges
      const createBadgeIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_badges_school_id ON school_badges(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_badges_badge_type ON school_badges(badge_type)',
        'CREATE INDEX IF NOT EXISTS idx_badges_earned_date ON school_badges(earned_date)',
        'CREATE INDEX IF NOT EXISTS idx_badges_is_active ON school_badges(is_active)'
      ];

      // Create weekly_stats table for caching weekly vote counts
      const createWeeklyStatsTable = `
        CREATE TABLE IF NOT EXISTS weekly_stats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          school_id TEXT NOT NULL,
          school_name TEXT NOT NULL,
          school_region TEXT NOT NULL,
          school_level TEXT NOT NULL,
          week_start DATE NOT NULL,
          vote_count INTEGER DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(school_id, week_start)
        )
      `;

      const createWeeklyStatsIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_school_id ON weekly_stats(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_week_start ON weekly_stats(week_start)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_school_region ON weekly_stats(school_region)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_vote_count ON weekly_stats(vote_count)'
      ];

      // Execute table creation
      this.db.exec(createVotesTable);
      this.db.exec(createBadgesTable);
      this.db.exec(createWeeklyStatsTable);

      // Execute index creation (excluding vote_date indexes - created after migration)
      createIndexes.forEach(index => {
        try {
          this.db.exec(index);
        } catch (indexErr) {
          // Ignore index creation errors for columns that don't exist yet
          if (!indexErr.message || !indexErr.message.includes('no such column')) {
            console.warn('⚠️ Index creation warning:', indexErr.message);
          }
        }
      });
      createBadgeIndexes.forEach(index => this.db.exec(index));
      createWeeklyStatsIndexes.forEach(index => this.db.exec(index));

      console.log('✅ Database tables created successfully');
      
      // Migrate existing votes table to add vote_date column if it doesn't exist
      // Run migration synchronously by checking immediately
      this.migrateVotesTableImmediate().then(() => {
        console.log('✅ Database migration completed');
      }).catch((migrationError) => {
        console.warn('⚠️ Migration will run on-demand:', migrationError.message);
        // Continue - migration will happen on-demand when needed
      });
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
      throw error;
    }
  }

  // Get current week start (Monday)
  getCurrentWeekStart() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so -6 to get Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  }

  // Migrate votes table immediately (called during table creation)
  migrateVotesTableImmediate() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      // Check immediately if column exists
      this.db.all("PRAGMA table_info(votes)", (err, columns) => {
        if (err) {
          // Table might not exist yet, wait a bit and try again
          setTimeout(() => {
            this.migrateVotesTable().then(resolve).catch(reject);
          }, 200);
          return;
        }
        
        const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
        if (hasVoteDate) {
          console.log('✅ vote_date column already exists');
          resolve();
        } else {
          // Column doesn't exist, run migration
          this.migrateVotesTable().then(resolve).catch(reject);
        }
      });
    });
  }

  // Migrate votes table to add vote_date column (synchronous promise-based)
  migrateVotesTable() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        // Check if vote_date column exists
        this.db.all("PRAGMA table_info(votes)", (err, columns) => {
          if (err) {
            console.error('❌ Error checking votes table structure:', err);
            return reject(err);
          }
          
          const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
          
          if (!hasVoteDate) {
            console.log('🔄 Migrating votes table: adding vote_date column...');
            
            // Add vote_date column and populate it from vote_timestamp
            this.db.run(`
              ALTER TABLE votes ADD COLUMN vote_date DATE;
            `, (alterErr) => {
              if (alterErr) {
                console.error('❌ Error adding vote_date column:', alterErr);
                // If column already exists, continue anyway
                if (alterErr.message && alterErr.message.includes('duplicate column')) {
                  console.log('ℹ️ Column already exists, continuing...');
                  return resolve();
                }
                return reject(alterErr);
              }
              
              // Populate vote_date from vote_timestamp for existing rows
              this.db.run(`
                UPDATE votes 
                SET vote_date = COALESCE(DATE(vote_timestamp), DATE('now'))
                WHERE vote_date IS NULL;
              `, (updateErr) => {
                if (updateErr) {
                  console.error('❌ Error populating vote_date:', updateErr);
                  // Don't reject, column was added successfully
                } else {
                  console.log('✅ Migration completed: vote_date column added and populated');
                }
                
                // Create indexes on vote_date for better performance
                const voteDateIndexes = [
                  'CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(vote_date)',
                  'CREATE INDEX IF NOT EXISTS idx_votes_ip_date ON votes(voter_ip, vote_date)'
                ];
                
                let indexesCreated = 0;
                voteDateIndexes.forEach((indexQuery) => {
                  this.db.run(indexQuery, (indexErr) => {
                    if (indexErr) {
                      console.warn('⚠️ Could not create vote_date index:', indexErr);
                    }
                    indexesCreated++;
                    if (indexesCreated === voteDateIndexes.length) {
                      resolve();
                    }
                  });
                });
                
                // Handle case where no indexes need to be created
                if (voteDateIndexes.length === 0) {
                  resolve();
                }
              });
            });
          } else {
            console.log('✅ vote_date column already exists, no migration needed');
            resolve();
          }
        });
      } catch (error) {
        console.error('❌ Error during migration:', error);
        reject(error);
      }
    });
  }

  // Ensure vote_date column exists (safety check before queries)
  ensureVoteDateColumn() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      this.db.all("PRAGMA table_info(votes)", (err, columns) => {
        if (err) {
          console.error('❌ Error checking votes table:', err);
          return reject(err);
        }
        
        const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
        if (hasVoteDate) {
          resolve();
        } else {
          // Column doesn't exist, try to add it
          console.log('⚠️ vote_date column missing, attempting to add...');
          this.migrateVotesTable().then(resolve).catch(reject);
        }
      });
    });
  }

  // Get current date (YYYY-MM-DD format)
  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Get user vote status (daily and weekly limits)
  getUserVoteStatus(voterIp) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      // Ensure vote_date column exists before querying
      this.ensureVoteDateColumn().then(() => {
        // Double-check column exists after migration attempt
        this.db.all("PRAGMA table_info(votes)", (colErr, columns) => {
          if (colErr) {
            return reject(colErr);
          }
          
          const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
          const dateColumn = hasVoteDate ? 'vote_date' : 'DATE(vote_timestamp)';
          
          try {
            const weekStart = this.getCurrentWeekStart();
            const currentDate = this.getCurrentDate();
            
            // Check if user has voted today (using vote_date or DATE(vote_timestamp) as fallback)
            this.db.get(
              `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND ${dateColumn} = ?`,
              [voterIp, currentDate],
            (err, dailyRow) => {
            if (err) {
              console.error('❌ Error checking daily vote:', err);
              return reject(err);
            }
            
            const hasVotedToday = dailyRow.count > 0;
            const lastVoteDate = hasVotedToday ? currentDate : null;
            
            // Check total weekly votes
            this.db.get(
              'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND week_start = ?',
              [voterIp, weekStart],
              (err, weeklyRow) => {
                if (err) {
                  console.error('❌ Error checking weekly vote:', err);
                  return reject(err);
                }
                
                const weeklyVoteCount = weeklyRow.count || 0;
                const remainingWeeklyVotes = Math.max(0, 7 - weeklyVoteCount);
                const weeklyLimitReached = weeklyVoteCount >= 7;
                
                resolve({
                  hasVotedToday,
                  lastVoteDate,
                  weeklyVoteCount,
                  remainingWeeklyVotes,
                  weeklyLimitReached,
                  currentDate,
                  weekStart
                });
              }
            );
          }
        );
          } catch (error) {
            console.error('❌ Error getting user vote status:', error);
            reject(error);
          }
        });
      }).catch(reject);
    });
  }

  // Record a vote
  recordVote(schoolId, schoolName, schoolRegion, schoolLevel, voterIp, userAgent) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      // Ensure vote_date column exists before inserting
      this.ensureVoteDateColumn().then(() => {
        try {
          const weekStart = this.getCurrentWeekStart();
          const currentDate = this.getCurrentDate();
          
          // First check if user can vote (daily and weekly limits)
          this.getUserVoteStatus(voterIp).then(status => {
          // Check daily limit (1 vote per day)
          if (status.hasVotedToday) {
            return resolve({
              success: false,
              error: 'Daily limit reached',
              message: 'Vous avez déjà voté aujourd\'hui, veuillez revenir demain!',
              remainingVotes: status.remainingWeeklyVotes,
              hasVotedToday: true
            });
          }
          
          // Check weekly limit (7 votes per week total)
          if (status.weeklyLimitReached) {
            return resolve({
              success: false,
              error: 'Weekly limit reached',
              message: 'Vos votes hebdomadaires sont épuisés.',
              remainingVotes: 0,
              weeklyLimitReached: true
            });
          }

          // Check if vote_date column exists before inserting
          this.ensureVoteDateColumn().then(() => {
            // Check column existence after migration
            this.db.all("PRAGMA table_info(votes)", (colErr, columns) => {
              if (colErr) {
                return reject(colErr);
              }
              
              const hasVoteDateCol = columns && columns.some(col => col.name === 'vote_date');
              
              // Insert the vote with current date
              const insertQuery = hasVoteDateCol 
                ? 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_user_agent, vote_date, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                : 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_user_agent, week_start) VALUES (?, ?, ?, ?, ?, ?, ?)';
              
              const insertParams = hasVoteDateCol
                ? [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, userAgent, currentDate, weekStart]
                : [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, userAgent, weekStart];
              
              this.db.run(insertQuery, insertParams,
            function(err) {
              if (err) {
                console.error('❌ Error recording vote:', err);
                // Check if it's a duplicate vote error
                if (err.message && err.message.includes('UNIQUE')) {
                  return resolve({
                    success: false,
                    error: 'Duplicate vote',
                    message: 'Vous avez déjà voté pour cette école',
                    remainingVotes: status.remainingWeeklyVotes
                  });
                }
                return reject(err);
              }
              
              // Update weekly stats
              dbManager.updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart);

              // Get updated status after vote
              dbManager.getUserVoteStatus(voterIp).then(updatedStatus => {
                resolve({
                  success: true,
                  voteId: this.lastID,
                  remainingVotes: updatedStatus.remainingWeeklyVotes,
                  message: 'Vote enregistré avec succès',
                  hasVotedToday: true
                });
              }).catch(updateErr => {
                // Still return success even if status update fails
                resolve({
                  success: true,
                  voteId: this.lastID,
                  remainingVotes: status.remainingWeeklyVotes - 1,
                  message: 'Vote enregistré avec succès',
                  hasVotedToday: true
                });
              });
            }
          );
          }).catch(statusError => {
            console.error('❌ Error getting vote status:', statusError);
            reject(statusError);
          });
        } catch (error) {
          console.error('❌ Error recording vote:', error);
          reject(error);
        }
      }).catch(reject);
    });
  }

  // Update weekly statistics
  updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart) {
    try {
      this.db.run(
        `INSERT INTO weekly_stats (school_id, school_name, school_region, school_level, week_start, vote_count, last_updated)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(school_id, week_start) DO UPDATE SET
           vote_count = vote_count + 1,
           last_updated = CURRENT_TIMESTAMP`,
        [schoolId, schoolName, schoolRegion, schoolLevel, weekStart],
        (err) => {
          if (err) {
            console.error('❌ Error updating weekly stats:', err);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error updating weekly stats:', error);
    }
  }

  // Get top voted schools for a region and level
  getTopVotedSchools(region = null, level = null, limit = 10) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        let query = `
          SELECT 
            school_id,
            school_name,
            school_region,
            school_level,
            SUM(vote_count) as total_votes,
            COUNT(DISTINCT voter_ip) as unique_voters,
            MAX(last_updated) as last_vote_time
          FROM weekly_stats ws
          WHERE week_start = ?
        `;

        const params = [this.getCurrentWeekStart()];

        if (region && region !== 'all') {
          query += ' AND school_region = ?';
          params.push(region);
        }

        if (level && level !== 'all') {
          query += ' AND school_level = ?';
          params.push(level);
        }

        query += `
          GROUP BY school_id, school_name, school_region, school_level
          ORDER BY total_votes DESC, unique_voters DESC
          LIMIT ?
        `;
        params.push(limit);

        this.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('❌ Error fetching top voted schools:', err);
            return reject(err);
          }
          
          const schools = rows.map((school, index) => ({
            ...school,
            rank: index + 1,
            total_votes: parseInt(school.total_votes),
            unique_voters: parseInt(school.unique_voters)
          }));
          
          resolve({
            success: true,
            schools: schools,
            week_start: this.getCurrentWeekStart()
          });
        });
      } catch (error) {
        console.error('❌ Error fetching top voted schools:', error);
        reject(error);
      }
    });
  }

  // Get vote statistics for a school
  getSchoolVoteStats(schoolId) {
    return new Promise((resolve, reject) => {
      try {
        const weekStart = this.getCurrentWeekStart();
        
        // Get current week stats
        this.db.get(
          'SELECT SUM(vote_count) as total_votes, COUNT(DISTINCT voter_ip) as unique_voters FROM weekly_stats WHERE school_id = ? AND week_start = ?',
          [schoolId, weekStart],
          (err, currentWeekStats) => {
            if (err) {
              console.error('❌ Error fetching current week stats:', err);
              return reject(err);
            }

            // Get all-time stats
            this.db.get(
              'SELECT COUNT(*) as total_votes, COUNT(DISTINCT voter_ip) as unique_voters, COUNT(DISTINCT week_start) as weeks_participated FROM votes WHERE school_id = ?',
              [schoolId],
              (err, allTimeStats) => {
                if (err) {
                  console.error('❌ Error fetching all-time stats:', err);
                  return reject(err);
                }

                // Get regional ranking
                this.db.get(
                  'SELECT school_region, school_level FROM votes WHERE school_id = ? LIMIT 1',
                  [schoolId],
                  (err, schoolInfo) => {
                    if (err) {
                      console.error('❌ Error fetching school info:', err);
                      return reject(err);
                    }

                    let regionalRank = null;
                    if (schoolInfo) {
                      this.db.all(
                        'SELECT school_id, SUM(vote_count) as total_votes FROM weekly_stats WHERE school_region = ? AND school_level = ? AND week_start = ? GROUP BY school_id ORDER BY total_votes DESC',
                        [schoolInfo.school_region, schoolInfo.school_level, weekStart],
                        (err, regionalStats) => {
                          if (err) {
                            console.error('❌ Error fetching regional stats:', err);
                            return reject(err);
                          }

                          const rankIndex = regionalStats.findIndex(school => school.school_id === schoolId);
                          regionalRank = rankIndex >= 0 ? rankIndex + 1 : null;

                          resolve({
                            success: true,
                            current_week: {
                              total_votes: parseInt(currentWeekStats.total_votes) || 0,
                              unique_voters: parseInt(currentWeekStats.unique_voters) || 0
                            },
                            all_time: {
                              total_votes: parseInt(allTimeStats.total_votes) || 0,
                              unique_voters: parseInt(allTimeStats.unique_voters) || 0,
                              weeks_participated: parseInt(allTimeStats.weeks_participated) || 0
                            },
                            regional_rank: regionalRank
                          });
                        }
                      );
                    } else {
                      resolve({
                        success: true,
                        current_week: {
                          total_votes: parseInt(currentWeekStats.total_votes) || 0,
                          unique_voters: parseInt(currentWeekStats.unique_voters) || 0
                        },
                        all_time: {
                          total_votes: parseInt(allTimeStats.total_votes) || 0,
                          unique_voters: parseInt(allTimeStats.unique_voters) || 0,
                          weeks_participated: parseInt(allTimeStats.weeks_participated) || 0
                        },
                        regional_rank: regionalRank
                      });
                    }
                  }
                );
              }
            );
          }
        );
      } catch (error) {
        console.error('❌ Error fetching school vote stats:', error);
        reject(error);
      }
    });
  }

  // Award badges to schools
  awardBadge(schoolId, schoolName, badgeType, badgeName, badgeDescription) {
    return new Promise((resolve, reject) => {
      try {
        this.db.run(
          'INSERT OR REPLACE INTO school_badges (school_id, school_name, badge_type, badge_name, badge_description, earned_date, is_active) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)',
          [schoolId, schoolName, badgeType, badgeName, badgeDescription],
          function(err) {
            if (err) {
              console.error('❌ Error awarding badge:', err);
              return reject(err);
            }
            
            resolve({
              success: true,
              badgeId: this.lastID,
              message: 'Badge attribué avec succès'
            });
          }
        );
      } catch (error) {
        console.error('❌ Error awarding badge:', error);
        reject(error);
      }
    });
  }

  // Get school badges
  getSchoolBadges(schoolId) {
    return new Promise((resolve, reject) => {
      try {
        this.db.all(
          'SELECT * FROM school_badges WHERE school_id = ? AND is_active = 1 ORDER BY earned_date DESC',
          [schoolId],
          (err, rows) => {
            if (err) {
              console.error('❌ Error fetching school badges:', err);
              return reject(err);
            }
            
            resolve({
              success: true,
              badges: rows
            });
          }
        );
      } catch (error) {
        console.error('❌ Error fetching school badges:', error);
        reject(error);
      }
    });
  }

  // Check and award badges based on vote performance
  checkAndAwardBadges() {
    return new Promise((resolve, reject) => {
      try {
        const weekStart = this.getCurrentWeekStart();
        
        // Top Performer Badge (Top 3 in region this week)
        this.db.all(
          'SELECT school_id, school_name, school_region, school_level, SUM(vote_count) as total_votes FROM weekly_stats WHERE week_start = ? GROUP BY school_id, school_name, school_region, school_level ORDER BY school_region, school_level, total_votes DESC',
          [weekStart],
          (err, topPerformers) => {
            if (err) {
              console.error('❌ Error fetching top performers:', err);
              return reject(err);
            }

            // Group by region and level, then award top 3 badges
            const regionLevelGroups = {};
            topPerformers.forEach(school => {
              const key = `${school.school_region}_${school.school_level}`;
              if (!regionLevelGroups[key]) {
                regionLevelGroups[key] = [];
              }
              regionLevelGroups[key].push(school);
            });

            const badgePromises = [];
            Object.values(regionLevelGroups).forEach(schools => {
              schools.slice(0, 3).forEach((school, index) => {
                const badgeTypes = ['top_performer_gold', 'top_performer_silver', 'top_performer_bronze'];
                const badgeNames = ['🏆 Champion Régional', '🥈 Vice-Champion', '🥉 Troisième Place'];
                
                if (index < 3) {
                  badgePromises.push(
                    this.awardBadge(
                      school.school_id,
                      school.school_name,
                      badgeTypes[index],
                      badgeNames[index],
                      `Top ${index + 1} dans la région ${school.school_region} cette semaine`
                    )
                  );
                }
              });
            });

            // Community Favorite Badge (100+ votes this week)
            this.db.all(
              'SELECT school_id, school_name, SUM(vote_count) as total_votes FROM weekly_stats WHERE week_start = ? AND vote_count >= 100 GROUP BY school_id, school_name',
              [weekStart],
              (err, communityFavorites) => {
                if (err) {
                  console.error('❌ Error fetching community favorites:', err);
                  return reject(err);
                }

                communityFavorites.forEach(school => {
                  badgePromises.push(
                    this.awardBadge(
                      school.school_id,
                      school.school_name,
                      'community_favorite',
                      '🌟 Favori de la Communauté',
                      'Plus de 100 votes cette semaine'
                    )
                  );
                });

                Promise.all(badgePromises).then(() => {
                  console.log('✅ Badge checking and awarding completed');
                  resolve();
                }).catch(err => {
                  console.error('❌ Error awarding badges:', err);
                  reject(err);
                });
              }
            );
          }
        );
      } catch (error) {
        console.error('❌ Error checking and awarding badges:', error);
        reject(error);
      }
    });
  }

  // Get database statistics
  getDatabaseStats() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        this.db.get('SELECT COUNT(*) as count FROM votes', (err, votesResult) => {
          if (err) {
            console.error('❌ Error fetching total votes:', err);
            return reject(err);
          }

          this.db.get('SELECT COUNT(DISTINCT school_id) as count FROM votes', (err, schoolsResult) => {
            if (err) {
              console.error('❌ Error fetching total schools:', err);
              return reject(err);
            }

            this.db.get('SELECT COUNT(*) as count FROM school_badges WHERE is_active = 1', (err, badgesResult) => {
              if (err) {
                console.error('❌ Error fetching total badges:', err);
                return reject(err);
              }

              this.db.get('SELECT COUNT(*) as count FROM votes WHERE week_start = ?', [this.getCurrentWeekStart()], (err, weeklyResult) => {
                if (err) {
                  console.error('❌ Error fetching weekly votes:', err);
                  return reject(err);
                }

                const stats = {
                  total_votes: votesResult.count,
                  total_schools: schoolsResult.count,
                  total_badges: badgesResult.count,
                  current_week_votes: weeklyResult.count
                };

                resolve({
                  success: true,
                  stats: stats
                });
              });
            });
          });
        });
      } catch (error) {
        console.error('❌ Error fetching database stats:', error);
        reject(error);
      }
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
      });
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;