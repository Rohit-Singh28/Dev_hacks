# 1v1 Duel Feature - Deployment Checklist

## ✅ Development Phase (COMPLETED)

- [x] Database schema designed and migrated
- [x] Backend matchmaking service implemented
- [x] Backend duel judge service implemented
- [x] Backend rating calculator (Elo) implemented
- [x] API routes created (13 endpoints)
- [x] WebSocket events implemented
- [x] Frontend queue page created
- [x] Frontend arena page with editor created
- [x] Frontend leaderboard page created
- [x] Frontend history page created
- [x] Navbar updated with duel link
- [x] TypeScript compilation: ✅ PASS (0 errors)
- [x] All services tested for basic functionality
- [x] Database migration applied successfully

## 🔧 Pre-Production Checklist

### Backend (`backend/`)
- [ ] Setup environment variables in `.env`:
  ```
  DATABASE_URL=<your-production-db>
  REDIS_URL=<your-production-redis>
  JWT_SECRET=<strong-secret-key>
  JUDGE0_API_URL=<judge0-instance>
  FRONTEND_URL=<your-frontend-domain>
  PORT=4000
  ```

- [ ] Run database migration in production:
  ```bash
  npm run migrate -- --skip-generate
  ```

- [ ] Verify all services are importable:
  ```bash
  npm run build
  ```

- [ ] Test with sample data:
  - Create test users with different ratings (800, 1200, 1600, 2000)
  - Verify queue matching algorithm
  - Test submission judgment
  - Verify rating updates

- [ ] Configure queue cleanup job:
  - Set up cron to clean expired queue entries (>30s)
  - Monitor queue entries in Redis

- [ ] Setup logging:
  - Add Winston logger for matchmaking events
  - Track duel creation/completion rates
  - Monitor API response times

- [ ] Verify Judge0 connection:
  - Test submission endpoint with sample code
  - Ensure test case execution works
  - Check timeout handling

### Frontend (`frontend/`)
- [ ] Update build configuration:
  ```bash
  npm run build
  ```

- [ ] Setup environment variables in `.env.production`:
  ```
  NEXT_PUBLIC_API_URL=<your-backend-url>
  ```

- [ ] Test production build locally:
  ```bash
  npm run build && npm run start
  ```

- [ ] Verify all pages render:
  - `/duels` - Queue page loads
  - `/duels/[duelId]` - Arena page loads with editor
  - `/duels/leaderboard` - Rankings display
  - `/duels/history` - History table renders

- [ ] Check WebSocket connection with production backend

- [ ] Verify responsive design on mobile

- [ ] Test error boundaries (network failures, etc.)

### Infrastructure

- [ ] Database:
  - [ ] Backup database before migration
  - [ ] Verify all indexes created:
    ```sql
    CREATE INDEX idx_users_rating ON users(rating);
    CREATE INDEX idx_duel_queues_multi ON duel_queues(timerOption, minRating, maxRating);
    CREATE INDEX idx_duels_status ON duels(status);
    CREATE INDEX idx_duel_participants_duel_user ON duel_participants(duelId, userId);
    ```

- [ ] Redis:
  - [ ] Confirm Redis running and accessible
  - [ ] Set max memory policy: `maxmemory-policy allkeys-lru`
  - [ ] Monitor Redis memory usage

- [ ] SSL/TLS:
  - [ ] Ensure HTTPS enabled on frontend
  - [ ] Verify WebSocket works over WSS (secure)

- [ ] Rate Limiting:
  - [ ] Verify global rate limit (100 req/min)
  - [ ] Verify submission rate limit (20 req/min)

## 🚀 Deployment Steps

### 1. Backend Deployment
```bash
cd backend

# Install production dependencies
npm install --production

# Build TypeScript
npm run build

# Run migration
npm run migrate -- --skip-generate

# Start server (use PM2 or similar for persistence)
pm2 start npm --name "duel-api" -- run start

# Or with Docker:
docker build -t duel-api .
docker run -d --name duel-api -e DATABASE_URL=... -e REDIS_URL=... duel-api
```

