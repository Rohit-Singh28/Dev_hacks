# 1v1 Code Duel System Documentation

## Overview

The 1v1 Code Duel feature enables users to compete against each other in real-time coding challenges. Two players at similar skill levels are matched together, given the same problem, and compete to solve it correctly within a timer (5 minutes, 30 minutes, or 1 hour). Winners gain rating points while losers lose points, creating a competitive ranking system.

## Architecture

### Backend (Node.js + Express)

#### Database Models (Prisma)

**Duel Model**
- Tracks duel sessions with status (WAITING, IN_PROGRESS, COMPLETED, ABANDONED)
- Links to a Problem and both DuelParticipants
- Records timer option (5/30mins/1hour) and start/end times
- Index on status and problemId for quick lookups

**DuelParticipant Model**
- One record per user in a duel
- Stores rating before and after the duel
- Links to final submission and determines winner (isWinner field)
- Tracks join time for tiebreaker in case of simultaneous submissions

**DuelQueue Model**
- Temporary records for users waiting for matchmaking
- Stores user ID, timer preference, and rating range
- Indexed for fast matching queries
- Auto-expires after 30 seconds

#### Key Services

**`duelMatchmaking.ts`** - Handles player matching
```typescript
- joinDuelQueue() - Add user to queue, attempt instant match
- findMatchingOpponent() - Find opponent within rating range (±100 points)
- createDuel() - Create duel with problem selection based on avg rating
- leaveDuelQueue() - Remove user from queue
- getQueueStatus() - Get queued player count by timer
```

**`duelJudge.ts`** - Manages submissions and winner determination
```typescript
- submitDuelCode() - Submit code for judging (delegates to submission queue)
- checkDuelCompletion() - Check if both users have submitted and been judged
- endDuel() - Determine winner and calculate rating changes
- getDuel() - Fetch duel with all details
- getUserActiveDuel() - Get current user's ongoing duel
```

**`ratingCalculator.ts`** - Elo rating system
```typescript
- updateUserRating() - Apply Elo formula: newRating = current + K*(result - expectedScore)
- getExpectedRatingChange() - Calculate without applying
- getUserRatingStats() - Fetch comprehensive duel statistics
- Uses K=32 (standard chess rating volatility)
- Floor rating at 800 points minimum
```

#### API Routes (`routes/duels.ts`)

**Queue Management**
- `POST /api/duels/queue/join` - Join queue with timer choice
- `POST /api/duels/queue/leave` - Leave queue
- `GET /api/duels/queue/status` - Get queue counts for all timers
- `GET /api/duels/queue/user-status` - Check if user is queued

**Submissions & Gameplay**
- `POST /api/duels/:duelId/submit` - Submit code (triggers judging via BullMQ)
- `GET /api/duels/:duelId` - Get duel details with participant info
- `GET /api/duels/active/current` - Get user's current active duel

**Statistics & History**
- `GET /api/duels/stats/my-stats` - Current user's rating and duel record
- `GET /api/duels/leaderboard` - Top 100 players by rating
- `GET /api/duels/history` - User's duel history with pagination

#### WebSocket Events (`websocket.ts`)

Real-time communication for duel interactions:

**Client → Server**
- `duel:join` - Join duel room
- `duel:leave` - Leave duel room
- `duel:code-update` - Share code changes (optional visualization)
- `duel:submission-received` - Notify submission acceptance

**Server → Client**
- `duel:started` - Both participants connected, match begins
- `duel:opponent-connected` - Other player joined
- `duel:opponent-disconnected` - Other player left
- `duel:opponent-code-update` - Opponent's code changes
- `duel:opponent-submitted` - Opponent submitted code
- `duel:timer-update` - Time remaining broadcast
- `duel:submission-update` - Verdict for own submission
- `duel:ended` - Match completed with results

### Frontend (Next.js 16 + React 19)

#### Pages

**`/duels`** - Main queue page
- Display user rating and duel statistics
- Three timer buttons: 5min, 30min, 1hour
- Show real-time queue counts for each timer
- Searching animation while matchmaking
- Cancel search button

**`/duels/[duelId]`** - Duel arena
- Split 3-column layout:
  - Left: Problem description and constraints
  - Center: Monaco code editor with language selector (Python/C++/Java)
  - Right: Sample test cases display
- Header shows:
  - Problem title and difficulty
  - Real-time countdown timer
  - Opponent name and rating
- Submit button to queue code for execution
- Results component shown after duel complete

**`/duels/leaderboard`** - Competitive rankings
- Top 100 players by rating with detailed stats
- Columns: Rank, Username, Rating, Total Duels, Wins, Losses, Win Rate
- Visual indicators (medals 🥇🥈🥉 for top 3)

**`/duels/history`** - Match history
- Paginated list of completed duels (20 per page)
- Problem name, difficulty, date
- Both participants with verdict and test passcount
- Result indicator (Victory/Defeat/Draw)
- Quick access to view detailed results

#### Components Integration

**API Calls** (`lib/api.ts`)
- Axios instance with automatic JWT attachment
- Interceptors handle 401 auth errors

**WebSocket Client** (`lib/socket.ts`)
- Socket.IO connection with JWT auth
- Maintains singleton connection
- Global room: `user:{userId}`, `duel:{duelId}`

#### Styling
- Tailwind CSS with dark theme (grays, purples, pinks)
- Gradient backgrounds for CTAs
- Responsive grid layouts
- Live timer display with monospace font
- Color-coded verdicts (green=accepted, red=error)

