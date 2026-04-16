# API Reference

This document lists the backend APIs currently used by the Adobe Forum app, what each endpoint does, and where it is used from the frontend.

## Quick Endpoint List

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PATCH /api/auth/profile`
- `PATCH /api/auth/change-password`

### Posts

- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/notifications`
- `GET /api/posts/:id`
- `POST /api/posts/:id/view`
- `POST /api/posts/:id/like`
- `PATCH /api/posts/notifications/:notificationId/read`
- `PATCH /api/posts/:id`

### Reviews

- `POST /api/reviews`
- `GET /api/reviews/pending`
- `GET /api/reviews/author-notifications`
- `PATCH /api/reviews/:id/dismiss-notification`
- `GET /api/reviews/by-post/:postId`
- `GET /api/reviews/my-requests`
- `PATCH /api/reviews/:id`

### Sidebar

- `GET /api/sidebar-items/by-post/:postId`
- `POST /api/sidebar-items`
- `POST /api/sidebar-items/smart-add`
- `PATCH /api/sidebar-items/:id`
- `PATCH /api/sidebar-items/:id/move`
- `DELETE /api/sidebar-items/:id`
- `POST /api/sidebar/categories`
- `GET /api/sidebar/categories`
- `DELETE /api/sidebar/categories/:id`

### Users

- `GET /api/users`

## Base URLs

- `API_BASE`
  Used for general forum APIs such as posts, reviews, sidebar, and users.
- `AUTH_API_BASE`
  Resolves to `${API_BASE}/auth` and is used for auth/profile endpoints.

Defined in [scripts/utils/constants.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/scripts/utils/constants.js:17).

## Auth Model

The current backend still protects most write and user-specific APIs with the `requireAuth` middleware in [server/middleware/auth.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/middleware/auth.js:1).

That means:

- Public endpoints can be called without a server session.
- Protected endpoints require the backend session cookie.
- The frontend is partly migrated to Adobe IMS SSO, but the backend is not yet fully token-based.

## Route Groups

### Auth APIs

Mounted at `/api/auth` in [server/app.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/app.js:48).

