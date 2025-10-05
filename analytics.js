// Enhanced analytics module for comprehensive user tracking
const analyticsData = {
  totalVisits: 0,
  uniqueUsers: 0,
  visitsByCountry: {},
  levelSelections: {},
  regionSelections: {},
  searchQueries: {},
  userSessions: {},
  dailyStats: {},
  hourlyStats: {},
  deviceStats: {
    desktop: 0,
    mobile: 0,
    tablet: 0
  },
  browserStats: {},
  lastUpdated: new Date().toISOString(),
  startDate: new Date().toISOString()
};

function trackVisit(req) {
  analyticsData.totalVisits++;
  
  // Get user information
  const country = req.get('CF-IPCountry') || req.get('X-Country-Code') || req.get('X-Forwarded-For') || 'Unknown';
  const userAgent = req.get('User-Agent') || '';
  const ip = req.get('X-Forwarded-For') || req.connection?.remoteAddress || 'Unknown';
  
  // Track country
  analyticsData.visitsByCountry[country] = (analyticsData.visitsByCountry[country] || 0) + 1;
  
  // Track device type
  const deviceType = getDeviceType(userAgent);
  analyticsData.deviceStats[deviceType] = (analyticsData.deviceStats[deviceType] || 0) + 1;
  
  // Track browser
  const browser = getBrowser(userAgent);
  analyticsData.browserStats[browser] = (analyticsData.browserStats[browser] || 0) + 1;
  
  // Track daily stats
  const today = new Date().toISOString().split('T')[0];
  analyticsData.dailyStats[today] = (analyticsData.dailyStats[today] || 0) + 1;
  
  // Track hourly stats
  const hour = new Date().getHours();
  analyticsData.hourlyStats[hour] = (analyticsData.hourlyStats[hour] || 0) + 1;
  
  // Track unique users (simple IP-based tracking)
  if (!analyticsData.userSessions[ip]) {
    analyticsData.uniqueUsers++;
    analyticsData.userSessions[ip] = {
      firstVisit: new Date().toISOString(),
      visits: 0,
      country: country,
      lastVisit: new Date().toISOString()
    };
  }
  analyticsData.userSessions[ip].visits++;
  analyticsData.userSessions[ip].lastVisit = new Date().toISOString();
  
  analyticsData.lastUpdated = new Date().toISOString();
  console.log(`Analytics: Visit from ${country} (${deviceType}, ${browser}). Total visits: ${analyticsData.totalVisits}, Unique users: ${analyticsData.uniqueUsers}`);
}

function getDeviceType(userAgent) {
  if (/tablet|ipad/i.test(userAgent)) return 'tablet';
  if (/mobile|android|iphone/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

function getBrowser(userAgent) {
  if (/chrome/i.test(userAgent)) return 'Chrome';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/safari/i.test(userAgent)) return 'Safari';
  if (/edge/i.test(userAgent)) return 'Edge';
  if (/opera/i.test(userAgent)) return 'Opera';
  return 'Other';
}

function trackLevelSelection(level, country = 'Unknown') {
  analyticsData.levelSelections[level] = (analyticsData.levelSelections[level] || 0) + 1;
  analyticsData.lastUpdated = new Date().toISOString();
  console.log(`Analytics: Level '${level}' selected by user from ${country}.`);
}

function trackRegionSelection(region, country = 'Unknown') {
  analyticsData.regionSelections[region] = (analyticsData.regionSelections[region] || 0) + 1;
  analyticsData.lastUpdated = new Date().toISOString();
  console.log(`Analytics: Region '${region}' selected by user from ${country}.`);
}

function trackSearchQuery(query, country = 'Unknown') {
  const lowerCaseQuery = query.toLowerCase();
  analyticsData.searchQueries[lowerCaseQuery] = (analyticsData.searchQueries[lowerCaseQuery] || 0) + 1;
  analyticsData.lastUpdated = new Date().toISOString();
  console.log(`Analytics: Search query '${query}' by user from ${country}.`);
}

function getAnalyticsSummary() {
  return { ...analyticsData };
}

function getCountryStats() {
  const countries = Object.entries(analyticsData.visitsByCountry)
    .map(([country, visits]) => ({ country, visits }))
    .sort((a, b) => b.visits - a.visits);
  
  return {
    totalCountries: countries.length,
    topCountries: countries.slice(0, 10),
    countries
  };
}

function getDeviceStats() {
  return {
    totalDevices: Object.values(analyticsData.deviceStats).reduce((a, b) => a + b, 0),
    devices: analyticsData.deviceStats
  };
}

function getBrowserStats() {
  return {
    totalBrowsers: Object.values(analyticsData.browserStats).reduce((a, b) => a + b, 0),
    browsers: analyticsData.browserStats
  };
}

function getDailyStats() {
  const days = Object.entries(analyticsData.dailyStats)
    .map(([date, visits]) => ({ date, visits }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return {
    totalDays: days.length,
    days,
    averageDailyVisits: days.length > 0 ? days.reduce((sum, day) => sum + day.visits, 0) / days.length : 0
  };
}

function getHourlyStats() {
  const hours = Object.entries(analyticsData.hourlyStats)
    .map(([hour, visits]) => ({ hour: parseInt(hour), visits }))
    .sort((a, b) => a.hour - b.hour);
  
  return {
    hours,
    peakHour: hours.reduce((max, hour) => hour.visits > max.visits ? hour : max, { hour: 0, visits: 0 })
  };
}

function getTopRegions() {
  const regions = Object.entries(analyticsData.regionSelections)
    .map(([region, selections]) => ({ region, selections }))
    .sort((a, b) => b.selections - a.selections);
  
  return regions.slice(0, 10);
}

function getTopSearches() {
  const searches = Object.entries(analyticsData.searchQueries)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count);
  
  return searches.slice(0, 10);
}

function getComprehensiveStats() {
  return {
    overview: {
      totalVisits: analyticsData.totalVisits,
      uniqueUsers: analyticsData.uniqueUsers,
      averageVisitsPerUser: analyticsData.uniqueUsers > 0 ? (analyticsData.totalVisits / analyticsData.uniqueUsers).toFixed(2) : 0,
      startDate: analyticsData.startDate,
      lastUpdated: analyticsData.lastUpdated
    },
    countries: getCountryStats(),
    devices: getDeviceStats(),
    browsers: getBrowserStats(),
    daily: getDailyStats(),
    hourly: getHourlyStats(),
    topRegions: getTopRegions(),
    topSearches: getTopSearches(),
    levels: analyticsData.levelSelections
  };
}

module.exports = {
  trackVisit,
  trackLevelSelection,
  trackRegionSelection,
  trackSearchQuery,
  getAnalyticsSummary,
  getCountryStats,
  getDeviceStats,
  getBrowserStats,
  getDailyStats,
  getHourlyStats,
  getTopRegions,
  getTopSearches,
  getComprehensiveStats
};