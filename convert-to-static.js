const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

console.log('🔄 Converting to static application for Netlify...');

// Fonction pour traiter les fichiers CSV
function processCSVFile(filePath, level) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log(`Processed ${results.length} records for ${level} level`);
                resolve(results);
            })
            .on('error', reject);
    });
}

// Fonction pour traiter les fichiers Excel
function processExcelFile(filePath, level) {
    return new Promise((resolve, reject) => {
        try {
            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
            console.log(`Processed ${data.length} records for ${level} level`);
            resolve(data);
        } catch (error) {
            reject(error);
        }
    });
}

// Fonctions de traitement des données (copiées de server.js)
function getSchoolName(record, level) {
    const possibleNames = [
        'Ecole_AR', 'Ecole', 'Etablissement_FR', 'Etablissement_AR',
        'School', 'Nom_Ecole', 'Ecole_Name', 'Institution'
    ];
    
    for (const field of possibleNames) {
        if (record[field]) {
            return record[field].toString().trim();
        }
    }
    return 'École inconnue';
}

function getRegion(record, level) {
    const possibleRegions = [
        'WILAYA_AR', 'WILAYA', 'Wilaya_FR', 'Wilaya_AR',
        'Region', 'Région', 'Zone', 'Area'
    ];
    
    for (const field of possibleRegions) {
        if (record[field]) {
            return record[field].toString().trim();
        }
    }
    return 'Région non spécifiée';
}

function getScore(record, level) {
    // For primary level, check TOTAL field specifically first
    if (level === 'primary' && record['TOTAL']) {
        let scoreStr = record['TOTAL'].toString().replace(',', '.');
        const score = parseFloat(scoreStr);
        if (!isNaN(score) && score >= 0 && score <= 200) {
            return score;
        }
    }
    
    const scoreFields = [
        'Moy Bac', 'Moyenne', 'Score', 'Note', 'Moyenne Générale', 'Moyenne_Bac',
        'Moyenne_Generale', 'Note_Finale', 'Score_Final', 'Total', 'Points',
        'Moyenne_Examen', 'Note_Examen', 'Moyenne_Bepc', 'Moyenne_BEPC'
    ];

    for (const field of scoreFields) {
        if (record[field]) {
            let scoreStr = record[field].toString().replace(',', '.');
            const score = parseFloat(scoreStr);

            if (level === 'primary') {
                if (!isNaN(score) && score >= 0 && score <= 200) {
                    return score;
                }
            } else {
                if (!isNaN(score) && score >= 0 && score <= 20) {
                    return score;
                }
            }
        }
    }
    return 0;
}

function getPassedStatus(record, level) {
    const decisionFields = [
        'Decision', 'Résultat', 'Statut', 'Status', 'Resultat', 'Decision_Finale',
        'Statut_Final', 'Admission', 'Admis', 'Result'
    ];

    for (const field of decisionFields) {
        if (record[field]) {
            const decision = record[field].toString().toLowerCase();
            return decision.includes('admis') ||
                   decision.includes('réussi') ||
                   decision.includes('passé') ||
                   decision.includes('reussi') ||
                   decision.includes('passe') ||
                   decision.includes('admission') ||
                   decision.includes('succès') ||
                   decision.includes('succes');
        }
    }

    const score = getScore(record, level);
    if (level === 'primary') {
        return score >= 90;
    } else {
        return score >= 10;
    }
}

