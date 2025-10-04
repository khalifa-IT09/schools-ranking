// Static version for Netlify deployment
class SchoolRankingApp {
    constructor() {
        this.data = null;
        this.currentLevel = 'primary';
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.currentSearch = '';
        this.currentRegion = 'all';
        
        this.init();
    }
    
    async init() {
        try {
            // Load static data
            const response = await fetch('./data.json');
            this.data = await response.json();
            
            this.setupEventListeners();
            this.loadLevel('primary');
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Erreur lors du chargement des données');
        }
    }
    
    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const level = e.currentTarget.dataset.level;
                this.loadLevel(level);
            });
        });
        
        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.filterAndDisplay();
            });
        }
        
        // Region filter
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter) {
            regionFilter.addEventListener('change', (e) => {
                this.currentRegion = e.target.value;
                this.filterAndDisplay();
            });
        }
        
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadLevel(this.currentLevel);
            });
        }
    }
    
    loadLevel(level) {
        this.currentLevel = level;
        this.currentPage = 1;
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        // Update title
        const titles = {
            primary: 'Écoles Primaires (CAS)',
            middle: 'Collèges (Brevet)',
            secondary: 'Lycées (Baccalauréat)'
        };
        document.getElementById('resultsTitle').textContent = `Classement des ${titles[level]}`;
        
        // Load regions
        this.loadRegions();
        
        // Display data
        this.filterAndDisplay();
    }
    
    loadRegions() {
        const regionFilter = document.getElementById('regionFilter');
        if (!regionFilter || !this.data) return;
        
        const regions = [...new Set(this.data[this.currentLevel].schools.map(school => school.region))];
        regions.sort();
        
        regionFilter.innerHTML = '<option value="all">Toutes les régions</option>';
        regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });
    }
    
    filterAndDisplay() {
        if (!this.data) return;
        
        let schools = [...this.data[this.currentLevel].schools];
        
        // Apply search filter
        if (this.currentSearch) {
            schools = schools.filter(school => 
                school.name.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
                school.region.toLowerCase().includes(this.currentSearch.toLowerCase())
            );
        }
        
        // Apply region filter
        if (this.currentRegion !== 'all') {
            schools = schools.filter(school => school.region === this.currentRegion);
        }
        
        // Update stats
        this.updateStats(schools);
        
        // Display schools
        this.displaySchools(schools);
        
        // Update pagination
        this.updatePagination(schools.length);
    }
    
    updateStats(schools) {
        const totalSchools = schools.length;
        const totalStudents = schools.reduce((sum, school) => sum + school.totalStudents, 0);
        const totalPassed = schools.reduce((sum, school) => sum + school.passedStudents, 0);
        const averageSuccessRate = schools.length > 0 ? 
            schools.reduce((sum, school) => sum + school.successRate, 0) / schools.length : 0;
        const averageScore = schools.length > 0 ? 
            schools.reduce((sum, school) => sum + school.averageScore, 0) / schools.length : 0;
        
        document.getElementById('totalSchools').textContent = totalSchools;
        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('successRate').textContent = averageSuccessRate.toFixed(1) + '%';
        document.getElementById('averageScore').textContent = averageScore.toFixed(2);
    }
    
    displaySchools(schools) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageSchools = schools.slice(startIndex, endIndex);
        
        const schoolsGrid = document.getElementById('schoolsGrid');
        if (!schoolsGrid) return;
        
        schoolsGrid.innerHTML = pageSchools.map(school => this.createSchoolCard(school)).join('');
        
        // Update results count
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = `${schools.length} écoles trouvées`;
        }
    }
    
    createSchoolCard(school) {
        const successRateClass = this.getSuccessRateClass(school.successRate);
        
        let statsHTML = '';
        if (school.maxScore !== undefined && school.minScore !== undefined) {
            statsHTML = `
                <div class="school-stats secondary-stats">
                    <div class="school-stat">
                        <div class="school-stat-value">${school.totalStudents}</div>
                        <div class="school-stat-label">Candidats</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.passedStudents}</div>
                        <div class="school-stat-label">Admis</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value ${successRateClass}">${school.successRate.toFixed(1)}%</div>
                        <div class="school-stat-label">Taux de Réussite</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.maxScore.toFixed(2)}</div>
                        <div class="school-stat-label">Moyenne Max</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.minScore.toFixed(2)}</div>
                        <div class="school-stat-label">Moyenne Min</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="school-card" onclick="app.showSchoolDetails('${school.name}')">
                <div class="school-header">
                    <div class="school-rank">#${school.rank}</div>
                    <div class="school-info">
                        <h3 class="school-name">${school.name}</h3>
                        <p class="school-region">${school.region}</p>
                    </div>
                </div>
                ${statsHTML}
            </div>
        `;
    }
    
    getSuccessRateClass(rate) {
        if (rate >= 80) return 'success-rate-excellent';
        if (rate >= 60) return 'success-rate-good';
        if (rate >= 40) return 'success-rate-average';
        return 'success-rate-poor';
    }
    
    showSchoolDetails(schoolName) {
        const school = this.data[this.currentLevel].schools.find(s => s.name === schoolName);
        if (!school) return;
        
        const modal = document.getElementById('schoolModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = school.name;
            
            const levelTitles = {
                primary: 'CAS',
                middle: 'Brevet',
                secondary: 'Baccalauréat'
            };
            
            modalBody.innerHTML = `
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Informations générales</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Région:</span>
                            <span class="detail-value">${school.region}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement national:</span>
                            <span class="detail-value">#${school.rank}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistiques de performance (${levelTitles[this.currentLevel]})</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Nombre de candidats:</span>
                            <span class="detail-value">${school.totalStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Candidats admis:</span>
                            <span class="detail-value">${school.passedStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taux de réussite:</span>
                            <span class="detail-value ${this.getSuccessRateClass(school.successRate)}">${school.successRate.toFixed(1)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne générale:</span>
                            <span class="detail-value">${school.averageScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne maximale:</span>
                            <span class="detail-value">${school.maxScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne minimale:</span>
                            <span class="detail-value">${school.minScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Score de classement:</span>
                            <span class="detail-value">${school.rankingScore.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
        }
    }
    
    updatePagination(totalItems) {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="app.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="${i === this.currentPage ? 'active' : ''}" 
                            onclick="app.goToPage(${i})">${i}</button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="app.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.filterAndDisplay();
    }
    
    showError(message) {
        const schoolsGrid = document.getElementById('schoolsGrid');
        if (schoolsGrid) {
            schoolsGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }
    
    closeModal() {
        const modal = document.getElementById('schoolModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    closeAboutModal() {
        const modal = document.getElementById('aboutModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SchoolRankingApp();
});

// Global functions for modal handling
function closeModal() {
    if (window.app) {
        window.app.closeModal();
    }
}

function closeAboutModal() {
    if (window.app) {
        window.app.closeAboutModal();
    }
}

function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showHelp() {
    alert('Aide: Utilisez la recherche pour trouver une école ou filtrez par région.');
}
