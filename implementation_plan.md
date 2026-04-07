# localStorage / sessionStorage Audit

## Audit Report

### 1. `af_user` — user identity cache
| Field | Value |
|-------|-------|
| **Key** | `af_user` |
| **Storage** | `localStorage` |
| **Set by** | `auth-form.js` (on login), `header.js` (on login, on `/me` sync) |
| **Read by** | `forum-post.js`, `header.js`, `cards-display.js` |
| **Removed by** | `header.js` (on logout, on session expiry) |
| **Purpose** | Caches the logged-in user object (`_id`, `firstName`, `lastName`, `email`, `loginAt`) so any block can read it synchronously without an async `/api/auth/me` call on every render |

---

### 2. `edit-post-draft` — cross-page edit passthrough
| Field | Value |
|-------|-------|
| **Key** | `edit-post-draft` |
| **Storage** | `localStorage` |
| **Set by** | `forum-post.js` (`openEditForm`) |
| **Read by** | `edit-post.js` (on mount) |
| **Removed by** | `edit-post.js` (on successful save, on cancel) |
| **Purpose** | Passes full post data (title, body, tags, category, sidebarItemId) from the post viewer to the edit-post page. Using localStorage avoids URL length limits since `body` can be large HTML. Cleared immediately after reading |

---

### 3. `create-post-draft` (sessionStorage + localStorage) — accidental refresh recovery
| Field | Value |
|-------|-------|
| **Key** | `create-post-draft` |
| **Storage** | `sessionStorage` (primary) → promoted to `localStorage` on read |
| **Set by** | `create-post.js` (auto-save on form changes) |
| **Read by** | `create-post.js` (on mount — checks sessionStorage first, then localStorage) |
| **Removed by** | `create-post.js` (on successful post, on cancel) |
| **Purpose** | Prevents losing a long draft if the user accidentally refreshes the page. The sessionStorage→localStorage promotion is confusing (see risks below) |

---

### 4. `af_viewed_posts` — view deduplication
| Field | Value |
|-------|-------|
| **Key** | `af_viewed_posts` |
| **Storage** | `localStorage` |
| **Set by** | `forum-post.js` (when a non-author opens a post) |
| **Read by** | `forum-post.js` (checked before incrementing view count) |
| **Removed by** | Never — grows indefinitely |
| **Purpose** | Prevents double-counting views when the same user opens the same post multiple times in the same browser session. Guards the `POST /api/posts/:id?view=1` endpoint |

---

### 5. `folder:pending-selection` — folder picker result
| Field | Value |
|-------|-------|
| **Key** | `folder:pending-selection` |
| **Storage** | `localStorage` |
| **Set by** | `folder.js` (`handleSelect`) |
| **Read by** | Not read anywhere — emits `folder:selected` CustomEvent instead (same tick) |
| **Removed by** | Never explicitly removed |
| **Purpose** | Appears to be a **dead write** — the result is already dispatched via CustomEvent. `localStorage` here serves no real purpose and the data is never retrieved |

---

### 6. `af_open_post` — cross-page post navigation
| Field | Value |
|-------|-------|
| **Key** | `af_open_post` |
| **Storage** | `sessionStorage` |
| **Set by** | `sidebar.js` (when navigating to home to open a specific post) |
| **Read by** | `forum-post.js` (`decorate()`) |
| **Removed by** | `forum-post.js` (immediately after reading) |
| **Purpose** | Carries a `postId` across a page navigation. Since the sidebar can be on any page and the forum-post viewer is only on the homepage, a cross-page signal is needed. sessionStorage is correct here — it's tab-scoped, survives navigation but not multiple tabs |

---

### 7. `fonts-loaded` — font performance optimization
| Field | Value |
|-------|-------|
| **Key** | `fonts-loaded` |
| **Storage** | `sessionStorage` |
| **Set by** | `scripts/scripts.js` (after fonts load, non-localhost only) |
| **Read by** | `scripts/scripts.js` (to skip lazy loading on desktop or repeat views) |
| **Removed by** | Automatically (sessionStorage is cleared when tab closes) |
| **Purpose** | EDS performance optimization — skips lazy font loading if fonts were already loaded in this session. Purely infrastructure/performance |

---

## Classification

