const fs = require('fs');
const path = require('path');

class VotingDataBackup {
    constructor() {
        this.dbPath = path.join(__dirname, 'voting_data.json');
        this.backupDir = path.join(__dirname, 'backups');
    }

    // Create backup directory if it doesn't exist
    ensureBackupDir() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Create timestamped backup
    createBackup() {
        try {
            this.ensureBackupDir();
            
            if (!fs.existsSync(this.dbPath)) {
                console.log('❌ No voting data file found to backup');
                return false;
            }

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `voting_data_${timestamp}.json`);
            
            fs.copyFileSync(this.dbPath, backupPath);
            console.log(`✅ Backup created: ${backupPath}`);
            return true;
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            return false;
        }
    }

    // List all backups
    listBackups() {
        try {
            this.ensureBackupDir();
            
            const files = fs.readdirSync(this.backupDir)
                .filter(file => file.startsWith('voting_data_') && file.endsWith('.json'))
                .sort()
                .reverse();

            console.log('📁 Available backups:');
            files.forEach((file, index) => {
                const filePath = path.join(this.backupDir, file);
                const stats = fs.statSync(filePath);
                console.log(`${index + 1}. ${file} (${stats.size} bytes, ${stats.mtime})`);
            });

            return files;
        } catch (error) {
            console.error('❌ Error listing backups:', error);
            return [];
        }
    }

    // Restore from backup
    restoreBackup(backupIndex) {
        try {
            const backups = this.listBackups();
            if (backupIndex < 1 || backupIndex > backups.length) {
                console.log('❌ Invalid backup index');
                return false;
            }

            const backupFile = backups[backupIndex - 1];
            const backupPath = path.join(this.backupDir, backupFile);
            
            fs.copyFileSync(backupPath, this.dbPath);
            console.log(`✅ Restored from backup: ${backupFile}`);
            return true;
        } catch (error) {
            console.error('❌ Error restoring backup:', error);
            return false;
        }
    }
}

// Usage example
if (require.main === module) {
    const backup = new VotingDataBackup();
    
    // Create backup
    backup.createBackup();
    
    // List backups
    backup.listBackups();
}

module.exports = VotingDataBackup;
