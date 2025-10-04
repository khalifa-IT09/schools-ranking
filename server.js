const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Data storage
let schoolData = {
  primary: [],
  middle: [],
  secondary: []
};

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
    const results = [];
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        console.log(`Processed ${results.length} records for ${level} level`);
        if (results.length > 0) {
          console.log(`Sample record keys:`, Object.keys(results[0]));
          console.log(`Sample record:`, results[0]);
        }
        resolve(results);
      })
      .on('error', reject);
  });
}

// Load data on startup
async function loadData() {
  try {
    console.log('Loading school data...');
    
    // Load primary schools (CAS)
    if (fs.existsSync('RESU_CAS_2025.csv')) {
      schoolData.primary = await processCSVFile('RESU_CAS_2025.csv', 'primary');
    }
    
    // Load middle schools (BREVET)
    if (fs.existsSync('RESU_BREVET_2025.csv')) {
      schoolData.middle = await processCSVFile('RESU_BREVET_2025.csv', 'middle');
    }
    
    // Load secondary schools (BAC)
    if (fs.existsSync('RESU_BAC_2025.csv')) {
      schoolData.secondary = await processCSVFile('RESU_BAC_2025.csv', 'secondary');
    }
    
    console.log('Data loading completed');
    console.log(`Primary schools: ${schoolData.primary.length}`);
    console.log(`Middle schools: ${schoolData.middle.length}`);
    console.log(`Secondary schools: ${schoolData.secondary.length}`);
    
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Ranking calculation functions
function calculateSchoolRanking(data, level) {
  console.log(`Calculating rankings for ${level} level with ${data.length} records`);
  const schoolStats = {};
  let processedRecords = 0;
  let validSchools = 0;
  
  data.forEach((record, index) => {
    const schoolName = getSchoolName(record, level);
    if (!schoolName || schoolName === 'École non identifiée') {
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
  // Try multiple possible column names for school names
  const possibleNames = [
    'Etablissement_FR', 'Etablissement_AR', 'School', 'École', 'Collège', 'Lycée',
    'Etablissement', 'Établissement', 'Nom_Ecole', 'Nom_Etablissement',
    'School_Name', 'Institution', 'Établissement scolaire', 'Etablissement_FR',
    'Etablissement_AR', 'Nom_Etablissement_FR', 'Nom_Etablissement_AR', 'Ecole_AR'
  ];
  
  for (const name of possibleNames) {
    if (record[name] && record[name].toString().trim() !== '') {
      return record[name].toString().trim();
    }
  }
  
  // If no school name found, try to construct one from other fields
  if (record['Centre Examen_FR']) return record['Centre Examen_FR'].toString().trim();
  if (record['Centre Examen_AR']) return record['Centre Examen_AR'].toString().trim();
  
  // Try to find any field that might contain school name
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase().includes('etablissement') || 
        key.toLowerCase().includes('ecole') || 
        key.toLowerCase().includes('lycee') ||
        key.toLowerCase().includes('college')) {
      if (value && value.toString().trim() !== '') {
        return value.toString().trim();
      }
    }
  }
  
  return 'École non identifiée';
}

function getRegion(record, level) {
  const possibleRegions = [
    'Wilaya_FR', 'Wilaya_AR', 'Region', 'Wilaya', 'Région', 'WILAYA', 'WILAYA_AR',
    'Province', 'Département', 'Zone', 'Area', 'Wilaya_FR', 'Wilaya_AR'
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
  
  const scoreFields = [
    'Moy Bac', 'Moyenne', 'Score', 'Note', 'Moyenne Générale', 'Moyenne_Bac',
    'Moyenne_Generale', 'Note_Finale', 'Score_Final', 'Total', 'Points',
    'Moyenne_Examen', 'Note_Examen', 'Moyenne_Bepc', 'Moyenne_BEPC'
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
             decision.includes('succes');
    }
  }
  
  // If no decision field, check if score is above passing threshold
  const score = getScore(record, level);
  if (level === 'primary') {
    const passed = score >= 90; // Primary level: 90/200 is passing grade
    console.log(`Primary student score: ${score}, passed: ${passed}`);
    return passed;
  } else {
    return score >= 10; // Secondary and middle levels: 10/20 is passing grade
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    dataLoaded: {
      primary: schoolData.primary.length,
      middle: schoolData.middle.length,
      secondary: schoolData.secondary.length
    }
  });
});

app.get('/api/schools/:level', (req, res) => {
  const { level } = req.params;
  const { region, limit = 50, offset = 0 } = req.query;
  
  console.log(`API Request: /api/schools/${level} - region: ${region}, limit: ${limit}, offset: ${offset}`);
  
  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level. Must be primary, middle, or secondary' });
  }
  
  const data = schoolData[level];
  console.log(`Data for ${level}: ${data ? data.length : 0} records`);
  
  if (!data || data.length === 0) {
    return res.json({ 
      schools: [], 
      total: 0, 
      message: `No data available for ${level} level`,
      debug: {
        level,
        dataLength: data ? data.length : 0,
        availableLevels: Object.keys(schoolData)
      }
    });
  }
  
  let rankings = calculateSchoolRanking(data, level);
  console.log(`Generated ${rankings.length} rankings for ${level}`);
  
  // Filter by region if specified
  if (region && region !== 'all') {
    const beforeFilter = rankings.length;
    rankings = rankings.filter(school => 
      school.region.toLowerCase().includes(region.toLowerCase())
    );
    console.log(`Filtered by region '${region}': ${beforeFilter} -> ${rankings.length} schools`);
  }
  
  // Apply pagination
  const total = rankings.length;
  const paginatedRankings = rankings.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
  
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
    },
    debug: {
      totalRankings: rankings.length,
      dataRecords: data.length
    }
  });
});

app.get('/api/schools/:level/search', (req, res) => {
  const { level } = req.params;
  const { q, region } = req.query;
  
  if (!['primary', 'middle', 'secondary'].includes(level)) {
    return res.status(400).json({ error: 'Invalid level' });
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

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 School Ranking App running on http://localhost:${PORT}`);
  console.log(`📊 Loading educational data...`);
  await loadData();
  console.log(`✅ Server ready!`);
});

module.exports = app;
