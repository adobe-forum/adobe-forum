# Adobe Forum — Architectural Decisions

> **Rule:** Add an entry here whenever a significant design decision is made or changed.

## [2026-04-13] Mobile Safari Session & Storage Fallback

### Context
After production deployment to Render.com, authentication was failing specifically on **Safari iOS** (mobile), redirecting users back to login even after successful authentication. Desktop Safari and all other browsers worked correctly. Root causes: (1) Safari's Intelligent Tracking Prevention (ITP) can clear localStorage for privacy, (2) `sameSite='none'` can fail on older Safari versions for same-origin cookies, (3) no fallback storage mechanism.

### Decisions Made

**1. Changed sameSite policy from 'none' to 'lax' for better Safari compatibility**
- **Why**: `sameSite='none'` is designed for cross-origin cookies but can fail on older Safari iOS versions for same-origin cookies
- **Solution**: Use `sameSite='lax'` for both dev and production (same-origin is safer and more compatible)
- **Trade-off**: Slightly less restrictive than 'strict', but works reliably across all Safari versions

**2. Explicit cookie path and domain for Safari same-origin handling**
- Added `path: '/'` to cookie config for explicit cookie matching on mobile Safari
- Set `domain: undefined` to let browser handle domain naturally for same-origin cookies (more reliable on Safari)

**3. Dual-storage fallback: localStorage + sessionStorage**
- Store authenticated user data in **both** localStorage and sessionStorage after login
- On load, check both storages; restore from sessionStorage fallback if localStorage is missing (Safari ITP may clear it)
- Mobile Safari detection via user-agent; activate fallback logic only on Safari iOS (`/iPhone|iPad|iPod/` + `/Safari/` + `!/Chrome/`)
- Clear sessionStorage only on actual auth failure (401), not on app restart

### Files Changed
- `server/app.js` — Changed `sameSite: 'none'` → `'lax'`, added explicit `path: '/'` and `domain: undefined`
- `blocks/cards-display/cards-display.js` — Updated `restoreClientAuthFromSession()` to store in both storages, added Safari fallback in `decorate()` function
- `blocks/auth-form/auth-form.js` — Updated `storeClientAuthState()` and login handler to store in both localStorage and sessionStorage

### Testing Checklist for Safari iOS
- On Safari iOS, login and verify no redirect to auth-form
- Check browser storages (via DevTools in Xcode): both localStorage and sessionStorage should contain user data
- Reload page → should stay authenticated (sessionStorage fallback should work)
- Check DevTools Network tab: `Cookie` header should be present on `/api/auth/me` request
- Verify `connect.sid` cookie has `Secure` flag set

---

## [2026-04-13] Production Session & CORS Configuration for Render.com

### Context
After deploying to Render.com, users were redirected to login immediately after successful authentication. Sessions were being created in development but failing in production. Root causes: (1) CORS wasn't configured to allow same-origin deployment, (2) session cookie sameSite was too strict for cross-origin auth, (3) no proxy trust for HTTPS termination.

### Decisions Made

**1. CORS dynamic configuration for dev vs production**
- **Development**: Whitelist `localhost:3000` and `localhost:5000` only
- **Production**: Allow all origins with credentials (Render.com same-domain deployment handles origin)
- **Both**: Explicitly allow credentials, OPTIONS preflight, Content-Type and Authorization headers

**2. Session cookie security-aware SameSite policy**
- **Development**: `sameSite: 'lax'` (allows same-site cookies)
- **Production**: `sameSite: 'none'` with `secure: true` (allows cross-origin cookies via HTTPS)
- Combined with `httpOnly: true` to prevent XSS access to session token
- `proxy: true` on express-session to trust `X-Forwarded-Proto` header from Render.com

**3. Enhanced debug logging for production troubleshooting**
- Log session ID, user ID, and cookie presence on every request
- Verbose CORS configuration logging on startup with NODE_ENV indicator
- Session cookie config logged at startup for verification

### Files Changed
- `server/app.js` — CORS dynamic config, session proxy trust, debug logging
- `server/middleware/auth.js` — existing logging for user lookup verification
- `server/routes/auth.js` — existing session save logging

### Testing Checklist for Production
- Verify `NODE_ENV=production` is set on Render.com
- Check Render.com logs for "🌐 CORS configured" and "🔐 Session cookie config"
- Browser DevTools → Cookies: should show `connect.sid` with `Secure` flag (HTTPS only)
- After login, subsequent `/api/auth/me` calls should include `Cookie` header

---

## [2026-04-13] Session Persistence and Auth Debugging

### Context
Users were being redirected back to `/auth-form` immediately after successful login. Investigation revealed two critical issues: (1) express-session was configured with `saveUninitialized: false`, preventing sessions from persisting to MongoDB immediately after login, and (2) lack of comprehensive logging made troubleshooting unclear.

### Decisions Made

**1. Enable immediate session persistence with `saveUninitialized: true`**
Changed session middleware configuration in `server/app.js` to `saveUninitialized: true`. This ensures that a session object is created and persisted to MongoDB on the first request, before any user data is stored. This is critical for login flow: after `POST /api/auth/login` succeeds and stores `userId` in the session, the session is immediately written to the database. Subsequent requests (like `GET /api/auth/me`) can then retrieve it reliably.

**2. Add comprehensive auth flow logging**
Implemented detailed logging across the authentication chain:
- `server/app.js`: Debug middleware logs every request with session ID and userId
- `server/middleware/auth.js`: Logs session validation, user lookup success/failure
- `server/routes/auth.js`: Logs successful `/me` endpoint calls with user email and session ID
- `blocks/cards-display.js`: Logs localStorage state, session restore attempts, and redirect reasons

This logging enables developers to trace auth failures from client to server without guessing.

**3. Added validation for missing environment configuration**
Server now warns if `MONGODB_URI` is not set, preventing silent session store failures. Sessions require MongoDB to persist; without the URI set, all auth attempts fail with misleading 401 responses.

