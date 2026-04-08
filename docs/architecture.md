# Adobe Forum — Architecture

## Data Flows

### 1. Create Post Flow

```
User fills form (create-post block)
  └─ Title, Category (via folder picker), Body (RTE), Tags
       │
       ▼
  [Preview] → InlinePreview renders read-only view
       │
    [Post]
       │
       ▼
  ConfidentialityDialog — user must agree
       │
       ▼
  ReviewerPickerDialog — select 1–5 reviewers (GET /api/users)
       │
       ▼
  POST /api/posts          → creates Post (status: pending_review)
  POST /api/sidebar-items  → smart-add to sidebar tree
  POST /api/reviews        → creates Review with reviewer list
       │
       ▼
  refresh-sidebar event dispatched → sidebar re-fetches categories
  refresh-cards event dispatched   → cards grid re-fetches posts
  Draft cleared from sessionStorage
  window.history.back() after 2s
```

### 2. Review Flow

```
Reviewer sees post in sidebar "Pending Reviews"
  └─ Badge count = pendingReviews.length

Click → forum-post block loads post
  └─ Reviewer submits: approve / request changes

POST /api/reviews/:id/submit
  └─ If all reviewers approved → Post status = 'published'
  └─ If any changes requested → Post status = 'changes_requested'
     └─ Author sees status in "My Requests" sidebar section
```

### 3. Sidebar Data Flow

```
On mount (sidebar.js):
  GET /api/auth/me           → currentUser (null | false | user)
  GET /api/sidebar/categories → category tree (normalizeItems)
  GET /api/reviews/pending    → pendingReviews[]
  GET /api/reviews/my-requests → myRequests[]

Events that trigger re-fetch:
  'refresh-sidebar'   → fetchCategories + fetchPendingReviews + fetchMyRequests
  'forum-auth-changed'→ fetchCurrentUser
  'pageshow' (persisted bfcache) → fetchCategories
  window resize ≥768px → re-open sidebar if collapsed
```

---

## API Structure

### Auth — `/api/auth`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Session login |
| POST | `/register` | New user |
| POST | `/logout` | Destroy session |
| GET | `/me` | Returns current user (401 if not authed) |
| POST | `/forgot-password` | Send reset email |
| POST | `/reset-password` | Consume token, set new password |

### Posts — `/api/posts`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List posts (with filters) |
| POST | `/` | Create post |
| GET | `/:id` | Get single post |
| PUT | `/:id` | Update post |
| DELETE | `/:id` | Delete post |

### Reviews — `/api/reviews`
| Method | Endpoint | Description |
|---|---|---|
| POST | `/` | Create review request |
| GET | `/pending` | Reviewer's pending reviews |
| GET | `/my-requests` | Author's submitted reviews |
| POST | `/:id/submit` | Submit reviewer decision |

### Sidebar — `/api/sidebar` + `/api/sidebar-items`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/sidebar/categories` | Full category tree |
| POST | `/sidebar/categories` | Create category |
| DELETE | `/sidebar/categories/:id` | Delete category |
| POST | `/sidebar-items/smart-add` | Add post to correct place in tree |
| DELETE | `/sidebar-items/:id` | Delete item |

### Users — `/api/users`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all users (for reviewer picker) |

---

## Component Relationships

```
decorate(block)                    ← EDS entry point
  └─ CreatePost                    ← root state owner
       ├─ RichTextEditor           ← contenteditable, toolbar, table tools
       ├─ TagsInput                ← tag chips with autocomplete
       ├─ InlinePreview            ← read-only preview before submit
       ├─ ConfidentialityDialog    ← modal, blocks submit
       └─ ReviewerPickerDialog     ← modal, selects reviewers, calls handlePost

Sidebar (sidebar.js)
  └─ CategoryItem[]
       └─ TreeItem[]               ← recursive, handles folders + files
```

---

## State Management

- All state lives in **component-local `useState`** — no global store
- Cross-component communication via **custom DOM events**:
  - `refresh-sidebar` — triggers full sidebar re-fetch
  - `refresh-cards` — triggers cards grid refresh
  - `forum-auth-changed` — triggers auth re-check in sidebar
  - `load-forum-post` — triggers post viewer to load a specific post
  - `toggle-sidebar` — open/close sidebar
  - `folder:open` / `folder:selected` — folder picker flow
  - `sidebar-state-changed` — notifies other blocks of sidebar width

---

## Styling Approach

- Each block has its own `block-name.css` scoped under `.block-name`
- Design tokens from `:root` in `styles/styles.css` (Spectrum `--sp-*` plus shared app `--color-*` tokens)
- Sidebar uses sidebar-local tokens (`--sn-*`) from its own `:root` override
- Adobe Spectrum 1 naming conventions, medium scale, 32px item height
- CSS nesting (`&`) used throughout (native, no preprocessor)
- Global responsive media queries live in `styles/responsive.css`, and the EDS loader re-injects that stylesheet last after block CSS so centralized mobile/tablet overrides still win the cascade
- Canonical breakpoints: `xs ≤ 480px` · `sm ≤ 768px` · `md ≤ 1024px` · `md+ ≥ 1024px` (documented in `scripts/utils/constants.js` as `BREAKPOINTS`)
- CSS custom properties cannot be used inside `@media` expressions — pixel values are literal in CSS, with `constants.js` as the JS source of truth


- Inline JS/icon colors are centralized through scripts/utils/colors.js when markup needs token-aligned values outside CSS
