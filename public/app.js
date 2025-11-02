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
        this.currentLanguage = localStorage.getItem('preferredLanguage') || 'fr'; // Load from localStorage or default to French
        this.lastTabClick = 0; // Track last tab click time
        this.isVotingMode = false; // Track if we're in voting mode
        this.votingSchools = []; // Store voting schools
        this.votingRegions = []; // Store regions for voting
        this.selectedVotingRegion = ''; // Selected region for voting
        
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
                
                // School statistics
                candidates: "Candidats",
                admitted: "Admis",
                max_score: "Note Max",
                min_score: "Note Min",
                ranking_score: "Score de Classement",
                
                // Performance curve
                performance_statistics: "Statistiques de Performance",
                scale: "Échelle",
                
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
                about_criteria_success: "Taux de réussite (60%)",
                about_criteria_average: "Moyenne générale des scores (40%)",
                about_data_source: "Données fournies par le Ministère de l'Éducation de la République Islamique de Mauritanie.",
                about_developer: "Cette application est développée par Khalifa-IT services, pour plus d'info: 36090932",
                
                // Voting section
                nav_voting: "Voter pour ton école préférée",
                voting_title: "Voter pour ton école préférée",
                voting_subtitle: "Choisissez une région pour voir les écoles éligibles au vote",
                voting_select_region: "Sélectionnez une région:",
                voting_select_region_placeholder: "-- Choisir une région --",
                voting_message: "Veuillez sélectionner une région pour commencer à voter",
                voting_loading: "Chargement des écoles...",
                voting_vote_button: "VOTER",
                voting_voted: "Voté",
                voting_vote_count: "votes",
                voting_no_schools: "Aucune école trouvée dans cette région",
                voting_success: "Vote enregistré avec succès!",
                voting_error: "Erreur lors du vote",
                voting_limit_reached: "Vous avez atteint la limite de votes pour cette école cette semaine"
            },
            ar: {
                // App titles and navigation
                app_title: "تصنيف المدارس - موريتانيا",
                app_subtitle: "اعثروا على أفضل مدرسة لأطفالكم في الجمهورية الإسلامية الموريتانية",
                nav_primary: "المدارس الابتدائية",
                nav_middle: "المدارس الإعدادية",
                nav_secondary: "المدارس الثانوية",
                
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
                
                // School statistics
                candidates: "المترشحون",
                admitted: "الناجحون",
                max_score: "الدرجة العليا",
                min_score: "الدرجة الدنيا",
                ranking_score: "نقاط التصنيف",
                
                // Performance curve
                performance_statistics: "إحصائيات الأداء",
                scale: "المقياس",
                
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
                help_content: "1. اختر مستوى التعليم (ابتدائي، إعدادي، ثانوي)<br>2. فلتر حسب المنطقة إذا لزم الأمر<br>3. ابحث عن مدرسة محددة<br>4. انقر على مدرسة لرؤية تفاصيلها",
                
                // Additional keys for Arabic
                stat_schools: "المدارس",
                stat_students: "الطلاب", 
                stat_success_rate: "معدل النجاح",
                results_title: "تصنيف المدارس",
                about_description: "يسمح هذا التطبيق للعائلات الموريتانية بإيجاد أفضل المدارس لأطفالهم بناءً على النتائج الرسمية للامتحانات.",
                about_levels_title: "مستويات التعليم المشمولة:",
                about_primary: "المدارس الابتدائية",
                about_primary_desc: "نتائج شهادة الأهلية المدرسية",
                about_middle: "المدارس الإعدادية",
                about_middle_desc: "نتائج شهادة الدراسات الإعدادية",
                about_secondary: "المدارس الثانوية",
                about_secondary_desc: "نتائج البكالوريا",
                about_criteria_title: "معايير التصنيف:",
                about_criteria_success: "معدل النجاح (60%)",
                about_criteria_average: "متوسط النقاط العامة (40%)",
                about_data_source: "البيانات مقدمة من وزارة التربية في الجمهورية الإسلامية الموريتانية.",
                about_developer: "هذا التطبيق مطور من قبل Khalifa-IT services، للمزيد من المعلومات: 36090932",
                
                // Voting section (Arabic)
                nav_voting: "صوت لمدرستك المفضلة",
                voting_title: "صوت لمدرستك المفضلة",
                voting_subtitle: "اختر منطقة لرؤية المدارس المؤهلة للتصويت",
                voting_select_region: "اختر منطقة:",
                voting_select_region_placeholder: "-- اختر منطقة --",
                voting_message: "يرجى اختيار منطقة لبدء التصويت",
                voting_loading: "تحميل المدارس...",
                voting_vote_button: "صوت",
                voting_voted: "تم التصويت",
                voting_vote_count: "أصوات",
                voting_no_schools: "لم يتم العثور على مدارس في هذه المنطقة",
                voting_success: "تم تسجيل التصويت بنجاح!",
                voting_error: "خطأ في التصويت",
                voting_limit_reached: "لقد وصلت إلى الحد الأقصى من الأصوات لهذه المدرسة هذا الأسبوع"
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
                if (level === 'voting') {
                    this.switchToVoting();
                } else if (level && level !== this.currentLevel) {
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

        // Language toggle
        const languageToggle = document.getElementById('languageToggle');
        if (languageToggle) {
            languageToggle.addEventListener('click', () => {
                this.toggleLanguage();
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
        
        // Hide voting interface if it's showing
        if (this.isVotingMode) {
            const votingContainer = document.getElementById('votingContainer');
            const resultsContainer = document.getElementById('resultsContainer');
            const controls = document.querySelector('.controls');
            const statsContainer = document.getElementById('statsContainer');
            
            if (votingContainer) votingContainer.style.display = 'none';
            if (resultsContainer) resultsContainer.style.display = 'block';
            if (controls) controls.style.display = 'flex';
            if (statsContainer) statsContainer.style.display = 'flex';
            
            this.isVotingMode = false;
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

    async switchToVoting() {
        console.log('🗳️ Switching to voting mode');
        
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector('[data-level="voting"]').classList.add('active');
        
        // Hide regular results, show voting interface
        const resultsContainer = document.getElementById('resultsContainer');
        const votingContainer = document.getElementById('votingContainer');
        const controls = document.querySelector('.controls');
        const statsContainer = document.getElementById('statsContainer');
        
        if (resultsContainer) resultsContainer.style.display = 'none';
        if (controls) controls.style.display = 'none';
        if (statsContainer) statsContainer.style.display = 'none';
        if (votingContainer) votingContainer.style.display = 'block';
        
        this.isVotingMode = true;
        
        // Load voting regions (secondary level only)
        await this.loadVotingRegions();
        
        // Setup voting region filter event listener
        const votingRegionFilter = document.getElementById('votingRegionFilter');
        if (votingRegionFilter && !votingRegionFilter.hasAttribute('data-listener-attached')) {
            votingRegionFilter.setAttribute('data-listener-attached', 'true');
            votingRegionFilter.addEventListener('change', (e) => {
                this.selectedVotingRegion = e.target.value;
                if (this.selectedVotingRegion) {
                    this.loadVotingSchools(this.selectedVotingRegion);
                } else {
                    this.clearVotingSchools();
                }
            });
        }
    }

    async loadVotingRegions() {
        try {
            console.log('🌍 Loading regions for voting (secondary level only)');
            const response = await fetch('/api/regions/secondary');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.regions) {
                this.votingRegions = data.regions;
                console.log('✅ Voting regions loaded:', this.votingRegions.length);
                
                this.updateVotingRegionFilter();
            } else {
                console.error('❌ Failed to load voting regions:', data);
            }
        } catch (error) {
            console.error('❌ Error loading voting regions:', error);
        }
    }

    updateVotingRegionFilter() {
        const votingRegionFilter = document.getElementById('votingRegionFilter');
        if (!votingRegionFilter) return;

        votingRegionFilter.innerHTML = `
            <option value="">${this.translate('voting_select_region_placeholder')}</option>
            ${this.votingRegions.map(region => 
                `<option value="${region}">${region}</option>`
            ).join('')}
        `;
    }

    async loadVotingSchools(region) {
        try {
            console.log(`🗳️ Loading voting schools for region: ${region}`);
            
            const votingMessage = document.getElementById('votingMessage');
            const votingGrid = document.getElementById('votingSchoolsGrid');
            
            if (votingMessage) {
                votingMessage.style.display = 'flex';
                votingMessage.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${this.translate('voting_loading')}</span>
                `;
            }
            
            if (votingGrid) {
                votingGrid.innerHTML = '';
            }
            
            // Fetch schools for secondary level (BAC) in the selected region
            const response = await fetch(`/api/schools/secondary?region=${encodeURIComponent(region)}&limit=1000`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.schools) {
                // Limit to 503 schools as specified
                this.votingSchools = data.schools.slice(0, 503);
                console.log(`✅ Voting schools loaded: ${this.votingSchools.length}`);
                
                // Get vote counts for these schools
                await this.loadVoteCounts();
                
                this.displayVotingSchools();
            } else {
                console.error('❌ Failed to load voting schools:', data);
                this.showVotingError();
            }
        } catch (error) {
            console.error('❌ Error loading voting schools:', error);
            this.showVotingError();
        }
    }

    async loadVoteCounts() {
        try {
            // Fetch vote counts for all voting schools
            const schoolIds = this.votingSchools.map(s => s.id);
            const response = await fetch('/api/voting/counts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ schoolIds })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.counts) {
                    // Add vote counts to schools
                    this.votingSchools.forEach(school => {
                        school.voteCount = data.counts[school.id] || 0;
                    });
                }
            }
        } catch (error) {
            console.error('❌ Error loading vote counts:', error);
            // Continue without vote counts
        }
    }

    displayVotingSchools() {
        const votingMessage = document.getElementById('votingMessage');
        const votingGrid = document.getElementById('votingSchoolsGrid');
        
        if (!votingGrid) return;
        
        if (this.votingSchools.length === 0) {
            if (votingMessage) {
                votingMessage.style.display = 'flex';
                votingMessage.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <span>${this.translate('voting_no_schools')}</span>
                `;
            }
            votingGrid.innerHTML = '';
            return;
        }
        
        if (votingMessage) {
            votingMessage.style.display = 'none';
        }
        
        votingGrid.innerHTML = this.votingSchools.map((school, index) => {
            // Escape quotes and special characters for safe HTML/JS
            const escapeHtml = (str) => {
                if (!str) return '';
                return str
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            };
            
            const schoolId = escapeHtml(school.id);
            const schoolName = escapeHtml(school.name);
            const schoolRegion = escapeHtml(school.region);
            
            return `
            <div class="voting-school-card">
                <div class="voting-school-rank">#${school.rank}</div>
                <div class="voting-school-info">
                    <h3 class="voting-school-name">${school.name}</h3>
                    <div class="voting-school-details">
                        <span class="voting-school-region"><i class="fas fa-map-marker-alt"></i> ${school.region}</span>
                        <span class="voting-school-stats">
                            <span class="voting-success-rate"><i class="fas fa-trophy"></i> ${school.successRate.toFixed(1)}%</span>
                            <span class="voting-students"><i class="fas fa-users"></i> ${school.totalStudents}</span>
                        </span>
                    </div>
                    ${school.voteCount !== undefined ? `
                        <div class="voting-vote-count">
                            <i class="fas fa-heart"></i> ${school.voteCount} ${this.translate('voting_vote_count')}
                        </div>
                    ` : ''}
                </div>
                <button class="voting-vote-btn" onclick="app.voteForSchool('${schoolId}', '${schoolName}', '${schoolRegion}')" data-school-id="${schoolId}">
                    <i class="fas fa-vote-yea"></i> ${this.translate('voting_vote_button')}
                </button>
            </div>
        `;
        }).join('');
    }

    clearVotingSchools() {
        const votingMessage = document.getElementById('votingMessage');
        const votingGrid = document.getElementById('votingSchoolsGrid');
        
        if (votingMessage) {
            votingMessage.style.display = 'flex';
            votingMessage.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>${this.translate('voting_message')}</span>
            `;
        }
        
        if (votingGrid) {
            votingGrid.innerHTML = '';
        }
        
        this.votingSchools = [];
    }

    showVotingError() {
        const votingMessage = document.getElementById('votingMessage');
        if (votingMessage) {
            votingMessage.style.display = 'flex';
            votingMessage.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <span>${this.translate('voting_error')}</span>
            `;
        }
    }

    async voteForSchool(schoolId, schoolName, schoolRegion) {
        try {
            console.log(`🗳️ Voting for school: ${schoolId}`);
            
            const voteButton = document.querySelector(`[data-school-id="${schoolId}"]`);
            if (voteButton) {
                voteButton.disabled = true;
                voteButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
            }
            
            const response = await fetch('/api/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schoolId: schoolId,
                    schoolName: schoolName,
                    schoolRegion: schoolRegion,
                    schoolLevel: 'secondary'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Show success message
                if (voteButton) {
                    voteButton.classList.add('voted');
                    voteButton.innerHTML = `<i class="fas fa-check"></i> ${this.translate('voting_voted')}`;
                }
                
                // Show success notification
                this.showNotification(this.translate('voting_success'), 'success');
                
                // Refresh vote counts
                await this.loadVoteCounts();
                this.displayVotingSchools();
            } else {
                // Show error message
                if (voteButton) {
                    voteButton.disabled = false;
                    voteButton.innerHTML = `<i class="fas fa-vote-yea"></i> ${this.translate('voting_vote_button')}`;
                }
                
                const errorMessage = data.message || this.translate('voting_error');
                this.showNotification(errorMessage, 'error');
            }
        } catch (error) {
            console.error('❌ Error voting for school:', error);
            
            const voteButton = document.querySelector(`[data-school-id="${schoolId}"]`);
            if (voteButton) {
                voteButton.disabled = false;
                voteButton.innerHTML = `<i class="fas fa-vote-yea"></i> ${this.translate('voting_vote_button')}`;
            }
            
            this.showNotification(this.translate('voting_error'), 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
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
            <div class="school-card-professional" data-school-id="${school.id}">
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
                                    <div class="stat-label-professional">${this.translate('candidates')}</div>
                                </div>
                                
                                <div class="stat-card-professional">
                                    <div class="stat-number-professional">${school.passedStudents || 0}</div>
                                    <div class="stat-label-professional">${this.translate('admitted')}</div>
                                </div>
                                
                                <div class="stat-card-professional success-highlight">
                                    <div class="stat-number-professional">${school.successRate || school.score || 0}%</div>
                                    <div class="stat-label-professional">${this.translate('success_rate')}</div>
                                </div>
                                
                                <div class="stat-card-professional">
                                    <div class="stat-number-professional">${school.maxScore || 0}</div>
                                    <div class="stat-label-professional">${this.translate('max_score')}</div>
                                </div>
                                
                                <div class="stat-card-professional">
                                    <div class="stat-number-professional">${school.minScore || 0}</div>
                                    <div class="stat-label-professional">${this.translate('min_score')}</div>
                                </div>
                            </div>
            </div>
        `).join('');
        
        // Add event listeners to school cards
        this.addSchoolCardEventListeners();
    }

    addSchoolCardEventListeners() {
        console.log('🔧 Adding event listeners to school cards...');
        const schoolCards = document.querySelectorAll('.school-card-professional');
        console.log(`🔧 Found ${schoolCards.length} school cards`);
        
        schoolCards.forEach((card, index) => {
            const schoolId = card.getAttribute('data-school-id');
            console.log(`🔧 Adding listener to card ${index + 1}: ${schoolId}`);
            
            card.addEventListener('click', (event) => {
                console.log('🎯 School card clicked!', schoolId);
                event.preventDefault();
                event.stopPropagation();
                this.showSchoolDetails(schoolId);
            });
            
            // Add cursor pointer style
            card.style.cursor = 'pointer';
        });
        
        console.log('✅ Event listeners added successfully');
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
                <button class="pagination-btn" data-action="prev" data-page="${this.currentPage - 1}">
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
                        data-action="page" data-page="${i}">
                    ${i}
                </button>
            `;
        }
        
        // Next button
        if (this.currentPage < totalPages) {
        paginationHTML += `
                <button class="pagination-btn" data-action="next" data-page="${this.currentPage + 1}">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        }
        
        pagination.innerHTML = paginationHTML;
        
        // Add event listeners to pagination buttons
        this.addPaginationEventListeners();
    }

    addPaginationEventListeners() {
        console.log('🔧 Adding event listeners to pagination buttons...');
        const paginationButtons = document.querySelectorAll('.pagination-btn');
        console.log(`🔧 Found ${paginationButtons.length} pagination buttons`);
        
        paginationButtons.forEach((button, index) => {
            const action = button.getAttribute('data-action');
            const page = button.getAttribute('data-page');
            console.log(`🔧 Adding listener to button ${index + 1}: ${action} page ${page}`);
            
            button.addEventListener('click', (event) => {
                console.log('🎯 Pagination button clicked!', action, page);
                event.preventDefault();
                event.stopPropagation();
                this.goToPage(parseInt(page));
            });
        });
        
        console.log('✅ Pagination event listeners added successfully');
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
                    <button class="btn-primary" data-action="refresh">
                        <i class="fas fa-refresh"></i>
                        ${this.translate('try_again')}
                </button>
            </div>
        `;
        
        // Add event listener to refresh button
        const refreshButton = schoolsGrid.querySelector('[data-action="refresh"]');
        if (refreshButton) {
            refreshButton.addEventListener('click', (event) => {
                console.log('🎯 Refresh button clicked!');
                event.preventDefault();
                event.stopPropagation();
                this.loadSchools();
            });
        }
    }
    }

    async showSchoolDetails(schoolId) {
        console.log('🔍 showSchoolDetails called with ID:', schoolId);
        console.log('🔍 Current app instance:', this);
        console.log('🔍 Window.app:', window.app);
        
        // First, let's try to show a simple modal to test if the modal system works
        const modal = document.getElementById('schoolModal');
        const modalTitle = document.getElementById('modalTitle');
            const modalBody = document.getElementById('modalBody');

        console.log('🔍 Modal elements:', { modal: !!modal, modalTitle: !!modalTitle, modalBody: !!modalBody });
        
        if (!modal) {
            console.error('❌ Modal not found!');
            alert('Modal not found!');
            return;
        }
        
        if (!modalTitle) {
            console.error('❌ Modal title not found!');
            alert('Modal title not found!');
            return;
        }
        
        if (!modalBody) {
            console.error('❌ Modal body not found!');
            alert('Modal body not found!');
            return;
        }

        // Show modal immediately with a simple test
        console.log('✅ All modal elements found, showing modal...');
        modal.style.display = 'block';
        modalTitle.textContent = 'Test Modal';
        modalBody.innerHTML = '<p>Modal is working! School ID: ' + schoolId + '</p>';
        console.log('✅ Modal should now be visible');

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
                                        
                                        <div class="performance-section">
                                            <h3>${this.translate('performance_statistics')}</h3>
                                            <div class="performance-chart-container">
                                                <div class="chart-info">
                                                    <span class="chart-scale">${this.translate('scale')}: ${curveData.scale}</span>
                                                </div>
                                                <div class="performance-chart" id="performanceChart">
                                                    ${this.generateInteractivePerformanceChart(curveData, school.level)}
                                                </div>
                                            </div>
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
                                            <span class="rank">#${school.rank || 'N/A'}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="performance-section">
                                        <h3>Courbe de Performance</h3>
                                        <div class="performance-chart-container">
                                            <div class="loading-chart">
                                                <div class="spinner"></div>
                                                <p>Chargement de la courbe de performance...</p>
                                            </div>
                                        </div>
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

        // Create a beautiful 6-parameter chart with icons and colors
        const chartWidth = 700;
        const chartHeight = 350;
        const padding = 50;
        const barWidth = 60;
        const barSpacing = 20;
        
        // Define the 6 key statistics with colors and icons
        const statistics = [
            { 
                label: this.translate('candidates'), 
                color: '#3498db', 
                icon: '👥',
                value: curveData.totalCandidates || 0
            },
            { 
                label: this.translate('admitted'), 
                color: '#2ecc71', 
                icon: '✅',
                value: curveData.admittedStudents || 0
            },
            { 
                label: this.translate('success_rate'), 
                color: '#e74c3c', 
                icon: '📊',
                value: curveData.successRate || 0
            },
            { 
                label: this.translate('max_score'), 
                color: '#f39c12', 
                icon: '🏆',
                value: curveData.maxScore || 0
            },
            { 
                label: this.translate('min_score'), 
                color: '#9b59b6', 
                icon: '📉',
                value: curveData.minScore || 0
            },
            { 
                label: this.translate('ranking_score'), 
                color: '#e67e22', 
                icon: '🎯',
                value: curveData.rankingScore || 0
            }
        ];
        
        // Calculate max value for scaling
        const maxValue = Math.max(...statistics.map(stat => stat.value));
        
        let svgContent = `
            <svg class="performance-curve-svg" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${chartWidth} ${chartHeight}">
                <defs>
                    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.3"/>
                    </filter>
                </defs>
        `;
        
        // Add background
        svgContent += `<rect width="${chartWidth}" height="${chartHeight}" fill="#f8f9fa" rx="10"/>`;
        
        // Remove title from inside chart - it's now in the section header
        
        // Calculate total width needed for all bars
        const totalBarsWidth = statistics.length * barWidth + (statistics.length - 1) * barSpacing;
        const startX = (chartWidth - totalBarsWidth) / 2; // Center the bars
        
        // Add bars for each statistic
        statistics.forEach((stat, index) => {
            const x = startX + index * (barWidth + barSpacing);
            const barHeight = (stat.value / maxValue) * (chartHeight - padding * 2 - 60);
            const y = chartHeight - padding - 40 - barHeight;
            
            // Create gradient for each bar
            const gradientId = `gradient-${index}`;
            svgContent += `
                <defs>
                    <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${stat.color};stop-opacity:0.9" />
                        <stop offset="100%" style="stop-color:${stat.color};stop-opacity:0.6" />
                    </linearGradient>
                </defs>
            `;
            
            // Add bar
            svgContent += `
                <g class="chart-bar-group" data-label="${stat.label}" data-value="${stat.value}">
                    <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                          fill="url(#${gradientId})" 
                          class="chart-bar-interactive"
                          rx="8"
                          filter="url(#shadow)"/>
                    
                    <!-- Icon -->
                    <text x="${x + barWidth/2}" y="${y - 10}" 
                          text-anchor="middle" font-size="24" class="bar-icon">${stat.icon}</text>
                    
                    <!-- Value -->
                    <text x="${x + barWidth/2}" y="${y - 35}" 
                          text-anchor="middle" font-size="14" font-weight="bold" fill="#2c3e50" class="bar-value">${stat.value}</text>
                    
                    <!-- Label -->
                    <text x="${x + barWidth/2}" y="${chartHeight - padding - 10}" 
                          text-anchor="middle" font-size="12" fill="#7f8c8d" class="bar-label">${stat.label}</text>
                </g>
            `;
        });
        
        // Add decorative elements
        svgContent += `
            <circle cx="50" cy="50" r="3" fill="#3498db" opacity="0.6"/>
            <circle cx="450" cy="80" r="2" fill="#e74c3c" opacity="0.6"/>
            <circle cx="80" cy="250" r="2" fill="#2ecc71" opacity="0.6"/>
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
        
        // Update language button text
        const currentLangSpan = document.getElementById('currentLang');
        if (currentLangSpan) {
            currentLangSpan.textContent = this.currentLanguage.toUpperCase();
        }
        
        // Update HTML direction and language
        const htmlRoot = document.getElementById('htmlRoot');
        if (htmlRoot) {
            htmlRoot.setAttribute('lang', this.currentLanguage);
            htmlRoot.setAttribute('dir', this.currentLanguage === 'ar' ? 'rtl' : 'ltr');
        }
    }

    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'fr' ? 'ar' : 'fr';
        localStorage.setItem('preferredLanguage', this.currentLanguage);
        this.updateLanguage();
        console.log(`🌐 Language switched to: ${this.currentLanguage}`);
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