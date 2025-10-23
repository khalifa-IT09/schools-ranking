const fs = require('fs');
const path = require('path');

class VotingDataAnalyzer {
    constructor() {
        this.dbPath = path.join(__dirname, 'voting_data.json');
        this.data = null;
    }

    // Load voting data
    loadData() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const fileData = fs.readFileSync(this.dbPath, 'utf8');
                this.data = JSON.parse(fileData);
                console.log('✅ Voting data loaded successfully');
                return true;
            } else {
                console.log('❌ No voting data file found');
                return false;
            }
        } catch (error) {
            console.error('❌ Error loading voting data:', error);
            return false;
        }
    }

    // Get overall statistics
    getOverallStats() {
        if (!this.data) return null;

        const totalVotes = this.data.votes.length;
        const uniqueSchools = new Set(this.data.votes.map(v => v.school_id)).size;
        const uniqueVoters = new Set(this.data.votes.map(v => v.voter_ip)).size;
        const totalBadges = this.data.badges.length;

        return {
            totalVotes,
            uniqueSchools,
            uniqueVoters,
            totalBadges,
            averageVotesPerSchool: totalVotes / uniqueSchools || 0
        };
    }

    // Get top voted schools
    getTopVotedSchools(limit = 10) {
        if (!this.data) return [];

        const schoolVotes = {};
        
        this.data.votes.forEach(vote => {
            const key = `${vote.school_name}_${vote.school_region}`;
            if (!schoolVotes[key]) {
                schoolVotes[key] = {
                    school_name: vote.school_name,
                    school_region: vote.school_region,
                    school_level: vote.school_level,
                    vote_count: 0,
                    last_vote: vote.vote_timestamp
                };
            }
            schoolVotes[key].vote_count++;
        });

        return Object.values(schoolVotes)
            .sort((a, b) => b.vote_count - a.vote_count)
            .slice(0, limit);
    }

    // Get voting trends by week
    getWeeklyTrends() {
        if (!this.data) return {};

        const weeklyData = {};
        
        this.data.votes.forEach(vote => {
            const week = vote.week_start;
            if (!weeklyData[week]) {
                weeklyData[week] = {
                    week_start: week,
                    total_votes: 0,
                    unique_schools: new Set(),
                    unique_voters: new Set()
                };
            }
            
            weeklyData[week].total_votes++;
            weeklyData[week].unique_schools.add(vote.school_id);
            weeklyData[week].unique_voters.add(vote.voter_ip);
        });

        // Convert sets to counts
        Object.keys(weeklyData).forEach(week => {
            weeklyData[week].unique_schools_count = weeklyData[week].unique_schools.size;
            weeklyData[week].unique_voters_count = weeklyData[week].unique_voters.size;
            delete weeklyData[week].unique_schools;
            delete weeklyData[week].unique_voters;
        });

        return weeklyData;
    }

    // Get regional analysis
    getRegionalAnalysis() {
        if (!this.data) return {};

        const regionalData = {};
        
        this.data.votes.forEach(vote => {
            const region = vote.school_region;
            if (!regionalData[region]) {
                regionalData[region] = {
                    region: region,
                    total_votes: 0,
                    unique_schools: new Set(),
                    unique_voters: new Set(),
                    schools: {}
                };
            }
            
            regionalData[region].total_votes++;
            regionalData[region].unique_schools.add(vote.school_id);
            regionalData[region].unique_voters.add(vote.voter_ip);
            
            // Track votes per school in this region
            if (!regionalData[region].schools[vote.school_name]) {
                regionalData[region].schools[vote.school_name] = 0;
            }
            regionalData[region].schools[vote.school_name]++;
        });

        // Convert sets to counts and sort schools
        Object.keys(regionalData).forEach(region => {
            regionalData[region].unique_schools_count = regionalData[region].unique_schools.size;
            regionalData[region].unique_voters_count = regionalData[region].unique_voters.size;
            delete regionalData[region].unique_schools;
            delete regionalData[region].unique_voters;
            
            // Sort schools by vote count
            regionalData[region].top_schools = Object.entries(regionalData[region].schools)
                .map(([name, votes]) => ({ name, votes }))
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 5);
        });

        return regionalData;
    }

    // Get level analysis
    getLevelAnalysis() {
        if (!this.data) return {};

        const levelData = {};
        
        this.data.votes.forEach(vote => {
            const level = vote.school_level;
            if (!levelData[level]) {
                levelData[level] = {
                    level: level,
                    total_votes: 0,
                    unique_schools: new Set(),
                    unique_voters: new Set()
                };
            }
            
            levelData[level].total_votes++;
            levelData[level].unique_schools.add(vote.school_id);
            levelData[level].unique_voters.add(vote.voter_ip);
        });

        // Convert sets to counts
        Object.keys(levelData).forEach(level => {
            levelData[level].unique_schools_count = levelData[level].unique_schools.size;
            levelData[level].unique_voters_count = levelData[level].unique_voters.size;
            delete levelData[level].unique_schools;
            delete levelData[level].unique_voters;
        });

        return levelData;
    }

    // Get badge analysis
    getBadgeAnalysis() {
        if (!this.data) return {};

        const badgeStats = {};
        
        this.data.badges.forEach(badge => {
            const type = badge.badge_type;
            if (!badgeStats[type]) {
                badgeStats[type] = {
                    badge_type: type,
                    badge_name: badge.badge_name,
                    count: 0,
                    schools: new Set()
                };
            }
            
            badgeStats[type].count++;
            badgeStats[type].schools.add(badge.school_name);
        });

        // Convert sets to counts
        Object.keys(badgeStats).forEach(type => {
            badgeStats[type].unique_schools = badgeStats[type].schools.size;
            delete badgeStats[type].schools;
        });

        return badgeStats;
    }

    // Generate comprehensive report
    generateReport() {
        if (!this.loadData()) return;

        console.log('\n📊 VOTING DATA ANALYSIS REPORT');
        console.log('=' .repeat(50));

        // Overall Statistics
        const overallStats = this.getOverallStats();
        console.log('\n📈 OVERALL STATISTICS:');
        console.log(`Total Votes: ${overallStats.totalVotes}`);
        console.log(`Unique Schools: ${overallStats.uniqueSchools}`);
        console.log(`Unique Voters: ${overallStats.uniqueVoters}`);
        console.log(`Total Badges: ${overallStats.totalBadges}`);
        console.log(`Average Votes per School: ${overallStats.averageVotesPerSchool.toFixed(2)}`);

        // Top Voted Schools
        const topSchools = this.getTopVotedSchools(10);
        console.log('\n🏆 TOP 10 VOTED SCHOOLS:');
        topSchools.forEach((school, index) => {
            console.log(`${index + 1}. ${school.school_name} (${school.school_region}) - ${school.vote_count} votes`);
        });

        // Weekly Trends
        const weeklyTrends = this.getWeeklyTrends();
        console.log('\n📅 WEEKLY TRENDS:');
        Object.keys(weeklyTrends).sort().forEach(week => {
            const data = weeklyTrends[week];
            console.log(`${week}: ${data.total_votes} votes, ${data.unique_schools_count} schools, ${data.unique_voters_count} voters`);
        });

        // Regional Analysis
        const regionalAnalysis = this.getRegionalAnalysis();
        console.log('\n🌍 REGIONAL ANALYSIS:');
        Object.keys(regionalAnalysis).forEach(region => {
            const data = regionalAnalysis[region];
            console.log(`${region}: ${data.total_votes} votes, ${data.unique_schools_count} schools, ${data.unique_voters_count} voters`);
            console.log(`  Top School: ${data.top_schools[0]?.name || 'N/A'} (${data.top_schools[0]?.votes || 0} votes)`);
        });

        // Level Analysis
        const levelAnalysis = this.getLevelAnalysis();
        console.log('\n🎓 LEVEL ANALYSIS:');
        Object.keys(levelAnalysis).forEach(level => {
            const data = levelAnalysis[level];
            console.log(`${level}: ${data.total_votes} votes, ${data.unique_schools_count} schools, ${data.unique_voters_count} voters`);
        });

        // Badge Analysis
        const badgeAnalysis = this.getBadgeAnalysis();
        console.log('\n🏅 BADGE ANALYSIS:');
        Object.keys(badgeAnalysis).forEach(type => {
            const data = badgeAnalysis[type];
            console.log(`${data.badge_name}: ${data.count} badges awarded to ${data.unique_schools} schools`);
        });

        console.log('\n' + '=' .repeat(50));
    }

    // Export data to CSV
    exportToCSV(filename = 'voting_analysis.csv') {
        if (!this.loadData()) return;

        const csvData = [];
        
        // Add header
        csvData.push('School Name,Region,Level,Vote Count,Last Vote Date');
        
        // Add school data
        const topSchools = this.getTopVotedSchools(1000); // Get all schools
        topSchools.forEach(school => {
            csvData.push(`"${school.school_name}","${school.school_region}","${school.school_level}",${school.vote_count},"${school.last_vote}"`);
        });

        // Write to file
        fs.writeFileSync(filename, csvData.join('\n'));
        console.log(`✅ Data exported to ${filename}`);
    }
}

// Usage example
if (require.main === module) {
    const analyzer = new VotingDataAnalyzer();
    analyzer.generateReport();
    
    // Uncomment to export CSV
    // analyzer.exportToCSV('voting_analysis.csv');
}

module.exports = VotingDataAnalyzer;
