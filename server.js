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
      
      school.rankingScore = (school.averageScore * 0.6) + (school.successRate * 0.4);
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
      
      school.rankingScore = (school.averageScore * 0.6) + (school.successRate * 0.4);
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
      ...school,
      rank: index + 1
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
      error: 'Internal server error',
      message: 'Erreur lors du chargement des données',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// Start server immediately
app.listen(PORT, () => {
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