function calculateSchoolRanking(data, level) {
    console.log(`Calculating rankings for ${level} level with ${data.length} records`);
    
    const schoolStats = {};
    let validSchools = 0;
    let processedCount = 0;

    data.forEach((record, index) => {
        processedCount++;
        if (processedCount % 10000 === 0) {
            console.log(`Processed ${processedCount}/${data.length} records for ${level}`);
        }

        const schoolName = getSchoolName(record, level);
        const region = getRegion(record, level);
        const score = getScore(record, level);
        const passed = getPassedStatus(record, level);

        if (!schoolStats[schoolName]) {
            schoolStats[schoolName] = {
                name: schoolName,
                totalStudents: 0,
                passedStudents: 0,
                averageScore: 0,
                scores: [],
                region: region,
                level: level,
                maxScore: level === 'primary' ? 0 : 0,
                minScore: level === 'primary' ? 200 : 20
            };
            validSchools++;
        }

        schoolStats[schoolName].totalStudents++;
        if (passed) {
            schoolStats[schoolName].passedStudents++;
        }

        if (score > 0) {
            schoolStats[schoolName].scores.push(score);
            if (level === 'secondary' || level === 'middle') {
                if (score > schoolStats[schoolName].maxScore) {
                    schoolStats[schoolName].maxScore = score;
                }
                if (score < schoolStats[schoolName].minScore) {
                    schoolStats[schoolName].minScore = score;
                }
            }
        }
    });

    console.log(`Found ${validSchools} unique schools for ${level} level`);

    // Calculate averages and rankings
    const rankings = [];
    Object.values(schoolStats).forEach(school => {
        if (school.scores.length > 0) {
            school.averageScore = school.scores.reduce((sum, score) => sum + score, 0) / school.scores.length;
        }

        if (level === 'secondary' || level === 'middle') {
            if (school.scores.length === 0) {
                school.maxScore = 0;
                school.minScore = 0;
            } else if (school.scores.length === 1) {
                school.maxScore = school.scores[0];
                school.minScore = school.scores[0];
            }
        }

        if (level === 'primary') {
            if (school.scores.length === 0) {
                school.maxScore = 0;
                school.minScore = 0;
            } else if (school.scores.length === 1) {
                school.maxScore = school.scores[0];
                school.minScore = school.scores[0];
            } else {
                school.maxScore = Math.max(...school.scores);
                school.minScore = Math.min(...school.scores);
            }
        }

        school.successRate = school.totalStudents > 0 ? (school.passedStudents / school.totalStudents) * 100 : 0;
        
        // Calculate ranking score
        const successRateWeight = 0.4;
        const averageScoreWeight = 0.6;
        
        let normalizedAverageScore;
        if (level === 'primary') {
            normalizedAverageScore = (school.averageScore / 200) * 100; // Normalize to 0-100
        } else {
            normalizedAverageScore = (school.averageScore / 20) * 100; // Normalize to 0-100
        }
        
        school.rankingScore = (school.successRate * successRateWeight) + (normalizedAverageScore * averageScoreWeight);
        
        if (school.totalStudents >= 5) {
            rankings.push(school);
        }
    });

    // Sort by ranking score
    rankings.sort((a, b) => b.rankingScore - a.rankingScore);
    
    // Assign ranks
    rankings.forEach((school, index) => {
        school.rank = index + 1;
    });

    console.log(`Generated ${rankings.length} ranked schools for ${level} level`);
    if (rankings.length > 0) {
        console.log(`Top school: ${rankings[0].name} (${rankings[0].successRate.toFixed(1)}% success rate)`);
    }

    return rankings;
}

