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
| Styling | Vanilla CSS (component-scoped per block) |
| Design system | Adobe Spectrum 1 tokens |

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Auth | Session-based (`express-session`) |
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
```

---

## Environment
- Frontend dev: `http://localhost:3000` (AEM CLI)
- Backend API: `http://localhost:5000/api`
