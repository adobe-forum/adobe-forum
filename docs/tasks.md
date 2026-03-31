# Adobe Forum — Task Board

> **Rule:** Update this file after every implementation session.

---

## 🔄 In Progress

*(none currently)*

---

## ⏳ Pending

### UI / UX
- [x] Sidebar auto-close on navigation (mobile/tablet overlay mode)
- [x] Global page spacing tokens + uniform spacing across create-post, edit-post, forum-post
- [x] Standardize sidebar/hamburger breakpoints to 1024px cutoff
- [ ] Sidebar: make "Home" button navigate correctly when on non-root pages
- [ ] Cards display: add pagination or infinite scroll
- [ ] Forum post viewer: add reply/comment thread support
- [ ] Mobile responsiveness audit across all blocks (toolbar done ✓, tablet layout done ✓, sidebar overlay done ✓)

### Review Workflow
- [ ] Edit-post flow: allow author to resubmit after "changes requested"
- [ ] Reviewer notifications (email or in-app badge on login)
- [ ] Review deadline / expiry handling

### Auth
- [ ] Profile page: avatar upload
- [ ] Account settings page
- [ ] OAuth / SSO integration for internal Adobe login

### Backend
- [ ] Rate limiting on auth endpoints
- [ ] Input sanitization audit (XSS in post body)
- [ ] Attach `Authorization` header support alongside sessions (for API clients)

### DevEx
- [ ] Add ESLint rule for no direct `localStorage` access (use API layer)
- [ ] Add integration tests for create-post → review → publish flow

---

## ✅ Completed

### 2026-03-31
- [x] **Auth + cards state sync fix**: Rehydrated `af_user` from a valid server session, standardized cards fetches to include session credentials, removed duplicate `pageshow`/`visibilitychange` refetches, preserved "My Posts" during refresh events, and moved category filtering onto `/api/posts?category=...`
- [x] **Mobile page gutter standardization**: Moved page side spacing to shared layout tokens and removed extra horizontal padding from create-post, edit-post, and forum-post so mobile left/right spacing matches the shared page wrapper
- [x] **Sidebar - backdrop interaction fix**: Raised the mobile/tablet backdrop above page content so it now catches touch/scroll gestures outside the panel and prevents background scrolling while the overlay is open
- [x] **Sidebar - overlay scroll lock fix**: Locked the page's `main` scroll container alongside `body` when the sidebar is open on mobile/tablet so background content no longer scrolls behind the overlay
- [x] **Auth - expired session loop fix**: Added a one-time auth check gate on `auth-form` and made header `401` handling clear stale client auth without recursive logout redirects
- [x] **Sidebar - merge regression fix**: Removed duplicated merge fragments from `blocks/sidebar/sidebar.js` so the module parses again and the sidebar renders across desktop and overlay breakpoints
- [x] **Sidebar — Home button state**: Removed auto-active class; Home is now transparent by default, hover/active only when selected
- [x] **Sidebar — Padding normalization**: Introduced `--sn-item-pad-y: 6px` / `--sn-item-pad-x: 8px` tokens; all items use consistent `min-height` + symmetric padding
- [x] **Sidebar — Section header spacing**: Changed from asymmetric `24px/6px` to balanced `16px/4px` with tokens `--sn-section-top` / `--sn-section-bottom`
- [x] **Create-post — Removed non-functional stepper**: Deleted `StepIndicator` component and its `currentStep={1}` render call; multi-step flow (agree → reviewer picker) was already handled by separate modal dialogs

### 2026-03-30
- [x] Audit and migrate `localStorage`/`sessionStorage` usage to backend API calls
- [x] Fix 401 errors on `/api/auth/me`, `/api/auth/login`, `/api/auth/forgot-password` after index.js refactor
- [x] Fix navigation bug: clicking "Pending Review" from `create-post` page now correctly loads the post on the home page using `sessionStorage` + `pageshow` event

### 2026-03-25
- [x] Spectrum UI refinement — align preview sections with Spectrum 1 typography
- [x] Browser history management (`window.history.back()` after post submit)
- [x] Secure profile and password change endpoints with session authentication

### Earlier
- [x] Rich text editor (RichTextEditor): bold, italic, strike, code, code-block, blockquote, lists, table, image, link
- [x] Review workflow end-to-end: create → assign reviewers → approve/reject
- [x] Confidentiality agreement dialog before post submission
- [x] Sidebar hierarchical tree with expand/collapse and live search
- [x] Draft auto-save and restore via `sessionStorage`
- [x] Session-based authentication with forgot/reset password
