import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

// ============================================
// ICON COMPONENTS
// ============================================

const PlusIcon = () => html`
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
`;

const BellIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
`;

const SettingsIcon = () => html`
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
`;

const UserIcon = () => html`
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" style="color: var(--spectrum-gray-800);">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
`;

// ============================================
// STATIC DATA (No backend required)
// ============================================

const STATIC_CATEGORIES = [
  {
    id: '1',
    name: 'Getting Started',
    icon: '📁',
    items: [
      {
        _id: '101', title: 'Introduction', icon: '📄', isFolder: false,
      },
      {
        _id: '102', title: 'Installation', icon: '📄', isFolder: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Tutorials',
    icon: '📁',
    items: [
      {
        _id: '201', title: 'Beginner Guide', icon: '📄', isFolder: false,
      },
      {
        _id: '202', title: 'Advanced Topics', icon: '📄', isFolder: false,
      },
    ],
  },
  {
    id: '3',
    name: 'Resources',
    icon: '📁',
    items: [
      {
        _id: '301', title: 'FAQ', icon: '📄', isFolder: false,
      },
      {
        _id: '302', title: 'Community Links', icon: '📄', isFolder: false,
      },
    ],
  },
];

// ============================================
// SIDEBAR COMPONENTS
// ============================================

// Recursive TreeItem component for nested structure
function TreeItem({
  item, activeItem, onItemClick, level = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.isFolder || hasChildren;

  const handleClick = () => {
    if (isFolder) {
      setIsExpanded(!isExpanded);
    }
    if (item.postId) {
      // eslint-disable-next-line no-underscore-dangle
      const postId = typeof item.postId === 'string' ? item.postId : (item.postId._id || item.postId.id);
      if (postId) {
        // eslint-disable-next-line no-underscore-dangle
        onItemClick(item._id, postId);
      }
    }
  };

  return html`
    <li class="tree-item ${isFolder ? 'is-folder' : 'is-file'}" style="--indent-level: ${level}">
      <div
        class="tree-item-content ${/* eslint-disable-line no-underscore-dangle */ activeItem === item._id ? 'active' : ''}"
        onClick=${handleClick}
      >
        ${isFolder && html`
          <span class="tree-toggle ${isExpanded ? 'expanded' : ''}">▶</span>
        `}
        <span class="tree-icon">${isFolder ? '📁' : (item.icon || '📄')}</span>
        <span class="tree-label">${item.title}</span>
      </div>
      ${isFolder && isExpanded && hasChildren && html`
        <ul class="tree-children">
          ${item.children.map((child) => html`
            <${TreeItem}
              key=${/* eslint-disable-line no-underscore-dangle */ child._id}
              item=${child}
              activeItem=${activeItem}
              onItemClick=${onItemClick}
              level=${level + 1}
            />
          `)}
        </ul>
      `}
    </li>
  `;
}

function CategoryItem({ category, activeSubcategory, onSubcategoryClick }) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const hasItems = category.items && category.items.length > 0;

  return html`
    <li class="category-item ${isCollapsed ? 'collapsed' : ''}">
      <div class="category-header" onClick=${toggleCollapse}>
        <span class="category-toggle">▼</span>
        <span class="category-icon">${category.icon || '📁'}</span>
        <span class="category-name">${category.name}</span>
      </div>
      ${!isCollapsed && html`
        <ul class="tree-list">
          ${hasItems
    ? category.items.map((item) => html`
              <${TreeItem}
                key=${/* eslint-disable-line no-underscore-dangle */ item._id}
                item=${item}
                activeItem=${activeSubcategory}
                onItemClick=${(itemId, postId) => onSubcategoryClick(category.id, itemId, postId)}
                level=${0}
              />
            `)
    : html`<div class="no-items">No files yet</div>`
}
        </ul>
      `}
    </li>
  `;
}

function Sidebar() {
  const [categories, setCategories] = useState(STATIC_CATEGORIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);

  // New Category Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creationError, setCreationError] = useState('');

  const inputRef = useRef(null);

  // Focus input when creation mode starts
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  // --- Handlers ---
  const handleSearch = (e) => setSearchTerm(e.target.value.toLowerCase());

  const handleSubcategoryClick = (categoryId, subcategoryId, postId) => {
    setActiveSubcategory(subcategoryId);

    if (!postId) return;

    const event = new CustomEvent('load-forum-post', {
      detail: { postId, sidebarItemId: subcategoryId },
    });
    window.dispatchEvent(event);
  };

  const startCreating = () => {
    setIsCreating(true);
    setNewCatName('');
    setCreationError('');
  };

  const cancelCreating = () => {
    setIsCreating(false);
    setNewCatName('');
    setCreationError('');
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Escape') {
      cancelCreating();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const trimmedName = newCatName.trim();

      if (!trimmedName) {
        setCreationError('Name cannot be empty');
        return;
      }

      const exists = categories.some(
        (c) => c.name.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (exists) {
        setCreationError('Category already exists');
        return;
      }

      // Add new category to local state (no backend)
      const newCategory = {
        id: Date.now().toString(),
        name: trimmedName,
        icon: '📁',
        items: [],
      };
      setCategories([...categories, newCategory]);
      cancelCreating();
    }
  };

  const handleCreateInput = (e) => {
    setNewCatName(e.target.value);
    if (creationError) setCreationError('');
  };

  // --- Filtering Logic (recursive for tree items) ---
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
    ? categories.map((category) => {
      const categoryMatches = category.name.toLowerCase().includes(searchTerm);
      const filteredItems = filterItems(category.items || [], searchTerm);

      if (categoryMatches || filteredItems.length > 0) {
        return {
          ...category,
          items: filteredItems.length > 0 ? filteredItems : category.items,
        };
      }
      return null;
    }).filter(Boolean)
    : categories;

  return html`
    <div class="sidebar">
      <div class="search-container">
        <input type="text" placeholder="Search..." value=${searchTerm} onInput=${handleSearch} />
      </div>

      <div class="explorer-header">
        <h3>EXPLORER</h3>
        <button class="add-category" title="Add Category" onClick=${startCreating}>
          <${PlusIcon} />
        </button>
      </div>

      ${isCreating && html`
        <div class="new-category-form">
          <input 
            ref=${inputRef}
            type="text" 
            class="new-category-input ${creationError ? 'error' : ''}"
            placeholder="Add category"
            value=${newCatName}
            onKeyDown=${handleCreateKeyDown}
            onInput=${handleCreateInput}
            onBlur=${cancelCreating} 
          />
          ${creationError && html`<div class="error-msg">${creationError}</div>`}
        </div>
      `}

      <ul class="category-list">
        ${filteredCategories.length > 0
    ? filteredCategories.map((category) => html`
              <${CategoryItem}
                key=${category.id}
                category=${category}
                activeSubcategory=${activeSubcategory}
                onSubcategoryClick=${handleSubcategoryClick}
              />
            `)
    : html`<div class="no-results">No categories found</div>`
}
      </ul>
    </div>
  `;
}

// ============================================
// HEADER COMPONENT
// ============================================

function HeaderComponent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  const toggleMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    const sidebarWrapper = document.querySelector('.sidebar-wrapper');
    if (sidebarWrapper) {
      sidebarWrapper.classList.toggle('mobile-open', newState);
    }
  };

  const handleProfileImageError = () => {
    setProfileImageError(true);
  };

  return html`
    <nav class="spectrum-nav">
      <div class="nav-hamburger ${isMobileMenuOpen ? 'is-open' : ''}">
        <button type="button" onClick=${toggleMenu} aria-label="Toggle Sidebar">
          <span class="nav-hamburger-icon"></span>
        </button>
      </div>

      <div class="nav-brand-section">
        <a href="/" class="nav-brand">
          <img
            src="/icons/logo.svg"
            alt="Adobe Logo"
            onError=${(e) => {
    if (e.target.src.endsWith('.svg')) {
      e.target.src = '/icons/logo.png';
    }
  }}
          />
        </a>

        <a href="/create-post" class="nav-button spectrum-button">
          <${PlusIcon} />
          <span>Add Post</span>
        </a>
      </div>

      <div class="nav-tools">
        <ul>
          <li>
            <a href="/bell" class="spectrum-action-button" aria-label="Notifications">
              <${BellIcon} />
            </a>
          </li>
          
          <li>
            <a href="/settings" class="spectrum-action-button" aria-label="Settings">
              <${SettingsIcon} />
            </a>
          </li>
          
          <li class="profile-item">
            <a href="/profile" class="profile-link">
              <div class="profile-avatar">
                ${!profileImageError
    ? html`<img src="/icons/profile.png" alt="Profile" onError=${handleProfileImageError} />`
    : html`<${UserIcon} />`}
              </div>
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `;
}

// ============================================
// AEM BLOCK DECORATOR
// ============================================

export default async function decorate(block) {
  block.textContent = '';

  const headerWrapper = document.createElement('div');
  headerWrapper.className = 'header-wrapper';
  const sidebarWrapper = document.createElement('div');
  sidebarWrapper.className = 'sidebar-wrapper';

  block.append(headerWrapper);
  block.append(sidebarWrapper);

  try {
    render(html`<${HeaderComponent} />`, headerWrapper);
    render(html`<${Sidebar} />`, sidebarWrapper);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Render error:', err);
  }

  try {
    const resp = await fetch('/footer.plain.html');
    if (resp.ok) {
      const footerHtml = await resp.text();
      let footer = document.querySelector('footer');
      if (!footer) {
        footer = document.createElement('footer');
        document.body.append(footer);
      }
      footer.innerHTML = footerHtml;
      footer.classList.add('global-footer');
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Failed to load global footer', e);
  }
}
