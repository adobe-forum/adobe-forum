# Sidebar Component Documentation

## Overview

The sidebar component is a hierarchical navigation system for browsing forum topics and managing review requests. It displays:
- A tree of forum categories and items
- Pending reviews (for reviewers)
- My review requests (for authors)
- Search functionality with real-time filtering
- Responsive mobile-friendly design

## Entry Point

**File:** `sidebar.js`

**Export function:** `decorate(block)`

```javascript
export default function decorate(block) {
  block.textContent = '';
  try {
    render(html`<${Sidebar} />`, block);
  } catch (err) {
    console.error('Sidebar render error:', err);
  }
}
```

This function:
1. Clears any existing content in the `block` element
2. Renders the main `Sidebar` component using Preact
3. Catches and logs any rendering errors

---

## Application Flow

### 1. Initial Setup (On Mount)

When the Sidebar component mounts:

```
Sidebar mounts
    ↓
Fetch current user (GET /api/auth/me)
    ↓
Listen for auth changes (forum-auth-changed event)
    ↓
Fetch sidebar categories (GET /api/sidebar/categories)
    ↓
Listen for refresh events (refresh-sidebar event)
    ↓
Render categories, items, and reviews
```

### 2. Authentication Flow

**When the component mounts:**
- Calls `fetchCurrentUser()` to check if user is logged in
- Sets up listener for `forum-auth-changed` event (fired when user logs in/out)
- Re-fetches user on login/logout

**API:** `GET /api/auth/me`
- Sends session cookie automatically (`credentials: 'include'`)
- Returns: `{ user: { _id, firstName, lastName, ... } }` if logged in
- Status 401 = user not logged in (sets `currentUser` to `false`)

**State:**
- `currentUser = null` → checking
- `currentUser = false` → not logged in
- `currentUser = {...}` → logged in

---

## API Endpoints

### 1. Authentication

#### `GET /api/auth/me`
- **Purpose:** Check if current user is logged in
- **Called:** On component mount + when auth changes
- **Response:**
  ```javascript
  { user: { _id, firstName, lastName, email, ... } }
  ```
- **Error:** 401 Unauthorized if not logged in

---

### 2. Sidebar Categories & Items

#### `GET /api/sidebar/categories`
- **Purpose:** Fetch the entire sidebar tree structure
- **Called:** On mount (with 50ms delay to yield main thread) + on `refresh-sidebar` event
- **Response:**
  ```javascript
  {
    success: true,
    categories: [
      {
        id,
        name,
        createdBy,
        items: [
          {
            id,
            title,
            isFolder,
            postId,
            createdBy,
            children: [...]
          }
        ]
      }
    ]
  }
  ```
- **Processing:**
  - Items are normalized (standardize IDs, convert types)
  - Categories stored in component state
  - Sorted alphabetically (folders first, then by title)

#### `DELETE /api/sidebar/categories/{categoryId}`
- **Purpose:** Delete an entire category
- **Called:** When user confirms category deletion
- **Auth:** Credentials included (user must be owner)
- **Response:**
  ```javascript
  { success: true }
  ```
- **After success:** Refreshes sidebar via `refresh-sidebar` event

#### `DELETE /api/sidebar-items/{itemId}`
- **Purpose:** Delete a specific item from a category
- **Called:** When user confirms item deletion
- **Auth:** Credentials included (user must be owner)
- **Response:**
  ```javascript
  { success: true }
  ```
- **After success:**
  - Dispatches `sidebar-item-deleted` event
  - Refreshes sidebar
  - Dispatches `refresh-cards` event to update card display

---

### 3. Review Management

#### `GET /api/reviews/pending`
- **Purpose:** Fetch pending reviews waiting for current user (reviewer side)
- **Called:** When user logs in + on `refresh-sidebar` event
- **Auth:** Credentials included
- **Response:**
  ```javascript
  {
    success: true,
    reviews: [
      {
        _id,
        postId: { _id, title },
        authorId: { firstName, lastName },
        ...
      }
    ]
  }
  ```
