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
- [x] Centralize all icons into `scripts/utils/icons.js` (removed duplication across 6 block files)
- [x] Centralize API_BASE and shared config into `scripts/utils/constants.js`
- [x] Add `styles/responsive.css` for canonical breakpoint documentation and global utility classes
- [ ] Sidebar: make "Home" button navigate correctly when on non-root pages
- [ ] Cards display: add pagination or infinite scroll
- [ ] Forum post viewer: add reply/comment thread support
- [x] Mobile responsiveness audit across all blocks ✅ **complete** — canonical 480/768/1024px breakpoints enforced with centralized responsive rules in `styles/responsive.css`

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

### 2026-04-10
- [x] **Centralized SPA navigation handler with smart block detection**: Added `navigateTo(postId, options)` in `scripts/router.js` for standardized post navigation. Updated `sidebar.js` to check if forum-post/cards-display blocks exist in DOM. If blocks exist (on homepage): use SPA navigation via `navigateTo()`. If blocks don't exist (create-post/edit-post): full page reload to `/?post=<id>` to bring user to homepage where blocks render.
- [x] **Update sidebar handlers for hybrid navigation**: Modified `handleSubcategoryClick` and `handlePendingReviewClick` in `blocks/sidebar/sidebar.js` to intelligently choose between SPA and full-page navigation based on block existence. On-home navigation is seamless SPA; off-home navigation reloads to homepage with post ID in URL.
- [x] **Route-driven block rendering on homepage**: Verified that `forum-post.js` listens to `af-route-change` events and renders posts. When user is redirected to homepage with `/?post=<id>`, router parses URL and broadcasts route event, triggering block render.

### 2026-04-09
- [x] **Sidebar post ID normalization**: Fixed postId field handling in `normalizeItems()` so MongoDB populated post objects are converted to strings before sidebar navigation. Posts can now be clicked from create-post/edit-post pages.
- [x] **Icon consolidation in auth-form**: Removed duplicate icon definitions (IconEye, IconEyeOff, IconAlertCircle, IconCheckCircle, IconArrowLeft) and replaced with centralized imports (EyeIcon, EyeOffIcon, AlertIcon, CheckIcon, BackIcon) from `scripts/utils/icons.js`.
- [x] **Mobile button layout - create-post & edit-post**: Added responsive CSS overrides (≤768px) for full-width stacked buttons, optimized tags input spacing, and responsive toast dialogs in `styles/responsive.css`.
- [x] **Edit-post desktop button layout**: Fixed edit-post.css to use `flex-direction: row` (side-by-side buttons) for desktop, matching create-post. Mobile stacking handled by responsive.css override.

### 2026-04-08
- [x] **SPA post routing**: Added a centralized client router with shareable `/?post=<id>` URLs, browser history support, and route-driven home/post rendering without page reloads.
- [x] **EDS-safe post deep linking**: Standardized post entry on the homepage query route so pasted post links open correctly in a fresh tab without relying on rewrites or 404-page fallback behavior.
- [x] **Responsive loading fix**: Centralized responsive rules live in `styles/responsive.css`, and the EDS loader now re-appends that stylesheet after block CSS so global mobile/tablet overrides apply reliably.
- [x] **Responsive CSS strategy corrected**: Block CSS is base-only again, while `styles/responsive.css` holds the shared responsive layer for the application.
- [x] **Normalized non-canonical breakpoints**: `440px → 480px`, `600px → 768px`, `900px → 1024px`.
- [x] **ArrowIcon moved to `icons.js`**: Removed local inline definition from `forum-post.js`; `ArrowIcon` is now a named export in `scripts/utils/icons.js`.
- [x] **Global color token system**: Added shared `--color-*` tokens in `styles/styles.css` so common text, surface, border, status, and code colors come from one place.
- [x] **JS color utility added**: Added `scripts/utils/colors.js` for inline SVG/status UI that needs the same centralized palette outside CSS.
- [x] **Header + forum-post token cleanup**: Replaced live hardcoded colors in `header.css` and `forum-post.css` with shared tokens and local aliases.

### 2026-04-01
- [x] **Mobile tap bar navigation**: Replaced hamburger menu with full-width in-flow tap bar at ≤1024px. Single 1024px breakpoint, no fixed positioning.
- [x] **Tap bar styling fix**: Added `all: unset` to `.sidebar-tapbar` to eliminate global button style bleed-through.
- [x] **Sidebar mobile scroll fix**: Made `aside.sidebar` scroll container; scoped `height:100%` to desktop.
- [x] **Mobile sidebar full-screen overlay**: Converted sidebar from partial in-flow panel to `position:fixed` full-viewport overlay at ≤1024px. Tap bar stays tappable via `z-index:401`. Body scroll lock re-added.
- [x] **Sidebar overlay close button**: Added `.sidebar-overlay-header` inside `aside.sidebar` (mobile only) with title + ✕ close button.
- [x] **Production mobile nav**: Tap bar in `sidebar.js` (below header in grid). Full-screen overlay reverted to in-flow push. `header.js`/`header.css` unchanged.
- [x] **Mobile nav alignment**: Standardized 16px horizontal rail, fixed tap bar all:unset ordering, chevron reordered to right on mobile, overlay header 52px.
- [x] **Category colour bug**: Restored `&.is-expanded { background: transparent }` and scoped `border-radius:0` to ≤1024px only.
- [x] **Sidebar redirect bug (create-post/edit-post)**: `handleSubcategoryClick` now stores postId in `sessionStorage('af_open_post')` and navigates to `'/'` — same pattern as `handlePendingReviewClick`. `handlePendingReviewClick` hard-coded `localhost:3000` changed to relative `'/'`.
- [x] **Partial-height mobile sidebar to in-flow accordion**: Reverted the buggy 50vh internal scrolling logic; `.sidebar-wrapper` now simply grows to `height: auto`, pushing the body content down and allowing the browser's native page scroll to handle lengths correctly.
- [x] **Tap bar text clipping**: Replaced `line-height: 1` with `line-height: normal` on the `.sidebar-tapbar` text so descender letters ('p', 'g') don't get chopped off by `overflow: hidden`.
- [x] **Search container padding**: Restored `.search-container` padding back to the standard `16px` rail on mobile. Since the right scrollbar was eliminated via the accordion fix, the 16px padding is now perfectly symmetrical and properly left-aligns with the structural UI.
- [x] **Sidebar empty state alignment**: Fixed "No items yet" nested indentation by replacing the hardcoded `padding + 40px` with the exact flex structure used by real file items (`.tree-item-content` + `.tree-chevron` + hidden `FileIcon`). Applied identical structural fix to both subfolders (`TreeItem`) and top-level categories (`CategoryItem`), resolving the padding loss issue.

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


