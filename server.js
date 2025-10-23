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
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static('public'));

// School data storage
let schoolData = {
  primary: [],
  middle: [],
  secondary: []
};

let lastDataUpdate = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper functions
function getSchoolName(record, level) {
  try {
    if (level === 'primary') {
      return record['Ecole_AR'] || record['Centre Examen_AR'] || 'École non identifiée';
    } else if (level === 'middle') {
      return record['Ecole'] || record['Centre'] || 'École non identifiée';
    } else if (level === 'secondary') {
      return record['Etablissement_FR'] || record['Etablissement_AR'] || 'École non identifiée';
    }
    return 'École non identifiée';
  } catch (error) {
    return 'École non identifiée';
  }
}

function getRegion(record, level) {
  try {
    if (level === 'primary') {
      return record['WILAYA_AR'] || 'Région non spécifiée';
    } else if (level === 'middle') {
      return record['WILAYA'] || 'Région non spécifiée';
    } else if (level === 'secondary') {
      return record['Wilaya_FR'] || record['Wilaya_AR'] || 'Région non spécifiée';
    }
    return 'Région non spécifiée';
  } catch (error) {
    return 'Région non spécifiée';
  }
}

function getScore(record, level) {
  try {
    if (level === 'primary') {
      return parseFloat(record['TOTAL']) || 0;
    } else if (level === 'middle') {
      return parseFloat(record['Moyenne_Bepc']) || 0;
    } else if (level === 'secondary') {
      return parseFloat(record['Moy Bac']) || 0;
    }
    return 0;
  } catch (error) {
    return 0;
  }
}

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

    lastDataUpdate = Date.now();
    console.log('✅ Data loading completed successfully');
    console.log(`📊 Primary schools: ${schoolData.primary.length}`);
    console.log(`📊 Middle schools: ${schoolData.middle.length}`);
    console.log(`📊 Secondary schools: ${schoolData.secondary.length}`);
    console.log(`💾 Final memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`);
    console.log('✅ Data loaded successfully');
    
    return { success: true, fromCache: false };
  } catch (error) {
    console.error('❌ Error loading data:', error);
    return { success: false, error: error.message };
  }
}

// Process CSV file
async function processCSVFile(filename, level) {
  return new Promise((resolve, reject) => {
    const results = [];
    let processedCount = 0;
    let validCount = 0;
    let errorCount = 0;

    console.log(`Processing CSV file: ${filename} for ${level} level`);

    fs.createReadStream(filename)
      .pipe(csv())
      .on('data', (data) => {
        processedCount++;
        
        if (processedCount % 10000 === 0) {
          console.log(`Processed ${processedCount} records for ${level}`);
        }

        if (isValidRecord(data, level)) {
          const schoolName = getSchoolName(data, level);
          const region = getRegion(data, level);
          const score = getScore(data, level);
          
          // Create school record
          const schoolRecord = {
            id: `${level}_${processedCount}`,
            name: schoolName,
            region: region,
            level: level,
            score: score,
            totalStudents: 1, // Default value
            successRate: score, // Use score as success rate for now
            rawData: data
          };
          
          results.push(schoolRecord);
          validCount++;
        } else {
          errorCount++;
        }
      })
      .on('end', () => {
        console.log(`✅ Processed ${processedCount} valid records for ${level} level`);
        console.log(`❌ Skipped ${errorCount} invalid records`);
        console.log(`Sample record keys:`, Object.keys(results[0] || []);
        if (results.length > 0) {
          console.log(`Sample record:`, results[0]);
        }
        resolve(results);
      })
      .on('error', (error) => {
        console.error(`❌ Error processing ${filename}:`, error);
        reject(error);
      });
  });
}

// API Routes
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  };
  res.json(healthStatus);
});

// Data loading status endpoint
app.get('/api/status', (req, res) => {
  const status = {
    dataLoading: {
      primary: schoolData.primary.length,
      middle: schoolData.middle.length,
      secondary: schoolData.secondary.length,
      lastUpdate: lastDataUpdate
    },
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    }
  };
  res.json(status);
});