**4. Created AUTH_DEBUG_GUIDE.md**
A standalone troubleshooting guide with:
- Step-by-step test procedures
- Expected log output at each stage
- Common issues and solutions
- MongoDB session inspection commands
- Environment variable checklist

### Files Changed
- `server/app.js` — session config + debug middleware + env validation
- `server/middleware/auth.js` — detailed session/user lookup logging
- `server/routes/auth.js` — `/me` endpoint logging
- `blocks/cards-display.js` — enhanced session restore logging
- `AUTH_DEBUG_GUIDE.md` — new troubleshooting documentation

---

## [2026-04-08] SPA Router and Shareable Post URLs

### Context
Users were being redirected back to `/auth-form` immediately after successful login. Investigation revealed two critical issues: (1) express-session was configured with `saveUninitialized: false`, preventing sessions from persisting to MongoDB immediately after login, and (2) lack of comprehensive logging made troubleshooting unclear.

### Decisions Made

**1. Enable immediate session persistence with `saveUninitialized: true`**
Changed session middleware configuration in `server/app.js` to `saveUninitialized: true`. This ensures that a session object is created and persisted to MongoDB on the first request, before any user data is stored. This is critical for login flow: after `POST /api/auth/login` succeeds and stores `userId` in the session, the session is immediately written to the database. Subsequent requests (like `GET /api/auth/me`) can then retrieve it reliably.

**2. Add comprehensive auth flow logging**
Implemented detailed logging across the authentication chain:
- `server/app.js`: Debug middleware logs every request with session ID and userId
- `server/middleware/auth.js`: Logs session validation, user lookup success/failure
- `server/routes/auth.js`: Logs successful `/me` endpoint calls with user email and session ID
- `blocks/cards-display.js`: Logs localStorage state, session restore attempts, and redirect reasons

This logging enables developers to trace auth failures from client to server without guessing.

**3. Added validation for missing environment configuration**
Server now warns if `MONGODB_URI` is not set, preventing silent session store failures. Sessions require MongoDB to persist; without the URI set, all auth attempts fail with misleading 401 responses.

**4. Created AUTH_DEBUG_GUIDE.md**
A standalone troubleshooting guide with:
- Step-by-step test procedures
- Expected log output at each stage
- Common issues and solutions
- MongoDB session inspection commands
- Environment variable checklist

### Files Changed
- `server/app.js` — session config + debug middleware + env validation
- `server/middleware/auth.js` — detailed session/user lookup logging
- `server/routes/auth.js` — `/me` endpoint logging
- `blocks/cards-display.js` — enhanced session restore logging
- `AUTH_DEBUG_GUIDE.md` — new troubleshooting documentation

---

## [2026-04-08] SPA Router and Shareable Post URLs

### Context
Post navigation was already SPA-like inside the homepage, but it depended on custom events and temporary session storage instead of stable URLs. That meant refresh and share-link behavior for an individual forum post was inconsistent, and different entry points (`cards-display`, `sidebar`, `header`) were using different navigation patterns.

### Decisions Made

**1. Client routing is centralized in `scripts/router.js`**
A lightweight router now owns URL parsing, `history.pushState` / `replaceState`, `popstate`, and route broadcasting. Blocks should react to a single route source instead of duplicating pathname logic.

**2. Post detail URLs use `/?post=<id>`**
The canonical post route is now `/?post=<postId>`, where `postId` is the backend Mongo `_id` already returned by `/api/posts` and accepted by `/api/posts/:id`. Using the guaranteed homepage entry avoids EDS page-resolution issues on fresh tabs while keeping the URL shareable everywhere.

**3. Legacy navigation inputs are kept as compatibility shims**
Existing `sessionStorage('af_open_post')`, `?openPost=...`, and `load-forum-post` / `show-cards` event flows are translated into the new router so current sidebar and header navigation keep working while the URL model becomes canonical.

---

## [2026-04-08] Shared Color Token System

### Context
The application still had repeated hardcoded colors across block CSS and inline JS markup even after responsive behavior was centralized. That made consistency updates harder, especially in shared UI such as header state, forum-post code badges, and review banners.

### Decisions Made

**1. Shared colors live in `styles/styles.css`**
A global `--color-*` palette now owns application-level text, surface, border, status, code, and shadow values. Spectrum aliases remain available, but app styling should resolve through the shared color layer first.

**2. JS color usage is centralized in `scripts/utils/colors.js`**
When block JS needs inline colors for SVGs or status UI, it should import from `scripts/utils/colors.js` instead of embedding raw literals.

**3. Blocks can keep local semantic aliases**
Files like `forum-post.css` can still define local aliases for language badges or review states, but those aliases should point back to shared global tokens instead of repeating literal colors in selectors.

---

## [2026-04-08] Responsive System Fix — Centralized responsive.css with EDS-safe load order

### Context
Mobile styles were breaking after block-level `@media` rules were centralized into `styles/responsive.css`. In Adobe EDS, global styles load first, but each block stylesheet is injected later when the block is decorated. That meant centralized responsive rules could be missing entirely if they were not migrated, and even when present they could still be overridden by the later-loaded block base CSS.

### Decisions Made

**1. Centralized responsive rules stay in `styles/responsive.css`**
Responsive rules for `sidebar`, `header`, `create-post`, `edit-post`, `cards-display`, `auth-form`, `search-bar`, `footer`, and `forum-post` are kept in one global stylesheet so the application has a single responsive source of truth.

**2. Non-canonical breakpoints normalized**
| Old value | Normalized to | Affected file |
|-----------|--------------|---------------|
| `440px` | `480px` (xs) | `auth-form.css` — 2-col form collapses to 1-col |
| `600px` | `768px` (sm) | `auth-form.css` card padding; `cards-display.css` grid 1-col |
| `900px` | `1024px` (md) | `footer.css` padding; `styles.css` gutter |

**3. EDS load order is corrected centrally**
`styles/responsive.css` is loaded as a dedicated stylesheet by the client and re-appended after block CSS loads. This keeps the centralized responsive layer last in the cascade, including the sidebar CSS path that is loaded manually from `header.js`.

