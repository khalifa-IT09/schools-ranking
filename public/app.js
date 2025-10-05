// School Ranking Application
class SchoolRankingApp {
    constructor() {
        this.currentLevel = 'primary';
        this.currentPage = 1;
        this.pageSize = 20;
        this.currentRegion = 'all';
        this.currentSearch = '';
        this.schools = [];
        this.totalSchools = 0;
        this.regions = [];
        
        // Cache for better performance
        this.cache = {
            schools: {},
            regions: {},
            stats: {}
        };
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadInitialData();
        this.showLoading(false);
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchLevel(e.target.dataset.level);
            });
        });

        // Search input
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.currentSearch = e.target.value;
                this.currentPage = 1;
                this.loadSchools();
            }, 300);
        });

        // Region filter
        document.getElementById('regionFilter').addEventListener('change', (e) => {
            this.currentRegion = e.target.value;
            this.currentPage = 1;
            this.loadSchools();
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshData();
        });

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Close modal with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeAboutModal();
            }
        });

        // Add direct event listener for close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('close') || e.target.closest('.close')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Close button clicked');
                this.closeModal();
            }
        });
    }

    async loadInitialData() {
        try {
            console.log('🚀 Loading initial data...');
            
            // Load data with timeout
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            );
            
            const loadData = Promise.all([
                this.loadRegions(),
                this.loadStats(),
                this.loadSchools()
            ]);
            
            await Promise.race([loadData, timeout]);
            
            console.log('✅ Initial data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError('Erreur lors du chargement des données. Veuillez actualiser la page.');
        }
    }

    async switchLevel(level) {
        if (this.currentLevel === level) return;
        
        this.currentLevel = level;
        this.currentPage = 1;
        this.currentSearch = '';
        this.currentRegion = 'all';
        
        // Update UI
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');
        
        document.getElementById('searchInput').value = '';
        document.getElementById('regionFilter').value = 'all';
        
        await this.loadInitialData();
    }

    async loadRegions() {
        // Check cache first
        if (this.cache.regions[this.currentLevel]) {
            this.regions = this.cache.regions[this.currentLevel];
            this.updateRegionFilter();
            return;
        }

        try {
            const response = await fetch(`/api/regions/${this.currentLevel}`);
            const data = await response.json();
            this.regions = data.regions || [];
            
            // Cache the result
            this.cache.regions[this.currentLevel] = this.regions;
            
            this.updateRegionFilter();
        } catch (error) {
            console.error('Error loading regions:', error);
            this.showError('Erreur lors du chargement des régions');
        }
    }

    updateRegionFilter() {
        const regionFilter = document.getElementById('regionFilter');
        regionFilter.innerHTML = '<option value="all">Toutes les régions</option>';
        
        this.regions.forEach(region => {
            const option = document.createElement('option');
            option.value = region;
            option.textContent = region;
            regionFilter.appendChild(option);
        });
    }

    async loadStats() {
        // Check cache first
        if (this.cache.stats[this.currentLevel]) {
            this.updateStatsDisplay(this.cache.stats[this.currentLevel]);
            return;
        }

        try {
            console.log(`Loading stats for ${this.currentLevel}`);
            const response = await fetch(`/api/stats/${this.currentLevel}`);
            const data = await response.json();
            
            console.log('Stats response:', data);
            
            // Cache the result
            this.cache.stats[this.currentLevel] = data;
            
            this.updateStatsDisplay(data);
        } catch (error) {
            console.error('Error loading stats:', error);
            // Show placeholder values on error
            document.getElementById('totalSchools').textContent = 'Erreur';
            document.getElementById('totalStudents').textContent = 'Erreur';
            document.getElementById('successRate').textContent = 'Erreur';
            document.getElementById('averageScore').textContent = 'Erreur';
        }
    }

    updateStatsDisplay(data) {
        if (data.stats) {
            document.getElementById('totalSchools').textContent = data.stats.totalSchools.toLocaleString();
            document.getElementById('totalStudents').textContent = data.stats.totalStudents.toLocaleString();
            document.getElementById('successRate').textContent = `${data.stats.overallSuccessRate}%`;
            document.getElementById('averageScore').textContent = data.stats.averageScore.toFixed(2);
        } else if (data.message) {
            console.log('Stats message:', data.message);
            // Show placeholder values
            document.getElementById('totalSchools').textContent = '0';
            document.getElementById('totalStudents').textContent = '0';
            document.getElementById('successRate').textContent = '0%';
            document.getElementById('averageScore').textContent = '0.00';
        }
    }

    async loadSchools() {
        try {
            let url;
            if (this.currentSearch) {
                url = `/api/schools/${this.currentLevel}/search?q=${encodeURIComponent(this.currentSearch)}&region=${this.currentRegion}`;
            } else {
                const offset = (this.currentPage - 1) * this.pageSize;
                url = `/api/schools/${this.currentLevel}?region=${this.currentRegion}&limit=${this.pageSize}&offset=${offset}`;
            }
            
            console.log(`Loading schools from: ${url}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response:', data);
            
            this.schools = data.schools || [];
            this.totalSchools = data.total || 0;
            
            this.renderSchools();
            this.renderPagination(data.pagination);
            this.updateResultsHeader();
            
        } catch (error) {
            console.error('Error loading schools:', error);
            this.showError(`Erreur lors du chargement des écoles: ${error.message}`);
        }
    }

    renderSchools() {
        const schoolsGrid = document.getElementById('schoolsGrid');
        schoolsGrid.innerHTML = '';
        
        console.log(`Rendering ${this.schools.length} schools`);
        
        if (this.schools.length === 0) {
            const levelNames = {
                primary: 'écoles primaires',
                middle: 'collèges',
                secondary: 'lycées'
            };
            
            schoolsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>Aucune ${levelNames[this.currentLevel] || 'école'} trouvée</h3>
                    <p>Essayez de modifier vos critères de recherche ou vérifiez que les données sont disponibles</p>
                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px; text-align: left;">
                        <strong>Informations de débogage :</strong><br>
                        Niveau sélectionné: ${this.currentLevel}<br>
                        Région: ${this.currentRegion}<br>
                        Recherche: "${this.currentSearch}"<br>
                        Total d'écoles: ${this.totalSchools}
                    </div>
                </div>
            `;
            return;
        }
        
        this.schools.forEach((school, index) => {
            const schoolCard = this.createSchoolCard(school, index);
            schoolsGrid.appendChild(schoolCard);
        });
        
        console.log(`Successfully rendered ${this.schools.length} school cards`);
    }

    createSchoolCard(school, index) {
        const card = document.createElement('div');
        card.className = 'school-card';
        card.style.animationDelay = `${index * 0.1}s`;
        
        const successRateClass = this.getSuccessRateClass(school.successRate);
        
        // Create different stats layout for all levels (primaires, collèges et lycées)
        let statsHTML = '';
        if (school.maxScore !== undefined && school.minScore !== undefined) {
            // 5 parameters for all levels: Candidats, Admis, Taux de réussite, Moyenne max, Moyenne min
            const levelLabel = 'Candidats';
            const admittedLabel = 'Admis';
            
            statsHTML = `
                <div class="school-stats secondary-stats">
                    <div class="school-stat">
                        <div class="school-stat-value">${school.totalStudents}</div>
                        <div class="school-stat-label">${levelLabel}</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.passedStudents}</div>
                        <div class="school-stat-label">${admittedLabel}</div>
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
        } else {
            // Fallback: 4 parameters (should not happen with new implementation)
            statsHTML = `
                <div class="school-stats">
                    <div class="school-stat">
                        <div class="school-stat-value">${school.totalStudents}</div>
                        <div class="school-stat-label">Élèves</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value ${successRateClass}">${school.successRate.toFixed(1)}%</div>
                        <div class="school-stat-label">Réussite</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.averageScore.toFixed(2)}</div>
                        <div class="school-stat-label">Moyenne</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.passedStudents}</div>
                        <div class="school-stat-label">Admis</div>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="school-header">
                <div class="school-rank">${school.rank}</div>
                <div class="school-info">
                    <div class="school-name">${school.name}</div>
                    <div class="school-region">
                        <i class="fas fa-map-marker-alt"></i>
                        ${school.region}
                    </div>
                </div>
            </div>
            ${statsHTML}
        `;
        
        card.addEventListener('click', () => {
            this.showSchoolDetails(school);
        });
        
        return card;
    }

    getSuccessRateClass(successRate) {
        if (successRate >= 80) return 'success-rate-excellent';
        if (successRate >= 60) return 'success-rate-good';
        if (successRate >= 40) return 'success-rate-average';
        return 'success-rate-poor';
    }

    renderPagination(pagination) {
        const paginationContainer = document.getElementById('pagination');
        
        if (!pagination || this.currentSearch) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        const totalPages = Math.ceil(this.totalSchools / this.pageSize);
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button onclick="app.goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += `<span>...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button ${i === this.currentPage ? 'class="active"' : ''} onclick="app.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += `<span>...</span>`;
            }
            paginationHTML += `<button onclick="app.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        paginationHTML += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} onclick="app.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.totalSchools / this.pageSize)) return;
        this.currentPage = page;
        this.loadSchools();
    }

    updateResultsHeader() {
        const levelNames = {
            primary: 'Écoles Primaires (CAS)',
            middle: 'Collèges (Brevet)',
            secondary: 'Lycées (Baccalauréat)'
        };
        
        document.getElementById('resultsTitle').textContent = `Classement des ${levelNames[this.currentLevel]}`;
        document.getElementById('resultsCount').textContent = `${this.totalSchools} écoles`;
    }

    showSchoolDetails(school) {
        const modal = document.getElementById('schoolModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        modalTitle.textContent = school.name;
        
        const successRateClass = this.getSuccessRateClass(school.successRate);
        
        // Create different details for all levels (primaires, collèges et lycées)
        let performanceDetails = '';
        if (school.maxScore !== undefined && school.minScore !== undefined) {
            performanceDetails = `
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistiques de performance (${this.currentLevel === 'secondary' ? 'Baccalauréat' : this.currentLevel === 'middle' ? 'Brevet' : 'CAS'})</h4>
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
                            <span class="detail-value ${successRateClass}">${school.successRate.toFixed(2)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne générale:</span>
                            <span class="detail-value">${school.averageScore.toFixed(2)}/20</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne maximale:</span>
                            <span class="detail-value">${school.maxScore.toFixed(2)}/20</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne minimale:</span>
                            <span class="detail-value">${school.minScore.toFixed(2)}/20</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Score de classement:</span>
                            <span class="detail-value">${school.rankingScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement national:</span>
                            <span class="detail-value ranking-national">#${school.rank}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement régional:</span>
                            <span class="detail-value ranking-regional">#${school.regionalRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Courbe de Performance</h4>
                    <div class="performance-chart">
                        <div class="chart-container">
                            <div class="chart-bars">
                                <div class="chart-bar" data-label="Candidats" data-value="${school.totalStudents}" data-max="200" style="--bar-color: #3498db;">
                                    <div class="bar-fill" style="height: ${Math.min((school.totalStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.totalStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="Admis" data-value="${school.passedStudents}" data-max="200" style="--bar-color: #2ecc71;">
                                    <div class="bar-fill" style="height: ${Math.min((school.passedStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.passedStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="Réussite" data-value="${school.successRate}" data-max="100" style="--bar-color: #e74c3c;">
                                    <div class="bar-fill" style="height: ${Math.min(school.successRate, 100)}%"></div>
                                    <div class="bar-label">${school.successRate.toFixed(1)}%</div>
                                </div>
                                <div class="chart-bar" data-label="Moyenne" data-value="${school.averageScore}" data-max="20" style="--bar-color: #f39c12;">
                                    <div class="bar-fill" style="height: ${Math.min((school.averageScore / 20) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.averageScore.toFixed(1)}</div>
                                </div>
                                <div class="chart-bar" data-label="Max" data-value="${school.maxScore}" data-max="20" style="--bar-color: #9b59b6;">
                                    <div class="bar-fill" style="height: ${Math.min((school.maxScore / 20) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.maxScore.toFixed(1)}</div>
                                </div>
                                <div class="chart-bar" data-label="Min" data-value="${school.minScore}" data-max="20" style="--bar-color: #1abc9c;">
                                    <div class="bar-fill" style="height: ${Math.min((school.minScore / 20) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.minScore.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            performanceDetails = `
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistiques de performance</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Nombre total d'élèves:</span>
                            <span class="detail-value">${school.totalStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Élèves admis:</span>
                            <span class="detail-value">${school.passedStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taux de réussite:</span>
                            <span class="detail-value ${successRateClass}">${school.successRate.toFixed(2)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne générale:</span>
                            <span class="detail-value">${school.averageScore.toFixed(2)}/20</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Score de classement:</span>
                            <span class="detail-value">${school.rankingScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement national:</span>
                            <span class="detail-value ranking-national">#${school.rank}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement régional:</span>
                            <span class="detail-value ranking-regional">#${school.regionalRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> Courbe de Performance</h4>
                    <div class="performance-chart">
                        <div class="chart-container">
                            <div class="chart-bars">
                                <div class="chart-bar" data-label="Élèves" data-value="${school.totalStudents}" data-max="200" style="--bar-color: #3498db;">
                                    <div class="bar-fill" style="height: ${Math.min((school.totalStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.totalStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="Admis" data-value="${school.passedStudents}" data-max="200" style="--bar-color: #2ecc71;">
                                    <div class="bar-fill" style="height: ${Math.min((school.passedStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.passedStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="Réussite" data-value="${school.successRate}" data-max="100" style="--bar-color: #e74c3c;">
                                    <div class="bar-fill" style="height: ${Math.min(school.successRate, 100)}%"></div>
                                    <div class="bar-label">${school.successRate.toFixed(1)}%</div>
                                </div>
                                <div class="chart-bar" data-label="Moyenne" data-value="${school.averageScore}" data-max="20" style="--bar-color: #f39c12;">
                                    <div class="bar-fill" style="height: ${Math.min((school.averageScore / 20) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.averageScore.toFixed(1)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        modalBody.innerHTML = `
            <div class="school-details">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Informations générales</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Région:</span>
                            <span class="detail-value">${school.region}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Niveau:</span>
                            <span class="detail-value">${this.getLevelName(school.level)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement:</span>
                            <span class="detail-value">#${school.rank}</span>
                        </div>
                    </div>
                </div>
                
                ${performanceDetails}
                
                <div class="detail-section">
                    <h4><i class="fas fa-trophy"></i> Évaluation</h4>
                    <div class="performance-indicator">
                        <div class="performance-bar">
                            <div class="performance-fill" style="width: ${Math.min(school.successRate, 100)}%"></div>
                        </div>
                        <div class="performance-text">
                            ${this.getPerformanceText(school.successRate)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'block';
    }

    getLevelName(level) {
        const levelNames = {
            primary: 'École Primaire (CAS)',
            middle: 'Collège (Brevet)',
            secondary: 'Lycée (Baccalauréat)'
        };
        return levelNames[level] || level;
    }

    getPerformanceText(successRate) {
        if (successRate >= 80) return 'Excellente performance';
        if (successRate >= 60) return 'Bonne performance';
        if (successRate >= 40) return 'Performance moyenne';
        return 'Performance à améliorer';
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const results = document.getElementById('resultsContainer');
        
        if (show) {
            loading.style.display = 'block';
            results.style.display = 'none';
        } else {
            loading.style.display = 'none';
            results.style.display = 'block';
        }
    }

    showLoadingMessage(message) {
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <div class="loading-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const schoolsGrid = document.getElementById('schoolsGrid');
        schoolsGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
                <h3>Erreur</h3>
                <p>${message}</p>
                <button onclick="app.refreshData()" class="btn-refresh">
                    <i class="fas fa-sync-alt"></i>
                    Réessayer
                </button>
            </div>
        `;
    }

    async refreshData() {
        await this.loadInitialData();
    }

    closeModal() {
        console.log('closeModal called');
        const modal = document.getElementById('schoolModal');
        if (modal) {
            console.log('Modal found, closing...');
            modal.style.display = 'none';
            // Clear modal content to prevent memory leaks
            const modalBody = document.getElementById('modalBody');
            if (modalBody) {
                modalBody.innerHTML = '';
            }
        } else {
            console.log('Modal not found');
        }
    }
}

// Global functions for modal handling
function closeModal() {
    console.log('Global closeModal called');
    if (app) {
        app.closeModal();
    } else {
        // Fallback if app is not available
        const modal = document.getElementById('schoolModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

function showAbout() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'block';
    }
}

function closeAboutModal() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'none';
    }
}

function showHelp() {
    alert('Aide: Utilisez les onglets pour naviguer entre les niveaux d\'éducation. Recherchez des écoles par nom ou filtrez par région. Cliquez sur une école pour voir ses détails.');
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SchoolRankingApp();
});

// Add CSS for modal content
const modalStyles = `
    <style>
        .school-details {
            max-width: 100%;
        }
        
        .detail-section {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .detail-section:last-child {
            border-bottom: none;
            margin-bottom: 0;
        }
        
        .detail-section h4 {
            color: #667eea;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .detail-grid {
            display: grid;
            gap: 15px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
        }
        
        .detail-label {
            font-weight: 600;
            color: #666;
        }
        
        .detail-value {
            font-weight: 700;
            color: #333;
        }
        
        .performance-indicator {
            text-align: center;
        }
        
        .performance-bar {
            width: 100%;
            height: 20px;
            background: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .performance-fill {
            height: 100%;
            background: linear-gradient(90deg, #dc3545, #ffc107, #28a745);
            transition: width 0.3s ease;
        }
        
        .performance-text {
            font-weight: 600;
            color: #333;
        }
        
        .no-results, .error-message {
            text-align: center;
            padding: 50px 20px;
            color: #666;
        }
        
        .no-results h3, .error-message h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .error-message {
            color: #dc3545;
        }
        
        .error-message h3 {
            color: #dc3545;
        }
    </style>
`;

document.head.insertAdjacentHTML('beforeend', modalStyles);
