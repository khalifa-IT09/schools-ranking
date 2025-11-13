const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.db = null;
    this.pool = null;
    this.dbType = null; // 'sqlite' or 'postgresql'
    
    // Check if PostgreSQL is configured
    if (process.env.DATABASE_URL || process.env.USE_POSTGRESQL === 'true') {
      this.dbType = 'postgresql';
      this.initPostgreSQL();
    } else {
      // Use SQLite (default for local development)
      this.dbType = 'sqlite';
      const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
      
      // Warn if using default (ephemeral) location in production
      if (process.env.NODE_ENV === 'production' && !process.env.DATA_DIR) {
        console.warn('⚠️ WARNING: Using SQLite with default data directory which is EPHEMERAL on Render!');
        console.warn('⚠️ Data will be LOST on each deployment!');
        console.warn('⚠️ Please set DATABASE_URL for PostgreSQL or DATA_DIR for persistent SQLite.');
      }
      
      this.dataDir = dataDir;
      this.dbPath = path.join(dataDir, 'school_ranking.db');
      this.backupDir = path.join(dataDir, 'backups');
      this.ensureDataDirectory();
      this.initSQLite();
    }
  }

  initPostgreSQL() {
    try {
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
      }

      this.pool = new Pool({
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      this.pool.query('SELECT NOW()', (err, res) => {
        if (err) {
          console.error('❌ PostgreSQL connection failed:', err);
          return;
        }
        console.log('✅ PostgreSQL database connected successfully');
        console.log('✅ Using PostgreSQL database (data will persist across deployments)');
        
        // Create tables
        this.createTables().catch((err) => {
          console.error('❌ Failed to create tables:', err);
        });
      });

      this.pool.on('error', (err) => {
        console.error('❌ Unexpected PostgreSQL error:', err);
      });
    } catch (error) {
      console.error('❌ PostgreSQL initialization failed:', error);
    }
  }

  initSQLite() {
    try {
      // Create database file if it doesn't exist
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ SQLite database initialization failed:', err);
          return;
        }
        console.log('✅ SQLite database initialized successfully');
        
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
      console.error('❌ SQLite database initialization failed:', error);
    }
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

  // Convert SQLite SQL to PostgreSQL-compatible SQL
  convertSQL(sql) {
    if (this.dbType === 'postgresql') {
      // Replace SQLite-specific syntax with PostgreSQL syntax
      let converted = sql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
        .replace(/AUTOINCREMENT/g, '')
        .replace(/DATETIME/g, 'TIMESTAMP')
        .replace(/TEXT/g, 'TEXT')  // PostgreSQL TEXT is unlimited, like SQLite TEXT
        .replace(/INTEGER/g, 'INTEGER')
        .replace(/ON CONFLICT\(([^)]+)\) DO UPDATE/g, 'ON CONFLICT ($1) DO UPDATE')
        .replace(/COALESCE\(DATE\(([^)]+)\), DATE\('now'\)\)/g, "COALESCE(($1)::date, CURRENT_DATE)");
      
      // Fix boolean defaults: SQLite uses 1/0, PostgreSQL needs true/false
      // Only convert when it's actually a BOOLEAN column, not INTEGER
      converted = converted
        .replace(/BOOLEAN\s+DEFAULT\s+1/gi, 'BOOLEAN DEFAULT true')
        .replace(/BOOLEAN\s+DEFAULT\s+0/gi, 'BOOLEAN DEFAULT false');
      
      return converted;
    }
    return sql;
  }

  // Get table info (works with both SQLite and PostgreSQL)
  async getTableInfo(tableName) {
    if (this.dbType === 'postgresql') {
      const query = `
        SELECT column_name as name, data_type as type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `;
      const rows = await this.all(query, [tableName]);
      return rows.map(row => ({
        name: row.name,
        type: row.type,
        notnull: row.is_nullable === 'NO',
        dflt_value: row.column_default
      }));
    } else {
      // SQLite
      const query = `PRAGMA table_info(${tableName})`;
      return await this.all(query);
    }
  }

  // Check if table exists
  async tableExists(tableName) {
    if (this.dbType === 'postgresql') {
      const query = `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `;
      const result = await this.get(query, [tableName]);
      return result.exists;
    } else {
      // SQLite
      const query = `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `;
      const result = await this.get(query, [tableName]);
      return !!result;
    }
  }

  // Convert SQL parameter placeholders (SQLite ? to PostgreSQL $1, $2, etc.)
  convertParams(sql, params) {
    if (this.dbType === 'postgresql' && sql.includes('?')) {
      let paramIndex = 1;
      const convertedSQL = sql.replace(/\?/g, () => `$${paramIndex++}`);
      return { sql: convertedSQL, params };
    }
    return { sql, params };
  }

  // Unified query execution method
  async query(sql, params = []) {
    const convertedSQL = this.convertSQL(sql);
    const { sql: finalSQL, params: finalParams } = this.convertParams(convertedSQL, params);
    
    if (this.dbType === 'postgresql') {
      return new Promise((resolve, reject) => {
        this.pool.query(finalSQL, finalParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            // Convert PostgreSQL result to SQLite-like format
            resolve({
              rows: result.rows,
              lastID: result.rows.length > 0 && result.rows[0].id ? result.rows[0].id : null,
              changes: result.rowCount || 0
            });
          }
        });
      });
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(finalSQL, finalParams, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              rows: rows || [],
              lastID: this.db.lastID,
              changes: this.db.changes
            });
          }
        });
      });
    }
  }

  // Unified run method (for INSERT, UPDATE, DELETE)
  async run(sql, params = []) {
    const convertedSQL = this.convertSQL(sql);
    const { sql: finalSQL, params: finalParams } = this.convertParams(convertedSQL, params);
    
    if (this.dbType === 'postgresql') {
      return new Promise((resolve, reject) => {
        this.pool.query(finalSQL, finalParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            // For INSERT, try to get the last inserted ID
            let lastID = null;
            if (result.rows && result.rows.length > 0) {
              lastID = result.rows[0].id || result.rows[0][Object.keys(result.rows[0])[0]] || null;
            } else if (finalSQL.toUpperCase().includes('INSERT') && finalSQL.toUpperCase().includes('RETURNING')) {
              // If RETURNING clause is used, get the ID from there
              // Otherwise, we'll need to query for it
            }
            
            resolve({
              lastID: lastID,
              changes: result.rowCount || 0
            });
          }
        });
      });
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.run(finalSQL, finalParams, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({
              lastID: this.lastID,
              changes: this.changes
            });
          }
        });
      });
    }
  }

  // Unified get method (for single row)
  async get(sql, params = []) {
    const convertedSQL = this.convertSQL(sql);
    const { sql: finalSQL, params: finalParams } = this.convertParams(convertedSQL, params);
    
    if (this.dbType === 'postgresql') {
      return new Promise((resolve, reject) => {
        this.pool.query(finalSQL, finalParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.rows[0] || null);
          }
        });
      });
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.get(finalSQL, finalParams, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row || null);
          }
        });
      });
    }
  }

  // Unified all method (for multiple rows)
  async all(sql, params = []) {
    const convertedSQL = this.convertSQL(sql);
    const { sql: finalSQL, params: finalParams } = this.convertParams(convertedSQL, params);
    
    if (this.dbType === 'postgresql') {
      return new Promise((resolve, reject) => {
        this.pool.query(finalSQL, finalParams, (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.rows || []);
          }
        });
      });
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(finalSQL, finalParams, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows || []);
          }
        });
      });
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
            photo_path TEXT,
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

        // Helper function to safely execute SQL (works with both SQLite and PostgreSQL)
        const safeExec = async (sql, tableName) => {
          try {
            if (this.dbType === 'postgresql') {
              // PostgreSQL uses query for everything
              await this.run(sql);
            } else {
              // SQLite uses exec for DDL statements
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
            }
          } catch (err) {
            // Ignore "table already exists" errors
            if (!err.message || (!err.message.includes('already exists') && !err.message.includes('duplicate') && !err.message.includes('relation'))) {
              console.error(`❌ Error creating ${tableName} table:`, err);
              throw err;
            }
          }
        };

        // Helper function to create all indexes (works with both SQLite and PostgreSQL)
        const createAllIndexes = async () => {
          const allIndexes = [...createIndexes, ...createBadgeIndexes, ...createWeeklyStatsIndexes, ...createTutorRequestsIndexes, ...createTeachersIndexes];
          
          if (allIndexes.length === 0) {
            return;
          }

          for (const index of allIndexes) {
            try {
              await this.run(index);
            } catch (indexErr) {
              // Ignore "already exists" errors
              if (indexErr.message && !indexErr.message.includes('already exists') && !indexErr.message.includes('duplicate') && !indexErr.message.includes('relation')) {
                console.warn('⚠️ Index creation warning:', indexErr.message);
              }
            }
          }
        };

        // Execute table creation sequentially using async/await
        (async () => {
          try {
            await safeExec(createVotesTable, 'votes');
            await safeExec(createBadgesTable, 'badges');
            await safeExec(createWeeklyStatsTable, 'weekly_stats');
            await safeExec(createWeeklyWinnersTable, 'weekly_winners');
            await safeExec(createTutorRequestsTable, 'tutor_requests');
            await safeExec(createTeachersTable, 'teachers');
            
            // Small delay for SQLite
            if (this.dbType === 'sqlite') {
              await new Promise(resolveDelay => setTimeout(resolveDelay, 100));
            }
            
            await createAllIndexes();
            
            console.log('✅ Database tables and indexes created successfully');
            this.runMigrationAfterSetup();
            resolve();
          } catch (error) {
            console.error('❌ Error creating database tables:', error);
            reject(error);
          }
        })();
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
        // Migrate VARCHAR(255) columns to TEXT for PostgreSQL
        return this.migrateVarcharToText();
      }).then(() => {
        // Ensure unique constraint exists to prevent duplicate votes
        return this.ensureUniqueVoteConstraint();
      }).then(() => {
        // Migrate teachers table to add photo_path column
        return this.migrateTeachersTable();
      }).then(() => {
        console.log('✅ Database migration completed');
      }).catch((migrationError) => {
        console.warn('⚠️ Migration will run on-demand:', migrationError.message);
        // Continue - migration will happen on-demand when needed
      });
    }, 50);
  }

  // Migrate tutor_requests table to remove teacher columns
  async migrateTutorRequestsTable() {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      // Check if table exists
      const tableExists = await this.tableExists('tutor_requests');
      if (!tableExists) {
        console.log('ℹ️ tutor_requests table does not exist yet, will be created with new schema');
        return;
      }

      // Get current columns
      const columns = await this.getTableInfo('tutor_requests');
      const columnNames = columns.map(col => col.name);
      const migrations = [];

      // Add student_phone if missing
      if (!columnNames.includes('student_phone')) {
        migrations.push(async () => {
          try {
            await this.run('ALTER TABLE tutor_requests ADD COLUMN student_phone VARCHAR(255);');
            console.log('✅ student_phone column added');
          } catch (err) {
            if (!err.message.includes('duplicate column') && !err.message.includes('already exists')) {
              throw err;
            }
          }
        });
      }

      // Remove teacher_name and teacher_phone columns if they exist
      // SQLite doesn't support DROP COLUMN, so we need to recreate the table
      if (columnNames.includes('teacher_name') || columnNames.includes('teacher_phone')) {
        migrations.push(async () => {
          try {
            console.log('🔄 Removing teacher_name and teacher_phone columns from tutor_requests...');
            
            if (this.dbType === 'postgresql') {
              // PostgreSQL supports DROP COLUMN
              if (columnNames.includes('teacher_name')) {
                await this.run('ALTER TABLE tutor_requests DROP COLUMN IF EXISTS teacher_name;');
                console.log('✅ teacher_name column removed');
              }
              if (columnNames.includes('teacher_phone')) {
                await this.run('ALTER TABLE tutor_requests DROP COLUMN IF EXISTS teacher_phone;');
                console.log('✅ teacher_phone column removed');
              }
            } else {
              // SQLite: recreate table without teacher columns
              await this.run('BEGIN TRANSACTION;');
              
              // Create new table without teacher columns
              await this.run(`
                CREATE TABLE tutor_requests_new (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  student_name TEXT NOT NULL,
                  student_phone TEXT NOT NULL,
                  subject TEXT NOT NULL,
                  level TEXT NOT NULL,
                  city TEXT NOT NULL,
                  preferred_schedule TEXT NOT NULL,
                  request_status TEXT DEFAULT 'pending',
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
              `);
              
              // Copy data (excluding teacher columns)
              await this.run(`
                INSERT INTO tutor_requests_new 
                (id, student_name, student_phone, subject, level, city, preferred_schedule, request_status, created_at, updated_at)
                SELECT id, student_name, student_phone, subject, level, city, preferred_schedule, request_status, created_at, updated_at
                FROM tutor_requests
              `);
              
              // Drop old table
              await this.run('DROP TABLE tutor_requests;');
              
              // Rename new table
              await this.run('ALTER TABLE tutor_requests_new RENAME TO tutor_requests;');
              
              // Recreate indexes
              await this.run('CREATE INDEX IF NOT EXISTS idx_tutor_requests_status ON tutor_requests(request_status);');
              await this.run('CREATE INDEX IF NOT EXISTS idx_tutor_requests_city ON tutor_requests(city);');
              await this.run('CREATE INDEX IF NOT EXISTS idx_tutor_requests_subject ON tutor_requests(subject);');
              await this.run('CREATE INDEX IF NOT EXISTS idx_tutor_requests_created_at ON tutor_requests(created_at);');
              
              await this.run('COMMIT;');
              console.log('✅ teacher_name and teacher_phone columns removed (table recreated)');
            }
          } catch (err) {
            if (this.dbType !== 'postgresql') {
              await this.run('ROLLBACK;');
            }
            console.error('❌ Error removing teacher columns:', err);
            // Don't throw - allow migration to continue
          }
        });
      }

      // Execute all migrations sequentially
      if (migrations.length === 0) {
        console.log('✅ tutor_requests table is up to date');
        return;
      }

      for (const migration of migrations) {
        await migration();
      }

      console.log('✅ tutor_requests table migration completed');
    } catch (error) {
      console.error('❌ Error during tutor_requests migration:', error);
      throw error;
    }
  }

  // Migrate teachers table to add photo_path column
  async migrateTeachersTable() {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const tableExists = await this.tableExists('teachers');
      if (!tableExists) {
        console.log('ℹ️ teachers table does not exist yet, will be created with new schema');
        return;
      }

      const columns = await this.getTableInfo('teachers');
      const columnNames = columns.map(col => col.name.toLowerCase());

      // Add photo_path column if missing
      if (!columnNames.includes('photo_path')) {
        try {
          if (this.dbType === 'postgresql') {
            await this.run('ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_path TEXT;');
          } else {
            await this.run('ALTER TABLE teachers ADD COLUMN photo_path TEXT;');
          }
          console.log('✅ photo_path column added to teachers table');
        } catch (err) {
          if (err.message && (err.message.includes('duplicate column') || err.message.includes('already exists'))) {
            console.log('ℹ️ photo_path column already exists');
          } else {
            throw err;
          }
        }
      } else {
        console.log('ℹ️ photo_path column already exists in teachers table');
      }

      console.log('✅ teachers table migration completed');
    } catch (error) {
      console.error('❌ Error during teachers table migration:', error);
    }
  }

  // Migrate votes table immediately (called during table creation)
  // Create unique constraint to prevent duplicate votes
  async ensureUniqueVoteConstraint() {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }
      
      // Check if vote_date column exists first
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      
      if (!hasVoteDate) {
        console.log('ℹ️ vote_date column does not exist yet, skipping unique constraint creation');
        return;
      }
      
      // Create unique constraint to prevent duplicate votes
      // This ensures the same user (IP + fingerprint) cannot vote for the same school on the same day
      if (this.dbType === 'postgresql') {
        // PostgreSQL: Create unique constraint
        try {
          // Drop constraint if it exists first
          try {
            await this.run('ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_unique_daily_vote');
          } catch (dropErr) {
            // Ignore if constraint doesn't exist
          }
          
          await this.run(`
            ALTER TABLE votes 
            ADD CONSTRAINT votes_unique_daily_vote 
            UNIQUE (voter_ip, voter_fingerprint, school_id, vote_date)
          `);
          console.log('✅ Created unique constraint on votes table (PostgreSQL)');
        } catch (constraintErr) {
          // Constraint might already exist
          if (constraintErr.code === '42P07' || constraintErr.message?.includes('already exists')) {
            console.log('ℹ️ Unique constraint already exists');
          } else {
            console.error('❌ Error creating unique constraint:', constraintErr);
          }
        }
      } else {
        // SQLite: Create unique index
        try {
          // Drop index if it exists first
          try {
            await this.run('DROP INDEX IF EXISTS votes_unique_daily_vote');
          } catch (dropErr) {
            // Ignore if index doesn't exist
          }
          
          await this.run(`
            CREATE UNIQUE INDEX votes_unique_daily_vote 
            ON votes(voter_ip, voter_fingerprint, school_id, vote_date)
          `);
          console.log('✅ Created unique index on votes table (SQLite)');
        } catch (indexErr) {
          console.error('❌ Error creating unique index:', indexErr);
          // If it fails due to duplicates, try to clean them up and retry
          if (indexErr.message?.includes('duplicate') || indexErr.message?.includes('UNIQUE')) {
            console.log('🔄 Cleaning up duplicates and retrying...');
            await this.cleanupDuplicateVotes();
            try {
              await this.run(`
                CREATE UNIQUE INDEX votes_unique_daily_vote 
                ON votes(voter_ip, voter_fingerprint, school_id, vote_date)
              `);
              console.log('✅ Created unique index after cleanup');
            } catch (retryErr) {
              console.error('❌ Still failed after cleanup:', retryErr);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error ensuring unique vote constraint:', error);
    }
  }
  
  // Clean up duplicate votes (keep only the first vote per IP+fingerprint+school+date)
  async cleanupDuplicateVotes() {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }
      
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      
      if (!hasVoteDate) {
        console.log('ℹ️ vote_date column does not exist, skipping cleanup');
        return;
      }
      
      console.log('🧹 Cleaning up duplicate votes...');
      
      if (this.dbType === 'postgresql') {
        // PostgreSQL: Delete duplicates, keeping the first one (lowest id)
        const deleteQuery = `
          DELETE FROM votes
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM votes
            GROUP BY voter_ip, voter_fingerprint, school_id, vote_date
          )
          AND vote_date IS NOT NULL
        `;
        const result = await this.run(deleteQuery);
        console.log(`✅ Cleaned up duplicate votes (PostgreSQL). Rows affected: ${result.rowCount || 0}`);
      } else {
        // SQLite: Delete duplicates, keeping the first one (lowest id)
        const deleteQuery = `
          DELETE FROM votes
          WHERE id NOT IN (
            SELECT MIN(id)
            FROM votes
            WHERE vote_date IS NOT NULL
            GROUP BY voter_ip, voter_fingerprint, school_id, vote_date
          )
          AND vote_date IS NOT NULL
        `;
        const result = await this.run(deleteQuery);
        console.log(`✅ Cleaned up duplicate votes (SQLite). Changes: ${result.changes || 0}`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicate votes:', error);
    }
  }

  async migrateVotesTableImmediate() {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }
      
      // Check immediately if column exists
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      
      if (hasVoteDate) {
        console.log('✅ vote_date column already exists');
        return;
      } else {
        // Column doesn't exist, run migration (SQLite only for now)
        if (this.dbType === 'sqlite') {
          await this.migrateVotesTable();
        }
      }
    } catch (err) {
      // Table might not exist yet, wait a bit and try again (SQLite only)
      if (this.dbType === 'sqlite') {
        setTimeout(async () => {
          try {
            await this.migrateVotesTable();
          } catch (migrationErr) {
            console.error('❌ Migration failed:', migrationErr);
          }
        }, 200);
      }
    }
  }

  // Migrate VARCHAR(255) columns to TEXT for PostgreSQL (fixes "value too long" errors)
  async migrateVarcharToText() {
    try {
      if (this.dbType !== 'postgresql') {
        return; // Only needed for PostgreSQL
      }

      if (!this.pool) {
        throw new Error('Database not initialized');
      }

      // List of tables and columns that should be TEXT (unlimited)
      const migrations = [
        {
          table: 'votes',
          columns: ['school_id', 'school_name', 'school_region', 'school_level', 'voter_ip', 'voter_fingerprint', 'voter_user_agent']
        },
        {
          table: 'weekly_stats',
          columns: ['school_id', 'school_name', 'school_region', 'school_level']
        },
        {
          table: 'school_badges',
          columns: ['school_id', 'school_name', 'badge_type', 'badge_name', 'badge_description']
        },
        {
          table: 'tutor_requests',
          columns: ['student_name', 'student_phone', 'subject', 'level', 'city', 'preferred_schedule', 'teacher_name', 'teacher_phone']
        },
        {
          table: 'teachers',
          columns: ['teacher_name', 'teacher_phone', 'subjects', 'cities', 'levels']
        }
      ];

      for (const { table, columns } of migrations) {
        // Check if table exists
        const tableExists = await this.tableExists(table);
        if (!tableExists) {
          console.log(`ℹ️ Table ${table} does not exist yet, will be created with TEXT columns`);
          continue;
        }

        // Get current column info
        const tableColumns = await this.getTableInfo(table);
        
        for (const columnName of columns) {
          const column = tableColumns.find(col => col.name === columnName);
          if (!column) {
            continue; // Column doesn't exist, skip
          }

          // Check if column is VARCHAR(255) or character varying(255)
          const dataType = column.type?.toLowerCase() || '';
          if (dataType.includes('varchar') || dataType.includes('character varying')) {
            try {
              // Alter column to TEXT
              await this.run(`ALTER TABLE ${table} ALTER COLUMN ${columnName} TYPE TEXT`);
              console.log(`✅ Migrated ${table}.${columnName} from VARCHAR(255) to TEXT`);
            } catch (alterErr) {
              // Column might already be TEXT or migration might have failed
              if (alterErr.message?.includes('already') || alterErr.message?.includes('same type')) {
                console.log(`ℹ️ ${table}.${columnName} is already TEXT or cannot be altered`);
              } else {
                console.warn(`⚠️ Could not migrate ${table}.${columnName}:`, alterErr.message);
              }
            }
          }
        }
      }

      console.log('✅ VARCHAR to TEXT migration completed');
    } catch (error) {
      console.warn('⚠️ Error during VARCHAR to TEXT migration:', error.message);
      // Don't throw - allow app to continue
    }
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
  async ensureVoteDateColumn() {
    if (!this.db && !this.pool) {
      throw new Error('Database not initialized');
    }
    
    try {
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      if (hasVoteDate) {
        return;
      } else {
        // Column doesn't exist, try to add it (SQLite only for now)
        if (this.dbType === 'sqlite') {
          console.log('⚠️ vote_date column missing, attempting to add...');
          await this.migrateVotesTable();
        } else {
          // For PostgreSQL, the column should already exist from table creation
          console.log('ℹ️ vote_date column check for PostgreSQL - assuming it exists');
        }
      }
    } catch (err) {
      console.error('❌ Error checking votes table:', err);
      // For PostgreSQL, if table doesn't exist yet, it will be created with vote_date
      if (this.dbType === 'postgresql') {
        return; // Allow to continue, table creation will handle it
      }
      throw err;
    }
  }

  // Get current date (YYYY-MM-DD format)
  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  // Get user vote status (daily and weekly limits)
  // CRITICAL: Now accepts fingerprint to correctly identify user after refresh
  async getUserVoteStatus(voterIp, voterFingerprint) {
    if (!this.db && !this.pool) {
      throw new Error('Database not initialized');
    }
    
    // CRITICAL: Fingerprint is required for proper user identification
    if (!voterFingerprint || typeof voterFingerprint !== 'string' || voterFingerprint.trim() === '') {
      console.warn('⚠️ getUserVoteStatus: No fingerprint provided, using IP only (may be inaccurate)');
    }
    
    try {
      // Ensure vote_date column exists before querying
      await this.ensureVoteDateColumn();
      
      // Check column existence using unified method
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      const dateColumn = hasVoteDate ? 'vote_date' : 'DATE(vote_timestamp)';
      
      const weekStart = this.getCurrentWeekStart();
      const currentDate = this.getCurrentDate();
      
      // CRITICAL: Use fingerprint in queries to correctly identify user
      // Use same query format as recordVote for consistency with proper date comparison
      let dailyQuery;
      if (hasVoteDate) {
        if (this.dbType === 'postgresql') {
          dailyQuery = voterFingerprint && voterFingerprint.trim() !== ''
            ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND vote_date = ?::date`
            : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND vote_date = ?::date`;
        } else {
          dailyQuery = voterFingerprint && voterFingerprint.trim() !== ''
            ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND DATE(vote_date) = DATE(?)`
            : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND DATE(vote_date) = DATE(?)`;
        }
      } else {
        dailyQuery = voterFingerprint && voterFingerprint.trim() !== ''
          ? `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND DATE(vote_timestamp) = DATE(?)`
          : `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND DATE(vote_timestamp) = DATE(?)`;
      }
      const dailyParams = voterFingerprint && voterFingerprint.trim() !== ''
        ? [voterIp, voterFingerprint, currentDate]
        : [voterIp, currentDate];
      
      // Check if user has voted today
      const dailyRow = await this.get(dailyQuery, dailyParams);
      const hasVotedToday = dailyRow ? (dailyRow.count > 0) : false;
      const lastVoteDate = hasVotedToday ? currentDate : null;
      
      // Check total weekly votes - also use fingerprint
      const weeklyQuery = voterFingerprint && voterFingerprint.trim() !== ''
        ? 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND week_start = ?'
        : 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND week_start = ?';
      const weeklyParams = voterFingerprint && voterFingerprint.trim() !== ''
        ? [voterIp, voterFingerprint, weekStart]
        : [voterIp, weekStart];
      
      const weeklyRow = await this.get(weeklyQuery, weeklyParams);
      const weeklyVoteCount = weeklyRow ? (weeklyRow.count || 0) : 0;
      const remainingWeeklyVotes = Math.max(0, 7 - weeklyVoteCount);
      const weeklyLimitReached = weeklyVoteCount >= 7;
      
      console.log(`📊 Vote status for IP: ${voterIp}, FP: ${voterFingerprint?.substring(0, 20)}..., Daily: ${hasVotedToday}, Weekly: ${weeklyVoteCount}/7`);
      
      return {
        hasVotedToday,
        lastVoteDate,
        weeklyVoteCount,
        remainingWeeklyVotes,
        weeklyLimitReached,
        currentDate,
        weekStart
      };
    } catch (error) {
      console.error('❌ Error getting user vote status:', error);
      throw error;
    }
  }

  // Record a vote (with atomic transaction to prevent race conditions)
  async recordVote(schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent) {
    // Check database initialization for both SQLite and PostgreSQL
    if (!this.db && !this.pool) {
      throw new Error('Database not initialized');
    }
    
    // CRITICAL: Validate fingerprint is present BEFORE any database operations
    if (!voterFingerprint || typeof voterFingerprint !== 'string' || voterFingerprint.trim() === '') {
      console.error('❌ CRITICAL: voterFingerprint is missing or invalid:', voterFingerprint);
      throw new Error('Fingerprint is required but was null or invalid');
    }
    
    try {
      // Ensure vote_date column exists before inserting
      await this.ensureVoteDateColumn();
      
      const weekStart = this.getCurrentWeekStart();
      const currentDate = this.getCurrentDate();
      
      // Check column existence using unified method
      const columns = await this.getTableInfo('votes');
      const hasVoteDateCol = columns && columns.some(col => col.name === 'vote_date');
      const dateColumn = hasVoteDateCol ? 'vote_date' : 'DATE(vote_timestamp)';
      
      // Start transaction
      try {
        // Begin transaction (works for both SQLite and PostgreSQL)
        if (this.dbType === 'postgresql') {
          await this.run('BEGIN');
        } else {
          // Try BEGIN IMMEDIATE for SQLite, fallback to BEGIN
          try {
            await this.run('BEGIN IMMEDIATE TRANSACTION');
          } catch (beginErr) {
            console.warn('⚠️ BEGIN IMMEDIATE not supported, trying BEGIN:', beginErr.message);
            await this.run('BEGIN TRANSACTION');
          }
        }
        
        // CRITICAL: Check if user already voted for THIS SPECIFIC school today
        // Rule: 1 vote per school per day, max 7 votes per week
        // ALWAYS use IP + fingerprint combination (fingerprint should NEVER be null)
        // Use proper date comparison for both SQLite and PostgreSQL
        
        // FIRST: Check by IP + Fingerprint + School + Date (most specific)
        let checkSchoolQuery;
        if (hasVoteDateCol) {
          if (this.dbType === 'postgresql') {
            checkSchoolQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND vote_date = ?::date`;
          } else {
            checkSchoolQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_date) = DATE(?)`;
          }
        } else {
          checkSchoolQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
        }
        const checkSchoolParams = [voterIp, voterFingerprint, schoolId, currentDate];
        
        console.log(`🔍 [TRANSACTION] Checking if user already voted for school ${schoolId} today. IP: ${voterIp}, Fingerprint: ${voterFingerprint.substring(0, 20)}..., Date: ${currentDate}`);
        
        // DEBUG: Query to see what's actually in the database
        try {
          let debugQuery;
          if (hasVoteDateCol) {
            if (this.dbType === 'postgresql') {
              debugQuery = `SELECT id, voter_ip, voter_fingerprint, school_id, vote_date FROM votes WHERE school_id = ? AND vote_date = ?::date ORDER BY id DESC LIMIT 10`;
            } else {
              debugQuery = `SELECT id, voter_ip, voter_fingerprint, school_id, vote_date FROM votes WHERE school_id = ? AND DATE(vote_date) = DATE(?) ORDER BY id DESC LIMIT 10`;
            }
          } else {
            debugQuery = `SELECT id, voter_ip, voter_fingerprint, school_id, DATE(vote_timestamp) as vote_date FROM votes WHERE school_id = ? AND DATE(vote_timestamp) = DATE(?) ORDER BY id DESC LIMIT 10`;
          }
          const debugRows = await this.all(debugQuery, [schoolId, currentDate]);
          if (debugRows && debugRows.length > 0) {
            console.log(`🔍 [DEBUG] ALL votes for this school today:`, JSON.stringify(debugRows, null, 2));
            console.log(`🔍 [DEBUG] Total votes found: ${debugRows.length}`);
          }
        } catch (debugErr) {
          console.error('❌ Debug query error:', debugErr);
        }
        
        const schoolRow = await this.get(checkSchoolQuery, checkSchoolParams);
        const schoolVoteCount = schoolRow ? (schoolRow.count || 0) : 0;
        console.log(`📊 [TRANSACTION] Vote count for this IP+FP+School today: ${schoolVoteCount}`);
        
        // CRITICAL: Block if user already voted for THIS school today (1 vote per school per day)
        if (schoolVoteCount > 0) {
          console.log(`🚫 [TRANSACTION] BLOCKING VOTE - Already voted for this school ${schoolVoteCount} time(s) today`);
          await this.run('ROLLBACK');
          return {
            success: false,
            error: 'Already voted for this school today',
            message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
            remainingVotes: 0,
            hasVotedToday: true
          };
        }
        
        // ADDITIONAL CHECK: Also check by IP only (in case fingerprint changed)
        // This is a fallback to prevent abuse if fingerprint changes
        let checkByIpQuery;
        if (hasVoteDateCol) {
          if (this.dbType === 'postgresql') {
            checkByIpQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND school_id = ? AND vote_date = ?::date`;
          } else {
            checkByIpQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND school_id = ? AND DATE(vote_date) = DATE(?)`;
          }
        } else {
          checkByIpQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
        }
        const ipCheckRow = await this.get(checkByIpQuery, [voterIp, schoolId, currentDate]);
        const ipVoteCount = ipCheckRow ? (ipCheckRow.count || 0) : 0;
        console.log(`📊 [TRANSACTION] Vote count for this IP+School today (IP-only check): ${ipVoteCount}`);
        
        // Block if same IP already voted for this school today (even with different fingerprint)
        if (ipVoteCount > 0) {
          console.log(`🚫 [TRANSACTION] BLOCKING VOTE - Same IP already voted for this school ${ipVoteCount} time(s) today`);
          await this.run('ROLLBACK');
          return {
            success: false,
            error: 'Already voted for this school today',
            message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
            remainingVotes: 0,
            hasVotedToday: true
          };
        }
        
        // Check weekly limit (max 7 votes per week)
        const weeklyCheckQuery = 'SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND week_start = ?';
        const weeklyCheckParams = [voterIp, voterFingerprint, weekStart];
        const weeklyRow = await this.get(weeklyCheckQuery, weeklyCheckParams);
        const weeklyCount = weeklyRow ? (weeklyRow.count || 0) : 0;
        console.log(`📊 Weekly vote count: ${weeklyCount}/7`);
        
        if (weeklyCount >= 7) {
          console.log(`🚫 Blocking vote - weekly limit reached (7 votes)`);
          await this.run('ROLLBACK');
          return {
            success: false,
            error: 'Weekly limit reached',
            message: 'Vos votes hebdomadaires sont épuisés.',
            remainingVotes: 0,
            weeklyLimitReached: true
          };
        }
        
        // DOUBLE CHECK: Verify one more time before inserting (within same transaction)
        let doubleCheckQuery;
        if (hasVoteDateCol) {
          if (this.dbType === 'postgresql') {
            doubleCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND vote_date = ?::date`;
          } else {
            doubleCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_date) = DATE(?)`;
          }
        } else {
          doubleCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
        }
        const doubleCheckRow = await this.get(doubleCheckQuery, checkSchoolParams);
        const doubleCheckCount = doubleCheckRow ? (doubleCheckRow.count || 0) : 0;
        console.log(`🔍 Double check vote count for this school: ${doubleCheckCount}`);
        
        if (doubleCheckCount > 0) {
          console.log(`🚫 Blocking vote after double check - already voted for this school ${doubleCheckCount} time(s) today`);
          await this.run('ROLLBACK');
          return {
            success: false,
            error: 'Already voted for this school today',
            message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
            remainingVotes: Math.max(0, 7 - weeklyCount),
            hasVotedToday: true
          };
        }
        
        // CRITICAL: Ensure currentDate is never null/undefined
        if (!currentDate || currentDate === 'null' || currentDate === 'undefined') {
          console.error('❌ Invalid currentDate:', currentDate);
          await this.run('ROLLBACK');
          throw new Error('Invalid date for vote');
        }
        
        // FINAL CHECK: Query database one more time with EXACT same conditions as INSERT
        let finalCheckQuery;
        if (hasVoteDateCol) {
          if (this.dbType === 'postgresql') {
            finalCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND vote_date = ?::date`;
          } else {
            finalCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_date) = DATE(?)`;
          }
        } else {
          finalCheckQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
        }
        const finalCheckRow = await this.get(finalCheckQuery, [voterIp, voterFingerprint, schoolId, currentDate]);
        const finalCheckCount = finalCheckRow ? (finalCheckRow.count || 0) : 0;
        console.log(`🔍 [TRANSACTION] FINAL CHECK before insert: ${finalCheckCount} existing votes`);
        
        if (finalCheckCount > 0) {
          console.log(`🚫 [TRANSACTION] FINAL CHECK BLOCKED - Found ${finalCheckCount} existing vote(s) before insert`);
          await this.run('ROLLBACK');
          return {
            success: false,
            error: 'Already voted for this school today',
            message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
            remainingVotes: 0,
            hasVotedToday: true
          };
        }
        
        // Insert the vote
        const insertQuery = hasVoteDateCol 
          ? 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_fingerprint, voter_user_agent, vote_date, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
          : 'INSERT INTO votes (school_id, school_name, school_region, school_level, voter_ip, voter_fingerprint, voter_user_agent, week_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        
        const insertParams = hasVoteDateCol
          ? [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent, currentDate, weekStart]
          : [schoolId, schoolName, schoolRegion, schoolLevel, voterIp, voterFingerprint, userAgent, weekStart];
        
        console.log(`✅ [TRANSACTION] Inserting vote for school ${schoolId}, IP: ${voterIp}, FP: ${voterFingerprint.substring(0, 20)}..., Date: ${currentDate}, HasDateCol: ${hasVoteDateCol}`);
        
        try {
          let insertResult;
          try {
            insertResult = await this.run(insertQuery, insertParams);
          } catch (insertError) {
            // Handle unique constraint violations (duplicate vote attempts)
            // PostgreSQL error code: 23505, SQLite error code: SQLITE_CONSTRAINT_UNIQUE
            const isUniqueError = insertError.code === '23505' || 
                                 insertError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                                 insertError.message?.includes('UNIQUE constraint') ||
                                 insertError.message?.includes('duplicate key');
            
            if (isUniqueError) {
              console.log(`🚫 [TRANSACTION] Unique constraint violation - duplicate vote blocked at database level`);
              await this.run('ROLLBACK');
              return {
                success: false,
                error: 'Already voted for this school today',
                message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
                remainingVotes: Math.max(0, 7 - weeklyCount),
                hasVotedToday: true
              };
            }
            // Re-throw if it's a different error
            throw insertError;
          }
          
          const voteId = insertResult.lastID;
          console.log(`✅ [TRANSACTION] Vote inserted successfully. ID: ${voteId}`);
          
          // Update weekly stats
          if (voteId) {
            await this.updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart);
          }
          
          // VERIFY: Check if vote was actually inserted
          let verifyQuery;
          if (hasVoteDateCol) {
            if (this.dbType === 'postgresql') {
              verifyQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND vote_date = ?::date`;
            } else {
              verifyQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_date) = DATE(?)`;
            }
          } else {
            verifyQuery = `SELECT COUNT(*) as count FROM votes WHERE voter_ip = ? AND voter_fingerprint = ? AND school_id = ? AND DATE(vote_timestamp) = DATE(?)`;
          }
          const verifyRow = await this.get(verifyQuery, [voterIp, voterFingerprint, schoolId, currentDate]);
          const verifyCount = verifyRow ? (verifyRow.count || 0) : 0;
          console.log(`🔍 [TRANSACTION] Post-insert verification: ${verifyCount} vote(s) found`);
          
          if (verifyCount > 1) {
            console.error('❌ [TRANSACTION] CRITICAL: Multiple votes found after insert! This should not happen!');
          }
          
          // Commit the transaction
          await this.run('COMMIT');
          
          // Get updated status after vote
          try {
            const updatedStatus = await this.getUserVoteStatus(voterIp, voterFingerprint);
            return {
              success: true,
              voteId: voteId,
              remainingVotes: updatedStatus.remainingWeeklyVotes,
              message: 'Vote enregistré avec succès',
              hasVotedToday: true
            };
          } catch (updateErr) {
            // Still return success even if status update fails
            return {
              success: true,
              voteId: voteId,
              remainingVotes: Math.max(0, 7 - weeklyCount - 1),
              message: 'Vote enregistré avec succès',
              hasVotedToday: true
            };
          }
        } catch (insertErr) {
          await this.run('ROLLBACK');
          
          // Check if it's a duplicate vote error (database constraint)
          const isConstraintError = insertErr.code === 'SQLITE_CONSTRAINT' || 
                                    insertErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                                    insertErr.code === 19 ||
                                    insertErr.code === 2067 ||
                                    insertErr.code === '23505' || // PostgreSQL unique violation
                                    (insertErr.message && (
                                      insertErr.message.includes('UNIQUE') || 
                                      insertErr.message.includes('duplicate') ||
                                      insertErr.message.includes('constraint') ||
                                      insertErr.message.includes('unique_violation')
                                    ));
          
          if (isConstraintError) {
            console.log('🚫 [TRANSACTION] Duplicate vote blocked by database UNIQUE constraint');
            return {
              success: false,
              error: 'Duplicate vote',
              message: 'Vous avez déjà voté pour cette école aujourd\'hui!',
              remainingVotes: Math.max(0, 7 - weeklyCount),
              hasVotedToday: true
            };
          }
          
          // Log the error for debugging
          console.error('❌ [TRANSACTION] Database insert error (not duplicate):', insertErr);
          throw insertErr;
        }
      } catch (error) {
        try {
          await this.run('ROLLBACK');
        } catch (rollbackErr) {
          // Ignore rollback errors
        }
        console.error('❌ Error recording vote:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Error recording vote:', error);
      throw error;
    }
  }

  // Update weekly statistics
  async updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart) {
    try {
      // PostgreSQL uses different ON CONFLICT syntax
      const conflictClause = this.dbType === 'postgresql' 
        ? 'ON CONFLICT (school_id, week_start)' 
        : 'ON CONFLICT(school_id, week_start)';
      
      await this.run(
        `INSERT INTO weekly_stats (school_id, school_name, school_region, school_level, week_start, vote_count, last_updated)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
         ${conflictClause} DO UPDATE SET
           vote_count = vote_count + 1,
           last_updated = CURRENT_TIMESTAMP`,
        [schoolId, schoolName, schoolRegion, schoolLevel, weekStart]
      );
    } catch (error) {
      console.error('❌ Error updating weekly stats:', error);
    }
  }

  // Get top voted schools for a region and level
  async getTopVotedSchools(region = null, level = null, limit = 10) {
    if (!this.db && !this.pool) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Count votes directly from votes table for accuracy (same as vote counts endpoint)
      const weekStart = this.getCurrentWeekStart();
      
      // Check if vote_date column exists
      const columns = await this.getTableInfo('votes');
      const hasVoteDate = columns && columns.some(col => col.name === 'vote_date');
      
      let query;
      let params = [weekStart];
      
      if (hasVoteDate) {
        // Use vote_date column if it exists
        query = `
          SELECT 
            school_id,
            school_name,
            school_region,
            school_level,
            COUNT(*) as total_votes,
            COUNT(DISTINCT voter_ip) as unique_voters,
            MAX(vote_date) as last_vote_time
          FROM votes
          WHERE week_start = ?
        `;
      } else {
        // Fallback to vote_timestamp
        query = `
          SELECT 
            school_id,
            school_name,
            school_region,
            school_level,
            COUNT(*) as total_votes,
            COUNT(DISTINCT voter_ip) as unique_voters,
            MAX(vote_timestamp) as last_vote_time
          FROM votes
          WHERE week_start = ?
        `;
      }

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
        ORDER BY total_votes DESC
        LIMIT ?
      `;
      params.push(limit);

      const rows = await this.all(query, params);
      
      // Format the results - unique_voters is already in the query result
      const schoolsWithVoters = rows.map((school, index) => {
        return {
          ...school,
          rank: index + 1,
          total_votes: parseInt(school.total_votes || 0),
          unique_voters: parseInt(school.unique_voters || 0)
        };
      });
      
      return {
        success: true,
        schools: schoolsWithVoters,
        week_start: weekStart
      };
    } catch (error) {
      console.error('❌ Error fetching top voted schools:', error);
      throw error;
    }
  }

  // Get all votes with filters (for admin)
  async getVotes(filters = {}) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      let query = 'SELECT * FROM votes WHERE 1=1';
      const params = [];

      if (filters.region) {
        query += ' AND school_region = ?';
        params.push(filters.region);
      }

      if (filters.school) {
        query += ' AND (school_name LIKE ? OR school_id LIKE ?)';
        const searchPattern = `%${filters.school}%`;
        params.push(searchPattern, searchPattern);
      }

      if (filters.search) {
        query += ' AND (school_name LIKE ? OR school_id LIKE ? OR voter_ip LIKE ? OR school_region LIKE ?)';
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (filters.level) {
        query += ' AND school_level = ?';
        params.push(filters.level);
      }

      if (filters.week_start) {
        query += ' AND week_start = ?';
        params.push(filters.week_start);
      }

      // Order by most recent first
      query += ' ORDER BY vote_timestamp DESC, vote_date DESC';

      // Limit results if specified
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      const rows = await this.all(query, params);

      return {
        success: true,
        votes: rows,
        count: rows.length
      };
    } catch (error) {
      console.error('❌ Error fetching votes:', error);
      throw error;
    }
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
  async checkAndAwardBadges() {
    if (!this.db && !this.pool) {
      throw new Error('Database not initialized');
    }
    
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Top Performer Badge (Top 3 in region this week)
      const topPerformers = await this.all(
        'SELECT school_id, school_name, school_region, school_level, SUM(vote_count) as total_votes FROM weekly_stats WHERE week_start = ? GROUP BY school_id, school_name, school_region, school_level ORDER BY school_region, school_level, total_votes DESC',
        [weekStart]
      );
      
      if (topPerformers && topPerformers.length > 0) {

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
            const communityFavorites = await this.all(
              'SELECT school_id, school_name, SUM(vote_count) as total_votes FROM weekly_stats WHERE week_start = ? AND vote_count >= 100 GROUP BY school_id, school_name',
              [weekStart]
            );

            if (communityFavorites && communityFavorites.length > 0) {
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
            }

            await Promise.all(badgePromises);
            console.log('✅ Badge checking and awarding completed');
          }
    } catch (error) {
      console.error('❌ Error checking and awarding badges:', error);
      // Don't throw - badges are not critical
    }
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
  async saveTutorRequest(requestData) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const {
        student_name,
        student_phone,
        subject,
        level,
        city,
        preferred_schedule
      } = requestData;

      const query = `
        INSERT INTO tutor_requests 
        (student_name, student_phone, subject, level, city, preferred_schedule, request_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const params = [student_name, student_phone, subject, level, city, preferred_schedule];

      await this.run(query, params);

      return {
        success: true,
        message: 'Tutor request saved successfully'
      };
    } catch (error) {
      console.error('❌ Error saving tutor request:', error);
      throw error;
    }
  }

  // Get tutor requests with filters
  async getTutorRequests(filters = {}) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

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

      const requests = await this.all(query, params);

      return {
        success: true,
        requests: requests || [],
        total: requests ? requests.length : 0
      };
    } catch (error) {
      console.error('❌ Error getting tutor requests:', error);
      throw error;
    }
  }

  // Update tutor request status
  async updateTutorRequestStatus(requestId, status) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const query = `
        UPDATE tutor_requests 
        SET request_status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await this.run(query, [status, requestId]);

      return {
        success: true,
        message: 'Tutor request status updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating tutor request status:', error);
      throw error;
    }
  }

  // Save or update teacher in database
  async saveOrUpdateTeacher(teacherData) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const {
        teacher_name,
        teacher_phone,
        subject,
        city,
        level,
        photo_path
      } = teacherData;

      // First, check if teacher exists
      const existingTeacher = await this.get(
        'SELECT * FROM teachers WHERE teacher_name = ? AND teacher_phone = ?',
        [teacher_name, teacher_phone]
      );

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

        // Preserve existing photo_path if new one is not provided
        const finalPhotoPath = photo_path || existingTeacher.photo_path || null;

        const updateQuery = `
          UPDATE teachers 
          SET subjects = ?, cities = ?, levels = ?, 
              total_requests = ?, updated_at = CURRENT_TIMESTAMP,
              photo_path = ?
          WHERE teacher_name = ? AND teacher_phone = ?
        `;

        const updateParams = [
          currentSubjects.join(','),
          currentCities.join(','),
          currentLevels.join(','),
          newTotalRequests,
          finalPhotoPath,
          teacher_name,
          teacher_phone
        ];

        await this.run(updateQuery, updateParams);

        return {
          success: true,
          id: existingTeacher.id,
          message: 'Teacher updated successfully',
          isNew: false
        };
      } else {
        // Insert new teacher
        const returningClause = this.dbType === 'postgresql' ? ' RETURNING id' : '';
        const insertQuery = `
          INSERT INTO teachers (
            teacher_name, teacher_phone, subjects, cities, levels, photo_path, total_requests
          ) VALUES (?, ?, ?, ?, ?, ?, 1)${returningClause}
        `;

        const result = await this.run(
          insertQuery,
          [teacher_name, teacher_phone, subject || '', city || '', level || '', photo_path || '']
        );

        // Get the inserted ID
        let insertedId = result.lastID;
        if (this.dbType === 'postgresql' && !insertedId) {
          const lastRow = await this.get('SELECT id FROM teachers ORDER BY id DESC LIMIT 1');
          insertedId = lastRow ? lastRow.id : null;
        }

        return {
          success: true,
          id: insertedId,
          message: 'Teacher saved successfully',
          isNew: true
        };
      }
    } catch (error) {
      console.error('❌ Error saving teacher:', error);
      throw error;
    }
  }

  // Get all teachers with filters
  async getTeachers(filters = {}) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

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

      if (filters.level) {
        query += ' AND levels LIKE ?';
        params.push(`%${filters.level}%`);
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

      const teachers = await this.all(query, params);

      return {
        success: true,
        teachers: teachers || [],
        total: teachers ? teachers.length : 0
      };
    } catch (error) {
      console.error('❌ Error getting teachers:', error);
      throw error;
    }
  }

  // Update teacher status
  async updateTeacherStatus(teacherId, status) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const query = `
        UPDATE teachers 
        SET status = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;

      await this.run(query, [status, teacherId]);

      return {
        success: true,
        message: 'Teacher status updated successfully'
      };
    } catch (error) {
      console.error('❌ Error updating teacher status:', error);
      throw error;
    }
  }

  // Delete teacher
  async deleteTeacher(teacherId) {
    try {
      if (!this.db && !this.pool) {
        throw new Error('Database not initialized');
      }

      const query = 'DELETE FROM teachers WHERE id = ?';

      await this.run(query, [teacherId]);

      return {
        success: true,
        message: 'Teacher deleted successfully'
      };
    } catch (error) {
      console.error('❌ Error deleting teacher:', error);
      throw error;
    }
  }

  // Backup database (SQLite only - PostgreSQL backups are handled by Render)
  backupDatabase() {
    return new Promise((resolve, reject) => {
      if (this.dbType === 'postgresql') {
        // PostgreSQL backups are handled by Render automatically
        return resolve({
          success: true,
          message: 'PostgreSQL backups are managed by Render automatically',
          backupPath: null
        });
      }
      
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

  // Restore database from backup (SQLite only - PostgreSQL restores via Render)
  restoreDatabase(backupPath) {
    return new Promise((resolve, reject) => {
      if (this.dbType === 'postgresql') {
        return reject(new Error('PostgreSQL restores must be done via Render dashboard or pg_restore'));
      }
      
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
      if (this.dbType === 'postgresql') {
        // PostgreSQL backups are managed by Render
        return {
          success: true,
          backups: [],
          message: 'PostgreSQL backups are managed automatically by Render. Check your Render dashboard for backup options.'
        };
      }
      
      if (!this.backupDir || !fs.existsSync(this.backupDir)) {
        return {
          success: true,
          backups: []
        };
      }
      
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
    if (this.dbType === 'postgresql' && this.pool) {
      this.pool.end((err) => {
        if (err) {
          console.error('❌ Error closing PostgreSQL connection:', err);
        } else {
          console.log('✅ PostgreSQL connection pool closed');
        }
      });
    } else if (this.db) {
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