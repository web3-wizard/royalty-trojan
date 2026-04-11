# Quick Start: Deploy to Render

This is a fast track guide for deploying to Render. For detailed info, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🚀 5-Minute Setup

### 1. Create Redis Instance (2 min)
1. Go to [dashboard.render.com](https://dashboard.render.com)
2. **New** → **Redis**
3. Name: `royalty-trojan-cache`
4. Region: Choose closest to you
5. Click **Create Redis**
6. **Copy the Redis URL** (looks like: `redis://default:password@host:6379`)

### 2. Deploy Service (2 min)
1. Push code to GitHub: `git add . && git commit -m "deploy" && git push`
2. On Render: **New** → **Web Service**
3. Select your GitHub repository
4. Settings:
   - **Name**: `royalty-trojan-identity`
   - **Build**: `cd apps/identity-service && pnpm install && pnpm build`
   - **Start**: `node dist/server.js`
   - **Region**: Same as Redis
5. **Environment** tab → Add these:
   ```
   NODE_ENV=production
   REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:6379
   RATE_LIMIT_MAX=200
   ```
6. **Deploy**
7. Wait ~2 min → Copy service URL (e.g., `https://royalty-trojan-identity.onrender.com`)

### 3. Verify (1 min)
```bash
# Test health check
curl https://your-service-url/health

# Should return: {"status":"ok"}
```

---

## 📦 Configure Extension

1. Open extension in Chrome: `chrome://extensions`
2. Find "Royalty Trojan" → Click **Options**
3. Paste your service URL from Step 2
4. Click **Save Settings**

---

## ✅ Done!

Your extension now uses the deployed service. Test on YouTube/X/Twitch.

---

## 🐛 Troubleshooting

**Service won't start?**
- Check logs: Render dashboard → Logs tab
- Ensure `REDIS_URL` is correct format
- Verify Redis instance is running

**Health check fails?**
- Wait 1-2 min after deploy (startup delay)
- Check Redis connection in logs

**Extension can't reach service?**
- Verify service URL is correct (no trailing `/`)
- Check CORS is enabled (it is by default)
- Try from different machine to rule out local network issues

---

## 📚 Learn More

- [Full Deployment Guide](./DEPLOYMENT.md)
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)
- [GitHub Issues](https://github.com/your-repo/royalty-trojan/issues)