- **Display:** Shows badge with count in "Pending Reviews" section
- **Only shown when:** `currentUser` is logged in

#### `GET /api/reviews/my-requests`
- **Purpose:** Fetch review requests created by current user (author side)
- **Called:** When user logs in + on `refresh-sidebar` event
- **Auth:** Credentials included
- **Response:**
  ```javascript
  {
    success: true,
    reviews: [
      {
        _id,
        postId: { _id, title },
        overallStatus: 'pending' | 'approved' | 'changes_requested',
        reviewers: [
          { status: 'pending' | 'approved' | 'changes_requested' }
        ]
      }
    ]
  }
  ```
- **Filtering:** Only shows non-approved requests
- **Display:** Shows review count badge (`X/Y reviewed`) in "My Requests" section
- **Only shown when:** `currentUser` is logged in

---

## Component Structure

### Main Components

#### 1. `Sidebar()` - Root Component
The main component that orchestrates everything.

**Key responsibilities:**
- Manage auth state and user data
- Fetch and manage sidebar categories
- Manage sidebar open/close state (responsive)
- Handle search filtering
- Manage review data (pending & requests)
- Handle item/category deletion

**State variables:**
```javascript
isOpen                    // Sidebar visible state
categories               // Tree of categories and items
loading                  // Fetching state
error                    // Error message
searchTerm              // Current search query
activeSubcategory       // Currently selected item
deleteDialog            // Delete confirmation dialog
deleteError             // Error during deletion
pendingReviews          // Reviews awaiting user's review
myRequests              // Review requests sent by user
pendingOpen             // "Pending Reviews" section expanded
requestsOpen            // "My Requests" section expanded
expandedCategories      // Which categories are open
expandedFolders         // Which folders within categories are open
currentUser             // Logged-in user object or null/false
```

#### 2. `CategoryItem()` - Category Container
Renders a category and its tree items.

**Props:**
- `category` - Category object
- `activeSubcategory` - Currently active item ID
- `currentUser` - Logged-in user
- `onSubcategoryClick` - Handler for item selection
- `onDeleteCategory` - Handler for deletion
- `onToggleCategory` - Handler for expand/collapse
- `expandedCategories` - Map of expanded category IDs
- `onToggleFolder` - Handler for folder expand/collapse
- `expandedFolders` - Map of expanded folder IDs
- `searchTerm` - Current search filter

**Features:**
- Shows/hides category items based on expand state
- Shows delete button if user owns the category
- Search auto-expands matching categories
- Filters items within category based on search

#### 3. `TreeItem()` - Individual Item
Renders a single item (post-link or folder).

**Props:**
- `item` - Item object
- `activeItem` - Currently active item ID
- `currentUser` - Logged-in user
- `onItemClick` - Handler for selecting a post
- `onDelete` - Handler for deletion
- `onToggleFolder` - Handler for folder toggle
- `expandedFolders` - Map of expanded folder IDs
- `level` - Nesting depth (for indentation)
- `searchTerm` - Current search filter

**Features:**
- Renders as folder (expandable) or file (post-link)
- Indentation based on nesting level
- Shows delete button only for owner
- Highlights search matches in title

#### 4. `HighlightedText()` - Search Highlighting
Wraps matching search terms in `<mark>` tags.

---

## Helper Functions

### `normalizeItems(items)`
Standardizes item data format:
- Converts `_id` → `id` (string)
- Converts `isFolder` to boolean
- Converts `createdBy` to string for comparison
- Recursively normalizes children
- Extracts and normalizes `postId`

### `collectFolderIds(items)`
Recursively collects all folder IDs in a tree.
Used to collapse/expand folders when toggling category visibility.

### `sortTreeItems(items)`
Sorts items by:
1. Type (folders first, then items)
2. Title (alphabetical, case-insensitive)

