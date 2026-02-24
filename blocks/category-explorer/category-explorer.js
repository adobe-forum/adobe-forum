import { h, render } from '../../vendor/preact.js';
import { useEffect, useRef, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

const html = htm.bind(h);

// Time helpers
const NOW = Date.now();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = NOW - ts;
  if (diff < 2 * MIN) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  return `${Math.floor(diff / WEEK)}w ago`;
}

// Pure helper — checks if any node in the subtree is in favIds.
// Lets the Favorites filter include root categories whose children are favorited.
function hasAnyFavoriteChild(nodes, favIds) {
  return nodes.some((n) => favIds.has(n.id) || hasAnyFavoriteChild(n.children || [], favIds));
}

// favoriteIds: Set<string> of favorited node IDs (any depth).
function getFilteredData(filter, data, favoriteIds = new Set()) {
  switch (filter) {
    case 'favorites':
      return data.filter(
        (c) => favoriteIds.has(c.id) || hasAnyFavoriteChild(c.items || [], favoriteIds),
      );
    case 'popular':
      return [...data].sort((a, b) => (b.topicCount || 0) - (a.topicCount || 0));
    case 'new':
      return data
        .filter((c) => c.createdAt && (NOW - c.createdAt) < 30 * DAY)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'myCreated':
      return data.filter((c) => c.createdByUser || c.postedByUser);
    default:
      return data;
  }
}

function getNodeId(node) {
  return node['_id'] || node.id; // eslint-disable-line dot-notation
}

const SIDEBAR_SECTIONS = [
  {
    key: 'nav',
    label: 'Browse',
    items: [
      {
        key: 'allCategories',
        label: 'All Categories',
        iconSvg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>',
      },
      {
        key: 'favorites',
        label: 'Favorites',
        iconSvg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="8,2 9.8,6.5 15,6.5 10.9,9.5 12.4,14 8,11 3.6,14 5.1,9.5 1,6.5 6.2,6.5"/></svg>',
      },
    ],
  },
  {
    key: 'filters',
    label: 'Filters',
    items: [
      {
        key: 'popular',
        label: 'Popular',
        iconSvg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="2,12 6,7 9,10 13,4"/><polyline points="10,4 13,4 13,7"/></svg>',
      },
      {
        key: 'new',
        label: 'New',
        iconSvg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>',
      },
      {
        key: 'myCreated',
        label: 'My Categories',
        iconSvg: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M2 14a6 6 0 0 1 12 0"/></svg>',
      },
    ],
  },
];

