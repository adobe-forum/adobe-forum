# Vishnu's Contributions — Code Review Document

> **Scope:** `blocks/sidebar/`, `blocks/forum-post/`, `blocks/edit-post/`, `blocks/create-post/`  
> **Stack:** Preact (htm-tagged templates), vanilla `fetch`, AEM block architecture

---

## 1. Sidebar (`blocks/sidebar/sidebar.js`)

The sidebar is a fully self-contained Preact application mounted via AEM's `decorate()` hook. It manages a hierarchical folder/file tree, live search, review queues, and owner-gated deletion — all within a single component tree.

---

### 1.1 Folder Structure & Nesting

#### Data normalization

Raw API data is normalised on arrival by `normalizeItems()` (line 28). This:

- Converts `_id` / `id` fields to plain strings via `extractPostId()` (line 21).
- Coerces `createdBy` to a string so `===` comparisons against `currentUser._id` are safe.
- Recursively walks `children` arrays, producing a clean, uniform shape regardless of how Mongoose populates the document.

```js
// sidebar.js – normalizeItems
function normalizeItems(items) {
  return (items || []).map((item) => {
    const children = normalizeItems(item.children || []);
    const postId = extractPostId(item.postId);
    return {
      ...item,
      id: String(item._id || item.id || ''),
      isFolder: Boolean(item.isFolder),
      createdBy: item.createdBy ? String(item.createdBy) : null,
      postId,
      children,
    };
  });
}
```

#### Sort order

`sortTreeItems()` (line 54) sorts all items so **folders always appear before files**, then alphabetically by title (case-insensitive). This sort is applied at every level of the tree before rendering.

#### Recursive rendering — `TreeItem`

`TreeItem` (line 153) is a recursive Preact component. Each instance renders:

- A **chevron toggle button** (hidden for non-folders via `hidden` attr).
- A **folder or file icon** imported from `scripts/utils/icons.js`.
- A `HighlightedText` span (see §1.3 below).
- An optional **trash button** shown on hover, only when `canEdit` is true.
- A `<ul class="tree-children">` that maps over `sortedChildren` and renders another `TreeItem` at `level + 1`, with `paddingLeft` increased by 20 px per level (capped at 100 px).

Nesting depth is unbounded — the tree can represent any category → folder → sub-folder → file hierarchy that the backend returns.

**Key design decision:** the component trusts `item.isFolder` exclusively (comment at line 168). It never promotes a post-link to a folder simply because it has `children`, preventing a duplication bug that occurs when a post is added to a folder. 

#### Expand / collapse state

Expansion state is stored in two `useState` maps at the root `Sidebar` level:
- `expandedCategories` — top-level category panels.
- `expandedFolders` — mid-level folder nodes.

Both are plain `{ [id]: boolean }` objects updated by `handleToggleCategory` / `handleToggleFolder` (lines 579–603). When a category _expands_, all child folder IDs are collected by `collectFolderIds()` (line 46) and explicitly set to `false`, ensuring clean collapse state when the user re-opens a category.

When `searchTerm` is active, `isExpanded` is forced `true` for every node (line 173), so all matching items are visible without the user having to open folders manually.

---

### 1.2 Search Highlighting

#### Filtering

The `filterItems()` function (line 663) recurses through the items tree. An item passes the filter if either:
1. Its `title` contains the search term (case-insensitive), or
2. _Any_ of its descendants match.

Matched items are returned with their `children` replaced by only the matched sub-items, keeping the tree shape intact.

Top-level categories are also tested (`cat.name.toLowerCase().includes(searchTerm)`) and pass if the category name itself matches or any item inside passes.

The computed `filteredCategories` (line 672) is derived from the full `categories` state on every render with no debounce. Because it's a pure in-memory filter (no API call), this is fast enough in practice.

#### `HighlightedText` component

`HighlightedText` (line 120) receives the raw `text` and the current `highlight` string. It:

1. Escapes the highlight string so special regex characters (`.`, `*`, `(`, etc.) are treated literally.
2. Splits `text` on the escaped pattern with capture groups — preserving the matched substrings in the resulting array.
3. Maps each part: if `part.toLowerCase() === highlight.toLowerCase()`, it wraps it in `<mark class="search-highlight">`, otherwise it renders the string as-is.

