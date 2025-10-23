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
                stat_schools: "Écoles",
                stat_students: "Élèves",
                stat_success_rate: "Taux de Réussite",
                
                // Results
                loading_data: "Chargement des données...",
                results_title: "Classement des Écoles",
                
                // Footer
                footer_copyright: "© 2025 Classement des Écoles - République Islamique de Mauritanie 🇲🇷",
                footer_data_source: "Données officielles du Ministère de l'Éducation Nationale",
                footer_about: "À propos",
                footer_help: "Aide",
                
                // Modal
                modal_school_details: "Détails de l'École",
                modal_close: "Fermer",
                
                // About modal
                about_title: "À propos de cette application",
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
                about_developer: "Cette application est développée par Khalifa-IT services, pour plus d'info: 36090932",
                
                // School details
                candidates: "Candidats",
                admitted: "Admis",
                success_rate: "Taux de Réussite",
                max_average: "Note Max",
                min_average: "Note Min",
                ranking_score: "Score de classement",
                national_ranking: "Classement national",
                regional_ranking: "Classement régional",
                performance_chart: "Courbe de Performance",
                performance_stats: "Statistiques de performance",
                general_info: "Informations générales",
                evaluation: "Évaluation",
                region: "Région",
                level: "Niveau",
                ranking: "Classement",
                excellent: "Excellent",
                good: "Bon",
                average: "Moyen",
                poor: "Faible",
                no_results: "Aucune école trouvée",
                no_results_desc: "Essayez de modifier vos critères de recherche ou vérifiez que les données sont disponibles",
                error: "Erreur",
                retry: "Réessayer",
                help_text: "Utilisez les onglets pour naviguer entre les niveaux d'éducation. Recherchez les écoles par nom ou filtrez par région. Cliquez sur une école pour voir ses détails."
            },
            ar: {
                // App titles and navigation
                app_title: "تصنيف المدارس - موريتانيا",
                app_subtitle: "اعثر على أفضل مدرسة لأطفالك في الجمهورية الإسلامية الموريتانية",
                nav_primary: "المدارس الابتدائية (مسابقة ختم الدروس)",
                nav_middle: "المدارس المتوسطة (شهادة الإعدادية)",
                nav_secondary: "المدارس الثانوية (البكالوريا)",
                
                // Controls
                search_placeholder: "البحث عن مدرسة...",
                all_regions: "جميع المناطق",
                refresh: "تحديث",
                
                // Stats
                stat_schools: "المدارس",
                stat_students: "الطلاب",
                stat_success_rate: "معدل النجاح",
                
                // Results
                loading_data: "جاري تحميل البيانات...",
                results_title: "تصنيف المدارس",
                
                // Footer
                footer_copyright: "© 2025 تصنيف المدارس - الجمهورية الإسلامية الموريتانية 🇲🇷",
                footer_data_source: "بيانات رسمية من وزارة التربية الوطنية",
                footer_about: "حول",
                footer_help: "مساعدة",
                
                // Modal
                modal_school_details: "تفاصيل المدرسة",
                modal_close: "إغلاق",
                
                // About modal
                about_title: "حول هذا التطبيق",
                about_description: "يسمح هذا التطبيق للعائلات الموريتانية بالعثور على أفضل المدارس لأطفالها بناءً على النتائج الرسمية للامتحانات.",
                about_levels_title: "مستويات التعليم المشمولة:",
                about_primary: "المدارس الابتدائية (مسابقة ختم الدروس)",
                about_primary_desc: "نتائج مسابقة ختم الدروس",
                about_middle: "المدارس المتوسطة (شهادة الإعدادية)",
                about_middle_desc: "نتائج شهادة الإعدادية",
                about_secondary: "المدارس الثانوية (البكالوريا)",
                about_secondary_desc: "نتائج البكالوريا",
                about_criteria_title: "معايير التصنيف:",
                about_criteria_success: "معدل النجاح (40%)",
                about_criteria_average: "المتوسط العام للدرجات (60%)",
                about_data_source: "البيانات مقدمة من وزارة التربية في الجمهورية الإسلامية الموريتانية.",
                about_developer: "هذا التطبيق مطور من قبل Khalifa-IT services، للمزيد من المعلومات: 36090932",
                
                // School details
                candidates: "المرشحون",
                admitted: "الناجحون",
                success_rate: "معدل النجاح",
                max_average: "الدرجة العليا",
                min_average: "الدرجة الدنيا",
                ranking_score: "نقاط التصنيف",
                national_ranking: "التصنيف الوطني",
                regional_ranking: "التصنيف الإقليمي",
                performance_chart: "منحنى الأداء",
                performance_stats: "إحصائيات الأداء",
                general_info: "المعلومات العامة",
                evaluation: "التقييم",
                region: "المنطقة",
                level: "المستوى",
                ranking: "التصنيف",
                excellent: "ممتاز",
                good: "جيد",
                average: "متوسط",
                poor: "ضعيف",
                no_results: "لم يتم العثور على مدارس",
                no_results_desc: "حاول تعديل معايير البحث أو تحقق من توفر البيانات",
                error: "خطأ",
                retry: "إعادة المحاولة",
                help_text: "استخدم التبويبات للتنقل بين مستويات التعليم. ابحث عن المدارس بالاسم أو فلتر حسب المنطقة. انقر على مدرسة لرؤية تفاصيلها."
            }
        };
        
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
        this.initializeLanguage();
        await this.loadInitialData();
        this.showLoading(false);
    }

    initializeLanguage() {
        // Load saved language preference or default to French
        const savedLanguage = localStorage.getItem('schoolRankingLanguage') || 'fr';
        this.setLanguage(savedLanguage);
    }

    setLanguage(language) {
        if (!this.translations[language]) {
            console.warn(`Language ${language} not supported, falling back to French`);
            language = 'fr';
        }
        
        this.currentLanguage = language;
        localStorage.setItem('schoolRankingLanguage', language);
        
        // Update HTML attributes
        const html = document.documentElement;
        html.setAttribute('lang', language);
        html.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        
        // Add/remove RTL class
        document.body.classList.toggle('rtl', language === 'ar');
        
        // Update language toggle button
        const currentLangSpan = document.getElementById('currentLang');
        if (currentLangSpan) {
            currentLangSpan.textContent = language.toUpperCase();
        }
        
        // Translate all elements
        this.translatePage();
    }

    translatePage() {
        // Translate elements with data-translate attribute
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.translations[this.currentLanguage][key];
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // Translate placeholders
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            const translation = this.translations[this.currentLanguage][key];
            if (translation) {
                element.placeholder = translation;
            }
        });
        
        // Translate titles
        document.querySelectorAll('[data-translate-title]').forEach(element => {
            const key = element.getAttribute('data-translate-title');
            const translation = this.translations[this.currentLanguage][key];
            if (translation) {
                element.title = translation;
            }
        });
        
        // Update dynamic content
        this.updateResultsHeader();
        this.updateRegionFilter();
    }

    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }

    setupEventListeners() {
        // Language toggle
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            languageToggle.addEventListener('click', () => {
                const newLanguage = this.currentLanguage === 'fr' ? 'ar' : 'fr';
                this.setLanguage(newLanguage);
            });
        }

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const level = e.target.dataset.level;
                console.log('🖱️ Tab clicked:', level);
                this.switchLevel(level);
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
            this.showLoadingMessage('Chargement des données...');
            
            // Load data with timeout
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 15000)
            );
            
            const loadData = Promise.all([
                this.loadRegions(),
                this.loadStats(),
                this.loadSchools()
            ]);
            
            await Promise.race([loadData, timeout]);
            
            console.log('✅ Initial data loaded successfully');
            this.showLoading(false);
        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError('Erreur lors du chargement des données. Veuillez actualiser la page.');
        }
    }

    async switchLevel(level) {
        if (this.currentLevel === level) {
            // Prevent rapid clicking on the same tab
            const now = Date.now();
            if (now - this.lastTabClick < 300) {
                console.log('⏳ Too fast, ignoring click');
                return;
            }
            this.lastTabClick = now;
            return;
        }
        
        // Validate level parameter
        if (!level || !['primary', 'middle', 'secondary', 'voting'].includes(level)) {
            console.error('❌ Invalid level parameter:', level);
            return;
        }
        
        console.log('🔄 Switching to:', level);
        this.lastTabClick = Date.now();
        
        this.currentLevel = level;
        this.currentPage = 1;
        this.currentSearch = '';
        this.currentRegion = 'all';
        
        // Update UI immediately for better responsiveness
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`[data-level="${level}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        document.getElementById('searchInput').value = '';
        document.getElementById('regionFilter').value = 'all';
        
        // Load data asynchronously without blocking UI
        this.loadInitialData().catch(error => {
            console.error('❌ Error in switchLevel:', error);
        });
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
        regionFilter.innerHTML = `<option value="all">${this.translate('all_regions')}</option>`;
        
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
        }
    }

    updateStatsDisplay(data) {
        if (data.stats) {
            document.getElementById('totalSchools').textContent = data.stats.totalSchools.toLocaleString();
            document.getElementById('totalStudents').textContent = data.stats.totalStudents.toLocaleString();
            document.getElementById('successRate').textContent = `${data.stats.overallSuccessRate}%`;
        } else if (data.message) {
            console.log('Stats message:', data.message);
            // Show placeholder values
            document.getElementById('totalSchools').textContent = '0';
            document.getElementById('totalStudents').textContent = '0';
            document.getElementById('successRate').textContent = '0%';
        }
    }

    async loadSchools() {
        try {
            // Validate currentLevel before making API request
            if (!this.currentLevel || !['primary', 'middle', 'secondary'].includes(this.currentLevel)) {
                console.error('❌ Invalid currentLevel:', this.currentLevel);
                this.currentLevel = 'primary'; // Default fallback
            }
            
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
            
            // Check if data is still loading
            if (data.loading) {
                this.showLoadingMessage('Données en cours de chargement...');
                setTimeout(() => this.loadSchools(), 2000);
                return;
            }
            
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
                primary: this.translate('nav_primary').toLowerCase(),
                middle: this.translate('nav_middle').toLowerCase(),
                secondary: this.translate('nav_secondary').toLowerCase()
            };
            
            schoolsGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search" style="font-size: 3rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h3>${this.translate('no_results')}</h3>
                    <p>${this.translate('no_results_desc')}</p>
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
            const levelLabel = this.translate('candidates');
            const admittedLabel = this.translate('admitted');
            
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
                        <div class="school-stat-label">${this.translate('success_rate')}</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.maxScore.toFixed(2)}</div>
                        <div class="school-stat-label">${this.translate('max_average')}</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.minScore.toFixed(2)}</div>
                        <div class="school-stat-label">${this.translate('min_average')}</div>
                    </div>
                </div>
            `;
        } else {
            // Fallback: 4 parameters (should not happen with new implementation)
            statsHTML = `
                <div class="school-stats">
                    <div class="school-stat">
                        <div class="school-stat-value">${school.totalStudents}</div>
                        <div class="school-stat-label">${this.translate('stat_students')}</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value ${successRateClass}">${school.successRate.toFixed(1)}%</div>
                        <div class="school-stat-label">${this.translate('success_rate')}</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">${school.passedStudents}</div>
                        <div class="school-stat-label">${this.translate('admitted')}</div>
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
            primary: this.translate('nav_primary'),
            middle: this.translate('nav_middle'),
            secondary: this.translate('nav_secondary')
        };
        
        document.getElementById('resultsTitle').textContent = `${this.translate('results_title')} - ${levelNames[this.currentLevel]}`;
        document.getElementById('resultsCount').textContent = `${this.totalSchools} ${this.translate('stat_schools')}`;
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
                    <h4><i class="fas fa-chart-bar"></i> ${this.translate('performance_stats')} (${this.currentLevel === 'secondary' ? this.translate('nav_secondary') : this.currentLevel === 'middle' ? this.translate('nav_middle') : this.translate('nav_primary')})</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('candidates')}:</span>
                            <span class="detail-value">${school.totalStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('admitted')}:</span>
                            <span class="detail-value">${school.passedStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('success_rate')}:</span>
                            <span class="detail-value ${successRateClass}">${school.successRate.toFixed(2)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('max_average')}:</span>
                            <span class="detail-value">${school.maxScore.toFixed(2)}/${this.currentLevel === 'primary' ? '200' : '10'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('min_average')}:</span>
                            <span class="detail-value">${school.minScore.toFixed(2)}/${this.currentLevel === 'primary' ? '200' : '10'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('ranking_score')}:</span>
                            <span class="detail-value">${school.rankingScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('national_ranking')}:</span>
                            <span class="detail-value ranking-national">#${school.rank}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('regional_ranking')}:</span>
                            <span class="detail-value ranking-regional">#${school.regionalRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> ${this.translate('performance_chart')}</h4>
                    <div class="performance-chart">
                        <div class="chart-container">
                            <div class="chart-bars">
                                <div class="chart-bar" data-label="${this.translate('candidates')}" data-value="${school.totalStudents}" data-max="200" style="--bar-color: #3498db;">
                                    <div class="bar-fill" style="height: ${Math.min((school.totalStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.totalStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('admitted')}" data-value="${school.passedStudents}" data-max="200" style="--bar-color: #2ecc71;">
                                    <div class="bar-fill" style="height: ${Math.min((school.passedStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.passedStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('success_rate')}" data-value="${school.successRate}" data-max="100" style="--bar-color: #e74c3c;">
                                    <div class="bar-fill" style="height: ${Math.min(school.successRate, 100)}%"></div>
                                    <div class="bar-label">${school.successRate.toFixed(1)}%</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('max_average')}" data-value="${school.maxScore}" data-max="${this.currentLevel === 'primary' ? '200' : '10'}" style="--bar-color: #9b59b6;">
                                    <div class="bar-fill" style="height: ${Math.min((school.maxScore / (this.currentLevel === 'primary' ? 200 : 10)) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.maxScore.toFixed(1)}</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('min_average')}" data-value="${school.minScore}" data-max="${this.currentLevel === 'primary' ? '200' : '10'}" style="--bar-color: #1abc9c;">
                                    <div class="bar-fill" style="height: ${Math.min((school.minScore / (this.currentLevel === 'primary' ? 200 : 10)) * 100, 100)}%"></div>
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
                    <h4><i class="fas fa-chart-bar"></i> ${this.translate('performance_stats')}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('candidates')}:</span>
                            <span class="detail-value">${school.totalStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('admitted')}:</span>
                            <span class="detail-value">${school.passedStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('success_rate')}:</span>
                            <span class="detail-value ${successRateClass}">${school.successRate.toFixed(2)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('ranking_score')}:</span>
                            <span class="detail-value">${school.rankingScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('national_ranking')}:</span>
                            <span class="detail-value ranking-national">#${school.rank}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('regional_ranking')}:</span>
                            <span class="detail-value ranking-regional">#${school.regionalRank || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-line"></i> ${this.translate('performance_chart')}</h4>
                    <div class="performance-chart">
                        <div class="chart-container">
                            <div class="chart-bars">
                                <div class="chart-bar" data-label="${this.translate('candidates')}" data-value="${school.totalStudents}" data-max="200" style="--bar-color: #3498db;">
                                    <div class="bar-fill" style="height: ${Math.min((school.totalStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.totalStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('admitted')}" data-value="${school.passedStudents}" data-max="200" style="--bar-color: #2ecc71;">
                                    <div class="bar-fill" style="height: ${Math.min((school.passedStudents / 200) * 100, 100)}%"></div>
                                    <div class="bar-label">${school.passedStudents}</div>
                                </div>
                                <div class="chart-bar" data-label="${this.translate('success_rate')}" data-value="${school.successRate}" data-max="100" style="--bar-color: #e74c3c;">
                                    <div class="bar-fill" style="height: ${Math.min(school.successRate, 100)}%"></div>
                                    <div class="bar-label">${school.successRate.toFixed(1)}%</div>
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
                    <h4><i class="fas fa-info-circle"></i> ${this.translate('general_info')}</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('region')}:</span>
                            <span class="detail-value">${school.region}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('level')}:</span>
                            <span class="detail-value">${this.getLevelName(school.level)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">${this.translate('ranking')}:</span>
                            <span class="detail-value">#${school.rank}</span>
                        </div>
                    </div>
                </div>
                
                ${performanceDetails}
                
                <div class="detail-section">
                    <h4><i class="fas fa-trophy"></i> ${this.translate('evaluation')}</h4>
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
        if (successRate >= 80) return this.translate('excellent');
        if (successRate >= 60) return this.translate('good');
        if (successRate >= 40) return this.translate('average');
        return this.translate('poor');
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
                    <p>${message || this.translate('loading_data')}</p>
                </div>
            `;
        }
    }

    showError(message) {
        const schoolsGrid = document.getElementById('schoolsGrid');
        schoolsGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 20px;"></i>
                <h3>${this.translate('error')}</h3>
                <p>${message}</p>
                <button onclick="app.refreshData()" class="btn-refresh">
                    <i class="fas fa-sync-alt"></i>
                    ${this.translate('retry')}
                </button>
            </div>
        `;
    }

    async refreshData() {
        await this.loadInitialData();
    }

    updateLanguage(language) {
        this.currentLanguage = language;
        // Re-render the current view with new language
        this.updateResultsHeader();
        this.renderSchools();
        this.updateRegionFilter();
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
    console.log('showAbout function called');
    const aboutModal = document.getElementById('aboutModal');
    console.log('aboutModal element:', aboutModal);
    if (aboutModal) {
        aboutModal.style.display = 'block';
        aboutModal.style.visibility = 'visible';
        aboutModal.style.opacity = '1';
        console.log('Modal should be visible now');
    } else {
        console.error('aboutModal element not found');
    }
}

function closeAboutModal() {
    const aboutModal = document.getElementById('aboutModal');
    if (aboutModal) {
        aboutModal.style.display = 'none';
    }
}

function showHelp() {
    const helpText = app ? 
        `${app.translate('footer_help')}: ${app.translate('help_text')}` : 
        'Aide: Utilisez les onglets pour naviguer entre les niveaux d\'éducation. Recherchez les écoles par nom ou filtrez par région. Cliquez sur une école pour voir ses détails.';
    alert(helpText);
}

// Initialize the application
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SchoolRankingApp();
    window.app = app; // Make app globally available
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

// ===== COMMUNITY VOTING FUNCTIONALITY =====

class CommunityVoting {
    constructor() {
        this.votingStats = null;
        this.leaderboard = [];
        this.votingSchools = [];
        this.currentVotingRegion = 'all';
        this.currentVotingLevel = 'all';
        this.voteCounts = {}; // Track votes per school for current user
    }

    // Initialize voting functionality
    async init() {
        console.log('🗳️ Initializing Community Voting...');
        
        // Add voting translations
        this.addVotingTranslations();
        
        // Setup event listeners
        this.setupVotingEventListeners();
        
        // Load initial data
        await this.loadVotingStats();
        
        // Make debugging functions available globally
        window.debugVoteCounts = () => this.debugVoteCounts();
        window.resetVoteCounts = () => this.resetVoteCounts();
        window.renderVotingSchools = () => this.renderVotingSchools();
        
        // Test if elements exist
        const votingRegionFilter = document.getElementById('votingRegionFilter');
        const votingLevelFilter = document.getElementById('votingLevelFilter');
        console.log('🔍 Element check - Region filter:', !!votingRegionFilter, 'Level filter:', !!votingLevelFilter);
        
        // Load regions first with fallback
        try {
            await this.loadVotingRegions();
        } catch (error) {
            console.error('❌ Error loading initial regions:', error);
            // Fallback to default regions
            this.updateVotingRegionFilter(['Toutes les régions', 'Nouakchott', 'Nouadhibou', 'Rosso', 'Kaédi', 'Kiffa', 'Zouerate', 'Atar', 'Néma', 'Aïoun']);
        }
        
        await this.loadLeaderboard();
        await this.loadVotingSchools();
        
        // Check vote restrictions on initialization
        this.checkVoteRestrictions();
        
        console.log('✅ Community Voting initialized');
        
        // Add debugging function to window for testing
        window.debugVoting = () => {
            console.log('🔍 Debug Voting System:');
            console.log('- Current Level:', this.currentVotingLevel);
            console.log('- Current Region:', this.currentVotingRegion);
            console.log('- Voting Schools:', this.votingSchools.length);
            console.log('- Schools Data:', this.votingSchools);
            console.log('- Grid Element:', document.getElementById('votingSchoolsGrid'));
        };
        
        // Add manual trigger for testing
        window.testVotingSchools = () => {
            console.log('🧪 Testing voting schools loading...');
            console.log('Current level:', this.currentVotingLevel);
            console.log('Current region:', this.currentVotingRegion);
            this.loadVotingSchools();
        };
        
        // Add direct API test
        window.testVotingAPI = async () => {
            console.log('🧪 Testing voting API directly...');
            try {
                const response = await fetch(`/api/schools/secondary?limit=5&region=Nouakchott%20Nord`);
                const data = await response.json();
                console.log('Direct API test result:', data);
                return data;
            } catch (error) {
                console.error('Direct API test error:', error);
            }
        };
        
        // Add manual render test
        window.testVotingRender = () => {
            console.log('🧪 Testing manual render...');
            this.votingSchools = [
                {name: 'Test School 1', region: 'Test Region', level: 'secondary', totalStudents: 100, successRate: 95},
                {name: 'Test School 2', region: 'Test Region', level: 'secondary', totalStudents: 200, successRate: 90}
            ];
            this.renderVotingSchools();
        };
    }

    // Add voting translations to existing translation system
    addVotingTranslations() {
        const votingTranslations = {
            fr: {
                nav_voting: "Vote Communautaire",
                voting_title: "Vote Communautaire",
                voting_subtitle: "Soutenez votre école préférée ! Votez pour les écoles qui méritent d'être reconnues par la communauté.",
                voting_total_votes: "Votes Totaux",
                voting_schools: "Écoles Participantes",
                voting_weekly: "Cette Semaine",
                all_levels: "Tous les niveaux",
                voting_leaderboard_title: "🏆 Top de la Semaine",
                voting_schools_title: "Votez pour votre école",
                loading_voting: "Chargement du classement...",
                vote_button: "Voter",
                vote_success: "Vote enregistré !",
                vote_limit_reached: "Limite de votes atteinte",
                vote_error: "Erreur lors du vote",
                votes_remaining: "votes restants",
                total_votes: "votes totaux",
                unique_voters: "votants uniques",
                badges: "Badges",
                no_badges: "Aucun badge",
                vote_loading: "Enregistrement du vote...",
                vote_again: "Voter à nouveau",
                vote_limit_info: "Vous pouvez voter 7 fois par école par semaine"
            },
            ar: {
                nav_voting: "التصويت المجتمعي",
                voting_title: "التصويت المجتمعي",
                voting_subtitle: "ادعموا مدرستكم المفضلة! صوتوا للمدارس التي تستحق الاعتراف من المجتمع.",
                voting_total_votes: "إجمالي الأصوات",
                voting_schools: "المدارس المشاركة",
                voting_weekly: "هذا الأسبوع",
                all_levels: "جميع المستويات",
                voting_leaderboard_title: "🏆 الأسبوع",
                voting_schools_title: "صوتوا لمدرستكم",
                loading_voting: "تحميل الترتيب...",
                vote_button: "صوت",
                vote_success: "تم تسجيل الصوت!",
                vote_limit_reached: "تم الوصول للحد الأقصى من الأصوات",
                vote_error: "خطأ في التصويت",
                votes_remaining: "أصوات متبقية",
                total_votes: "إجمالي الأصوات",
                unique_voters: "ناخبين فريدين",
                badges: "الشارات",
                no_badges: "لا توجد شارات",
                vote_loading: "تسجيل الصوت...",
                vote_again: "صوت مرة أخرى",
                vote_limit_info: "يمكنكم التصويت 7 مرات لكل مدرسة في الأسبوع"
            }
        };

        // Merge with existing translations
        Object.keys(votingTranslations).forEach(lang => {
            if (window.app && window.app.translations && window.app.translations[lang]) {
                Object.assign(window.app.translations[lang], votingTranslations[lang]);
            }
        });
    }

    // Setup event listeners for voting
    setupVotingEventListeners() {
        // Voting region filter
        const votingRegionFilter = document.getElementById('votingRegionFilter');
        if (votingRegionFilter) {
            votingRegionFilter.addEventListener('change', () => {
                this.currentVotingRegion = votingRegionFilter.value;
                this.loadLeaderboard();
                this.loadVotingSchools();
            });
        }

        // Voting level filter
        const votingLevelFilter = document.getElementById('votingLevelFilter');
        if (votingLevelFilter) {
            votingLevelFilter.addEventListener('change', () => {
                console.log('🔄 Level filter changed to:', votingLevelFilter.value);
                this.currentVotingLevel = votingLevelFilter.value;
                this.loadVotingRegions(); // Load regions for the selected level
                this.loadLeaderboard();
                this.loadVotingSchools();
            });
        } else {
            console.error('❌ votingLevelFilter element not found!');
        }

        // Refresh voting button
        const refreshVotingBtn = document.getElementById('refreshVotingBtn');
        if (refreshVotingBtn) {
            refreshVotingBtn.addEventListener('click', () => {
                this.loadVotingStats();
                this.loadVotingRegions(); // Also refresh regions
                this.loadLeaderboard();
                this.loadVotingSchools();
            });
        }
    }

    // Load voting statistics
    async loadVotingStats() {
        try {
            const response = await fetch('/api/voting/stats');
            const data = await response.json();
            
            if (data.success) {
                this.votingStats = data.stats;
                this.updateVotingStatsDisplay();
            }
        } catch (error) {
            console.error('❌ Error loading voting stats:', error);
        }
    }

    // Update voting stats display
    updateVotingStatsDisplay() {
        if (!this.votingStats) return;

        const totalVotesEl = document.getElementById('totalVotes');
        const votingSchoolsEl = document.getElementById('votingSchools');
        const weeklyVotesEl = document.getElementById('weeklyVotes');

        if (totalVotesEl) totalVotesEl.textContent = this.votingStats.total_votes || 0;
        if (votingSchoolsEl) votingSchoolsEl.textContent = this.votingStats.total_schools || 0;
        if (weeklyVotesEl) weeklyVotesEl.textContent = this.votingStats.current_week_votes || 0;
    }

    // Load leaderboard
    async loadLeaderboard() {
        try {
            const votingLoading = document.getElementById('votingLoading');
            const leaderboardGrid = document.getElementById('leaderboardGrid');
            
            if (votingLoading) votingLoading.style.display = 'block';
            if (leaderboardGrid) leaderboardGrid.innerHTML = '';

            const params = new URLSearchParams({
                region: this.currentVotingRegion,
                level: this.currentVotingLevel,
                limit: 10
            });

            const response = await fetch(`/api/voting/leaderboard?${params}`);
            const data = await response.json();

            if (data.success) {
                this.leaderboard = data.leaderboard;
                this.renderLeaderboard();
            }

            if (votingLoading) votingLoading.style.display = 'none';
        } catch (error) {
            console.error('❌ Error loading leaderboard:', error);
            const votingLoading = document.getElementById('votingLoading');
            if (votingLoading) votingLoading.style.display = 'none';
        }
    }

    // Render leaderboard
    renderLeaderboard() {
        const leaderboardGrid = document.getElementById('leaderboardGrid');
        if (!leaderboardGrid) return;

        if (this.leaderboard.length === 0) {
            leaderboardGrid.innerHTML = `
                <div class="voting-loading">
                    <i class="fas fa-trophy" style="font-size: 3rem; color: #667eea; margin-bottom: 1rem;"></i>
                    <h3>Aucune donnée de vote disponible</h3>
                    <p>Les votes commenceront bientôt !</p>
                </div>
            `;
            return;
        }

        const leaderboardHTML = this.leaderboard.map((school, index) => {
            const badges = this.getSchoolBadges(school);
            const badgeHTML = badges.map(badge => 
                `<span class="badge ${badge.class}">${badge.name}</span>`
            ).join('');

            // Add special styling for top 3
            let rankClass = '';
            if (index === 0) rankClass = 'leaderboard-gold';
            else if (index === 1) rankClass = 'leaderboard-silver';
            else if (index === 2) rankClass = 'leaderboard-bronze';

            return `
                <div class="leaderboard-item ${rankClass}" style="animation-delay: ${index * 0.1}s;">
                    <div class="leaderboard-rank">#${school.rank}</div>
                    <div class="leaderboard-school">
                        <h4>${school.school_name}</h4>
                        <p><i class="fas fa-map-marker-alt"></i> ${school.school_region} • <i class="fas fa-graduation-cap"></i> ${this.getLevelName(school.school_level)}</p>
                    </div>
                    <div class="leaderboard-stats">
                        <div class="leaderboard-votes">
                            <div class="vote-count">${school.total_votes}</div>
                            <div class="vote-label">votes</div>
                        </div>
                        <div class="leaderboard-badges">
                            ${badgeHTML}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        leaderboardGrid.innerHTML = leaderboardHTML;
    }

    // Load voting schools
    async loadVotingSchools() {
        try {
            console.log('🏫 Loading voting schools for level:', this.currentVotingLevel, 'region:', this.currentVotingRegion);
            
            // Get schools from the main ranking data
            const currentLevel = this.currentVotingLevel === 'all' ? 'primary' : this.currentVotingLevel;
            const response = await fetch(`/api/schools/${currentLevel}?limit=50&region=${this.currentVotingRegion}`);
            const data = await response.json();

            console.log('📊 Schools API response:', data);

            console.log('🔍 API Response structure:', {
                success: data.success,
                hasSchools: !!data.schools,
                schoolsLength: data.schools ? data.schools.length : 0,
                total: data.total
            });

            if (data.schools && data.schools.length > 0) {
                this.votingSchools = data.schools.slice(0, 20); // Limit to 20 schools for voting
                console.log('✅ Loaded', this.votingSchools.length, 'schools for voting');
                console.log('📋 First school:', this.votingSchools[0]);
                this.renderVotingSchools();
            } else {
                console.log('⚠️ No schools found, showing message');
                console.log('📊 Full API Response:', JSON.stringify(data, null, 2));
                this.showNoSchoolsMessage();
            }
        } catch (error) {
            console.error('❌ Error loading voting schools:', error);
            this.showNoSchoolsMessage();
        }
    }

    // Show message when no schools are available
    showNoSchoolsMessage() {
        const votingSchoolsGrid = document.getElementById('votingSchoolsGrid');
        if (!votingSchoolsGrid) return;

        votingSchoolsGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                <h3>Aucune école trouvée</h3>
                <p>Essayez de changer le niveau ou la région pour voir plus d'écoles.</p>
            </div>
        `;
    }

    // Load regions for voting based on selected level
    async loadVotingRegions() {
        try {
            console.log('🌍 Loading regions for level:', this.currentVotingLevel);
            
            if (this.currentVotingLevel === 'all') {
                // For 'all' levels, show all regions
                this.updateVotingRegionFilter(['Toutes les régions', 'Nouakchott', 'Nouadhibou', 'Rosso', 'Kaédi', 'Kiffa', 'Zouerate', 'Atar', 'Néma', 'Aïoun']);
                return;
            }

            const response = await fetch(`/api/regions/${this.currentVotingLevel}`);
            const data = await response.json();

            console.log('📊 Regions API response:', data);

            if (data.regions && Array.isArray(data.regions)) {
                const regions = ['Toutes les régions', ...data.regions];
                this.updateVotingRegionFilter(regions);
                console.log('✅ Loaded', data.regions.length, 'regions for', this.currentVotingLevel);
            } else {
                console.log('⚠️ No regions found, using default');
                this.updateVotingRegionFilter(['Toutes les régions']);
            }
        } catch (error) {
            console.error('❌ Error loading voting regions:', error);
            this.updateVotingRegionFilter(['Toutes les régions']);
        }
    }

    // Update the voting region filter dropdown
    updateVotingRegionFilter(regions) {
        const votingRegionFilter = document.getElementById('votingRegionFilter');
        if (!votingRegionFilter) {
            console.error('❌ votingRegionFilter element not found!');
            return;
        }

        console.log('🔄 Updating region filter with:', regions);

        votingRegionFilter.innerHTML = regions.map(region => 
            `<option value="${region === 'Toutes les régions' ? 'all' : region}">${region}</option>`
        ).join('');

        // Reset to 'all' when regions change
        votingRegionFilter.value = 'all';
        this.currentVotingRegion = 'all';
        
        console.log('✅ Region filter updated with', regions.length, 'options');
    }

    // Render voting schools
    async renderVotingSchools() {
        console.log('🎓 renderVotingSchools called with:', this.votingSchools.length, 'schools');
        
        const votingSchoolsGrid = document.getElementById('votingSchoolsGrid');
        if (!votingSchoolsGrid) {
            console.error('❌ votingSchoolsGrid element not found!');
            return;
        }

        console.log('🎓 Rendering voting schools:', this.votingSchools.length, 'schools');

        if (this.votingSchools.length === 0) {
            console.log('⚠️ No schools to render, showing message');
            votingSchoolsGrid.innerHTML = `
                <div class="voting-loading">
                    <i class="fas fa-search" style="font-size: 3rem; color: #667eea; margin-bottom: 1rem;"></i>
                    <h3>Aucune école trouvée</h3>
                    <p>Essayez de changer le niveau ou la région pour voir plus d'écoles.</p>
                </div>
            `;
            return;
        }

        // Get user's total vote count for the week from localStorage
        const today = new Date().toDateString();
        const lastVoteDate = localStorage.getItem('lastVoteDate');
        const dailyVoteCount = parseInt(localStorage.getItem('dailyVoteCount') || '0');
        let weeklyVoteCount = parseInt(localStorage.getItem('weeklyVoteCount') || '0');
        
        // Reset weekly votes if it's a new week
        const currentWeek = this.getCurrentWeekStart();
        const storedWeek = localStorage.getItem('currentWeek');
        if (storedWeek !== currentWeek) {
            weeklyVoteCount = 0;
            localStorage.setItem('weeklyVoteCount', '0');
            localStorage.setItem('currentWeek', currentWeek);
            console.log('🔄 New week detected, resetting weekly votes');
        }
        
        // Calculate remaining votes (7 - weekly vote count)
        const remainingVotes = Math.max(0, 7 - weeklyVoteCount);
        
        console.log('📊 Vote counts - Daily:', dailyVoteCount, 'Weekly:', weeklyVoteCount, 'Remaining:', remainingVotes);
        console.log('📊 Current week:', currentWeek, 'Stored week:', storedWeek);
        
        // Debug vote counts
        this.debugVoteCounts();

        const schoolsHTML = this.votingSchools.map((school, index) => {
            const schoolId = this.generateSchoolId(school);
            
            // Check if user can vote based on restrictions
            const today = new Date().toDateString();
            const lastVoteDate = localStorage.getItem('lastVoteDate');
            const lastVoteSchool = localStorage.getItem('lastVoteSchool');
            const dailyVoteCount = parseInt(localStorage.getItem('dailyVoteCount') || '0');
            const lastVoteTime = localStorage.getItem(`lastVoteTime_${schoolId}`);
            
            let canVote = remainingVotes > 0;
            
            // Check daily limit
            if (lastVoteDate === today && dailyVoteCount >= 1) {
                canVote = false;
            }
            
            // Check if voted for different school today
            if (lastVoteSchool && lastVoteSchool !== schoolId && lastVoteDate === today) {
                canVote = false;
            }
            
            // Check 24h cooldown
            if (lastVoteTime) {
                const timeDiff = Date.now() - parseInt(lastVoteTime);
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                if (hoursDiff < 24) {
                    canVote = false;
                }
            }

            return `
                <div class="voting-school-card" style="animation-delay: ${index * 0.1}s;">
                    <div class="voting-school-header">
                        <div class="voting-school-info">
                            <h4>${school.name}</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${school.region} • <i class="fas fa-graduation-cap"></i> ${this.getLevelName(school.level)}</p>
                        </div>
                    </div>
                    <div class="voting-school-stats">
                        <div class="voting-stat">
                            <span class="stat-number">${school.totalStudents}</span>
                            <span class="stat-label">Élèves</span>
                        </div>
                        <div class="voting-stat">
                            <span class="stat-number">${school.successRate.toFixed(1)}%</span>
                            <span class="stat-label">Réussite</span>
                        </div>
                        <div class="voting-stat">
                            <span class="stat-number">${remainingVotes}</span>
                            <span class="stat-label">Votes restants</span>
                        </div>
                    </div>
                    <div class="voting-school-badges" id="badges-${schoolId}">
                        <!-- Badges will be loaded here -->
                    </div>
                    <button class="vote-button ${!canVote ? 'vote-limit' : ''}" 
                            onclick="window.communityVoting.voteForSchool('${schoolId}', '${school.name}', '${school.region}', '${school.level}')"
                            ${!canVote ? 'disabled' : ''}>
                        <i class="fas fa-vote-yea"></i>
                        ${this.getVoteButtonText(canVote, lastVoteTime, lastVoteSchool, schoolId, lastVoteDate, today)}
                    </button>
                </div>
            `;
        }).join('');

        votingSchoolsGrid.innerHTML = schoolsHTML;
        console.log('✅ Schools HTML rendered, length:', schoolsHTML.length);

        // Load badges for each school
        this.votingSchools.forEach(school => {
            this.loadSchoolBadges(this.generateSchoolId(school));
        });
    }

    // Vote for a school
    async voteForSchool(schoolId, schoolName, schoolRegion, schoolLevel) {
        console.log('🗳️ voteForSchool called with:', { schoolId, schoolName, schoolRegion, schoolLevel });
        try {
            const voteButton = event.target.closest('.vote-button');
            if (!voteButton) {
                console.error('❌ Vote button not found!');
                return;
            }
            console.log('✅ Vote button found, proceeding with vote...');

            // Check if user has already voted today
            const today = new Date().toDateString();
            const lastVoteDate = localStorage.getItem('lastVoteDate');
            const lastVoteSchool = localStorage.getItem('lastVoteSchool');
            const dailyVoteCount = parseInt(localStorage.getItem('dailyVoteCount') || '0');
            const currentDate = new Date().toDateString();
            
            console.log('🔍 Vote restrictions check:', {
                today,
                lastVoteDate,
                lastVoteSchool,
                dailyVoteCount,
                currentDate
            });

            // Reset daily count if it's a new day
            if (lastVoteDate !== currentDate) {
                localStorage.setItem('dailyVoteCount', '0');
                localStorage.setItem('lastVoteDate', currentDate);
            }

            // Check daily vote limit (1 vote per day)
            if (dailyVoteCount >= 1) {
                voteButton.innerHTML = '<i class="fas fa-clock"></i> Limite quotidienne atteinte';
                voteButton.classList.add('vote-limit');
                voteButton.disabled = true;
                
                setTimeout(() => {
                    voteButton.innerHTML = '<i class="fas fa-vote-yea"></i> Voter';
                    voteButton.classList.remove('vote-limit');
                    voteButton.disabled = false;
                }, 3000);
                return;
            }

            // Check if user voted for a different school today
            if (lastVoteSchool && lastVoteSchool !== schoolId && lastVoteDate === currentDate) {
                voteButton.innerHTML = '<i class="fas fa-ban"></i> Une seule école par jour';
                voteButton.classList.add('vote-limit');
                voteButton.disabled = true;
                
                setTimeout(() => {
                    voteButton.innerHTML = '<i class="fas fa-vote-yea"></i> Voter';
                    voteButton.classList.remove('vote-limit');
                    voteButton.disabled = false;
                }, 3000);
                return;
            }

            // Check 24h cooldown for same school
            const lastVoteTime = localStorage.getItem(`lastVoteTime_${schoolId}`);
            if (lastVoteTime) {
                const timeDiff = Date.now() - parseInt(lastVoteTime);
                const hoursDiff = timeDiff / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    const remainingHours = Math.ceil(24 - hoursDiff);
                    voteButton.innerHTML = `<i class="fas fa-clock"></i> Attendez ${remainingHours}h`;
                    voteButton.classList.add('vote-limit');
                    voteButton.disabled = true;
                    
                    setTimeout(() => {
                        voteButton.innerHTML = '<i class="fas fa-vote-yea"></i> Voter';
                        voteButton.classList.remove('vote-limit');
                        voteButton.disabled = false;
                    }, 3000);
                    return;
                }
            }

            // Show loading state
            voteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enregistrement...';
            voteButton.disabled = true;

            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schoolId: schoolId,
                    schoolName: schoolName,
                    schoolRegion: schoolRegion,
                    schoolLevel: schoolLevel,
                    userIP: await this.getUserIP(),
                    voteTime: Date.now()
                })
            });

            const data = await response.json();

            if (data.success) {
                // Update local storage
                localStorage.setItem('lastVoteDate', currentDate);
                localStorage.setItem('lastVoteSchool', schoolId);
                localStorage.setItem('dailyVoteCount', '1');
                localStorage.setItem(`lastVoteTime_${schoolId}`, Date.now().toString());
                
                // Update weekly vote count
                const currentWeeklyCount = parseInt(localStorage.getItem('weeklyVoteCount') || '0');
                const newWeeklyCount = currentWeeklyCount + 1;
                localStorage.setItem('weeklyVoteCount', newWeeklyCount.toString());
                console.log('📊 Updated weekly vote count:', currentWeeklyCount, '->', newWeeklyCount);
                
                // Update vote count
                this.voteCounts[schoolId] = (this.voteCounts[schoolId] || 0) + 1;
                
                // Show success animation
                voteButton.classList.add('vote-success');
                voteButton.innerHTML = '<i class="fas fa-check"></i> Vote enregistré !';
                
                // Refresh the voting schools to get updated vote counts from server
                setTimeout(() => {
                    console.log('🔄 Refreshing voting schools after vote...');
                    this.renderVotingSchools();
                    this.loadVotingStats();
                    this.loadLeaderboard();
                }, 1000);

            } else {
                // Show error message
                let errorMessage = 'Erreur';
                if (data.message) {
                    errorMessage = data.message;
                }
                
                voteButton.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorMessage}`;
                voteButton.classList.add('vote-limit');
                
                // Reset button after 3 seconds
                setTimeout(() => {
                    voteButton.innerHTML = '<i class="fas fa-vote-yea"></i> Voter';
                    voteButton.classList.remove('vote-limit');
                    voteButton.disabled = false;
                }, 3000);
            }

        } catch (error) {
            console.error('❌ Error voting for school:', error);
            const voteButton = event.target.closest('.vote-button');
            if (voteButton) {
                voteButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Erreur de connexion';
                voteButton.classList.add('vote-limit');
                
                setTimeout(() => {
                    voteButton.innerHTML = '<i class="fas fa-vote-yea"></i> Voter';
                    voteButton.classList.remove('vote-limit');
                    voteButton.disabled = false;
                }, 3000);
            }
        }
    }

    // Get user IP address
    async getUserIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.error('Error getting IP:', error);
            return 'unknown';
        }
    }

    // Get current week start (Monday) - client-side version
    getCurrentWeekStart() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday = 0, so -6 to get Monday
        const monday = new Date(now);
        monday.setDate(now.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        return monday.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }

    // Debug function to check vote counts
    debugVoteCounts() {
        const weeklyVoteCount = parseInt(localStorage.getItem('weeklyVoteCount') || '0');
        const dailyVoteCount = parseInt(localStorage.getItem('dailyVoteCount') || '0');
        const lastVoteDate = localStorage.getItem('lastVoteDate');
        const currentWeek = this.getCurrentWeekStart();
        const storedWeek = localStorage.getItem('currentWeek');
        
        console.log('🔍 DEBUG VOTE COUNTS:');
        console.log('  Weekly votes:', weeklyVoteCount);
        console.log('  Daily votes:', dailyVoteCount);
        console.log('  Last vote date:', lastVoteDate);
        console.log('  Current week:', currentWeek);
        console.log('  Stored week:', storedWeek);
        console.log('  Remaining votes:', Math.max(0, 7 - weeklyVoteCount));
        
        return {
            weeklyVoteCount,
            dailyVoteCount,
            lastVoteDate,
            currentWeek,
            storedWeek,
            remainingVotes: Math.max(0, 7 - weeklyVoteCount)
        };
    }

    // Reset vote counts for testing
    resetVoteCounts() {
        localStorage.removeItem('weeklyVoteCount');
        localStorage.removeItem('dailyVoteCount');
        localStorage.removeItem('lastVoteDate');
        localStorage.removeItem('lastVoteSchool');
        localStorage.removeItem('currentWeek');
        console.log('🔄 Vote counts reset for testing');
    }

    // Disable all vote buttons
    disableAllVoteButtons() {
        const allVoteButtons = document.querySelectorAll('.vote-button');
        allVoteButtons.forEach(button => {
            button.disabled = true;
            button.classList.add('vote-limit');
            button.innerHTML = '<i class="fas fa-clock"></i> Attendez 24h';
        });
    }

    // Check and update vote restrictions on page load
    checkVoteRestrictions() {
        const today = new Date().toDateString();
        const lastVoteDate = localStorage.getItem('lastVoteDate');
        const dailyVoteCount = parseInt(localStorage.getItem('dailyVoteCount') || '0');
        
        // Reset daily count if it's a new day
        if (lastVoteDate !== today) {
            localStorage.setItem('dailyVoteCount', '0');
            localStorage.setItem('lastVoteDate', today);
            return;
        }

        // If user has voted today, disable all buttons
        if (dailyVoteCount >= 1) {
            this.disableAllVoteButtons();
        }
    }

    // Get appropriate button text based on vote restrictions
    getVoteButtonText(canVote, lastVoteTime, lastVoteSchool, schoolId, lastVoteDate, today) {
        if (canVote) {
            return 'Voter';
        }
        
        // Check daily limit
        if (lastVoteDate === today) {
            return 'Limite quotidienne';
        }
        
        // Check 24h cooldown
        if (lastVoteTime) {
            const timeDiff = Date.now() - parseInt(lastVoteTime);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            if (hoursDiff < 24) {
                const remainingHours = Math.ceil(24 - hoursDiff);
                return `Attendez ${remainingHours}h`;
            }
        }
        
        return 'Limite atteinte';
    }

    // Load school badges
    async loadSchoolBadges(schoolId) {
        try {
            const response = await fetch(`/api/voting/school/${schoolId}/badges`);
            const data = await response.json();

            if (data.success && data.badges.length > 0) {
                const badgesContainer = document.getElementById(`badges-${schoolId}`);
                if (badgesContainer) {
                    const badgesHTML = data.badges.map(badge => 
                        `<span class="badge ${this.getBadgeClass(badge.badge_type)}">${badge.badge_name}</span>`
                    ).join('');
                    badgesContainer.innerHTML = badgesHTML;
                }
            }
        } catch (error) {
            console.error('❌ Error loading school badges:', error);
        }
    }

    // Get school badges for display
    getSchoolBadges(school) {
        // This would be populated from the school's badge data
        // For now, return empty array
        return [];
    }

    // Get badge CSS class
    getBadgeClass(badgeType) {
        const badgeClasses = {
            'top_performer_gold': 'badge-gold',
            'top_performer_silver': 'badge-silver',
            'top_performer_bronze': 'badge-bronze',
            'community_favorite': 'badge-community'
        };
        return badgeClasses[badgeType] || 'badge';
    }

    // Generate school ID
    generateSchoolId(school) {
        return `${school.name}_${school.region}_${school.level}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    // Get level name
    getLevelName(level) {
        const levelNames = {
            'primary': 'Primaire',
            'middle': 'Collège',
            'secondary': 'Lycée'
        };
        return levelNames[level] || level;
    }
}

// Initialize Community Voting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize community voting
    window.communityVoting = new CommunityVoting();
    
    // Wait for app to be ready, then override tab switching
    const setupVotingTab = () => {
        if (window.app) {
            console.log('✅ App is ready, setting up voting tab');
            // Override the existing switchLevel method to include voting
            const originalSwitchLevel = window.app.switchLevel;
            window.app.switchLevel = function(level) {
                console.log('🔄 Switching to level:', level);
                if (level === 'voting') {
                    console.log('🗳️ Switching to voting tab');
                    // Show voting container
                    document.getElementById('resultsContainer').style.display = 'none';
                    document.getElementById('votingContainer').style.display = 'block';
                    document.getElementById('pagination').style.display = 'none';
                    
                    // Update tab visual state
                    document.querySelectorAll('.nav-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    const votingTab = document.querySelector('[data-level="voting"]');
                    if (votingTab) {
                        votingTab.classList.add('active');
                    }
                    
                    // Initialize voting if not already done
                    if (window.communityVoting && !window.communityVoting.initialized) {
                        console.log('🚀 Initializing Community Voting');
                        window.communityVoting.init().catch(error => {
                            console.error('❌ Error initializing Community Voting:', error);
                            // Show a basic message if initialization fails
                            const votingContainer = document.getElementById('votingContainer');
                            if (votingContainer) {
                                votingContainer.innerHTML = `
                                    <div style="padding: 2rem; text-align: center;">
                                        <h2>Vote Communautaire</h2>
                                        <p>Erreur lors du chargement. Veuillez actualiser la page.</p>
                                        <button onclick="location.reload()">Actualiser</button>
                                    </div>
                                `;
                            }
                        });
                        window.communityVoting.initialized = true;
                    } else {
                        console.log('✅ Community Voting already initialized');
                    }
                } else {
                    // Show regular results
                    document.getElementById('resultsContainer').style.display = 'block';
                    document.getElementById('votingContainer').style.display = 'none';
                    document.getElementById('pagination').style.display = 'block';
                    
                    // Update tab visual state for regular tabs
                    document.querySelectorAll('.nav-tab').forEach(tab => {
                        tab.classList.remove('active');
                    });
                    const activeTab = document.querySelector(`[data-level="${level}"]`);
                    if (activeTab) {
                        activeTab.classList.add('active');
                    }
                    
                    // Call original switchLevel
                    if (originalSwitchLevel) {
                        originalSwitchLevel.call(this, level);
                    }
                }
            };
        } else {
            console.log('⏳ App not ready yet, retrying...');
            setTimeout(setupVotingTab, 50);
        }
    };
    
    // Try to setup immediately, or retry if app not ready
    setupVotingTab();
});