| Key | Storage | Classification | Reason |
|-----|---------|----------------|--------|
| `af_user` | localStorage | ✅ **Keep Frontend** | Synchronous access needed across multiple blocks without async calls. Backend session already authoritative — this is a read cache with a short TTL managed by the header |
| `edit-post-draft` | localStorage | ✅ **Keep Frontend** | Cross-page passthrough that is immediately consumed and deleted. Body HTML can be 50KB+ — unsuitable for URL params. Too transient for a DB record |
| `create-post-draft` | sessionStorage + localStorage | ⚠️ **Keep Frontend (simplify)** | Accidental refresh recovery for in-progress writes. Not user-identity data. The dual sessionStorage→localStorage promotion is confusing and should be simplified to just `sessionStorage` |
| `af_viewed_posts` | localStorage | 🔴 **Migrate to Backend** | Grows unbounded. Inaccurate across devices/incognito. A proper backend deduplication (e.g. a `viewedBy` set on the Post model, or server-side IP/session tracking) would be more reliable and correct |
| `folder:pending-selection` | localStorage | 🔴 **Remove (dead code)** | Never read by anything. Result is already dispatched as a CustomEvent. This write serves no purpose |
| `af_open_post` | sessionStorage | ✅ **Keep Frontend** | Cross-page navigation signal. Correct use of sessionStorage — tab-scoped, auto-cleared |
| `fonts-loaded` | sessionStorage | ✅ **Keep Frontend** | EDS infrastructure optimization. Has nothing to do with app data |

---

## Migration Plan

### Item 1: `af_viewed_posts` → Migrate to Backend

**Problem:** The current array grows indefinitely in localStorage, resets in incognito, and is per-device (opening the same post on mobile and desktop both count as views).

**Backend API Changes:**

The existing view endpoint `GET /api/posts/:id?view=1` already fires a server-side increment. The only change needed is to move deduplication from the client to the server using the existing session.

```
PATCH /api/posts/:id/view
```
- Adds the session user's `_id` (or a hashed IP for guests) to a `viewedBy` set on the Post document
- Returns `{ alreadyViewed: true | false, views: <number> }`
- Server only increments if this actor hasn't already viewed this post

**DB Schema Change (minimal):**

Add `viewedBy` to the Post model — a Set of user IDs (or anon tokens):
```js
viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
```

**Frontend Changes (`forum-post.js`):**

Replace:
```js
const viewedPosts = JSON.parse(localStorage.getItem('af_viewed_posts') || '[]');
if (!viewedPosts.includes(postId)) {
  fetch(`${API_BASE}/posts/${postId}?view=1`).catch(() => {});
  viewedPosts.push(postId);
  localStorage.setItem('af_viewed_posts', JSON.stringify(viewedPosts));
}
```
With:
```js
fetch(`${API_BASE}/posts/${postId}/view`, { method: 'PATCH', credentials: 'include' })
  .then(r => r.json())
  .then(d => { if (!d.alreadyViewed) setViewsCount(c => c + 1); })
  .catch(() => {});
```

**Risk:** Low. The view count display is already an optimistic local state — this just moves the deduplication logic server-side where it belongs.

---

### Item 2: `folder:pending-selection` → Remove (dead write)

The `localStorage.setItem('folder:pending-selection', ...)` in `folder.js:849` is never read by any code in the project. The selected folder data is already communicated via a `folder:selected` CustomEvent dispatched in the same call.

**Change:** Simply delete the `localStorage.setItem` line.

**Risk:** Zero — nothing reads this key.

---

### Item 3: `create-post-draft` → Simplify (sessionStorage only)

The current logic reads `sessionStorage`, promotes the data to `localStorage`, then on the next mount reads `localStorage`. This creates confusion and leaves stale data in `localStorage` if the tab crashes after promotion but before cleanup.

**Change:** Use only `sessionStorage` for the draft. It already survives page refreshes within the same tab (which is the only use case needed) and auto-clears when the tab closes.

**Risk:** Low. Users lose drafts when they close and re-open the tab, which is acceptable behavior. The current localStorage fallback was only protecting against this edge case, which is not worth the complexity.

---

## Open Questions

> [!IMPORTANT]
> For the `af_viewed_posts` migration: should **anonymous** (logged-out) views be counted? Currently they are. If we move to session-based deduplication, logged-out users would increment the count every visit since they have no persistent identity. Options:
> 1. Use a short-lived browser cookie as an anon token
> 2. Count all guest views without deduplication (simple)
> 3. Keep client-side deduplication for guest users only, backend for logged-in users

> [!NOTE]
> The `af_user` localStorage cache is the right approach, but it **bypasses server authority** for a few milliseconds on load. Header.js already handles session expiry via `/api/auth/me` polling. No change recommended here.

---

## Summary

| Action | Key | Effort |
|--------|-----|--------|
| 🔴 Migrate to backend | `af_viewed_posts` | Medium — new PATCH endpoint + Post schema update |
| 🔴 Delete dead code | `folder:pending-selection` | Trivial — remove 3 lines |
| ⚠️ Simplify | `create-post-draft` | Small — remove localStorage fallback |
| ✅ No change | `af_user`, `edit-post-draft`, `af_open_post`, `fonts-loaded` | — |