### `isOwner(item, currentUser)`
Determines if current user created/owns an item.
Returns `true` only if:
- User is logged in (`currentUser` is truthy)
- Item has `createdBy` property
- `createdBy === currentUser._id` (as strings)

---

## Event System

### Events Listened To

#### `forum-auth-changed`
Fired when user logs in or logs out
- Handler: `fetchCurrentUser()`
- Effect: Updates `currentUser` state, re-fetches reviews

#### `toggle-sidebar`
Fired to toggle sidebar open/close
- Payload: `{ isOpen: boolean }` (optional)
- Handler: Updates `isOpen` state, applies body classes
- Effect: Shows/hides sidebar

#### `refresh-sidebar`
Fired when sidebar data should be refreshed
- Handler: `fetchCategories()`, `fetchPendingReviews()`, `fetchMyRequests()`
- Effect: Reloads all data from server
- Triggered by: Item/category deletion, external changes

#### `pageshow` with `persisted: true`
Browser's bfcache restoration detection
- Handler: `fetchCategories()`
- Effect: Re-fetches data if page was restored from cache
- Note: Triggered when user navigates back via browser back button

### Events Dispatched

#### `sidebar-state-changed`
Fired when sidebar open/close state changes
- Payload: `{ isOpen: boolean }`
- Purpose: Notify other components of sidebar state

#### `sidebar-item-deleted`
Fired after successfully deleting an item
- Payload: `{ itemId }`
- Purpose: Notify other components to update

#### `refresh-cards`
Fired after successful deletion
- Purpose: Tell card display to refresh (removes deleted item from display)

#### `load-forum-post`
Legacy event (mentioned but not used in current code)

---

## Data Normalization & Processing

### Item Structure (from API)
```javascript
{
  _id: "abc123",           // MongoDB ID
  title: "My Post",
  isFolder: false,
  postId: "post123" | { _id: "post123" },
  createdBy: "user_id" | { _id: "user_id" },
  children: [...]
}
```

### After Normalization
```javascript
{
  id: "abc123",            // Standardized ID (string)
  title: "My Post",
  isFolder: false,
  postId: "post123",       // Guaranteed string, null if missing
  createdBy: "user_id",    // Guaranteed string or null
  children: [...]          // Recursively normalized
}
```

### Why Normalization Matters
- Handles various API response formats
- Enables consistent string comparisons (`===`)
- Prevents "post-link" items from being treated as folders
- Prevents duplicate items on creation

---

## Responsive Behavior

### Sidebar Modes

#### Desktop (>1024px)
- Sidebar always visible
- No overlay/modal behavior
- Can be closed with button but reopens on resize back to desktop

#### Mobile/Tablet (≤1024px)
- Sidebar hidden by default
- Toggles into overlay/modal view
- Closes automatically when item is clicked
- Closes automatically when screen resizes back to desktop

### Implementation
- Uses `window.innerWidth` to detect breakpoint
- Listens to `resize` event
- Uses `ref` (isOpenRef) to avoid stale closures in resize handler
- Applies body classes: `sidebar-is-open` / `sidebar-is-closed`

---

## Search & Filtering

### Search Flow
1. User types in search input
2. `searchTerm` state updated (converted to lowercase)
3. `filterItems()` recursively filters tree:
   - Includes items matching search
   - Includes parents of matching items
   - Expands categories/folders showing matches
4. Component re-renders with filtered results

### Search Features
- Real-time filtering (no debounce)
- Case-insensitive
- Matches anywhere in title
- Auto-expands matching categories
- Highlights matching text with `<mark>` tag

---

## Deletion Flow

### User Deletes Item/Category
1. User hovers over item → delete button appears
2. Click delete button → `handleDelete()` called
3. Sets `deleteDialog` state with confirmation
4. User confirms in dialog
5. `confirmDelete()` sends DELETE request
6. On success:
   - Updates state
   - Dispatches `sidebar-item-deleted` (if item, not category)
   - Calls `fetchCategories()` to refresh tree
   - Dispatches `refresh-cards` to update display
7. On error: Shows error dialog