**4. CSS limitation acknowledged**
CSS custom properties cannot be used inside `@media` expressions. All pixel values remain literals in CSS. `BREAKPOINTS` in `scripts/utils/constants.js` and the comment header in `responsive.css` remain the documented source of truth.

---

## [2026-04-08] ArrowIcon Moved to Global Icon Library

### Context
`forum-post.js` defined `ArrowIcon` (the Spectrum 18×18 send arrow) locally with a comment saying "ArrowIcon remains local". This violated the project convention of all icons living in `scripts/utils/icons.js`.

### Decision
Added `ArrowIcon` as a named export in `scripts/utils/icons.js` under the *Navigation & Actions* section. `forum-post.js` now imports it alongside `BackIcon`, `EditIcon`, `HeartIcon`. The local definition and its stale comment are removed.

---

## [2026-04-07] Global Refactor — Icon Centralization, Constants & Responsive Utilities

### Context
The codebase had 13+ SVG icon types defined inline and duplicated across 6 block JS files (`sidebar.js`, `header.js`, `forum-post.js`, `folder.js`, `cards-display.js`, `search-bar.js`). Similarly, the API base URL `http://localhost:5000/api` was hardcoded in at least 4 files, and breakpoints were scattered across 50+ `@media` instances with no shared reference.

### Decisions Made

**1. `scripts/utils/icons.js` — Single Source for all Icons**
All icon SVG components are now exported from one canonical file. Blocks import by name (e.g., `import { TrashIcon, ChevronIcon } from '../../scripts/utils/icons.js'`). Icons accept a `size` prop to allow flexible sizing without SVG duplication. The `IcoFolderPlus` and `IcoEmptyBox` in `folder.js` remain locally defined as they are highly specific to that component and have no reuse candidates.

**2. `scripts/utils/constants.js` — Single Source for API & Configuration**
`API_BASE`, `AUTH_API_BASE`, `BREAKPOINTS`, `Z_INDEX`, and `SPACING` are exported from one file. This eliminates environment-specific URL literals being hardcoded in multiple components and provides a single place to swap the production API URL on deployment.

**3. `styles/responsive.css` — Canonical Breakpoint Documentation**
A new global stylesheet documents the three canonical breakpoints (`xs: 480px`, `sm: 768px`, `md: 1024px`) and provides shared utility classes (`.hide-mobile`, `.hide-desktop`). This file is imported via `@import` at the bottom of ``styles/styles.css``. CSS custom properties cannot be used inside `@media` query expressions (a CSS spec limitation), so block CSS files still use literal pixel values — but all values are documented in one authoritative place.

---

## [2026-04-02] Sidebar Empty State ("No items yet") Alignment


### Context
The "No items yet" placeholder used in empty folders was slightly misaligned (by about 2px) relative to actual file items because its left indentation was arbitrarily hardcoded to `paddingLeft + 40px`.

### Implementation vs Hardcoding
Instead of manually tweaking the offset padding to `+ 42px` (which breaks if CSS gaps or icon SVG widths ever change), the `.no-items-subfolder` div was rewritten to structurally mimic a real `TreeItem`. It now renders inside the identical `.tree-item-content` flex container, utilizing the same `.tree-chevron-spacer`, flex `gap`, and an invisible `FileIcon` (`visibility: hidden`).

This `structural reuse` design ensures pixel-perfect alignment under all circumstances, dynamically inheriting the exact tree math used by actual file list items.

---

## [2026-04-01] Mobile Sidebar Layout — In-flow Accordion

### Context & Goal
The mobile sidebar was transitioned from a full-viewport overlay to an in-flow panel. Originally, bounding its height to `50vh` created a dual-scrolling, visually broken layout on mobile since the grid rows were clashing.

### Implementation
**1. `sidebar-wrapper` (Mobile In-Flow Container)**
The `.sidebar-wrapper` is an in-flow element (`position: static`). When open, it now cleanly expands to `height: auto`, natively pushing the `main` forum content down off the screen. 

**2. `aside.sidebar` (Content)**
The inner `aside` element simply inherits `height: auto` and `overflow-y: visible`. By removing inner nested scrollbars, the sidebar relies exclusively on the browser's global vertical page scroll, producing a natural and bug-free scrolling experience.

**3. Searchbar Padding**
Search padding on mobile was restored to the standard `16px` rail (`--sn-padding-x`). Previously, a native scrollbar on the right side of the constrained 50vh panel was eating 15px of space, generating an asymmetrical illusion. With the accordion layout eliminating the internal scrollbar, the 16px padding is mathematically symmetrical and perfectly left-aligns with the hamburger menu.

---

**4. Tap Bar Typography Clipping**
The mobile tap bar text had `line-height: 1` combined with `overflow: hidden`. This forced the text bounding box to perfectly cap ascenders and the baseline, rigidly chopping off descenders like 'p' and 'g'. Simply changing it back to `line-height: normal` resolves the clipping while `align-items: center` maintains vertical centering.

---

## [2026-04-01] Sidebar Navigation Redirect Bug — Diagnosis & Fix

### Root Causes

**Bug 1 — `handleSubcategoryClick` (sidebar.js:560–563)**

```js
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  closeIfOverlay();
  window.location.href = `/?category=${encodeURIComponent(subcategoryId)}&post=${postId}`;
  return;  // ← fires on ANY non-home page, including create-post and edit-post
}
```
On create-post or edit-post, `pathname !== '/'` is **always true** → every sidebar item click navigates to `/?category=...&post=...` (the home page), which the user sees as an unexpected redirect to cards-display.

**Bug 2 — `handlePendingReviewClick` (sidebar.js:649–653)**

