# CORS Debugging Checklist

## Frontend Configuration Issues

### 1. VITE_API_URL Environment Variable

- [ ] Is `VITE_API_URL` set in Vercel?
  - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
  - Should be: `https://jinsei-index-production.up.railway.app` (or your Railway URL)
  - **NOT** `https://jinsei-index-production.up.railway.app/api` (no `/api` suffix)
- [ ] Was the frontend redeployed after setting `VITE_API_URL`?
  - Vite environment variables are baked in at build time
  - Need to redeploy for changes to take effect
- [ ] Check browser console: What URL is actually being called?
  - Open DevTools → Network tab
  - Look at the actual request URL
  - Should be: `https://jinsei-index-production.up.railway.app/api/auth/login`

### 2. Frontend Code Issues

- [ ] Check `src/services/api.ts` - is it using `VITE_API_URL` correctly?
- [ ] Is the frontend making requests with `credentials: 'include'`?
  - Check the fetch calls in `api.ts`
- [ ] Are there any proxy configurations interfering?
  - Check `vite.config.ts` - proxy might be interfering in production

## Backend Configuration Issues

### 3. Railway Service Status

- [ ] Is the Railway service actually running?
  - Check Railway Dashboard → Service status (green/red indicator)
  - Check Railway logs - are there any errors?
- [ ] Is the Railway service accessible?
  - Try: `https://jinsei-index-production.up.railway.app/health` in browser
  - Should return: `{"status":"OK","message":"Server is running",...}`
- [ ] Is the Railway service responding to requests?
  - Check Railway logs when you try to login
  - Do you see any requests coming in?

### 4. Railway Environment Variables

- [ ] Is `MONGODB_URI` set correctly?
- [ ] Is `JWT_SECRET` set correctly?
- [ ] Is `ALLOWED_ORIGINS` set? (optional with current simple CORS config)
- [ ] Is `PORT` set? (Railway should set this automatically)

### 5. Railway Networking

- [ ] Does the service have a public domain?
  - Railway Dashboard → Service → Settings → Networking
  - Should have: `jinsei-index-production.up.railway.app`
- [ ] Is the domain correctly configured?
  - Check if there are any proxy/load balancer settings
- [ ] Is the port correctly exposed?
  - Railway should automatically expose the PORT

## CORS-Specific Issues

### 6. Preflight Request (OPTIONS)

- [ ] Is the OPTIONS request reaching the server?
  - Check Railway logs for `OPTIONS` requests
  - Should see: `OPTIONS /api/auth/login` in logs
- [ ] Is the OPTIONS request getting a response?
  - Check Railway logs - does it return 204?
  - Check browser Network tab - what status does OPTIONS get?

### 7. CORS Headers

- [ ] Are CORS headers being sent?
  - Check Railway logs - should see CORS middleware running
  - Check browser Network tab → Response Headers
  - Should see: `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, etc.
- [ ] Are the CORS headers correct?
  - `Access-Control-Allow-Origin` should match the request origin
  - `Access-Control-Allow-Credentials: true` should be present
  - `Access-Control-Allow-Methods` should include POST, OPTIONS

### 8. CORS Middleware Order

- [ ] Is CORS middleware before routes?
  - Check `backend/src/server.js` - CORS should be before `app.use("/api", routes)`
- [ ] Is CORS middleware handling OPTIONS?
  - The `cors` package should handle OPTIONS automatically
  - But we might need explicit OPTIONS handler

## Network/Infrastructure Issues

### 9. Railway Service Not Receiving Requests

- [ ] Are requests actually reaching Railway?
  - Check Railway logs when you try to login
  - If no logs appear, requests aren't reaching Railway
- [ ] Is there a firewall or network issue?
  - Railway might be blocking requests
  - Check Railway service settings

### 10. Browser/Client Issues

- [ ] Is the browser blocking the request?
  - Check browser console for full error message
  - Check Network tab for request details
- [ ] Are there browser extensions interfering?
  - Try in incognito/private mode
  - Disable extensions
- [ ] Is there a cached version of the frontend?
  - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
  - Clear browser cache

## Code Issues

### 11. Server Code

- [ ] Is CORS middleware actually running?
  - Check Railway logs for CORS-related messages
  - Add logging to verify CORS middleware is hit
- [ ] Is the server responding to requests?
  - Check Railway logs for any errors
  - Check if requests are reaching the routes

### 12. Route Configuration

- [ ] Are the routes correctly configured?
  - Check `backend/src/routes/index.js`
  - Are auth routes properly set up?
- [ ] Is the `/api` prefix correct?
  - Frontend calls: `/api/auth/login`
  - Backend should have: `app.use("/api", routes)`

## Testing Steps

### 13. Direct API Test

- [ ] Test Railway API directly (bypassing frontend):

  ```bash
  curl -X OPTIONS https://jinsei-index-production.up.railway.app/api/auth/login \
    -H "Origin: https://jinsei-index.vercel.app" \
    -H "Access-Control-Request-Method: POST" \
    -v
  ```

  - Should return 204 with CORS headers

- [ ] Test actual POST request:
  ```bash
  curl -X POST https://jinsei-index-production.up.railway.app/api/auth/login \
    -H "Origin: https://jinsei-index.vercel.app" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' \
    -v
  ```
  - Check response headers for CORS

### 14. Browser Network Tab Analysis

- [ ] Open browser DevTools → Network tab
- [ ] Try to login
- [ ] Check the OPTIONS request:
  - Status code? (should be 204)
  - Response headers? (should have CORS headers)
  - Request headers? (should have Origin header)
- [ ] Check the POST request:
  - Status code?
  - Response headers? (should have CORS headers)
  - Error message?

## Most Likely Issues (Based on Symptoms)

1. **VITE_API_URL not set or wrong in Vercel** - Frontend might be calling wrong URL
2. **Frontend not redeployed after setting VITE_API_URL** - Old build still has wrong URL
3. **Railway service not actually running** - Despite logs showing it's up
4. **OPTIONS requests not reaching server** - Network/firewall issue
5. **CORS middleware not running** - Code issue or middleware order

## Next Steps

1. Check Vercel environment variables first
2. Verify Railway service is actually running and accessible
3. Check browser Network tab for actual request details
4. Check Railway logs for incoming requests
5. Test API directly with curl to isolate frontend vs backend issue
