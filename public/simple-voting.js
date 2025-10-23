// Simple Voting System - Complete Rebuild
class SimpleVotingSystem {
    constructor() {
        this.hasVotedToday = false;
        this.voteCount = 0;
        this.schools = [];
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Simple Voting System...');
        
        // Check if user can vote
        await this.checkVoteStatus();
        
        // Load schools for voting
        await this.loadSchools();
        
        // Render the voting interface
        this.renderVotingInterface();
        
        console.log('✅ Simple Voting System initialized');
    }

    // Check if user can vote today
    async checkVoteStatus() {
        try {
            const response = await fetch('/api/simple-vote/can-vote');
            const data = await response.json();
            
            if (data.success) {
                this.hasVotedToday = !data.canVote;
                console.log('📊 Vote status:', this.hasVotedToday ? 'Already voted today' : 'Can vote');
            }
        } catch (error) {
            console.error('❌ Error checking vote status:', error);
        }
    }

    // Load schools for voting
    async loadSchools() {
        try {
            const response = await fetch('/api/schools/secondary?limit=20');
            const data = await response.json();
            
            if (data.success && data.schools) {
                this.schools = data.schools.slice(0, 20);
                console.log('✅ Loaded', this.schools.length, 'schools for voting');
            }
        } catch (error) {
            console.error('❌ Error loading schools:', error);
        }
    }

    // Render the voting interface
    renderVotingInterface() {
        const container = document.getElementById('votingContainer');
        if (!container) {
            console.error('❌ Voting container not found');
            return;
        }

        container.innerHTML = `
            <div class="simple-voting-container">
                <div class="simple-voting-header">
                    <h2>🗳️ Vote Communautaire</h2>
                    <p>Soutenez votre école préférée !</p>
                    <div class="vote-status">
                        ${this.hasVotedToday ? 
                            '<span class="status-voted">✅ Vous avez déjà voté aujourd\'hui</span>' : 
                            '<span class="status-available">🎯 Vous pouvez voter maintenant</span>'
                        }
                    </div>
                </div>
                
                <div class="simple-voting-stats">
                    <div class="stat-card">
                        <span class="stat-number" id="totalVotes">0</span>
                        <span class="stat-label">Votes Aujourd'hui</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number" id="userStatus">${this.hasVotedToday ? 'Voté' : 'Disponible'}</span>
                        <span class="stat-label">Votre Statut</span>
                    </div>
                </div>

                <div class="simple-schools-grid" id="schoolsGrid">
                    ${this.renderSchools()}
                </div>
            </div>
        `;

        // Load vote statistics
        this.loadVoteStats();
    }

    // Render schools
    renderSchools() {
        if (this.schools.length === 0) {
            return '<div class="no-schools">Aucune école disponible pour le vote</div>';
        }

        return this.schools.map((school, index) => `
            <div class="simple-school-card" style="animation-delay: ${index * 0.1}s;">
                <div class="school-header">
                    <h3>${school.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${school.region} • <i class="fas fa-graduation-cap"></i> ${this.getLevelName(school.level)}</p>
                </div>
                
                <div class="school-stats">
                    <div class="stat">
                        <span class="number">${school.totalStudents}</span>
                        <span class="label">Élèves</span>
                    </div>
                    <div class="stat">
                        <span class="number">${school.successRate.toFixed(1)}%</span>
                        <span class="label">Réussite</span>
                    </div>
                    <div class="stat">
                        <span class="number" id="votes-${school.id}">0</span>
                        <span class="label">Votes</span>
                    </div>
                </div>

                <button class="vote-btn ${this.hasVotedToday ? 'disabled' : ''}" 
                        onclick="simpleVoting.voteForSchool('${school.id}', '${school.name}', '${school.region}', '${school.level}')"
                        ${this.hasVotedToday ? 'disabled' : ''}>
                    <i class="fas fa-vote-yea"></i>
                    ${this.hasVotedToday ? 'Déjà voté' : 'Voter'}
                </button>
            </div>
        `).join('');
    }

    // Vote for a school
    async voteForSchool(schoolId, schoolName, schoolRegion, schoolLevel) {
        if (this.hasVotedToday) {
            alert('Vous avez déjà voté aujourd\'hui !');
            return;
        }

        try {
            console.log('🗳️ Voting for school:', schoolName);
            
            const response = await fetch('/api/simple-vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schoolId: schoolId,
                    schoolName: schoolName,
                    schoolRegion: schoolRegion,
                    schoolLevel: schoolLevel
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('✅ Vote successful:', data);
                
                // Update UI
                this.hasVotedToday = true;
                this.updateUIAfterVote();
                
                // Show success message
                this.showSuccessMessage(schoolName);
                
                // Refresh vote counts
                this.loadVoteStats();
                
            } else {
                console.error('❌ Vote failed:', data.message);
                alert('Erreur: ' + data.message);
            }

        } catch (error) {
            console.error('❌ Error voting:', error);
            alert('Erreur lors du vote. Veuillez réessayer.');
        }
    }

    // Update UI after voting
    updateUIAfterVote() {
        // Update status
        const statusElement = document.querySelector('.vote-status span');
        if (statusElement) {
            statusElement.textContent = '✅ Vous avez déjà voté aujourd\'hui';
            statusElement.className = 'status-voted';
        }

        // Update user status
        const userStatusElement = document.getElementById('userStatus');
        if (userStatusElement) {
            userStatusElement.textContent = 'Voté';
        }

        // Disable all vote buttons
        const voteButtons = document.querySelectorAll('.vote-btn');
        voteButtons.forEach(button => {
            button.disabled = true;
            button.classList.add('disabled');
            button.innerHTML = '<i class="fas fa-check"></i> Déjà voté';
        });
    }

    // Show success message
    showSuccessMessage(schoolName) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'vote-success-notification';
        notification.innerHTML = `
            <div class="success-content">
                <i class="fas fa-check-circle"></i>
                <span>Vote enregistré pour ${schoolName} !</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Load vote statistics
    async loadVoteStats() {
        try {
            const response = await fetch('/api/simple-vote/stats');
            const data = await response.json();
            
            if (data.success) {
                // Update total votes
                const totalVotesElement = document.getElementById('totalVotes');
                if (totalVotesElement) {
                    totalVotesElement.textContent = data.todayVotes;
                }

                // Update individual school vote counts
                for (const school of this.schools) {
                    const schoolResponse = await fetch(`/api/simple-vote/school/${school.id}`);
                    const schoolData = await schoolResponse.json();
                    
                    if (schoolData.success) {
                        const voteCountElement = document.getElementById(`votes-${school.id}`);
                        if (voteCountElement) {
                            voteCountElement.textContent = schoolData.voteCount;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error loading vote stats:', error);
        }
    }

    // Get level name
    getLevelName(level) {
        const levels = {
            'primary': 'Primaire',
            'middle': 'Collège',
            'secondary': 'Lycée'
        };
        return levels[level] || level;
    }
}

// Initialize simple voting system
let simpleVoting;
document.addEventListener('DOMContentLoaded', () => {
    simpleVoting = new SimpleVotingSystem();
});

// Make it globally available
window.simpleVoting = simpleVoting;
