import { html, render } from '../../vendor/htm-preact.js';
import {
  useState, useRef, useEffect,
} from '../../vendor/preact-hooks.js';

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'eds-folder-tree';
let seedCounter = Date.now();
// eslint-disable-next-line no-plusplus
const uid = () => `n${++seedCounter}`;

const SEED_TREE = [
  {
    id: 's1',
    name: 'JavaScript',
    type: 'folder',
    topics: 1245,
    updatedAt: Date.now() - 2 * 60 * 1000,
    children: [
      {
        id: 's1a', name: 'ES6+', type: 'folder', topics: 412, updatedAt: Date.now() - 30 * 60 * 1000, children: [],
      },
      {
        id: 's1b', name: 'Async / Promises', type: 'folder', topics: 298, updatedAt: Date.now() - 2 * 3600 * 1000, children: [],
      },
    ],
  },
  {
    id: 's2',
    name: 'React',
    type: 'folder',
    topics: 892,
    updatedAt: Date.now() - 1 * 3600 * 1000,
    children: [
      {
        id: 's2a', name: 'Hooks', type: 'folder', topics: 334, updatedAt: Date.now() - 4 * 3600 * 1000, children: [],
      },
      {
        id: 's2b', name: 'State Management', type: 'folder', topics: 221, updatedAt: Date.now() - 86400 * 1000, children: [],
      },
    ],
  },
  {
    id: 's3', name: 'Node.js', type: 'folder', topics: 567, updatedAt: Date.now() - 3 * 3600 * 1000, children: [],
  },
  {
    id: 's4', name: 'CSS', type: 'folder', topics: 432, updatedAt: Date.now() - 5 * 3600 * 1000, children: [],
  },
  {
    id: 's5', name: 'Python', type: 'folder', topics: 765, updatedAt: Date.now() - 86400 * 1000, children: [],
  },
  {
    id: 's6', name: 'Java', type: 'folder', topics: 654, updatedAt: Date.now() - 2 * 86400 * 1000, children: [],
  },
  {
    id: 's7', name: 'DBMS', type: 'folder', topics: 345, updatedAt: Date.now() - 3 * 86400 * 1000, children: [],
  },
  {
    id: 's8', name: 'DevOps', type: 'folder', topics: 298, updatedAt: Date.now() - 7 * 86400 * 1000, children: [],
  },
  {
    id: 's9', name: 'AI & Machine Learning', type: 'folder', topics: 187, updatedAt: Date.now() - 14 * 86400 * 1000, children: [],
  },
  {
    id: 's10', name: 'Mobile Development', type: 'folder', topics: 523, updatedAt: Date.now() - 7 * 86400 * 1000, children: [],
  },
];

