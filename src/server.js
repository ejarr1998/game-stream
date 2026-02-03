const express = require('express');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Data storage path - use persistent volume on Railway
const DATA_DIR = process.env.DATA_DIR || './data';
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load/save users
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading users:', err);
  }
  return {};
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Team data for all leagues
const TEAMS = {
  nhl: [
    { abbrev: 'ANA', name: 'Anaheim Ducks', city: 'Anaheim', streamName: 'anaheim-ducks', color: '#F47A38' },
    { abbrev: 'BOS', name: 'Boston Bruins', city: 'Boston', streamName: 'boston-bruins', color: '#FFB81C' },
    { abbrev: 'BUF', name: 'Buffalo Sabres', city: 'Buffalo', streamName: 'buffalo-sabres', color: '#002654' },
    { abbrev: 'CGY', name: 'Calgary Flames', city: 'Calgary', streamName: 'calgary-flames', color: '#D2001C' },
    { abbrev: 'CAR', name: 'Carolina Hurricanes', city: 'Carolina', streamName: 'carolina-hurricanes', color: '#CC0000' },
    { abbrev: 'CHI', name: 'Chicago Blackhawks', city: 'Chicago', streamName: 'chicago-blackhawks', color: '#CF0A2C' },
    { abbrev: 'COL', name: 'Colorado Avalanche', city: 'Colorado', streamName: 'colorado-avalanche', color: '#6F263D' },
    { abbrev: 'CBJ', name: 'Columbus Blue Jackets', city: 'Columbus', streamName: 'columbus-blue-jackets', color: '#002654' },
    { abbrev: 'DAL', name: 'Dallas Stars', city: 'Dallas', streamName: 'dallas-stars', color: '#006847' },
    { abbrev: 'DET', name: 'Detroit Red Wings', city: 'Detroit', streamName: 'detroit-red-wings', color: '#CE1126' },
    { abbrev: 'EDM', name: 'Edmonton Oilers', city: 'Edmonton', streamName: 'edmonton-oilers', color: '#041E42' },
    { abbrev: 'FLA', name: 'Florida Panthers', city: 'Florida', streamName: 'florida-panthers', color: '#041E42' },
    { abbrev: 'LAK', name: 'Los Angeles Kings', city: 'Los Angeles', streamName: 'los-angeles-kings', color: '#111111' },
    { abbrev: 'MIN', name: 'Minnesota Wild', city: 'Minnesota', streamName: 'minnesota-wild', color: '#154734' },
    { abbrev: 'MTL', name: 'Montreal Canadiens', city: 'Montreal', streamName: 'montreal-canadiens', color: '#AF1E2D' },
    { abbrev: 'NSH', name: 'Nashville Predators', city: 'Nashville', streamName: 'nashville-predators', color: '#FFB81C' },
    { abbrev: 'NJD', name: 'New Jersey Devils', city: 'New Jersey', streamName: 'new-jersey-devils', color: '#CE1126' },
    { abbrev: 'NYI', name: 'New York Islanders', city: 'New York', streamName: 'new-york-islanders', color: '#00539B' },
    { abbrev: 'NYR', name: 'New York Rangers', city: 'New York', streamName: 'new-york-rangers', color: '#0038A8' },
    { abbrev: 'OTT', name: 'Ottawa Senators', city: 'Ottawa', streamName: 'ottawa-senators', color: '#C52032' },
    { abbrev: 'PHI', name: 'Philadelphia Flyers', city: 'Philadelphia', streamName: 'philadelphia-flyers', color: '#F74902' },
    { abbrev: 'PIT', name: 'Pittsburgh Penguins', city: 'Pittsburgh', streamName: 'pittsburgh-penguins', color: '#FCB514' },
    { abbrev: 'SJS', name: 'San Jose Sharks', city: 'San Jose', streamName: 'san-jose-sharks', color: '#006D75' },
    { abbrev: 'SEA', name: 'Seattle Kraken', city: 'Seattle', streamName: 'seattle-kraken', color: '#001628' },
    { abbrev: 'STL', name: 'St. Louis Blues', city: 'St. Louis', streamName: 'st-louis-blues', color: '#002F87' },
    { abbrev: 'TBL', name: 'Tampa Bay Lightning', city: 'Tampa Bay', streamName: 'tampa-bay-lightning', color: '#002868' },
    { abbrev: 'TOR', name: 'Toronto Maple Leafs', city: 'Toronto', streamName: 'toronto-maple-leafs', color: '#00205B' },
    { abbrev: 'UTA', name: 'Utah Hockey Club', city: 'Utah', streamName: 'utah-hockey-club', color: '#6CACE4' },
    { abbrev: 'VAN', name: 'Vancouver Canucks', city: 'Vancouver', streamName: 'vancouver-canucks', color: '#00205B' },
    { abbrev: 'VGK', name: 'Vegas Golden Knights', city: 'Vegas', streamName: 'vegas-golden-knights', color: '#B4975A' },
    { abbrev: 'WSH', name: 'Washington Capitals', city: 'Washington', streamName: 'washington-capitals', color: '#041E42' },
    { abbrev: 'WPG', name: 'Winnipeg Jets', city: 'Winnipeg', streamName: 'winnipeg-jets', color: '#041E42' }
  ],
  nba: [
    { abbrev: 'ATL', name: 'Atlanta Hawks', city: 'Atlanta', streamName: 'atlanta-hawks', color: '#E03A3E' },
    { abbrev: 'BOS', name: 'Boston Celtics', city: 'Boston', streamName: 'boston-celtics', color: '#007A33' },
    { abbrev: 'BKN', name: 'Brooklyn Nets', city: 'Brooklyn', streamName: 'brooklyn-nets', color: '#000000' },
    { abbrev: 'CHA', name: 'Charlotte Hornets', city: 'Charlotte', streamName: 'charlotte-hornets', color: '#1D1160' },
    { abbrev: 'CHI', name: 'Chicago Bulls', city: 'Chicago', streamName: 'chicago-bulls', color: '#CE1141' },
    { abbrev: 'CLE', name: 'Cleveland Cavaliers', city: 'Cleveland', streamName: 'cleveland-cavaliers', color: '#860038' },
    { abbrev: 'DAL', name: 'Dallas Mavericks', city: 'Dallas', streamName: 'dallas-mavericks', color: '#00538C' },
    { abbrev: 'DEN', name: 'Denver Nuggets', city: 'Denver', streamName: 'denver-nuggets', color: '#0E2240' },
    { abbrev: 'DET', name: 'Detroit Pistons', city: 'Detroit', streamName: 'detroit-pistons', color: '#C8102E' },
    { abbrev: 'GSW', name: 'Golden State Warriors', city: 'Golden State', streamName: 'golden-state-warriors', color: '#1D428A' },
    { abbrev: 'HOU', name: 'Houston Rockets', city: 'Houston', streamName: 'houston-rockets', color: '#CE1141' },
    { abbrev: 'IND', name: 'Indiana Pacers', city: 'Indiana', streamName: 'indiana-pacers', color: '#002D62' },
    { abbrev: 'LAC', name: 'Los Angeles Clippers', city: 'Los Angeles', streamName: 'los-angeles-clippers', color: '#C8102E' },
    { abbrev: 'LAL', name: 'Los Angeles Lakers', city: 'Los Angeles', streamName: 'los-angeles-lakers', color: '#552583' },
    { abbrev: 'MEM', name: 'Memphis Grizzlies', city: 'Memphis', streamName: 'memphis-grizzlies', color: '#5D76A9' },
    { abbrev: 'MIA', name: 'Miami Heat', city: 'Miami', streamName: 'miami-heat', color: '#98002E' },
    { abbrev: 'MIL', name: 'Milwaukee Bucks', city: 'Milwaukee', streamName: 'milwaukee-bucks', color: '#00471B' },
    { abbrev: 'MIN', name: 'Minnesota Timberwolves', city: 'Minnesota', streamName: 'minnesota-timberwolves', color: '#0C2340' },
    { abbrev: 'NOP', name: 'New Orleans Pelicans', city: 'New Orleans', streamName: 'new-orleans-pelicans', color: '#0C2340' },
    { abbrev: 'NYK', name: 'New York Knicks', city: 'New York', streamName: 'new-york-knicks', color: '#006BB6' },
    { abbrev: 'OKC', name: 'Oklahoma City Thunder', city: 'Oklahoma City', streamName: 'oklahoma-city-thunder', color: '#007AC1' },
    { abbrev: 'ORL', name: 'Orlando Magic', city: 'Orlando', streamName: 'orlando-magic', color: '#0077C0' },
    { abbrev: 'PHI', name: 'Philadelphia 76ers', city: 'Philadelphia', streamName: 'philadelphia-76ers', color: '#006BB6' },
    { abbrev: 'PHX', name: 'Phoenix Suns', city: 'Phoenix', streamName: 'phoenix-suns', color: '#1D1160' },
    { abbrev: 'POR', name: 'Portland Trail Blazers', city: 'Portland', streamName: 'portland-trail-blazers', color: '#E03A3E' },
    { abbrev: 'SAC', name: 'Sacramento Kings', city: 'Sacramento', streamName: 'sacramento-kings', color: '#5A2D81' },
    { abbrev: 'SAS', name: 'San Antonio Spurs', city: 'San Antonio', streamName: 'san-antonio-spurs', color: '#C4CED4' },
    { abbrev: 'TOR', name: 'Toronto Raptors', city: 'Toronto', streamName: 'toronto-raptors', color: '#CE1141' },
    { abbrev: 'UTA', name: 'Utah Jazz', city: 'Utah', streamName: 'utah-jazz', color: '#002B5C' },
    { abbrev: 'WAS', name: 'Washington Wizards', city: 'Washington', streamName: 'washington-wizards', color: '#002B5C' }
  ],
  mlb: [
    { abbrev: 'ARI', name: 'Arizona Diamondbacks', city: 'Arizona', streamName: 'arizona-diamondbacks', color: '#A71930' },
    { abbrev: 'ATL', name: 'Atlanta Braves', city: 'Atlanta', streamName: 'atlanta-braves', color: '#CE1141' },
    { abbrev: 'BAL', name: 'Baltimore Orioles', city: 'Baltimore', streamName: 'baltimore-orioles', color: '#DF4601' },
    { abbrev: 'BOS', name: 'Boston Red Sox', city: 'Boston', streamName: 'boston-red-sox', color: '#BD3039' },
    { abbrev: 'CHC', name: 'Chicago Cubs', city: 'Chicago', streamName: 'chicago-cubs', color: '#0E3386' },
    { abbrev: 'CHW', name: 'Chicago White Sox', city: 'Chicago', streamName: 'chicago-white-sox', color: '#27251F' },
    { abbrev: 'CIN', name: 'Cincinnati Reds', city: 'Cincinnati', streamName: 'cincinnati-reds', color: '#C6011F' },
    { abbrev: 'CLE', name: 'Cleveland Guardians', city: 'Cleveland', streamName: 'cleveland-guardians', color: '#00385D' },
    { abbrev: 'COL', name: 'Colorado Rockies', city: 'Colorado', streamName: 'colorado-rockies', color: '#333366' },
    { abbrev: 'DET', name: 'Detroit Tigers', city: 'Detroit', streamName: 'detroit-tigers', color: '#0C2340' },
    { abbrev: 'HOU', name: 'Houston Astros', city: 'Houston', streamName: 'houston-astros', color: '#002D62' },
    { abbrev: 'KCR', name: 'Kansas City Royals', city: 'Kansas City', streamName: 'kansas-city-royals', color: '#004687' },
    { abbrev: 'LAA', name: 'Los Angeles Angels', city: 'Los Angeles', streamName: 'los-angeles-angels', color: '#BA0021' },
    { abbrev: 'LAD', name: 'Los Angeles Dodgers', city: 'Los Angeles', streamName: 'los-angeles-dodgers', color: '#005A9C' },
    { abbrev: 'MIA', name: 'Miami Marlins', city: 'Miami', streamName: 'miami-marlins', color: '#00A3E0' },
    { abbrev: 'MIL', name: 'Milwaukee Brewers', city: 'Milwaukee', streamName: 'milwaukee-brewers', color: '#12284B' },
    { abbrev: 'MIN', name: 'Minnesota Twins', city: 'Minnesota', streamName: 'minnesota-twins', color: '#002B5C' },
    { abbrev: 'NYM', name: 'New York Mets', city: 'New York', streamName: 'new-york-mets', color: '#002D72' },
    { abbrev: 'NYY', name: 'New York Yankees', city: 'New York', streamName: 'new-york-yankees', color: '#003087' },
    { abbrev: 'OAK', name: 'Oakland Athletics', city: 'Oakland', streamName: 'oakland-athletics', color: '#003831' },
    { abbrev: 'PHI', name: 'Philadelphia Phillies', city: 'Philadelphia', streamName: 'philadelphia-phillies', color: '#E81828' },
    { abbrev: 'PIT', name: 'Pittsburgh Pirates', city: 'Pittsburgh', streamName: 'pittsburgh-pirates', color: '#27251F' },
    { abbrev: 'SDP', name: 'San Diego Padres', city: 'San Diego', streamName: 'san-diego-padres', color: '#2F241D' },
    { abbrev: 'SFG', name: 'San Francisco Giants', city: 'San Francisco', streamName: 'san-francisco-giants', color: '#FD5A1E' },
    { abbrev: 'SEA', name: 'Seattle Mariners', city: 'Seattle', streamName: 'seattle-mariners', color: '#0C2C56' },
    { abbrev: 'STL', name: 'St. Louis Cardinals', city: 'St. Louis', streamName: 'st-louis-cardinals', color: '#C41E3A' },
    { abbrev: 'TBR', name: 'Tampa Bay Rays', city: 'Tampa Bay', streamName: 'tampa-bay-rays', color: '#092C5C' },
    { abbrev: 'TEX', name: 'Texas Rangers', city: 'Texas', streamName: 'texas-rangers', color: '#003278' },
    { abbrev: 'TOR', name: 'Toronto Blue Jays', city: 'Toronto', streamName: 'toronto-blue-jays', color: '#134A8E' },
    { abbrev: 'WSN', name: 'Washington Nationals', city: 'Washington', streamName: 'washington-nationals', color: '#AB0003' }
  ]
};

