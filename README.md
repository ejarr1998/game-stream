# GameWatch 🏟️

Get notified when your favorite teams play, with direct links to streams.

## Features

- **Multi-league support**: NHL, NBA, MLB
- **Push notifications**: Via ntfy.sh when games start
- **Direct stream links**: One tap to watch
- **No account needed**: Just a random ID stored locally
- **Upcoming games**: See games up to 24 hours in advance

## How It Works

1. User visits the site and selects teams to follow
2. User subscribes to their personal ntfy topic
3. Backend checks for games every 2 minutes
4. When a game starts, notification is sent with stream link
5. User taps notification → goes directly to stream

## Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect this repo or upload the files
3. Add a **Volume** mount:
   - Mount path: `/app/data`
   - This stores user preferences persistently
4. Set environment variable:
   - `DATA_DIR=/app/data`
5. Deploy!

## Local Development

```bash
npm install
npm run dev
```

Visit http://localhost:3000

## API Endpoints

### User Management
- `POST /api/user` - Get or create user (send `{ userId }` or empty for new)
- `GET /api/user/:userId` - Get user data
- `PUT /api/user/:userId/teams` - Update followed teams

### Games
- `GET /api/games/:userId` - Get upcoming games for user's teams
- `GET /api/teams` - Get all available teams

### Utilities
- `GET /watch/:league/:gameId` - Redirect to stream URL
- `POST /api/test-notification/:userId` - Send test notification

## Data Sources

- **NHL**: api-web.nhle.com (official NHL API)
- **NBA**: ESPN scoreboard API
- **MLB**: ESPN scoreboard API

## Stream URL Format

URLs are constructed as:
```
https://v2.streameast.sk/{league}/{away-team}-vs-{home-team}/
```

## Configuration

The stream base URL can be changed in `src/server.js` if the site changes domains.

## Notes

- Notifications are sent when games are within 5 minutes of starting or already live
- Each game only triggers one notification per user (tracked in notified.json)
- Notification history clears daily at 6 AM
- Games check runs every 2 minutes
