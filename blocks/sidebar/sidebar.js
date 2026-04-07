import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';
import {
  TrashIcon, ChevronIcon, FolderIcon, FileIcon, CloseIcon,
  HomeIcon, PendingReviewIcon, MyRequestsIcon,
} from '../../scripts/utils/icons.js';
import { API_BASE } from '../../scripts/utils/constants.js';

// ============================================
// NORMALIZE
// ============================================`

function normalizeItems(items) {
  return (items || []).map((item) => {
    const children = normalizeItems(item.children || []);
    return {
      ...item,
      // eslint-disable-next-line no-underscore-dangle
      id: String(item._id || item.id || ''),
      isFolder: Boolean(item.isFolder),
      // Normalize createdBy to a plain string so we can compare it
      // against currentUser._id (also a string) with ===
      createdBy: item.createdBy ? String(item.createdBy) : null,
      children,
    };
  });
}

function collectFolderIds(items) {
  return (items || []).reduce((acc, item) => {
    const nestedIds = collectFolderIds(item.children || []);
    if (item.isFolder) acc.push(item.id);
    return acc.concat(nestedIds);
  }, []);
}

function sortTreeItems(items) {
  return [...(items || [])].sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
  });
}

// ============================================
// SPECTRUM DESTRUCTIVE ALERT DIALOG
// ============================================

function SpectrumAlertDialog({
  isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}) {
  // Lock body scroll while dialog is open
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
  };

  return html`
    <div class="sp-alert-backdrop" onClick=${handleBackdropClick} role="presentation">
      <div class="sp-alert-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="sp-alert-title" aria-describedby="sp-alert-msg">
        <div class="sp-alert-header">
          <span class="sp-alert-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <h2 class="sp-alert-title" id="sp-alert-title">${title}</h2>
        </div>
        <div class="sp-alert-body">
          <p class="sp-alert-message" id="sp-alert-msg">${message}</p>
        </div>
        <div class="sp-alert-footer">
          <button class="sp-btn sp-btn-secondary" onClick=${onCancel}>Cancel</button>
          <button class="sp-btn sp-btn-destructive" onClick=${onConfirm}>${confirmLabel}</button>
        </div>
      </div>
    </div>
  `;
}

// Icons imported from scripts/utils/icons.js

// ============================================
// HIGHLIGHT HELPER
// ============================================

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

// ============================================
// OWNERSHIP HELPER
// ============================================

/**
 * Returns true if the current user owns this item.
 * Rules:
 *   - Not logged in -> never owns anything
 *   - createdBy is null (legacy/shared item) -> treat as unowned, no buttons shown
 *   - createdBy matches currentUser._id -> owns it
 */
function isOwner(item, currentUser) {
  if (!currentUser) return false;
  if (!item.createdBy) return false;
  // eslint-disable-next-line no-underscore-dangle
  return item.createdBy === String(currentUser._id);
}

// ============================================
// TREE ITEM
// ============================================