// Stream URL builder
const STREAM_BASE = 'https://v2.streameast.sk';

function buildStreamUrl(league, awayTeam, homeTeam) {
  return `${STREAM_BASE}/${league}/${awayTeam.streamName}-vs-${homeTeam.streamName}/`;
}

function getTeamByAbbrev(league, abbrev) {
  return TEAMS[league]?.find(t => t.abbrev === abbrev);
}

// Fetch games from APIs
async function fetchNHLGames() {
  try {
    const response = await fetch('https://api-web.nhle.com/v1/schedule/now');
    const data = await response.json();
    const games = [];
    
    // NHL API returns gameWeek array with dates
    for (const day of data.gameWeek || []) {
      for (const game of day.games || []) {
        games.push({
          league: 'nhl',
          gameId: game.id,
          startTime: new Date(game.startTimeUTC),
          homeTeam: game.homeTeam.abbrev,
          awayTeam: game.awayTeam.abbrev,
          homeTeamName: game.homeTeam.placeName?.default + ' ' + game.homeTeam.commonName?.default,
          awayTeamName: game.awayTeam.placeName?.default + ' ' + game.awayTeam.commonName?.default,
          state: game.gameState // FUT, LIVE, OFF, FINAL
        });
      }
    }
    return games;
  } catch (err) {
    console.error('Error fetching NHL games:', err);
    return [];
  }
}