## Matchmaking Flow

1. User selects 5/30/1-hour timer on `/duels` page
2. `joinDuelQueue()` is called:
   - Add user to database queue with rating ±100 range
   - Store in Redis for quick access
3. Search for opponent in same tier:
   - Query database for queued users with overlapping rating ranges
   - Take oldest match (FIFO)
4. **If match found immediately:**
   - Create duel with random problem at difficulty tier
   - Delete both users from queue
   - Return duel ID to frontend
   - Redirect to `/duels/[duelId]`
5. **If no match (No opponent available):**
   - User stays in queue
   - Frontend shows "Finding Opponent..." with cancel option
   - Backend matches when next compatible player arrives
   - WebSocket notifies frontend when matched

## Duel Flow

1. Both players join duel room via WebSocket
2. Frontend receives problem statement
3. Players write code and submit
4. Submission → BullMQ worker (standard submission flow)
5. Worker executes via Judge0 against all test cases
6. When both users have verdicts:
   - `endDuel()` determines winner:
     - Both ACCEPTED → faster submission wins
     - One ACCEPTED → that player wins
     - Neither ACCEPTED → more tests passed wins
     - Tie in tests → draw (no rating change)
7. Elo ratings updated
8. Results page shown with rating deltas
9. WebSocket broadcasts `duel:ended` event

## Rating System (Elo)

### Formula
```
newRating = currentRating + K * (result - expectedScore)

expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
result = 1 if won, 0 if lost
K = 32 (constant volatility)
```

### Examples
- **Favored player wins**: Small rating gain (~3-8 points)
- **Underdog wins**: Large rating gain (~18-25 points)
- **Favored player loses**: Large rating loss (~18-25 points)
- **Underdog loses**: Small rating loss (~3-8 points)
- **Floor**: Minimum rating is 800

## Problem Selection

Problems are selected based on average rating of matched players:
- **Average Rating < 1400**: EASY problems
- **Average Rating 1400-1700**: MEDIUM problems
- **Average Rating >= 1700**: HARD problems

## Installation & Setup

### Backend

1. **Update environment variables** (`.env`)
   ```
   DATABASE_URL=mysql://user:pass@localhost:3306/dbname
   REDIS_URL=redis://localhost:6379
   ```

2. **Run migration**
   ```bash
   cd backend
   npm run migrate
   ```

3. **Start server**
   ```bash
   npm run dev
   ```

### Frontend

1. **Install dependencies** (already done)
   ```bash
   cd frontend
   npm install @uiw/react-codemirror
   ```

2. **Set environment variables** (`.env.local`)
   ```
   NEXT_PUBLIC_API_URL=http://localhost:4000
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

## Testing the Feature

### Manual Testing

1. **Queue & Match**
   - Open `/duels` in two different browsers/users
   - Both join 5-minute queue
   - Should be matched instantly
   - Both redirected to duel arena

2. **Solve & Submit**
   - Write code in arena
   - Click Submit
   - Should see verdict after Judge0 processes (5-10 sec)
   - When both submitted: see results page

3. **Check Results**
   - View rating change on results page
   - Visit `/duels/history` to see match record
   - Check `/duels/leaderboard` to verify rating updated

4. **Queue Timeout**
   - Join queue with one user
   - Wait 30+ seconds without second player
   - Queue entry auto-expires (can cancel early with button)

### Load Testing

For production, monitor:
- Queue matching latency (should be <100ms)
- WebSocket connection count
- Redis memory for queues
- Database query performance on duel lookups

## Future Enhancements

1. **Ladder Seasons** - Monthly ranked seasons with resets
2. **Team Duels** - 2v2 or 3v3 competitions
3. **Streaks** - Track consecutive wins/losses
4. **Achievements** - Badges for milestones (10 wins, 1st place, etc)
5. **Spectating** - Watch ongoing duels live
6. **Chat** - In-duel messaging between competitors
7. **Difficulty Preferences** - Let users set preferred difficulty range
8. **Replay** - Record and replay duel submissions
9. **Practice Mode** - Self-duel against previous opponents' solutions
10. **Mobile App** - React Native version for mobile competition

## Troubleshooting

### "Already in active duel" Error
- User already has running duel
- Check `/api/duels/active/current` and wait for it to finish or abandon

### Infinite "Finding Opponent" Loop
- No other players in queue at your rating tier
- Try different timer option
- Try later when more players active

### Submission Not Processing
- Judge0 connection issue
- Check `submissionQueue` worker logs
- Verify Redis connection

### Lost WebSocket Connection
- Network issue
- Socket.IO will auto-reconnect
- Check browser console for errors

### Rating Not Updating
- Database transaction failed
- Check backend logs for errors in `endDuel()`
- Verify user exists in database

## Performance Considerations

- **Queue Search**: O(1) average with index on (timerOption, ratingRange)
- **Duel Lookup**: O(1) on duelId
- **Leaderboard**: Cached and refreshed every 5 minutes
- **WebSocket**: Rooms scale with Redis pub/sub
- **Judge0**: Async via BullMQ to avoid blocking

## Security Notes

- All duel routes require authentication
- JWT validation on WebSocket connection
- Problem test cases hidden (isHidden=true never sent to client)
- Rate limiting on submissions (20/minute per user)
- Prevents cheating: results finalized server-side only