```js
function HighlightedText({ text, highlight }) {
  if (!highlight) return text;
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedHighlight})`, 'gi'));
  return parts.map((part, i) => (
    part.toLowerCase() === highlight.toLowerCase()
      ? html`<mark key=${i} class="search-highlight">${part}</mark>`
      : part
  ));
}
```

The `<mark>` element is styled via `sidebar.css` to give the yellow-highlight appearance.

---

### 1.3 Delete Logic

#### Ownership gate — `isOwner()`

Before rendering the trash button, `isOwner(item, currentUser)` (line 142) is checked. It returns `true` only when:

- `currentUser` is a truthy object (user is logged in), **and**
- `item.createdBy` is non-null (handles legacy/shared items that have no owner), **and**
- `String(item.createdBy) === String(currentUser._id)`.

This ensures the delete button is never shown for items created by other users, and never shown for legacy items that pre-date the owner field.

#### Confirmation dialog — `SpectrumAlertDialog`

`SpectrumAlertDialog` (line 65) is a Preact component that mirrors Adobe Spectrum's destructive alert dialog pattern. It:

- **Locks body scroll** while open using `document.body.style.overflow = 'hidden'` (line 72), restored in the cleanup.
- Allows backdrop-click dismissal (`handleBackdropClick` checks `e.target === e.currentTarget`).
- Renders a warning SVG icon, a title, a message, and two buttons: "Cancel" and "Delete".
- Is accessible: `role="alertdialog"`, `aria-modal="true"`, labelled by `aria-labelledby`.

When the user clicks "Delete", the trash button calls `handleDelete` (line 571) which sets `deleteDialog` state with the item's ID and title. This is what makes the dialog appear.

#### `confirmDelete()` API call

`confirmDelete` (line 606) performs the actual deletion:

1. Determines the correct endpoint:
   - `DELETE /api/sidebar-items/:itemId` for a leaf or folder item.
   - `DELETE /api/sidebar/categories/:categoryId` for a root category.
2. On success:
   - If deleting a leaf item, fires the `sidebar-item-deleted` custom event so `forum-post` can navigate away if that post is currently open.
   - Calls `fetchCategories()` to refetch and re-render the tree.
   - Fires `refresh-cards` so the cards list stays in sync.
3. On failure, sets `deleteError` state which renders an inline error message.

---

## 2. Forum Post (`blocks/forum-post/forum-post.js`)

The `ForumPost` block is the main content viewer. It is hidden on initial page load and made visible only when the router signals a post to display.

---

### 2.1 View Count Tracking

Views are tracked client-side using `localStorage` to prevent inflating counts when the same user visits the same post multiple times.

The logic (lines 317–330):

1. After fetching the post, checks `isAuthor` by comparing `currentUser._id` with the post's `createdBy`. Authors' own views are excluded.
2. Reads `af_viewed_posts` from `localStorage` (a JSON array of post IDs).
3. If the current `postId` is **not** in the array, fires a fire-and-forget `GET /api/posts/:id?view=1` request to increment the counter on the server.
4. Adds the `postId` to the array and writes it back to `localStorage`.
5. Increments `viewsCount` state locally so the UI updates immediately without waiting for a re-fetch.

After loading, the updated view count is broadcast via the `af-post-updated` custom event so the cards list (if visible) can update its display without a full refetch.

---

### 2.2 Like Functionality

#### Optimistic update

The `toggleLike` handler (line 455) uses an optimistic UI pattern:

1. Records the current `hasLiked` / `likesCount` for rollback.
2. Immediately toggles `hasLiked` and increments/decrements `likesCount` in state — the UI updates instantly.
3. Fires an `af-post-updated` event so the cards list reflects the change immediately.
4. Sends `POST /api/posts/:id/like` with session credentials.
5. If the request fails, reverts `hasLiked` and `likesCount` to their original values and fires another `af-post-updated` event with the reverted count.

```js
const toggleLike = async () => {
  if (!currentUser) {          // Prompt login if not authenticated
    window.dispatchEvent(new CustomEvent('open-auth-modal'));
    return;
  }
  const originallyLiked = hasLiked;
  const newLikesCount = originallyLiked ? likesCount - 1 : likesCount + 1;
  setHasLiked(!originallyLiked);         // Optimistic
  setLikesCount(newLikesCount);

  try {
    const response = await fetch(`.../posts/${post.id}/like`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('...');
  } catch {
    setHasLiked(originallyLiked);        // Rollback
    setLikesCount(/* reverted */);
  }
};
```

#### Guest handling

If `currentUser` is null (not logged in), clicking the like button dispatches `open-auth-modal` instead of attempting the API call. The heart icon itself renders in an "unfilled" state for guests.

---

## 3. Edit Post (`blocks/edit-post/edit-post.js`)

The Edit Post block is a standalone page (`/edit-post`) that pre-fills a `RichTextEditor` with the current post content. It shares its `RichTextEditor` and `TagsInput` components with Create Post.

---

### 3.1 Edit with Preview

#### Loading the draft

When the user clicks **Edit** on a post in the `forum-post` viewer, `openEditForm()` (forum-post.js, line 21) serialises the post's fields into `localStorage` under the key `edit-post-draft` and navigates to `/edit-post`. This avoids URL-length limits (post bodies can be thousands of characters of HTML).

On mount (edit-post.js, line 1788), `EditPost` reads `localStorage`:

```js
const saved = localStorage.getItem('edit-post-draft');
const draft = JSON.parse(saved);
setEditId(draft.id);
setEditSidebarItemId(draft.sidebarItemId || null);
setTitle(draft.title || '');
setBody(draft.body || '');
setTags(draft.tags.map(tag => tag.replace(/^#/, '')));
setCategory(draft.category || '');
setOriginalDraft({ /* snapshot for dirty-check */ });
```

It also fetches the sidebar categories to resolve the correct `folderId` from the stored path or `sidebarItemId`, using `findFolderIdByPath()` and `findSidebarItemInCategories()`.

#### Dirty-check

The `isDirty` computed value (line 1851) compares the current state against `originalDraft`. The **Preview** button only appears when `isDirty` is true — there's no point previewing or saving if nothing has changed.

The Cancel button checks `isDirty` before navigating away. If dirty, it shows a warning toast with Yes/No buttons before discarding unsaved changes.

#### Preview → Save flow

Clicking **Preview** (which is the form submit) calls `handleSubmit`, setting `showPreview = true`. The component then switches to rendering the `InlinePreview` component in place of the form.

`InlinePreview` (edit-post.js, line 1606):

- Scrolls to the top of the page.
- Renders the post body via `dangerouslySetInnerHTML`.
- Adds line numbers to `<pre>` blocks by injecting a `.code-gutter` div alongside a `.code-content` div.
- Shows a `"Back to Edit"` button (sets `showPreview = false`) and a `"Post"` button that calls `handlePost`.

#### `handlePost` — PATCH with sidebar sync

`handlePost` (line 1867):

1. Sends `PATCH /api/posts/:editId` with the updated title, category, body, and tags.
2. If the post has an associated `editSidebarItemId`:
   - **Title changed?** → `PATCH /api/sidebar-items/:editSidebarItemId` to rename the tree node.
   - **Location changed?** (category or folderId differs from original) → `PATCH /api/sidebar-items/:editSidebarItemId/move` to reposition the item in the sidebar tree.
3. Removes `edit-post-draft` from `localStorage`, dispatches `refresh-sidebar` and `refresh-cards`, then calls `window.history.back()`.

---

## 4. Create Post (`blocks/create-post/create-post.js`)

Create Post is a multi-step wizard: **Form → Preview → Confidentiality Agreement → Reviewer Picker → Submit**. Each step is a discrete Preact component rendered conditionally.

---

### 4.1 Confidentiality Agreement

`ConfidentialityDialog` (line 1596) is a modal dialog that appears between the Preview and the Reviewer Picker, requiring the user to confirm their post contains no sensitive information.

**Design:**

- Mounts a scroll-lock on `document.body` and `document.documentElement` while open. The cleanup function restores the previous overflow values.
- Listens for `Escape` key to dismiss (`onDecline`).
- Backdrop click on the outer div dismisses the dialog (`e.target === e.currentTarget` guard).
- Renders a shield SVG icon, a title "Confidentiality Agreement", and a checklist of prohibited content types (confidential Adobe info, PII, credentials, NDA-covered content, internal documents).
- Two action buttons: **"Go Back"** (calls `onDecline`) and **"I Agree"** (calls `onAgree`, advancing to the Reviewer Picker).
- Fully accessible: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`.

---

### 4.2 Preview

`InlinePreview` (create-post.js, line 1757) is functionally identical to the edit-post version, but uses a shared `renderTabbedCodeBlocks()` utility from `scripts/code-tabs.js` (imported at line 5) to handle code block tab rendering more consistently.

It renders:
- A tag pills row.
- The post title as `<h1>`.
- Author displayed as "You" and the selected category.
- The full post body via `dangerouslySetInnerHTML`.
- A **"Back to Edit"** button and a **"Post"** button. Clicking "Post" in the preview does **not** submit directly — it shows the Confidentiality Agreement first.

---

### 4.3 Review Flow

The `CreatePost` component (line 1836) manages the following state flags that control which step is visible:

```
showPreview         → true  = show InlinePreview
showAgreement       → true  = show ConfidentialityDialog
showReviewerPicker  → true  = show ReviewerPickerDialog
```

The flow of the "Post" button in `InlinePreview`:

```
onPost (from InlinePreview)
  └─→ setShowAgreement(true)        // Show CA dialog

onAgree (from ConfidentialityDialog)
  └─→ setShowAgreement(false)
      setShowReviewerPicker(true)   // Show Reviewer Picker

onSubmit(reviewerIds) (from ReviewerPickerDialog)
  └─→ setShowReviewerPicker(false)
      handlePost(reviewerIds)       // API calls
```

**`handlePost`** (line 1934) executes three sequential API calls:

1. `POST /api/posts` — creates the post with `status: 'pending_review'`.
2. `POST /api/sidebar-items/smart-add` — adds the post to the correct location in the sidebar tree (using the `folderId` resolved during folder selection).
3. `POST /api/reviews` — creates a review document associating the post with the selected reviewer IDs.

Both sidebar and review creation failures are caught silently; the user sees a success toast because the post itself was created. On success, `sessionStorage` draft is cleared, `refresh-sidebar` and `refresh-cards` are fired, and the page navigates back after 2 seconds.

---

### 4.4 Reviewer Picker

`ReviewerPickerDialog` (line 1656) is the final step before submission.

**Data loading:**

On open (`isOpen` transitions to `true`), the component fetches `GET /api/users` with session credentials. The user list is stored in component state. `loadingUsers` is set during the fetch and cleared in `.finally()`.

**Selection:**

Users are toggled via the `toggle(userId)` function (line 1685). Selection rules:
- Clicking a selected user removes them.
- Clicking an unselected user adds them, **capped at 5 reviewers**.
- When `selected.length >= 5`, unselected rows receive the `disabled` class and `onClick` is suppressed via `!isDisabled &&`.

**Search:**

A text input filters the user list by matching `firstName + lastName` or `email` against the search query (case-insensitive). This is a pure in-memory filter — no additional API call.

**Submit:**

The "Submit for Review" button is `disabled` when `selected.length === 0`. The footer shows a live `${selected.length}/5 selected` counter. On click, `onSubmit(selected)` is called with the array of selected user ID strings, which are passed through to `handlePost`.

**UI details:**

- Each row shows a two-letter avatar (initials), full name, and email.
- A checkmark (`✓`) appears on the right side for selected rows.
- Scroll-lock is applied while open, removed on close.
- Backdrop click dismisses via the same `e.target === e.currentTarget` guard used in other dialogs.

---

## Component & File Map

| Feature | File | Key Components |
|---|---|---|
| Sidebar tree | `blocks/sidebar/sidebar.js` | `Sidebar`, `CategoryItem`, `TreeItem`, `HighlightedText`, `SpectrumAlertDialog` |
| Forum post viewer | `blocks/forum-post/forum-post.js` | `ForumPost` |
| Edit post | `blocks/edit-post/edit-post.js` | `EditPost`, `InlinePreview`, `RichTextEditor`, `TagsInput` |
| Create post | `blocks/create-post/create-post.js` | `CreatePost`, `InlinePreview`, `ConfidentialityDialog`, `ReviewerPickerDialog`, `RichTextEditor`, `TagsInput` |
| Shared icons | `scripts/utils/icons.js` | `TrashIcon`, `ChevronIcon`, `FolderIcon`, `FileIcon`, `HeartIcon`, … |
| Shared constants | `scripts/utils/constants.js` | `API_BASE` |
| Client-side routing | `scripts/router.js` | `navigateTo`, `navigateHome`, `getCurrentRoute` |
