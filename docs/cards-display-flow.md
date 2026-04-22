# Cards Display Flow

This document explains how `cards-display` works so it is easier to talk through in a code review.

Main source file:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:1)

## Purpose

The `cards-display` block is the forum listing view.

It is responsible for:

- restoring client auth state from the backend session when possible
- fetching the list of posts from the backend
- rendering each post as a card
- handling pagination
- reacting to search, category filter, sort, and "my posts" mode
- switching between list view and single-post view

## High-Level Flow

The flow is:

1. `decorate(block)` runs when the block loads.
2. It checks whether `localStorage.af_user` already exists.
3. If not, it tries `GET /api/auth/me` to rebuild client auth from the current backend session.
4. If auth restoration fails with `401`, it clears stale client auth and starts Adobe IMS sign-in.
5. If auth is okay, it mounts the `CardsDisplay` component.
6. `CardsDisplay` fetches posts from `GET /api/posts` using the current page, search, category, sort, and author filters.
7. The cards render.
8. When a user clicks a card, the list hides and the app dispatches `load-forum-post` so the single-post block can load that post.

## Entry Point

The block entry is the `decorate` function near the bottom of the file:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:566)

What it does:

- checks for `af_user` in `localStorage`
- if missing, calls `restoreClientAuthFromSession()`
- reads title and subtitle from the authored block content
- clears the block HTML
- renders the Preact component

## Auth Restore Step

The helper is:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:64)

`restoreClientAuthFromSession()` calls:

- `GET /api/auth/me`

Why this exists:

- some parts of the app expect `af_user` in `localStorage`
- but the server session may still be valid even when local storage is empty
- this helper rehydrates the client from the backend

If `/me` returns `401`:

- `clearClientAuthState()` runs
- `window.adobeIMS.signIn()` is called if IMS is available
- rendering stops for that turn

This is why `cards-display` acts as one of the auth gates for the app.

## Main Component State

The main component starts here:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:261)

Important state values:

- `posts`: the current page of cards
- `loading`: whether data is being fetched
- `error`: whether the fetch failed
- `currentPage`: current pagination page
- `totalPages`: total available pages from the API
- `totalCount`: total number of matching posts
- `searchQuery`: current search term, initialized from the URL
- `category`: current selected category
- `sortOption`: current sort mode
- `refreshTick`: simple trigger used to refetch data after events
- `isMine`: whether the user is viewing their own posts
- `authorId`: author filter from the URL or events
- `showBackToTop`: controls the floating back-to-top button

## How Posts Are Fetched

The fetch logic is in this effect:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:333)

It builds a URL for:

- `GET /api/posts`

Query params added when relevant:

- `page`
- `limit`
- `sort`
- `search`
- `category`
- `author`
- `mine=true`

This effect reruns whenever these dependencies change:

- `currentPage`
- `searchQuery`
- `category`
- `refreshTick`
- `authorId`
- `sortOption`
- `isMine`

Important behavior:

- it uses `AbortController` so old fetches are canceled if state changes quickly
- it sets `loading=true` before starting
- it stores the normalized `posts`, `totalPages`, and `totalCount`
- it sets `error=true` only for real failures, not aborted requests

## Title Logic

The title is dynamic.

It changes depending on the mode:

- default title from authored content
- `My Posts` when `authorId` or `isMine` is active
- `<category> Posts` when category filter is active
- `Search Results: "<query>"` when search is active

It also supports a `{n}` token in the authored title, which gets replaced with the total post count.

This logic is built around:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:277)

## Search and URL Sync

The component initializes `searchQuery` from `window.location.search`.

Then this effect keeps the browser URL in sync:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:379)

Behavior:

- if there is a search term, it writes `?search=...`
- if search is cleared, it removes that param
- it uses `history.replaceState`, not a full page reload

This is useful because:

- search state survives reload/share better
- the UI stays in sync with the URL

## Event-Driven Behavior

The block listens for custom window events here:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:393)

### `search-posts`

Used when the search UI wants the cards list to show results.

Effect:

- sets `searchQuery`
- clears `category`
- resets to page 1

### `filter-category`

Used when a category is selected from the sidebar.

Effect:

