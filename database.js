const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    // Use persistent data directory - this ensures data survives deployments
    // On Render, use /opt/render/project/src/data or environment variable
    const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
    this.dataDir = dataDir;
    this.dbPath = path.join(dataDir, 'school_ranking.db');
    this.backupDir = path.join(dataDir, 'backups');
    this.ensureDataDirectory();
    this.init();
  }

  ensureDataDirectory() {
    try {
      // Create data directory if it doesn't exist
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
        console.log(`✅ Created data directory: ${this.dataDir}`);
      }
      // Create backups directory if it doesn't exist
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
        console.log(`✅ Created backups directory: ${this.backupDir}`);
      }
    } catch (error) {
      console.error('❌ Error creating data directories:', error);
    }
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
        
        // Create tables - now returns a promise
        this.createTables().catch((err) => {
          console.error('❌ Failed to create tables:', err);
        });
      });
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
    }
  }

  createTables() {
    return new Promise((resolve, reject) => {
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
            voter_fingerprint TEXT NOT NULL,
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

        // Create weekly_winners table for tracking weekly winners
        const createWeeklyWinnersTable = `
          CREATE TABLE IF NOT EXISTS weekly_winners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            school_id TEXT NOT NULL,
            school_name TEXT NOT NULL,
            school_region TEXT NOT NULL,
            school_level TEXT NOT NULL,
            week_start DATE NOT NULL,
            total_votes INTEGER NOT NULL,
            unique_voters INTEGER NOT NULL,
            announcement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(week_start, school_level)
          )
        `;

        // Create tutor_requests table for home tutor requests
        const createTutorRequestsTable = `
          CREATE TABLE IF NOT EXISTS tutor_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT NOT NULL,
            student_phone TEXT NOT NULL,
            subject TEXT NOT NULL,
            level TEXT NOT NULL,
            city TEXT NOT NULL,
            preferred_schedule TEXT NOT NULL,
            teacher_name TEXT NOT NULL,
            teacher_phone TEXT NOT NULL,
            request_status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `;

        const createTutorRequestsIndexes = [
          'CREATE INDEX IF NOT EXISTS idx_tutor_requests_status ON tutor_requests(request_status)',
          'CREATE INDEX IF NOT EXISTS idx_tutor_requests_city ON tutor_requests(city)',
          'CREATE INDEX IF NOT EXISTS idx_tutor_requests_subject ON tutor_requests(subject)',
          'CREATE INDEX IF NOT EXISTS idx_tutor_requests_created_at ON tutor_requests(created_at)'
        ];

        // Create teachers table for storing all teachers
        const createTeachersTable = `
          CREATE TABLE IF NOT EXISTS teachers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            teacher_name TEXT NOT NULL,
            teacher_phone TEXT NOT NULL,
            subjects TEXT,
            cities TEXT,
            levels TEXT,
            total_requests INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(teacher_name, teacher_phone)
          )
        `;

        const createTeachersIndexes = [
          'CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(teacher_name)',
          'CREATE INDEX IF NOT EXISTS idx_teachers_phone ON teachers(teacher_phone)',
          'CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status)',
          'CREATE INDEX IF NOT EXISTS idx_teachers_created_at ON teachers(created_at)'
        ];

      const createWeeklyStatsIndexes = [
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_school_id ON weekly_stats(school_id)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_week_start ON weekly_stats(week_start)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_school_region ON weekly_stats(school_region)',
        'CREATE INDEX IF NOT EXISTS idx_weekly_stats_vote_count ON weekly_stats(vote_count)'
      ];

        // Helper function to safely execute SQL (prevents nested callback hell)
        const safeExec = (sql, tableName) => {
          return new Promise((resolveExec, rejectExec) => {
            this.db.exec(sql, (err) => {
              if (err) {
                // Ignore "table already exists" errors
                if (!err.message || (!err.message.includes('already exists') && !err.message.includes('duplicate'))) {
                  console.error(`❌ Error creating ${tableName} table:`, err);
                  return rejectExec(err);
                }
              }
              resolveExec();
            });
          });
        };

        // Helper function to create all indexes
        const createAllIndexes = () => {
          return new Promise((resolveIndexes) => {
            const allIndexes = [...createIndexes, ...createBadgeIndexes, ...createWeeklyStatsIndexes, ...createTutorRequestsIndexes, ...createTeachersIndexes];
            let completed = 0;

            if (allIndexes.length === 0) {
              return resolveIndexes();
            }

            allIndexes.forEach(index => {
              this.db.exec(index, (indexErr) => {
                completed++;
                if (indexErr && !indexErr.message.includes('already exists') && !indexErr.message.includes('no such column')) {
                  console.warn('⚠️ Index creation warning:', indexErr.message);
                }
                if (completed === allIndexes.length) {
                  resolveIndexes();
                }
              });
            });
          });
        };

        // Execute table creation sequentially using promises (much cleaner than nested callbacks)
        safeExec(createVotesTable, 'votes')
          .then(() => safeExec(createBadgesTable, 'badges'))
          .then(() => safeExec(createWeeklyStatsTable, 'weekly_stats'))
          .then(() => safeExec(createWeeklyWinnersTable, 'weekly_winners'))
          .then(() => safeExec(createTutorRequestsTable, 'tutor_requests'))
          .then(() => safeExec(createTeachersTable, 'teachers'))
          .then(() => new Promise(resolveDelay => setTimeout(resolveDelay, 100)))
          .then(() => createAllIndexes())
          .then(() => {
            console.log('✅ Database tables and indexes created successfully');
            this.runMigrationAfterSetup();
            resolve();
          })
          .catch((error) => {
            console.error('❌ Error creating database tables:', error);
            reject(error);
          });
    } catch (error) {
      console.error('❌ Error creating database tables:', error);
        reject(error);
    }
    });
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

  // Run migration after table setup is complete
  runMigrationAfterSetup() {
    // Small delay to ensure everything is settled
    setTimeout(() => {
      this.migrateVotesTableImmediate().then(() => {
        return this.migrateTutorRequestsTable();
      }).then(() => {
        console.log('✅ Database migration completed');
      }).catch((migrationError) => {
        console.warn('⚠️ Migration will run on-demand:', migrationError.message);
        // Continue - migration will happen on-demand when needed
      });
    }, 50);
  }

  // Migrate tutor_requests table to add new columns
  migrateTutorRequestsTable() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        // Check if table exists and what columns it has
        this.db.all("PRAGMA table_info(tutor_requests)", (err, columns) => {
          if (err) {
            // Table might not exist yet, which is fine
            console.log('ℹ️ tutor_requests table does not exist yet, will be created with new schema');
            return resolve();
          }

          const columnNames = columns.map(col => col.name);
          const migrations = [];

          // Add student_phone if missing
          if (!columnNames.includes('student_phone')) {
            migrations.push(() => {
              return new Promise((resolveMig, rejectMig) => {
                this.db.run('ALTER TABLE tutor_requests ADD COLUMN student_phone TEXT;', (err) => {
                  if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ Error adding student_phone column:', err);
                    return rejectMig(err);
                  }
                  console.log('✅ student_phone column added');
                  resolveMig();
                });
              });
            });
          }

          // Rename suggested_teacher to teacher_name if needed
          if (columnNames.includes('suggested_teacher') && !columnNames.includes('teacher_name')) {
            migrations.push(() => {
              return new Promise((resolveMig, rejectMig) => {
                // SQLite doesn't support RENAME COLUMN directly, so we'll add new column and update
                this.db.run('ALTER TABLE tutor_requests ADD COLUMN teacher_name TEXT;', (err) => {
                  if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ Error adding teacher_name column:', err);
                    return rejectMig(err);
                  }
                  // Copy data from suggested_teacher to teacher_name
                  this.db.run('UPDATE tutor_requests SET teacher_name = suggested_teacher WHERE teacher_name IS NULL;', (updateErr) => {
                    if (updateErr) {
                      console.warn('⚠️ Error copying suggested_teacher to teacher_name:', updateErr);
                    }
                  });
                  console.log('✅ teacher_name column added');
                  resolveMig();
                });
              });
            });
          } else if (!columnNames.includes('teacher_name')) {
            // Add teacher_name if it doesn't exist at all
            migrations.push(() => {
              return new Promise((resolveMig, rejectMig) => {
                this.db.run('ALTER TABLE tutor_requests ADD COLUMN teacher_name TEXT NOT NULL DEFAULT "";', (err) => {
                  if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ Error adding teacher_name column:', err);
                    return rejectMig(err);
                  }
                  console.log('✅ teacher_name column added');
                  resolveMig();
                });
              });
            });
          }

          // Add teacher_phone if missing
          if (!columnNames.includes('teacher_phone')) {
            migrations.push(() => {
              return new Promise((resolveMig, rejectMig) => {
                this.db.run('ALTER TABLE tutor_requests ADD COLUMN teacher_phone TEXT NOT NULL DEFAULT "";', (err) => {
                  if (err && !err.message.includes('duplicate column')) {
                    console.error('❌ Error adding teacher_phone column:', err);
                    return rejectMig(err);
                  }
                  console.log('✅ teacher_phone column added');
                  resolveMig();
                });
              });
            });
          }

          // Execute all migrations sequentially
          if (migrations.length === 0) {
            console.log('✅ tutor_requests table is up to date');
            return resolve();
          }

          let migrationPromise = Promise.resolve();
          migrations.forEach(migration => {
            migrationPromise = migrationPromise.then(() => migration());
          });

          migrationPromise
            .then(() => {
              console.log('✅ tutor_requests table migration completed');
              resolve();
            })
            .catch(reject);
        });
      } catch (error) {
        console.error('❌ Error during tutor_requests migration:', error);
        reject(error);
      }
    });
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

  // Migrate votes table to add vote_date column and voter_fingerprint (synchronous promise-based)
  migrateVotesTable() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        // Check if vote_date and voter_fingerprint columns exist
        this.db.all("PRAGMA table_info(votes)", (err, columns) => {
          if (err) {
            console.error('❌ Error checking votes table structure:', err);
            return reject(err);
          }
          
          const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
          const hasFingerprint = columns && columns.some(col => col.name === 'voter_fingerprint');
          
          // Function to create indexes
          const createIndexes = () => {
            console.log('🔄 Creating/updating indexes for vote tracking...');
            // Drop ALL old unique indexes first
            this.db.run('DROP INDEX IF EXISTS idx_votes_unique_daily;', () => {
              this.db.run('DROP INDEX IF EXISTS idx_votes_unique_daily_with_fingerprint;', () => {
                // Create new indexes with fingerprint
                // CRITICAL: Single unique index that ALWAYS includes fingerprint (fingerprint is never NULL now)
                const voteDateIndexes = [
                  'CREATE INDEX IF NOT EXISTS idx_votes_date ON votes(vote_date)',
                  'CREATE INDEX IF NOT EXISTS idx_votes_ip_date ON votes(voter_ip, vote_date)',
                  'CREATE INDEX IF NOT EXISTS idx_votes_fingerprint ON votes(voter_fingerprint)'
                ];
                
                // Create supporting indexes first
                let regularIndexesCreated = 0;
                voteDateIndexes.forEach((indexQuery) => {
                  this.db.run(indexQuery, (indexErr) => {
                    if (indexErr) {
                      console.error('❌ Could not create regular index:', indexQuery, indexErr.message);
                    } else {
                      console.log('✅ Created regular index:', indexQuery.substring(0, 60));
                    }
                    regularIndexesCreated++;
                    if (regularIndexesCreated === voteDateIndexes.length) {
                      // Now force-create unique index (DROP and CREATE to ensure it's correct)
                      console.log('🔄 Force-creating UNIQUE index (dropping if exists first)...');
                      this.db.run('DROP INDEX IF EXISTS idx_votes_unique_daily_with_fingerprint;', () => {
                        this.db.run(
                          'CREATE UNIQUE INDEX idx_votes_unique_daily_with_fingerprint ON votes(voter_ip, voter_fingerprint, school_id, vote_date)',
                          (uniqueErr) => {
                            if (uniqueErr) {
                              console.error('❌ CRITICAL: Failed to create unique index:', uniqueErr.message);
                              console.error('   This may be because duplicate votes already exist in the database.');
                              console.error('   Error code:', uniqueErr.code);
                            } else {
                              console.log('✅ UNIQUE INDEX CREATED SUCCESSFULLY');
                            }
                            
                            // Verify index exists
                            this.db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND name='idx_votes_unique_daily_with_fingerprint'", (verifyErr, indexes) => {
                              if (verifyErr) {
                                console.error('❌ Error verifying index:', verifyErr);
                              } else {
                                if (indexes.length > 0) {
                                  console.log('✅ VERIFIED: Unique index exists!');
                                  console.log('   Name:', indexes[0].name);
                                  console.log('   SQL:', indexes[0].sql);
                                } else {
                                  console.error('❌ CRITICAL: Unique index verification FAILED - index does not exist!');
                                }
                              }
                              resolve();
                            });
                          }
                        );
                      });
                    }
                  });
                });
                
                let indexesCreated = 0;
                const totalIndexes = voteDateIndexes.length;
                voteDateIndexes.forEach((indexQuery) => {
                  this.db.run(indexQuery, (indexErr) => {
                    if (indexErr) {
                      console.error('❌ Could not create index:', indexQuery, indexErr.message);
                    } else {
                      console.log('✅ Created index:', indexQuery);
                    }
                    indexesCreated++;
                    if (indexesCreated === totalIndexes) {
                      console.log('✅ Migration completed: all columns and indexes created');
                      // Verify index exists
                      this.db.all("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_votes_unique_daily_with_fingerprint'", (verifyErr, indexes) => {
                        if (verifyErr) {
                          console.error('❌ Error verifying index:', verifyErr);
                        } else {
                          console.log('✅ Verified unique index exists:', indexes.length > 0 ? 'YES' : 'NO');
                        }
                        resolve();
                      });
                    }
                  });
                });
                
                if (totalIndexes === 0) {
                  resolve();
                }
              });
            });
          };
          
          // Add fingerprint column if missing
          if (!hasFingerprint) {
            console.log('🔄 Migrating votes table: adding voter_fingerprint column...');
            this.db.run('ALTER TABLE votes ADD COLUMN voter_fingerprint TEXT;', (fingerprintErr) => {
              if (fingerprintErr && !fingerprintErr.message.includes('duplicate column')) {
                console.error('❌ Error adding voter_fingerprint column:', fingerprintErr);
                return reject(fingerprintErr);
              }
              console.log('✅ voter_fingerprint column added');
              
              // Continue with vote_date migration if needed
              if (!hasVoteDate) {
                migrateVoteDate();
              } else {
                createIndexes();
              }
            });
          } else if (!hasVoteDate) {
            migrateVoteDate();
          } else {
            // Both columns exist, just create/update indexes
            createIndexes();
          }
          
          // Function to migrate vote_date column
          const migrateVoteDate = () => {
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
                  createIndexes();
                  return;
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
                  console.log('✅ vote_date column added and populated');
                }
                createIndexes();
              });
            });
          };
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
  // CRITICAL: Now accepts fingerprint to correctly identify user after refresh
  getUserVoteStatus(voterIp, voterFingerprint) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      // CRITICAL: Fingerprint is required for proper user identification
      if (!voterFingerprint || typeof voterFingerprint !== 'string' || voterFingerprint.trim() === '') {
        console.warn('⚠️ getUserVoteStatus: No fingerprint provided, using IP only (may be inaccurate)');
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
            
            // CRITICAL: Use fingerprint in queries to correctly identify user
            // Use same query format as recordVote for consistency
            const dailyQuery = voterFingerprint && voterFingerprint.trim() !== ''
              ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND ${dateColumn} = ?`
              : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND ${dateColumn} = ?`;
            const dailyParams = voterFingerprint && voterFingerprint.trim() !== ''
              ? [voterIp, voterFingerprint, currentDate]
              : [voterIp, currentDate];
            
            // Check if user has voted today (using vote_date or DATE(vote_timestamp) as fallback)
            this.db.get(dailyQuery, dailyParams, (err, dailyRow) => {
              if (err) {
                console.error('❌ Error checking daily vote:', err);
                return reject(err);
              }

              const hasVotedToday = dailyRow ? (dailyRow.count > 0) : false;
              const lastVoteDate = hasVotedToday ? currentDate : null;
              
              // Check total weekly votes - also use fingerprint
              const weeklyQuery = voterFingerprint && voterFingerprint.trim() !== ''
                ? 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND week_start = ?'
                : 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND week_start = ?';
              const weeklyParams = voterFingerprint && voterFingerprint.trim() !== ''
                ? [voterIp, voterFingerprint, weekStart]
                : [voterIp, weekStart];
              
              this.db.get(weeklyQuery, weeklyParams, (err, weeklyRow) => {
                if (err) {
                  console.error('❌ Error checking weekly vote:', err);
                  return reject(err);
                }
                
                const weeklyVoteCount = weeklyRow ? (weeklyRow.count || 0) : 0;
                const remainingWeeklyVotes = Math.max(0, 7 - weeklyVoteCount);
                const weeklyLimitReached = weeklyVoteCount >= 7;
                
                console.log(`📊 Vote status for IP: ${voterIp}, FP: ${voterFingerprint?.substring(0, 20)}..., Daily: ${hasVotedToday}, Weekly: ${weeklyVoteCount}/7`);
                
                resolve({
                  hasVotedToday,
                  lastVoteDate,
                  weeklyVoteCount,
                  remainingWeeklyVotes,
                  weeklyLimitReached,
                  currentDate,
                  weekStart
                });
              });
            });
          } catch (error) {
            console.error('❌ Error getting user vote status:', error);
            reject(error);
          }
        });
      }).catch(reject);
    });
  }

  // Record a vote (with atomic transaction to prevent race conditions)
  recordVote(schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent) {
    const dbManager = this; // Capture context for nested callbacks
    return new Promise((resolve, reject) => {
      if (!dbManager.db) {
        return reject(new Error('Database not initialized'));
      }
      
      // Ensure vote_date column exists before inserting
      dbManager.ensureVoteDateColumn().then(() => {
        try {
          const weekStart = dbManager.getCurrentWeekStart();
          const currentDate = dbManager.getCurrentDate();
          
          // Function to process vote within transaction (defined before use)
          function processVoteTransaction() {
            // CRITICAL: Validate fingerprint is present BEFORE any database operations
            if (!voterFingerprint || typeof voterFingerprint !== 'string' || voterFingerprint.trim() === '') {
              console.error('❌ CRITICAL: voterFingerprint is missing or invalid:', voterFingerprint);
              dbManager.db.run('ROLLBACK', () => {});
              return reject(new Error('Fingerprint is required but was null or invalid'));
            }
            
            // Check column existence
            dbManager.db.all("PRAGMA table_info(votes)", (colErr, columns) => {
              if (colErr) {
                dbManager.db.run('ROLLBACK', () => {});
                return reject(colErr);
              }
              
              const hasVoteDateCol = columns && columns.some(col => col.name === 'vote_date');
              const dateColumn = hasVoteDateCol ? 'vote_date' : 'DATE(vote_timestamp)';
              
              // CRITICAL: Check if user already voted for THIS SPECIFIC school today
              // Rule: 1 vote per school per day, max 7 votes per week
              // ALWAYS use IP + fingerprint combination (fingerprint should NEVER be null)
              // Use exact match with proper date comparison - use CAST to ensure date comparison works
              const checkSchoolQuery = hasVoteDateCol 
                ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND CAST(vote_date AS TEXT) = CAST(? AS TEXT)`
                : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
              const checkSchoolParams = [voterIp, voterFingerprint, schoolId, currentDate];
              
              console.log(`🔍 [TRANSACTION] Checking if user already voted for school ${schoolId} today. IP: ${voterIp}, Fingerprint: ${voterFingerprint.substring(0, 20)}..., Date: ${currentDate}, DateColumn: ${dateColumn}`);
              
              // DEBUG: Query to see what's actually in the database
              dbManager.db.all(`SELECT id, voter_ip, voter_fingerprint, school_id, ${dateColumn} as vote_date FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? LIMIT 5`, [voterIp, voterFingerprint, schoolId], (debugErr, debugRows) => {
                if (!debugErr && debugRows) {
                  console.log(`🔍 [DEBUG] Existing votes in DB for this IP+FP+School:`, JSON.stringify(debugRows, null, 2));
                }
              });
              
              dbManager.db.get(checkSchoolQuery, checkSchoolParams, (schoolErr, schoolRow) => {
                if (schoolErr) {
                  console.error('❌ Error checking school vote:', schoolErr);
                  dbManager.db.run('ROLLBACK', () => {});
                  return reject(schoolErr);
                }
                
                const schoolVoteCount = schoolRow ? (schoolRow.count || 0) : 0;
                console.log(`📊 [TRANSACTION] Vote count for this school today: ${schoolVoteCount}`);
                
                // CRITICAL: Block if user already voted for THIS school today (1 vote per school per day)
                if (schoolVoteCount > 0) {
                  console.log(`🚫 [TRANSACTION] BLOCKING VOTE - Already voted for this school ${schoolVoteCount} time(s) today`);
                  console.log(`🚫 [TRANSACTION] Query: ${checkSchoolQuery}`);
                  console.log(`🚫 [TRANSACTION] Params: IP=${voterIp}, FP=${voterFingerprint.substring(0, 20)}..., School=${schoolId}, Date=${currentDate}`);
                  dbManager.db.run('ROLLBACK', () => {});
              return resolve({
                success: false,
                    error: 'Already voted for this school today',
                    message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
                    remainingVotes: 0,
                    hasVotedToday: true
                  });
                }
                
                // Check weekly limit (max 7 votes per week)
                // ALWAYS use IP + fingerprint combination (fingerprint should NEVER be null)
                const weeklyCheckQuery = 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND week_start = ?';
                const weeklyCheckParams = [voterIp, voterFingerprint, weekStart];
                
                dbManager.db.get(weeklyCheckQuery, weeklyCheckParams, (weeklyErr, weeklyRow) => {
                  if (weeklyErr) {
                    dbManager.db.run('ROLLBACK', () => {});
                    return reject(weeklyErr);
                  }
                  
                  const weeklyCount = weeklyRow ? weeklyRow.count : 0;
                  console.log(`📊 Weekly vote count: ${weeklyCount}/7`);
                  
                  if (weeklyCount >= 7) {
                    console.log(`🚫 Blocking vote - weekly limit reached (7 votes)`);
                    dbManager.db.run('ROLLBACK', () => {});
                    return resolve({
                      success: false,
                      error: 'Weekly limit reached',
                      message: 'Vos votes hebdomadaires sont épuisés.',
                      remainingVotes: 0,
                      weeklyLimitReached: true
                    });
                  }
                  
                  // DOUBLE CHECK: Verify one more time before inserting (within same transaction)
                  // This prevents race conditions where multiple requests passed the initial check
                  // Use same query format as initial check
                  const doubleCheckQuery = hasVoteDateCol 
                    ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND CAST(vote_date AS TEXT) = CAST(? AS TEXT)`
                    : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
                  dbManager.db.get(doubleCheckQuery, checkSchoolParams, (doubleCheckErr, doubleCheckRow) => {
                    if (doubleCheckErr) {
                      console.error('❌ Error in double check:', doubleCheckErr);
                      dbManager.db.run('ROLLBACK', () => {});
                      return reject(doubleCheckErr);
                    }
                    
                    const doubleCheckCount = doubleCheckRow ? (doubleCheckRow.count || 0) : 0;
                    console.log(`🔍 Double check vote count for this school: ${doubleCheckCount}`);
                    
                    if (doubleCheckCount > 0) {
                      console.log(`🚫 Blocking vote after double check - already voted for this school ${doubleCheckCount} time(s) today`);
                      dbManager.db.run('ROLLBACK', () => {});
                      return resolve({
                        success: false,
                        error: 'Already voted for this school today',
                        message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
                        remainingVotes: Math.max(0, 7 - weeklyCount),
                        hasVotedToday: true
                      });
                    }
                      
                      // CRITICAL: Ensure currentDate is never null/undefined
                      if (!currentDate || currentDate === 'null' || currentDate === 'undefined') {
                        console.error('❌ Invalid currentDate:', currentDate);
                        dbManager.db.run('ROLLBACK', () => {});
                        return reject(new Error('Invalid date for vote'));
                      }
                      
                      // All checks passed - insert the vote
                      // ALWAYS include vote_date if column exists, never allow NULL
                      // ALWAYS include fingerprint (should NEVER be null - enforced by server)
                      if (!voterFingerprint) {
                        console.error('❌ CRITICAL: Attempting to insert vote with NULL fingerprint!');
                        dbManager.db.run('ROLLBACK', () => {});
                        return reject(new Error('Fingerprint is required but was null'));
                      }
                      
                      // FINAL CHECK: Query database one more time with EXACT same conditions as INSERT
                      // This is the absolute last check before insert to catch any race conditions
                      // Use CAST to ensure date comparison works correctly
                      const finalCheckQuery = hasVoteDateCol 
                        ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND CAST(vote_date AS TEXT) = CAST(? AS TEXT)`
                        : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
                      dbManager.db.get(finalCheckQuery, [voterIp, voterFingerprint, schoolId, currentDate], (finalCheckErr, finalCheckRow) => {
                        if (finalCheckErr) {
                          console.error('❌ [TRANSACTION] Final check error:', finalCheckErr);
                          dbManager.db.run('ROLLBACK', () => {});
                          return reject(finalCheckErr);
                        }
                        
                        const finalCheckCount = finalCheckRow ? (finalCheckRow.count || 0) : 0;
                        console.log(`🔍 [TRANSACTION] FINAL CHECK before insert: ${finalCheckCount} existing votes`);
                        
                        if (finalCheckCount > 0) {
                          console.log(`🚫 [TRANSACTION] FINAL CHECK BLOCKED - Found ${finalCheckCount} existing vote(s) before insert`);
                          dbManager.db.run('ROLLBACK', () => {});
                          return resolve({
                            success: false,
                            error: 'Already voted for this school today',
                            message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
                            remainingVotes: 0,
                            hasVotedToday: true
                          });
                        }
                      
                      // Use INSERT OR IGNORE to rely on UNIQUE constraint - if duplicate exists, it will be silently ignored
                      // But we still want to catch the error, so use regular INSERT and handle the constraint error
                      const insertQuery = hasVoteDateCol 
                        ? 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_fingerprint, voter_user_agent, vote_date, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
                        : 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_fingerprint, voter_user_agent, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
                      
                      const insertParams = hasVoteDateCol
                        ? [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent, currentDate, weekStart]
                        : [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent, weekStart];
                      
                      console.log(`✅ [TRANSACTION] Inserting vote for school ${schoolId}, IP: ${voterIp}, FP: ${voterFingerprint.substring(0, 20)}..., Date: ${currentDate}, HasDateCol: ${hasVoteDateCol}`);
                      console.log(`✅ [TRANSACTION] Insert Query: ${insertQuery}`);
                      console.log(`✅ [TRANSACTION] Insert Params: [${schoolId}, ${schoolName.substring(0, 20)}..., ${schoolRegion}, ${schoolLevel}, ${voterIp}, ${voterFingerprint.substring(0, 20)}..., ..., ${currentDate}, ${weekStart}]`);
                      
                      // Verify unique index exists before insert
                      dbManager.db.all("SELECT name, sql FROM sqlite_master WHERE type='index' AND name='idx_votes_unique_daily_with_fingerprint'", (indexCheckErr, indexes) => {
                        if (indexCheckErr) {
                          console.error('❌ [TRANSACTION] Error checking unique index:', indexCheckErr);
                        } else {
                          if (indexes.length === 0) {
                            console.error('❌ [TRANSACTION] CRITICAL: Unique index does not exist! This will allow duplicates!');
                          } else {
                            console.log('✅ [TRANSACTION] Unique index verified:', indexes[0].name);
                          }
                        }
                        
                        dbManager.db.run(insertQuery, insertParams, function(insertErr) {
                          if (insertErr) {
                            dbManager.db.run('ROLLBACK', () => {});
                            // Check if it's a duplicate vote error (database constraint)
                            console.error('❌ [TRANSACTION] INSERT ERROR:', insertErr.message, insertErr.code);
                            console.error('❌ [TRANSACTION] Full error:', JSON.stringify(insertErr));
                            console.error('❌ [TRANSACTION] Error toString:', insertErr.toString());
                            
                            // SQLite constraint error codes: SQLITE_CONSTRAINT = 19, SQLITE_CONSTRAINT_UNIQUE = 2067
                            const isConstraintError = insertErr.code === 'SQLITE_CONSTRAINT' || 
                                                      insertErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                                                      insertErr.code === 19 ||
                                                      insertErr.code === 2067 ||
                                                      (insertErr.message && (
                                                        insertErr.message.includes('UNIQUE') || 
                                                        insertErr.message.includes('duplicate') ||
                                                        insertErr.message.includes('constraint')
                                                      ));
                            
                            if (isConstraintError) {
                              console.log('🚫 [TRANSACTION] Duplicate vote blocked by database UNIQUE constraint');
                              return resolve({
                                success: false,
                                error: 'Duplicate vote',
                                message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
                                remainingVotes: Math.max(0, 7 - weeklyCount),
                                hasVotedToday: true
                              });
                            }
                            // Log the error for debugging
                            console.error('❌ [TRANSACTION] Database insert error (not duplicate):', insertErr);
                            return reject(insertErr);
                          }
                        
                        console.log(`✅ [TRANSACTION] Vote inserted successfully. ID: ${this.lastID}`);
                        
                        // Update weekly stats only if vote was successfully inserted
                        const voteId = this.lastID;
                        if (voteId) {
                dbManager.updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart);
                        }
                        
                        // VERIFY: Check if vote was actually inserted and no duplicate exists
                        // Use same query format as finalCheckQuery
                        const verifyQuery = hasVoteDateCol 
                          ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND CAST(vote_date AS TEXT) = CAST(? AS TEXT)`
                          : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
                        dbManager.db.get(verifyQuery, [voterIp, voterFingerprint, schoolId, currentDate], (verifyErr, verifyRow) => {
                          if (verifyErr) {
                            console.error('❌ [TRANSACTION] Verification error:', verifyErr);
                          } else {
                            const verifyCount = verifyRow ? (verifyRow.count || 0) : 0;
                            console.log(`🔍 [TRANSACTION] Post-insert verification: ${verifyCount} vote(s) found`);
                            if (verifyCount > 1) {
                              console.error('❌ [TRANSACTION] CRITICAL: Multiple votes found after insert! This should not happen!');
                            }
                          }
                          
                          // Commit the transaction after verification
                          dbManager.db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                              console.error('❌ Error committing transaction:', commitErr);
                              // Vote was inserted but commit failed - this is bad but vote is already in DB
                            }
                            
                        // Get updated status after vote - CRITICAL: Pass fingerprint!
                        dbManager.getUserVoteStatus(voterIp, voterFingerprint).then(updatedStatus => {
                resolve({
                  success: true,
                                voteId: voteId,
                                remainingVotes: updatedStatus.remainingWeeklyVotes,
                                message: 'Vote enregistré avec succès',
                                hasVotedToday: true
                              });
                            }).catch(updateErr => {
                              // Still return success even if status update fails
                              resolve({
                                success: true,
                                voteId: voteId,
                                remainingVotes: Math.max(0, 7 - weeklyCount - 1),
                                message: 'Vote enregistré avec succès',
                                hasVotedToday: true
                              });
                            });
                          }); // Close COMMIT callback
                        }); // Close verify callback
                      }); // Close insert function
                    }); // Close indexCheck callback
                  }); // Close finalCheck callback
                }); // Close double check
              }); // Close weekly check
            }); // Close school check
          }); // Close PRAGMA table_info
          }
          
          // Use transaction to ensure atomicity and prevent race conditions
          // Try BEGIN IMMEDIATE first, fallback to BEGIN if not supported
          dbManager.db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
            if (beginErr) {
              console.warn('⚠️ BEGIN IMMEDIATE not supported, trying BEGIN:', beginErr.message);
              // Fallback to regular BEGIN
              dbManager.db.run('BEGIN TRANSACTION', (beginErr2) => {
                if (beginErr2) {
                  console.error('❌ Error beginning transaction:', beginErr2);
                  return reject(beginErr2);
                }
                processVoteTransaction();
              });
              return;
            }
            processVoteTransaction();
          });
      } catch (error) {
          dbManager.db.run('ROLLBACK', () => {});
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
        // weekly_stats doesn't have voter_ip - we need to join with votes table
        // Or calculate unique_voters separately
        let query = `
          SELECT 
            ws.school_id,
            ws.school_name,
            ws.school_region,
            ws.school_level,
            SUM(ws.vote_count) as total_votes,
            MAX(ws.last_updated) as last_vote_time
          FROM weekly_stats ws
          WHERE ws.week_start = ?
        `;

        const params = [this.getCurrentWeekStart()];

        if (region && region !== 'all') {
          query += ' AND ws.school_region = ?';
          params.push(region);
        }

        if (level && level !== 'all') {
          query += ' AND ws.school_level = ?';
          params.push(level);
        }

        query += `
          GROUP BY ws.school_id, ws.school_name, ws.school_region, ws.school_level
          ORDER BY total_votes DESC
          LIMIT ?
        `;
        params.push(limit);

        this.db.all(query, params, (err, rows) => {
          if (err) {
            console.error('❌ Error fetching top voted schools:', err);
            return reject(err);
          }
          
          // Get unique voters count from votes table for each school
          const weekStart = this.getCurrentWeekStart();
          const schoolsWithVoters = rows.map((school, index) => {
            // Calculate unique_voters from votes table
            return new Promise((resolveVoters) => {
              const dateColumn = 'vote_date'; // Use vote_date column
              this.db.get(
                `SELECT COUNT(DISTINCT voter_ip) as unique_voters 
                 FROM votes 
                 WHERE school_id = ? AND week_start = ? AND ${dateColumn} IS NOT NULL`,
                [school.school_id, weekStart],
                (voterErr, voterRow) => {
                  const uniqueVoters = voterErr ? 0 : (voterRow ? parseInt(voterRow.unique_voters || 0) : 0);
                  resolveVoters({
            ...school,
            rank: index + 1,
                    total_votes: parseInt(school.total_votes || 0),
                    unique_voters: uniqueVoters
                  });
                }
              );
            });
          });
          
          // Wait for all unique_voters queries to complete
          Promise.all(schoolsWithVoters).then(schools => {
          resolve({
            success: true,
            schools: schools,
            week_start: this.getCurrentWeekStart()
            });
          }).catch(rejectErr => {
            // Fallback: return schools without unique_voters if query fails
            const fallbackSchools = rows.map((school, index) => ({
              ...school,
              rank: index + 1,
              total_votes: parseInt(school.total_votes || 0),
              unique_voters: 0
            }));
            resolve({
              success: true,
              schools: fallbackSchools,
              week_start: this.getCurrentWeekStart()
            });
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
        
        // Get total votes from weekly_stats
        this.db.get(
          'SELECT SUM(vote_count) as total_votes FROM weekly_stats WHERE school_id = ? AND week_start = ?',
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
                    
                    // Return current week stats with unique_voters
                    const currentWeekData = {
                      total_votes: totalVotes,
                      unique_voters: uniqueVoters,
                      week_start: weekStart
                    };
                    
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
                            current_week: currentWeekData,
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
                        current_week: currentWeekData,
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

  // Get current week's winner (for Sunday announcements)
  getCurrentWeekWinner(level = 'secondary') {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        const weekStart = this.getCurrentWeekStart();
        
        // Get winner from weekly_winners table first
        this.db.get(
          'SELECT * FROM weekly_winners WHERE week_start = ? AND school_level = ?',
          [weekStart, level],
          (err, winner) => {
            if (err) {
              console.error('❌ Error fetching week winner:', err);
              return reject(err);
            }
            
            if (winner) {
              return resolve({
                success: true,
                winner: winner,
                week_start: weekStart
              });
            }
            
            // If no winner recorded yet, get from current stats
            this.getTopVotedSchools(null, level, 1).then(result => {
              if (result.success && result.schools && result.schools.length > 0) {
                resolve({
                  success: true,
                  winner: result.schools[0],
                  week_start: weekStart,
                  isProvisional: true
                });
              } else {
                resolve({
                  success: true,
                  winner: null,
                  week_start: weekStart
                });
              }
            }).catch(reject);
          }
        );
      } catch (error) {
        console.error('❌ Error getting week winner:', error);
        reject(error);
      }
    });
  }

  // Record weekly winner (called on Sunday evening)
  recordWeeklyWinner(level = 'secondary') {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        const weekStart = this.getCurrentWeekStart();
        
        // Get top school for this week
        this.getTopVotedSchools(null, level, 1).then(result => {
          if (!result.success || !result.schools || result.schools.length === 0) {
            return resolve({
              success: false,
              message: 'No votes recorded this week'
            });
          }
          
          const winner = result.schools[0];
          
          // Insert or update winner record
          this.db.run(
            `INSERT OR REPLACE INTO weekly_winners 
             (school_id, school_name, school_region, school_level, week_start, total_votes, unique_voters, announcement_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [winner.school_id, winner.school_name, winner.school_region, level, weekStart, winner.total_votes, winner.unique_voters],
            function(err) {
              if (err) {
                console.error('❌ Error recording weekly winner:', err);
                return reject(err);
              }
              
              resolve({
                success: true,
                winner: winner,
                week_start: weekStart
              });
            }
          );
        }).catch(reject);
      } catch (error) {
        console.error('❌ Error recording weekly winner:', error);
        reject(error);
      }
    });
  }

  // Get winner history (archive)
  getWinnerHistory(limit = 10) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }
      
      try {
        this.db.all(
          'SELECT * FROM weekly_winners ORDER BY week_start DESC, announcement_date DESC LIMIT ?',
          [limit],
          (err, winners) => {
            if (err) {
              console.error('❌ Error fetching winner history:', err);
              return reject(err);
            }
            
            resolve({
              success: true,
              winners: winners || [],
              total: winners ? winners.length : 0
            });
          }
        );
      } catch (error) {
        console.error('❌ Error getting winner history:', error);
        reject(error);
      }
    });
  }

  // Generate unique voting link slug from school name
  generateSchoolSlug(schoolName) {
    return schoolName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
  }

  // Save tutor request
  saveTutorRequest(requestData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const {
          student_name,
          student_phone,
          subject,
          level,
          city,
          preferred_schedule,
          teacher_name,
          teacher_phone
        } = requestData;

        const query = `
          INSERT INTO tutor_requests (
            student_name, student_phone, subject, level, city, preferred_schedule,
            teacher_name, teacher_phone, request_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        this.db.run(
          query,
          [student_name, student_phone, subject, level, city, preferred_schedule, teacher_name, teacher_phone],
          function(err) {
            if (err) {
              console.error('❌ Error saving tutor request:', err);
              return reject(err);
            }

            resolve({
              success: true,
              id: this.lastID,
              message: 'Tutor request saved successfully'
            });
          }
        );
      } catch (error) {
        console.error('❌ Error saving tutor request:', error);
        reject(error);
      }
    });
  }

  // Get tutor requests with filters
  getTutorRequests(filters = {}) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        let query = 'SELECT * FROM tutor_requests WHERE 1=1';
        const params = [];

        if (filters.city) {
          query += ' AND city = ?';
          params.push(filters.city);
        }

        if (filters.subject) {
          query += ' AND subject = ?';
          params.push(filters.subject);
        }

        if (filters.status) {
          query += ' AND request_status = ?';
          params.push(filters.status);
        }

        query += ' ORDER BY created_at DESC';

        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(filters.limit);
        }

        this.db.all(query, params, (err, requests) => {
          if (err) {
            console.error('❌ Error fetching tutor requests:', err);
            return reject(err);
          }

          resolve({
            success: true,
            requests: requests || [],
            total: requests ? requests.length : 0
          });
        });
      } catch (error) {
        console.error('❌ Error getting tutor requests:', error);
        reject(error);
      }
    });
  }

  // Update tutor request status
  updateTutorRequestStatus(requestId, status) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const query = `
          UPDATE tutor_requests 
          SET request_status = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;

        this.db.run(query, [status, requestId], function(err) {
          if (err) {
            console.error('❌ Error updating tutor request status:', err);
            return reject(err);
          }

          resolve({
            success: true,
            message: 'Tutor request status updated successfully'
          });
        });
      } catch (error) {
        console.error('❌ Error updating tutor request status:', error);
        reject(error);
      }
    });
  }

  // Save or update teacher in database
  saveOrUpdateTeacher(teacherData) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const {
          teacher_name,
          teacher_phone,
          subject,
          city,
          level
        } = teacherData;

        // First, check if teacher exists
        this.db.get(
          'SELECT * FROM teachers WHERE teacher_name = ? AND teacher_phone = ?',
          [teacher_name, teacher_phone],
          (err, existingTeacher) => {
            if (err) {
              console.error('❌ Error checking existing teacher:', err);
              return reject(err);
            }

            if (existingTeacher) {
              // Update existing teacher
              const currentSubjects = existingTeacher.subjects 
                ? existingTeacher.subjects.split(',').map(s => s.trim())
                : [];
              const currentCities = existingTeacher.cities
                ? existingTeacher.cities.split(',').map(c => c.trim())
                : [];
              const currentLevels = existingTeacher.levels
                ? existingTeacher.levels.split(',').map(l => l.trim())
                : [];

              // Add new subject, city, level if not already present
              if (subject && !currentSubjects.includes(subject)) {
                currentSubjects.push(subject);
              }
              if (city && !currentCities.includes(city)) {
                currentCities.push(city);
              }
              if (level && !currentLevels.includes(level)) {
                currentLevels.push(level);
              }

              // Update total requests
              const newTotalRequests = (existingTeacher.total_requests || 0) + 1;

              const updateQuery = `
                UPDATE teachers 
                SET subjects = ?, cities = ?, levels = ?, 
                    total_requests = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE teacher_name = ? AND teacher_phone = ?
              `;

              this.db.run(
                updateQuery,
                [
                  currentSubjects.join(','),
                  currentCities.join(','),
                  currentLevels.join(','),
                  newTotalRequests,
                  teacher_name,
                  teacher_phone
                ],
                function(updateErr) {
                  if (updateErr) {
                    console.error('❌ Error updating teacher:', updateErr);
                    return reject(updateErr);
                  }

                  resolve({
                    success: true,
                    id: existingTeacher.id,
                    message: 'Teacher updated successfully',
                    isNew: false
                  });
                }
              );
            } else {
              // Insert new teacher
              const insertQuery = `
                INSERT INTO teachers (
                  teacher_name, teacher_phone, subjects, cities, levels, total_requests
                ) VALUES (?, ?, ?, ?, ?, 1)
              `;

              this.db.run(
                insertQuery,
                [teacher_name, teacher_phone, subject || '', city || '', level || ''],
                function(insertErr) {
                  if (insertErr) {
                    console.error('❌ Error inserting teacher:', insertErr);
                    return reject(insertErr);
                  }

                  resolve({
                    success: true,
                    id: this.lastID,
                    message: 'Teacher saved successfully',
                    isNew: true
                  });
                }
              );
            }
          }
        );
      } catch (error) {
        console.error('❌ Error saving teacher:', error);
        reject(error);
      }
    });
  }

  // Get all teachers with filters
  getTeachers(filters = {}) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        let query = 'SELECT * FROM teachers WHERE 1=1';
        const params = [];

        if (filters.status) {
          query += ' AND status = ?';
          params.push(filters.status);
        }

        if (filters.city) {
          query += ' AND cities LIKE ?';
          params.push(`%${filters.city}%`);
        }

        if (filters.subject) {
          query += ' AND subjects LIKE ?';
          params.push(`%${filters.subject}%`);
        }

        if (filters.search) {
          query += ' AND (teacher_name LIKE ? OR teacher_phone LIKE ?)';
          const searchTerm = `%${filters.search}%`;
          params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY total_requests DESC, created_at DESC';

        if (filters.limit) {
          query += ' LIMIT ?';
          params.push(filters.limit);
        }

        this.db.all(query, params, (err, teachers) => {
          if (err) {
            console.error('❌ Error fetching teachers:', err);
            return reject(err);
          }

          resolve({
            success: true,
            teachers: teachers || [],
            total: teachers ? teachers.length : 0
          });
        });
      } catch (error) {
        console.error('❌ Error getting teachers:', error);
        reject(error);
      }
    });
  }

  // Update teacher status
  updateTeacherStatus(teacherId, status) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const query = `
          UPDATE teachers 
          SET status = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `;

        this.db.run(query, [status, teacherId], function(err) {
          if (err) {
            console.error('❌ Error updating teacher status:', err);
            return reject(err);
          }

          resolve({
            success: true,
            message: 'Teacher status updated successfully'
          });
        });
      } catch (error) {
        console.error('❌ Error updating teacher status:', error);
        reject(error);
      }
    });
  }

  // Delete teacher
  deleteTeacher(teacherId) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const query = 'DELETE FROM teachers WHERE id = ?';

        this.db.run(query, [teacherId], function(err) {
          if (err) {
            console.error('❌ Error deleting teacher:', err);
            return reject(err);
          }

          resolve({
            success: true,
            message: 'Teacher deleted successfully'
          });
        });
      } catch (error) {
        console.error('❌ Error deleting teacher:', error);
        reject(error);
      }
    });
  }

  // Backup database
  backupDatabase() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        return reject(new Error('Database not initialized'));
      }

      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.backupDir, `school_ranking_${timestamp}.db`);

        // Close current connection
        this.db.close((closeErr) => {
          if (closeErr) {
            console.error('❌ Error closing database for backup:', closeErr);
            return reject(closeErr);
          }

          // Copy database file
          fs.copyFile(this.dbPath, backupPath, (copyErr) => {
            if (copyErr) {
              console.error('❌ Error copying database file:', copyErr);
              return reject(copyErr);
            }

            console.log(`✅ Database backed up to: ${backupPath}`);

            // Reopen database connection
            this.db = new sqlite3.Database(this.dbPath, (openErr) => {
              if (openErr) {
                console.error('❌ Error reopening database:', openErr);
                return reject(openErr);
              }

              // Clean up old backups (keep last 10)
              this.cleanupOldBackups();

              resolve({
                success: true,
                backupPath: backupPath,
                message: 'Database backed up successfully'
              });
            });
          });
        });
      } catch (error) {
        console.error('❌ Error during backup:', error);
        reject(error);
      }
    });
  }

  // Clean up old backups, keep only the last 10
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('school_ranking_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Sort by date, newest first

      // Keep only the last 10 backups
      if (files.length > 10) {
        const filesToDelete = files.slice(10);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Error cleaning up old backups:', error);
    }
  }

  // Restore database from backup
  restoreDatabase(backupPath) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(backupPath)) {
        return reject(new Error('Backup file not found'));
      }

      try {
        // Close current connection if exists
        if (this.db) {
          this.db.close((closeErr) => {
            if (closeErr) {
              console.error('❌ Error closing database for restore:', closeErr);
              return reject(closeErr);
            }

            // Create a backup of current database before restore
            const currentBackup = path.join(this.backupDir, `pre_restore_${Date.now()}.db`);
            if (fs.existsSync(this.dbPath)) {
              fs.copyFileSync(this.dbPath, currentBackup);
            }

            // Copy backup file to database location
            fs.copyFile(backupPath, this.dbPath, (copyErr) => {
              if (copyErr) {
                console.error('❌ Error restoring database:', copyErr);
                return reject(copyErr);
              }

              // Reopen database connection
              this.db = new sqlite3.Database(this.dbPath, (openErr) => {
                if (openErr) {
                  console.error('❌ Error reopening database after restore:', openErr);
                  return reject(openErr);
                }

                console.log(`✅ Database restored from: ${backupPath}`);
                resolve({
                  success: true,
                  message: 'Database restored successfully'
                });
              });
            });
          });
        } else {
          // Database not initialized, just copy the file
          fs.copyFile(backupPath, this.dbPath, (copyErr) => {
            if (copyErr) {
              return reject(copyErr);
            }
            this.init();
            resolve({
              success: true,
              message: 'Database restored successfully'
            });
          });
        }
      } catch (error) {
        console.error('❌ Error during restore:', error);
        reject(error);
      }
    });
  }

  // Get list of available backups
  getBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('school_ranking_') && file.endsWith('.db'))
        .map(file => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified.getTime() - a.modified.getTime());

      return {
        success: true,
        backups: files
      };
    } catch (error) {
      console.error('❌ Error getting backups:', error);
      return {
        success: false,
        error: error.message,
        backups: []
      };
    }
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