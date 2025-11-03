const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const csv = require('csv-parser');
const analytics = require('./analytics');
const dbManager = require('./database');
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
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
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

// Data processing functions with memory optimization
async function processExcelFile(filePath, level) {
  try {
    console.log(`Processing Excel file: ${filePath} for ${level} level`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log(`Using sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    
    // Process in chunks to reduce memory usage
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
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
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
        console.warn(`⚠️ Empty file: ${filePath}`);
        resolve([]);
        return;
      }
      
      // Parse CSV with proper handling of commas in quoted fields
      function parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        
        return values;
      }
      
      // Parse header
      const headers = parseCSVLine(lines[0]);
      console.log(`Headers: ${headers.length} columns`);
      console.log(`Headers:`, headers);
      
      const results = [];
      let validRecords = 0;
      let invalidRecords = 0;
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i]);
          
          if (values.length === headers.length) {
            // Create record object
            const record = {};
            headers.forEach((header, index) => {
              const value = values[index] ? values[index].trim() : '';
              if (value !== '') {
                record[header] = value;
              }
            });
            
            if (Object.keys(record).length > 0) {
              // Validate record has required fields
              if (isValidRecord(record, level)) {
                results.push(record);
                validRecords++;
              } else {
                invalidRecords++;
              }
            }
          } else {
            invalidRecords++;
            console.warn(`⚠️ Line ${i + 1}: Expected ${headers.length} columns, got ${values.length}`);
          }
          
          // Log progress every 10000 records
          if (i % 10000 === 0) {
            console.log(`Processed ${i}/${lines.length - 1} records for ${level}`);
          }
        } catch (lineError) {
          console.warn(`⚠️ Error processing line ${i + 1}:`, lineError.message);
          invalidRecords++;
        }
      }
      
      console.log(`✅ Processed ${results.length} valid records for ${level} level`);
      console.log(`❌ Skipped ${invalidRecords} invalid records`);
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

// Validate record has required fields for the level
function isValidRecord(record, level) {
  try {
    // Check if record has basic required fields
    const hasName = getSchoolName(record, level) !== 'École non identifiée';
    const hasRegion = getRegion(record, level) !== 'Région non spécifiée';
    const score = getScore(record, level);
    
    // Basic validation
    return hasName && hasRegion && score >= 0;
  } catch (error) {
    console.warn(`⚠️ Error validating record:`, error.message);
    return false;
  }
}

// Load data on startup with simplified logic
async function loadData() {
  try {
    console.log('📊 Loading school data...');
    console.log(`💾 Available memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);

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
    console.log(`💾 Final memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);

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
  let errorRecords = 0;
  
  data.forEach((record, index) => {
    try {
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
    } catch (recordError) {
      errorRecords++;
      console.warn(`⚠️ Error processing record ${index + 1}:`, recordError.message);
    }
  });
  
  console.log(`Found ${validSchools} unique schools for ${level} level`);
  console.log(`Unidentified schools: ${unidentifiedSchools}`);
  console.log(`Error records: ${errorRecords}`);
  
  // Calculate averages and success rates
  Object.values(schoolStats).forEach(school => {
    try {
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
      
      // Normalize average score to percentage based on level
      const normalizedAverageScore = level === 'primary' 
        ? (school.averageScore / 200) * 100  // Primary: 0-200 scale
        : (school.averageScore / 20) * 100; // Middle/Secondary: 0-20 scale
      
      school.rankingScore = (school.successRate * 0.6) + (normalizedAverageScore * 0.4);
    } catch (calcError) {
      console.warn(`⚠️ Error calculating stats for school ${school.name}:`, calcError.message);
      school.rankingScore = 0;
    }
  });
  
  // Sort by ranking score
  const rankings = Object.values(schoolStats)
    .filter(school => school.totalStudents >= 5) // Minimum 5 students for ranking
    .sort((a, b) => {
      try {
        return b.rankingScore - a.rankingScore;
      } catch (sortError) {
        console.warn(`⚠️ Error sorting schools:`, sortError.message);
        return 0;
      }
    })
    .map((school, index) => ({
      id: `${level}_${index + 1}`,
      name: school.name,
      region: school.region,
      level: school.level,
      rank: index + 1,
      totalStudents: school.totalStudents,
      passedStudents: school.passedStudents,
      averageScore: Math.round(school.averageScore * 100) / 100,
      successRate: Math.round(school.successRate * 100) / 100,
      maxScore: Math.round(school.maxScore * 100) / 100,
      minScore: Math.round(school.minScore * 100) / 100,
      score: Math.round(school.successRate * 100) / 100,
      regionalRank: school.regionalRank || null
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
    try {
      regionalRankings[region].sort((a, b) => b.rankingScore - a.rankingScore);
      regionalRankings[region].forEach((school, index) => {
        school.regionalRank = index + 1;
      });
    } catch (regionSortError) {
      console.warn(`⚠️ Error sorting region ${region}:`, regionSortError.message);
    }
  });
  
  // Add regional rank to main rankings
  rankings.forEach(school => {
    try {
      const regionSchools = regionalRankings[school.region] || [];
      const regionalSchool = regionSchools.find(s => s.name === school.name);
      if (regionalSchool) {
        school.regionalRank = regionalSchool.regionalRank;
      }
    } catch (rankError) {
      console.warn(`⚠️ Error assigning regional rank for ${school.name}:`, rankError.message);
    }
  });
  
  console.log(`Generated ${rankings.length} ranked schools for ${level} level`);
  if (rankings.length > 0) {
    console.log(`Top school: ${rankings[0].name} (${rankings[0].successRate.toFixed(1)}% success rate)`);
  }
  
  return rankings;
}

// Memory-optimized ranking calculation for Render Starter plan
function calculateSchoolRankingOptimized(data, level) {
  console.log(`Calculating optimized rankings for ${level} level with ${data.length} records`);
  const schoolStats = {};
  let processedRecords = 0;
  let validSchools = 0;
  let unidentifiedSchools = 0;
  let errorRecords = 0;
  
  // Process in smaller chunks to reduce memory usage
  const CHUNK_SIZE = 5000; // Process 5000 records at a time
  
  for (let chunkStart = 0; chunkStart < data.length; chunkStart += CHUNK_SIZE) {
    const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, data.length);
    const chunk = data.slice(chunkStart, chunkEnd);
    
    console.log(`Processing chunk ${Math.floor(chunkStart/CHUNK_SIZE) + 1}/${Math.ceil(data.length/CHUNK_SIZE)} (${chunkStart}-${chunkEnd})`);
    
    chunk.forEach((record, index) => {
      try {
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
          if (score > schoolStats[schoolName].maxScore) {
            schoolStats[schoolName].maxScore = score;
          }
          if (score < schoolStats[schoolName].minScore) {
            schoolStats[schoolName].minScore = score;
          }
        }
        
        processedRecords++;
      } catch (recordError) {
        errorRecords++;
        console.warn(`⚠️ Error processing record ${chunkStart + index + 1}:`, recordError.message);
      }
    });
    
    // Force garbage collection after each chunk
    if (global.gc) {
      global.gc();
    }
  }
  
  console.log(`Found ${validSchools} unique schools for ${level} level`);
  console.log(`Unidentified schools: ${unidentifiedSchools}`);
  console.log(`Error records: ${errorRecords}`);
  
  // Calculate averages and success rates
  Object.values(schoolStats).forEach(school => {
    try {
      if (school.scores.length > 0) {
        school.averageScore = school.scores.reduce((a, b) => a + b, 0) / school.scores.length;
      }
      school.successRate = (school.passedStudents / school.totalStudents) * 100;
      
      if (school.scores.length === 0) {
        school.maxScore = 0;
        school.minScore = 0;
      } else if (school.scores.length === 1) {
        school.maxScore = school.scores[0];
        school.minScore = school.scores[0];
      }
      
      // Normalize average score to percentage based on level
      const normalizedAverageScore = level === 'primary' 
        ? (school.averageScore / 200) * 100  // Primary: 0-200 scale
        : (school.averageScore / 20) * 100; // Middle/Secondary: 0-20 scale
      
      school.rankingScore = (school.successRate * 0.6) + (normalizedAverageScore * 0.4);
    } catch (calcError) {
      console.warn(`⚠️ Error calculating stats for school ${school.name}:`, calcError.message);
      school.rankingScore = 0;
    }
  });
  
  // Sort by ranking score
  const rankings = Object.values(schoolStats)
    .filter(school => school.totalStudents >= 5)
    .sort((a, b) => {
      try {
        return b.rankingScore - a.rankingScore;
      } catch (sortError) {
        console.warn(`⚠️ Error sorting schools:`, sortError.message);
        return 0;
      }
    })
    .map((school, index) => ({
      id: `${level}_${index + 1}`,
      name: school.name,
      region: school.region,
      level: school.level,
      rank: index + 1,
      totalStudents: school.totalStudents,
      passedStudents: school.passedStudents,
      averageScore: Math.round(school.averageScore * 100) / 100,
      successRate: Math.round(school.successRate * 100) / 100,
      maxScore: Math.round(school.maxScore * 100) / 100,
      minScore: Math.round(school.minScore * 100) / 100,
      score: Math.round(school.successRate * 100) / 100,
      regionalRank: school.regionalRank || null
    }));
  
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
  try {
    // For primary level, check TOTAL field specifically first
    if (level === 'primary' && record['TOTAL']) {
      let scoreStr = record['TOTAL'].toString().trim();
      // Handle comma as decimal separator
      scoreStr = scoreStr.replace(',', '.');
      const score = parseFloat(scoreStr);
      if (!isNaN(score) && score >= 0 && score <= 200) {
        return score;
      }
    }
    
    // For middle level (Brevet), check Moyenne_Bepc
    if (level === 'middle' && record['Moyenne_Bepc']) {
      let scoreStr = record['Moyenne_Bepc'].toString().trim();
      scoreStr = scoreStr.replace(',', '.');
      const score = parseFloat(scoreStr);
      if (!isNaN(score) && score >= 0 && score <= 20) {
        return score;
      }
    }
    
    // For secondary level (Bac), check Moy Bac
    if (level === 'secondary' && record['Moy Bac']) {
      let scoreStr = record['Moy Bac'].toString().trim();
      // Remove quotes if present and handle comma as decimal separator
      scoreStr = scoreStr.replace(/"/g, '').replace(',', '.');
      const score = parseFloat(scoreStr);
      if (!isNaN(score) && score >= 0 && score <= 20) {
        return score;
      }
    }
    
    const scoreFields = [
      'Moy Bac', 'Moyenne_Bepc', 'Moyenne', 'Score', 'Note', 'Moyenne Générale', 'Moyenne_Bac',
      'Moyenne_Generale', 'Note_Finale', 'Score_Final', 'Total', 'Points',
      'Moyenne_Examen', 'Note_Examen', 'Moyenne_BEPC', 'TOTAL'
    ];
    
    for (const field of scoreFields) {
      if (record[field]) {
        try {
          // Handle different number formats (comma as decimal separator)
          let scoreStr = record[field].toString().trim();
          // Remove quotes if present
          scoreStr = scoreStr.replace(/"/g, '');
          // Replace comma with dot for decimal parsing
          scoreStr = scoreStr.replace(',', '.');
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
        } catch (fieldError) {
          console.warn(`⚠️ Error parsing score field ${field}:`, fieldError.message);
          continue;
        }
      }
    }
    return 0;
  } catch (error) {
    console.warn(`⚠️ Error in getScore for level ${level}:`, error.message);
    return 0;
  }
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

  // Validate level parameter
  if (!level || !['primary', 'middle', 'secondary'].includes(level)) {
    console.error(`❌ Invalid level: ${level}`);
    return res.status(400).json({ 
      error: 'Invalid level. Must be primary, middle, or secondary',
      message: 'Niveau invalide. Doit être primary, middle, ou secondary'
    });
  }

  // Validate query parameters
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    console.error(`❌ Invalid limit: ${limit}`);
    return res.status(400).json({ 
      error: 'Invalid limit. Must be between 1 and 1000',
      message: 'Limite invalide. Doit être entre 1 et 1000'
    });
  }
  
  if (isNaN(offsetNum) || offsetNum < 0) {
    console.error(`❌ Invalid offset: ${offset}`);
    return res.status(400).json({ 
      error: 'Invalid offset. Must be >= 0',
      message: 'Décalage invalide. Doit être >= 0'
    });
  }

  try {
    // Track level selection
    const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || 'Unknown';
    analytics.trackLevelSelection(level, country);

    // Check if data is available
    const data = schoolData[level];
    if (!data || data.length === 0) {
      console.log(`⚠️ No data available for ${level} level`);
      return res.json({
        schools: [],
        total: 0,
        message: `Aucune donnée disponible pour le niveau ${level}`,
        loading: true,
        level,
        region: region || 'all'
      });
    }

    // Use cached rankings if available, otherwise calculate
    let rankings = rankingsCache[level];
    if (!rankings || rankings.length === 0) {
      console.log(`🔄 Calculating rankings for ${level}...`);
      try {
        // Memory optimization: Process in smaller chunks
        rankings = calculateSchoolRankingOptimized(data, level);
        rankingsCache[level] = rankings;
        console.log(`✅ Rankings calculated for ${level}: ${rankings.length} schools`);
        
        // Force garbage collection after ranking calculation
        if (global.gc) {
          global.gc();
        }
      } catch (rankingError) {
        console.error(`❌ Error calculating rankings for ${level}:`, rankingError);
        return res.status(500).json({
          error: 'Error calculating rankings',
          message: 'Erreur lors du calcul des classements'
        });
      }
    }

    let filteredRankings = rankings;

    // Filter by region if specified
    if (region && region !== 'all') {
      const beforeFilter = filteredRankings.length;
      filteredRankings = filteredRankings.filter(school => {
        try {
          return school.region && school.region.toLowerCase().includes(region.toLowerCase());
        } catch (filterError) {
          console.warn(`⚠️ Error filtering school by region:`, filterError.message);
          return false;
        }
      });
      console.log(`Filtered by region '${region}': ${beforeFilter} -> ${filteredRankings.length} schools`);

      // Track region selection
      analytics.trackRegionSelection(region, country);
    }

    // Apply pagination
    const total = filteredRankings.length;
    const startIndex = Math.max(0, offsetNum);
    const endIndex = Math.min(startIndex + limitNum, total);
    const paginatedRankings = filteredRankings.slice(startIndex, endIndex);

    console.log(`✅ Returning ${paginatedRankings.length} schools (${startIndex}-${endIndex}) for ${level}`);

    res.json({
      success: true,
      schools: paginatedRankings,
      total,
      level,
      region: region || 'all',
      pagination: {
        limit: limitNum,
        offset: startIndex,
        hasMore: endIndex < total
      }
    });

  } catch (error) {
    console.error(`❌ Error fetching schools for ${level}:`, error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement des données',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/schools/:level/search', (req, res) => {
  const { level } = req.params;
  const { q, region } = req.query;
  
  console.log(`🔍 Search request - Level: ${level}, Query: "${q}", Region: ${region}`);
  
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
    console.log(`❌ No data available for level: ${level}`);
    return res.json({ success: true, schools: [], total: 0 });
  }
  
  let rankings = calculateSchoolRanking(data, level);
  console.log(`📊 Total rankings before filter: ${rankings.length}`);
  
  // Filter by search query
  if (q) {
    const query = q.toLowerCase();
    const beforeFilter = rankings.length;
    rankings = rankings.filter(school => 
      school.name.toLowerCase().includes(query) ||
      school.region.toLowerCase().includes(query)
    );
    console.log(`🔍 After search filter: ${rankings.length} schools (was ${beforeFilter})`);
    
    // Log some sample school names for debugging
    if (rankings.length > 0) {
      console.log(`📝 Sample results: ${rankings.slice(0, 3).map(s => s.name).join(', ')}`);
    }
  }
  
  // Filter by region
  if (region && region !== 'all') {
    const beforeRegion = rankings.length;
    rankings = rankings.filter(school => 
      school.region.toLowerCase().includes(region.toLowerCase())
    );
    console.log(`🌍 After region filter: ${rankings.length} schools (was ${beforeRegion})`);
  }
  
  res.json({
    success: true,
    schools: rankings.slice(0, 200), // Limit search results to 200
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
    success: true,
    regions: Array.from(regions).sort(),
    level,
    total: regions.size
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
    success: true,
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

// New endpoint for detailed school statistics
app.get('/api/school/:schoolId/details', (req, res) => {
  const { schoolId } = req.params;
  
  if (!schoolId) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing school ID' 
    });
  }
  
  try {
    console.log(`🔍 Looking for school: ${schoolId}`);
    
    // Find the school in the pre-calculated rankings
    let school = null;
    let level = null;
    
    for (const [levelKey, rankings] of Object.entries(rankingsCache)) {
      if (rankings && rankings.length > 0) {
        console.log(`🔍 Checking ${levelKey} level with ${rankings.length} schools`);
        const foundSchool = rankings.find(s => s.id === schoolId);
        if (foundSchool) {
          school = foundSchool;
          level = levelKey;
          console.log(`✅ Found school: ${school.name} in ${level}`);
          break;
        }
      }
    }
    
    if (!school) {
      console.log(`❌ School not found: ${schoolId}`);
      return res.status(404).json({
        success: false,
        error: 'School not found'
      });
    }
    
    // Get raw data for this school to calculate detailed statistics
    const rawData = schoolData[level];
    console.log(`📊 Processing ${rawData.length} records for ${school.name}`);
    
    const schoolRecords = rawData.filter(record => {
      const schoolName = getSchoolName(record, level);
      return schoolName === school.name;
    });
    
    console.log(`📊 Found ${schoolRecords.length} records for ${school.name}`);
    
    // Calculate detailed statistics
    const totalCandidates = schoolRecords.length;
    const scores = schoolRecords.map(record => getScore(record, level)).filter(score => score > 0);
    const admittedStudents = schoolRecords.filter(record => {
      if (level === 'primary') {
        // For primary: score >= 85 is admitted
        return getScore(record, level) >= 85;
      } else {
        // For middle/secondary: check Decision field
        return getPassedStatus(record, level);
      }
    }).length;
    
    const successRate = totalCandidates > 0 ? (admittedStudents / totalCandidates) * 100 : 0;
    const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
    const minScore = scores.length > 0 ? Math.min(...scores) : 0;
    const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    console.log(`📊 Statistics: ${totalCandidates} candidates, ${admittedStudents} admitted, ${successRate.toFixed(1)}% success rate`);
    
    // Create enhanced score distribution for performance curve
    const scoreRanges = [];
    const performanceCurve = [];
    
    if (level === 'primary') {
      // Primary: 0-200 scale with 5-point intervals for better visualization
      for (let i = 0; i <= 200; i += 5) {
        const range = `${i}-${i + 4}`;
        const count = scores.filter(score => score >= i && score <= i + 4).length;
        const percentage = totalCandidates > 0 ? (count / totalCandidates) * 100 : 0;
        scoreRanges.push({ range, count, percentage });
        
        // Only include ranges with students for cleaner curve
        if (count > 0) {
          performanceCurve.push({
            range: range,
            count: count,
            percentage: Math.round(percentage * 100) / 100,
            x: i + 2.5, // Center point of range
            y: count,
            height: percentage
          });
        }
      }
    } else {
      // Middle/Secondary: 0-20 scale with 0.5-point intervals
      for (let i = 0; i <= 20; i += 0.5) {
        const range = `${i.toFixed(1)}-${(i + 0.4).toFixed(1)}`;
        const count = scores.filter(score => score >= i && score < i + 0.5).length;
        const percentage = totalCandidates > 0 ? (count / totalCandidates) * 100 : 0;
        scoreRanges.push({ range, count, percentage });
        
        // Only include ranges with students for cleaner curve
        if (count > 0) {
          performanceCurve.push({
            range: range,
            count: count,
            percentage: Math.round(percentage * 100) / 100,
            x: i + 0.25, // Center point of range
            y: count,
            height: percentage
          });
        }
      }
    }
    
    // Calculate curve statistics
    const maxCount = Math.max(...performanceCurve.map(item => item.count));
    const totalRanges = performanceCurve.length;
    // Calculate ranking score using the same formula as the ranking system
    // Normalize average score to percentage based on level
    const normalizedAverageScore = level === 'primary' 
      ? (averageScore / 200) * 100  // Primary: 0-200 scale
      : (averageScore / 20) * 100; // Middle/Secondary: 0-20 scale
    
    const rankingScore = (successRate * 0.6) + (normalizedAverageScore * 0.4);
    
    const curveData = {
      points: performanceCurve,
      maxCount: maxCount,
      totalRanges: totalRanges,
      scale: level === 'primary' ? '0-200' : '0-20',
      interval: level === 'primary' ? 5 : 0.5,
      // Add the 6 key statistics for the new chart
      totalCandidates: totalCandidates,
      admittedStudents: admittedStudents,
      successRate: Math.round(successRate * 100) / 100,
      maxScore: Math.round(maxScore * 100) / 100,
      minScore: Math.round(minScore * 100) / 100,
      rankingScore: Math.round(rankingScore * 100) / 100
    };
    
    res.json({
      success: true,
      school: {
        id: school.id,
        name: school.name,
        region: school.region,
        level: school.level,
        rank: school.rank
      },
      statistics: {
        totalCandidates,
        admittedStudents,
        successRate: Math.round(successRate * 100) / 100,
        maxScore: Math.round(maxScore * 100) / 100,
        minScore: Math.round(minScore * 100) / 100,
        averageScore: Math.round(averageScore * 100) / 100
      },
      performanceCurve: scoreRanges,
      curveData: curveData,
      admissionCriteria: level === 'primary' ? 'Score ≥ 85 points' : 'Decision: Admis'
    });
    
  } catch (error) {
    console.error(`❌ Error getting school details for ${schoolId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement des détails de l\'école'
    });
  }
});

