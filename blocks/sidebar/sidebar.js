import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

// Helper — always reads the latest token from localStorage
const getToken = () => localStorage.getItem('forum_token') || '';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

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
      isFolder: item.isFolder || children.length > 0,
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

const PlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const TrashIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
`;

const PencilIcon = () => html`
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

const FolderPlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex-shrink:0;">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
`;

const ChevronIcon = ({ expanded }) => html`
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round"
    style="transition: transform 0.2s ease; transform: rotate(${expanded ? '90deg' : '0deg'}); flex-shrink: 0;">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
`;

/* Spectrum-style folder icon (filled when expanded) */
const FolderIcon = ({ expanded }) => (expanded
  ? html`
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M20 6h-8l-2-2H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
    </svg>`
  : html`
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>`);

/* Spectrum-style file/document icon */
const FileIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
`;

// ============================================
// INLINE INPUT
// ============================================

function InlineInput({
  placeholder, onConfirm, onCancel, paddingLeft = 12, initialValue = '',
}) {
  const ref = useRef(null);
  const [value, setValue] = useState(initialValue);
  const doneRef = useRef(false);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      // Place cursor at end of pre-filled text
      ref.current.setSelectionRange(value.length, value.length);
    }
  }, []);

  const confirm = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  return html`
    <div class="inline-input-wrapper" style="padding-left: ${paddingLeft}px">
      <input ref=${ref} class="inline-input" type="text" placeholder=${placeholder}
        value=${value} onInput=${(e) => setValue(e.target.value)}
        onKeyDown=${onKeyDown} onBlur=${confirm} />
    </div>
  `;
}

// ============================================
// TREE ITEM
// ============================================