```js
const postViewer = document.querySelector('.forum-post-wrapper, .forum-post-container, .forum-post');
const cardsViewer = document.querySelector('.cards-wrapper, .cards-container, .cards-display, .cards');
if (!postViewer && !cardsViewer) {
  window.location.href = 'http://localhost:3000/'; // ← hard-coded localhost
}
```
Neither `.forum-post` nor `.cards-display` exists on create-post or edit-post → falls through to hard-coded `localhost:3000` redirect.

### Why only create-post and edit-post?

| Page | `pathname` | Result |
|------|-----------|--------|
| `/` (cards-display) | `=== '/'` | ✓ stays on page, fires `load-forum-post` event |
| `/create-post` | `!== '/'` | ✗ Bug 1 redirects to `/?...` |
| `/edit-post` | `!== '/'` | ✗ Bug 1 redirects to `/?...` |

### Fix

**Bug 1**: Change the redirect to use `sessionStorage` + navigate to `/` with the post pre-set (same pattern used in `handlePendingReviewClick`), instead of forcing a redirect from non-home pages. The correct behavior: set `af_open_post` in sessionStorage, then navigate to home which auto-loads the post:

```js
// sidebar.js handleSubcategoryClick — BEFORE
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  window.location.href = `/?category=${encodeURIComponent(subcategoryId)}&post=${postId}`;
  return;
}

// AFTER — use sessionStorage so the post auto-loads after navigation
if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
  sessionStorage.setItem('af_open_post', postId);
  closeIfOverlay();
  window.location.href = '/';
  return;
}
```

**Bug 2**: Change `http://localhost:3000/` to `/` (relative URL — works in all environments):

```js
// BEFORE
window.location.href = 'http://localhost:3000/';
// AFTER
window.location.href = '/';
```

### Files Changed
- `sidebar.js` — 2 lines in `handleSubcategoryClick`, 1 line in `handlePendingReviewClick`

---

## [2026-04-01] Mobile Nav Alignment — Spacing System Standardization


### Inconsistencies Found

| Element | Current | Problem |
|---------|---------|---------|
| Tap bar padding | `0 16px` | ✓ correct, but `position:relative; z-index:401` sit **before** `all:unset` and get wiped |
| Overlay header | `0 var(--sn-padding-x)` = 0 16px | ✓ correct |
| Search bar | `0 var(--sn-padding-x)` = 0 16px | ✓ correct |
| Section labels | `padding: 16px 16px 4px` | ✓ correct |
| List items | `margin: 0 8px` + `pad: 6px 8px` → left = 16px | Numerically correct but **not token-driven**; icon column widths differ between items |
| Category row layout | chevron (12px) + gap(8px) + icon(15px) + gap(8px) + text | `>` chevron is left of icon — different visual indent than `.sidebar-item` rows (which have no leading chevron) |
| Tap bar open accent | `border-left: 3px solid red` | Adds 3px that shifts content — not compensated |
| FAB (+ button) | Position from `header.css` or `styles.css` | Overlaps sidebar items at bottom-right |

### Spacing System

Single source of truth:
```
--sn-padding-x: 16px    ← all horizontal edges
--sn-item-h:    32px    ← row height
--sn-item-pad-y: 6px    ← row top/bottom
--sn-icon-w:    16px    ← unified icon column width
--sn-icon-gap:  10px    ← icon → text gap
```

### Changes (sidebar.css only)

1. **Tap bar**: Move `position:relative; z-index:401` to AFTER `all:unset; box-sizing:border-box` (fix the reset wipeout). Remove `border-left` accent (confusing with list items). Use padding-left compensation on open state instead.
2. **List items** (`.sidebar-item`): Change `margin: 0 8px; padding: 6px 8px` → `margin: 0; padding: var(--sn-item-pad-y) var(--sn-padding-x)` so all icons land at exactly 16px from viewport edge.
3. **Category rows** (`.category-header`): Same — `margin: 0; padding: 6px var(--sn-padding-x)`. The leading `>` chevron sits inside the 16px left pad area.
4. **Overlay header**: Ensure `height: 52px` with consistent `padding: 0 16px` and bottom border.
5. **Section labels**: Already correct — no change.
6. **FAB**: Ensure bottom/right margin is 16px, same as content edges.
7. **No functionality changes** — CSS-only.

---

## [2026-04-01] Production Mobile Navigation — Architecture Plan


### Current State vs Requirements

| Item | Currently | Required |
|------|-----------|----------|
| Tap bar location | `sidebar.js` | `header.js` only |
| Overlay top | `var(--header-height)` | `0` (full viewport) |
| Overlay height | `calc(100vh - 64px)` | `100vh` |
| `aside.sidebar` scroll | `overflow: hidden` | `overflow-y: auto` + defined height |
| `nav-hamburger` in header | Still rendered | Replace with tap bar |
| State sync | Header & sidebar both track open state independently | Tap bar in header reads `sidebar-state-changed` event |

### Approach

The tap bar moves to **`header.js`** (replacing `.nav-hamburger`). Header already dispatches `toggle-sidebar` and reads `sidebar-state-changed` to track `sidebarOpen` — the chevron just reads from `sidebarOpen` state. No new state needed.

The sidebar overlay becomes **`top: 0; height: 100vh`** — covers the full viewport. The sidebar overlay header (title + ✕) is removed from `sidebar.js` since the tap bar in the header is the primary trigger. The ✕ inside the overlay stays but positions at the top of the panel.

`aside.sidebar` at `≤1024px` → `height: 100vh; overflow-y: auto; overscroll-behavior: contain` — the panel itself scrolls.

### Changes

| File | Change |
|------|--------|
| `header.js` | Replace `.nav-hamburger` block with `.nav-tapbar` (label + chevron, reads `sidebarOpen`, calls `toggleSidebar`) |
| `header.css` | Replace hamburger hide rule with tap bar styles using `all: unset` + explicit re-declaration |
| `sidebar.css` | Overlay: `top: 0; height: 100vh; z-index: 500`. `aside.sidebar` at `≤1024px`: `height: 100vh; overflow-y: auto`. Remove from `sidebar.js` the `.sidebar-tapbar` element |
| `sidebar.js` | Remove `.sidebar-tapbar` button (tap bar moves to header). Keep `.sidebar-overlay-header` (title + ✕ close button inside the panel) |