async function fetchNBAGames() {
  try {
    // ESPN scoreboard endpoint
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard`);
    const data = await response.json();
    const games = [];
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;
      
      const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
      
      games.push({
        league: 'nba',
        gameId: event.id,
        startTime: new Date(event.date),
        homeTeam: homeTeam?.team?.abbreviation,
        awayTeam: awayTeam?.team?.abbreviation,
        homeTeamName: homeTeam?.team?.displayName,
        awayTeamName: awayTeam?.team?.displayName,
        state: event.status?.type?.name // STATUS_SCHEDULED, STATUS_IN_PROGRESS, STATUS_FINAL
      });
    }
    return games;
  } catch (err) {
    console.error('Error fetching NBA games:', err);
    return [];
  }
}

async function fetchMLBGames() {
  try {
    const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard`);
    const data = await response.json();
    const games = [];
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (!competition) continue;
      
      const homeTeam = competition.competitors?.find(c => c.homeAway === 'home');
      const awayTeam = competition.competitors?.find(c => c.homeAway === 'away');
      
      games.push({
        league: 'mlb',
        gameId: event.id,
        startTime: new Date(event.date),
        homeTeam: homeTeam?.team?.abbreviation,
        awayTeam: awayTeam?.team?.abbreviation,
        homeTeamName: homeTeam?.team?.displayName,
        awayTeamName: awayTeam?.team?.displayName,
        state: event.status?.type?.name
      });
    }
    return games;
  } catch (err) {
    console.error('Error fetching MLB games:', err);
    return [];
  }
}

