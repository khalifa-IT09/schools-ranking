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
                footer_copyright: "© 2025 Classement des Écoles - République Islamique de Mauritanie 🇲🇷",
                footer_data_source: "Données officielles du Ministère de l'Éducation Nationale",
                footer_about: "À propos",
                footer_help: "Aide",
                
                // About modal
                about_title: "À propos de cette application",
                about_content: "Cette application utilise les données officielles du Ministère de l'Éducation Nationale de Mauritanie pour classer les écoles selon leur performance académique.",
                
                // Help modal
                help_title: "Comment utiliser cette application",
                help_content: "1. Sélectionnez le niveau d'éducation (Primaire, Collège, Lycée)<br>2. Filtrez par région si nécessaire<br>3. Recherchez une école spécifique<br>4. Cliquez sur une école pour voir ses détails"
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
                footer_copyright: "© 2025 تصنيف المدارس - الجمهورية الإسلامية الموريتانية 🇲🇷",
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
            searchInput.addEventListener('input', (e) => {
                this.currentSearch = e.target.value;
                this.debounceSearch();
            });
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
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
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

            if (data.success && data.regions) {
                this.regions = data.regions;
                console.log('✅ Regions loaded:', this.regions.length);
                this.updateRegionFilter();
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

            if (data.success) {
                this.schools = data.schools || [];
                this.totalSchools = data.total || 0;
                console.log('✅ Data loaded successfully:', this.schools.length, 'schools');
                this.hideLoading();
                this.renderSchools();
                this.updateStats();
                this.updatePagination();
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
            <div class="school-card" onclick="window.app.showSchoolDetails('${school.id}')">
                <div class="school-rank">#${(this.currentPage - 1) * this.pageSize + index + 1}</div>
                <div class="school-info">
                    <h3 class="school-name">${school.name}</h3>
                    <div class="school-details">
                        <div class="school-region">
                            <i class="fas fa-map-marker-alt"></i>
                            ${school.region}
                        </div>
                        <div class="school-stats">
                            <div class="stat">
                                <i class="fas fa-users"></i>
                                <span>${school.totalStudents || 0} ${this.translate('students')}</span>
                            </div>
                            <div class="stat">
                                <i class="fas fa-chart-line"></i>
                                <span>${school.successRate || school.score || 0}% ${this.translate('success_rate')}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="school-score">
                    <div class="score-value">${school.score || 0}</div>
                    <div class="score-label">${this.translate('success_rate')}</div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const totalSchoolsEl = document.getElementById('totalSchools');
        const totalStudentsEl = document.getElementById('totalStudents');
        const successRateEl = document.getElementById('successRate');

        if (totalSchoolsEl) totalSchoolsEl.textContent = this.totalSchools.toLocaleString();
        if (totalStudentsEl) {
            const totalStudents = this.schools.reduce((sum, school) => sum + (school.totalStudents || 0), 0);
            totalStudentsEl.textContent = totalStudents.toLocaleString();
        }
        if (successRateEl) {
            const averageScore = this.schools.length > 0 ? 
                this.schools.reduce((sum, school) => sum + (school.score || 0), 0) / this.schools.length : 0;
            successRateEl.textContent = Math.round(averageScore * 100) / 100 + '%';
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
        const school = this.schools.find(s => s.id === schoolId);
        if (!school) return;

        const modal = document.getElementById('schoolModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = this.translate('modal_school_details');
            modalBody.innerHTML = `
                <div class="school-detail">
                    <h3>${school.name}</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <i class="fas fa-map-marker-alt"></i>
                            <span class="label">${this.translate('region')}:</span>
                            <span class="value">${school.region}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-graduation-cap"></i>
                            <span class="label">${this.translate('level')}:</span>
                            <span class="value">${school.level}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-users"></i>
                            <span class="label">${this.translate('students')}:</span>
                            <span class="value">${school.totalStudents || 0}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-chart-line"></i>
                            <span class="label">${this.translate('success_rate')}:</span>
                            <span class="value">${school.score || 0}%</span>
                        </div>
                    </div>
                </div>
            `;
            modal.style.display = 'block';
        }
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