function TreeItem({
  item,
  activeItem,
  currentUser,
  onItemClick,
  onDelete,
  onToggleFolder,
  expandedFolders,
  level = 0,
  searchTerm = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const sortedChildren = sortTreeItems(item.children || []);

  const hasChildren = item.children && item.children.length > 0;
  // IMPORTANT: trust the server's isFolder flag exclusively.
  // Never upgrade a post-link to a folder just because it has children Ã¢â‚¬â€
  // that causes post-links to render as folders and duplicate items on create.
  const { isFolder } = item;
  const itemId = item.id;
  const isExpanded = !!searchTerm || !!expandedFolders[itemId];
  const paddingLeft = Math.min(12 + level * 20, 100);

  // Only show action buttons if the logged-in user created this item
  const canEdit = isOwner(item, currentUser);

  const handleClick = (e) => {
    if (e.target.closest('.item-actions')) return;
    if (isFolder) {
      onToggleFolder(itemId);
      return;
    }
    let targetPostId = null;
    if (item.postId) {
      targetPostId = typeof item.postId === 'string'
        ? item.postId
        // eslint-disable-next-line no-underscore-dangle
        : String(item.postId._id || item.postId.id || '');
    }
    if (!targetPostId) targetPostId = itemId;
    if (targetPostId && !isFolder) onItemClick(itemId, targetPostId);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(itemId, item.title);
  };

  return html`
    <li class="tree-item ${isFolder ? 'is-folder' : 'is-file'}">
      <div class="tree-item-content ${activeItem === itemId ? 'active' : ''}"
        style="padding-left: ${paddingLeft}px" onClick=${handleClick}
        onMouseEnter=${() => setIsHovered(true)} onMouseLeave=${() => setIsHovered(false)}
        title=${item.title}>
        <button class="tree-toggle" type="button" aria-label=${isExpanded ? 'Collapse folder' : 'Expand folder'}
          aria-expanded=${String(isExpanded)} hidden=${!isFolder}
          onClick=${(e) => { e.stopPropagation(); onToggleFolder(itemId); }}>
          <span class="tree-chevron">
            <${ChevronIcon} expanded=${isExpanded} />
          </span>
        </button>
        ${!isFolder && html`
          <span class="tree-chevron">
            <span class="tree-chevron-spacer"/>
          </span>
        `}
        <span class="tree-icon ${isFolder ? 'tree-icon-folder' : 'tree-icon-file'} ${(isFolder && isExpanded) ? 'is-open' : ''}">
          ${isFolder
    ? html`<${FolderIcon} expanded=${isExpanded} />`
    : html`<${FileIcon} />`}
        </span>
        <span class="tree-label"><${HighlightedText} text=${item.title} highlight=${searchTerm} /></span>

        ${isHovered && canEdit && html`
          <span class="item-actions">
            <button class="item-action-btn item-action-btn-delete" title="Delete"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleDelete}>
              <${TrashIcon} />
            </button>
          </span>
        `}
      </div>

      ${hasChildren && html`
        <ul class="tree-children" aria-hidden=${String(!isExpanded)}
          style=${{ display: isExpanded ? 'block' : 'none' }}>
          ${sortedChildren.map((child) => html`
            <${TreeItem} key=${child.id} item=${child} activeItem=${activeItem}
              currentUser=${currentUser}
              onItemClick=${onItemClick}
              onDelete=${onDelete}
              onToggleFolder=${onToggleFolder}
              expandedFolders=${expandedFolders}
              level=${level + 1} searchTerm=${searchTerm} />
          `)}
        </ul>
      `}
      ${isFolder && isExpanded && !hasChildren && html`
        <div class="tree-item-content no-items-placeholder" style="padding-left: ${paddingLeft}px; cursor: default;">
          <span class="tree-chevron"><span class="tree-chevron-spacer"/></span>
          <span class="tree-icon tree-icon-file" style="visibility: hidden"><${FileIcon} /></span>
          <span class="tree-label" style="font-style: italic; color: var(--sn-muted); font-size: 13px;">No items yet</span>
        </div>
      `}
    </li>
  `;
}

// ============================================
// CATEGORY ITEM
// ============================================

function CategoryItem({
  category,
  activeSubcategory,
  currentUser,
  onSubcategoryClick,
  onDeleteCategory,
  onToggleCategory,
  expandedCategories,
  onToggleFolder,
  expandedFolders,
  searchTerm = '',
}) {
  const [isHovered, setIsHovered] = useState(false);
  const sortedItems = sortTreeItems(category.items || []);
  const isExpanded = !!searchTerm || !!expandedCategories[category.id];
  const isCollapsed = !isExpanded;

  const hasItems = category.items && category.items.length > 0;
  // eslint-disable-next-line max-len
  const paddingLeft = Math.min(12 + 1 * 20, 100); // Categories always contain level 1 items\n\n  // eslint-disable-next-line no-underscore-dangle
  const canDeleteCategory = isOwner({ createdBy: category.createdBy }, currentUser);

  const handleDeleteCategory = (e) => {
    e.stopPropagation();
    onDeleteCategory(category.id, category.name);
  };

  const handleCategoryToggle = () => {
    onToggleCategory(category.id, category.items || []);
  };

  return html`
    <li class="category-item">
      <div class="category-header ${!isCollapsed ? 'is-expanded' : ''}" onClick=${handleCategoryToggle}
        onMouseEnter=${() => setIsHovered(true)} onMouseLeave=${() => setIsHovered(false)}>
        <button class="tree-toggle category-toggle" type="button"
          aria-label=${isCollapsed ? 'Expand category' : 'Collapse category'}
          aria-expanded=${String(!isCollapsed)}
          onClick=${(e) => { e.stopPropagation(); handleCategoryToggle(); }}>
          <span class="category-chevron"><${ChevronIcon} expanded=${!isCollapsed} /></span>
        </button>
        <span class="category-icon"><${FolderIcon} expanded=${!isCollapsed} /></span>
        <span class="category-name"><${HighlightedText} text=${category.name} highlight=${searchTerm} /></span>
        ${isHovered && canDeleteCategory && html`
          <span class="item-actions">
            <button class="item-action-btn item-action-btn-delete" title="Delete category"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleDeleteCategory}>
              <${TrashIcon} />
            </button>
          </span>
        `}
      </div>
      <ul class="tree-list" aria-hidden=${String(isCollapsed)}
        style=${{ display: isCollapsed ? 'none' : 'block' }}>
        ${hasItems
    ? sortedItems.map((item) => html`
              <${TreeItem} key=${item.id} item=${item} activeItem=${activeSubcategory}
                currentUser=${currentUser}
                onItemClick=${(itemId, postId) => onSubcategoryClick(itemId, postId)}
                onDelete=${(itemId, itemTitle) => onDeleteCategory(category.id, itemId, itemTitle, true)}
                onToggleFolder=${onToggleFolder}
                expandedFolders=${expandedFolders}
                level=${1} searchTerm=${searchTerm} />
            `)
    : html`
              <div class="tree-item-content no-items-placeholder" style="padding-left: ${paddingLeft}px; cursor: default;">
                <span class="tree-chevron"><span class="tree-chevron-spacer"/></span>
                <span class="tree-icon tree-icon-file" style="visibility: hidden"><${FileIcon} /></span>
                <span class="tree-label" style="font-style: italic; color: var(--sn-muted); font-size: 13px;">No items yet</span>
              </div>
            `

}
      </ul>
    </li>
  `;
}

