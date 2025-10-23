const fs = require('fs');
const path = require('path');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, 'voting_data.json');
    this.data = {
      votes: [],
      badges: [],
      weeklyStats: {}
    };
    this.init();
  }

  init() {
    try {
      // Load existing data if file exists
      if (fs.existsSync(this.dbPath)) {
        const fileData = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileData);
      } else {
        // Create new data file
        this.saveData();
      }
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      // Initialize with empty data
      this.data = {
        votes: [],
        badges: [],
        weeklyStats: {}
      };
      this.saveData();
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('❌ Error saving data:', error);
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

  // Record a vote
  recordVote(schoolId, schoolName, schoolRegion, schoolLevel, voterIp, userAgent) {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Check if user has already voted 7 times for this school this week
      const existingVotes = this.data.votes.filter(vote => 
        vote.school_id === schoolId && 
        vote.voter_ip === voterIp && 
        vote.week_start === weekStart
      );

      if (existingVotes.length >= 7) {
        return {
          success: false,
          error: 'Vote limit reached',
          message: 'Vous avez déjà voté 7 fois pour cette école cette semaine',
          remainingVotes: 0
        };
      }

      // Create new vote
      const newVote = {
        id: Date.now() + Math.random(), // Simple ID generation
        school_id: schoolId,
        school_name: schoolName,
        school_region: schoolRegion,
        school_level: schoolLevel,
        voter_ip: voterIp,
        voter_user_agent: userAgent,
        vote_timestamp: new Date().toISOString(),
        week_start: weekStart
      };

      // Add vote to data
      this.data.votes.push(newVote);
      
      // Update weekly stats
      this.updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart);
      
      // Save data
      this.saveData();

      return {
        success: true,
        voteId: newVote.id,
        remainingVotes: 7 - (existingVotes.length + 1),
        message: 'Vote enregistré avec succès'
      };
    } catch (error) {
      console.error('❌ Error recording vote:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Erreur lors de l\'enregistrement du vote'
      };
    }
  }

  // Update weekly statistics
  updateWeeklyStats(schoolId, schoolName, schoolRegion, schoolLevel, weekStart) {
    try {
      const key = `${schoolId}_${weekStart}`;
      
      if (!this.data.weeklyStats[key]) {
        this.data.weeklyStats[key] = {
          school_id: schoolId,
          school_name: schoolName,
          school_region: schoolRegion,
          school_level: schoolLevel,
          week_start: weekStart,
          vote_count: 0,
          last_updated: new Date().toISOString()
        };
      }
      
      this.data.weeklyStats[key].vote_count += 1;
      this.data.weeklyStats[key].last_updated = new Date().toISOString();
    } catch (error) {
      console.error('❌ Error updating weekly stats:', error);
    }
  }

  // Get top voted schools (simplified for API)
  getTopVotedSchools(limit = 10) {
    try {
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

      const topSchools = Object.values(schoolVotes)
        .sort((a, b) => b.vote_count - a.vote_count)
        .slice(0, limit);

      return {
        success: true,
        schools: topSchools
      };
    } catch (error) {
      console.error('❌ Error fetching top voted schools:', error);
      return {
        success: false,
        error: 'Database error',
        schools: []
      };
    }
  }

  // Get top voted schools for a region and level (legacy method)
  getTopVotedSchoolsByRegion(region = null, level = null, limit = 10) {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Get weekly stats for current week
      const weeklyStats = Object.values(this.data.weeklyStats).filter(stat => 
        stat.week_start === weekStart
      );

      // Filter by region and level
      let filteredStats = weeklyStats;
      if (region && region !== 'all') {
        filteredStats = filteredStats.filter(stat => 
          stat.school_region.toLowerCase().includes(region.toLowerCase())
        );
      }
      if (level && level !== 'all') {
        filteredStats = filteredStats.filter(stat => 
          stat.school_level === level
        );
      }

      // Sort by vote count
      filteredStats.sort((a, b) => b.vote_count - a.vote_count);

      // Get unique voters count for each school
      const schoolsWithVoters = filteredStats.map(stat => {
        const uniqueVoters = new Set(
          this.data.votes
            .filter(vote => 
              vote.school_id === stat.school_id && 
              vote.week_start === weekStart
            )
            .map(vote => vote.voter_ip)
        ).size;

        return {
          ...stat,
          unique_voters: uniqueVoters
        };
      });

      // Take top schools
      const topSchools = schoolsWithVoters.slice(0, limit).map((school, index) => ({
        school_id: school.school_id,
        school_name: school.school_name,
        school_region: school.school_region,
        school_level: school.school_level,
        total_votes: school.vote_count,
        unique_voters: school.unique_voters,
        rank: index + 1,
        last_vote_time: school.last_updated
      }));

      return {
        success: true,
        schools: topSchools,
        week_start: weekStart
      };
    } catch (error) {
      console.error('❌ Error fetching top voted schools:', error);
      return {
        success: false,
        error: 'Database error',
        schools: []
      };
    }
  }

  // Get vote statistics for a school
  getSchoolVoteStats(schoolId) {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Get current week stats
      const currentWeekVotes = this.data.votes.filter(vote => 
        vote.school_id === schoolId && vote.week_start === weekStart
      );
      
      const currentWeekUniqueVoters = new Set(
        currentWeekVotes.map(vote => vote.voter_ip)
      ).size;

      // Get all-time stats
      const allTimeVotes = this.data.votes.filter(vote => vote.school_id === schoolId);
      const allTimeUniqueVoters = new Set(
        allTimeVotes.map(vote => vote.voter_ip)
      ).size;
      
      const weeksParticipated = new Set(
        allTimeVotes.map(vote => vote.week_start)
      ).size;

      // Get regional ranking
      const schoolVotes = this.data.votes.filter(vote => vote.school_id === schoolId);
      let regionalRank = null;
      
      if (schoolVotes.length > 0) {
        const schoolInfo = schoolVotes[0];
        const regionalSchools = this.data.votes.filter(vote => 
          vote.school_region === schoolInfo.school_region && 
          vote.school_level === schoolInfo.school_level &&
          vote.week_start === weekStart
        );
        
        const regionalStats = {};
        regionalSchools.forEach(vote => {
          if (!regionalStats[vote.school_id]) {
            regionalStats[vote.school_id] = 0;
          }
          regionalStats[vote.school_id]++;
        });
        
        const sortedRegional = Object.entries(regionalStats)
          .sort(([,a], [,b]) => b - a);
        
        const rankIndex = sortedRegional.findIndex(([id]) => id === schoolId);
        regionalRank = rankIndex >= 0 ? rankIndex + 1 : null;
      }

      return {
        success: true,
        current_week: {
          total_votes: currentWeekVotes.length,
          unique_voters: currentWeekUniqueVoters
        },
        all_time: {
          total_votes: allTimeVotes.length,
          unique_voters: allTimeUniqueVoters,
          weeks_participated: weeksParticipated
        },
        regional_rank: regionalRank
      };
    } catch (error) {
      console.error('❌ Error fetching school vote stats:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  // Get user's vote count for a specific school
  getUserVoteCount(schoolId, voterIp) {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Get user's votes for this school this week
      const userVotes = this.data.votes.filter(vote => 
        vote.school_id === schoolId && 
        vote.voter_ip === voterIp && 
        vote.week_start === weekStart
      );

      const voteCount = userVotes.length;
      const remainingVotes = Math.max(0, 7 - voteCount);

      return {
        success: true,
        voteCount: voteCount,
        remainingVotes: remainingVotes,
        weekStart: weekStart
      };
    } catch (error) {
      console.error('❌ Error fetching user vote count:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  // Award badges to schools
  awardBadge(schoolId, schoolName, badgeType, badgeName, badgeDescription) {
    try {
      // Remove existing badge of same type for this school
      this.data.badges = this.data.badges.filter(badge => 
        !(badge.school_id === schoolId && badge.badge_type === badgeType)
      );

      // Add new badge
      const newBadge = {
        id: Date.now() + Math.random(),
        school_id: schoolId,
        school_name: schoolName,
        badge_type: badgeType,
        badge_name: badgeName,
        badge_description: badgeDescription,
        earned_date: new Date().toISOString(),
        is_active: 1
      };

      this.data.badges.push(newBadge);
      this.saveData();

      return {
        success: true,
        badgeId: newBadge.id,
        message: 'Badge attribué avec succès'
      };
    } catch (error) {
      console.error('❌ Error awarding badge:', error);
      return {
        success: false,
        error: 'Database error',
        message: 'Erreur lors de l\'attribution du badge'
      };
    }
  }

  // Get school badges
  getSchoolBadges(schoolId) {
    try {
      const badges = this.data.badges.filter(badge => 
        badge.school_id === schoolId && badge.is_active === 1
      );

      return {
        success: true,
        badges: badges
      };
    } catch (error) {
      console.error('❌ Error fetching school badges:', error);
      return {
        success: false,
        error: 'Database error',
        badges: []
      };
    }
  }

  // Check and award badges based on vote performance
  checkAndAwardBadges() {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      // Get weekly stats for current week
      const weeklyStats = Object.values(this.data.weeklyStats).filter(stat => 
        stat.week_start === weekStart
      );

      // Group by region and level
      const regionLevelGroups = {};
      weeklyStats.forEach(stat => {
        const key = `${stat.school_region}_${stat.school_level}`;
        if (!regionLevelGroups[key]) {
          regionLevelGroups[key] = [];
        }
        regionLevelGroups[key].push(stat);
      });

      // Award top 3 badges for each region/level
      Object.values(regionLevelGroups).forEach(schools => {
        schools.sort((a, b) => b.vote_count - a.vote_count);
        schools.slice(0, 3).forEach((school, index) => {
          const badgeTypes = ['top_performer_gold', 'top_performer_silver', 'top_performer_bronze'];
          const badgeNames = ['🏆 Champion Régional', '🥈 Vice-Champion', '🥉 Troisième Place'];
          
          if (index < 3) {
            this.awardBadge(
              school.school_id,
              school.school_name,
              badgeTypes[index],
              badgeNames[index],
              `Top ${index + 1} dans la région ${school.school_region} cette semaine`
            );
          }
        });
      });

      // Award Community Favorite Badge (100+ votes this week)
      const communityFavorites = weeklyStats.filter(stat => stat.vote_count >= 100);
      communityFavorites.forEach(school => {
        this.awardBadge(
          school.school_id,
          school.school_name,
          'community_favorite',
          '🌟 Favori de la Communauté',
          'Plus de 100 votes cette semaine'
        );
      });

      console.log('✅ Badge checking and awarding completed');
    } catch (error) {
      console.error('❌ Error checking and awarding badges:', error);
    }
  }

  // Get database statistics
  getDatabaseStats() {
    try {
      const weekStart = this.getCurrentWeekStart();
      
      const stats = {
        total_votes: this.data.votes.length,
        total_schools: new Set(this.data.votes.map(vote => vote.school_id)).size,
        total_badges: this.data.badges.filter(badge => badge.is_active === 1).length,
        current_week_votes: this.data.votes.filter(vote => vote.week_start === weekStart).length
      };

      return {
        success: true,
        stats: stats
      };
    } catch (error) {
      console.error('❌ Error fetching database stats:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  // Get voting trends
  getVotingTrends() {
    try {
      const trends = {};
      
      this.data.votes.forEach(vote => {
        const week = vote.week_start;
        if (!trends[week]) {
          trends[week] = {
            week_start: week,
            total_votes: 0,
            unique_schools: new Set(),
            unique_voters: new Set()
          };
        }
        
        trends[week].total_votes++;
        trends[week].unique_schools.add(vote.school_id);
        trends[week].unique_voters.add(vote.voter_ip);
      });

      // Convert sets to counts
      Object.keys(trends).forEach(week => {
        trends[week].unique_schools_count = trends[week].unique_schools.size;
        trends[week].unique_voters_count = trends[week].unique_voters.size;
        delete trends[week].unique_schools;
        delete trends[week].unique_voters;
      });

      return {
        success: true,
        trends: trends
      };
    } catch (error) {
      console.error('❌ Error fetching voting trends:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  // Get regional voting statistics
  getRegionalVotingStats() {
    try {
      const regionalStats = {};
      
      this.data.votes.forEach(vote => {
        const region = vote.school_region;
        if (!regionalStats[region]) {
          regionalStats[region] = {
            region: region,
            total_votes: 0,
            unique_schools: new Set(),
            unique_voters: new Set(),
            top_schools: {}
          };
        }
        
        regionalStats[region].total_votes++;
        regionalStats[region].unique_schools.add(vote.school_id);
        regionalStats[region].unique_voters.add(vote.voter_ip);
        
        // Track votes per school in this region
        if (!regionalStats[region].top_schools[vote.school_name]) {
          regionalStats[region].top_schools[vote.school_name] = 0;
        }
        regionalStats[region].top_schools[vote.school_name]++;
      });

      // Convert sets to counts and sort schools
      Object.keys(regionalStats).forEach(region => {
        regionalStats[region].unique_schools_count = regionalStats[region].unique_schools.size;
        regionalStats[region].unique_voters_count = regionalStats[region].unique_voters.size;
        delete regionalStats[region].unique_schools;
        delete regionalStats[region].unique_voters;
        
        // Sort schools by vote count
        regionalStats[region].top_schools = Object.entries(regionalStats[region].top_schools)
          .map(([name, votes]) => ({ name, votes }))
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 5);
      });

      return {
        success: true,
        regional: regionalStats
      };
    } catch (error) {
      console.error('❌ Error fetching regional voting stats:', error);
      return {
        success: false,
        error: 'Database error'
      };
    }
  }

  // Close database connection
  close() {
    this.saveData();
    console.log('✅ Database connection closed');
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = dbManager;