| Method | Path | Auth | Purpose | Used by |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/register` | No | Creates a local email/password account and starts a session. | Legacy auth flow |
| `POST` | `/api/auth/login` | No | Signs in with local email/password and creates a session. | Legacy auth flow |
| `POST` | `/api/auth/logout` | No | Destroys the server session and clears `connect.sid`. | Legacy auth flow |
| `GET` | `/api/auth/me` | Yes | Returns the logged-in user and session/login timestamp. | `cards-display`, `sidebar`, `folder` |
| `POST` | `/api/auth/forgot-password` | No | Generates reset token and sends reset email. | Legacy password reset flow |
| `POST` | `/api/auth/reset-password` | No | Consumes reset token and updates password. | `reset-password` block |
| `PATCH` | `/api/auth/profile` | Yes | Updates `firstName` and `lastName` for the logged-in user. | `header` profile popup |
| `PATCH` | `/api/auth/change-password` | Yes | Changes password using current password verification. | Legacy password flow |

#### Notes

- `register`, `login`, `forgot-password`, `reset-password`, and `change-password` are legacy/local-auth endpoints.
- `GET /api/auth/me` is still important because several frontend blocks use it to hydrate the current user from the backend session.

### Post APIs

Mounted at `/api/posts` in [server/app.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/app.js:49).

| Method | Path | Auth | Purpose | Used by |
| --- | --- | --- | --- | --- |
| `POST` | `/api/posts` | Yes | Creates a new post. Can optionally create a `pending_review` post. | Create-post flow |
| `GET` | `/api/posts` | No | Returns paginated post list with search, category, author, and sort filters. | `cards-display` |
| `GET` | `/api/posts/notifications` | Yes | Returns unread like notifications for the current user. | `header` |
| `GET` | `/api/posts/:id` | No | Returns one post by ID. | `forum-post` |
| `POST` | `/api/posts/:id/view` | Yes | Tracks a unique view for the current user. | `forum-post` |
| `POST` | `/api/posts/:id/like` | Yes | Toggles like/unlike and creates a notification for the post author. | `forum-post` |
| `PATCH` | `/api/posts/notifications/:notificationId/read` | Yes | Marks a post notification as read. | `header` |
| `PATCH` | `/api/posts/:id` | Yes | Updates a post. Also resubmits review state if needed. | Post edit flow |

#### Query params for `GET /api/posts`

- `page`: page number
- `limit`: page size
- `search`: text search across title, category, tags, body, and author name
- `category`: filter by category
- `author`: filter by one author ID
- `sort`: `latest`, `oldest`, `most_viewed`, `most_liked`
- `mine=true`: returns the logged-in user’s posts, including non-published ones, if a valid backend session exists

### Review APIs

Mounted at `/api/reviews` in [server/app.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/app.js:51).

| Method | Path | Auth | Purpose | Used by |
| --- | --- | --- | --- | --- |
| `POST` | `/api/reviews` | Yes | Creates a review request for a post and assigns reviewers. | Review request flow |
| `GET` | `/api/reviews/pending` | Yes | Returns reviews where the current user is still a pending reviewer. | `header`, `sidebar` |
| `GET` | `/api/reviews/author-notifications` | Yes | Returns author-facing review decisions not yet dismissed. | `header` |
| `PATCH` | `/api/reviews/:id/dismiss-notification` | Yes | Marks an author review notification as seen. | `header` |
| `GET` | `/api/reviews/by-post/:postId` | Yes | Returns review document for one post. | `forum-post` |
| `GET` | `/api/reviews/my-requests` | Yes | Returns all review requests created by the current author. | `header`, `sidebar` |
| `PATCH` | `/api/reviews/:id` | Yes | Reviewer approves/requests changes, or author resets all reviewers back to pending. | `forum-post` |

#### Notes

- Review state drives the notifications badge in the header.
- Review state also controls post publishing and re-submission behavior.

### Sidebar APIs

Mounted at `/api` in [server/app.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/app.js:50), so the full paths are mixed under `/api/sidebar-items` and `/api/sidebar/categories`.

| Method | Path | Auth | Purpose | Used by |
| --- | --- | --- | --- | --- |
| `GET` | `/api/sidebar-items/by-post/:postId` | No | Finds the sidebar item linked to a given post. | `forum-post` |
| `POST` | `/api/sidebar-items` | Yes | Creates a sidebar item or folder. | `folder` |
| `POST` | `/api/sidebar-items/smart-add` | Yes | Ensures category anchor exists, then creates a sidebar leaf item. | Smart-add flow |
| `PATCH` | `/api/sidebar-items/:id` | Yes | Renames a sidebar item. | `folder` |
| `PATCH` | `/api/sidebar-items/:id/move` | Yes | Moves an item to a different category/folder and updates linked post category when needed. | Folder move flow |
| `DELETE` | `/api/sidebar-items/:id` | Yes | Deletes an item and descendants, with ownership and review-state checks. | `sidebar`, `folder` |
| `POST` | `/api/sidebar/categories` | Yes | Creates a new root category anchor. | `folder` |
| `GET` | `/api/sidebar/categories` | No | Returns full nested category tree, filtered to published posts. | `sidebar`, `folder` |
| `DELETE` | `/api/sidebar/categories/:id` | Yes | Deletes a whole category with ownership and review-state checks. | `sidebar`, `folder` |

#### Notes

- Sidebar categories are represented by root-level folder records in `SidebarItem`.
- `GET /api/sidebar/categories` is public and intentionally hides unpublished linked posts.

### User APIs

Mounted at `/api/users` in [server/app.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/server/app.js:52).

| Method | Path | Auth | Purpose | Used by |
| --- | --- | --- | --- | --- |
| `GET` | `/api/users` | Yes | Returns all users except the current logged-in user. | Reviewer selection flow |

## Frontend Usage Map

These are the main blocks that currently call backend APIs:

- `blocks/header/header.js`
  Uses profile update, review notifications, and post notifications APIs.
- `blocks/cards-display/cards-display.js`
  Uses `GET /api/auth/me` and `GET /api/posts`.
- `blocks/forum-post/forum-post.js`
  Uses post fetch, view, like, review read/update, and sidebar lookup APIs.
- `blocks/sidebar/sidebar.js`
  Uses auth/session check, category tree, and review summary APIs.
- `blocks/folder/folder.js`
  Uses auth/session check plus category/item create, edit, and delete APIs.
- `blocks/reset-password/reset-password.js`
  Uses only `POST /api/auth/reset-password`.

## Legacy vs Active APIs

### Still active in the current app

- `GET /api/auth/me`
- `PATCH /api/auth/profile`
- All post APIs
- All review APIs
- All sidebar APIs
- `GET /api/users`

### Legacy / local-auth APIs still present on the server

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `PATCH /api/auth/change-password`

These still exist because the backend is currently session-based, even though the frontend is being moved toward Adobe IMS SSO.

## Important Caveat

The frontend SSO migration is ahead of the backend migration.

Today the app is in a mixed state:

- Browser sign-in is being moved to Adobe IMS.
- Backend protected APIs still rely on the local server session via `requireAuth`.

So when planning cleanup, do not remove the session-backed protected APIs until there is a replacement backend auth mechanism for:

- post creation/editing
- reviews
- notifications
- sidebar writes
- user list access
