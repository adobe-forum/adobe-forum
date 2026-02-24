import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

// ============================================
// CONSTANTS
// ============================================

const API_BASE = 'http://localhost:5000/api';

// ============================================
// ICONS
// ============================================

const PlusIcon = () => html`
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const TrashIcon = () => html`
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
`;

const FolderPlusIcon = () => html`
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    <line x1="12" y1="11" x2="12" y2="17"/>
    <line x1="9" y1="14" x2="15" y2="14"/>
  </svg>
`;

const ChevronIcon = ({ expanded }) => html`
  <svg
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round"
    style="transition: transform 0.15s ease; transform: rotate(${expanded ? '90deg' : '0deg'}); flex-shrink: 0;"
  >
    <polyline points="9 18 15 12 9 6"/>
  </svg>
`;

// ============================================
// INLINE INPUT
// ============================================

function InlineInput({
  placeholder, onConfirm, onCancel, paddingLeft = 12,
}) {
  const ref = useRef(null);
  const [value, setValue] = useState('');
  const doneRef = useRef(false);

  useEffect(() => { if (ref.current) ref.current.focus(); }, []);

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
      <input
        ref=${ref}
        class="inline-input"
        type="text"
        placeholder=${placeholder}
        value=${value}
        onInput=${(e) => setValue(e.target.value)}
        onKeyDown=${onKeyDown}
        onBlur=${confirm}
      />
    </div>
  `;
}

// ============================================
// TREE ITEM
// ============================================