// Simple test endpoint
app.get('/test', (req, res) => {
  res.send('<h1>Server is working!</h1><p>The Community Voting app is running correctly.</p>');
});

// ===== VOTING ENDPOINTS =====

// Record a vote
app.post('/api/vote', async (req, res) => {
  try {
    const { schoolId, schoolName, schoolRegion, schoolLevel } = req.body;
    
    if (!schoolId || !schoolName || !schoolRegion || !schoolLevel) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Champs requis manquants'
      });
    }
    
    // Only allow voting for secondary level (BAC)
    if (schoolLevel !== 'secondary') {
      return res.status(400).json({
        success: false,
        error: 'Voting only allowed for secondary level schools',
        message: 'Le vote n\'est autorisé que pour les lycées (BAC)'
      });
    }
    
    // Get user IP address
    const voterIp = req.ip || 
                   req.connection.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log(`🗳️ Recording vote: ${schoolId} from IP: ${voterIp}`);
    
    // Record the vote using database manager
    const result = await dbManager.recordVote(
      schoolId,
      schoolName,
      schoolRegion,
      schoolLevel,
      voterIp,
      userAgent
    );
    
    if (result.success) {
      // Check and award badges if applicable
      dbManager.checkAndAwardBadges().catch(err => {
        console.error('❌ Error checking badges:', err);
      });
      
      res.json({
        success: true,
        message: result.message,
        remainingVotes: result.remainingVotes,
        hasVotedToday: result.hasVotedToday || false
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        message: result.message,
        remainingVotes: result.remainingVotes || 0,
        hasVotedToday: result.hasVotedToday || false,
        weeklyLimitReached: result.weeklyLimitReached || false
      });
    }
  } catch (error) {
    console.error('❌ Error processing vote:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du traitement du vote'
    });
  }
});

