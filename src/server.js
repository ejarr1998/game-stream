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
    { abbrev: 'ANA', name: 'Anaheim Ducks', city: 'Anaheim', streamName: 'anaheim-ducks' },
    { abbrev: 'ARI', name: 'Arizona Coyotes', city: 'Arizona', streamName: 'arizona-coyotes' },
    { abbrev: 'BOS', name: 'Boston Bruins', city: 'Boston', streamName: 'boston-bruins' },
    { abbrev: 'BUF', name: 'Buffalo Sabres', city: 'Buffalo', streamName: 'buffalo-sabres' },
    { abbrev: 'CGY', name: 'Calgary Flames', city: 'Calgary', streamName: 'calgary-flames' },
    { abbrev: 'CAR', name: 'Carolina Hurricanes', city: 'Carolina', streamName: 'carolina-hurricanes' },
    { abbrev: 'CHI', name: 'Chicago Blackhawks', city: 'Chicago', streamName: 'chicago-blackhawks' },
    { abbrev: 'COL', name: 'Colorado Avalanche', city: 'Colorado', streamName: 'colorado-avalanche' },
    { abbrev: 'CBJ', name: 'Columbus Blue Jackets', city: 'Columbus', streamName: 'columbus-blue-jackets' },
    { abbrev: 'DAL', name: 'Dallas Stars', city: 'Dallas', streamName: 'dallas-stars' },
    { abbrev: 'DET', name: 'Detroit Red Wings', city: 'Detroit', streamName: 'detroit-red-wings' },
    { abbrev: 'EDM', name: 'Edmonton Oilers', city: 'Edmonton', streamName: 'edmonton-oilers' },
    { abbrev: 'FLA', name: 'Florida Panthers', city: 'Florida', streamName: 'florida-panthers' },
    { abbrev: 'LAK', name: 'Los Angeles Kings', city: 'Los Angeles', streamName: 'los-angeles-kings' },
    { abbrev: 'MIN', name: 'Minnesota Wild', city: 'Minnesota', streamName: 'minnesota-wild' },
    { abbrev: 'MTL', name: 'Montreal Canadiens', city: 'Montreal', streamName: 'montreal-canadiens' },
    { abbrev: 'NSH', name: 'Nashville Predators', city: 'Nashville', streamName: 'nashville-predators' },
    { abbrev: 'NJD', name: 'New Jersey Devils', city: 'New Jersey', streamName: 'new-jersey-devils' },
    { abbrev: 'NYI', name: 'New York Islanders', city: 'New York', streamName: 'new-york-islanders' },
    { abbrev: 'NYR', name: 'New York Rangers', city: 'New York', streamName: 'new-york-rangers' },
    { abbrev: 'OTT', name: 'Ottawa Senators', city: 'Ottawa', streamName: 'ottawa-senators' },
    { abbrev: 'PHI', name: 'Philadelphia Flyers', city: 'Philadelphia', streamName: 'philadelphia-flyers' },
    { abbrev: 'PIT', name: 'Pittsburgh Penguins', city: 'Pittsburgh', streamName: 'pittsburgh-penguins' },
    { abbrev: 'SJS', name: 'San Jose Sharks', city: 'San Jose', streamName: 'san-jose-sharks' },
    { abbrev: 'SEA', name: 'Seattle Kraken', city: 'Seattle', streamName: 'seattle-kraken' },
    { abbrev: 'STL', name: 'St. Louis Blues', city: 'St. Louis', streamName: 'st-louis-blues' },
    { abbrev: 'TBL', name: 'Tampa Bay Lightning', city: 'Tampa Bay', streamName: 'tampa-bay-lightning' },
    { abbrev: 'TOR', name: 'Toronto Maple Leafs', city: 'Toronto', streamName: 'toronto-maple-leafs' },
    { abbrev: 'UTA', name: 'Utah Hockey Club', city: 'Utah', streamName: 'utah-hockey-club' },
    { abbrev: 'VAN', name: 'Vancouver Canucks', city: 'Vancouver', streamName: 'vancouver-canucks' },
    { abbrev: 'VGK', name: 'Vegas Golden Knights', city: 'Vegas', streamName: 'vegas-golden-knights' },
    { abbrev: 'WSH', name: 'Washington Capitals', city: 'Washington', streamName: 'washington-capitals' },
    { abbrev: 'WPG', name: 'Winnipeg Jets', city: 'Winnipeg', streamName: 'winnipeg-jets' }
  ],
  nba: [
    { abbrev: 'ATL', name: 'Atlanta Hawks', city: 'Atlanta', streamName: 'atlanta-hawks' },
    { abbrev: 'BOS', name: 'Boston Celtics', city: 'Boston', streamName: 'boston-celtics' },
    { abbrev: 'BKN', name: 'Brooklyn Nets', city: 'Brooklyn', streamName: 'brooklyn-nets' },
    { abbrev: 'CHA', name: 'Charlotte Hornets', city: 'Charlotte', streamName: 'charlotte-hornets' },
    { abbrev: 'CHI', name: 'Chicago Bulls', city: 'Chicago', streamName: 'chicago-bulls' },
    { abbrev: 'CLE', name: 'Cleveland Cavaliers', city: 'Cleveland', streamName: 'cleveland-cavaliers' },
    { abbrev: 'DAL', name: 'Dallas Mavericks', city: 'Dallas', streamName: 'dallas-mavericks' },
    { abbrev: 'DEN', name: 'Denver Nuggets', city: 'Denver', streamName: 'denver-nuggets' },
    { abbrev: 'DET', name: 'Detroit Pistons', city: 'Detroit', streamName: 'detroit-pistons' },
    { abbrev: 'GSW', name: 'Golden State Warriors', city: 'Golden State', streamName: 'golden-state-warriors' },
    { abbrev: 'HOU', name: 'Houston Rockets', city: 'Houston', streamName: 'houston-rockets' },
    { abbrev: 'IND', name: 'Indiana Pacers', city: 'Indiana', streamName: 'indiana-pacers' },
    { abbrev: 'LAC', name: 'Los Angeles Clippers', city: 'Los Angeles', streamName: 'los-angeles-clippers' },
    { abbrev: 'LAL', name: 'Los Angeles Lakers', city: 'Los Angeles', streamName: 'los-angeles-lakers' },
    { abbrev: 'MEM', name: 'Memphis Grizzlies', city: 'Memphis', streamName: 'memphis-grizzlies' },
    { abbrev: 'MIA', name: 'Miami Heat', city: 'Miami', streamName: 'miami-heat' },
    { abbrev: 'MIL', name: 'Milwaukee Bucks', city: 'Milwaukee', streamName: 'milwaukee-bucks' },
    { abbrev: 'MIN', name: 'Minnesota Timberwolves', city: 'Minnesota', streamName: 'minnesota-timberwolves' },
    { abbrev: 'NOP', name: 'New Orleans Pelicans', city: 'New Orleans', streamName: 'new-orleans-pelicans' },
    { abbrev: 'NYK', name: 'New York Knicks', city: 'New York', streamName: 'new-york-knicks' },
    { abbrev: 'OKC', name: 'Oklahoma City Thunder', city: 'Oklahoma City', streamName: 'oklahoma-city-thunder' },
    { abbrev: 'ORL', name: 'Orlando Magic', city: 'Orlando', streamName: 'orlando-magic' },
    { abbrev: 'PHI', name: 'Philadelphia 76ers', city: 'Philadelphia', streamName: 'philadelphia-76ers' },
    { abbrev: 'PHX', name: 'Phoenix Suns', city: 'Phoenix', streamName: 'phoenix-suns' },
    { abbrev: 'POR', name: 'Portland Trail Blazers', city: 'Portland', streamName: 'portland-trail-blazers' },
    { abbrev: 'SAC', name: 'Sacramento Kings', city: 'Sacramento', streamName: 'sacramento-kings' },
    { abbrev: 'SAS', name: 'San Antonio Spurs', city: 'San Antonio', streamName: 'san-antonio-spurs' },
    { abbrev: 'TOR', name: 'Toronto Raptors', city: 'Toronto', streamName: 'toronto-raptors' },
    { abbrev: 'UTA', name: 'Utah Jazz', city: 'Utah', streamName: 'utah-jazz' },
    { abbrev: 'WAS', name: 'Washington Wizards', city: 'Washington', streamName: 'washington-wizards' }
  ],
  mlb: [
    { abbrev: 'ARI', name: 'Arizona Diamondbacks', city: 'Arizona', streamName: 'arizona-diamondbacks' },
    { abbrev: 'ATL', name: 'Atlanta Braves', city: 'Atlanta', streamName: 'atlanta-braves' },
    { abbrev: 'BAL', name: 'Baltimore Orioles', city: 'Baltimore', streamName: 'baltimore-orioles' },
    { abbrev: 'BOS', name: 'Boston Red Sox', city: 'Boston', streamName: 'boston-red-sox' },
    { abbrev: 'CHC', name: 'Chicago Cubs', city: 'Chicago', streamName: 'chicago-cubs' },
    { abbrev: 'CHW', name: 'Chicago White Sox', city: 'Chicago', streamName: 'chicago-white-sox' },
    { abbrev: 'CIN', name: 'Cincinnati Reds', city: 'Cincinnati', streamName: 'cincinnati-reds' },
    { abbrev: 'CLE', name: 'Cleveland Guardians', city: 'Cleveland', streamName: 'cleveland-guardians' },
    { abbrev: 'COL', name: 'Colorado Rockies', city: 'Colorado', streamName: 'colorado-rockies' },
    { abbrev: 'DET', name: 'Detroit Tigers', city: 'Detroit', streamName: 'detroit-tigers' },
    { abbrev: 'HOU', name: 'Houston Astros', city: 'Houston', streamName: 'houston-astros' },
    { abbrev: 'KCR', name: 'Kansas City Royals', city: 'Kansas City', streamName: 'kansas-city-royals' },
    { abbrev: 'LAA', name: 'Los Angeles Angels', city: 'Los Angeles', streamName: 'los-angeles-angels' },
    { abbrev: 'LAD', name: 'Los Angeles Dodgers', city: 'Los Angeles', streamName: 'los-angeles-dodgers' },
    { abbrev: 'MIA', name: 'Miami Marlins', city: 'Miami', streamName: 'miami-marlins' },
    { abbrev: 'MIL', name: 'Milwaukee Brewers', city: 'Milwaukee', streamName: 'milwaukee-brewers' },
    { abbrev: 'MIN', name: 'Minnesota Twins', city: 'Minnesota', streamName: 'minnesota-twins' },
    { abbrev: 'NYM', name: 'New York Mets', city: 'New York', streamName: 'new-york-mets' },
    { abbrev: 'NYY', name: 'New York Yankees', city: 'New York', streamName: 'new-york-yankees' },
    { abbrev: 'OAK', name: 'Oakland Athletics', city: 'Oakland', streamName: 'oakland-athletics' },
    { abbrev: 'PHI', name: 'Philadelphia Phillies', city: 'Philadelphia', streamName: 'philadelphia-phillies' },
    { abbrev: 'PIT', name: 'Pittsburgh Pirates', city: 'Pittsburgh', streamName: 'pittsburgh-pirates' },
    { abbrev: 'SDP', name: 'San Diego Padres', city: 'San Diego', streamName: 'san-diego-padres' },
    { abbrev: 'SFG', name: 'San Francisco Giants', city: 'San Francisco', streamName: 'san-francisco-giants' },
    { abbrev: 'SEA', name: 'Seattle Mariners', city: 'Seattle', streamName: 'seattle-mariners' },
    { abbrev: 'STL', name: 'St. Louis Cardinals', city: 'St. Louis', streamName: 'st-louis-cardinals' },
    { abbrev: 'TBR', name: 'Tampa Bay Rays', city: 'Tampa Bay', streamName: 'tampa-bay-rays' },
    { abbrev: 'TEX', name: 'Texas Rangers', city: 'Texas', streamName: 'texas-rangers' },
    { abbrev: 'TOR', name: 'Toronto Blue Jays', city: 'Toronto', streamName: 'toronto-blue-jays' },
    { abbrev: 'WSN', name: 'Washington Nationals', city: 'Washington', streamName: 'washington-nationals' }
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
          const title = `${game.league.toUpperCase()}: ${game.awayTeamName} @ ${game.homeTeamName}`;
          const message = isLive ? 'Game is LIVE now!' : 'Game starting soon!';
          
          await sendNotification(user.ntfyTopic, title, message, streamUrl);
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
