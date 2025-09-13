# Deployment Guide

This project requires two separate deployments:
1. **Frontend (Next.js)** → Vercel
2. **WebSocket Server** → Railway

## 1. Deploy WebSocket Server to Railway

### Option A: Using Railway CLI
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create new project: `railway new`
4. Create a new folder for server deployment:
   ```bash
   mkdir server-deploy
   cp server.js server-deploy/
   cp server-package.json server-deploy/package.json
   cp railway.json server-deploy/
   cp Procfile server-deploy/
   cd server-deploy
   ```
5. Deploy: `railway up`

### Option B: Using GitHub Integration
1. Create a new repository for just the server
2. Copy these files to the new repo:
   - `server.js`
   - `server-package.json` (rename to `package.json`)
   - `railway.json`
   - `Procfile`
3. Connect the repo to Railway
4. Deploy automatically

### Get your Railway URL
After deployment, Railway will provide a URL like: `https://your-app-name.railway.app`

## 2. Deploy Frontend to Vercel

1. Push your frontend code to GitHub
2. Connect your GitHub repo to Vercel
3. Add environment variable in Vercel dashboard:
   - Key: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://your-railway-app.railway.app` (your Railway URL)
4. Deploy

## 3. Update CORS in server.js

Before deploying, update the CORS origin in `server.js` to include your Vercel URL:

```javascript
cors: {
  origin: [
    "http://localhost:3000",
    "https://your-vercel-app.vercel.app", // Replace with your actual Vercel URL
    /\.vercel\.app$/
  ],
  methods: ["GET", "POST"],
  credentials: true
}
```

## 4. Test the Deployment

1. Visit your Vercel URL
2. Create a room and test the multiplayer functionality
3. Check Railway logs if there are any connection issues

## Environment Variables Summary

### Local Development (.env.local)
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Production (Vercel Environment Variables)
```
NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.railway.app
```