// Get vote counts for multiple schools
app.post('/api/voting/counts', async (req, res) => {
  try {
    const { schoolIds } = req.body;
    
    if (!schoolIds || !Array.isArray(schoolIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Requête invalide'
      });
    }
    
    // Get current week start
    const weekStart = dbManager.getCurrentWeekStart();
    
    // Get vote counts from weekly_stats for each school
    const counts = {};
    
    // Query all schools at once for efficiency
    if (!dbManager.db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
    }
    
    const placeholders = schoolIds.map(() => '?').join(',');
    const query = `
      SELECT school_id, SUM(vote_count) as total_votes
      FROM weekly_stats
      WHERE school_id IN (${placeholders}) AND week_start = ?
      GROUP BY school_id
    `;
    
    dbManager.db.all(query, [...schoolIds, weekStart], (err, rows) => {
      if (err) {
        console.error('❌ Error fetching vote counts:', err);
        return res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'Erreur de base de données'
        });
      }
      
      rows.forEach(row => {
        counts[row.school_id] = parseInt(row.total_votes) || 0;
      });
      
      // Ensure all requested schools have a count (even if 0)
      schoolIds.forEach(id => {
        if (counts[id] === undefined) {
          counts[id] = 0;
        }
      });
      
      res.json({
        success: true,
        counts: counts
      });
    });
  } catch (error) {
    console.error('❌ Error fetching vote counts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement des votes'
    });
  }
});

