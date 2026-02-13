import { html, render } from '../../vendor/htm-preact.js';
import { useState, useEffect } from '../../vendor/preact-hooks.js';

// Hardcoded category data
const initialCategoryData = [
  {
    id: 'javascript',
    name: 'JavaScript',
    icon: '📁',
    subcategories: [
      { id: 'frontend-resources', name: 'Frontend Resources', icon: '📄' },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    icon: '📁',
    subcategories: [],
  },
  {
    id: 'css-design',
    name: 'CSS & Design',
    icon: '📁',
    subcategories: [],
  },
  {
    id: 'devops',
    name: 'DevOps',
    icon: '📁',
    subcategories: [
      { id: 'engineering-handbook', name: 'Engineering Handbook', icon: '📄' },
    ],
  },
];

// Category Item Component
function CategoryItem({ category, activeSubcategory, onSubcategoryClick }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return html`
    <li class="category-item ${isCollapsed ? 'collapsed' : ''}">
      <div class="category-header" onClick=${toggleCollapse}>
        <span class="category-toggle">▼</span>
        <span class="category-icon">${category.icon}</span>
        <span class="category-name">${category.name}</span>
      </div>
      <ul class="subcategory-list">
        ${category.subcategories && category.subcategories.length > 0
    ? category.subcategories.map((sub) => html`
              <li 
                key=${sub.id}
                class="subcategory-item ${activeSubcategory === sub.id ? 'active' : ''}"
                onClick=${() => onSubcategoryClick(category.id, sub.id)}
              >
                <span class="subcategory-icon">${sub.icon}</span>
                <span>${sub.name}</span>
              </li>
            `)
    : html`<div class="no-items">No pages yet</div>`
}
      </ul>
    </li>
  `;
}

// Main Sidebar Component
function Sidebar() {
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [showAddInput, setShowAddInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load categories from localStorage on mount
  useEffect(() => {
    const storedCategories = localStorage.getItem('sidebarCategories');
    if (storedCategories) {
      try {
        setCategories(JSON.parse(storedCategories));
      } catch (error) {
        // Error parsing stored categories, use initial data
        setCategories(initialCategoryData);
      }
    } else {
      setCategories(initialCategoryData);
    }
  }, []);

  // Save categories to localStorage whenever they change
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('sidebarCategories', JSON.stringify(categories));
    }
  }, [categories]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleAddCategory = () => {
    setShowAddInput(!showAddInput);
    setNewCategoryName('');
    setErrorMessage('');
  };

  const handleConfirmAdd = () => {
    if (newCategoryName.trim()) {
      // Check if category already exists (case-insensitive)
      const categoryExists = categories.some(
        (cat) => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
      );

      if (categoryExists) {
        setErrorMessage('Category already exists');
        return;
      }

      const newCategory = {
        id: newCategoryName.toLowerCase().replace(/\s+/g, '-'),
        name: newCategoryName.trim(),
        icon: '📁',
        subcategories: [],
      };
      setCategories([...categories, newCategory]);
      setNewCategoryName('');
      setShowAddInput(false);
      setErrorMessage('');
    }
  };

  const handleCancelAdd = () => {
    setShowAddInput(false);
    setNewCategoryName('');
    setErrorMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConfirmAdd();
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  const handleSubcategoryClick = (categoryId, subcategoryId) => {
    setActiveSubcategory(subcategoryId);

    // Emit custom event for navigation
    const event = new CustomEvent('subcategorySelected', {
      detail: { categoryId, subcategoryId },
    });
    document.dispatchEvent(event);
  };

  // Filter categories based on search
  const filteredCategories = categories.map((category) => {
    if (searchTerm === '') return category;

    const categoryMatches = category.name.toLowerCase().includes(searchTerm);
    const filteredSubs = category.subcategories.filter(
      (sub) => sub.name.toLowerCase().includes(searchTerm),
    );

    if (categoryMatches || filteredSubs.length > 0) {
      return {
        ...category,
        subcategories: filteredSubs.length > 0 ? filteredSubs : category.subcategories,
      };
    }
    return null;
  }).filter(Boolean);

  return html`
    <div class="sidebar">
      <div class="search-container">
        <input
          type="text"
          placeholder="Search..."
          value=${searchTerm}
          onInput=${handleSearch}
        />
      </div>

      <div class="explorer-header">
        <h3>EXPLORER</h3>
        <button 
          class="add-category" 
          onClick=${handleAddCategory}
          title="Add Category"
        >
          +
        </button>
      </div>

      <div class="add-category-input ${showAddInput ? 'active' : ''}">
        <input
          type="text"
          placeholder="Category name..."
          value=${newCategoryName}
          onInput=${(e) => setNewCategoryName(e.target.value)}
          onKeyDown=${handleKeyPress}
          autoFocus
        />
        ${errorMessage && html`
          <div class="error-message">${errorMessage}</div>
        `}
        <div class="add-category-actions">
          <button class="btn-confirm" onClick=${handleConfirmAdd}>Add</button>
          <button class="btn-cancel" onClick=${handleCancelAdd}>Cancel</button>
        </div>
      </div>

      <ul class="category-list">
        ${filteredCategories.map((category) => html`
          <${CategoryItem}
            key=${category.id}
            category=${category}
            activeSubcategory=${activeSubcategory}
            onSubcategoryClick=${handleSubcategoryClick}
          />
        `)}
      </ul>
    </div>
  `;
}

// AEM Edge Delivery decorate function
export default function decorate(block) {
  // Clear the block
  block.innerHTML = '';

  // Render the Preact component
  render(html`<${Sidebar} />`, block);
}
