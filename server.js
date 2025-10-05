const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const analytics = require('./analytics');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Render Pro configuration
if (process.env.NODE_ENV === 'production') {
  console.log('🚀 Running in production mode on Render Pro');
  console.log('✅ No sleep mode - Always available 24/7');
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Analytics middleware
app.use((req, res, next) => {
  analytics.trackVisit(req);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Data storage
let schoolData = {
  primary: [],
  middle: [],
  secondary: []
};

// Cache for pre-calculated rankings
let rankingsCache = {
  primary: null,
  middle: null,
  secondary: null
};

let lastDataUpdate = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Data processing functions
async function processExcelFile(filePath, level) {
  try {
    console.log(`Processing Excel file: ${filePath} for ${level} level`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log(`Using sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', 
      blankrows: false,
      raw: false // Convert numbers to strings to preserve formatting
    });
    
    console.log(`Processed ${data.length} records for ${level} level`);
    if (data.length > 0) {
      console.log(`Sample record keys:`, Object.keys(data[0]));
      console.log(`Sample record:`, data[0]);
    }
    return data;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return [];
  }
}

function processCSVFile(filePath, level) {
  return new Promise((resolve, reject) => {
    console.log(`Processing CSV file: ${filePath} for ${level} level`);
    
    try {
      // Read the entire file
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        resolve([]);
        return;
      }
      
      // Parse headers from first line
      const headers = lines[0].split(',').map(h => h.trim());
      console.log(`Headers: ${headers.length} columns`);
      
      const results = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        
        // Create record object
        const record = {};
        headers.forEach((header, index) => {
          const value = values[index] ? values[index].trim() : '';
          if (value !== '') {
            record[header] = value;
          }
        });
        
        if (Object.keys(record).length > 0) {
          results.push(record);
        }
        
        // Log progress every 10000 records
        if (i % 10000 === 0) {
          console.log(`Processed ${i}/${lines.length - 1} records for ${level}`);
        }
      }
      
      console.log(`✅ Processed ${results.length} records for ${level} level`);
      if (results.length > 0) {
        console.log(`Sample record keys:`, Object.keys(results[0]));
        console.log(`Sample record:`, results[0]);
      }
      resolve(results);
      
    } catch (error) {
      console.error(`❌ Error processing CSV file ${filePath}:`, error);
      reject(error);
    }
  });
}

// Load data on startup with simplified logic
async function loadData() {
  try {
    console.log('📊 Loading school data...');

    // Check if cache is still valid
    if (lastDataUpdate && (Date.now() - lastDataUpdate) < CACHE_DURATION) {
      console.log('✅ Using cached data...');
      return { success: true, fromCache: true };
    }

    // Load primary schools (CAS)
    if (fs.existsSync('RESU_CAS_2025.csv')) {
      console.log('📊 Loading primary schools data...');
      schoolData.primary = await processCSVFile('RESU_CAS_2025.csv', 'primary');
      console.log(`✅ Primary schools loaded: ${schoolData.primary.length} records`);
    } else {
      console.warn('⚠️ RESU_CAS_2025.csv not found');
      schoolData.primary = [];
    }

    // Load middle schools (BREVET)
    if (fs.existsSync('RESU_BREVET_2025.csv')) {
      console.log('📊 Loading middle schools data...');
      schoolData.middle = await processCSVFile('RESU_BREVET_2025.csv', 'middle');
      console.log(`✅ Middle schools loaded: ${schoolData.middle.length} records`);
    } else {
      console.warn('⚠️ RESU_BREVET_2025.csv not found');
      schoolData.middle = [];
    }

    // Load secondary schools (BAC)
    if (fs.existsSync('RESU_BAC_2025.csv')) {
      console.log('📊 Loading secondary schools data...');
      schoolData.secondary = await processCSVFile('RESU_BAC_2025.csv', 'secondary');
      console.log(`✅ Secondary schools loaded: ${schoolData.secondary.length} records`);
    } else {
      console.warn('⚠️ RESU_BAC_2025.csv not found');
      schoolData.secondary = [];
    }

    // Pre-calculate rankings for all levels
    console.log('🏆 Pre-calculating rankings...');
    rankingsCache.primary = calculateSchoolRanking(schoolData.primary, 'primary');
    rankingsCache.middle = calculateSchoolRanking(schoolData.middle, 'middle');
    rankingsCache.secondary = calculateSchoolRanking(schoolData.secondary, 'secondary');

    lastDataUpdate = Date.now();
    console.log('✅ Data loading completed successfully');
    console.log(`📊 Primary schools: ${schoolData.primary.length}`);
    console.log(`📊 Middle schools: ${schoolData.middle.length}`);
    console.log(`📊 Secondary schools: ${schoolData.secondary.length}`);

    return { success: true, fromCache: false };

  } catch (error) {
    console.error('❌ Error loading data:', error);
    return { success: false, error: error.message };
  }
}

// Ranking calculation functions
function calculateSchoolRanking(data, level) {
  console.log(`Calculating rankings for ${level} level with ${data.length} records`);
  const schoolStats = {};
  let processedRecords = 0;
  let validSchools = 0;
  let unidentifiedSchools = 0;
  
  data.forEach((record, index) => {
    const schoolName = getSchoolName(record, level);
    if (!schoolName || schoolName === 'École non identifiée') {
      unidentifiedSchools++;
      return;
    }
    
    if (!schoolStats[schoolName]) {
      schoolStats[schoolName] = {
        name: schoolName,
        totalStudents: 0,
        passedStudents: 0,
        averageScore: 0,
        scores: [],
        region: getRegion(record, level),
        level: level,
        // Additional fields for all levels (primaires, collèges et lycées)
        maxScore: 0,
        minScore: level === 'primary' ? 200 : 20
      };
      validSchools++;
    }
    
    const score = getScore(record, level);
    const passed = getPassedStatus(record, level);
    
    schoolStats[schoolName].totalStudents++;
    if (passed) schoolStats[schoolName].passedStudents++;
    if (score > 0) {
      schoolStats[schoolName].scores.push(score);
      // Update max and min scores for all levels
      if (score > schoolStats[schoolName].maxScore) {
        schoolStats[schoolName].maxScore = score;
      }
      if (score < schoolStats[schoolName].minScore) {
        schoolStats[schoolName].minScore = score;
      }
    }
    
    processedRecords++;
    
    // Log progress every 10000 records
    if (processedRecords % 10000 === 0) {
      console.log(`Processed ${processedRecords}/${data.length} records for ${level}`);
    }
  });
  
  console.log(`Found ${validSchools} unique schools for ${level} level`);
  console.log(`Unidentified schools: ${unidentifiedSchools}`);
  
  // Calculate averages and success rates
  Object.values(schoolStats).forEach(school => {
    if (school.scores.length > 0) {
      school.averageScore = school.scores.reduce((a, b) => a + b, 0) / school.scores.length;
    }
    school.successRate = (school.passedStudents / school.totalStudents) * 100;
    
    // For all levels, ensure max and min scores are properly set
    if (school.scores.length === 0) {
      school.maxScore = 0;
      school.minScore = 0;
    } else if (school.scores.length === 1) {
      school.maxScore = school.scores[0];
      school.minScore = school.scores[0];
    }
    
    school.rankingScore = (school.averageScore * 0.6) + (school.successRate * 0.4);
  });
  
  // Sort by ranking score
  const rankings = Object.values(schoolStats)
    .filter(school => school.totalStudents >= 5) // Minimum 5 students for ranking
    .sort((a, b) => b.rankingScore - a.rankingScore)
    .map((school, index) => ({
      ...school,
      rank: index + 1
    }));
  
  // Calculate regional rankings
  const regionalRankings = {};
  Object.values(schoolStats).forEach(school => {
    if (school.totalStudents >= 5) {
      const region = school.region;
      if (!regionalRankings[region]) {
        regionalRankings[region] = [];
      }
      regionalRankings[region].push(school);
    }
  });
  
  // Sort each region and assign regional ranks
  Object.keys(regionalRankings).forEach(region => {
    regionalRankings[region].sort((a, b) => b.rankingScore - a.rankingScore);
    regionalRankings[region].forEach((school, index) => {
      school.regionalRank = index + 1;
    });
  });
  
  // Add regional rank to main rankings
  rankings.forEach(school => {
    const regionSchools = regionalRankings[school.region] || [];
    const regionalSchool = regionSchools.find(s => s.name === school.name);
    if (regionalSchool) {
      school.regionalRank = regionalSchool.regionalRank;
    }
  });
  
  console.log(`Generated ${rankings.length} ranked schools for ${level} level`);
  if (rankings.length > 0) {
    console.log(`Top school: ${rankings[0].name} (${rankings[0].successRate.toFixed(1)}% success rate)`);
  }
  
  return rankings;
}

// Helper functions to extract data based on level
function getSchoolName(record, level) {
  // Try multiple possible column names for school names based on actual CSV structure
  const possibleNames = [
    'Ecole_AR', 'Etablissement_FR', 'Etablissement_AR', 'Ecole', 'School', 'École', 'Collège', 'Lycée',
    'Etablissement', 'Établissement', 'Nom_Ecole', 'Nom_Etablissement',
    'School_Name', 'Institution', 'Établissement scolaire'
  ];
  
  for (const name of possibleNames) {
    if (record[name] && record[name].toString().trim() !== '') {
      return record[name].toString().trim();
    }
  }
  
  // If no school name found, try to construct one from other fields
  if (record['Centre Examen_FR']) return record['Centre Examen_FR'].toString().trim();
  if (record['Centre Examen_AR']) return record['Centre Examen_AR'].toString().trim();
  if (record['Centre']) return record['Centre'].toString().trim();
  
  // Try to find any field that might contain school name
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase().includes('etablissement') || 
        key.toLowerCase().includes('ecole') || 
        key.toLowerCase().includes('lycee') ||
        key.toLowerCase().includes('college') ||
        key.toLowerCase().includes('centre')) {
      if (value && value.toString().trim() !== '') {
        return value.toString().trim();
      }
    }
  }
  
  return 'École non identifiée';
}

function getRegion(record, level) {
  const possibleRegions = [
    'WILAYA_AR', 'Wilaya_FR', 'Wilaya_AR', 'WILAYA', 'Region', 'Wilaya', 'Région',
    'Province', 'Département', 'Zone', 'Area'
  ];
  
  for (const region of possibleRegions) {
    if (record[region] && record[region].toString().trim() !== '') {
      return record[region].toString().trim();
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
  
  // For middle level (Brevet), check Moyenne_Bepc
  if (level === 'middle' && record['Moyenne_Bepc']) {
    let scoreStr = record['Moyenne_Bepc'].toString().replace(',', '.');
    const score = parseFloat(scoreStr);
    if (!isNaN(score) && score >= 0 && score <= 20) {
      return score;
    }
  }
  
  // For secondary level (Bac), check Moy Bac
  if (level === 'secondary' && record['Moy Bac']) {
    let scoreStr = record['Moy Bac'].toString().replace(',', '.');
    const score = parseFloat(scoreStr);
    if (!isNaN(score) && score >= 0 && score <= 20) {
      return score;
    }
  }
  
  const scoreFields = [
    'Moy Bac', 'Moyenne_Bepc', 'Moyenne', 'Score', 'Note', 'Moyenne Générale', 'Moyenne_Bac',
    'Moyenne_Generale', 'Note_Finale', 'Score_Final', 'Total', 'Points',
    'Moyenne_Examen', 'Note_Examen', 'Moyenne_BEPC'
  ];
  
  for (const field of scoreFields) {
    if (record[field]) {
      // Handle different number formats (comma as decimal separator)
      let scoreStr = record[field].toString().replace(',', '.');
      const score = parseFloat(scoreStr);
      
      // Different score ranges based on level
      if (level === 'primary') {
        // Primary level: 0-200 points
        if (!isNaN(score) && score >= 0 && score <= 200) {
          return score;
        }
      } else {
        // Secondary and middle levels: 0-20 points
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
             decision.includes('succes') ||
             decision.includes('sessionnaire');
    }
  }
  
  // If no decision field, check if score is above passing threshold
  const score = getScore(record, level);
  if (level === 'primary') {
    return score >= 90; // Primary level: 90/200 is passing grade
  } else {
    return score >= 10; // Secondary and middle levels: 10/20 is passing grade
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dataLoaded: lastDataUpdate ? true : false,
    dataStatus: {
      primary: {
        loaded: schoolData.primary.length > 0,
        count: schoolData.primary.length,
        rankings: rankingsCache.primary ? rankingsCache.primary.length : 0
      },
      middle: {
        loaded: schoolData.middle.length > 0,
        count: schoolData.middle.length,
        rankings: rankingsCache.middle ? rankingsCache.middle.length : 0
      },
      secondary: {
        loaded: schoolData.secondary.length > 0,
        count: schoolData.secondary.length,
        rankings: rankingsCache.secondary ? rankingsCache.secondary.length : 0
      }
    },
    cacheStatus: {
      lastUpdate: lastDataUpdate ? new Date(lastDataUpdate).toISOString() : null,
      cacheAge: lastDataUpdate ? Date.now() - lastDataUpdate : null,
      cacheValid: lastDataUpdate && (Date.now() - lastDataUpdate) < CACHE_DURATION
    }
  };

  // Determine overall health
  const allDataLoaded = healthStatus.dataStatus.primary.loaded && 
                       healthStatus.dataStatus.middle.loaded && 
                       healthStatus.dataStatus.secondary.loaded;
  
  healthStatus.overallHealth = allDataLoaded ? 'HEALTHY' : 'DEGRADED';
  
  if (!allDataLoaded) {
    healthStatus.status = 'DEGRADED';
    healthStatus.message = 'Some data is not loaded';
  }

  res.json(healthStatus);
});

// Data loading status endpoint
app.get('/api/status', (req, res) => {
  const status = {
    dataLoading: {
      primary: schoolData.primary.length > 0,
      middle: schoolData.middle.length > 0,
      secondary: schoolData.secondary.length > 0
    },
    rankingsReady: {
      primary: rankingsCache.primary && rankingsCache.primary.length > 0,
      middle: rankingsCache.middle && rankingsCache.middle.length > 0,
      secondary: rankingsCache.secondary && rankingsCache.secondary.length > 0
    },
    lastUpdate: lastDataUpdate ? new Date(lastDataUpdate).toISOString() : null,
    ready: lastDataUpdate && rankingsCache.primary && rankingsCache.middle && rankingsCache.secondary
  };
  
  res.json(status);
});

app.get('/api/schools/:level', (req, res) => {
  const { level } = req.params;
  const { region, limit = 50, offset = 0 } = req.query;
  
  console.log(`API Request: /api/schools/${level} - region: ${region}, limit: ${limit}, offset: ${offset}`);

  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level. Must be primary, middle, or secondary' });
  }

  try {
    // Track level selection
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || 'Unknown';
    analytics.trackLevelSelection(level, country);

    // Check if data is available
    const data = schoolData[level];
    if (!data || data.length === 0) {
      console.log(`No data available for ${level} level`);
      return res.json({
        schools: [],
        total: 0,
        message: `No data available for ${level} level`,
        loading: true
      });
    }

    // Use cached rankings if available, otherwise calculate
    let rankings = rankingsCache[level];
    if (!rankings || rankings.length === 0) {
      console.log(`Calculating rankings for ${level}...`);
      rankings = calculateSchoolRanking(data, level);
      rankingsCache[level] = rankings;
    }

    let filteredRankings = rankings;

    // Filter by region if specified
    if (region && region !== 'all') {
      const beforeFilter = filteredRankings.length;
      filteredRankings = filteredRankings.filter(school =>
        school.region.toLowerCase().includes(region.toLowerCase())
      );
      console.log(`Filtered by region '${region}': ${beforeFilter} -> ${filteredRankings.length} schools`);

      // Track region selection
      analytics.trackRegionSelection(region, country);
    }

    // Apply pagination
    const total = filteredRankings.length;
    const paginatedRankings = filteredRankings.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    console.log(`Returning ${paginatedRankings.length} schools (${offset}-${parseInt(offset) + parseInt(limit)})`);

    res.json({
      schools: paginatedRankings,
      total,
      level,
      region: region || 'all',
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });

  } catch (error) {
    console.error(`Error fetching schools for ${level}:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Erreur lors du chargement des données'
    });
  }
});

app.get('/api/schools/:level/search', (req, res) => {
  const { level } = req.params;
  const { q, region } = req.query;
  
  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  
  // Track search query
  if (q) {
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || 'Unknown';
    analytics.trackSearchQuery(q, country);
  }
  
  const data = schoolData[level];
  if (!data || data.length === 0) {
    return res.json({ schools: [], total: 0 });
  }
  
  let rankings = calculateSchoolRanking(data, level);
  
  // Filter by search query
  if (q) {
    const query = q.toLowerCase();
    rankings = rankings.filter(school => 
      school.name.toLowerCase().includes(query) ||
      school.region.toLowerCase().includes(query)
    );
  }
  
  // Filter by region
  if (region && region !== 'all') {
    rankings = rankings.filter(school => 
      school.region.toLowerCase().includes(region.toLowerCase())
    );
  }
  
  res.json({
    schools: rankings.slice(0, 20), // Limit search results
    total: rankings.length,
    query: q || '',
    region: region || 'all'
  });
});

app.get('/api/regions/:level', (req, res) => {
  const { level } = req.params;
  
  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  
  const data = schoolData[level];
  if (!data || data.length === 0) {
    return res.json({ regions: [] });
  }
  
  const regions = new Set();
  data.forEach(record => {
    const region = getRegion(record, level);
    if (region && region !== 'Unknown') {
      regions.add(region);
    }
  });
  
  res.json({
    regions: Array.from(regions).sort(),
    level
  });
});

app.get('/api/stats/:level', (req, res) => {
  const { level } = req.params;
  
  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  
  const data = schoolData[level];
  if (!data || data.length === 0) {
    return res.json({ stats: null, message: 'No data available' });
  }
  
  const rankings = calculateSchoolRanking(data, level);
  const totalSchools = rankings.length;
  const totalStudents = rankings.reduce((sum, school) => sum + school.totalStudents, 0);
  const totalPassed = rankings.reduce((sum, school) => sum + school.passedStudents, 0);
  const overallSuccessRate = totalStudents > 0 ? (totalPassed / totalStudents) * 100 : 0;
  const averageScore = rankings.length > 0 ? 
    rankings.reduce((sum, school) => sum + school.averageScore, 0) / rankings.length : 0;
  
  res.json({
    level,
    stats: {
      totalSchools,
      totalStudents,
      totalPassed,
      overallSuccessRate: Math.round(overallSuccessRate * 100) / 100,
      averageScore: Math.round(averageScore * 100) / 100,
      topSchool: rankings[0] || null,
      bottomSchool: rankings[rankings.length - 1] || null
    }
  });
});

// Analytics endpoint for admin
app.get('/api/analytics', (req, res) => {
  try {
    const analyticsSummary = analytics.getAnalyticsSummary();
    res.json({
      success: true,
      analytics: analyticsSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

// Comprehensive analytics endpoint
app.get('/api/analytics/comprehensive', (req, res) => {
  try {
    const stats = analytics.getComprehensiveStats();
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error);
    res.status(500).json({ error: 'Failed to fetch comprehensive analytics' });
  }
});

// Country statistics endpoint
app.get('/api/analytics/countries', (req, res) => {
  try {
    const countryStats = analytics.getCountryStats();
    res.json({
      success: true,
      countries: countryStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching country stats:', error);
    res.status(500).json({ error: 'Failed to fetch country statistics' });
  }
});

// Device statistics endpoint
app.get('/api/analytics/devices', (req, res) => {
  try {
    const deviceStats = analytics.getDeviceStats();
    res.json({
      success: true,
      devices: deviceStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ error: 'Failed to fetch device statistics' });
  }
});

// Daily statistics endpoint
app.get('/api/analytics/daily', (req, res) => {
  try {
    const dailyStats = analytics.getDailyStats();
    res.json({
      success: true,
      daily: dailyStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: 'Failed to fetch daily statistics' });
  }
});

// Hourly statistics endpoint
app.get('/api/analytics/hourly', (req, res) => {
  try {
    const hourlyStats = analytics.getHourlyStats();
    res.json({
      success: true,
      hourly: hourlyStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching hourly stats:', error);
    res.status(500).json({ error: 'Failed to fetch hourly statistics' });
  }
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve analytics dashboard
app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics-dashboard.html'));
});

// Serve admin dashboard (admin only)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server immediately
app.listen(PORT, () => {
  console.log(`🚀 School Ranking App running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Application: http://localhost:${PORT}`);
  console.log(`🔒 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`📈 Analytics: http://localhost:${PORT}/analytics`);
  console.log(`✅ Server started!`);
  
  // Load data in background
  console.log('📊 Loading data in background...');
  loadData().then((dataResult) => {
    if (dataResult.success) {
      console.log('✅ Data loaded successfully');
    } else {
      console.warn('⚠️ Data loading had issues:', dataResult.error);
    }
  }).catch((error) => {
    console.error('❌ Data loading failed:', error);
  });
});

module.exports = app;
