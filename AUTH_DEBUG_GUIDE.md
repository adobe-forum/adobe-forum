# Auth API Debug Guide

## Issues Found & Fixed

### 1. ✅ Enhanced Frontend Logging (cards-display.js)
- Added console logs to track when localStorage is being checked
- Added specific logs for session restore attempts
- Better error context when redirects happen back to auth-form

### 2. ✅ Session Middleware Configuration (app.js)
- Changed `saveUninitialized: false` → `true` to ensure sessions are created immediately
- Added validation warning if `MONGODB_URI` is not set
- Added debug middleware to log all requests and their session state

### 3. ✅ Auth Middleware Logging (middleware/auth.js)
- Added detailed logging of session IDs and user lookups
- Logs whether user was found in database
- Tracks authentication failures

### 4. ✅ Auth Endpoint Logging (routes/auth.js)
- `/me` endpoint now logs successful auth with user email
- Logs session ID and user ID for troubleshooting

---

## Test Flow & What to Look For

### Step 1: Check Backend is Running
```bash
npm run dev  # or whatever starts your server on port 5000
```

**Expected logs:**
```
✅ MongoStore connected to sessions collection
MongoDB connected
Server running on port 5000
```

**If you see:**
- `❌ MONGODB_URI not set!` → Set your MongoDB connection string in `.env`
- `⚠️ MongoStore error` → MongoDB connection failed

---

### Step 2: Register or Login & Watch Console

Open browser DevTools (F12) → Console tab and browser Network tab

**Login attempt - Frontend logs expected:**
```
✅ af_user found in localStorage, skipping session restore
// OR
📋 No af_user in localStorage, attempting to restore from session...
```

**Login attempt - Network tab:** Look for:
1. `POST /api/auth/login` → Response should have `Set-Cookie` header with `connect.sid`
2. After redirect, `GET /` should send cookie in request headers

**Backend console expected:**
```
📝 Request: POST /api/auth/login | Session ID: abc123xyz | User: none
✅ Session saved successfully for user: user@adobe.com
📝 Response headers will include: { 'Set-Cookie': 'connect.sid=...', ... }
📝 Request: GET / | Session ID: abc123xyz | User: abc123xyz
```

---

### Step 3: Verify Session Persistence

After login, the `/me` endpoint should work:

**Frontend** → Open console and run:
```javascript
fetch('/api/auth/me', { credentials: 'include' })
  .then(r => r.json())
  .then(d => console.log('Auth check:', d))
```

**Expected output:**
```
{success: true, user: {...}, loginAt: 1234567890}
```

**Backend logs expected:**
```
📝 Request: GET /api/auth/me | Session ID: abc123xyz | User: abc123xyz
✅ /me endpoint — authenticated user: user@adobe.com
```

**If you get 401:**
```
❌ requireAuth check: User ID from session: undefined
```
This means the session cookie wasn't sent or session wasn't saved to MongoDB.

---

## Common Issues & Solutions

### ❌ Issue: Getting 401 on `/me` after login
**Cause:** Session not persisted to MongoDB

**Solutions:**
1. Verify `MONGODB_URI` is set:
   ```bash
   echo $MONGODB_URI  # Should print connection string, not empty
   ```

2. Check MongoDB connection:
   ```bash
   # If using MongoDB Atlas, verify:
   # - IP whitelist includes your machine
   # - Connection string is correct
   # - Database/collection exists
   ```

3. Restart server after fixing env vars:
   ```bash
   Ctrl+C
   npm run dev  # Restart server
   ```

---

### ❌ Issue: localStorage is empty after login
**Cause:** Either login didn't succeed or redirect happened too fast

**Check in Network tab:**
- `POST /api/auth/login` response has `user` object with `_id`/`id` and `email`
- Response is status 200, not 401/500

**If response is failing:**
- Email format must be @adobe.com domain
- Password must be 8+ characters
- Account must exist (check MongoDB for existing user)

---

### ❌ Issue: Cookie not being sent in subsequent requests
**Cause:** CORS credentials issue

**Verify browser behavior:**
1. After login, check browser DevTools → Cookies
   - Should have `connect.sid` cookie (httpOnly)
   - Domain should be `localhost` (dev) or your domain (prod)

2. Check next request sends it:
   - Go to Network tab
   - Make any API call
   - Look for `Cookie: connect.sid=...` in request headers

**If missing:**
- Check your API calls include `credentials: 'include'`
- Verify server CORS allows credentials (should say `credentials: true`)

---

## Environment Variables Checklist

Create/update `.env` in server folder:
```env
MONGODB_URI=mongodb://localhost:27017/adobe-forum
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/adobe-forum

SESSION_SECRET=your-super-secret-key-change-in-production
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:3000
GMAIL_USER=your-email@gmail.com
GMAIL_PASS=your-app-password
```

---

## Quick Reset Test

If you're stuck, do this clean test:

1. **Clear all data:**
   ```bash
   # Drop MongoDB database
   # Or via Compass/Atlas UI: delete collections
   ```

2. **Restart everything:**
   ```bash
   Ctrl+C
   npm run dev  # Backend
   # In another terminal:
   npm run dev  # Frontend (usually aem up)
   ```

3. **Register new account:**
   - Go to http://localhost:3000/auth-form
   - Click Sign Up
   - Enter valid @adobe.com email
   - Set password (8+ chars)
   - Should see success message

4. **Watch console:**
   - Check backend logs for "Session saved successfully"
   - Check frontend logs for "af_user found in localStorage"

5. **Check final redirect:**
   - Should redirect to `/` (home page)
   - Should see post cards, not auth form

---

## Additional Debugging Commands

Check session in MongoDB:
```javascript
// Via MongoDB Shell
use adobe-forum
db.sessions.find().pretty()

// Should show document with:
// { _id: "session-id", session: { userId: "...", loginAt: ... }, ... }
```

Monitor logs in real-time:
```bash
npm run dev 2>&1 | grep -E "(✅|❌|⚠️|📝)"
```