// Get top voted schools for voting display
app.get('/api/voting/top', async (req, res) => {
  try {
    const { region, limit = 10 } = req.query;
    
    const result = await dbManager.getTopVotedSchools(region || null, 'secondary', parseInt(limit));
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching top voted schools:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement des écoles les plus votées'
    });
  }
});

// Get user vote status (remaining votes, daily limit, etc.)
app.get('/api/voting/status', async (req, res) => {
  try {
    // Get user IP address
    const voterIp = req.ip || 
                   req.connection.remoteAddress || 
                   req.headers['x-forwarded-for']?.split(',')[0] || 
                   'unknown';
    
    const status = await dbManager.getUserVoteStatus(voterIp);
    
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('❌ Error fetching vote status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement du statut de vote'
    });
  }
});

// Get live results leaderboard (Top 10)
app.get('/api/voting/results', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await dbManager.getTopVotedSchools(null, 'secondary', parseInt(limit));
    
    // Calculate percentages for visualization
    if (result.success && result.schools && result.schools.length > 0) {
      const maxVotes = result.schools[0].total_votes || 1;
      result.schools = result.schools.map(school => ({
        ...school,
        percentage: maxVotes > 0 ? Math.round((school.total_votes / maxVotes) * 100) : 0
      }));
    }
    
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching live results:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement des résultats'
    });
  }
});

