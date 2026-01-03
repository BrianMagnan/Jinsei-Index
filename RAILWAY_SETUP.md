# Railway Setup Guide

## Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended)
3. You'll get $5/month free credit

## Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `Jinsei Index`
4. Railway will detect it's a Node.js project

## Step 3: Configure the Service (IMPORTANT!)

1. After Railway creates the service, go to **Settings** → **Source**
2. Set **Root Directory** to: `backend`
   - This tells Railway to use the `backend` folder as the root
   - Railway will then find `backend/package.json` and `backend/package-lock.json`
3. Railway will automatically:
   - Detect `package.json` in the backend folder
   - Run `npm ci` (or `npm install` if lock file is missing)
   - Run `npm start` (from package.json)

## Step 4: Add Environment Variables

Go to your service → **Variables** tab and add:

### Required Variables:

- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Your JWT secret (same as Vercel)
- `ALLOWED_ORIGINS` - Comma-separated list:
  - `https://jinsei-index.vercel.app` (your Vercel frontend)
  - `http://localhost:8080` (for local development)
  - Add your Railway frontend URL later if you move it

### Optional:

- `PORT` - Railway sets this automatically, but you can override
- `NODE_ENV` - Set to `production`

## Step 5: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click "Deploy" in the Railway dashboard
3. Wait for deployment to complete (~2-3 minutes)

## Step 6: Get Your Backend URL

1. Go to your service → **Settings** → **Networking**
2. Click "Generate Domain" (or use the default)
3. Copy the URL (e.g., `https://your-app.up.railway.app`)

## Step 7: Update Frontend

1. Go to your Vercel project (or where frontend is hosted)
2. Go to **Settings** → **Environment Variables**
3. Add/Update: `VITE_API_URL` = `https://your-app.up.railway.app`
4. Redeploy frontend

## Step 8: Test

1. Try logging in/registering
2. Test creating categories, skills, challenges
3. Check Railway logs if there are issues

## Troubleshooting

### "npm ci" errors / package-lock.json out of sync?

- Make sure **Root Directory** is set to `backend` in Railway settings
- If still having issues, Railway will fall back to `npm install` automatically
- You can also manually run `npm install` in the backend folder locally and commit the updated `package-lock.json`

### Backend not starting?

- Check Railway logs: Service → Deployments → View Logs
- Verify environment variables are set
- Check that `backend/package.json` has `"start": "node src/server.js"`

### CORS errors?

- Make sure `ALLOWED_ORIGINS` includes your frontend URL
- Check that the frontend `VITE_API_URL` matches your Railway URL

### Database connection issues?

- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist (should have `0.0.0.0/0`)

## Cost

- Free tier: $5/month credit
- Usually enough for small apps
- Check usage in Railway dashboard