// Mock tree data with metadata — replace with API fetch after approval
const MOCK_TREE = [
  {
    id: 'javascript',
    name: 'JavaScript',
    topicCount: 1245,
    lastUpdated: NOW - 2 * MIN,
    createdAt: NOW - 365 * DAY,
    createdByUser: true,
    isFavorite: true,
    items: [
      {
        id: 'js-basics',
        title: 'Basics',
        isFolder: true,
        children: [
          {
            id: 'js-variables', title: 'Variables & Scope', isFolder: false, children: [],
          },
          {
            id: 'js-functions', title: 'Functions', isFolder: false, children: [],
          },
          {
            id: 'js-closures', title: 'Closures', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'js-es6',
        title: 'ES6+',
        isFolder: true,
        children: [
          {
            id: 'js-arrow', title: 'Arrow Functions', isFolder: false, children: [],
          },
          {
            id: 'js-promises', title: 'Promises & Async', isFolder: false, children: [],
          },
          {
            id: 'js-destructure', title: 'Destructuring', isFolder: false, children: [],
          },
          {
            id: 'js-modules', title: 'Modules', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'js-dom',
        title: 'DOM Manipulation',
        isFolder: true,
        children: [
          {
            id: 'js-selectors', title: 'Selectors', isFolder: false, children: [],
          },
          {
            id: 'js-events', title: 'Event Handling', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'react',
    name: 'React',
    topicCount: 892,
    lastUpdated: NOW - HOUR,
    createdAt: NOW - 300 * DAY,
    createdByUser: true,
    isFavorite: true,
    items: [
      {
        id: 'react-hooks',
        title: 'Hooks',
        isFolder: true,
        children: [
          {
            id: 'react-usestate', title: 'useState', isFolder: false, children: [],
          },
          {
            id: 'react-useeffect', title: 'useEffect', isFolder: false, children: [],
          },
          {
            id: 'react-useref', title: 'useRef', isFolder: false, children: [],
          },
          {
            id: 'react-usememo', title: 'useMemo', isFolder: false, children: [],
          },
          {
            id: 'react-custom', title: 'Custom Hooks', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'react-components',
        title: 'Components',
        isFolder: true,
        children: [
          {
            id: 'react-props', title: 'Props & State', isFolder: false, children: [],
          },
          {
            id: 'react-lifecycle', title: 'Lifecycle', isFolder: false, children: [],
          },
          {
            id: 'react-context', title: 'Context API', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'react-routing',
        title: 'Routing',
        isFolder: true,
        children: [
          {
            id: 'react-router', title: 'React Router', isFolder: false, children: [],
          },
          {
            id: 'react-params', title: 'URL Parameters', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    topicCount: 567,
    lastUpdated: NOW - 3 * HOUR,
    createdAt: NOW - 320 * DAY,
    items: [
      {
        id: 'node-core',
        title: 'Core Modules',
        isFolder: true,
        children: [
          {
            id: 'node-fs', title: 'File System', isFolder: false, children: [],
          },
          {
            id: 'node-http', title: 'HTTP Server', isFolder: false, children: [],
          },
          {
            id: 'node-path', title: 'Path Module', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'node-express',
        title: 'Express.js',
        isFolder: true,
        children: [
          {
            id: 'node-middleware', title: 'Middleware', isFolder: false, children: [],
          },
          {
            id: 'node-routes', title: 'Routing', isFolder: false, children: [],
          },
          {
            id: 'node-rest', title: 'REST APIs', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'node-db',
        title: 'Databases',
        isFolder: true,
        children: [
          {
            id: 'node-mongo', title: 'MongoDB', isFolder: false, children: [],
          },
          {
            id: 'node-sql', title: 'SQL', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'css',
    name: 'CSS',
    topicCount: 432,
    lastUpdated: NOW - 5 * HOUR,
    createdAt: NOW - 280 * DAY,
    createdByUser: true,
    items: [
      {
        id: 'css-layout',
        title: 'Layout',
        isFolder: true,
        children: [
          {
            id: 'css-flexbox', title: 'Flexbox', isFolder: false, children: [],
          },
          {
            id: 'css-grid', title: 'Grid', isFolder: false, children: [],
          },
          {
            id: 'css-position', title: 'Positioning', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'css-responsive',
        title: 'Responsive Design',
        isFolder: true,
        children: [
          {
            id: 'css-media', title: 'Media Queries', isFolder: false, children: [],
          },
          {
            id: 'css-mobile', title: 'Mobile First', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'css-animation',
        title: 'Animations',
        isFolder: true,
        children: [
          {
            id: 'css-transitions', title: 'Transitions', isFolder: false, children: [],
          },
          {
            id: 'css-keyframes', title: 'Keyframes', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'python',
    name: 'Python',
    topicCount: 765,
    lastUpdated: NOW - DAY,
    createdAt: NOW - 400 * DAY,
    postedByUser: true,
    isFavorite: true,
    items: [
      {
        id: 'py-basics',
        title: 'Basics',
        isFolder: true,
        children: [
          {
            id: 'py-syntax', title: 'Syntax & Types', isFolder: false, children: [],
          },
          {
            id: 'py-functions', title: 'Functions', isFolder: false, children: [],
          },
          {
            id: 'py-oop', title: 'OOP', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'py-web',
        title: 'Web Frameworks',
        isFolder: true,
        children: [
          {
            id: 'py-django', title: 'Django', isFolder: false, children: [],
          },
          {
            id: 'py-flask', title: 'Flask', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'java',
    name: 'Java',
    topicCount: 654,
    lastUpdated: NOW - 2 * DAY,
    createdAt: NOW - 350 * DAY,
    items: [
      {
        id: 'java-core',
        title: 'Core Java',
        isFolder: true,
        children: [
          {
            id: 'java-oop', title: 'OOP Concepts', isFolder: false, children: [],
          },
          {
            id: 'java-collections', title: 'Collections', isFolder: false, children: [],
          },
          {
            id: 'java-streams', title: 'Streams & Lambda', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'java-spring',
        title: 'Spring Framework',
        isFolder: true,
        children: [
          {
            id: 'java-springboot', title: 'Spring Boot', isFolder: false, children: [],
          },
          {
            id: 'java-mvc', title: 'Spring MVC', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'dbms',
    name: 'DBMS',
    topicCount: 345,
    lastUpdated: NOW - 3 * DAY,
    createdAt: NOW - 200 * DAY,
    items: [
      {
        id: 'db-sql',
        title: 'SQL',
        isFolder: true,
        children: [
          {
            id: 'db-queries', title: 'Queries & Joins', isFolder: false, children: [],
          },
          {
            id: 'db-indexes', title: 'Indexes', isFolder: false, children: [],
          },
          {
            id: 'db-transactions', title: 'Transactions', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'db-nosql',
        title: 'NoSQL',
        isFolder: true,
        children: [
          {
            id: 'db-mongodb', title: 'MongoDB', isFolder: false, children: [],
          },
          {
            id: 'db-redis', title: 'Redis', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'devops',
    name: 'DevOps',
    topicCount: 298,
    lastUpdated: NOW - WEEK,
    createdAt: NOW - 20 * DAY,
    items: [
      {
        id: 'devops-ci',
        title: 'CI/CD',
        isFolder: true,
        children: [
          {
            id: 'devops-github', title: 'GitHub Actions', isFolder: false, children: [],
          },
          {
            id: 'devops-jenkins', title: 'Jenkins', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'devops-containers',
        title: 'Containers',
        isFolder: true,
        children: [
          {
            id: 'devops-docker', title: 'Docker', isFolder: false, children: [],
          },
          {
            id: 'devops-k8s', title: 'Kubernetes', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'aiml',
    name: 'AI & Machine Learning',
    topicCount: 187,
    lastUpdated: NOW - 2 * WEEK,
    createdAt: NOW - 25 * DAY,
    items: [
      {
        id: 'ml-foundations',
        title: 'Foundations',
        isFolder: true,
        children: [
          {
            id: 'ml-supervised', title: 'Supervised Learning', isFolder: false, children: [],
          },
          {
            id: 'ml-unsupervised', title: 'Unsupervised Learning', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'ml-dl',
        title: 'Deep Learning',
        isFolder: true,
        children: [
          {
            id: 'ml-nn', title: 'Neural Networks', isFolder: false, children: [],
          },
          {
            id: 'ml-cnn', title: 'CNN', isFolder: false, children: [],
          },
          {
            id: 'ml-nlp', title: 'NLP', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    name: 'Mobile Development',
    topicCount: 523,
    lastUpdated: NOW - WEEK,
    createdAt: NOW - 15 * DAY,
    postedByUser: true,
    items: [
      {
        id: 'mob-react',
        title: 'React Native',
        isFolder: true,
        children: [
          {
            id: 'mob-rn-basics', title: 'RN Basics', isFolder: false, children: [],
          },
          {
            id: 'mob-rn-nav', title: 'Navigation', isFolder: false, children: [],
          },
        ],
      },
      {
        id: 'mob-flutter',
        title: 'Flutter',
        isFolder: true,
        children: [
          {
            id: 'mob-dart', title: 'Dart Language', isFolder: false, children: [],
          },
          {
            id: 'mob-widgets', title: 'Widgets', isFolder: false, children: [],
          },
        ],
      },
    ],
  },
];

// Flatten tree for search
function flattenTree(categories) {
  const results = [];
  const walk = (nodes, catName, parentPath) => {
    nodes.forEach((node) => {
      const nodeIsFolder = node.isFolder || (node.children && node.children.length > 0);
      if (!nodeIsFolder) return;
      const path = parentPath
        ? `${parentPath} / ${node.title}`
        : node.title;
      results.push({ ...node, catName, fullPath: `${catName} / ${path}` });
      if (node.children && node.children.length > 0) {
        walk(node.children, catName, path);
      }
    });
  };
  categories.forEach((cat) => {
    results.push({
      id: cat.id, name: cat.name, catName: cat.name, fullPath: cat.name, isRoot: true,
    });
    walk(cat.items || [], cat.name, '');
  });
  return results;
}

function filterFoldersOnly(items) {
  return items
    .filter((item) => item.isFolder || (item.children && item.children.length > 0))
    .map((item) => ({
      ...item,
      children: item.children ? filterFoldersOnly(item.children) : [],
    }));
}

function TreeNode({
  node, depth, expanded, selected, onToggle, onSelectNode, onToggleFavorite, isFavorite,
}) {
  const hasChildren = node.children && node.children.length > 0;
  const nodeId = getNodeId(node);
  const isExpanded = expanded[nodeId];
  const isSelected = selected === nodeId;
  const isFolder = node.isFolder || hasChildren;
  const folderIcon = isExpanded ? '\u{1F4C2}' : '\u{1F4C1}';
  const nodeIsFav = isFavorite(nodeId);

  const handleStarClick = (e) => {
    e.stopPropagation();
    onToggleFavorite(nodeId);
    e.currentTarget.blur();
  };

  const handleClick = () => {
    if (isFolder && hasChildren) onToggle(nodeId);
    onSelectNode(node);
  };

  return html`
    <div className="tree-node-group">
      <div
        className=${`tree-node ${isSelected ? 'selected' : ''}`}
        style=${{ paddingLeft: `${12 + depth * 16}px` }}
        onClick=${handleClick}
      >
        ${isFolder ? html`
          <span className="tree-arrow ${isExpanded ? 'expanded' : ''}">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M3 2 L7 5 L3 8" fill="none"
                stroke="currentColor" stroke-width="1.5" />
            </svg>
          </span>
        ` : html`<span className="tree-arrow-spacer" />`}
        <span className="tree-icon">${folderIcon}</span>
        <span className="tree-col-name">${node.title}</span>
        <span className="tree-col-topics">
          ${node.topicCount ? node.topicCount.toLocaleString() : '—'}
        </span>
        <span className="tree-col-time">
          ${node.lastUpdated ? formatRelativeTime(node.lastUpdated) : '—'}
        </span>
        <span className="tree-col-star">
          <button
            type="button"
            className="ct-star-btn"
            title=${nodeIsFav ? 'Remove from Favorites' : 'Add to Favorites'}
            aria-label=${nodeIsFav ? 'Remove from Favorites' : 'Add to Favorites'}
            onClick=${handleStarClick}
          >${nodeIsFav ? '\u2605' : '\u2606'}</button>
        </span>
      </div>
      ${isFolder && isExpanded && hasChildren && html`
        <div className="tree-children">
          ${node.children.map((child) => html`
            <${TreeNode}
              key=${getNodeId(child)}
              node=${child}
              depth=${depth + 1}
              expanded=${expanded}
              selected=${selected}
              onToggle=${onToggle}
              onSelectNode=${onSelectNode}
              onToggleFavorite=${onToggleFavorite}
              isFavorite=${isFavorite}
            />
          `)}
        </div>
      `}
    </div>
  `;
}

function CategoryTreePopup({ isOpen, onClose, onSelect }) {
  const [treeData, setTreeData] = useState(() => MOCK_TREE.map((cat) => ({
    ...cat,
    items: filterFoldersOnly(cat.items || []),
  })));
  // Mock: centralized favorites store — Set<nodeId>.
  // Replace with API calls (POST/DELETE /favorites/:nodeId) when backend is ready.
  const [favoriteIds, setFavoriteIds] = useState(() => {
    const initial = new Set();
    MOCK_TREE.forEach((cat) => {
      if (cat.isFavorite) initial.add(cat.id);
    });
    return initial;
  });
  const [expanded, setExpanded] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingType, setCreatingType] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [viewMode, setViewMode] = useState('tree'); // 'tree' or 'grid'
  const [gridFolder, setGridFolder] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('allCategories');
  const overlayRef = useRef(null);
  const createInputRef = useRef(null);
  const searchRef = useRef(null);
  const lastToastRef = useRef({ id: null, time: 0 });
  const toastTimerRef = useRef(null);

  // Mock: toggle favorite for any node (root or sub-category).
  // Replace Set mutation with API call (POST/DELETE /favorites/:nodeId) when backend is ready.
  const toggleFavorite = (nodeId) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  // Derived helper — use this everywhere instead of reading isFavorite from data objects.
  // Backend version: return favoritesCache.has(nodeId) after hydrating from API.
  const isFavorite = (nodeId) => favoriteIds.has(nodeId);

  // Filtered display data — derived from treeData + activeFilter + favoriteIds
  const displayData = getFilteredData(activeFilter, treeData, favoriteIds);

  // Scroll lock — prevent background scroll while popup is open
  useEffect(() => {
    const { body } = document;
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - body.clientWidth;
      body.style.overflow = 'hidden';
      body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      body.style.overflow = '';
      body.style.paddingRight = '';
    }
    return () => {
      body.style.overflow = '';
      body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Reset state on open
  useEffect(() => {
    if (!isOpen) return;
    setExpanded({});
    setSelectedNode(null);
    setSearchQuery('');
    setCreatingType(null);
    setNewItemName('');
    setViewMode('tree');
    setGridFolder(null);
    setToastVisible(false);
    setActiveFilter('allCategories');
    clearTimeout(toastTimerRef.current);
    requestAnimationFrame(() => {
      if (searchRef.current) searchRef.current.focus();
    });
  }, [isOpen]);

  useEffect(() => {
    if (creatingType && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingType]);

  // Show toast when selecting a folder with no subfolders
  useEffect(() => {
    if (!selectedNode || !isOpen) return;
    const nodeId = selectedNode.id;
    let children;
    if (selectedNode.isRoot) {
      const cat = treeData.find((c) => c.id === nodeId);
      children = cat ? (cat.items || []) : [];
    } else {
      children = selectedNode.children || [];
    }
    if (children.length > 0) return;
    if (lastToastRef.current.id === nodeId
      && Date.now() - lastToastRef.current.time < 5000) return;
    lastToastRef.current = { id: nodeId, time: Date.now() };
    setToastVisible(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 5000);
  }, [selectedNode]);

  // Search results — always search full treeData regardless of filter
  const flatNodes = flattenTree(treeData);
  const query = searchQuery.trim().toLowerCase();
  const searchResults = query
    ? flatNodes.filter(
      (n) => (n.title || n.name || '').toLowerCase().includes(query)
        || (n.fullPath || '').toLowerCase().includes(query),
    )
    : null;

  const handleToggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelectNode = (node) => {
    setSelectedNode(node);
    setCreatingType(null);
    setNewItemName('');
  };

  const handleFilterSelect = (filterKey) => {
    setActiveFilter(filterKey);
    setSearchQuery('');
    setSelectedNode(null);
    setExpanded({});
    setGridFolder(null);
  };

  const walkForPath = (nodes, targetId, prefix) => {
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const nPath = `${prefix} / ${n.title}`;
      if (n.id === targetId) return nPath;
      if (n.children && n.children.length > 0) {
        const found = walkForPath(n.children, targetId, nPath);
        if (found) return found;
      }
    }
    return null;
  };

  const buildPath = (node) => {
    if (!node) return '';
    if (node.fullPath) return node.fullPath;
    if (node.isRoot || (node.name && !node.title)) return node.name;
    let result = '';
    treeData.forEach((cat) => {
      const found = walkForPath(cat.items || [], node.id, cat.name);
      if (found) result = found;
    });
    return result || node.title || node.name || '';
  };

  const handleConfirm = () => {
    if (!selectedNode) return;
    const path = buildPath(selectedNode);
    onSelect(path, selectedNode);
    onClose();
  };

  const addToNode = (nodes, targetId, newNode) => {
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].id === targetId) {
        if (nodes[i].isFolder) {
          nodes[i].children.push(newNode);
        } else {
          nodes.splice(i + 1, 0, newNode);
        }
        return true;
      }
      if (nodes[i].children && nodes[i].children.length > 0) {
        if (addToNode(nodes[i].children, targetId, newNode)) return true;
      }
    }
    return false;
  };

  const insertIntoTree = (cats, target, newNode) => {
    if (target.isRoot || (target.name && !target.title)) {
      const cat = cats.find((c) => c.id === target.id);
      if (cat) cat.items.push(newNode);
      return cats;
    }
    cats.forEach((cat) => {
      addToNode(cat.items || [], target.id, newNode);
    });
    return cats;
  };

  const handleCreateItem = () => {
    if (!newItemName.trim()) return;
    const newNode = {
      id: `custom-${Date.now()}`,
      title: newItemName.trim(),
      isFolder: true,
      children: [],
    };
    setTreeData((prev) => {
      const clone = JSON.parse(JSON.stringify(prev));
      if (!selectedNode) {
        clone.push({
          id: newNode.id,
          name: newNode.title,
          items: [],
        });
        return clone;
      }
      return insertIntoTree(clone, selectedNode, newNode);
    });
    if (selectedNode) {
      const selId = selectedNode.id || selectedNode.name;
      setExpanded((prev) => ({ ...prev, [selId]: true }));
    }
    setNewItemName('');
    setCreatingType(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleCreateKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateItem();
    } else if (e.key === 'Escape') {
      setCreatingType(null);
      setNewItemName('');
    }
  };

  const handleExpandAll = () => {
    const ids = {};
    const collect = (nodes) => {
      nodes.forEach((n) => {
        const nId = n.id || n.name;
        ids[nId] = true;
        const kids = n.children || n.items || [];
        if (kids.length > 0) collect(kids);
      });
    };
    treeData.forEach((cat) => {
      ids[cat.id] = true;
      collect(cat.items || []);
    });
    setExpanded(ids);
  };

  const handleStartCreating = () => {
    setCreatingType('folder');
    setNewItemName('');
  };

  const handleCancelCreate = () => {
    setCreatingType(null);
    setNewItemName('');
  };

  const handleSwitchToTree = () => setViewMode('tree');

  const handleSwitchToGrid = () => {
    setViewMode('grid');
    setGridFolder(null);
  };

  if (!isOpen) return null;

  // ===== SEARCH RESULTS =====
  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return html`
        <div className="ct-empty">No results for "${searchQuery}"</div>
      `;
    }
    return searchResults.map((node) => {
      const selId = selectedNode ? (selectedNode.id || selectedNode.name) : null;
      const nodeId = node.id || node.name;
      const isSel = selId === nodeId;
      return html`
        <div
          key=${nodeId}
          className=${`tree-node ct-search-result${isSel ? ' selected' : ''}`}
          onClick=${() => handleSelectNode(node)}
        >
          <span className="tree-icon">${'\u{1F4C1}'}</span>
          <span className="tree-col-name">${node.title || node.name}</span>
          <span className="ct-search-path">${node.fullPath}</span>
        </div>
      `;
    });
  };

  // ===== TREE VIEW =====
  const renderTreeView = () => displayData.map((cat) => {
    const isRootSel = selectedNode
      && (selectedNode.name === cat.name || selectedNode.id === cat.id)
      && !selectedNode.title;
    const rootCls = `tree-node ct-root-cat${isRootSel ? ' selected' : ''}`;
    const rootIcon = expanded[cat.id] ? '\u{1F4C2}' : '\u{1F4C1}';
    const isFav = isFavorite(cat.id);

    const handleRootClick = () => {
      handleToggle(cat.id);
      handleSelectNode({ name: cat.name, id: cat.id, isRoot: true });
    };

    const handleStarClick = (e) => {
      e.stopPropagation();
      toggleFavorite(cat.id);
      // Blur immediately so no focus state lingers after a mouse click.
      e.currentTarget.blur();
    };

    return html`
      <div key=${cat.id} className="ct-category-group">
        <div className=${rootCls} onClick=${handleRootClick}>
          <span className="tree-arrow ${expanded[cat.id] ? 'expanded' : ''}">
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M3 2 L7 5 L3 8" fill="none"
                stroke="currentColor" stroke-width="1.5" />
            </svg>
          </span>
          <span className="tree-icon">${rootIcon}</span>
          <span className="tree-col-name ct-root-label">${cat.name}</span>
          <span className="tree-col-topics">
            ${cat.topicCount ? cat.topicCount.toLocaleString() : '—'}
          </span>
          <span className="tree-col-time">
            ${cat.lastUpdated ? formatRelativeTime(cat.lastUpdated) : '—'}
          </span>
          <span className="tree-col-star">
            <button
              type="button"
              className="ct-star-btn"
              title=${isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              aria-label=${isFav ? 'Remove from Favorites' : 'Add to Favorites'}
              onClick=${handleStarClick}
            >${isFav ? '\u2605' : '\u2606'}</button>
          </span>
        </div>
        ${expanded[cat.id] && cat.items
          && cat.items.map((item) => html`
            <${TreeNode}
              key=${item.id}
              node=${item}
              depth=${1}
              expanded=${expanded}
              selected=${selectedNode && selectedNode.id}
              onToggle=${handleToggle}
              onSelectNode=${handleSelectNode}
              onToggleFavorite=${toggleFavorite}
              isFavorite=${isFavorite}
            />
          `)}
      </div>
    `;
  });

  // ===== GRID VIEW =====

  const findNodeById = (targetId) => {
    const search = (nodes) => {
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        if (n.id === targetId) return n;
        const kids = n.children || n.items || [];
        const found = search(kids);
        if (found) return found;
      }
      return null;
    };
    for (let i = 0; i < treeData.length; i += 1) {
      if (treeData[i].id === targetId) return treeData[i];
      const found = search(treeData[i].items || []);
      if (found) return found;
    }
    return null;
  };

  const getGridItems = () => {
    if (!gridFolder) {
      return displayData.map((cat) => ({
        id: cat.id,
        title: cat.name,
        isFolder: true,
        isRoot: true,
        children: cat.items || [],
        catRef: cat,
      }));
    }
    const folder = findNodeById(gridFolder.id) || gridFolder;
    const items = folder.children || folder.items || [];
    return items.map((item) => ({
      id: item.id,
      title: item.title,
      isFolder: item.isFolder || (item.children && item.children.length > 0),
      children: item.children || [],
      nodeRef: item,
    }));
  };

  const gridNavigate = (item) => {
    if (item.isFolder) {
      setGridFolder(item.catRef || item.nodeRef || item);
    }
  };

  const gridBreadcrumbs = () => {
    const crumbs = [{ id: null, title: 'Root' }];
    if (!gridFolder) return crumbs;
    const buildCrumbs = (nodes, targetId, trail) => {
      for (let i = 0; i < nodes.length; i += 1) {
        const n = nodes[i];
        const nTitle = n.name || n.title;
        const nId = n.id;
        const nextTrail = [...trail, { id: nId, title: nTitle, ref: n }];
        if (nId === targetId) return nextTrail;
        const kids = n.children || n.items || [];
        if (kids.length > 0) {
          const found = buildCrumbs(kids, targetId, nextTrail);
          if (found) return found;
        }
      }
      return null;
    };
    const trail = buildCrumbs(treeData, gridFolder.id, []);
    if (trail) return [...crumbs, ...trail];
    return crumbs;
  };

  const handleGridClick = (item, e) => {
    const node = item.catRef || item.nodeRef || item;
    if (item.isRoot) {
      handleSelectNode({ name: item.title, id: item.id, isRoot: true });
    } else {
      handleSelectNode(node);
    }
    e.stopPropagation();
  };

  const handleGridDblClick = (item) => {
    if (item.isFolder && item.children && item.children.length > 0) {
      gridNavigate(item);
    }
  };

  const renderGridView = () => {
    const items = getGridItems();
    const crumbs = gridBreadcrumbs();

    return html`
      <div className="ct-grid-wrapper">
        <div className="ct-grid-breadcrumbs">
          ${crumbs.map((crumb, idx) => {
    const isLast = idx === crumbs.length - 1;
    return html`
              <span key=${crumb.id || 'root'}>
                ${idx > 0 ? html`<span className="ct-breadcrumb-sep">/</span>` : null}
                <button type="button"
                  className=${`ct-breadcrumb-btn${isLast ? ' current' : ''}`}
                  onClick=${() => setGridFolder(crumb.ref || null)}
                  disabled=${isLast}
                >${crumb.title}</button>
              </span>
            `;
  })}
        </div>
        ${items.length === 0
    ? html`<div className="ct-empty">This folder is empty</div>`
    : html`
          <div className="ct-grid">
            ${items.map((item) => {
    const selId = selectedNode ? (selectedNode.id || selectedNode.name) : null;
    const isSel = selId === item.id;
    const tileIsFav = isFavorite(item.id);
    const handleTileStarClick = (e) => {
      e.stopPropagation();
      toggleFavorite(item.id);
      e.currentTarget.blur();
    };
    return html`
                <div key=${item.id}
                  className=${`ct-grid-tile${isSel ? ' selected' : ''}`}
                  onClick=${(e) => handleGridClick(item, e)}
                  onDblClick=${() => handleGridDblClick(item)}>
                  <button
                    type="button"
                    className="ct-star-btn ct-tile-star"
                    title=${tileIsFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    aria-label=${tileIsFav ? 'Remove from Favorites' : 'Add to Favorites'}
                    onClick=${handleTileStarClick}
                  >${tileIsFav ? '\u2605' : '\u2606'}</button>
                  <div className="ct-tile-icon">
                    <svg viewBox="0 0 48 48" width="48" height="48">
                      <path d="M4 8h14l4 4h22a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
                        fill="#e8a838" stroke="#c4882a" stroke-width="1"/>
                      <path d="M2 16h44v24a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V16z"
                        fill="#ffc84d" />
                    </svg>
                  </div>
                  <div className="ct-tile-label">${item.title}</div>
                </div>
              `;
  })}
          </div>
        `}
      </div>
    `;
  };

  // ===== PATH BAR =====
  const renderPathBar = () => {
    const path = selectedNode ? buildPath(selectedNode) : '';
    return html`
      <div className="ct-path-bar">
        <span className="ct-path-label">Path:</span>
        <span className="ct-path-value">${path || 'None selected'}</span>
      </div>
    `;
  };

  // ===== MAIN CONTENT =====
  const renderMainContent = () => {
    if (searchResults) return renderSearchResults();
    if (viewMode === 'grid') return renderGridView();
    return renderTreeView();
  };

  // ===== SIDEBAR =====
  const renderSidebar = () => html`
    <div className="ct-sidebar">
      ${SIDEBAR_SECTIONS.map((section) => html`
        <div key=${section.key} className="ct-sb-section">
          <div className="ct-sb-label">${section.label}</div>
          ${section.items.map((item) => html`
            <button
              key=${item.key}
              type="button"
              title=${item.label}
              className=${`ct-sb-item${activeFilter === item.key ? ' active' : ''}`}
              onClick=${() => handleFilterSelect(item.key)}
            >
              <span
                className="ct-sb-icon"
                dangerouslySetInnerHTML=${{ __html: item.iconSvg }}
              />
              <span className="ct-sb-label-text">${item.label}</span>
            </button>
          `)}
        </div>
      `)}
    </div>
  `;

  return html`
    <div className="ct-overlay" ref=${overlayRef} onClick=${handleOverlayClick}>
      <div className="ct-popup">

        <div className="ct-header">
          <h2>Select Category</h2>
          <button type="button" className="ct-close"
            onClick=${onClose} aria-label="Close">
            \u00D7
          </button>
        </div>

        <div className="ct-body">
          ${renderSidebar()}

          <div className="ct-main">
            <div className="ct-search-bar">
              <svg className="ct-search-icon" width="14" height="14"
                viewBox="0 0 16 16" fill="none"
                stroke="currentColor" stroke-width="1.5">
                <circle cx="7" cy="7" r="5" />
                <line x1="11" y1="11" x2="14" y2="14" />
              </svg>
              <input
                ref=${searchRef}
                type="text"
                className="ct-search-input"
                placeholder="Search folders..."
                value=${searchQuery}
                onInput=${(e) => setSearchQuery(e.target.value)}
              />
              ${searchQuery && html`
                <button type="button" className="ct-search-clear"
                  onClick=${() => setSearchQuery('')}>
                  \u00D7
                </button>
              `}
            </div>

            <div className="ct-toolbar">
              <button type="button" className="ct-tool-btn"
                title="New Folder"
                onClick=${handleStartCreating}>
                <svg width="16" height="16" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M1 3h5l1.5 1.5H14a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" />
                  <line x1="7.5" y1="7.5" x2="7.5" y2="11.5" />
                  <line x1="5.5" y1="9.5" x2="9.5" y2="9.5" />
                </svg>
              </button>
              <button type="button" className="ct-tool-btn"
                title="Expand All"
                onClick=${handleExpandAll}>
                <svg width="16" height="16" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M4 4h8M4 8h8M4 12h8" />
                  <path d="M1 7l2 2 2-2" />
                </svg>
              </button>
              <button type="button" className="ct-tool-btn"
                title="Collapse All"
                onClick=${() => setExpanded({})}>
                <svg width="16" height="16" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M4 4h8M4 8h8M4 12h8" />
                  <path d="M1 9l2-2 2 2" />
                </svg>
              </button>
              <span className="ct-toolbar-spacer" />
              <button type="button"
                className=${`ct-tool-btn ct-view-btn${viewMode === 'tree' ? ' active' : ''}`}
                title="Tree View"
                onClick=${handleSwitchToTree}>
                <svg width="16" height="16" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" stroke-width="1.2">
                  <path d="M2 3h12M2 7h12M2 11h12" />
                  <rect x="2" y="2" width="2" height="2" rx="0.3"
                    fill="currentColor" stroke="none" />
                  <rect x="2" y="6" width="2" height="2" rx="0.3"
                    fill="currentColor" stroke="none" />
                  <rect x="2" y="10" width="2" height="2" rx="0.3"
                    fill="currentColor" stroke="none" />
                </svg>
              </button>
              <button type="button"
                className=${`ct-tool-btn ct-view-btn${viewMode === 'grid' ? ' active' : ''}`}
                title="Grid View"
                onClick=${handleSwitchToGrid}>
                <svg width="16" height="16" viewBox="0 0 16 16"
                  fill="none" stroke="currentColor" stroke-width="1.2">
                  <rect x="1" y="1" width="6" height="6" rx="1" />
                  <rect x="9" y="1" width="6" height="6" rx="1" />
                  <rect x="1" y="9" width="6" height="6" rx="1" />
                  <rect x="9" y="9" width="6" height="6" rx="1" />
                </svg>
              </button>
            </div>

            ${creatingType && html`
              <div className="ct-create-bar">
                <span className="ct-create-icon">${'\u{1F4C1}'}</span>
                <input
                  ref=${createInputRef}
                  type="text"
                  className="ct-create-input"
                  placeholder="New folder name..."
                  value=${newItemName}
                  onInput=${(e) => setNewItemName(e.target.value)}
                  onKeyDown=${handleCreateKeyDown}
                />
                <button type="button" className="ct-create-ok"
                  onClick=${handleCreateItem}
                  disabled=${!newItemName.trim()}>
                  Create
                </button>
                <button type="button" className="ct-create-cancel"
                  onClick=${handleCancelCreate}>
                  \u00D7
                </button>
              </div>
              ${selectedNode && html`
                <div className="ct-create-hint">
                  Inside: ${selectedNode.title || selectedNode.name || 'Root'}
                </div>
              `}
            `}

            ${!searchResults && viewMode === 'tree' && html`
              <div className="ct-col-headers">
                <span className="ct-col-h-name">Name</span>
                <span className="ct-col-h-topics">Topics</span>
                <span className="ct-col-h-time">Last Updated</span>
                <span className="ct-col-h-star" aria-label="Favorites" />
              </div>
            `}

            <div className="ct-tree">
              ${renderMainContent()}
            </div>

            ${renderPathBar()}
          </div>
        </div>

        ${toastVisible && html`
          <div className="ct-toast">
            Click on the create folder icon to make a sub folder inside, else your posts will be stored under the last selected subfolder.
          </div>
        `}

        <div className="ct-footer">
          <div className="ct-footer-left">
            <button type="button" className="btn btn-ghost"
              onClick=${handleStartCreating}>
              <svg width="13" height="13" viewBox="0 0 16 16"
                fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="8" y1="2" x2="8" y2="14" />
                <line x1="2" y1="8" x2="14" y2="8" />
              </svg>
              New Category
            </button>

          </div>
          <div className="ct-footer-right">
            <button type="button" className="btn btn-cancel"
              onClick=${onClose}>Cancel</button>
            <button type="button"
              className="btn btn-submit"
              onClick=${handleConfirm}
              disabled=${!selectedNode}>
              Select Category
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

// Event-bridge wrapper — translates DOM custom events ↔ Preact props
function CategoryExplorerBlock() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    document.addEventListener('category-explorer:open', handleOpen);
    return () => document.removeEventListener('category-explorer:open', handleOpen);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    document.dispatchEvent(new CustomEvent('category-explorer:close'));
  };

  const handleSelect = (path, node) => {
    document.dispatchEvent(new CustomEvent('category-explorer:select', {
      detail: { path, node },
    }));
  };

  return html`<${CategoryTreePopup}
    isOpen=${isOpen}
    onClose=${handleClose}
    onSelect=${handleSelect}
  />`;
}

export default function decorate(block) {
  render(html`<${CategoryExplorerBlock} />`, block);
}
