# Adobe Forum — Weekly Progress Summary

---

## Week 4: April 7-13, 2026 ⭐ **Most Active**

### Focus Areas
**SPA Routing, Design System Consolidation, Cross-form Consistency**

### Tasks Completed (6 items)

#### April 10
- ✅ **Centralized SPA navigation handler with smart block detection** — Added `navigateTo(postId, options)` in `router.js` with block presence detection logic. Sidebar now intelligently chooses between SPA navigation (if blocks exist) or full-page reload to homepage (if blocks don't exist).
- ✅ **Update sidebar handlers for hybrid navigation** — Modified `handleSubcategoryClick` and `handlePendingReviewClick` to check for forum-post/cards-display before deciding navigation method.
- ✅ **Route-driven block rendering on homepage** — Verified `forum-post.js` listens to `af-route-change` events and renders posts when redirected with `/?post=<id>`.

#### April 9
- ✅ **Sidebar post ID normalization** — Fixed postId field handling in `normalizeItems()` so MongoDB populated objects are converted to strings.
- ✅ **Icon consolidation in auth-form** — Removed 5 duplicate local icon definitions and imported from centralized `scripts/utils/icons.js`.
- ✅ **Mobile button layout - create-post & edit-post** — Added responsive CSS overrides (≤768px) for full-width stacked buttons.
- ✅ **Edit-post desktop button layout** — Unified form button layouts to side-by-side on desktop (`flex-direction: row`), matching create-post.

#### April 8
- ✅ **SPA post routing** — Added lightweight client router with shareable `/?post=<id>` URLs and browser history support.
- ✅ **EDS-safe post deep linking** — Standardized post entry on homepage query route for fresh tab consistency.
- ✅ **Responsive loading fix** — Centralized responsive rules in `styles/responsive.css` with EDS-safe load order.
- ✅ **Responsive CSS strategy corrected** — Block CSS is base-only; `responsive.css` holds the shared responsive layer.
- ✅ **Normalized non-canonical breakpoints** — Standardized `440px→480px`, `600px→768px`, `900px→1024px`.
- ✅ **ArrowIcon moved to icons.js** — Removed local inline definition; centralized to global library.
- ✅ **Global color token system** — Added shared `--color-*` tokens in `styles/styles.css`.
- ✅ **JS color utility added** — Created `scripts/utils/colors.js` for inline SVG/status UI colors.
- ✅ **Header + forum-post token cleanup** — Replaced hardcoded colors with shared tokens.

#### April 7
- ✅ **Global refactor — Icon centralization** — Consolidated 13+ SVG icons into single `scripts/utils/icons.js` file.
- ✅ **Global refactor — Constants** — Created `scripts/utils/constants.js` with `API_BASE`, `BREAKPOINTS`, `Z_INDEX`, `SPACING`.
- ✅ **Responsive utilities** — Documented breakpoints in `styles/responsive.css` with shared utility classes.

### Architectural Decisions (7 entries)

| Date | Decision | Impact |
|------|----------|--------|
| 04-10 | Hybrid SPA navigation (block detection) | Seamless navigation on-home; full reload off-home |
| 04-09 | Unified form button layouts (row/column) | Consistency between create-post & edit-post |
| 04-09 | Centralized icon imports for auth | Single source of truth for all icons |
| 04-08 | Client routing with `/?post=<id>` URLs | Shareable, refreshable post URLs |
| 04-08 | Shared color token system | Unified palette across blocks and JS |
| 04-08 | Centralized responsive.css | Single breakpoint source (480px, 768px, 1024px) |
| 04-07 | Global icon/constants/responsive refactor | Eliminated 50+ hardcoded values |

### Key Outcomes
- **Routing**: SPA experience on homepage, full reload from edit pages (correct UX for each context)
- **Design System**: 3 centralized files (icons, colors, constants) eliminate duplication
- **Responsive**: Canonical breakpoints documented with EDS-safe load order
- **Form UX**: Create and edit forms now identical on desktop/mobile

---

## Week 3: March 31 - April 6, 2026

### Focus Areas
**Mobile Navigation, Sidebar Layout, Auth State Sync**

### Tasks Completed (18 items)

#### April 1
- ✅ **Mobile tap bar navigation** — Replaced hamburger with full-width in-flow tap bar at ≤1024px.
- ✅ **Tap bar styling fix** — Added `all: unset` to eliminate global button bleed-through.
- ✅ **Sidebar mobile scroll fix** — Made `aside.sidebar` scroll container; scoped height to desktop only.
- ✅ **Mobile sidebar full-screen overlay** — Converted to `position:fixed` full-viewport overlay at ≤1024px.
- ✅ **Sidebar overlay close button** — Added `.sidebar-overlay-header` with title + ✕ button.
- ✅ **Production mobile nav** — Tap bar in `sidebar.js` with full-screen overlay, kept `header.js` unchanged.
- ✅ **Mobile nav alignment** — Standardized 16px horizontal rail spacing across tap bar, chevron, overlay.
- ✅ **Category colour bug** — Restored `&.is-expanded { background: transparent }` with ≤1024px scope.
- ✅ **Sidebar redirect bug (create-post/edit-post)** — Fixed sessionStorage + relative URL navigation.
- ✅ **Partial-height mobile sidebar to in-flow accordion** — Removed dual-scrolling 50vh layout; replaced with `height: auto`.
- ✅ **Tap bar text clipping** — Fixed descender clipping by changing `line-height: 1` → `line-height: normal`.
- ✅ **Search container padding** — Restored 16px rail padding after accordion fix eliminated internal scrollbar.
- ✅ **Sidebar empty state alignment** — Fixed "No items yet" indentation to match file item structure exactly.

#### March 31
- ✅ **Auth + cards state sync fix** — Rehydrated `af_user` from server session; standardized credentials on all fetches.
- ✅ **Mobile page gutter standardization** — Moved side spacing to layout tokens; removed duplication.
- ✅ **Sidebar - backdrop interaction fix** — Raised backdrop above page content to catch gestures.
- ✅ **Sidebar - overlay scroll lock fix** — Locked `main` scroll alongside `body` to prevent background scrolling.
- ✅ **Auth - expired session loop fix** — Added one-time auth check gate to prevent recursive redirects.
- ✅ **Sidebar - merge regression fix** — Removed duplicated merge fragments; sidebar renders correctly.
- ✅ **Sidebar — Home button state** — Removed auto-active; now transparent by default.
- ✅ **Sidebar — Padding normalization** — Introduced `--sn-item-pad-y` / `--sn-item-pad-x` tokens.
- ✅ **Sidebar — Section header spacing** — Changed `24px/6px` → `16px/4px` with tokens.
- ✅ **Create-post — Removed non-functional stepper** — Deleted `StepIndicator` component.

#### March 30
- ✅ **Audit and migrate localStorage/sessionStorage** — Moved client-side state to backend API calls.
- ✅ **Fix 401 errors on auth endpoints** — Corrected CORS and session middleware configuration.
- ✅ **Fix navigation bug** — Clicking "Pending Review" now correctly loads post on homepage.

### Architectural Decisions (4 entries)

| Date | Decision | Impact |
|------|----------|--------|
| 04-02 | Empty state alignment via structure reuse | Pixel-perfect without hardcoded offsets |
| 04-01 | In-flow accordion sidebar (vs 50vh) | Natural page scroll, no dual-scrolling |
| 04-01 | Sidebar navigation redirect fix | `sessionStorage` + relative URLs in all cases |
| 04-01 | Mobile nav spacing standardization | Consistent 16px rail, token-driven padding |

### Key Outcomes
- **Mobile UX**: Tap bar + in-flow accordion replaces buggy overlay
- **Navigation**: All sidebar clicks use consistent sessionStorage + relative URLs
- **Alignment**: Structural reuse ensures pixel-perfect consistency
- **Auth**: Client and backend state now synchronized correctly

---

## Week 2: March 24-30, 2026

### Tasks Completed (4 items)

#### March 25
- ✅ **Spectrum UI refinement** — Aligned preview sections with Spectrum 1 typography.
- ✅ **Browser history management** — Added `window.history.back()` after post submit.
- ✅ **Secure profile and password endpoints** — Protected with session authentication.

### Key Outcomes
- **UI Polish**: Spectrum alignment for preview sections
- **Navigation**: Browser back button works after post creation
- **Security**: Password endpoints require active sessions

---

## Week 1 & Earlier: Core Features Foundation

### Tasks Completed (6 items)
- ✅ **Rich text editor** — Full-featured RichTextEditor with bold, italic, code, tables, links, images
- ✅ **Review workflow end-to-end** — Create → assign reviewers → approve/reject
- ✅ **Confidentiality agreement dialog** — Pre-submission consent flow
- ✅ **Sidebar hierarchical tree** — Expand/collapse, live search, recursive rendering
- ✅ **Draft auto-save** — Persist via `sessionStorage` with restore on return
- ✅ **Session-based authentication** — Login, logout, forgot/reset password workflows

---

## Summary by Category

### Current Week Velocity: ⭐ **Very High** (Week 4)
- **18 tasks** completed in 4 days (Apr 7-10)
- **2 major systems redesigned** (routing, design system)
- **3 architectural decisions** documented
- **Focus**: Consolidation and polish

### Mobile Navigation: **Complete** ✅
- Tap bar → in-flow accordion (Mar 31 - Apr 1)
- Full-screen overlay → in-flow push (April 1)
- All spacing aligned (16px rail tokens)
- All scroll/gesture issues resolved

### Design System: **Complete** ✅
- Icons centralized (Apr 7)
- Colors tokenized (Apr 8)
- Constants centralized (Apr 7)
- Responsive breakpoints unified (Apr 8)
- 3 new source files, 50+ duplicates eliminated

### SPA Routing: **Complete** ✅
- Centralized router with history support (Apr 8)
- Shareable `/?post=<id>` URLs (Apr 8)
- Smart navigation (SPA on-home, reload off-home) (Apr 10)
- Block auto-render on route change (Apr 10)

### Form Consistency: **Complete** ✅
- Create-post & edit-post layouts unified (Apr 9)
- Mobile button stacking (≤768px) (Apr 9)
- Desktop side-by-side buttons (Apr 9)
- Icon consolidation in auth (Apr 9)

---

## Pending Tasks

### High Priority
- [ ] Review workflow end-to-end testing
- [ ] Profile page: avatar upload
- [ ] Reviewer notifications (email or in-app)
- [ ] Sidebar Home button correct navigation

### Medium Priority
- [ ] Cards display: pagination or infinite scroll
- [ ] Forum post viewer: reply/comment thread support
- [ ] Edit-post flow: allow author resubmit after "changes requested"

### Low Priority
- [ ] OAuth / SSO integration
- [ ] Rate limiting on auth endpoints
- [ ] Integration tests for full workflow
