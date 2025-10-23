# 📊 Community Voting Data Storage & Analysis Guide

## 🗂️ **Where Voting Data is Stored**

### **Primary Storage: `voting_data.json`**
- **Location**: Root directory of the application
- **Format**: JSON file with structured data
- **Size**: Grows as more votes are recorded
- **Backup**: Automatically created in `backups/` directory

### **Data Structure**
```json
{
  "votes": [
    {
      "id": "unique_vote_id",
      "school_id": "school_identifier", 
      "school_name": "School Name",
      "school_region": "Region Name",
      "school_level": "primary|middle|secondary",
      "voter_ip": "user_ip_address",
      "voter_user_agent": "browser_info",
      "vote_timestamp": "2025-10-23T00:02:23.435Z",
      "week_start": "2025-10-19"
    }
  ],
  "badges": [
    {
      "id": "badge_id",
      "school_id": "school_identifier",
      "school_name": "School Name", 
      "badge_type": "top_performer_gold",
      "badge_name": "🏆 Champion Régional",
      "badge_description": "Description",
      "earned_date": "2025-10-23T00:02:23.436Z",
      "is_active": 1
    }
  ],
  "weeklyStats": {
    "school_week_key": {
      "school_id": "school_identifier",
      "school_name": "School Name",
      "school_region": "Region Name", 
      "school_level": "primary|middle|secondary",
      "week_start": "2025-10-19",
      "vote_count": 1,
      "last_updated": "2025-10-23T00:02:23.435Z"
    }
  }
}
```

## 📈 **Data Analysis Tools**

### **1. Real-time Analysis Script**
```bash
node analyze_voting_data.js
```

**Output includes:**
- Overall statistics (total votes, unique schools, voters)
- Top 10 voted schools
- Weekly voting trends
- Regional analysis
- Level analysis (primary/middle/secondary)
- Badge analysis

### **2. Data Backup & Restore**
```bash
# Create backup
node backup_voting_data.js

# List available backups
node -e "const backup = require('./backup_voting_data.js'); new backup().listBackups();"
```

### **3. Export to CSV**
```javascript
const analyzer = require('./analyze_voting_data.js');
const analyzer = new analyzer();
analyzer.exportToCSV('voting_analysis.csv');
```

## 🔄 **Data Flow & Updates**

### **When a Vote is Cast:**
1. **Vote Recorded**: Added to `votes` array with timestamp
2. **Weekly Stats Updated**: School's weekly vote count incremented
3. **Badge Check**: System checks if school qualifies for badges
4. **File Saved**: All data persisted to `voting_data.json`

### **Anti-Spam Protection:**
- **7 votes per school per week per IP**
- **Weekly reset every Monday**
- **IP-based tracking**

## 📊 **Analysis Capabilities**

### **Real-time Statistics:**
- Total votes cast
- Unique schools participating
- Unique voters
- Average votes per school
- Badge distribution

### **Trend Analysis:**
- Voting patterns by week
- Regional participation
- Level-based engagement
- School popularity rankings

### **Export Options:**
- **CSV Export**: For Excel/Google Sheets analysis
- **JSON Export**: For programmatic analysis
- **Backup Files**: For data recovery

## 🚀 **Deployment Considerations**

### **For Production:**
1. **Database Migration**: Consider moving to PostgreSQL/MySQL for better performance
2. **Backup Strategy**: Automated daily backups
3. **Monitoring**: Track file size and performance
4. **Security**: IP-based rate limiting

### **For GitHub Deployment:**
- **Include**: `voting_data.json` in `.gitignore` (contains user data)
- **Include**: Analysis scripts for data management
- **Document**: Data structure for future developers

## 📁 **File Structure**
```
Ranking_app/
├── voting_data.json          # Main data storage
├── backups/                  # Automatic backups
│   ├── voting_data_2025-10-23.json
│   └── ...
├── analyze_voting_data.js    # Analysis script
├── backup_voting_data.js     # Backup/restore script
└── VOTING_DATA_GUIDE.md      # This guide
```

## 🔧 **Maintenance Commands**

### **Daily Analysis:**
```bash
node analyze_voting_data.js > daily_report.txt
```

### **Weekly Backup:**
```bash
node backup_voting_data.js
```

### **Data Export:**
```bash
node -e "const analyzer = require('./analyze_voting_data.js'); new analyzer().exportToCSV('weekly_export.csv');"
```

## 📊 **Sample Analysis Output**

```
📊 VOTING DATA ANALYSIS REPORT
==================================================

📈 OVERALL STATISTICS:
Total Votes: 1,247
Unique Schools: 156
Unique Voters: 89
Total Badges: 23
Average Votes per School: 7.99

🏆 TOP 10 VOTED SCHOOLS:
1. Lycée Militaire (Nouakchott Ouest) - 45 votes
2. Lycée Excellence 1 (Nouakchott Ouest) - 38 votes
3. Collège Moderne (Nouakchott Nord) - 32 votes
...

📅 WEEKLY TRENDS:
2025-10-19: 1,247 votes, 156 schools, 89 voters

🌍 REGIONAL ANALYSIS:
Nouakchott Ouest: 456 votes, 45 schools, 67 voters
  Top School: Lycée Militaire (45 votes)
Nouakchott Nord: 234 votes, 23 schools, 34 voters
  Top School: Collège Moderne (32 votes)
...
```

## 🎯 **Key Benefits**

1. **Persistent Storage**: All votes saved permanently
2. **Rich Analytics**: Comprehensive analysis capabilities  
3. **Easy Backup**: Automated backup system
4. **Export Options**: Multiple export formats
5. **Real-time Updates**: Live statistics
6. **Anti-Spam**: Built-in protection mechanisms

This system provides a complete solution for community voting with robust data storage, analysis, and management capabilities.
