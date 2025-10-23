// School Ranking Application
class SchoolRankingApp {
    constructor() {
        this.currentLevel = 'primary';
        this.currentPage = 1;
        this.pageSize = 200;
        this.currentRegion = 'all';
        this.currentSearch = '';
        this.schools = [];
        this.totalSchools = 0;
        this.regions = [];
        this.currentLanguage = 'fr'; // Default to French
        this.lastTabClick = 0; // Track last tab click time
        
        // Translation system
        this.translations = {
            fr: {
                // App titles and navigation
                app_title: "Classement des Écoles - Mauritanie",
                app_subtitle: "Trouvez la meilleure école pour vos enfants en République Islamique de Mauritanie",
                nav_primary: "Écoles Primaires (CAS)",
                nav_middle: "Collèges (Brevet)",
                nav_secondary: "Lycées (Baccalauréat)",
                
                // Controls
                search_placeholder: "Rechercher une école...",
                all_regions: "Toutes les régions",
                refresh: "Actualiser",
                
                // Stats
                total_schools: "Total des écoles",
                total_students: "Total des élèves",
                average_score: "Score moyen",
                regions_count: "Régions",
                stat_schools: "Écoles",
                stat_students: "Élèves",
                stat_success_rate: "Taux de Réussite",
                
                // School card
                school_details: "Détails de l'école",
                students: "Élèves",
                success_rate: "Taux de réussite",
                region: "Région",
                level: "Niveau",
                
                // Pagination
                page: "Page",
                of: "sur",
                showing: "Affichage",
                to: "à",
                results: "résultats",
                
                // Loading and errors
                loading_data: "Chargement des données...",
                loading_schools: "Chargement des écoles...",
                no_schools: "Aucune école trouvée",
                error_loading: "Erreur lors du chargement",
                try_again: "Réessayer",
                
                // Modal
                modal_school_details: "Détails de l'École",
                modal_close: "Fermer",
                
                // Footer
                footer_copyright: "© 2025 Classement des Écoles - République Islamique de Mauritanie",
                footer_data_source: "Données officielles du Ministère de l'Éducation Nationale",
                footer_about: "À propos",
                footer_help: "Aide",
                
                // About modal
                about_title: "À propos de cette application",
                about_content: "Cette application utilise les données officielles du Ministère de l'Éducation Nationale de Mauritanie pour classer les écoles selon leur performance académique.",
                
                // Help modal
                help_title: "Comment utiliser cette application",
                help_content: "1. Sélectionnez le niveau d'éducation (Primaire, Collège, Lycée)<br>2. Filtrez par région si nécessaire<br>3. Recherchez une école spécifique<br>4. Cliquez sur une école pour voir ses détails",
                
                // Additional keys
                results_title: "Classement des Écoles",
                about_description: "Cette application permet aux familles mauritaniennes de trouver les meilleures écoles pour leurs enfants en se basant sur les résultats officiels des examens.",
                about_levels_title: "Niveaux d'éducation couverts :",
                about_primary: "Écoles Primaires (CAS)",
                about_primary_desc: "Résultats du Certificat d'Aptitude Scolaire",
                about_middle: "Collèges (Brevet)",
                about_middle_desc: "Résultats du Brevet d'Études du Premier Cycle",
                about_secondary: "Lycées (Baccalauréat)",
                about_secondary_desc: "Résultats du Baccalauréat",
                about_criteria_title: "Critères de classement :",
                about_criteria_success: "Taux de réussite (40%)",
                about_criteria_average: "Moyenne générale des scores (60%)",
                about_data_source: "Données fournies par le Ministère de l'Éducation de la République Islamique de Mauritanie.",
                about_developer: "Cette application est développée par Khalifa-IT services, pour plus d'info: 36090932"
            },
            ar: {
                // App titles and navigation
                app_title: "تصنيف المدارس - موريتانيا",
                app_subtitle: "اعثروا على أفضل مدرسة لأطفالكم في الجمهورية الإسلامية الموريتانية",
                nav_primary: "المدارس الابتدائية (CAS)",
                nav_middle: "المدارس الإعدادية (Brevet)",
                nav_secondary: "المدارس الثانوية (Baccalauréat)",
                
                // Controls
                search_placeholder: "البحث عن مدرسة...",
                all_regions: "جميع المناطق",
                refresh: "تحديث",
                
                // Stats
                total_schools: "إجمالي المدارس",
                total_students: "إجمالي الطلاب",
                average_score: "متوسط النقاط",
                regions_count: "المناطق",
                
                // School card
                school_details: "تفاصيل المدرسة",
                students: "الطلاب",
                success_rate: "معدل النجاح",
                region: "المنطقة",
                level: "المستوى",
                
                // Pagination
                page: "صفحة",
                of: "من",
                showing: "عرض",
                to: "إلى",
                results: "نتيجة",
                
                // Loading and errors
                loading_data: "تحميل البيانات...",
                loading_schools: "تحميل المدارس...",
                no_schools: "لم يتم العثور على مدارس",
                error_loading: "خطأ في التحميل",
                try_again: "حاول مرة أخرى",
                
                // Modal
                modal_school_details: "تفاصيل المدرسة",
                modal_close: "إغلاق",
                
                // Footer
                footer_copyright: "© 2025 تصنيف المدارس - الجمهورية الإسلامية الموريتانية",
                footer_data_source: "بيانات رسمية من وزارة التربية الوطنية",
                footer_about: "حول",
                footer_help: "مساعدة",
                
                // About modal
                about_title: "حول هذا التطبيق",
                about_content: "يستخدم هذا التطبيق البيانات الرسمية من وزارة التربية الوطنية الموريتانية لتصنيف المدارس حسب أدائها الأكاديمي.",
                
                // Help modal
                help_title: "كيفية استخدام هذا التطبيق",
                help_content: "1. اختر مستوى التعليم (ابتدائي، إعدادي، ثانوي)<br>2. فلتر حسب المنطقة إذا لزم الأمر<br>3. ابحث عن مدرسة محددة<br>4. انقر على مدرسة لرؤية تفاصيلها"
            }
        };
        
        this.init();
    }