async function fetchAllGames() {
  const [nhl, nba, mlb] = await Promise.all([
    fetchNHLGames(),
    fetchNBAGames(),
    fetchMLBGames()
  ]);
  return [...nhl, ...nba, ...mlb];
}

// Track which games we've already notified about
const notifiedGames = new Set();
const NOTIFIED_FILE = path.join(DATA_DIR, 'notified.json');

function loadNotified() {
  try {
    if (fs.existsSync(NOTIFIED_FILE)) {
      const data = JSON.parse(fs.readFileSync(NOTIFIED_FILE, 'utf8'));
      data.forEach(id => notifiedGames.add(id));
    }
  } catch (err) {
    console.error('Error loading notified games:', err);
  }
}

function saveNotified() {
  fs.writeFileSync(NOTIFIED_FILE, JSON.stringify([...notifiedGames]));
}

// Send ntfy notification
async function sendNotification(topic, title, message, url) {
  try {
    const response = await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Click': url,
        'Actions': `view, Watch Game, ${url}`,
        'Priority': 'high',
        'Tags': 'sports,tv'
      },
      body: message
    });
    console.log(`Notification sent to ${topic}: ${title}`);
    return response.ok;
  } catch (err) {
    console.error('Error sending notification:', err);
    return false;
  }
}

