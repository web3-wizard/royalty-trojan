# Deployment Guide

This guide covers deploying the Royalty Trojan application to production, including the Identity Service and Browser Extension configuration.

## Architecture Overview

```
   Browser Extension (Chrome/Firefox)
         ↓ (HTTP API calls)
   Identity Service (Fastify)
         ↓ (wallet cache, DNS queries)
   Redis (session cache)
   DNS Provider (DOH queries)
   Nostr Relays (NIP-05 resolution)
   Bags SDK API (revenue data)
```

---

## 7.1 Identity Service Deployment

### Overview
The Identity Service is a lightweight Fastify backend that:
- Resolves creator wallets via DNS TXT records (`bags:v1:creator=...`)
- Falls back to Nostr NIP-05 resolution
- Caches results in Redis
- Rate-limits requests
- Provides revenue and stream endpoints

### Deploy to Render

#### Step 1: Set Up Redis Instance

1. **Create Redis Database on Render**:
   - Go to [https://dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Redis"
   - Choose plan (Free tier: 30MB, paid: up to 1GB+)
   - Name: `royalty-trojan-cache`
   - Region: Choose closest to your users
   - Click "Create Redis"

2. **Note the Redis Connection String** (looks like):
   ```
   redis://default:YOUR_PASSWORD@redis-instance.us-east-1.render.com:6379
   ```

#### Step 2: Deploy Identity Service

1. **Push code to GitHub** (required by Render):
   ```bash
   git add .
   git commit -m "chore: prepare for deployment"
   git push
   ```

2. **Create Render Web Service**:
   - Go to [https://dashboard.render.com](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Select your GitHub repository
   - Choose `royalty-trojan` repo
   - Render should auto-detect root directory

3. **Configure Service Settings**:
   - **Name**: `royalty-trojan-identity`
   - **Environment**: Node
   - **Region**: Same as Redis instance
   - **Branch**: `main`
   - **Build Command**: 
     ```bash
     cd apps/identity-service && pnpm install && pnpm build
     ```
   - **Start Command**:
     ```bash
     node dist/server.js
     ```

4. **Add Environment Variables** in Render:
   - Click "Environment" tab
   - Add these variables:
     ```
     NODE_ENV=production
     PORT=3001
     REDIS_URL=redis://default:YOUR_PASSWORD@redis-instance.us-east-1.render.com:6379
     RATE_LIMIT_MAX=200
     RATE_LIMIT_WINDOW=1 minute
     CACHE_TTL=3600
     ```
   - Replace `YOUR_PASSWORD` with your Redis password from Step 1

5. **Deploy**:
   - Render automatically deploys on git push
   - Monitor deployment in dashboard
   - Once successful, service URL will be: `https://royalty-trojan-identity.onrender.com`

#### Troubleshooting Render Deployment

- **Build fails**: Ensure `pnpm` is available. Render defaults to npm. Add `.nvmrc` with `v18.18.0`
- **Redis connection fails**: Verify `REDIS_URL` format and password
- **Service crashes**: Check logs in Render dashboard for errors

---

### Deploy to Other Platforms

#### Railway
1. Connect GitHub repo
2. Add environment variables (same as above)
3. Set build command: `cd apps/identity-service && pnpm install && pnpm build`
4. Set start command: `node dist/server.js`

#### AWS EC2 + ElastiCache
1. Create EC2 instance (Ubuntu 22.04)
2. Create ElastiCache Redis cluster
3. Install Node.js, build identity-service
4. Set env vars and start with PM2 or systemd

#### Docker (Any Cloud)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN cd apps/identity-service && pnpm install && pnpm build
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

---

## 7.2 Extension Configuration

### Step 1: Update Service URL Configuration

The extension reads `IDENTITY_SERVICE_URL` from Chrome storage at runtime.

#### For Users
When users install the extension, they configure the service URL. Create a `settings.html` page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Royalty Trojan Settings</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 40px auto; }
    .setting { margin: 20px 0; }
    label { display: block; font-weight: bold; margin-bottom: 8px; }
    input { width: 100%; padding: 8px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    button:hover { background: #0052a3; }
    .status { margin-top: 10px; padding: 10px; border-radius: 4px; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <h1>⚙️ Royalty Trojan Settings</h1>
  
  <div class="setting">
    <label for="serviceUrl">Identity Service URL:</label>
    <input 
      type="text" 
      id="serviceUrl" 
      placeholder="https://royalty-trojan-identity.onrender.com"
      value="http://localhost:3001"
    />
    <small>Enter the URL of your deployed Identity Service</small>
  </div>
  
  <button id="saveBtn">Save Settings</button>
  <div id="status"></div>

  <script>
    document.getElementById('saveBtn').addEventListener('click', () => {
      const url = document.getElementById('serviceUrl').value.trim();
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showStatus('Error: URL must start with http:// or https://', 'error');
        return;
      }

      chrome.storage.sync.set({ IDENTITY_SERVICE_URL: url }, () => {
        showStatus('✅ Settings saved successfully!', 'success');
      });
    });

    function showStatus(message, type) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;
    }

    // Load current setting
    chrome.storage.sync.get('IDENTITY_SERVICE_URL', (result) => {
      if (result.IDENTITY_SERVICE_URL) {
        document.getElementById('serviceUrl').value = result.IDENTITY_SERVICE_URL;
      }
    });
  </script>
</body>
</html>
```

#### Add to Extension Manifest

Edit `apps/extension/public/manifest.json`:
```json
{
  "options_page": "settings.html",
  "action": {
    "default_title": "Royalty Trojan Settings"
  }
}
```

#### View the Settings Page
1. In Chrome, go to `chrome://extensions/`
2. Find "Royalty Trojan" extension
3. Click "Options" → Configure service URL

### Step 2: Build and Deploy Extension

#### For Chrome Web Store
1. **Build**: 
   ```bash
   pnpm -F extension build
   ```

2. **Create manifest.json updates** (if not done):
   - Add `options_page: "settings.html"`
   - Set version number higher than current (e.g., 1.1.0)
   - Fill in icons, screenshots (1280x800px minimum)

3. **Package extension**:
   - Go to `apps/extension/dist/`
   - Zip all contents (don't zip the folder itself)

4. **Upload to Chrome Web Store**:
   - Go to [https://chrome.google.com/webstore/developer/dashboard](https://chrome.google.com/webstore/developer/dashboard)
   - Click "New Item"
   - Upload zip file
   - Add descriptions, screenshots, privacy policy

---

## 7.3 Environment Variables Reference

### Identity Service (`.env.production`)

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `NODE_ENV` | Yes | `production` | App environment |
| `PORT` | No | `3001` | Server port |
| `REDIS_URL` | Yes | `redis://default:pass@host:6379` | Redis connection |
| `RATE_LIMIT_MAX` | No | `200` | Max requests per window |
| `RATE_LIMIT_WINDOW` | No | `1 minute` | Rate limit window |
| `CACHE_TTL` | No | `3600` | Wallet cache time-to-live (seconds) |

### Extension (Chrome Storage)

| Key | Type | Example | Purpose |
|-----|------|---------|---------|
| `IDENTITY_SERVICE_URL` | string | `https://royalty-trojan-identity.onrender.com` | Identity Service endpoint |

---

## 7.4 Production Checklist

- [ ] **Identity Service**
  - [ ] Redis instance created and tested
  - [ ] Environment variables configured
  - [ ] Service deployed and health check passing (`GET /health` → `{"status":"ok"}`)
  - [ ] Rate limiting configured for expected load
  - [ ] DNS resolution working (test via: `curl "https://service-url/resolve?domain=example.com"`)

- [ ] **Extension**
  - [ ] Build passes (`pnpm -F extension build` succeeds)
  - [ ] Settings page created and working
  - [ ] Service URL configured in user's extension
  - [ ] Tested wallet resolution on YouTube/X/Twitch
  - [ ] Tested stream creation with Phantom wallet

- [ ] **Security**
  - [ ] CORS origins restricted (if not using `origin: true`)
  - [ ] Redis password complexity verified
  - [ ] No sensitive data in git history
  - [ ] Rate limits appropriate for traffic

- [ ] **Monitoring**
  - [ ] Error logging enabled (Fastify logger)
  - [ ] Redis connection monitored
  - [ ] Uptime monitoring configured (Render provides this)

---

## 7.5 Scaling and Optimization

### Redis Optimization
- Upgrade plan if cache hits drop below 70%
- Monitor memory usage: `redis-cli INFO memory`

### Service Optimization
- Enable compression on Render (automatic)
- Monitor request latency: `slower than 200ms = investigate`
- Add CDN for DNS queries (CloudFlare DOH in client)

### Extension Optimization
- Keep lazy-loading for React components
- Monitor cache hit rate (in browser console)
- Test on slow connections (Chrome DevTools → Network → Slow 3G)

---

## 7.6 Rollback and Disaster Recovery

### Rollback on Render
1. Go to deployment history
2. Click previous deployment
3. Click "Redeploy"

### Redis Data Backup
```bash
# Export Redis data
redis-cli --rdb /path/to/backup.rdb

# Restore from backup
redis-cli --pipe < backup.rdb
```

---

## 7.7 Monitoring and Logs

### View Render Logs
- Render Dashboard → Service → Logs
- Filter by timestamp for errors

### Monitor Identity Service
```bash
# Health check
curl https://your-service-url/health

# Test wallet resolution
curl "https://your-service-url/resolve?handle=satoshi"

# Get revenue data
curl "https://your-service-url/revenue?wallet=9B5X8e3..."
```

### Extension Debugging
- Chrome DevTools → Extensions → Service Worker logs
- Check `chrome://extensions` for errors

---

## Support & Troubleshooting

### Common Issues

**Q: "Failed to resolve creator wallet" errors**
- Check Identity Service is running: `curl <service-url>/health`
- Verify Redis connection: Check logs for Redis errors
- Test DNS resolution manually

**Q: High latency on wallet resolution**
- Enable Redis caching (TTL should be 3600+)
- Check rate limiter settings
- Upgrade Redis plan if needed

**Q: Extension settings not persisting**
- Use Chrome DevTools → Application → Storage → Sync Storage
- Verify stored URL: `chrome.storage.sync.get('IDENTITY_SERVICE_URL', console.log)`

---

## Next Steps

1. **Deploy Identity Service** to Render following 7.1
2. **Configure Extension Service URL** following 7.2
3. **Run end-to-end tests** on YouTube, X, Twitch
4. **Monitor production** for errors and performance

