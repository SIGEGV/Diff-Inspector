# 🚀 Railway Deployment - Quick Start

Your code is now Railway-ready! Follow these steps:

## Step 1: Push to GitHub

```bash
git add .
git commit -m "Railway deployment ready"
git push origin main
```

## Step 2: Deploy on Railway

### A. Go to Railway
1. Visit **[railway.app](https://railway.app)**
2. Click **"Login"** → Sign in with **GitHub**

### B. Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. Railway creates a service
5. Click the service → **"Settings"**
   - Root Directory: `backend`
6. Click **"Settings"** → **"Networking"**
   - Click **"Generate Domain"**
   - **COPY THE URL** (e.g., `https://backend-production-abc.up.railway.app`)

### C. Deploy Frontend
1. Go back to project (click project name)
2. Click **"+ New"** → **"GitHub Repo"** → Same repository
3. Click the new service → **"Settings"**
   - Root Directory: `frontend`
4. Click **"Variables"** tab
   - Add variable:
     - Name: `VITE_API_URL`
     - Value: Your backend URL (paste from step B)
5. Click **"Settings"** → **"Networking"**
   - Click **"Generate Domain"**

### D. Update Backend CORS (Optional but Recommended)
1. Copy your frontend URL from Railway
2. Edit `backend/main.py` line 20:
   ```python
   # Comment out this line after adding your frontend URL
   # allowed_origins.append("*")
   ```
3. Add your frontend URL to line 16:
   ```python
   allowed_origins = [
       "http://localhost:3000",
       "https://your-frontend-url.up.railway.app",  # Add this
   ]
   ```
4. Push changes:
   ```bash
   git add backend/main.py
   git commit -m "Update CORS"
   git push
   ```

## Step 3: Test! 🎉

Visit your frontend URL and test the diff checker!

## What Changed in Your Code?

✅ **Backend (`backend/main.py`):**
- Added dynamic CORS configuration
- Supports Railway environment variables
- Allows `*` for easy initial deployment (remove later)

✅ **Backend (`backend/Dockerfile`):**
- Uses Railway's `$PORT` environment variable
- Added curl for health checks

✅ **Frontend (`frontend/Dockerfile`):**
- Uses Vite preview server for Railway
- Supports dynamic `$PORT` from Railway
- Multi-stage build optimized

✅ **Frontend (`frontend/vite.config.ts`):**
- Already configured for Railway's dynamic ports

✅ **Configuration Files:**
- `backend/railway.json` - Railway backend config
- `frontend/railway.json` - Railway frontend config

## Troubleshooting

**Frontend can't connect to backend?**
- Check `VITE_API_URL` is set in Railway frontend variables
- Make sure it includes `https://`

**Build fails?**
- Check logs in Railway dashboard
- Verify Root Directory is set correctly

**Need help?**
- Check full guide: `RAILWAY_DEPLOYMENT_GUIDE.md`
- Railway docs: https://docs.railway.app

---

Your app is ready to deploy! 🚀