// Check for games and notify users
async function checkGamesAndNotify() {
  console.log('Checking for games...', new Date().toISOString());
  
  const games = await fetchAllGames();
  const users = loadUsers();
  const now = new Date();
  const BASE_URL = process.env.BASE_URL || 'https://game-stream-production.up.railway.app';
  
  for (const game of games) {
    const gameKey = `${game.league}-${game.gameId}`;
    
    // Skip if already notified
    if (notifiedGames.has(gameKey)) continue;
    
    // Check if game is starting (within 5 minutes of start time or already live)
    const timeDiff = game.startTime - now;
    const isStartingSoon = timeDiff <= 5 * 60 * 1000 && timeDiff >= -30 * 60 * 1000;
    const isLive = game.state === 'LIVE' || game.state === 'STATUS_IN_PROGRESS';
    
    if (!isStartingSoon && !isLive) continue;
    
    // Find users who follow these teams
    for (const [userId, user] of Object.entries(users)) {
      const followedTeams = user.teams?.[game.league] || [];
      
      if (followedTeams.includes(game.homeTeam) || followedTeams.includes(game.awayTeam)) {
        const homeTeamData = getTeamByAbbrev(game.league, game.homeTeam);
        const awayTeamData = getTeamByAbbrev(game.league, game.awayTeam);
        
        if (homeTeamData && awayTeamData) {
          const streamUrl = buildStreamUrl(game.league, awayTeamData, homeTeamData);
          // Use redirect URL so browser preference works
          const redirectUrl = `${BASE_URL}/go/${userId}?url=${encodeURIComponent(streamUrl)}`;
          const title = `${game.league.toUpperCase()}: ${game.awayTeamName} @ ${game.homeTeamName}`;
          const message = isLive ? 'Game is LIVE now!' : 'Game starting soon!';
          
          await sendNotification(user.ntfyTopic, title, message, redirectUrl);
        }
      }
    }
    
    // Mark as notified
    notifiedGames.add(gameKey);
  }
  
  saveNotified();
}

