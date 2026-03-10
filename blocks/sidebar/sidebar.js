import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

// ============================================
// NORMALIZE
// ============================================

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

// ============================================
// ICONS
// ============================================

const TrashIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
`;

const ChevronIcon = ({ expanded }) => html`
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round"
    style="transition: transform 0.2s ease; transform: rotate(${expanded ? '90deg' : '0deg'}); flex-shrink: 0;">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
`;

const FolderIcon = ({ expanded }) => (expanded
  ? html`
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20 6h-8l-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
    </svg>`
  : html`
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`);

const FileIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
`;

// ============================================
// OWNERSHIP HELPER
// ============================================

/**
 * Returns true if the current user owns this item.
 * Rules:
 *   - Not logged in → never owns anything
 *   - createdBy is null (legacy/shared item) → treat as unowned, no buttons shown
 *   - createdBy matches currentUser._id → owns it
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
  item, activeItem, currentUser, onItemClick, onDelete, level = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  // IMPORTANT: trust the server's isFolder flag exclusively.
  // Never upgrade a post-link to a folder just because it has children —
  // that causes post-links to render as folders and duplicate items on create.
  const { isFolder } = item;
  const itemId = item.id;
  const paddingLeft = Math.min(12 + level * 20, 100);

  // Only show action buttons if the logged-in user created this item
  const canEdit = isOwner(item, currentUser);

  const handleClick = (e) => {
    if (e.target.closest('.item-actions')) return;
    if (isFolder) setIsExpanded((prev) => !prev);
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
        <span class="tree-chevron">
          ${isFolder
    ? html`<${ChevronIcon} expanded=${isExpanded} />`
    : html`<span class="tree-chevron-spacer"/>`}
        </span>
        <span class="tree-icon ${isFolder ? 'tree-icon-folder' : 'tree-icon-file'} ${(isFolder && isExpanded) ? 'is-open' : ''}">
          ${isFolder
    ? html`<${FolderIcon} expanded=${isExpanded} />`
    : html`<${FileIcon} />`}
        </span>
        <span class="tree-label">${item.title}</span>

        ${isHovered && canEdit && html`
          <span class="item-actions">
            <button class="item-action-btn item-action-btn-delete" title="Delete"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleDelete}>
              <${TrashIcon} />
            </button>
          </span>
        `}
      </div>

      ${isExpanded && html`
        <ul class="tree-children">
          ${hasChildren && item.children.map((child) => html`
            <${TreeItem} key=${child.id} item=${child} activeItem=${activeItem}
              currentUser=${currentUser}
              onItemClick=${onItemClick}
              onDelete=${onDelete} level=${level + 1} />
          `)}
        </ul>
      `}
    </li>
  `;
}

// ============================================
// CATEGORY ITEM
// ============================================

function CategoryItem({
  category, activeSubcategory, currentUser, onSubcategoryClick,
  onDeleteCategory,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const hasItems = category.items && category.items.length > 0;

  // eslint-disable-next-line no-underscore-dangle
  const canDeleteCategory = isOwner({ createdBy: category.createdBy }, currentUser);

  const handleDeleteCategory = (e) => {
    e.stopPropagation();
    onDeleteCategory(category.id, category.name);
  };

  return html`
    <li class="category-item">
      <div class="category-header ${!isCollapsed ? 'is-expanded' : ''}" onClick=${() => setIsCollapsed((p) => !p)}
        onMouseEnter=${() => setIsHovered(true)} onMouseLeave=${() => setIsHovered(false)}>
        <span class="category-chevron"><${ChevronIcon} expanded=${!isCollapsed} /></span>
        <span class="category-icon"><${FolderIcon} expanded=${!isCollapsed} /></span>
        <span class="category-name">${category.name}</span>
        ${isHovered && canDeleteCategory && html`
          <span class="item-actions">
            <button class="item-action-btn item-action-btn-delete" title="Delete category"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleDeleteCategory}>
              <${TrashIcon} />
            </button>
          </span>
        `}
      </div>
      ${!isCollapsed && html`
        <ul class="tree-list">
          ${hasItems
    ? category.items.map((item) => html`
                <${TreeItem} key=${item.id} item=${item} activeItem=${activeSubcategory}
                  currentUser=${currentUser}
                  onItemClick=${(itemId, postId) => onSubcategoryClick(itemId, postId)}
                  onDelete=${(itemId, itemTitle) => onDeleteCategory(category.id, itemId, itemTitle, true)}
                  level=${0} />
              `)
    : html`<div class="no-items">No items yet</div>`
}
        </ul>
      `}
    </li>
  `;
}

// ============================================
// SIDEBAR ROOT
// ============================================

function Sidebar() {
  const [isOpen, setIsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteError, setDeleteError] = useState(null);

  // ── Auth state ──────────────────────────────────────────────────────────
  // null  = not yet checked
  // false = checked, not logged in
  // {...} = checked, logged in user object
  const [currentUser, setCurrentUser] = useState(null);

  // Ref that always holds the current isOpen value — used inside resize handler
  // to avoid the stale-closure problem (resize useEffect has empty dep array).
  const isOpenRef = useRef(isOpen);

  // ── Fetch current user on mount ─────────────────────────────────────────
  // Calls GET /api/auth/me (session cookie sent automatically).
  // If 401, the user is not logged in — set to false so we stop loading.
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

  // ── Sidebar open/close ──────────────────────────────────────────────────
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
      // Use ref instead of isOpen to avoid stale closure — the effect has [] deps
      // so isOpen would always be the mount-time value (true), meaning the sidebar
      // would never re-open when resizing from mobile back to desktop.
      if (window.innerWidth >= 768 && !isOpenRef.current) {
        setIsOpen(true);
        applyBodyOffset(true);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Fetch sidebar data ──────────────────────────────────────────────────
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
    fetchCategories();
    window.addEventListener('refresh-sidebar', fetchCategories);

    // When the user navigates back via history.back(), the browser may restore
    // the page from bfcache (instantly, without remounting). The refresh-sidebar
    // event fired on the outgoing page is lost. pageshow with persisted:true
    // detects this and re-fetches so the sidebar reflects the latest state.
    const onPageShow = (e) => { if (e.persisted) fetchCategories(); };
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.removeEventListener('refresh-sidebar', fetchCategories);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleSubcategoryClick = (subcategoryId, postId) => {
    setActiveSubcategory(subcategoryId);
    // eslint-disable-next-line no-console
    console.log('Sidebar clicked! Firing load-forum-post for ID:', postId);
    if (!postId) {
      // eslint-disable-next-line no-console
      console.warn('Sidebar click failed: No postId available.');
      return;
    }
    const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
    cardsWrappers.forEach((el) => { el.style.display = 'none'; });
    const postWrappers = document.querySelectorAll('.forum-post-wrapper, .forum-post-container, .forum-post');
    postWrappers.forEach((el) => { el.style.display = 'block'; });
    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId, sidebarItemId: subcategoryId } }));
  };

  const handleDelete = (categoryId, itemId, itemTitle, isItemDelete = false) => {
    setDeleteDialog({
      categoryId,
      itemId: isItemDelete ? itemId : null,
      name: isItemDelete ? itemTitle : itemId,
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

  // ── Search filter ───────────────────────────────────────────────────────

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
        return { ...cat, items: filteredItems.length > 0 ? filteredItems : cat.items };
      }
      return null;
    }).filter(Boolean)
    : categories;

  // ── Render ──────────────────────────────────────────────────────────────

  return html`
    <div class="sidebar-wrapper ${isOpen ? 'is-open' : 'is-closed'}">
      <div class="sidebar">
        <div class="search-container">
          <input type="text" placeholder="Search..." value=${searchTerm}
            onInput=${(e) => setSearchTerm(e.target.value.toLowerCase())} />
        </div>

        <div class="explorer-header">
          <span class="explorer-header-label">Topics</span>
        </div>

        ${loading && html`<div class="loading">Loading…</div>`}
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
                  />
                `)
    : html`<div class="no-results">No categories found</div>`
}
          </ul>
        `}
      </div>

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