function TreeItem({
  item, activeItem, onItemClick, onAddSubfolder, onDelete, onRename, level = 0, currentUser,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);  // NEW: inline rename toggle
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.isFolder || hasChildren;
  const itemId = item.id;
  const paddingLeft = Math.min(12 + level * 20, 80);

  // Only show action buttons if logged-in user owns this item
  const isOwner = currentUser && item.createdBy
    && String(currentUser._id) === String(
      typeof item.createdBy === 'object' ? item.createdBy._id : item.createdBy,
    );

  const handleClick = (e) => {
    if (e.target.closest('.item-actions')) return;
    if (isRenaming) return;  // don't navigate while renaming
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

  const handleAddSubfolder = (e) => {
    e.stopPropagation();
    setIsExpanded(true);
    setIsAddingChild(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(itemId, item.title);
  };

  // NEW: open inline rename input
  const handleRenameStart = (e) => {
    e.stopPropagation();
    setIsRenaming(true);
  };

  // NEW: confirm rename — call parent handler then close input
  const handleRenameConfirm = (newTitle) => {
    setIsRenaming(false);
    if (newTitle && newTitle !== item.title) onRename(itemId, newTitle);
  };

  return html`
    <li class="tree-item ${isFolder ? 'is-folder' : 'is-file'}">
      ${isRenaming
        ? html`
          <div style="padding-left: ${paddingLeft}px; padding-right: 8px; padding-top: 2px; padding-bottom: 2px;">
            <${InlineInput}
              placeholder=${item.title}
              initialValue=${item.title}
              onConfirm=${handleRenameConfirm}
              onCancel=${() => setIsRenaming(false)}
              paddingLeft=${0}
            />
          </div>`
        : html`
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
            ${isHovered && isOwner && html`
              <span class="item-actions">
                <button class="item-action-btn" title="Rename"
                  onMouseDown=${(e) => e.preventDefault()} onClick=${handleRenameStart}>
                  <${PencilIcon} />
                </button>
                ${isFolder && html`
                  <button class="item-action-btn" title="Add subfolder"
                    onMouseDown=${(e) => e.preventDefault()} onClick=${handleAddSubfolder}>
                    <${FolderPlusIcon} />
                  </button>
                `}
                <button class="item-action-btn item-action-btn-delete" title="Delete"
                  onMouseDown=${(e) => e.preventDefault()} onClick=${handleDelete}>
                  <${TrashIcon} />
                </button>
              </span>
            `}
          </div>`
      }
      ${(isExpanded || isAddingChild) && html`
        <ul class="tree-children">
          ${isAddingChild && html`
            <${InlineInput} placeholder="Folder name…" paddingLeft=${paddingLeft + 20}
              onConfirm=${(name) => { onAddSubfolder(itemId, name); setIsAddingChild(false); }}
              onCancel=${() => setIsAddingChild(false)} />`
          }
          ${hasChildren && item.children.map((child) => html`
            <${TreeItem} key=${child.id} item=${child} activeItem=${activeItem}
              onItemClick=${onItemClick} onAddSubfolder=${onAddSubfolder}
              onDelete=${onDelete} onRename=${onRename}
              currentUser=${currentUser} level=${level + 1} />
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
  category, activeSubcategory, onSubcategoryClick, onAddFolder, onDeleteCategory, onRename, currentUser,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const hasItems = category.items && category.items.length > 0;

  // NEW: only show action buttons if logged-in user owns this category
  const isOwner = currentUser && category.createdById
    && String(currentUser._id) === String(category.createdById);

  const handleAddFolder = (e) => {
    e.stopPropagation();
    setIsCollapsed(false);
    setIsAddingFolder(true);
  };

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
        ${isHovered && isOwner && html`
          <span class="item-actions">
            <button class="item-action-btn" title="Add folder"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleAddFolder}>
              <${FolderPlusIcon} />
            </button>
            <button class="item-action-btn item-action-btn-delete" title="Delete category"
              onMouseDown=${(e) => e.preventDefault()} onClick=${handleDeleteCategory}>
              <${TrashIcon} />
            </button>
          </span>
        `}
      </div>
      ${!isCollapsed && html`
        <ul class="tree-list">
          ${isAddingFolder && html`
            <${InlineInput} placeholder="Folder name…" paddingLeft=${24}
              onConfirm=${(name) => { onAddFolder(category.name, null, name); setIsAddingFolder(false); }}
              onCancel=${() => setIsAddingFolder(false)} />`
}
          ${hasItems
    ? category.items.map((item) => html`
                <${TreeItem} key=${item.id} item=${item} activeItem=${activeSubcategory}
                  onItemClick=${(itemId, postId) => onSubcategoryClick(itemId, postId)}
                  onAddSubfolder=${(parentId, name) => onAddFolder(category.name, parentId, name)}
                  onDelete=${(itemId, itemTitle) => onDeleteCategory(category.id, itemId, itemTitle)}
                  onRename=${onRename}
                  currentUser=${currentUser}
                  level=${0} />
              `)
    : !isAddingFolder && html`<div class="no-items">No items yet</div>`
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
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creationError, setCreationError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null);
  const inputRef = useRef(null);

  // NEW: track logged-in user so we can show/hide action buttons per-item
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('forum_user')) || null; } catch { return null; }
  });

  useEffect(() => {
    const onAuthChange = () => {
      try { setCurrentUser(JSON.parse(localStorage.getItem('forum_user')) || null); } catch { setCurrentUser(null); }
    };
    window.addEventListener('forum-auth-changed', onAuthChange);
    return () => window.removeEventListener('forum-auth-changed', onAuthChange);
  }, []);

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

  useEffect(() => {
    applyBodyOffset(isOpen);
    const onResize = () => {
      if (window.innerWidth >= 768 && !isOpen) { setIsOpen(true); applyBodyOffset(true); }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
    return () => window.removeEventListener('refresh-sidebar', fetchCategories);
  }, []);

  useEffect(() => {
    if (isCreating && inputRef.current) inputRef.current.focus();
  }, [isCreating]);

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

  const handleAddFolder = async (categoryId, parentId, name) => {
    try {
      const response = await fetch(`${API_BASE}/sidebar-items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: name, category: categoryId, parentId: parentId || null, isFolder: true,
        }),
      });
      const data = await response.json();
      if (data.success) await fetchCategories();
      // eslint-disable-next-line no-console
      else console.error('Failed to add folder:', data.error);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add folder:', err);
    }
  };

  const handleDelete = (categoryId, itemIdOrName, itemTitle) => {
    const isItemDelete = itemTitle !== undefined;
    setDeleteDialog({
      categoryId,
      itemId: isItemDelete ? itemIdOrName : null,
      name: isItemDelete ? itemTitle : itemIdOrName,
    });
  };

  // Rename a sidebar item — calls PATCH /api/sidebar-items/:id with auth
  const handleRename = async (itemId, newTitle) => {
    try {
      const response = await fetch(`${API_BASE}/sidebar-items/${itemId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await response.json();
      if (data.success) await fetchCategories();
      // eslint-disable-next-line no-console
      else console.error('Rename failed:', data.error);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Rename failed:', err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    const { categoryId, itemId } = deleteDialog;
    setDeleteDialog(null);
    try {
      const url = itemId
        ? `${API_BASE}/sidebar-items/${itemId}`
        : `${API_BASE}/sidebar/categories/${categoryId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await response.json();
      if (data.success) await fetchCategories();
      // eslint-disable-next-line no-console
      else console.error('Failed to delete:', data.error);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to delete:', err);
    }
  };

  const cancelCreating = () => { setIsCreating(false); setNewCatName(''); setCreationError(''); };

  const handleCreateKeyDown = async (e) => {
    if (e.key === 'Escape') { cancelCreating(); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmedName = newCatName.trim();
    if (!trimmedName) { setCreationError('Name cannot be empty'); return; }
    const exists = categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) { setCreationError('Category already exists'); return; }
    try {
      const response = await fetch(`${API_BASE}/sidebar-items`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: trimmedName, category: trimmedName, isFolder: true, parentId: null,
        }),
      });
      const data = await response.json();
      if (data.success) { await fetchCategories(); cancelCreating(); } else setCreationError(data.error || 'Failed to create category');
    } catch { setCreationError('Network error'); }
  };

  const filterItems = (items, term) => items.reduce((acc, item) => {
    const matches = item.title.toLowerCase().includes(term);
    const filteredChildren = item.children ? filterItems(item.children, term) : [];
    if (matches || filteredChildren.length > 0) {
      const mergedChildren = filteredChildren.length > 0 ? filteredChildren : item.children;
      acc.push({ ...item, children: mergedChildren });
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

  return html`
    <div class="sidebar-wrapper ${isOpen ? 'is-open' : 'is-closed'}">
      <div class="sidebar">
        <div class="search-container">
          <input type="text" placeholder="Search..." value=${searchTerm}
            onInput=${(e) => setSearchTerm(e.target.value.toLowerCase())} />
        </div>

        <div class="explorer-header">
          <span class="explorer-header-label">Topics</span>
          <button class="add-category" title="New Category"
            onClick=${() => { setIsCreating(true); setNewCatName(''); setCreationError(''); }}>
            <${PlusIcon} />
          </button>
        </div>

        ${isCreating && html`
          <div class="new-category-form">
            <input ref=${inputRef} type="text"
              class="new-category-input ${creationError ? 'error' : ''}"
              placeholder="Category name…" value=${newCatName}
              onKeyDown=${handleCreateKeyDown}
              onInput=${(e) => { setNewCatName(e.target.value); if (creationError) setCreationError(''); }}
              onBlur=${cancelCreating} />
            ${creationError && html`<div class="error-msg">${creationError}</div>`}
          </div>
        `}

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
                    onSubcategoryClick=${handleSubcategoryClick}
                    onAddFolder=${handleAddFolder}
                    onDeleteCategory=${handleDelete}
                    onRename=${handleRename}
                    currentUser=${currentUser}
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