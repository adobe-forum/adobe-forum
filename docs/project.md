# Adobe Forum — Project Overview

## Summary

An internal Adobe community forum built on **Adobe Edge Delivery Services (EDS)**. It allows Adobe employees to create posts, request peer reviews, browse topics via a sidebar, and manage content through a Node.js/MongoDB backend. Review-gated publishing ensures quality and compliance before posts go live.

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Runtime | Adobe EDS (no build step) |
| UI framework | Preact + htm (via `vendor/`) |
| Hooks | `preact-hooks.js` (via `vendor/`) |
| Templating | Tagged template literals (`htm.bind(h)`) |
| Styling | Vanilla CSS with a centralized responsive layer in `styles/responsive.css` |
| Design system | Adobe Spectrum 1 tokens plus shared app color tokens in `styles/styles.css` |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Auth | Session-based (`express-session` with MongoDB store) |
| Dev server | AEM CLI (`hlx`) + Express on port 5000 |

---

## Key Features

- **Post creation** — Rich text editor with formatting, images, tables, code blocks
- **Review workflow** — Author submits post → selects reviewers → reviewers approve/request changes → post published
- **Sidebar navigation** — Hierarchical category/folder/post tree with live search
- **Pending reviews** — Reviewers see assigned posts in the sidebar
- **My Requests** — Authors track review status of their own posts
- **Authentication** — Login, register, forgot/reset password, session persistence
- **Draft recovery** — `sessionStorage` draft restore on refresh
- **Confidentiality gate** — Agreement dialog before submission

---

## Core Blocks

| Block | Purpose |
|---|---|
| `sidebar` | Fixed left panel: search, Home, Reviews section, Topics tree |
| `create-post` | Rich text editor + tags + category picker + review submission |
| `forum-post` | Read-only post viewer with review comments |
| `edit-post` | Edit existing post (mirrors create-post flow) |
| `cards-display` | Homepage post card grid |
| `auth-form` | Login / register / forgot-password overlay |
| `header` | Top navigation bar with hamburger toggle |
| `folder` | Category/folder picker modal (used by create-post) |
| `reset-password` | Password reset page |
| `search-bar` | Global search (separate from sidebar search) |
| `fragment` | EDS fragment loader |
| `footer` | Page footer |

---

## Server Structure

```
server/
  app.js            — Express app setup, middleware, route mounting
  index.js          — Server entry point
  models/
    Post.js         — Post schema
    Review.js       — Review schema (reviewers, status)
    SidebarItem.js  — Sidebar category/item schema
    user.js         — User schema (auth)
  routes/
    auth.js         — /api/auth/* (login, register, me, forgot/reset)
    posts.js        — /api/posts/* (CRUD)
    reviews.js      — /api/reviews/* (pending, my-requests, submit)
    sidebar.js      — /api/sidebar/* + /api/sidebar-items/*
    users.js        — /api/users (list for reviewer picker)
  middleware/
    auth.js         — Session validation and user loading
  helpers/
    mailer.js       — Email sending for password resets
```

---

## Environment
- Frontend dev: `http://localhost:3000` (AEM CLI)
- Backend API: `http://localhost:5000/api`

---

## Production Deployment (Render.com)

### Required Environment Variables
```env
# MongoDB
MONGODB_URI=<your-connection-string>

# Session security
SESSION_SECRET=<strong-random-secret>

# CORS & deployment
NODE_ENV=production
CLIENT_ORIGIN=<your-render-domain>  # Optional, defaults to same-origin
FORCE_SECURE=true  # Optional, force HTTPS cookies in non-prod

# Email (for password resets)
GMAIL_USER=<your-email>
GMAIL_PASS=<your-app-password>
```

### Important Notes

**Cross-Domain Setup (Adobe EDS + Render.com)**
- Frontend: `adobe-forum--adobe-forum.aem.live` (Adobe Edge Delivery Services)
- Backend: `adobe-forum-12iq.onrender.com` (Render.com API)
- Session cookie uses `SameSite: 'none'` in production to allow cross-domain authentication
- `Secure: true` flag is required when `SameSite: 'none'` is used (HTTPS only)
- This is NOT the same as same-origin authentication; it's an explicit cross-domain configuration

**Session & Cookie Configuration**
- CORS is automatically configured: dev allows `localhost:*`, production allows all origins
- `secure` flag set automatically in production (HTTPS only)
- Session cookies use:
  - `httpOnly: true` (JavaScript cannot access `document.cookie`)
  - `sameSite: 'none'` in production (cross-domain) / `'lax'` in dev
  - `path: '/'` (explicit for consistent cookie matching)
  - 30-minute TTL with MongoDB session store

**Infrastructure Requirements**
- Express-session with `proxy: true` trusts `X-Forwarded-Proto` from Render's load balancer
- MongoDB must have a TTL index on sessions collection (30-minute expiry)
- Browser privacy settings (Enhanced Tracking Prevention) must allow Set-Cookie for cross-domain

### Mobile Safari Support
- Authenticated user data is stored in **both** `localStorage` and `sessionStorage` for redundancy
- Safari iOS may clear localStorage due to ITP (Intelligent Tracking Prevention); sessionStorage fallback ensures auth persists
- Client-side Safari detection (user-agent) activates fallback logic only on mobile Safari
- If sessionStorage fallback is used in logs, check if Safari privacy settings are clearing localStorage

---

## Debugging & Troubleshooting

See [AUTH_DEBUG_GUIDE.md](../AUTH_DEBUG_GUIDE.md) for comprehensive authentication troubleshooting procedures, expected log output, and common issues/solutions.