// Fonction principale
async function convertToStatic() {
    try {
        console.log('📊 Loading educational data...');
        
        // Charger les données
        const primaryData = await processCSVFile('RESU_CAS_2025.csv', 'primary');
        const middleData = await processCSVFile('RESU_BREVET_2025.csv', 'middle');
        const secondaryData = await processCSVFile('RESU_BAC_2025.csv', 'secondary');
        
        // Calculer les classements
        const primaryRankings = calculateSchoolRanking(primaryData, 'primary');
        const middleRankings = calculateSchoolRanking(middleData, 'middle');
        const secondaryRankings = calculateSchoolRanking(secondaryData, 'secondary');
        
        // Créer les données statiques
        const staticData = {
            primary: {
                schools: primaryRankings,
                stats: {
                    totalSchools: primaryRankings.length,
                    totalStudents: primaryRankings.reduce((sum, school) => sum + school.totalStudents, 0),
                    totalPassed: primaryRankings.reduce((sum, school) => sum + school.passedStudents, 0),
                    averageSuccessRate: primaryRankings.reduce((sum, school) => sum + school.successRate, 0) / primaryRankings.length,
                    averageScore: primaryRankings.reduce((sum, school) => sum + school.averageScore, 0) / primaryRankings.length
                }
            },
            middle: {
                schools: middleRankings,
                stats: {
                    totalSchools: middleRankings.length,
                    totalStudents: middleRankings.reduce((sum, school) => sum + school.totalStudents, 0),
                    totalPassed: middleRankings.reduce((sum, school) => sum + school.passedStudents, 0),
                    averageSuccessRate: middleRankings.reduce((sum, school) => sum + school.successRate, 0) / middleRankings.length,
                    averageScore: middleRankings.reduce((sum, school) => sum + school.averageScore, 0) / middleRankings.length
                }
            },
            secondary: {
                schools: secondaryRankings,
                stats: {
                    totalSchools: secondaryRankings.length,
                    totalStudents: secondaryRankings.reduce((sum, school) => sum + school.totalStudents, 0),
                    totalPassed: secondaryRankings.reduce((sum, school) => sum + school.passedStudents, 0),
                    averageSuccessRate: secondaryRankings.reduce((sum, school) => sum + school.successRate, 0) / secondaryRankings.length,
                    averageScore: secondaryRankings.reduce((sum, school) => sum + school.averageScore, 0) / secondaryRankings.length
                }
            }
        };
        
        // Sauvegarder les données statiques
        fs.writeFileSync('public/data.json', JSON.stringify(staticData, null, 2));
        console.log('✅ Static data generated: public/data.json');
        
        // Créer un nouveau app.js qui utilise les données statiques
        const staticAppJS = `// Static version for Netlify deployment
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
        document.querySelector(\`[data-level="\${level}"]\`).classList.add('active');
        
        // Update title
        const titles = {
            primary: 'Écoles Primaires (CAS)',
            middle: 'Collèges (Brevet)',
            secondary: 'Lycées (Baccalauréat)'
        };
        document.getElementById('resultsTitle').textContent = \`Classement des \${titles[level]}\`;
        
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
            resultsCount.textContent = \`\${schools.length} écoles trouvées\`;
        }
    }
    
    createSchoolCard(school) {
        const successRateClass = this.getSuccessRateClass(school.successRate);
        
        let statsHTML = '';
        if (school.maxScore !== undefined && school.minScore !== undefined) {
            statsHTML = \`
                <div class="school-stats secondary-stats">
                    <div class="school-stat">
                        <div class="school-stat-value">\${school.totalStudents}</div>
                        <div class="school-stat-label">Candidats</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">\${school.passedStudents}</div>
                        <div class="school-stat-label">Admis</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value \${successRateClass}">\${school.successRate.toFixed(1)}%</div>
                        <div class="school-stat-label">Taux de Réussite</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">\${school.maxScore.toFixed(2)}</div>
                        <div class="school-stat-label">Moyenne Max</div>
                    </div>
                    <div class="school-stat">
                        <div class="school-stat-value">\${school.minScore.toFixed(2)}</div>
                        <div class="school-stat-label">Moyenne Min</div>
                    </div>
                </div>
            \`;
        }
        
        return \`
            <div class="school-card" onclick="app.showSchoolDetails('\${school.name}')">
                <div class="school-header">
                    <div class="school-rank">#\${school.rank}</div>
                    <div class="school-info">
                        <h3 class="school-name">\${school.name}</h3>
                        <p class="school-region">\${school.region}</p>
                    </div>
                </div>
                \${statsHTML}
            </div>
        \`;
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
            
            modalBody.innerHTML = \`
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Informations générales</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Région:</span>
                            <span class="detail-value">\${school.region}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Classement national:</span>
                            <span class="detail-value">#\${school.rank}</span>
                        </div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-chart-bar"></i> Statistiques de performance (\${levelTitles[this.currentLevel]})</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">Nombre de candidats:</span>
                            <span class="detail-value">\${school.totalStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Candidats admis:</span>
                            <span class="detail-value">\${school.passedStudents}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Taux de réussite:</span>
                            <span class="detail-value \${this.getSuccessRateClass(school.successRate)}">\${school.successRate.toFixed(1)}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne générale:</span>
                            <span class="detail-value">\${school.averageScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne maximale:</span>
                            <span class="detail-value">\${school.maxScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Moyenne minimale:</span>
                            <span class="detail-value">\${school.minScore.toFixed(2)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Score de classement:</span>
                            <span class="detail-value">\${school.rankingScore.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            \`;
            
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
        paginationHTML += \`
            <button \${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="app.goToPage(\${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        \`;
        
        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += \`
                    <button class="\${i === this.currentPage ? 'active' : ''}" 
                            onclick="app.goToPage(\${i})">\${i}</button>
                \`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        // Next button
        paginationHTML += \`
            <button \${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="app.goToPage(\${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        \`;
        
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.filterAndDisplay();
    }
    
    showError(message) {
        const schoolsGrid = document.getElementById('schoolsGrid');
        if (schoolsGrid) {
            schoolsGrid.innerHTML = \`
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>\${message}</p>
                </div>
            \`;
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
`;

        fs.writeFileSync('public/app-static.js', staticAppJS);
        console.log('✅ Static app.js generated: public/app-static.js');
        
        // Mettre à jour index.html pour utiliser la version statique
        let indexHTML = fs.readFileSync('public/index.html', 'utf8');
        indexHTML = indexHTML.replace('src="app.js"', 'src="app-static.js"');
        fs.writeFileSync('public/index.html', indexHTML);
        console.log('✅ Updated index.html to use static version');
        
        console.log('🎉 Conversion completed! Ready for Netlify deployment.');
        console.log('📁 Files created:');
        console.log('   - public/data.json (static data)');
        console.log('   - public/app-static.js (static app)');
        console.log('   - public/index.html (updated)');
        
    } catch (error) {
        console.error('❌ Error converting to static:', error);
    }
}

// Exécuter la conversion
convertToStatic();