// ============================================
// SIDEBAR ROOT
// ============================================

function Sidebar() {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth > 1024);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedFolders, setExpandedFolders] = useState({});

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Auth state Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // null  = not yet checked
  // false = checked, not logged in
  // {...} = checked, logged in user object
  const [currentUser, setCurrentUser] = useState(null);

  // Ref that always holds the current isOpen value Ã¢â‚¬â€ used inside resize handler
  // to avoid the stale-closure problem (resize useEffect has empty dep array).
  const isOpenRef = useRef(isOpen);

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Fetch current user on mount Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Calls GET /api/auth/me (session cookie sent automatically).
  // If 401, the user is not logged in Ã¢â‚¬â€ set to false so we stop loading.
  // Re-runs whenever the forum-auth-changed event fires (login/logout).
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(false); // not logged in
      }
    } catch {
      setCurrentUser(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    // Re-fetch when auth state changes (e.g. user logs in via the overlay)
    const onAuthChanged = () => fetchCurrentUser();
    window.addEventListener('forum-auth-changed', onAuthChanged);
    return () => window.removeEventListener('forum-auth-changed', onAuthChanged);
  }, []);

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Sidebar open/close Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const applyBodyOffset = (open) => {
    if (open) {
      document.body.classList.add('sidebar-is-open');
      document.body.classList.remove('sidebar-is-closed');
    } else {
      document.body.classList.add('sidebar-is-closed');
      document.body.classList.remove('sidebar-is-open');
    }
    window.dispatchEvent(new CustomEvent('sidebar-state-changed', { detail: { isOpen: open } }));
  };

  // Closes the sidebar when in overlay mode (mobile / tablet Ã¢â€°Â¤ 1024px)
  const closeIfOverlay = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      setIsOpen(false);
      applyBodyOffset(false);
    }
  };

  useEffect(() => {
    const onToggle = (e) => {
      const next = typeof e.detail?.isOpen === 'boolean' ? e.detail.isOpen : !isOpen;
      setIsOpen(next);
      applyBodyOffset(next);
    };
    window.addEventListener('toggle-sidebar', onToggle);
    return () => window.removeEventListener('toggle-sidebar', onToggle);
  }, [isOpen]);

  // Keep ref in sync whenever isOpen changes
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    applyBodyOffset(isOpen);
    const onResize = () => {
      // Use ref instead of isOpen to avoid stale closure Ã¢â‚¬â€ the effect has [] deps
      // so isOpen would always be the mount-time value (true), meaning the sidebar
      // would never re-open when resizing from mobile back to desktop.
      if (window.innerWidth > 1024 && !isOpenRef.current) {
        setIsOpen(true);
        applyBodyOffset(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Fetch sidebar data Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/sidebar/categories`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.success && data.categories) {
        setCategories(data.categories.map((cat) => ({
          ...cat,
          items: normalizeItems(cat.items || []),
        })));
      } else {
        throw new Error(data.error || 'Failed to fetch');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch categories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer initialization to yield the main thread and avoid massive TBT
    const initTimer = setTimeout(() => {
      fetchCategories();
    }, 50);

    window.addEventListener('refresh-sidebar', fetchCategories);

    // When the user navigates back via history.back(), the browser may restore
    // the page from bfcache (instantly, without remounting). The refresh-sidebar
    // event fired on the outgoing page is lost. pageshow with persisted:true
    // detects this and re-fetches so the sidebar reflects the latest state.
    const onPageShow = (e) => { if (e.persisted) fetchCategories(); };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('refresh-sidebar', fetchCategories);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Fetch pending reviews (reviewer side) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const fetchPendingReviews = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/reviews/pending`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPendingReviews(data.reviews || []);
      }
    } catch {
      /* non-fatal */
    }
  };

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Fetch my review requests (author side) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const fetchMyRequests = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE}/reviews/my-requests`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setMyRequests((data.reviews || []).filter((r) => r.overallStatus !== 'approved'));
      }
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    if (currentUser) {
      const initTimer = setTimeout(() => {
        fetchPendingReviews();
        fetchMyRequests();
      }, 50);
      return () => clearTimeout(initTimer);
    }
    setPendingReviews([]);
    setMyRequests([]);
    return undefined;
  }, [currentUser]);

  useEffect(() => {
    const refreshAll = () => { fetchPendingReviews(); fetchMyRequests(); };
    window.addEventListener('refresh-sidebar', refreshAll);
    return () => window.removeEventListener('refresh-sidebar', refreshAll);
  }, [currentUser]);

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Handlers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const handleSubcategoryClick = (subcategoryId, postId) => {
    setActiveSubcategory(subcategoryId);
    // eslint-disable-next-line no-console
    console.log('Sidebar clicked! Firing load-forum-post for ID:', postId);
    if (!postId) {
      // eslint-disable-next-line no-console
      console.warn('Sidebar click failed: No postId available.');
      return;
    }
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      // Not on the home page Ã¢â‚¬â€ store the post ID so cards-display auto-opens it on arrival
      sessionStorage.setItem('af_open_post', postId);
      closeIfOverlay();
      window.location.href = '/';
      return;
    }
    const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
    cardsWrappers.forEach((el) => { el.style.display = 'none'; });
    const postWrappers = document.querySelectorAll('.forum-post-wrapper, .forum-post-container, .forum-post');
    postWrappers.forEach((el) => { el.style.display = 'block'; });
    closeIfOverlay();
    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId, sidebarItemId: subcategoryId } }));
  };

  const handleDelete = (categoryId, itemId, itemTitle, isItemDelete = false) => {
    setDeleteDialog({
      categoryId,
      itemId: isItemDelete ? itemId : null,
      name: isItemDelete ? itemTitle : itemId,
    });
  };

  const handleToggleFolder = (itemId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleToggleCategory = (categoryId, items = []) => {
    const folderIds = collectFolderIds(items);
    setExpandedCategories((prev) => {
      const nextExpanded = !prev[categoryId];
      if (nextExpanded) {
        setExpandedFolders((prevFolders) => {
          const nextFolders = { ...prevFolders };
          folderIds.forEach((folderId) => {
            nextFolders[folderId] = false;
          });
          return nextFolders;
        });
      }
      return {
        ...prev,
        [categoryId]: nextExpanded,
      };
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    const { categoryId, itemId } = deleteDialog;
    setDeleteDialog(null);
    setDeleteError(null);
    try {
      const url = itemId
        ? `${API_BASE}/sidebar-items/${itemId}`
        : `${API_BASE}/sidebar/categories/${categoryId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        if (itemId) {
          window.dispatchEvent(new CustomEvent('sidebar-item-deleted', {
            detail: { itemId },
          }));
        }
        await fetchCategories();
        window.dispatchEvent(new CustomEvent('refresh-cards'));
      } else {
        setDeleteError(data.error || 'Delete failed.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete:', err);
      setDeleteError('Network error. Please try again.');
    }
  };

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Navigation handlers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const handlePendingReviewClick = (review) => {
    if (!review.postId) return;
    // eslint-disable-next-line no-underscore-dangle
    const postId = typeof review.postId === 'object' ? String(review.postId._id) : String(review.postId);

    // Check whether the main forum post viewer exists on this page.
    const postViewer = document.querySelector('.forum-post-wrapper, .forum-post-container, .forum-post');
    const cardsViewer = document.querySelector('.cards-wrapper, .cards-container, .cards-display, .cards');
    if (!postViewer && !cardsViewer) {
      sessionStorage.setItem('af_open_post', postId);
      closeIfOverlay();
      window.location.href = '/';
      return;
    }

    const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
    cardsWrappers.forEach((el) => { el.style.display = 'none'; });
    const postWrappers = document.querySelectorAll('.forum-post-wrapper, .forum-post-container, .forum-post');
    postWrappers.forEach((el) => { el.style.display = 'block'; });
    closeIfOverlay();
    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId } }));
  };

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Search filter Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const filterItems = (items, term) => items.reduce((acc, item) => {
    const matches = item.title.toLowerCase().includes(term);
    const filteredChildren = item.children ? filterItems(item.children, term) : [];
    if (matches || filteredChildren.length > 0) {
      acc.push({ ...item, children: filteredChildren });
    }
    return acc;
  }, []);

  const filteredCategories = searchTerm
    ? categories.map((cat) => {
      const catMatches = cat.name.toLowerCase().includes(searchTerm);
      const filteredItems = filterItems(cat.items || [], searchTerm);
      if (catMatches || filteredItems.length > 0) {
        return { ...cat, items: filteredItems };
      }
      return null;
    }).filter(Boolean)
    : categories;

  // eslint-disable-next-line max-len
  // Ã¢â€â‚¬Ã¢â€â‚¬ Render Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  const toggleSidebar = () => {
    const next = !isOpen;
    setIsOpen(next);
    applyBodyOffset(next);
  };

  return html`
    <div class="sidebar-root">
      <button class="sidebar-tapbar" onClick=${toggleSidebar}
        aria-expanded=${String(isOpen)} aria-controls="sidebar-panel"
        aria-label=${isOpen ? 'Close navigation' : 'Browse topics & navigation'}>
        <svg class="sidebar-tapbar-icon" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
        <span class="sidebar-tapbar-label">Browse topics ${'&'} navigation</span>
        <svg class="sidebar-tapbar-chevron ${isOpen ? 'is-open' : ''}"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      <div id="sidebar-panel" class="sidebar-wrapper ${isOpen ? 'is-open' : 'is-closed'}">
      <aside class="sidebar">
        <div class="sidebar-overlay-header">
          <span class="sidebar-overlay-title">Topics ${'&'} Navigation</span>
          <button class="sidebar-close-btn" onClick=${toggleSidebar} aria-label="Close navigation">
            <${CloseIcon} size=${18} />
          </button>
        </div>
        <div class="search-container">
          <input type="text" placeholder="Search topics..." value=${searchTerm}
            onInput=${(e) => setSearchTerm(e.target.value.toLowerCase())} class="sidebar-search-input" />
        </div>

        ${currentUser && html`
          <div class="sidebar-item"
            onClick=${() => { closeIfOverlay(); window.location.href = 'http://localhost:3000'; }}>
            <${HomeIcon} />
            Home
          </div>

          <div class="sidebar-section">Reviews</div>

          <div class="sidebar-item" onClick=${() => setPendingOpen((o) => !o)}>
            <${PendingReviewIcon} />
            Pending Reviews
            ${pendingReviews.length > 0 ? html`<span style="margin-left:auto;background:#854F0B;color:#FAEEDA;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;">${pendingReviews.length}</span>` : ''}
            <${ChevronIcon} expanded=${pendingOpen} style="margin-left:${pendingReviews.length > 0 ? '4px' : 'auto'};opacity:.5" />
          </div>
          ${pendingOpen && html`
          <ul style="list-style:none;padding:0;margin:0 0 4px 0;max-height:150px;overflow-y:auto;">
            ${pendingReviews.length > 0 ? pendingReviews.map((r) => {
    // eslint-disable-next-line no-underscore-dangle
    const reviewId = r._id;
    const authorName = r.authorId
      ? (`${r.authorId.firstName || ''} ${r.authorId.lastName || ''}`).trim() || 'Unknown'
      : 'Unknown';
    return html`
              <li key=${reviewId} style="font-size:12px;color:var(--text2);padding:5px 12px 5px 28px;cursor:pointer;border-left:3px solid #BA7517;margin-left:0;" onClick=${() => handlePendingReviewClick(r)}>
                <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.postId?.title || 'Untitled Post'}</div>
                <div style="color:var(--text3);font-size:10px;">by ${authorName}</div>
              </li>
            `;
  }) : html`<li style="font-size:12px;color:var(--text3);padding:4px 12px 4px 28px;font-style:italic;">No reviews pending</li>`}
          </ul>
          `}

          <div class="sidebar-item" onClick=${() => setRequestsOpen((o) => !o)}>
            <${MyRequestsIcon} />
            My Requests
            ${myRequests.length > 0 ? html`<span style="margin-left:auto;background:#0C447C;color:#E6F1FB;border-radius:20px;padding:1px 7px;font-size:10px;font-weight:700;">${myRequests.length}</span>` : ''}
            <${ChevronIcon} expanded=${requestsOpen} style="margin-left:${myRequests.length > 0 ? '4px' : 'auto'};opacity:.5" />
          </div>
          ${requestsOpen && html`
          <ul style="list-style:none;padding:0;margin:0 0 4px 0;max-height:150px;overflow-y:auto;">
            ${myRequests.length > 0 ? myRequests.map((r) => {
    // eslint-disable-next-line no-underscore-dangle
    const reqId = r._id;
    const reviewedCount = (r.reviewers || []).filter((rv) => rv.status !== 'pending').length;
    const totalCount = (r.reviewers || []).length;
    let statusLabel;
    if (r.overallStatus === 'approved') statusLabel = 'Approved';
    else if (r.overallStatus === 'changes_requested') statusLabel = 'Changes requested';
    else statusLabel = `${reviewedCount}/${totalCount} reviewed`;
    return html`
              <li key=${reqId} style="font-size:12px;color:var(--text2);padding:5px 12px 5px 28px;cursor:pointer;border-left:3px solid #185FA5;margin-left:0;" onClick=${() => handlePendingReviewClick(r)}>
                <div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${r.postId?.title || 'Untitled Post'}</div>
                <div style="color:var(--text3);font-size:10px;">${statusLabel}</div>
              </li>
            `;
  }) : html`<li style="font-size:12px;color:var(--text3);padding:4px 12px 4px 28px;font-style:italic;">No requests sent</li>`}
          </ul>
          `}
        `}

        <div class="sidebar-section">Topics</div>

        ${loading && html`<div class="loading">LoadingÃ¢â‚¬Â¦</div>`}
        ${error && html`
          <div class="error-state">
            <p>Failed to load: ${error}</p>
            <button onClick=${fetchCategories}>Retry</button>
          </div>
        `}

        ${!loading && !error && html`
          <ul class="category-list">
            ${filteredCategories.length > 0
    ? filteredCategories.map((category) => html`
                  <${CategoryItem}
                    key=${category.id}
                    category=${category}
                    activeSubcategory=${activeSubcategory}
                    currentUser=${currentUser}
                    onSubcategoryClick=${handleSubcategoryClick}
                    onDeleteCategory=${handleDelete}
                    onToggleCategory=${handleToggleCategory}
                    expandedCategories=${expandedCategories}
                    onToggleFolder=${handleToggleFolder}
                    expandedFolders=${expandedFolders}
                    searchTerm=${searchTerm}
                  />
                `)
    : html`<div class="no-results">No categories found</div>`
}
          </ul>
        `}
      </aside>

      ${isOpen && html`
        <div class="sidebar-backdrop"
          onClick=${() => { setIsOpen(false); applyBodyOffset(false); }} />
      `}

      <${SpectrumAlertDialog}
        isOpen=${!!deleteDialog}
        title=${deleteDialog && !deleteDialog.itemId ? 'Delete Category' : 'Delete Item'}
        message=${`Are you sure you want to delete "${deleteDialog ? deleteDialog.name : ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm=${confirmDelete}
        onCancel=${() => setDeleteDialog(null)}
      />

      <${SpectrumAlertDialog}
        isOpen=${!!deleteError}
        title="Cannot Delete"
        message=${deleteError || ''}
        confirmLabel="OK"
        onConfirm=${() => setDeleteError(null)}
        onCancel=${() => setDeleteError(null)}
      />
      </div>
    </div>
  `;
}

export default function decorate(block) {
  block.textContent = '';
  try {
    render(html`<${Sidebar} />`, block);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Sidebar render error:', err);
  }
}