app.get('/api/schools/:level', (req, res) => {
  const { level } = req.params;
  const { region, limit = 50, offset = 0 } = req.query;
  
  try {
    let schools = [];
    
    if (level === 'primary') {
      schools = schoolData.primary;
    } else if (level === 'middle') {
      schools = schoolData.middle;
    } else if (level === 'secondary') {
      schools = schoolData.secondary;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Niveau invalide'
      });
    }

    // Filter by region if specified
    if (region && region !== 'all') {
      schools = schools.filter(school => 
        school.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Sort by score (descending)
    schools.sort((a, b) => b.score - a.score);

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedSchools = schools.slice(startIndex, endIndex);

    res.json({
      success: true,
      schools: paginatedSchools,
      total: schools.length,
      level: level,
      region: region || 'all',
      pagination: {
        offset: parseInt(offset),
        limit: parseInt(limit),
        total: schools.length
      }
    });
  } catch (error) {
    console.error('❌ Error in schools endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur interne du serveur'
    });
  }
});

app.get('/api/schools/:level/search', (req, res) => {
  const { level } = req.params;
  const { q, region } = req.query;
  
  try {
    let schools = [];
    
    if (level === 'primary') {
      schools = schoolData.primary;
    } else if (level === 'middle') {
      schools = schoolData.middle;
    } else if (level === 'secondary') {
      schools = schoolData.secondary;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Niveau invalide'
      });
    }

    // Filter by region if specified
    if (region && region !== 'all') {
      schools = schools.filter(school => 
        school.region.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Search by school name
    if (q && q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      schools = schools.filter(school => 
        school.name.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by score (descending)
    schools.sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      schools: schools.slice(0, 50), // Limit to 50 results
      total: schools.length,
      level: level,
      query: q,
      region: region || 'all'
    });
  } catch (error) {
    console.error('❌ Error in search endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur interne du serveur'
    });
  }
});

app.get('/api/regions/:level', (req, res) => {
  const { level } = req.params;
  
  try {
    let schools = [];
    
    if (level === 'primary') {
      schools = schoolData.primary;
    } else if (level === 'middle') {
      schools = schoolData.middle;
    } else if (level === 'secondary') {
      schools = schoolData.secondary;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Niveau invalide'
      });
    }

    // Extract unique regions
    const regions = [...new Set(schools.map(school => school.region))].sort();
    
    res.json({
      success: true,
      regions: regions,
      level: level,
      total: regions.length
    });
  } catch (error) {
    console.error('❌ Error in regions endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur interne du serveur'
    });
  }
});

app.get('/api/stats/:level', (req, res) => {
  const { level } = req.params;
  
  try {
    let schools = [];
    
    if (level === 'primary') {
      schools = schoolData.primary;
    } else if (level === 'middle') {
      schools = schoolData.middle;
    } else if (level === 'secondary') {
      schools = schoolData.secondary;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid level',
        message: 'Niveau invalide'
      });
    }

    const totalSchools = schools.length;
    const totalStudents = schools.reduce((sum, school) => sum + school.totalStudents, 0);
    const averageScore = schools.length > 0 ? 
      schools.reduce((sum, school) => sum + school.score, 0) / schools.length : 0;
    
    const regions = [...new Set(schools.map(school => school.region))];
    
    res.json({
      success: true,
      stats: {
        totalSchools: totalSchools,
        totalStudents: totalStudents,
        averageScore: Math.round(averageScore * 100) / 100,
        regions: regions.length,
        level: level
      }
    });
  } catch (error) {
    console.error('❌ Error in stats endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur interne du serveur'
    });
  }
});

// Analytics endpoints
app.get('/api/analytics', (req, res) => {
  try {
    const analyticsSummary = analytics.getAnalyticsSummary();
    res.json({
      success: true,
      analytics: analyticsSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in analytics endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Erreur interne du serveur'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('✅ Database initialized successfully');
  console.log(`🚀 School Ranking App running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Application: http://localhost:${PORT}`);
  console.log(`🔒 Admin dashboard: http://localhost:${PORT}/admin`);
  console.log(`📈 Analytics: http://localhost:${PORT}/analytics`);
  console.log('✅ Server started!');
  console.log(`💾 Initial memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('📊 Loading data in background...');
  
  // Load data in background
  loadData().then(result => {
    if (result.success) {
      console.log('✅ Data loading completed');
    } else {
      console.error('❌ Data loading failed:', result.error);
    }
  });
});
