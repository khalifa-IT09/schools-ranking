const fs = require('fs');
const path = require('path');

class SimpleVoteManager {
  constructor() {
    this.dbPath = path.join(__dirname, 'simple-votes.json');
    this.data = {
      votes: [],
      daily_votes: {},
      last_reset: new Date().toISOString().split('T')[0]
    };
    this.init();
  }

  init() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const fileData = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(fileData);
      } else {
        this.saveData();
      }
      console.log('✅ Simple Vote Manager initialized');
    } catch (error) {
      console.error('❌ Error initializing vote manager:', error);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
    } catch (error) {
      console.error('❌ Error saving vote data:', error);
    }
  }

  // Get user's IP address
  getUserIP(req) {
    return req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  }

  // Check if user can vote today
  canUserVoteToday(userIP) {
    const today = new Date().toISOString().split('T')[0];
    const userVotes = this.data.daily_votes[userIP] || [];
    return userVotes.length < 1; // 1 vote per day
  }

  // Record a vote
  recordVote(schoolId, schoolName, schoolRegion, schoolLevel, userIP) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if user can vote
      if (!this.canUserVoteToday(userIP)) {
        return {
          success: false,
          message: 'Vous avez déjà voté aujourd\'hui'
        };
      }

      // Create vote record
      const vote = {
        id: Date.now(),
        schoolId: schoolId,
        schoolName: schoolName,
        schoolRegion: schoolRegion,
        schoolLevel: schoolLevel,
        userIP: userIP,
        voteDate: today,
        timestamp: new Date().toISOString()
      };

      // Add vote to database
      this.data.votes.push(vote);

      // Update daily votes for user
      if (!this.data.daily_votes[userIP]) {
        this.data.daily_votes[userIP] = [];
      }
      this.data.daily_votes[userIP].push({
        schoolId: schoolId,
        voteDate: today,
        timestamp: new Date().toISOString()
      });

      // Save to file
      this.saveData();

      console.log('✅ Vote recorded:', vote);

      return {
        success: true,
        message: 'Vote enregistré avec succès',
        vote: vote
      };

    } catch (error) {
      console.error('❌ Error recording vote:', error);
      return {
        success: false,
        message: 'Erreur lors de l\'enregistrement du vote'
      };
    }
  }

  // Get vote statistics
  getVoteStats() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayVotes = this.data.votes.filter(vote => vote.voteDate === today);
      const totalVotes = this.data.votes.length;

      return {
        success: true,
        todayVotes: todayVotes.length,
        totalVotes: totalVotes,
        votes: todayVotes
      };
    } catch (error) {
      console.error('❌ Error getting vote stats:', error);
      return {
        success: false,
        message: 'Erreur lors du chargement des statistiques'
      };
    }
  }

  // Get school vote count
  getSchoolVoteCount(schoolId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const schoolVotes = this.data.votes.filter(vote => 
        vote.schoolId === schoolId && vote.voteDate === today
      );

      return {
        success: true,
        schoolId: schoolId,
        voteCount: schoolVotes.length,
        votes: schoolVotes
      };
    } catch (error) {
      console.error('❌ Error getting school vote count:', error);
      return {
        success: false,
        message: 'Erreur lors du chargement des votes de l\'école'
      };
    }
  }

  // Check if user has voted for a specific school today
  hasUserVotedForSchool(schoolId, userIP) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const userVotes = this.data.daily_votes[userIP] || [];
      return userVotes.some(vote => 
        vote.schoolId === schoolId && vote.voteDate === today
      );
    } catch (error) {
      console.error('❌ Error checking user vote:', error);
      return false;
    }
  }
}

module.exports = SimpleVoteManager;