---

## [2026-04-01] Mobile Sidebar — Full-Screen Overlay


**Decision:** At `≤1024px`, convert the sidebar panel from an in-flow partial dropdown to a `position: fixed` full-viewport overlay when open.

**Fix:**
- `.sidebar-wrapper.is-open` → `position: fixed; top: var(--header-height); width: 100%; height: calc(100vh - var(--header-height)); z-index: 290; overflow-y: auto`
- `.sidebar-tapbar` → `position: relative; z-index: 401` (stays above the panel)
- Body scroll lock re-added at `≤1024px`

**Files changed:** `sidebar.css`, `header.css`

---

## [2026-04-01] Sidebar Overlay Close Button

**Decision:** Added a `.sidebar-overlay-header` row (title + ✕ button) inside `aside.sidebar`, visible only at `≤1024px`.

**Reason:** Full-screen overlays require an explicit dismiss control — relying solely on the tap bar chevron is insufficient UX.

**Implementation:** `sidebar-close-btn` uses `all: unset` reset (same pattern as tap bar) and calls the existing `toggleSidebar()`. The overlay header is `display: none` on desktop so it never appears in the fixed sidebar panel.

**Files changed:** `sidebar.js`, `sidebar.css`

---

## [2026-04-01] Tap Bar Styling — `all: unset` Reset Pattern


**Decision:** Reset `.sidebar-tapbar` with `all: unset; box-sizing: border-box` before re-declaring all visual properties.

**Root cause:** The global `button` rule in `styles.css` sets `background-color: var(--link-color)` (blue), `border-radius: 2.4em`, `margin: 12px`, white text, and a red `:hover`. Partial property overrides on the tap bar were insufficient — properties like `background-color` and `:hover` still bled through from the global rule.

**Fix:** Start `.sidebar-tapbar` with `all: unset; box-sizing: border-box` (the same pattern used by `.tree-toggle` and `.nav-hamburger button`), then explicitly re-declare every required property using Spectrum tokens.

**Files changed:** `sidebar.css`

---

## [2026-04-01] Sidebar Mobile Scroll — `aside.sidebar` as Scroll Container

**Decision:** At `≤1024px`, make `aside.sidebar` the scroll container (`height: auto; max-height: 50vh; overflow-y: auto`) instead of relying on `height: 100%`.

**Root cause:** Two compounding issues: (1) `.sidebar-wrapper` at `≤1024px` uses `overflow: hidden` for the height-collapse animation, which blocks any child scrolling; (2) `aside.sidebar { height: 100% }` resolved against a `height: auto` parent — producing no bounded dimension for scroll. The `header.css` rule was also global (not scoped to desktop), causing it to fight the mobile layout.

**Fix:**
- Added `@media (width <= 1024px)` override on `aside.sidebar`: `height: auto; max-height: 50vh; overflow-y: auto; overscroll-behavior: contain`
- Scoped `.sidebar-wrapper aside.sidebar { height: 100%; overflow: hidden auto }` in `header.css` to `@media (width > 1024px)` only

**Files changed:** `sidebar.css`, `header.css`

**Trade-off:** Panel caps at 50vh. This was already the `max-height` on the wrapper — now the aside owns it directly, decoupled from animation state.

---



**Decision:** Replace the hamburger icon button in the header with a full-width "Browse topics & navigation" tap bar that lives inside the `sidebar` block itself, rendered in the CSS grid's sidebar row in normal document flow.

**Root cause:** The hamburger icon has low discoverability — users unfamiliar with the icon pattern don't know navigation is hidden behind it. This led to poor engagement with the sidebar on mobile.

**Fix:**
- Moved the toggle affordance into `sidebar.js` as a `<button class="sidebar-tapbar">` rendered above the panel — the sidebar owns its own mobile trigger
- The sidebar block is mounted as a direct `<body>` child (`div.sidebar-mount`) which is a CSS grid item with `grid-area: sidebar`
- At `≤1024px` the body grid switches from a 2-column layout to a single stacked column: `header → sidebar row → content`. The tap bar sits in the sidebar row; the panel height-collapses to 0 when closed and grows to `auto` (max 50vh) when open — no `position: fixed`, no manual offsets
- Desktop (`>1024px`) is unchanged: panel stays `position: fixed` on left, sidebar always visible
- The `.nav-hamburger` is hidden at `≤1024px` via `header.css`
- Single `1024px` breakpoint used throughout (no 768/1024 split)

**Files changed:** `sidebar.js`, `sidebar.css`, `header.css`, `styles.css`

**Reason:** Placing the tap bar inside the sidebar block keeps responsibilities cohesive — the sidebar owns its open/close state and its own trigger. Using the CSS grid's sidebar row for the tap bar means layout is handled by the browser naturally, with no tightly-coupled pixel offsets between header and sidebar.

**Trade-off:** Panel is capped at 50vh height on mobile (with internal scroll) to avoid pushing main content too far down the page. If a full-screen sidebar is preferred, the cap can be raised to 100vh in a future pass.

---



**Decision:** Standardize mobile page side spacing by making the shared section wrapper the source of truth for horizontal gutters, and remove extra horizontal padding from page-shell blocks like `create-post`, `edit-post`, and `forum-post`.

**Root cause:** `main > .section > div` in `styles.css` already applied horizontal page padding, but page-shell blocks were also adding their own left/right padding on top. On mobile that stacked the two values, making pages like create-post, edit-post, and forum-post appear narrower than the shared layout intended.

**Fix:**
- Added shared gutter tokens in `styles.css` (`--page-gutter`, `--page-gutter-lg`)
- Updated the shared section wrapper to use those tokens
- Removed horizontal padding from `.create-post`, `.edit-post`, and the mobile `.forum-post-wrapper` rule, leaving only vertical page spacing in those blocks