// Clear old notified games daily
function clearOldNotifications() {
  notifiedGames.clear();
  saveNotified();
  console.log('Cleared notification history');
}

// API Routes

// Get or create user
app.post('/api/user', (req, res) => {
  const { userId } = req.body;
  const users = loadUsers();
  
  if (userId && users[userId]) {
    // Return existing user
    return res.json({ userId, ...users[userId] });
  }
  
  // Create new user
  const newUserId = uuidv4();
  const ntfyTopic = `gamewatch-${newUserId.slice(0, 8)}`;
  
  users[newUserId] = {
    ntfyTopic,
    teams: { nhl: [], nba: [], mlb: [] },
    createdAt: new Date().toISOString()
  };
  
  saveUsers(users);
  res.json({ userId: newUserId, ...users[newUserId] });
});

// Update user teams
app.put('/api/user/:userId/teams', async (req, res) => {
  const { userId } = req.params;
  const { teams } = req.body;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Find newly added teams
  const oldTeams = users[userId].teams || {};
  const newlyAdded = {};
  
  for (const league of Object.keys(teams)) {
    const oldLeagueTeams = oldTeams[league] || [];
    const newLeagueTeams = teams[league] || [];
    const added = newLeagueTeams.filter(t => !oldLeagueTeams.includes(t));
    if (added.length > 0) {
      newlyAdded[league] = added;
    }
  }
  
  // Save the updated teams
  users[userId].teams = teams;
  saveUsers(users);
  
  // Check for live games with newly added teams
  if (Object.keys(newlyAdded).length > 0) {
    const allGames = await fetchAllGames();
    
    for (const game of allGames) {
      const isLive = game.state === 'LIVE' || game.state === 'STATUS_IN_PROGRESS';
      if (!isLive) continue;
      
      const addedInLeague = newlyAdded[game.league] || [];
      const isNewlyFollowed = addedInLeague.includes(game.homeTeam) || addedInLeague.includes(game.awayTeam);
      
      if (isNewlyFollowed) {
        const homeTeamData = getTeamByAbbrev(game.league, game.homeTeam);
        const awayTeamData = getTeamByAbbrev(game.league, game.awayTeam);
        
        if (homeTeamData && awayTeamData) {
          const streamUrl = buildStreamUrl(game.league, awayTeamData, homeTeamData);
          const title = `${game.league.toUpperCase()}: ${game.awayTeamName} @ ${game.homeTeamName}`;
          
          await sendNotification(users[userId].ntfyTopic, title, 'Game is LIVE now!', streamUrl);
        }
      }
    }
  }
  
  res.json({ success: true, teams });
});