// Get current week winner (for announcements)
app.get('/api/voting/winner', async (req, res) => {
  try {
    const result = await dbManager.getCurrentWeekWinner('secondary');
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching week winner:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement du gagnant'
    });
  }
});

// Get winner history (archive)
app.get('/api/voting/winners/history', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const result = await dbManager.getWinnerHistory(parseInt(limit));
    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching winner history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur lors du chargement de l\'historique'
    });
  }
});

// Route for unique school voting links (e.g., /vote/lycee-espoir)
app.get('/vote/:schoolSlug', (req, res) => {
  const { schoolSlug } = req.params;
  // Redirect to main page with voting mode and school pre-selected
  res.redirect(`/?voting=true&school=${encodeURIComponent(schoolSlug)}`);
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

// Serve admin access page
app.get('/admin-access', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-access.html'));
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

// Memory optimization for Render hosting
if (process.env.NODE_ENV === 'production') {
  // Optimize for 512MB Render Starter plan
  const maxOldSpaceSize = process.env.MAX_OLD_SPACE_SIZE || '400'; // Leave 112MB buffer
  console.log(`🔧 Production mode: Optimized for 512MB Render Starter plan (${maxOldSpaceSize}MB limit)`);
}

// Start server immediately - bind to 0.0.0.0 to ensure browser can connect
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 School Ranking App running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Application: http://localhost:${PORT}`);
  console.log(`🔒 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`📈 Analytics: http://localhost:${PORT}/analytics`);
  console.log(`✅ Server started!`);
  console.log(`💾 Initial memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
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