**Reason:** Horizontal page gutters should be owned globally so pages line up consistently. Page blocks should only add their own horizontal padding when they truly need an internal component-specific offset.

---

## [2026-03-31] Auth Rehydration and Cards Fetch Standardization

**Decision:** Treat the server session as the source of truth when `af_user` is missing, and make the cards view use credentialed `/api/posts` requests for all list, mine, and category states.

**Root cause:** `cards-display` redirected purely on missing `localStorage.af_user`, while `auth-form` could confirm a still-valid session via `/api/auth/me` and redirect home without rebuilding `af_user`. That created a redirect loop when local storage was cleared but the session cookie remained valid. The cards view also used an invalid category endpoint, omitted `credentials: 'include'`, and refetched on broad lifecycle events like `pageshow` and `visibilitychange`.

**Fix:**
- Rehydrate `af_user` from `/api/auth/me` when a valid session exists
- Persist the restored user in `auth-form` before redirecting home
- Add `credentials: 'include'` to cards fetches
- Route category filtering through `/api/posts?category=...` and support that query on the backend
- Remove unconditional `pageshow` and `visibilitychange` refetch triggers
- Preserve "My Posts" state unless a refresh event explicitly asks to reset the view

**Reason:** The client indicator should follow the session, not fight it. Centralizing list fetching on `/api/posts` also keeps frontend filters aligned with the backend API and avoids redundant network churn.

---

## [2026-03-31] Sidebar Overlay Backdrop - Intercept Background Gestures

**Decision:** In overlay mode, place the sidebar backdrop above the page content and below the sidebar panel so it intercepts taps and scroll gestures outside the panel.

**Root cause:** The backdrop was rendered as a fixed element but given `z-index: -1` inside the sidebar stacking context. That dimmed the page visually without reliably intercepting gestures, so users could still scroll the background by dragging in the uncovered area beside the sidebar.

**Fix:** Keep the existing sidebar structure, but change the backdrop to `z-index: 0` and the sidebar panel to `position: relative; z-index: 1`. Added `touch-action: none` and `overscroll-behavior: none` on the backdrop to block background gesture handling more reliably on mobile browsers.

**Reason:** The scroll lock on `body`/`main` is necessary, but the backdrop also needs to sit on top of the page to prevent stray pointer and touch interactions from reaching the background.

---

## [2026-03-31] Sidebar Overlay Scroll Lock - Lock `main`, Not Just `body`

**Decision:** When the sidebar is open in overlay mode (`<= 1024px`), lock scrolling on both `body` and `main`.

**Root cause:** The sidebar already toggled `body.sidebar-is-open`, but the page's actual scroll container is `main` (`overflow: hidden auto` in `styles.css`). Locking only `body` did not stop the background content from scrolling behind the fixed sidebar overlay.

**Fix:** Keep the existing sidebar open/close JS unchanged and extend the mobile/tablet scroll-lock CSS so `body.sidebar-is-open main { overflow: hidden; }`.

**Reason:** This is the minimal fix because the sidebar state wiring was already correct. The issue was that the scroll lock was applied to the wrong container.

---

## [2026-03-31] Expired Session Handling - Single Auth Check, Single Redirect

**Decision:** When `GET /api/auth/me` returns `401`, treat the client as logged out immediately, clear stale frontend auth state, and redirect to `/auth-form` at most once. Do not call `window.location.reload()` and do not attempt a second logout round-trip for an already-missing session.

**Root cause:** After cookies were cleared, stale `localStorage` auth data could still make parts of the frontend behave as if the user were signed in. The header then performed its own `/api/auth/me` check, received `401`, and redirected, while the auth page also performed a fresh `/me` check on load. With multiple auth entry points making redirect decisions independently, the app could appear to get stuck in a refresh/loading loop.

**Fix:**
- Added a one-time `authChecked` gate in `auth-form` so its initial auth check runs once on load before deciding whether to render the form or redirect home
- Updated header session validation so a `401` clears stale client auth state and redirects once without retrying logout
- Centralised stale client auth cleanup in `scripts/auth-state.js`

**Reason:** The backend session cookie is the source of truth. Once it is gone, the frontend must move to a stable logged-out state instead of retrying or chaining multiple redirect/auth decisions.

---

## [2026-03-31] Sidebar Merge Regression - Restore Module Parseability

**Decision:** Keep the recent sidebar behavior changes, but remove duplicated merge fragments from `blocks/sidebar/sidebar.js` instead of rolling back the feature set.

**Root cause:** The merge commit duplicated helper functions, component props, state hooks, and handlers inside `sidebar.js`. That made the module syntactically invalid (`Identifier 'collectFolderIds' has already been declared`), so the dynamic import from `header.js` failed and the sidebar never rendered.

**Fix:** Delete only the duplicated declarations and duplicated template fragments. Preserve the intended post-merge behavior:
- Desktop `> 1024px` starts open
- Tablet/mobile `<= 1024px` stays overlay-accessible via hamburger
- `closeIfOverlay()` remains in navigation paths

**Reason:** The regression was caused by parse failure, not by sidebar layout CSS. A minimal cleanup restores rendering without undoing the valid responsive/sidebar behavior added before the merge.

---

## [2026-03-31] Unified Sidebar/Hamburger Breakpoint — 1024px

**Decision:** Standardized all sidebar and hamburger visibility logic to use a single breakpoint: `1024px`.

**Conflicts resolved:**

| File | Old breakpoint | New breakpoint |
|---|---|---|
| `header.css` nav-hamburger | `< 900px` | `<= 1024px` |
| `header.css` scroll-lock | `< 768px` | `<= 1024px` |
| `sidebar.css` overlay mode | `< 768px` | `<= 1024px` |
| `sidebar.css` backdrop | `< 768px` | `<= 1024px` |
| `sidebar.js` init + resize | `>= 768px` | `> 1024px` (done earlier) |

**Gap fixed:** At 900–1024px, the hamburger was hidden but the sidebar was also closed (started closed by JS). Users had no way to open the sidebar. Aligning all thresholds to 1024px eliminates this dead zone.

