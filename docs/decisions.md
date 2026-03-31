# Adobe Forum — Architectural Decisions

> **Rule:** Add an entry here whenever a significant design decision is made or changed.

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
