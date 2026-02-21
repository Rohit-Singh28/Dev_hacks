# CodeArena — System Architecture

## High-Level Architecture Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│  Browser (Next.js SSR + CSR)                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Problem Page │  │ Contest Page │  │  Scoreboard  │                  │
│  │ Monaco Editor │  │ Timer + Probs│  │  Live Table  │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │ REST + WS        │ REST + WS       │ REST + WS               │
└─────────┼──────────────────┼─────────────────┼──────────────────────────┘
          │                  │                 │
          ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER (nginx / ALB)                      │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Backend (Node)  │ │  Backend (Node)  │ │  Backend (Node)  │
│  Express + WS    │ │  Express + WS    │ │  Express + WS    │
│  Stateless       │ │  Stateless       │ │  Stateless       │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
     │   Redis      │ │  PostgreSQL  │ │    BullMQ        │
     │  (Cache +    │ │  (Neon)      │ │  Submission      │
     │   Pub/Sub)   │ │              │ │  Queue           │
     └──────────────┘ └──────────────┘ └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │  BullMQ Workers  │
                                        │  (Judge Pipeline)│
                                        └────────┬─────────┘
                                                 │
                                                 ▼
                                        ┌──────────────────┐
                                        │    Judge0 API    │
                                        │  (CE / Self-host)│
                                        │  Sandboxed exec  │
                                        └──────────────────┘
```

---

## Stack Choices

### Frontend: Next.js 16 (App Router) + React 19
- **Why**: SSR for SEO on problem listings, CSR for interactive editor pages
- **State**: Zustand (lightweight, no boilerplate)
- **Code Editor**: Monaco Editor (@monaco-editor/react) — same engine as VS Code
- **Real-time**: Socket.IO client for submission updates + scoreboard
- **Styling**: Tailwind CSS 4

### Backend: Node.js + Express + TypeScript
- **Why**: Fastest iteration speed, excellent WebSocket ecosystem, non-blocking I/O ideal for Judge0 polling
- **ORM**: Prisma (type-safe queries, Neon-compatible, prevents SQL injection by design)
- **Queue**: BullMQ on Redis (reliable job processing, retries, priority queues)
- **Auth**: JWT (stateless, scales horizontally)
- **Validation**: Zod (runtime type checking on all API inputs)

### Database: PostgreSQL on Neon
- Serverless PostgreSQL — scales connections automatically
- Connection pooling via Neon's built-in pgbouncer

### Real-time: Socket.IO (WebSocket with fallback)
- **Why over SSE**: Bidirectional — clients can join/leave contest rooms
- **Scaling**: Redis adapter for multi-instance pub/sub

---

## API Design

### Auth
```
POST /api/auth/register     { username, email, password }     → { user, token }
POST /api/auth/login        { usernameOrEmail, password }     → { user, token }
GET  /api/auth/me           [Auth]                            → { user }
```

### Problems
```
GET  /api/problems           ?page&limit&difficulty&search    → { problems[], pagination }
GET  /api/problems/:slug     [OptAuth]                        → { problem, userSubmissions[] }
```
- **NEVER returns hidden test cases** — query filters `isHidden: false`

### Submissions
```
POST /api/submissions/run    [Auth] { problemId, language, sourceCode, contestId? }
                             → 202 { submissionId, status: "PENDING" }

POST /api/submissions/submit [Auth] { problemId, language, sourceCode, contestId? }
                             → 202 { submissionId, status: "PENDING" }

