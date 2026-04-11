# Deployment Checklist

## Pre-Deployment 

### Code Quality
- [ ] All TypeScript files pass type checking (`pnpm -F identity-service build`)
- [ ] No eslint errors
- [ ] All tests passing (if applicable)
- [ ] No `console.log` statements left in production code
- [ ] Environment variables properly configured

### Dependencies
- [ ] All dependencies listed in package.json
- [ ] No development dependencies in production build
- [ ] Lockfile (pnpm-lock.yaml) committed to git

### Security
- [ ] No secrets committed to git
- [ ] `.env.production.local` file is in `.gitignore`
- [ ] Redis password is strong (minimum 12 characters, mix of chars/numbers/symbols)
- [ ] No API keys hardcoded in source

---

## Identity Service Deployment (Render)

### Step 1: Prepare Redis
- [ ] Create Redis instance on Render
- [ ] Note connection string (Redis URL with password)
- [ ] Test connection: `redis-cli ping`

### Step 2: Deploy Service
- [ ] Push code to GitHub
- [ ] Connect Render to GitHub repository
- [ ] Create web service on Render
- [ ] Configure build command: `cd apps/identity-service && pnpm install && pnpm build`
- [ ] Configure start command: `node dist/server.js`
- [ ] Add environment variables:
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=3001`
  - [ ] `REDIS_URL=redis://...`
  - [ ] `RATE_LIMIT_MAX=200`
  - [ ] `RATE_LIMIT_WINDOW=1 minute`
  - [ ] `CACHE_TTL=3600`

### Step 3: Verify Deployment
- [ ] Service deployed successfully (check Render dashboard)
- [ ] Health check passing: `curl https://your-service-url/health`
- [ ] Resolve endpoint working: `curl "https://your-service-url/resolve?handle=test"`
- [ ] Error responses are appropriate (404 for not found, 500 for server errors)
- [ ] Redis connection established (check logs for messages)

### Step 4: Monitor
- [ ] Set up uptime monitoring (Render includes this)
- [ ] Monitor error logs for issues
- [ ] Track response times (should be <500ms)
- [ ] Check Redis memory usage (shouldn't grow unbounded)

---

## Extension Configuration

### Step 1: Build Extension
- [ ] Run `pnpm -F extension build`
- [ ] Check output in `apps/extension/dist/`
- [ ] All assets present (HTML, CSS, JS)

### Step 2: Update Service URL
- [ ] Open extension settings page (chrome://extensions → Royalty Trojan → Options)
- [ ] Is settings page displaying correctly?
- [ ] Can you enter and save a service URL?
- [ ] Is URL persisted in Chrome storage?

### Step 3: Test with Service URL
- [ ] Set extension to point to deployed Identity Service
- [ ] Test on YouTube/X/Twitch
- [ ] Verify creator detection working
- [ ] Verify domain extraction working
- [ ] Verify wallet resolution working
- [ ] Verify badge injection working

---

## Integration Testing

### YouTube
- [ ] Visit YouTube channel page
- [ ] Creator detected in console
- [ ] Subscribe button found
- [ ] Click subscribe → modal appears
- [ ] Domain extracted from About page
- [ ] Wallet resolved via Identity Service
- [ ] Modal shows creator info
- [ ] Can select tier and connect wallet
- [ ] Stream can be created

### X (Twitter)
- [ ] Visit creator profile page
- [ ] Creator detected
- [ ] Follow/Subscribe button found
- [ ] Click button → modal appears
- [ ] Domain extracted from bio link
- [ ] Wallet resolved
- [ ] Stream creation works

### Twitch
- [ ] Visit channel page
- [ ] Creator detected
- [ ] Subscribe button found
- [ ] Click button → modal appears
- [ ] Domain extracted from channel panels
- [ ] Wallet resolved
- [ ] Stream creation works

### Error Cases
- [ ] Missing wallet (no DNS/Nostr record) → Shows error message
- [ ] Phantom not installed → Shows install link
- [ ] Service unreachable → Shows error toast
- [ ] DNS fails, Nostr succeeds → Wallet resolved via fallback

---

## Performance Verification

### Load Times
- [ ] Extension loads in <2 seconds
- [ ] Badge injection doesn't block page
- [ ] Wallet resolution returns in <3 seconds (cached)
- [ ] First resolution (uncached) returns in <10 seconds

### Caching
- [ ] First resolution adds to cache
- [ ] Second resolution uses cache (<100ms)
- [ ] Cache expires after TTL
- [ ] Expired cache entries removed

### Memory
- [ ] Extension memory usage <50MB
- [ ] No memory leaks on long page sessions
- [ ] React components properly unmounted

---

## Production Readiness

### Security Audit
- [ ] CORS headers appropriate
- [ ] Rate limiting active
- [ ] No sensitive data in logs
- [ ] Redis connection encrypted (if cloud provider)
- [ ] Extension doesn't transmit data unnecessarily

### Monitoring & Alerting
- [ ] Render uptime monitoring configured
- [ ] Error logging enabled
- [ ] Slow query logging enabled
- [ ] Alert email configured for outages

### Documentation
- [ ] README updated with deployment info
- [ ] DEPLOYMENT.md is comprehensive
- [ ] Settings page help text is clear
- [ ] Example .env file provided

---

## Rollout Strategy

### Phased Rollout
- [ ] Deploy to staging environment (if available)
- [ ] Test with internal users first
- [ ] Beta release (25% of users)
- [ ] Monitor for 24 hours
- [ ] Full release (100% of users)

### Rollback Plan
- [ ] Document previous working version
- [ ] Know how to redeploy previous build
- [ ] Have backup database export
- [ ] Redis data backup prepared

---

## Post-Deployment

### Day 1
- [ ] Monitor error logs
- [ ] Check response times
- [ ] Verify cache hit rate
- [ ] Monitor Redis memory

### Week 1
- [ ] Collect user feedback
- [ ] Check for any regressions
- [ ] Monitor uptime
- [ ] Review performance metrics

### Ongoing
- [ ] Weekly cache hit rate review
- [ ] Monthly dependency updates
- [ ] Quarterly security audit
- [ ] Performance optimization as needed

---

## Deployment Complete! 🎉

Record deployment date and version:
- **Deployment Date**: _______________
- **Version**: _______________
- **Service URL**: _______________
- **Deployed By**: _______________
- **Notes**: ________________________________________________________________________