    init() {
        console.log('🚀 Initializing School Ranking App...');
        console.log('🔧 Setting up event listeners...');
        this.setupEventListeners();
        console.log('📊 Loading initial data...');
        this.loadInitialData();
        console.log('🌐 Updating language...');
        this.updateLanguage();
        console.log('✅ App initialization complete');
        
        // Make search test function globally available for debugging
        window.testSearch = (query) => {
            console.log(`🧪 Testing search with query: "${query}"`);
            this.currentSearch = query;
            this.loadSchools();
        };
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const level = tab.dataset.level;
                if (level && level !== this.currentLevel) {
                this.switchLevel(level);
                }
            });
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            console.log('✅ Search input found and event listener attached');
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                console.log(`🔍 Search input changed: "${this.currentSearch}"`);
                this.debounceSearch();
            });
        } else {
            console.error('❌ Search input not found!');
        }

        // Region filter
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter) {
            regionFilter.addEventListener('change', (e) => {
            this.currentRegion = e.target.value;
            this.loadSchools();
        });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadSchools();
            });
        }

        // Language switcher
        const langSwitcher = document.getElementById('langSwitcher');
        if (langSwitcher) {
            langSwitcher.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                this.updateLanguage();
                this.loadSchools();
            });
        }
    }

    debounceSearch() {
        console.log(`⏱️ Debouncing search for: "${this.currentSearch}"`);
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            console.log(`🚀 Executing search for: "${this.currentSearch}"`);
            this.loadSchools();
        }, 300);
    }

    async switchLevel(level) {
        // Prevent rapid clicking
            const now = Date.now();
        if (now - this.lastTabClick < 100) {
                return;
            }
            this.lastTabClick = now;

        console.log(`🔄 Switching to level: ${level}`);
        
        // Validate level parameter
        if (!level || !['primary', 'middle', 'secondary'].includes(level)) {
            console.error('❌ Invalid level parameter:', level);
            return;
        }
        
        this.currentLevel = level;
        this.currentPage = 1;
        this.currentSearch = '';
        this.currentRegion = 'all';
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-level="${level}"]`).classList.add('active');

        // Reset search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Load data for new level
        await this.loadRegions();
        await this.loadSchools();
    }

    async loadRegions() {
        try {
            console.log(`🌍 Loading regions for level: ${this.currentLevel}`);
            const response = await fetch(`/api/regions/${this.currentLevel}`);
            console.log('🌍 Regions response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('🌍 Regions data:', data);
            console.log('🔍 Regions success property:', data.success);
            console.log('🔍 Regions data type:', typeof data.success);
            console.log('🔍 Regions success === true:', data.success === true);
            console.log('🔍 Regions array:', data.regions);
            console.log('🔍 Regions array length:', data.regions ? data.regions.length : 'undefined');

            if (data.success && data.regions) {
                this.regions = data.regions;
                console.log('✅ Regions loaded:', this.regions.length);
                
                try {
                    console.log('🎨 Updating region filter...');
            this.updateRegionFilter();
                    console.log('✅ Region filter updated successfully');
                } catch (regionError) {
                    console.error('❌ Error updating region filter:', regionError);
                }
            } else {
                console.error('❌ Failed to load regions:', data);
            }
        } catch (error) {
            console.error('❌ Error loading regions:', error);
        }
    }

    updateRegionFilter() {
        const regionFilter = document.getElementById('regionFilter');
        if (!regionFilter) return;

        regionFilter.innerHTML = `
            <option value="all">${this.translate('all_regions')}</option>
            ${this.regions.map(region => 
                `<option value="${region}">${region}</option>`
            ).join('')}
        `;
    }

    async loadSchools() {
        try {
            console.log('🚀 Starting loadSchools...');
            this.showLoading();
            
            const params = new URLSearchParams({
                limit: this.pageSize,
                offset: (this.currentPage - 1) * this.pageSize
            });

            if (this.currentRegion !== 'all') {
                params.append('region', this.currentRegion);
            }
            
            let url;
            if (this.currentSearch.trim()) {
                url = `/api/schools/${this.currentLevel}/search?${params}&q=${encodeURIComponent(this.currentSearch)}`;
            } else {
                url = `/api/schools/${this.currentLevel}?${params}`;
            }
            
            console.log(`📚 Loading schools: ${url}`);
            const response = await fetch(url);
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📊 Response data:', data);
            console.log('🔍 Data success property:', data.success);
            console.log('🔍 Data type:', typeof data.success);
            console.log('🔍 Data success === true:', data.success === true);

            if (data.success) {
            this.schools = data.schools || [];
            this.totalSchools = data.total || 0;
                console.log('✅ Data loaded successfully:', this.schools.length, 'schools');
                this.hideLoading();
            
                try {
                    console.log('🎨 Rendering schools...');
            this.renderSchools();
                    console.log('📊 Updating stats...');
                    await this.updateStats();
                    console.log('📄 Updating pagination...');
                    this.updatePagination();
                    console.log('✅ All rendering completed successfully');
                } catch (renderError) {
                    console.error('❌ Error during rendering:', renderError);
                    this.showError();
                }
            } else {
                console.error('❌ Failed to load schools:', data);
                this.hideLoading();
                this.showError();
            }
        } catch (error) {
            console.error('❌ Error loading schools:', error);
            this.hideLoading();
            this.showError();
        }
    }

    renderSchools() {
        const schoolsGrid = document.getElementById('schoolsGrid');
        if (!schoolsGrid) return;
        
        if (this.schools.length === 0) {
            schoolsGrid.innerHTML = `
                <div class="no-schools">
                    <i class="fas fa-school" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <h3>${this.translate('no_schools')}</h3>
                    <p>${this.translate('try_again')}</p>
                </div>
            `;
            return;
        }
        
        schoolsGrid.innerHTML = this.schools.map((school, index) => `
            <div class="school-card-professional" onclick="window.app.showSchoolDetails('${school.id}')">
                <div class="school-ranking-badge">#${(this.currentPage - 1) * this.pageSize + index + 1}</div>
                
                <div class="school-header-professional">
                    <h2 class="school-name-professional">${school.name}</h2>
                    <div class="school-location-professional">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${school.region}</span>
                    </div>
                </div>
                
                <div class="statistics-grid-professional">
                    <div class="stat-card-professional">
                        <div class="stat-number-professional">${school.totalStudents || 0}</div>
                        <div class="stat-label-professional">Candidats</div>
                    </div>
                    
                    <div class="stat-card-professional">
                        <div class="stat-number-professional">${school.passedStudents || 0}</div>
                        <div class="stat-label-professional">Admis</div>
                    </div>
                    
                    <div class="stat-card-professional success-highlight">
                        <div class="stat-number-professional">${school.successRate || school.score || 0}%</div>
                        <div class="stat-label-professional">Taux de Réussite</div>
                    </div>
                    
                    <div class="stat-card-professional">
                        <div class="stat-number-professional">${school.maxScore || 0}</div>
                        <div class="stat-label-professional">Note Max</div>
                </div>
                    
                    <div class="stat-card-professional">
                        <div class="stat-number-professional">${school.minScore || 0}</div>
                        <div class="stat-label-professional">Note Min</div>
                    </div>
                    </div>
                    </div>
        `).join('');
    }

    async updateStats() {
        const totalSchoolsEl = document.getElementById('totalSchools');
        const totalStudentsEl = document.getElementById('totalStudents');
        const successRateEl = document.getElementById('successRate');

        try {
            // Fetch statistics from the API
            const response = await fetch(`/api/stats/${this.currentLevel}`);
            const data = await response.json();
            
            if (data.success && data.stats) {
                const stats = data.stats;
                
                if (totalSchoolsEl) totalSchoolsEl.textContent = stats.totalSchools.toLocaleString();
                if (totalStudentsEl) totalStudentsEl.textContent = stats.totalStudents.toLocaleString();
                if (successRateEl) successRateEl.textContent = stats.overallSuccessRate.toFixed(1) + '%';
            } else {
                // Fallback to current page data
                if (totalSchoolsEl) totalSchoolsEl.textContent = this.totalSchools.toLocaleString();
                if (totalStudentsEl) {
                    const totalStudents = this.schools.reduce((sum, school) => sum + (school.totalStudents || 0), 0);
                    totalStudentsEl.textContent = totalStudents.toLocaleString();
                }
                if (successRateEl) {
                    if (this.schools.length > 0) {
                        const totalSuccessRate = this.schools.reduce((sum, school) => sum + (school.successRate || school.score || 0), 0);
                        const averageSuccessRate = totalSuccessRate / this.schools.length;
                        successRateEl.textContent = Math.round(averageSuccessRate * 100) / 100 + '%';
                    } else {
                        successRateEl.textContent = '0%';
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error fetching statistics:', error);
            // Fallback to current page data
            if (totalSchoolsEl) totalSchoolsEl.textContent = this.totalSchools.toLocaleString();
            if (totalStudentsEl) {
                const totalStudents = this.schools.reduce((sum, school) => sum + (school.totalStudents || 0), 0);
                totalStudentsEl.textContent = totalStudents.toLocaleString();
            }
            if (successRateEl) successRateEl.textContent = '0%';
        }
    }

    updatePagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(this.totalSchools / this.pageSize);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '';
        
        // Previous button
        if (this.currentPage > 1) {
        paginationHTML += `
                <button class="pagination-btn" onclick="window.app.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        }
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                        onclick="window.app.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (this.currentPage < totalPages) {
        paginationHTML += `
                <button class="pagination-btn" onclick="window.app.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        }
        
        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        if (page < 1 || page > Math.ceil(this.totalSchools / this.pageSize)) return;
        
        this.currentPage = page;
        this.loadSchools();
    }

    showLoading() {
        const loadingEl = document.getElementById('loading');
        const schoolsGrid = document.getElementById('schoolsGrid');
        
        if (loadingEl) loadingEl.style.display = 'block';
        if (schoolsGrid) schoolsGrid.innerHTML = '';
    }

    hideLoading() {
        const loadingEl = document.getElementById('loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }

    showError() {
        const schoolsGrid = document.getElementById('schoolsGrid');
        if (schoolsGrid) {
        schoolsGrid.innerHTML = `
            <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e74c3c; margin-bottom: 1rem;"></i>
                    <h3>${this.translate('error_loading')}</h3>
                    <button class="btn-primary" onclick="window.app.loadSchools()">
                        <i class="fas fa-refresh"></i>
                        ${this.translate('try_again')}
                </button>
            </div>
        `;
    }
    }

    async showSchoolDetails(schoolId) {
        console.log('🔍 showSchoolDetails called with ID:', schoolId);
        
        const modal = document.getElementById('schoolModal');
        const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

        console.log('🔍 Modal elements:', { modal: !!modal, modalTitle: !!modalTitle, modalBody: !!modalBody });

        if (modal && modalTitle && modalBody) {
            // Show loading state
            modalTitle.textContent = this.translate('modal_school_details');
            modalBody.innerHTML = `
                <div class="loading-details">
                    <div class="spinner"></div>
                    <p>Chargement des détails...</p>
                </div>
            `;
            modal.style.display = 'block';
            console.log('✅ Modal displayed');

            try {
                // Fetch detailed school statistics
                console.log('🔍 Fetching school details for:', schoolId);
                const response = await fetch(`/api/school/${schoolId}/details`);
                console.log('🔍 Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
            const data = await response.json();
                console.log('🔍 Response data:', data);
            
            if (data.success) {
                    const { school, statistics, performanceCurve, curveData, admissionCriteria } = data;
                    
                                modalBody.innerHTML = `
                                    <div class="school-detail-enhanced">
                                        <div class="school-header">
                                            <h2>${school.name}</h2>
                                            <div class="school-meta">
                                                <span class="region">${school.region}</span>
                                                <span class="rank">#${school.rank}</span>
                                            </div>
                                        </div>
                                        
                                        <div class="statistics-grid-simple">
                                            <div class="stat-card-simple">
                                                <div class="stat-number-simple">${statistics.totalCandidates}</div>
                                                <div class="stat-label-simple">Candidats</div>
                                            </div>
                                            
                                            <div class="stat-card-simple">
                                                <div class="stat-number-simple">${statistics.admittedStudents}</div>
                                                <div class="stat-label-simple">Admis</div>
                                            </div>
                                            
                                            <div class="stat-card-simple success-highlight">
                                                <div class="stat-number-simple">${statistics.successRate}%</div>
                                                <div class="stat-label-simple">Taux de Réussite</div>
                                            </div>
                                            
                                            <div class="stat-card-simple">
                                                <div class="stat-number-simple">${statistics.maxScore}</div>
                                                <div class="stat-label-simple">Note Max</div>
                                            </div>
                                            
                                            <div class="stat-card-simple">
                                                <div class="stat-number-simple">${statistics.minScore}</div>
                                                <div class="stat-label-simple">Note Min</div>
                                            </div>
                                            
                                            <div class="stat-card-simple">
                                                <div class="stat-number-simple">${statistics.averageScore}</div>
                                                <div class="stat-label-simple">Note Moyenne</div>
                                            </div>
                                        </div>
                                        
                                        <div class="performance-section">
                                            <h3>Courbe de Performance</h3>
                                            <div class="performance-chart-container">
                                                <div class="chart-info">
                                                    <span class="chart-scale">Échelle: ${curveData.scale}</span>
                                                    <span class="chart-interval">Intervalle: ${curveData.interval} points</span>
                                                </div>
                                                <div class="performance-chart" id="performanceChart">
                                                    ${this.generateInteractivePerformanceChart(curveData, school.level)}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="admission-info">
                                            <p><strong>Critère d'admission:</strong> ${admissionCriteria}</p>
                                        </div>
                                    </div>
                                `;
                } else {
                    modalBody.innerHTML = `
                        <div class="error-details">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Erreur</h3>
                            <p>Impossible de charger les détails de cette école.</p>
                </div>
            `;
                }
            } catch (error) {
                console.error('❌ Error loading school details:', error);
                // Show fallback with basic school info
                const school = this.schools.find(s => s.id === schoolId);
                if (school) {
                    modalBody.innerHTML = `
                        <div class="school-detail-enhanced">
                            <div class="school-header">
                                <h2>${school.name}</h2>
                                <div class="school-meta">
                                    <span class="region">${school.region}</span>
                                </div>
                            </div>
                            
                            <div class="statistics-grid-simple">
                                <div class="stat-card-simple">
                                    <div class="stat-number-simple">${school.totalStudents || 0}</div>
                                    <div class="stat-label-simple">Élèves</div>
                                </div>
                                
                                <div class="stat-card-simple">
                                    <div class="stat-number-simple">${school.successRate || school.score || 0}%</div>
                                    <div class="stat-label-simple">Taux de Réussite</div>
                                </div>
                                
                                <div class="stat-card-simple">
                                    <div class="stat-number-simple">${school.score || 0}</div>
                                    <div class="stat-label-simple">Score</div>
                                </div>
                            </div>
                            
                            <div class="admission-info">
                                <p><strong>Note:</strong> Détails complets en cours de chargement...</p>
                            </div>
                        </div>
                    `;
            } else {
                    modalBody.innerHTML = `
                        <div class="error-details">
                            <i class="fas fa-exclamation-triangle"></i>
                            <h3>Erreur</h3>
                            <p>Une erreur s'est produite lors du chargement des détails.</p>
            </div>
        `;
    }
            }
        }
    }

    generatePerformanceChart(performanceCurve, level) {
        const maxCount = Math.max(...performanceCurve.map(item => item.count));
        const scale = level === 'primary' ? 10 : 1; // Different scales for different levels
        
        return performanceCurve
            .filter(item => item.count > 0) // Only show ranges with students
            .map(item => {
                const height = (item.count / maxCount) * 100;
                return `
                    <div class="chart-bar" style="height: ${height}%">
                        <div class="bar-fill"></div>
                        <div class="bar-label">${item.range}</div>
                        <div class="bar-count">${item.count}</div>
                    </div>
                `;
            }).join('');
    }

    generateInteractivePerformanceChart(curveData, level) {
        if (!curveData || !curveData.points || curveData.points.length === 0) {
            return '<div class="no-data">Aucune donnée disponible pour la courbe de performance</div>';
        }

        const maxCount = curveData.maxCount;
        const points = curveData.points;
        const isPrimary = level === 'primary';
        
        // Create SVG-based interactive chart
        const chartWidth = 400;
        const chartHeight = 200;
        const padding = 40;
        const barWidth = Math.max(8, (chartWidth - padding * 2) / points.length);
        
        let svgContent = `
            <svg class="performance-curve-svg" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">
                <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#667eea;stop-opacity:0.8" />
                        <stop offset="100%" style="stop-color:#667eea;stop-opacity:0.3" />
                    </linearGradient>
                </defs>
        `;
        
        // Add grid lines
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight - padding * 2) * (i / 5);
            svgContent += `<line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#e0e0e0" stroke-width="1" opacity="0.5"/>`;
        }
        
        // Add bars with hover effects
        points.forEach((point, index) => {
            const x = padding + (chartWidth - padding * 2) * (index / points.length);
            const barHeight = (point.count / maxCount) * (chartHeight - padding * 2);
            const y = chartHeight - padding - barHeight;
            
            svgContent += `
                <g class="chart-bar-group" data-count="${point.count}" data-percentage="${point.percentage.toFixed(1)}" data-range="${point.range}">
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                          fill="url(#curveGradient)" 
                          class="chart-bar-interactive"
                          rx="2"/>
                    <text x="${x + barWidth/2}" y="${chartHeight - padding + 15}" 
                          text-anchor="middle" font-size="10" fill="#666" class="bar-label">${point.range}</text>
                    <text x="${x + barWidth/2}" y="${y - 5}" 
                          text-anchor="middle" font-size="9" fill="#333" class="bar-count">${point.count}</text>
                </g>
            `;
        });
        
        // Add axis labels
        svgContent += `
            <text x="${chartWidth/2}" y="${chartHeight - 10}" text-anchor="middle" font-size="12" fill="#666">Notes</text>
            <text x="15" y="${chartHeight/2}" text-anchor="middle" font-size="12" fill="#666" transform="rotate(-90, 15, ${chartHeight/2})">Nombre d'élèves</text>
        `;
        
        svgContent += '</svg>';
        
        return svgContent;
    }

    updateLanguage() {
        // Update all elements with data-translate attributes
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translate(key);
            if (translation) {
                element.textContent = translation;
            }
        });

        // Update title
        document.title = this.translate('app_title');
    }

    translate(key) {
        return this.translations[this.currentLanguage]?.[key] || key;
    }

    async loadInitialData() {
        try {
            console.log('🌍 Loading regions...');
            await this.loadRegions();
            console.log('🏫 Loading schools...');
            await this.loadSchools();
            console.log('✅ Initial data loaded');
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
        }
    }
}

// Global functions for modal and other interactions
function closeModal() {
    const modal = document.getElementById('schoolModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showAbout() {
    const modal = document.getElementById('aboutModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function showHelp() {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    const modals = ['schoolModal', 'aboutModal', 'helpModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });
});

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SchoolRankingApp();
});