// Update user browser preference
app.put('/api/user/:userId/browser', (req, res) => {
  const { userId } = req.params;
  const { browser } = req.body;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users[userId].browser = browser || 'default';
  saveUsers(users);
  res.json({ success: true, browser: users[userId].browser });
});

// Get user data
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ userId, ...users[userId] });
});

// Get all teams
app.get('/api/teams', (req, res) => {
  res.json(TEAMS);
});

// Get upcoming games for user's teams
app.get('/api/games/:userId', async (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const allGames = await fetchAllGames();
  const userTeams = users[userId].teams;
  const now = new Date();
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const relevantGames = allGames.filter(game => {
    const followedTeams = userTeams[game.league] || [];
    const isFollowed = followedTeams.includes(game.homeTeam) || followedTeams.includes(game.awayTeam);
    const isUpcoming = game.startTime <= oneDayFromNow;
    return isFollowed && isUpcoming;
  });
  
  // Add stream URLs
  const gamesWithUrls = relevantGames.map(game => {
    const homeTeamData = getTeamByAbbrev(game.league, game.homeTeam);
    const awayTeamData = getTeamByAbbrev(game.league, game.awayTeam);
    return {
      ...game,
      streamUrl: homeTeamData && awayTeamData ? buildStreamUrl(game.league, awayTeamData, homeTeamData) : null
    };
  });
  
  res.json(gamesWithUrls);
});

// Redirect endpoint - go directly to stream
app.get('/watch/:league/:gameId', async (req, res) => {
  const { league, gameId } = req.params;
  const allGames = await fetchAllGames();
  
  const game = allGames.find(g => g.league === league && g.gameId === gameId);
  
  if (!game) {
    return res.status(404).send('Game not found');
  }
  
  const homeTeamData = getTeamByAbbrev(league, game.homeTeam);
  const awayTeamData = getTeamByAbbrev(league, game.awayTeam);
  
  if (!homeTeamData || !awayTeamData) {
    return res.status(404).send('Team data not found');
  }
  
  const streamUrl = buildStreamUrl(league, awayTeamData, homeTeamData);
  res.redirect(streamUrl);
});

// Smart redirect - uses user's browser preference on Android, default on iOS
app.get('/go/:userId', (req, res) => {
  const { userId } = req.params;
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }
  
  const users = loadUsers();
  const user = users[userId];
  const browser = user?.browser || 'default';
  
  // Serve a page that detects Android and redirects appropriately
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    body {
      background: #1a1a2e;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #00d4ff;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Opening stream...</p>
  </div>
  <script>
    const url = ${JSON.stringify(url)};
    const browser = ${JSON.stringify(browser)};
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (isAndroid && browser !== 'default') {
      const intents = {
        'chrome': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.android.chrome;end',
        'firefox': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=org.mozilla.firefox;end',
        'brave': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.brave.browser;end',
        'edge': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.microsoft.emmx;end',
        'samsung': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.sec.android.app.sbrowser;end',
        'opera': 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.opera.browser;end'
      };
      
      if (intents[browser]) {
        window.location.href = intents[browser];
      } else {
        window.location.href = url;
      }
    } else {
      // iOS or default - just redirect
      window.location.href = url;
    }
  </script>
</body>
</html>
  `;
  
  res.send(html);
});

// Test notification endpoint
app.post('/api/test-notification/:userId', async (req, res) => {
  const { userId } = req.params;
  const users = loadUsers();
  
  if (!users[userId]) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const success = await sendNotification(
    users[userId].ntfyTopic,
    'Test Notification',
    'Your GameWatch notifications are working!',
    'https://ntfy.sh'
  );
  
  res.json({ success });
});

// Initialize
loadNotified();

// Check for games every 2 minutes
cron.schedule('*/2 * * * *', checkGamesAndNotify);

// Clear notification history at 6 AM daily
cron.schedule('0 6 * * *', clearOldNotifications);

// Run initial check on startup
setTimeout(checkGamesAndNotify, 5000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GameWatch server running on port ${PORT}`);
});