### Ownership Rules
- Only item creator can delete their items
- User must be logged in
- `createdBy` must match `currentUser._id`

---

## Key Implementation Details

### Performance Optimizations

1. **Deferred Initialization**
   ```javascript
   setTimeout(() => fetchCategories(), 50)
   ```
   Delays data fetch to yield main thread, reducing "Total Blocking Time" (TBT)

2. **useRef for Resize Handler**
   ```javascript
   const isOpenRef = useRef(isOpen);
   // Used in resize handler with [] deps to avoid stale closure
   ```
   Prevents sidebar from breaking on resize due to stale closure

3. **Lazy Search Highlighting**
   - Only highlights when search term present
   - Uses optimized regex escaping for special characters

### State Management

- Uses Preact hooks (`useState`, `useRef`, `useEffect`)
- No external state management (Redux/Zustand)
- Props-based component communication
- Local UI state (expand/collapse, search, etc.)

### Styling

- Uses CSS classes for visual styling
- Indentation via inline `padding-left` style
- Color variables via `CSS_COLOR_VARS` utility
- Responsive via body classes and viewport checks

---

## Common Workflows

### User Clicks a Post-Link
```
TreeItem click
  ↓
handleSubcategoryClick()
  ↓
Check if forum-post block exists on page
  ├─ Yes → navigateTo(postId) [SPA navigation]
  └─ No → window.location.href = /?post=... [Full page load]
  ↓
Sidebar closes on mobile
```

### User Searches
```
Input → searchTerm state updated
  ↓
filterItems() filters tree recursively
  ↓
Categories auto-expand if match found
  ↓
Component re-renders filtered tree
```

### User Logs In
```
forum-auth-changed event fired
  ↓
fetchCurrentUser() called
  ↓
currentUser state updated
  ↓
useEffect triggers review fetch
  ↓
fetchPendingReviews() + fetchMyRequests()
  ↓
Reviews displayed in sidebar
```

---

## Troubleshooting

### Sidebar Not Showing Data
- Check browser console for errors
- Verify API endpoint is correct: `GET /api/sidebar/categories`
- Ensure CORS is configured if API is different domain
- Check network tab for 401/403 errors

### Search Not Working
- Check `searchTerm` state in React DevTools
- Verify item titles exist in data
- Check if categories are expanded

### Deletion Not Working
- Verify user is logged in (`currentUser` not null/false)
- Check if user owns the item (`createdBy` matches `currentUser._id`)
- Check network tab for DELETE request status
- Verify error message in `deleteError` state

### Mobile Sidebar Not Closing
- Check if `closeIfOverlay()` is being called
- Verify `window.innerWidth` is accurate
- Check if navigation handler is working

---

## Dependencies

### External Libraries
- **Preact**: Lightweight React alternative
- **htm**: HTML template literals for Preact

### Icons
- Icons imported from `../../scripts/utils/icons.js`
- Available: TrashIcon, ChevronIcon, FolderIcon, FileIcon, CloseIcon, HomeIcon, PendingReviewIcon, MyRequestsIcon

### Utils
- `API_BASE`: Base URL for API calls
- `CSS_COLOR_VARS`: Color constants for styling
- `navigateTo()`: SPA navigation utility from router

---

## Security Considerations

1. **Credentials:** All API calls include `credentials: 'include'` for session-based auth
2. **Ownership Checks:** Server must verify user owns item before deletion
3. **Input Sanitization:** Search term is used as regex but escaped properly
4. **XSS Prevention:** Preact's template literals escape HTML by default
5. **CSRF:** Relies on session-based CSRF protection (browser sends cookies)

---

## Future Improvements

- Add debounce to search for better performance
- Add virtual scrolling for large trees
- Add drag-and-drop reordering
- Add keyboard navigation (arrow keys, Enter)
- Add undo/redo for deletions
- Add batch operations
- Optimize re-renders with React.memo
- Add animation transitions
- Add accessibility improvements (ARIA labels, keyboard support)