### 2. Frontend Deployment
```bash
cd frontend

# Install production dependencies
npm install --production

# Build Next.js
npm run build

# Deploy to Vercel (recommended):
vercel deploy --prod

# Or run locally:
npm run start
```

### 3. Database Migration
```bash
# SSH into production server
ssh user@server

# Navigate to backend
cd backend

# Run migration safely
npx prisma migrate deploy

# Verify migration applied
npx prisma db execute --stdin < verify-migration.sql
```

## 📊 Post-Deployment Verification

- [ ] API endpoints responding (test all 13 routes)
- [ ] Database connected and queries executing
- [ ] Redis cache operational
- [ ] WebSocket connections establishing
- [ ] Judge0 submissions processing
- [ ] Rating calculations accurate
- [ ] Leaderboard updating
- [ ] No errors in server logs
- [ ] No TypeScript errors on build

### Test Script
```bash
# Test key endpoints
curl -H "Auth: Bearer TOKEN" http://your-api/api/duels/queue/status
curl -H "Auth: Bearer TOKEN" http://your-api/api/duels/leaderboard
curl -H "Auth: Bearer TOKEN" http://your-api/api/duels/stats/my-stats
```

## 🔍 Monitoring & Maintenance

### Key Metrics to Track
- Queue matching time (target: <10s for similar ratings)
- Average duel completion time
- Judge0 submission processing time
- Database query performance
- Redis memory usage
- WebSocket connection count
- API error rates

### Regular Maintenance Tasks
- [ ] Daily: Review error logs
- [ ] Weekly: Check database indexes performance
- [ ] Weekly: Clear old duel queue entries
- [ ] Monthly: Analyze rating distribution
- [ ] Monthly: Review leaderboard integrity
- [ ] Quarterly: Archive completed duels to cold storage

## 🆘 Rollback Plan

If deployment fails:

1. **Database Rollback**
   ```bash
   # Rollback to previous migration
   npx prisma migrate resolve --rolled-back "20260221113526_add_duel_models"
   ```

2. **Code Rollback**
   - Revert commits that introduced duel features
   - Redeploy previous version

3. **Data Recovery**
   - Restore from pre-deployment database backup
   - Clear Redis cache

## ⚠️ Known Limitations

- Match queue expires after 30 seconds (can be extended in duelMatchmaking.ts)
- Max 100 leaderboard entries (can increase LIMIT)
- Rating floor at 800 (intentional)
- No seasonal resets (planned for future)
- Single Judge0 instance (scale to multiple if needed)

## 🎯 Success Metrics

After deployment, track:
- Active users in queues
- Duel completion rate (target: >90%)
- Average rating change per duel
- Queue wait time statistics
- Leaderboard accuracy
- User retention rate
- Feedback from early users

## 📞 Support Contacts

- **Backend Issues**: Check logs in `backend/logs/`
- **Database Issues**: Check `prisma/migrations/` and verify schema
- **Frontend Issues**: Check browser console for errors
- **Judge0 Issues**: Verify API key and endpoint URL
- **Redis Issues**: Check Redis CLI connection

## 📅 Timeline

- **Day 1**: Deploy backend, verify API
- **Day 1**: Deploy frontend, verify WebSocket
- **Day 1**: Internal testing with 5-10 users
- **Day 2**: Beta testing with 50-100 users
- **Day 3**: Monitor closely for issues
- **Day 7**: Full production launch if stable

## ✨ Final Checklist

- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] LoadBalancer/CDN configured
- [ ] SSL certificates valid
- [ ] Backup system tested
- [ ] Monitoring alerts configured
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Analytics integrated
- [ ] Documentation updated
- [ ] Team trained on deployment
- [ ] Rollback plan approved
- [ ] Go-live approval received

---

**Ready for Production**: ✅ When all items checked