const loadTree = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return SEED_TREE;
  } catch { return SEED_TREE; }
};
const saveTree = (t) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch { /* noop */ }
};

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortNodes = (nodes) => [...nodes].sort(
  (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
);

// ── Duplicate check ───────────────────────────────────────────────────────────
const hasDuplicate = (siblings, name, excludeId = null) => siblings.some(
  (n) => n.id !== excludeId && n.name.toLowerCase() === name.trim().toLowerCase(),
);

// ── Immutable tree helpers ────────────────────────────────────────────────────
const findNode = (tree, id) => {
  let result = null;
  tree.some((n) => {
    if (n.id === id) { result = n; return true; }
    if (n.children) { result = findNode(n.children, id); return result !== null; }
    return false;
  });
  return result;
};

const deleteById = (tree, id) => tree
  .filter((n) => n.id !== id)
  .map((n) => (n.children ? { ...n, children: deleteById(n.children, id) } : n));

const renameById = (tree, id, name) => tree.map((n) => {
  if (n.id === id) return { ...n, name, updatedAt: Date.now() };
  if (n.children) return { ...n, children: renameById(n.children, id, name) };
  return n;
});

const insertInto = (tree, parentId, node) => {
  if (!parentId) return [...tree, node];
  return tree.map((n) => {
    if (n.id === parentId) return { ...n, children: [...(n.children || []), node] };
    if (n.children) return { ...n, children: insertInto(n.children, parentId, node) };
    return n;
  });
};

const isAncestor = (tree, ancestorId, nodeId) => {
  const node = findNode(tree, ancestorId);
  if (!node || !node.children) return false;
  return node.children.some(
    (c) => c.id === nodeId || isAncestor(tree, c.id, nodeId),
  );
};

const moveNode = (tree, nodeId, targetParentId) => {
  if (nodeId === targetParentId) return tree;
  if (isAncestor(tree, nodeId, targetParentId)) return tree;
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const withoutNode = deleteById(tree, nodeId);
  return insertInto(withoutNode, targetParentId, node);
};

// ── Find ancestors of a node by id ──────────────────────────────────────────
const findAncestors = (nodes, targetId, path = []) => {
  const found = nodes.reduce((acc, n) => {
    if (acc) return acc;
    if (n.id === targetId) return path;
    if (n.children) return findAncestors(n.children, targetId, [...path, n]);
    return null;
  }, null);
  return found;
};

// ── Flatten tree for search ───────────────────────────────────────────────────
const flattenTree = (nodes, ancestors = []) => {
  let results = [];
  nodes.forEach((n) => {
    if (n.type === 'folder') {
      results.push({ node: n, ancestors });
      if (n.children) {
        results = results.concat(flattenTree(n.children, [...ancestors, n]));
      }
    }
  });
  return results;
};

// ── Timestamp formatter ───────────────────────────────────────────────────────
const timeAgo = (ts) => {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

// ── Count direct child folders ───────────────────────────────────────────────
const countFolders = (node) => {
  if (!node.children) return 0;
  return node.children.filter((c) => c.type === 'folder').length;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoClose = () => html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const IcoBack = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const IcoEdit = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const IcoTrash = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const IcoSearch = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;

const IcoFolder = () => html`
  <svg viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300"/>
    <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107"/>
    <rect x="4" y="32" width="80" height="5" fill="#FFB300" opacity="0.4"/>
  </svg>`;

const IcoEmptyBox = () => html`
  <svg viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C12 30.5 16.5 26 22 26H72L90 44H158C163.5 44 168 48.5 168 54V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V36Z" fill="#FFF3E0"/>
    <path d="M12 68H168V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V68Z" fill="#FFB300" opacity="0.12"/>
    <circle cx="90" cy="86" r="22" fill="#FFE082" opacity="0.5"/>
    <path d="M82 86H98M90 78V94" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

// ── Inline name input ─────────────────────────────────────────────────────────
function NameInput({
  initial = '', placeholder, siblings = [], excludeId = null, onCommit, onCancel,
}) {
  const ref = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ref.current) { ref.current.focus(); if (initial) ref.current.select(); }
  }, []);

  const commit = () => {
    const v = ref.current?.value.trim();
    if (!v) { onCancel(); return; }
    if (hasDuplicate(siblings, v, excludeId)) {
      setError(`"${v}" already exists`);
      ref.current.focus();
      ref.current.select();
      return;
    }
    onCommit(v);
  };

  const onKD = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  const onChange = () => { if (error) setError(''); };

  return html`
    <div style="width:100%;display:flex;flex-direction:column;align-items:center;gap:3px">
      <input ref=${ref}
        class=${`fm-name-input${error ? ' fm-name-input--err' : ''}`}
        defaultValue=${initial}
        placeholder=${placeholder}
        onKeyDown=${onKD}
        onBlur=${commit}
        onChange=${onChange}
        onClick=${(e) => e.stopPropagation()}/>
      ${error && html`<span class="fm-name-err">${error}</span>`}
    </div>`;
}

// ── Right-click context menu ──────────────────────────────────────────────────
function CtxMenu({
  x, y, node, onRename, onDelete, onClose,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const menuW = 150;
  const menuH = 80;
  const left = x + menuW > window.innerWidth ? x - menuW : x;
  const top = y + menuH > window.innerHeight ? y - menuH : y;

  return html`
    <div class="fm-ctx" ref=${ref} style=${{ left: `${left}px`, top: `${top}px` }}
      onClick=${(e) => e.stopPropagation()}>
      <button type="button" class="fm-ctx-btn" onClick=${() => { onRename(node); onClose(); }}>
        <${IcoEdit}/> Rename
      </button>
      <div class="fm-ctx-divider"></div>
      <button type="button" class="fm-ctx-btn fm-ctx-btn--danger"
        onClick=${() => { onDelete(node.id); onClose(); }}>
        <${IcoTrash}/> Delete
      </button>
    </div>`;
}

// ── Search results panel ──────────────────────────────────────────────────────
function SearchResults({ results, onNavigate }) {
  if (results.length === 0) {
    return html`
      <div class="fm-search-empty">
        <${IcoSearch}/>
        <p>No folders found</p>
      </div>`;
  }

  return html`
    <div class="fm-search-results">
      ${results.map(({ node, ancestors }) => {
    const pathStr = [...ancestors.map((a) => a.name), node.name].slice(0, -1).join(' › ');
    const folders = countFolders(node);
    const ts = timeAgo(node.updatedAt);
    return html`
        <button key=${node.id} type="button"
          class="fm-search-row"
          onClick=${() => onNavigate(node, ancestors)}>
          <div class="fm-search-row-ico"><${IcoFolder}/></div>
          <div class="fm-search-row-info">
            <div class="fm-search-row-top">
              <span class="fm-search-row-name">${node.name}</span>
              ${ts && html`<span class="fm-search-row-ts">${ts}</span>`}
            </div>
            <div class="fm-search-row-meta">
              ${ancestors.length > 0 && html`<span class="fm-search-row-path">${pathStr}</span>`}
              ${folders > 0 && html`<span class="fm-search-row-folders">${folders} folder${folders !== 1 ? 's' : ''}</span>`}
            </div>
          </div>
        </button>`;
  })}
    </div>`;
}

// ── Grid panel (tiles only) ───────────────────────────────────────────────────
function GridPanel({
  nodes, isRoot, selected, renamingId, adding,
  onSelect, onOpen, onCtx, onCommitRename, onCancelRename,
  onCommitAdd, onCancelAdd, onMove, onDelete,
}) {
  const folderNodes = nodes.filter((n) => n.type === 'folder');
  const sortedNodes = sortNodes(folderNodes);
  const empty = folderNodes.length === 0 && !adding;

  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [overRoot, setOverRoot] = useState(false);

  const gridRef = useRef(null);
  const focusableIds = sortedNodes.map((n) => n.id);

  const handleGridKeyDown = (e) => {
    if (!selected) return;
    const idx = focusableIds.indexOf(selected);
    if (idx === -1) return;

    const cols = gridRef.current
      ? Math.max(1, Math.round(gridRef.current.offsetWidth / 162))
      : 1;

    switch (e.key) {
      case 'ArrowRight': {
        e.preventDefault();
        const next = focusableIds[idx + 1];
        if (next) onSelect(next);
        break;
      }
      case 'ArrowLeft': {
        e.preventDefault();
        const prev = focusableIds[idx - 1];
        if (prev) onSelect(prev);
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        const next = focusableIds[idx + cols];
        if (next) onSelect(next);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const prev = focusableIds[idx - cols];
        if (prev) onSelect(prev);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        const node = folderNodes.find((n) => n.id === selected);
        if (node) onOpen(node);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        e.preventDefault();
        onDelete(selected);
        break;
      }
      default: break;
    }
  };

  const onDragStart = (e, node) => {
    setDragId(node.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(e.currentTarget, 40, 40);
  };

  const onDragEnd = () => { setDragId(null); setOverId(null); setOverRoot(false); };

  const onDragOverFolder = (e, node) => {
    if (!dragId || dragId === node.id || node.type !== 'folder') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverId(node.id);
    setOverRoot(false);
  };

  const onDropFolder = (e, node) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragId && dragId !== node.id && node.type === 'folder') {
      onMove(dragId, node.id);
    }
    setDragId(null);
    setOverId(null);
  };

  const onDragOverPanel = (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverRoot(true);
    setOverId(null);
  };

  const onDropPanel = (e) => {
    e.preventDefault();
    if (dragId) onMove(dragId, null);
    setDragId(null);
    setOverId(null);
    setOverRoot(false);
  };

  const emptyMsg = isRoot
    ? 'Click "+ New Folder" to create your first category folder'
    : 'Use "+ New Folder" above to add a subfolder';

  const emptyTitle = isRoot ? 'No folders yet' : 'This folder is empty';

  const panelClass = `fm-panel${overRoot ? ' fm-panel--drop' : ''}`;

  return html`
    <div
      class=${panelClass}
      tabIndex="0"
      onKeyDown=${handleGridKeyDown}
      onClick=${() => onSelect(null)}
      onDragOver=${onDragOverPanel}
      onDragLeave=${() => setOverRoot(false)}
      onDrop=${onDropPanel}>

      ${empty && html`
        <div class="fm-empty">
          <${IcoEmptyBox}/>
          <p>${emptyTitle}</p>
          <span>${emptyMsg}</span>
        </div>`}

      <div class="fm-tiles-grid" ref=${gridRef}>
        ${sortedNodes.map((node) => {
    const sel = selected === node.id;
    const ren = renamingId === node.id;
    const drag = dragId === node.id;
    const over = overId === node.id;
    const fc = countFolders(node);
    const ts = timeAgo(node.updatedAt);
    const tileClass = ['fm-tile', sel ? 'fm-tile--sel' : '', drag ? 'fm-tile--drag' : '', over ? 'fm-tile--over' : '']
      .filter(Boolean).join(' ');
    const foldersLabel = fc > 0 ? `${fc} folder${fc !== 1 ? 's' : ''}` : 'No subfolders';

    return html`
            <div key=${node.id}
              class=${tileClass}
              draggable="true"
              onDragStart=${(e) => onDragStart(e, node)}
              onDragEnd=${onDragEnd}
              onDragOver=${(e) => onDragOverFolder(e, node)}
              onDragLeave=${() => { if (overId === node.id) setOverId(null); }}
              onDrop=${(e) => onDropFolder(e, node)}
              onClick=${(e) => { e.stopPropagation(); onSelect(node.id); }}
              onDblClick=${(e) => { e.stopPropagation(); onOpen(node); }}
              onContextMenu=${(e) => {
    e.preventDefault();
    e.stopPropagation();
    onCtx(e, node);
  }}>
              <div class="fm-tile-ico">
                <svg viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300"/>
                  <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107"/>
                  <rect x="4" y="32" width="80" height="5" fill="#FFB300" opacity="0.4"/>
                </svg>
              </div>
              <div class="fm-tile-body">
                ${ren
    ? html`<${NameInput}
                      initial=${node.name}
                      placeholder="Folder name"
                      siblings=${folderNodes}
                      excludeId=${node.id}
                      onCommit=${(v) => onCommitRename(node.id, v)}
                      onCancel=${onCancelRename}/>`
    : html`<span class="fm-tile-name" title=${node.name}>${node.name}</span>`}
                <div class="fm-tile-meta">
                  <span class="fm-tile-folders">${foldersLabel}</span>
                  ${ts && html`<span class="fm-tile-ts">${ts}</span>`}
                </div>
              </div>
            </div>`;
  })}

        ${adding && html`
          <div class="fm-tile fm-tile--new">
            <div class="fm-tile-ico">
              <svg viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300" opacity="0.4"/>
                <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107" opacity="0.4"/>
              </svg>
            </div>
            <div class="fm-tile-body">
              <${NameInput}
                placeholder="Folder name"
                siblings=${folderNodes}
                onCommit=${onCommitAdd}
                onCancel=${onCancelAdd}/>
            </div>
          </div>`}
      </div>
    </div>`;
}

// ── Folder modal ──────────────────────────────────────────────────────────────
function FolderModal({ onClose, onSelect }) {
  const [tree, setTree] = useState(loadTree);
  const [stack, setStack] = useState([]);
  const [selected, setSelected] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [adding, setAdding] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [visible, setVisible] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const persist = (t) => { setTree(t); saveTree(t); };
  const doClose = () => { setVisible(false); setTimeout(onClose, 200); };

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape' && !renamingId && !adding) doClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [renamingId, adding]);

  const isSearching = searchQ.trim().length > 0;

  // Clear selection whenever search mode activates
  useEffect(() => { if (isSearching) setSelected(null); }, [isSearching]);

  const isRoot = stack.length === 0;
  const parentId = stack.length ? stack[stack.length - 1] : null;
  const parentNode = parentId ? findNode(tree, parentId) : null;
  const nodes = parentNode ? (parentNode.children || []) : tree;
  const crumbs = stack.map((id) => findNode(tree, id)).filter(Boolean);

  // ── Derived ─────────────────────────────────────────────────────────────────
  // Must be defined before startAdd so they are not used before definition
  const selectedNode = selected ? findNode(tree, selected) : null;
  const selectedChildCount = selectedNode
    ? (selectedNode.children || []).filter((c) => c.type === 'folder').length
    : 0;

  const reset = () => { setSelected(null); setAdding(null); setRenamingId(null); };
  const goRoot = () => { setStack([]); reset(); setSearchQ(''); };
  const goCrumb = (i) => { setStack(stack.slice(0, i + 1)); reset(); setSearchQ(''); };
  const goBack = () => { setStack(stack.slice(0, -1)); reset(); setSearchQ(''); };

  const goInto = (node) => {
    const ancestors = findAncestors(tree, node.id) || [];
    const fullStack = [...ancestors.map((a) => a.id), node.id];
    setStack(fullStack);
    reset();
    setSearchQ('');
  };

  const addTargetParentId = useRef(null);
  const startAdd = () => {
    if (selected && selectedNode && selectedChildCount === 0) {
      // Leaf folder selected: create inside it and navigate in
      addTargetParentId.current = selectedNode.id;
      const ancestors = findAncestors(tree, selectedNode.id) || [];
      const fullStack = [...ancestors.map((a) => a.id), selectedNode.id];
      setStack(fullStack);
      setSearchQ('');
    } else {
      addTargetParentId.current = parentId;
    }
    setAdding({ type: 'folder' });
    setRenamingId(null);
    setSelected(null);
  };
  const commitAdd = (name) => {
    const newNode = {
      id: uid(), name, type: 'folder', children: [], updatedAt: Date.now(),
    };
    persist(insertInto(tree, addTargetParentId.current, newNode));
    addTargetParentId.current = null;
    setAdding(null);
  };

  const startRename = (node) => { setRenamingId(node.id); setAdding(null); setCtx(null); };
  const commitRename = (id, name) => { persist(renameById(tree, id, name)); setRenamingId(null); };

  const doDelete = (id) => {
    if (selected === id) setSelected(null);
    if (stack.includes(id)) setStack(stack.slice(0, stack.indexOf(id)));
    persist(deleteById(tree, id));
    setCtx(null);
  };

  const doMove = (nodeId, targetId) => {
    const realTarget = targetId === null ? parentId : targetId;
    const node = findNode(tree, nodeId);
    if (!node) return;
    const destParentNode = realTarget ? findNode(tree, realTarget) : null;
    const destSiblings = destParentNode ? (destParentNode.children || []) : tree;
    if (hasDuplicate(destSiblings, node.name, nodeId)) return;
    const newTree = moveNode(tree, nodeId, realTarget);
    if (newTree !== tree) persist(newTree);
  };

  const doOk = () => {
    const node = selected ? findNode(tree, selected) : null;
    if (node) {
      const ancestors = findAncestors(tree, selected) || [];
      const pathParts = [...ancestors.map((a) => a.name), node.name];
      const path = pathParts.join(' > ');
      if (onSelect) onSelect(node.name, path);
    } else if (stack.length > 0) {
      const currentId = stack[stack.length - 1];
      const currentNode = findNode(tree, currentId);
      if (onSelect && currentNode) {
        const ancestors = findAncestors(tree, currentId) || [];
        const pathParts = [...ancestors.map((a) => a.name), currentNode.name];
        const path = pathParts.join(' > ');
        onSelect(currentNode.name, path);
      }
    } else if (onSelect) {
      onSelect(null, null);
    }
    doClose();
  };

  // ── Search logic ────────────────────────────────────────────────────────────
  const allFolders = flattenTree(tree);
  const searchQ2 = searchQ.trim().toLowerCase();

  const searchResults = isSearching
    ? allFolders.filter(({ node }) => node.name.toLowerCase().includes(searchQ2))
    : [];

  const navigateToResult = (node, ancestors) => {
    const fullStack = [...ancestors.map((a) => a.id)];
    setStack(fullStack);
    setSelected(null);
    setSearchQ('');
    setAdding(null);
    setRenamingId(null);
  };

  // ── Breadcrumb ──────────────────────────────────────────────────────────────
  const allSelectedAncestors = (selected && selectedNode)
    ? findAncestors(tree, selected) || []
    : [];
  const extraAncestors = allSelectedAncestors.slice(stack.length);
  const showSelectedCrumb = !isSearching && selected && selectedNode;

  const clearSearch = () => { setSearchQ(''); setSelected(null); };

  return html`
    <div class=${`fm-overlay ${visible ? 'fm-overlay--in' : ''}`}
      onClick=${(e) => { if (e.target === e.currentTarget) doClose(); }}>

      <div class="fm-modal" onClick=${() => { setSelected(null); setCtx(null); }}>

        <!-- HEADER -->
        <div class="fm-header">
          <div class="fm-nav">
            ${!isRoot && !isSearching && html`
              <button type="button" class="fm-back" onClick=${goBack}><${IcoBack}/></button>`}
            <div class="fm-breadcrumb">
              <button type="button"
                class=${`fm-crumb ${isRoot && !isSearching && !showSelectedCrumb ? 'fm-crumb--cur' : ''}`}
                onClick=${goRoot}>Categories</button>

              ${!isSearching && crumbs.map((c, i) => html`
                <span key=${`s${c.id}`} class="fm-sep">›</span>
                <button key=${c.id} type="button"
                  class=${`fm-crumb ${i === crumbs.length - 1 && !showSelectedCrumb ? 'fm-crumb--cur' : ''}`}
                  onClick=${() => goCrumb(i)}>${c.name}</button>`)}

              ${!isSearching && extraAncestors.map((a) => html`
                <span key=${`sa${a.id}`} class="fm-sep">›</span>
                <span key=${`an${a.id}`} class="fm-crumb">${a.name}</span>`)}

              ${showSelectedCrumb && html`
                <span class="fm-sep">›</span>
                <span class="fm-crumb fm-crumb--cur">${selectedNode.name}</span>`}

              ${isSearching && html`
                <span class="fm-sep">›</span>
                <span class="fm-crumb fm-crumb--cur fm-crumb--search">Search results</span>`}
            </div>
          </div>

          <div class="fm-actions">
            <button type="button" class="fm-btn" onClick=${startAdd}>
              + New Folder
            </button>
          </div>

          <button type="button" class="fm-close" onClick=${doClose}><${IcoClose}/></button>
        </div>

        <!-- SEARCH BAR -->
        <div class="fm-search-bar">
          <span class="fm-search-ico"><${IcoSearch}/></span>
          <input
            type="text"
            class="fm-search-input"
            placeholder="Search folders…"
            value=${searchQ}
            onInput=${(e) => setSearchQ(e.target.value)}
            onClick=${(e) => e.stopPropagation()}/>
          ${isSearching && html`
            <button type="button" class="fm-search-clear" onClick=${clearSearch}>
              <${IcoClose}/>
            </button>`}
        </div>

        <!-- BODY -->
        <div class="fm-body" onClick=${(e) => e.stopPropagation()}>
          ${isSearching
    ? html`<${SearchResults} results=${searchResults} onNavigate=${navigateToResult}/>`
    : html`<${GridPanel}
              nodes=${nodes} isRoot=${isRoot}
              selected=${selected} renamingId=${renamingId} adding=${adding}
              onSelect=${(id) => setSelected((p) => (p === id ? null : id))}
              onOpen=${goInto}
              onCtx=${(e, node) => setCtx({ x: e.clientX, y: e.clientY, node })}
              onCommitRename=${commitRename}
              onCancelRename=${() => setRenamingId(null)}
              onCommitAdd=${commitAdd}
              onCancelAdd=${() => setAdding(null)}
              onMove=${doMove}
              onDelete=${doDelete}/>`}
        </div>

        <!-- FOOTER -->
        <div class="fm-footer">
          <button type="button" class="fm-foot-btn fm-foot-btn--cancel" onClick=${doClose}>
            Cancel
          </button>
          <button type="button" class="fm-foot-btn fm-foot-btn--ok" onClick=${doOk}
            disabled=${!selected}
            style=${{ opacity: selected ? 1 : 0.45, cursor: selected ? 'pointer' : 'not-allowed' }}>
            Select
          </button>
        </div>
      </div>

      ${ctx && html`
        <${CtxMenu} x=${ctx.x} y=${ctx.y} node=${ctx.node}
          onRename=${startRename} onDelete=${doDelete}
          onClose=${() => setCtx(null)}/>`}
    </div>`;
}

// ── App + EDS entry ───────────────────────────────────────────────────────────
function FolderApp() {
  const [open, setOpen] = useState(true);
  const doClose = () => { setOpen(false); window.history.back(); };

  const doSelect = (name, path) => {
    if (name) {
      localStorage.setItem('folder:pending-selection', JSON.stringify({
        name,
        path: path || name,
        ts: Date.now(),
      }));
    }
    setOpen(false);
    window.history.back();
  };

  if (!open) return null;
  return html`<${FolderModal} onClose=${doClose} onSelect=${doSelect}/>`;
}

export default function decorate() {
  const mount = document.createElement('div');
  mount.id = 'folder-root';
  document.body.appendChild(mount);
  render(html`<${FolderApp}/>`, mount);
}