**Token conflict fixed:** `--sidebar-width: 280px` removed from `header.css :root` — `sidebar.css` owns this at `256px` which is consistent with `--nav-width: 256px` in `styles.css`.

**Grid fix:** Tablet body grid changed from single-column (breaking `aside` placement) to `0 minmax(0,1fr)` columns — `aside.sidebar-wrapper` stays in its named grid area but takes 0 width, so `main` gets full viewport width and fixed-position sidebar overlays correctly.

---

## [2026-03-31] Sidebar Auto-Close on Navigation (Overlay Mode)

**Decision:** Added a `closeIfOverlay()` helper to `sidebar.js` that closes the sidebar before/during any navigation action when `window.innerWidth <= 1024`.

**Changes:**
- Init state: `>= 768` → `> 1024` — sidebar starts **closed** on tablet and mobile
- Resize handler: same threshold change — only auto-opens on desktop resize
- `closeIfOverlay()` called in: Home button click, `handleSubcategoryClick` (both cross-page and same-page paths), `handlePendingReviewClick` (both paths)

**Reason:** On mobile/tablet the sidebar is a fixed overlay — leaving it open after navigation covered the new page content and required the user to manually close it.

---

## [2026-03-31] Global Page Spacing Tokens

**Decision:** Added `--page-max-width`, `--page-v-top`, `--page-v-bottom`, `--page-v-top-lg`, `--page-v-bottom-lg` tokens to `:root` in `styles.css`.

**Changes:**
- `styles.css` — 5 spacing tokens in `:root`
- `forum-post.css` — `max-width: 800px → var(--page-max-width, 900px)`, horizontal padding `20px → 0` (wrapper provides it)
- `edit-post.css` — tablet override block added (`padding: 24px 12px 48px`, tighter form/editor sizing)

**Reason:** `forum-post` used `800px` max-width and `20px` own horizontal padding, while `create-post`/`edit-post` used `900px` with their own padding. Combined with the section wrapper's padding, each page had different effective content widths. Standardising on `900px` and zeroing block-level horizontal padding (where the wrapper provides it) gives consistent layout.

---

## [2026-03-31] Tablet Layout — Sidebar as Fixed Overlay, Content Full-Width

**Decision:** Added `@media (768px <= width <= 1024px)` to `styles.css` that overrides the body grid from two-column (sidebar + content) to single-column (content only).

**Reason:** The `body` grid at `≥768px` permanently allocated `var(--nav-width) = 256px` as a sidebar column. Since the sidebar is `position: fixed` (overlay, not inline), this reservation was unnecessary on tablet — it served no layout purpose but reduced `main` to `viewport - 256px`. At 768px with sidebar closed, only ~424px was usable. After the fix, content gets the full viewport width (~700px usable at 768px).

**Changes:**
- `styles.css` — tablet block: `body { grid-template: single-column }`, `main { max-width: 100% }`, `main > .section > div { padding: 0 16px }`
- `create-post.css` — tablet padding reduced to `24px 12px 48px` (wrapper now provides 16px, not 24-32px)

**Sidebar behavior unchanged:** Still `position: fixed`, still slides in/out via hamburger on tablet. When open it overlays content (same as mobile). When closed, content fills full width.

**Desktop `>1024px` unchanged:** Two-column grid with sidebar inline is untouched.

---

## [2026-03-31] Create-Post Tablet Layout Optimisation

**Decision:** Added a dedicated `@media (768px <= width <= 1024px)` block to `create-post.css` that overrides the generic `≥768px` desktop rules.

**Reason:** The `≥768px` rule was designed for desktop and applied 32px horizontal padding. On tablet with the sidebar open (256px), available content width is only 512px — so 64px of that was consumed by padding, leaving 448px usable. The tablet override reduces horizontal padding to 20px (40px total), giving 472px usable at 768px and 728px at 1024px. The `max-width: 100%` override removes the artificial 900px desktop cap so the form fills the sidebar-constrained space naturally.

**Changes:**
- `.create-post` → `max-width: 100%; padding: 28px 20px 60px`
- `.cp-page-header` → `margin-bottom: 28px` (vs 36px desktop)
- `.cp-form-section` → `gap: 16px; margin-bottom: 28px` (vs 20px/32px desktop)
- `.ce-container` → `min-height: 280px` (slightly taller editor)

**Constraints respected:** Mobile `<768px` and desktop `>1024px` untouched.

**File changed:** `create-post.css`

---

## [2026-03-31] Language Picker — Converted from Broken Toolbar Bar to Dropdown

**Decision:** Replaced the `create-post.css` `.ce-lang-picker` horizontal-bar layout with a proper dropdown, matching the already-correct `edit-post.css` pattern.

**Root cause:** The picker was `position: absolute; top: 0; left: 0; right: 0` inside `.ce-code-block-wrap` which is `position: relative` and only ~28px wide. `right: 0` constrained the picker width to 28px — all options were invisible or crammed. This was a mismatch between the original CSS intent (a full-width toolbar overlay) and the DOM structure (picker nested in a tiny span).

**Fix:**
- `top: calc(100% + 4px)` — drops below the button (not overlaying it)
- Removed `right: 0` — picker width is now `min-width: 160px` and unconstrained
- `flex-direction: column` + `overflow-y: auto` — vertical dropdown list
- `.ce-lang-option` changed from `inline-flex` to `block` — fills dropdown width
- Mobile override: `max-width: min(200px, calc(100vw - 32px))` — prevents viewport overflow

**Files changed:** `create-post.css` (primary fix), `edit-post.css` (minor: max-width alignment only)

---

## [2026-03-31] Responsive Toolbar — Wrap on Mobile, Scroll on Tablet

**Decision:** Three distinct toolbar behaviours by breakpoint:
- **Mobile (`<768px`)**: `flex-wrap: wrap` — buttons shrink to 24px, all items visible across two rows, **no horizontal scroll**
- **Tablet (`768–1024px`)**: `flex-wrap: nowrap; overflow-x: auto` — smooth touch-friendly horizontal scroll
- **Desktop (`>1024px`)**: default `flex-wrap: wrap` — unchanged