- sets `category`
- clears search
- exits "my posts" mode
- clears `authorId`
- resets to page 1

### `show-cards`

Used to force the app back into list view.

Effect:

- calls `toggleViews(true)`
- scrolls to top

### `refresh-cards`

Used when another part of the app wants the list refreshed.

Examples:

- after switching to "my posts"
- after resetting the view

Effect:

- may enable `isMine`
- may set `authorId`
- may reset back to `/`
- increments `refreshTick` to trigger refetch

### `edit-post:saved`

Also triggers refresh using the same handler.

This ensures the cards list updates after editing a post.

## Popstate and Return From Post View

This effect handles browser navigation and card count refresh:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:292)

It listens for:

- `popstate`
- `af-post-updated`

### `popstate`

When the browser goes back from a post page state:

- cards view is shown again
- page scroll goes to the top
- `refreshTick` increments so the list can refetch fresh data

### `af-post-updated`

This is an optimization event.

Instead of fetching the whole card list again, it updates the matching card in local state:

- `views`
- `likes`

That gives faster visual feedback after interactions inside the post detail view.

## Switching Between Cards and Forum Post

The list/post view switch is controlled by:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:85)

`toggleViews(showCards)`:

- shows or hides card wrappers
- shows or hides the single post wrapper
- shows or hides the search wrapper
- toggles `body.is-viewing-post`

When a card is clicked:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:457)

Flow:

1. hide cards and show post mode
2. dispatch `load-forum-post` with `postId`
3. scroll to top

This means `cards-display` does not directly fetch the full post detail itself.
It only signals the forum-post block to do that.

## Card Rendering Logic

Each card is rendered by the `Card` component:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:102)

What it derives:

- `id`
- first 3 tags
- image from the post body HTML
- placeholder image if no image exists
- author display name
- avatar initials and avatar color
- text excerpt from HTML body
- display category and full category breadcrumb

Important helpers:

- `extractExcerpt()` strips HTML and creates preview text
- `firstImageFromBody()` extracts the first `<img>`
- `avatarInitials()` and `avatarColor()` create the avatar display

The card also supports keyboard access:

- `Enter`
- `Space`

So it works like a clickable card button for keyboard users too.

## Loading, Error, and Empty States

### Loading

While fetching, the component shows skeleton cards from:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:244)

### Error

If fetch fails, it shows:

- `Failed to load posts. Please try again.`

### Empty State

The empty-state helper is:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:479)

There are 3 main empty-state modes:

- no posts in "my posts" view
- no search/category results
- generic no posts found

## Pagination

The pagination UI is handled by:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:198)

Behavior:

- only shows when `totalPages > 1`
- shows nearby pages around the current page
- adds ellipsis when needed
- scrolls the block into view when a new page is selected

This makes paging smoother when the grid is lower on the page.

## Back-To-Top Button

The floating button logic is here:
[blocks/cards-display/cards-display.js](/c:/Users/nehalv/Desktop/Adobe-forum/adobe-forum/blocks/cards-display/cards-display.js:463)

Behavior:

- becomes visible after scrolling more than 300px
- scrolls the window to the top when clicked

## APIs Used By Cards Display

Directly used in this file:

- `GET /api/auth/me`
- `GET /api/posts`

Indirect collaboration with other blocks happens through events, not direct API calls.

## Review Talking Points

These are good points to mention in a review:

- `cards-display` is both a listing UI and a coordination layer between search, sidebar, and forum-post.
- It uses event-driven communication instead of directly importing the post-detail block.
- It supports URL-based search state, which helps persistence and shareability.
- It uses `AbortController` correctly to avoid race conditions in rapid filter/page changes.
- It updates likes/views optimistically through the `af-post-updated` event instead of always refetching the whole grid.
- It still depends on backend session restoration through `/api/auth/me`, so it is part of the current mixed SSO/session architecture.

## One Important Caveat

Even though the frontend is moving toward Adobe IMS SSO, this block still depends on:

- `localStorage.af_user`
- successful `/api/auth/me` restoration when local storage is empty

So if SSO redirects do not return to the app correctly, `cards-display` may never finish its auth restore step, and the list view cannot be tested end-to-end from that environment.