function TreeItem({
  item, activeItem, onItemClick, onAddSubfolder, onDelete, level = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.isFolder || hasChildren;
  // eslint-disable-next-line no-underscore-dangle
  const itemId = item._id;

  const paddingLeft = 8 + level * 16;

  const handleClick = (e) => {
    if (e.target.closest('.item-actions')) return;
    if (isFolder) setIsExpanded((prev) => !prev);
    if (item.postId) {
      const postId = typeof item.postId === 'string'
        ? item.postId
        // eslint-disable-next-line no-underscore-dangle
        : (item.postId._id || item.postId.id);
      if (postId) onItemClick(itemId, postId);
    }
  };

  const handleAddSubfolder = (e) => {
    e.stopPropagation();
    setIsExpanded(true);
    setIsAddingChild(true);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    // eslint-disable-next-line no-alert
    if (window.confirm(`Delete "${item.title}"?`)) onDelete(itemId);
  };

  return html`
    <li class="tree-item ${isFolder ? 'is-folder' : 'is-file'}">
      <div
        class="tree-item-content ${activeItem === itemId ? 'active' : ''}"
        style="padding-left: ${paddingLeft}px"
        onClick=${handleClick}
        onMouseEnter=${() => setIsHovered(true)}
        onMouseLeave=${() => setIsHovered(false)}
        title=${item.title}
      >
        <span class="tree-chevron">
          ${isFolder
    ? html`<${ChevronIcon} expanded=${isExpanded} />`
    : html`<span style="width:12px;display:inline-block"/>`
}
        </span>

        <span class="tree-label">${item.title}</span>

        ${isHovered && html`
          <span class="item-actions">
            ${isFolder && html`
              <button
                class="item-action-btn"
                title="Add subfolder"
                onMouseDown=${(e) => e.preventDefault()}
                onClick=${handleAddSubfolder}
              ><${FolderPlusIcon} /></button>
            `}
            <button
              class="item-action-btn item-action-btn-delete"
              title="Delete"
              onMouseDown=${(e) => e.preventDefault()}
              onClick=${handleDelete}
            ><${TrashIcon} /></button>
          </span>
        `}
      </div>

      ${(isExpanded || isAddingChild) && html`
        <ul class="tree-children" style="--indent: ${paddingLeft + 16}px">
          ${isAddingChild && html`
            <${InlineInput}
              placeholder="Folder name…"
              paddingLeft=${paddingLeft + 20}
              onConfirm=${(name) => { onAddSubfolder(itemId, name); setIsAddingChild(false); }}
              onCancel=${() => setIsAddingChild(false)}
            />
          `}
          ${hasChildren && item.children.map((child) => html`
            <${TreeItem}
              key=${child._id /* eslint-disable-line no-underscore-dangle */}
              item=${child}
              activeItem=${activeItem}
              onItemClick=${onItemClick}
              onAddSubfolder=${onAddSubfolder}
              onDelete=${onDelete}
              level=${level + 1}
            />
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
  category, activeSubcategory, onSubcategoryClick,
  onAddFolder, onDeleteCategory,
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const hasItems = category.items && category.items.length > 0;

  const handleAddFolder = (e) => {
    e.stopPropagation();
    setIsCollapsed(false);
    setIsAddingFolder(true);
  };

  const handleDeleteCategory = (e) => {
    e.stopPropagation();
    // eslint-disable-next-line no-alert
    if (window.confirm(`Delete category "${category.name}"?`)) onDeleteCategory(category.id);
  };

  return html`
    <li class="category-item">
      <div
        class="category-header"
        onClick=${() => setIsCollapsed((p) => !p)}
        onMouseEnter=${() => setIsHovered(true)}
        onMouseLeave=${() => setIsHovered(false)}
      >
        <span class="category-chevron">
          <${ChevronIcon} expanded=${!isCollapsed} />
        </span>
        <span class="category-name">${category.name.toUpperCase()}</span>

        ${isHovered && html`
          <span class="item-actions">
            <button
              class="item-action-btn"
              title="Add folder"
              onMouseDown=${(e) => e.preventDefault()}
              onClick=${handleAddFolder}
            ><${FolderPlusIcon} /></button>
            <button
              class="item-action-btn item-action-btn-delete"
              title="Delete category"
              onMouseDown=${(e) => e.preventDefault()}
              onClick=${handleDeleteCategory}
            ><${TrashIcon} /></button>
          </span>
        `}
      </div>

      ${!isCollapsed && html`
        <ul class="tree-list">
          ${isAddingFolder && html`
            <${InlineInput}
              placeholder="Folder name…"
              paddingLeft=${24}
              onConfirm=${(name) => { onAddFolder(category.name, null, name); setIsAddingFolder(false); }}
              onCancel=${() => setIsAddingFolder(false)}
            />
          `}
          ${hasItems
    ? category.items.map((item) => html`
                <${TreeItem}
                  key=${item._id /* eslint-disable-line no-underscore-dangle */}
                  item=${item}
                  activeItem=${activeSubcategory}
                  onItemClick=${(itemId, postId) => onSubcategoryClick(category.id, itemId, postId)}
                  onAddSubfolder=${(parentId, name) => onAddFolder(category.name, parentId, name)}
                  onDelete=${(itemId) => onDeleteCategory(category.id, itemId)}
                  level=${0}
                />
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
  const [isOpen, setIsOpen] = useState(window.innerWidth >= 768);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creationError, setCreationError] = useState('');
  const inputRef = useRef(null);

  const applyBodyOffset = (open) => {
    // Rely on CSS Grid classes instead of manual JS margins
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
      if (window.innerWidth >= 768 && !isOpen) {
        setIsOpen(true);
        applyBodyOffset(true);
      }
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
        setCategories(data.categories);
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

  const handleSubcategoryClick = (categoryId, subcategoryId, postId) => {
    
    setActiveSubcategory(subcategoryId);
    if (!postId) return;
    window.dispatchEvent(new CustomEvent('load-forum-post', {
      detail: { postId, sidebarItemId: subcategoryId },
    }));
  };

  const handleAddFolder = async (categoryId, parentId, name) => {
    try {
      const response = await fetch(`${API_BASE}/sidebar-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name,
          category: categoryId,
          parentId: parentId || null,
          isFolder: true,
          icon: '📁',
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

  const handleDelete = async (categoryId, itemId) => {
    try {
      const url = itemId
        ? `${API_BASE}/sidebar-items/${itemId}`
        : `${API_BASE}/sidebar/categories/${categoryId}`;
      const response = await fetch(url, { method: 'DELETE' });
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
      const response = await fetch(`${API_BASE}/sidebar-items/smart-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Getting Started', category: trimmedName, postId: null }),
      });
      const data = await response.json();
      if (data.success) { await fetchCategories(); cancelCreating(); } else setCreationError(data.error || 'Failed to create category');
    } catch { setCreationError('Network error'); }
  };

  const filterItems = (items, term) => items.reduce((acc, item) => {
    const matches = item.title.toLowerCase().includes(term);
    const filteredChildren = item.children ? filterItems(item.children, term) : [];
    if (matches || filteredChildren.length > 0) {
      acc.push({
        ...item,
        children: filteredChildren.length > 0 ? filteredChildren : item.children,
      });
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
          <input
            type="text"
            placeholder="Search..."
            value=${searchTerm}
            onInput=${(e) => setSearchTerm(e.target.value.toLowerCase())}
          />
        </div>

        <div class="explorer-header">
          <h3>EXPLORER</h3>
          <button
            class="add-category"
            title="Add Category"
            onClick=${() => { setIsCreating(true); setNewCatName(''); setCreationError(''); }}
          >
            <${PlusIcon} />
          </button>
        </div>

        ${isCreating && html`
          <div class="new-category-form">
            <input
              ref=${inputRef}
              type="text"
              class="new-category-input ${creationError ? 'error' : ''}"
              placeholder="Category name…"
              value=${newCatName}
              onKeyDown=${handleCreateKeyDown}
              onInput=${(e) => { setNewCatName(e.target.value); if (creationError) setCreationError(''); }}
              onBlur=${cancelCreating}
            />
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
              />
            `)
    : html`<div class="no-results">No categories found</div>`
}
          </ul>
        `}
      </div>

      ${isOpen && html`
        <div
          class="sidebar-backdrop"
          onClick=${() => { setIsOpen(false); applyBodyOffset(false); }}
        />
      `}
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