**Reason:**
- The original `<768px` block used `flex-wrap: nowrap; overflow-x: auto` which caused the exact problem it was meant to solve — it hid part of the toolbar behind a scroll on narrow screens
- Making buttons 24×24px (down from 28×26px) with 14px SVGs still passes WCAG AA tap-target guidelines (44×44 recommended; buttons are touch-friendly due to tight `gap: 1px` grouping)
- The `ce-size-select` shrinks to min-width 60px (fits "Paragraph" as truncated text) to stay within the row budget
- Keeping scroll on tablet avoids the visual density problem that would occur at ~768px where two rows would crowd the form

**Trade-off:** On mobile the format select may truncate to "Paragr…" — acceptable since the full label is visible on focus. If needed, the select can be shortened to a single character (P/H1…H6) in a future pass.

**Files changed:** `create-post.css`, `edit-post.css` (identical strategy, both share `.ce-toolbar` class structure)

---

## [2026-03-31] Stepper UI Removed from Create-Post

**Decision:** Delete the `StepIndicator` component entirely rather than fixing/styling it.

**Reason:**
- `currentStep` was hardcoded to `1` and never mutated — the component was purely decorative
- The actual multi-step flow (Write → Agree → Choose Reviewers) is handled by three separate modal overlays (`showPreview`, `showAgreement`, `showReviewerPicker`) — no step state was needed
- No CSS rules existed for `.cp-step-*` classes — unstyled dead code
- Removing it reduces confusion and eliminates an empty gap in the form layout

**Trade-off:** If a future design requires a visual progress indicator, it should be re-built as a truly stateful component tied to the real flow states.

---

## [2026-03-31] Sidebar Item Padding — Token-Based Spacing System

**Decision:** Replace `height: 32px` (fixed) with `min-height: 32px` + `padding: 6px 8px` (token-driven) for all sidebar clickable items.

**Reason:**
- Fixed height with no vertical padding causes items to feel cramped when content wraps (e.g. long folder names on mobile)
- `min-height` allows natural growth; padding gives consistent visual breathing room
- Introduced `--sn-item-pad-y` and `--sn-item-pad-x` tokens so all item types (`.sidebar-item`, `.category-header`, `.tree-item-content`) share a single source of truth

**Trade-off:** Slight pixel shift in item heights vs. prior design — acceptable given Spectrum allows 32px as a *minimum*, not a rigid fixed value.

---

## [2026-03-31] Sidebar Home Button — No Auto-Active State

**Decision:** Remove the conditional `active` class from the Home button on initial load.

**Reason:**
- The condition `!activeSubcategory && !window.location.search.includes('mine=true')` was true on every fresh page load, making Home appear permanently selected (grey background)
- Home should only appear selected when the user has explicitly navigated to the home view, mirroring how "Pending Reviews" and folder items behave
- `background: transparent` added explicitly to `.sidebar-item` to prevent inheritance from any parent that may set a background

**Trade-off:** Home is now never programmatically marked active (there is currently no route-aware logic to detect "user is on home page"). If needed, a `window.location.pathname` check can be added in the future.

---

## [2026-03-30] Client-Side Storage Migration

**Decision:** Move persistent data (user session, post drafts) from `localStorage` to session-backed API calls + `sessionStorage` for transient draft state only.

**Reason:**
- `localStorage` is shared across tabs and persists indefinitely — unsuitable for session-sensitive data like auth tokens
- `sessionStorage` is limited to a single tab lifetime — appropriate for create-post draft (survives refresh, clears on tab close)
- API-backed auth state (`GET /api/auth/me`) is the authoritative source — avoids stale client-side auth data

---

## [2026-03-26] Cross-Page Post Navigation via sessionStorage

**Decision:** When navigating from `create-post` to the home page to view a specific post, pass the post ID via `sessionStorage` (`af_open_post`) rather than URL query params.

**Reason:**
- URL params were being lost during the EDS page transition in some cases
- `sessionStorage` survives a hard redirect but is tab-scoped, so there's no risk of stale data leaking across tabs
- The `forum-post` block reads `af_open_post` on mount and immediately clears it

**Trade-off:** Not shareable via URL (deep-linking to a specific post requires a proper URL param approach in the future).

---

## [Project Start] Preact + htm Over a Build Step

**Decision:** Use Preact with tagged-template `htm` instead of JSX + a bundler.

**Reason:**
- Adobe EDS is a zero-build-step platform — all JS must be browser-native ES modules
- `htm` provides JSX-like syntax via tagged template literals without a compiler
- `vendor/` directory pins specific versions of Preact, preact-hooks, and htm for predictable behaviour

**Trade-off:** No TypeScript, no tree-shaking, no dead-code elimination. File sizes are larger than a bundled app. Debugging template errors is less ergonomic than JSX with source maps.

---

## [Project Start] Block-Based Architecture

**Decision:** Each feature is a self-contained EDS block with its own `.js` and `.css`.

**Reason:**
- EDS convention — blocks are loaded on-demand only when the corresponding element appears on a page
- Keeps CSS scoped and prevents style leakage between features
- Allows independent development and deployment of each block

**Trade-off:** Cross-block communication must go through custom DOM events or `sessionStorage` — no shared module-level state.

---

## [Project Start] Session-Based Auth Over JWT

**Decision:** Use Express `express-session` with server-side sessions rather than JWTs in `localStorage`.

**Reason:**
- JWTs in `localStorage` are vulnerable to XSS — particularly risky given the rich text editor that accepts HTML
- Sessions stored server-side (memory/MongoDB) are invalidated on logout immediately
- Cookies with `httpOnly` prevent client-side JS access to the session token

**Trade-off:** Stateful server — horizontal scaling requires a shared session store (e.g. `connect-mongo`). Currently running on a single Node process so this is acceptable.