GET  /api/submissions/:id    [Auth, owner-only]               → { submission }
GET  /api/submissions        [Auth] ?problemId&contestId&page → { submissions[], pagination }
```

### Contests
```
GET  /api/contests                     ?status&page           → { contests[], pagination }
GET  /api/contests/:slug               [OptAuth]              → { contest, isRegistered }
POST /api/contests/:slug/register      [Auth]                 → { message }
GET  /api/contests/:slug/scoreboard                           → { scoreboard[] }
GET  /api/contests/:slug/problems/:label [OptAuth]            → { contestProblem }
```

### Utility
```
GET  /health                                                   → { status, timestamp }
GET  /api/time                                                 → { serverTime }
```

---

## Database Access Strategy

### Query Strategy
1. **Selective loading**: Every query uses `select` to fetch only needed columns
2. **Eager loading with `include`**: Related data loaded in single query (e.g., problem + visible test cases)
3. **Pagination**: All list endpoints use cursor-less offset pagination with configurable limits (max 50)

### Preventing N+1 Queries
- Scoreboard: Single `findMany` with `distinct` to get all ACs, then build lookup map in memory
- Contest problems: Single `include` loads problem data alongside contest-problem join
- User submissions on problem page: Parallel `Promise.all` for problem + submissions

### Indexing Strategy
```sql
-- Composite indexes for hot query paths
@@index([problemId, isHidden])           -- test cases: filter by problem + visibility
@@index([contestId, score, penalty])     -- scoreboard sorting
@@index([userId, problemId])             -- user's submissions for a problem
@@index([contestId, userId, problemId])  -- contest submission lookups
@@index([createdAt])                     -- recent submissions
@@index([slug])                          -- all slug lookups (O(1))
```

### Concurrent Submission Handling
- **Idempotent writes**: Upserts for contest participant scores
- **Optimistic concurrency**: BullMQ processes one job per submission ID
- **Rate limiting**: 10-second cooldown per user per problem (DB check)
- **Atomic score updates**: Recalculate total score from scratch on each AC (no incremental drift)

---

## Submission Flow

```
User clicks "Run Code" or "Submit Solution"
         │
         ▼
┌─────────────────────────┐
│  POST /submissions/run  │  or /submit
│  - Validate input (Zod) │
│  - Verify auth (JWT)    │
│  - Check rate limit     │
│  - If contest: verify   │
│    ACTIVE + registered  │
│  - Create Submission    │
│    record (PENDING)     │
│  - Enqueue to BullMQ    │
│  - Return 202 + ID     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│    BullMQ Worker        │
│  - Update → RUNNING     │
│  - Emit WS "RUNNING"   │
│  - Fetch test cases:    │
│    run → visible only   │
│    submit → ALL         │
│  - Fetch problem limits │
│  - Build Judge0 batch   │
│    (base64 encoded)     │
│  - Submit batch (≤20)   │
│  - Poll results         │
│    (exp backoff 1-5s)   │
│  - Map verdicts         │
│  - Update Submission    │
│  - If contest AC →      │
│    update score         │
│  - Emit WS final result │
└─────────────────────────┘
```

### Judge0 Integration Details
- **Batch API**: Up to 20 test cases per request (splits larger sets)
- **Base64 encoding**: All source code + I/O base64-encoded to prevent injection
- **Polling with backoff**: 1s → 1.5s → 2.25s → ... → 5s cap, 60s total timeout
- **Resource limits**: `cpu_time_limit` and `memory_limit` forwarded from problem config
- **Verdict mapping**: Judge0 status IDs → platform's Verdict enum

---

## Contest System Logic

### State Machine
```
UPCOMING ──(startTime reached)──► ACTIVE ──(endTime reached)──► ENDED
```
- **Contest status worker**: Polls every 5 seconds, batch-updates statuses
- **WebSocket events**: `contest-started`, `contest-ended` emitted to room

### Timer Synchronization
- Server exposes `/api/time` endpoint
- Client calculates clock offset: `serverTime - clientTime`
- All countdown timers compensated by offset
- Contest start/end enforced server-side (client timers are cosmetic)

### Submission Locking Rules
- **Before start**: API rejects with "Contest has not started yet"
- **After end**: API rejects with "Contest has ended"
- **Not registered**: API rejects with "Not registered for this contest"
- **Server-side enforcement**: All checks happen in API layer, not client

### Scoreboard Computation
- **ICPC-style scoring**: Total points + penalty
- Penalty = solve time (seconds from start) + 20 minutes per wrong attempt
- Score recalculated from scratch on each AC (prevents drift)
- Final rankings computed when contest transitions to ENDED

### Anti-Cheating Measures
- Problems hidden until contest starts (API enforced)
- Source code stored for each submission (plagiarism detection possible)
- Rate limiting prevents brute-force testing
- Hidden test cases never exposed via any API endpoint

---

## Security Design

### Hidden Test Case Protection
- **Database layer**: API queries always filter `isHidden: false` for client-facing responses
- **Judge layer**: Worker fetches all test cases server-side, results for hidden cases show `[hidden]`
- **No client exposure**: Hidden inputs/outputs never leave the server process

### SQL Injection Prevention
- **Prisma ORM**: All queries are parameterized by design — no raw SQL
- **Zod validation**: All inputs validated before reaching database layer

### Code Abuse / Infinite Loops
- **Judge0 sandboxing**: Isolated container per execution
- **Time limits**: `cpu_time_limit` enforced by Judge0 (kills process)
- **Memory limits**: `memory_limit` enforced by Judge0 (OOM kill)
- **Source code size limit**: 100KB max (validated by Zod)

### Rate Limiting
```
Global:         100 req/min per IP (express-rate-limit)
Submissions:    20 req/min per IP
Per-problem:    1 submit per 10 seconds per user per problem (DB check)
Contest priority: contest submissions get BullMQ priority 1 (normal = 5)
```

### Other Security
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Restrict to frontend origin
- **JWT**: Signed tokens, no sensitive data in payload
- **bcrypt**: 12 rounds for password hashing
- **Input validation**: All endpoints validate with Zod schemas

---

## Scalability Strategy

### Horizontal Scaling
```
┌─────────────────────────────────────┐
│           Load Balancer             │
├──────────┬──────────┬───────────────┤
│ Backend 1│ Backend 2│  Backend N    │  ← Stateless, scale freely
└──────────┴──────────┴───────────────┘
         │
