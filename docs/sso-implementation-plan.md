# Adobe IMS SSO — Implementation Status & Guide

> **For the team:** This document reflects the **actual current state** of the SSO integration in `adobe-forum`. Read this before touching any auth-related code.

---

## Overview

We have fully migrated from a local email/password authentication system to **Adobe IMS Single Sign-On**. The IMS integration is modelled after the `adobe-connect` project but with **stricter access enforcement** — no user can see any part of the forum without being signed in first.

**Client ID:** `adobeforum`
**IMS Environment:** `stg1` (staging) on local/dev, `prod` on production hosts

---

## What Has Been Done ✅

### 1. `scripts/config.js` — New file (created)
This is the IMS configuration entry point, modelled after `adobe-connect`'s `config.js`.

```javascript
const ims = {
  client_id: 'adobeforum',   // Our registered IMS client ID
  environment: isProd ? 'prod' : 'stg1',
};
```

It detects the host automatically to switch between staging and production IMS environments. The config is stored in `window.adobeforum.config` to avoid conflicts with other Adobe projects running on the same page.

---

### 2. `scripts/auth.js` — New file (created)
Contains two exported helper functions used across the application:

- **`isSignedInUser()`** — Calls `loadIms()` then checks `window.adobeIMS.isSignedInUser()`. Returns a boolean. Used for the page gate.
- **`getUserData()`** — Calls `window.adobeIMS.getProfile()` and returns `{ id, name }` from the IMS profile.

---

### 3. `scripts/scripts.js` — Modified
Two key additions:

**`loadIms()` function (exported):**
Dynamically injects the Adobe IMS library (`imslib.min.js`) into the document head. Sets up `window.adobeid` with our client ID, scopes, and redirect URI. Resolves when the IMS library fires `onReady`.

```javascript
scope: 'AdobeID,openid'         // gnav was removed — not provisioned for this client ID
redirect_uri: window.location.origin + '/'   // Returns user to forum after login
```

> **Why `AdobeID,openid` only?**
> We originally tried `AdobeID,openid,gnav` (copied from `adobe-connect`) which caused an `invalid_scope` error because `gnav` is **not registered** for the `adobeforum` client ID. Removed.

**`loadPage()` — gated with SSO check:**
```javascript
async function loadPage() {
  const { isSignedInUser } = await import('./auth.js');
  const isAuth = await isSignedInUser();
  if (!isAuth) {
    document.body.style.display = 'none'; // Prevent content flash
    window.adobeIMS.signIn();             // Redirect to IMS login
    return;                               // Stop block rendering entirely
  }
  await loadEager(document);
  await loadLazy(document);
}
```
This is what enforces the **zero read-only access** policy. If IMS says the user is not signed in, the page body is hidden and the user is pushed to the IMS login portal before a single block renders.

---

### 4. `blocks/header/header.js` — Modified
All places that previously redirected to `/auth-form` have been updated to use IMS:

| Old Behaviour | New Behaviour |
|---|---|
| `window.location.replace('/auth-form')` | `window.adobeIMS.signIn()` |
| Logout → redirect to `/auth-form` | `window.adobeIMS.signOut()` |
| Session expiry → redirect to `/auth-form` | `window.adobeIMS.signIn()` |

---

### 5. `blocks/cards-display/cards-display.js` — Modified

Two hardcoded issues were fixed:

| Issue | Fix |
|---|---|
| Duplicate local `AUTH_API_BASE` with placeholder production URL | Removed. Now imported from `scripts/utils/constants.js` |
| 401 fallback → `window.location.replace('/auth-form')` | Replaced with `window.adobeIMS.signIn()` |

---

### 6. `auth-form` block — Decommissioned
The entire `blocks/auth-form/` directory can be (and should be) deleted:
- `auth-form.js`
- `auth-form.css`
- `auth-api.js`

Also delete the AEM document page for `auth-form` from the content source (Google Drive / SharePoint) so the route stops being served entirely.

---

## What Still Needs to Be Done ⚠️

### 🔴 Critical: Register Redirect URIs in Adobe Developer Console
**This is currently blocking a working login redirect.**

After a successful IMS login, Adobe sends the user back to a `redirect_uri`. If that URI is not pre-registered in the **Adobe Developer Console** under the `adobeforum` OAuth app, Adobe sends the user to `https://www.adobe.com` instead.

A team member with **Adobe Developer Console access** must:
1. Go to [https://developer.adobe.com/console](https://developer.adobe.com/console)
2. Open the `adobeforum` project → OAuth credentials
3. Under **Redirect URIs**, add:
   - `http://localhost:3000/` (for local dev)
   - `https://main--adobe-forum--sdp00.aem.page/` (for staging/prod)

### 🟡 Backend: IMS Token Validation (Future)
Currently the Express backend (`server/middleware/auth.js`) validates a local session cookie. In a full SSO-only system, it should validate the **Adobe IMS bearer token** passed via the `Authorization` header instead of relying on local sessions. This step is not yet implemented and is a subsequent phase of work.

### 🟡 User Sync: IMS Profile → MongoDB
When a user signs in via IMS, `getUserData()` returns their `id` and `name`. A mechanism is needed to upsert this data into MongoDB so the forum can associate posts, reviews, and notifications with a real user record. Not yet implemented.

---

## How Authentication Flow Works Today

```
User visits any page
       ↓
loadPage() fires in scripts.js
       ↓
isSignedInUser() checks window.adobeIMS
       ↓
   Not signed in?             Signed in?
       ↓                          ↓
body hidden              loadEager() + loadLazy()
window.adobeIMS.signIn()     (normal page renders)
       ↓
IMS Login Portal
       ↓
Redirects back to redirect_uri (must be registered)
       ↓
loadPage() fires again → user is now signed in → page loads
```

---

## Files Changed Summary

| File | Change |
|---|---|
| `scripts/config.js` | **Created** — IMS config with `client_id: 'adobeforum'` |
| `scripts/auth.js` | **Created** — `isSignedInUser()`, `getUserData()` helpers |
| `scripts/scripts.js` | **Modified** — Added `loadIms()`, gated `loadPage()` with SSO check |
| `blocks/header/header.js` | **Modified** — All `/auth-form` redirects → IMS sign in/out |
| `blocks/cards-display/cards-display.js` | **Modified** — Removed duplicate `AUTH_API_BASE`, fixed 401 redirect |
| `blocks/auth-form/` | **To be deleted** — No longer needed |