┌────────┴────────┐
│   Redis Cluster │  ← BullMQ queues + Socket.IO adapter + cache
└─────────────────┘
         │
┌────────┴────────┐
│  Neon PostgreSQL│  ← Auto-scaling serverless, built-in connection pooling
└─────────────────┘
```

### Key Design Decisions
1. **Stateless backends**: No in-memory state — all shared state in Redis/PG
2. **Queue-based judging**: Decouples HTTP response from Judge0 latency
3. **Redis pub/sub**: Socket.IO Redis adapter enables WS across instances
4. **Neon auto-scaling**: Connection pooling handles burst traffic

### Capacity Model
- **BullMQ concurrency**: 5 jobs per worker instance, rate-limited to 10/sec
- **Judge0 batching**: 20 test cases per API call reduces overhead
- **Priority queue**: Contest submissions prioritized over practice

### Under Heavy Load (1000+ concurrent users)
1. Scale backend instances behind LB (sticky sessions for WS)
2. Scale BullMQ workers independently (separate process/container)
3. Redis cluster for queue + pub/sub throughput
4. Neon auto-scales connections (no manual pooling needed)
5. Judge0 self-hosted: deploy multiple Judge0 workers for throughput

---

## Minimal UI Layout

### Pages
1. **Home** (`/`): Landing with CTA links
2. **Login/Register** (`/login`, `/register`): Simple form pages
3. **Problems List** (`/problems`): Table with difficulty filter
4. **Problem Detail** (`/problems/:slug`): Split-panel — description left, Monaco editor + results right
5. **Contests List** (`/contests`): Cards with status badges
6. **Contest Detail** (`/contests/:slug`): Timer + problem table
7. **Contest Problem** (`/contests/:slug/problems/:label`): Same as problem detail + contest timer
8. **Scoreboard** (`/contests/:slug/scoreboard`): Live ranking table

### Problem Page Layout (LeetCode-style)
```
┌────────────────────────────────┬────────────────────────────────┐
│          Description           │      Language Selector         │
│                                ├────────────────────────────────┤
│  Title, Difficulty, Limits     │                                │
│                                │      Monaco Code Editor        │
│  Problem Statement             │                                │
│                                │                                │
│  Constraints                   │                                │
│                                ├──────────────────── ───────────┤
│  Example Test Cases            │   [ ▶ Run Code ] [ ✓ Submit ] │
│                                ├────────────────────────────────┤
│  Previous Submissions          │      Results Panel             │
│                                │  Verdict | Test Cases | Output │
└────────────────────────────────┴────────────────────────────────┘
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- Redis server running on localhost:6379
- Neon PostgreSQL database (or local PG)
- Judge0 CE API key (RapidAPI) or self-hosted Judge0

### Backend
```bash
cd backend
cp .env.example .env           # Fill in DATABASE_URL, REDIS_URL, JUDGE0 keys
npm install
npx prisma generate
npx prisma db push             # Push schema to Neon
npm run db:seed                # Seed sample data
npm run dev                    # Start on port 4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev                    # Start on port 3000
```

### Test Accounts (after seeding)
- `alice` / `password123` (rating: 1500)
- `bob` / `password123` (rating: 1200)
