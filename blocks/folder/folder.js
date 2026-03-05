/* eslint-disable no-underscore-dangle, max-len */
import { html, render } from '../../vendor/htm-preact.js';
import {
  useState, useRef, useEffect, useCallback,
} from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

// ── Helpers ───────────────────────────────────────────────────────────────────

const timeAgo = (ts) => {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
};

const countFolders = (node) => (node.children || []).filter((c) => c.isFolder).length;

/**
 * toFolderNode — ONLY keeps isFolder:true nodes.
 * Files (isFolder:false) are sidebar items linked to posts and
 * must NOT appear in the folder picker.
 */
const toFolderNode = (item) => {
  if (!item.isFolder) return null; // skip files
  return {
    id: String(item._id || item.id),
    name: item.title || item.name,
    type: 'folder',
    isFolder: true,
    createdBy: item.createdBy ? String(item.createdBy) : null,
    updatedAt: item.updatedAt || item.createdAt || null,
    // recurse — only keeping folder children
    children: (item.children || []).map(toFolderNode).filter(Boolean),
  };
};

/**
 * buildFolderTree — categories become root-level folder nodes;
 * their items are filtered to folders only.
 */
const buildFolderTree = (categories) => categories.map((cat) => ({
  id: cat.id,
  name: cat.name,
  type: 'folder',
  isFolder: true,
  isCategoryRoot: true,
  createdBy: cat.createdBy ? String(cat.createdBy) : null,
  updatedAt: null,
  children: (cat.items || []).map(toFolderNode).filter(Boolean),
}));

const findNode = (tree, id) => {
  let result = null;
  tree.some((n) => {
    if (n.id === id) { result = n; return true; }
    if (n.children) { result = findNode(n.children, id); return result !== null; }
    return false;
  });
  return result;
};

const findAncestors = (nodes, targetId, path = []) => nodes.reduce((acc, n) => {
  if (acc) return acc;
  if (n.id === targetId) return path;
  if (n.children) return findAncestors(n.children, targetId, [...path, n]);
  return null;
}, null);

const flattenTree = (nodes, ancestors = []) => {
  let results = [];
  nodes.forEach((n) => {
    results.push({ node: n, ancestors });
    if (n.children) results = results.concat(flattenTree(n.children, [...ancestors, n]));
  });
  return results;
};

const sortNodes = (nodes) => [...nodes].sort(
  (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
);

// ── Ownership helper ──────────────────────────────────────────────────────────

function isOwner(node, currentUser) {
  if (!currentUser) return false;
  if (!node.createdBy) return false;
  return node.createdBy === String(currentUser._id || '');
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const IcoClose = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const IcoBack = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const IcoSearch = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const IcoPlus = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const IcoDots = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
const IcoEdit = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const IcoTrash = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const IcoFolderPlus = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`;
const IcoWarn = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
const IcoEmptyBox = () => html`
  <svg viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C12 30.5 16.5 26 22 26H72L90 44H158C163.5 44 168 48.5 168 54V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V36Z" fill="#FFF3E0"/>
    <path d="M12 68H168V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V68Z" fill="#FFB300" opacity="0.12"/>
    <circle cx="90" cy="86" r="22" fill="#FFE082" opacity="0.5"/>
    <path d="M82 86H98M90 78V94" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

// Folder SVG tile icon
const FolderSvg = ({ dim = false }) => html`
  <svg viewBox="0 0 88 72" fill="none" style="width:100%;height:100%">
    <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z"
      fill=${dim ? '#FFB300' : '#FFB300'} opacity=${dim ? 0.35 : 1}/>
    <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z"
      fill=${dim ? '#FFC107' : '#FFC107'} opacity=${dim ? 0.35 : 1}/>
    ${!dim && html`<rect x="4" y="32" width="80" height="5" fill="#FFB300" opacity="0.4"/>`}
  </svg>`;

// ── SpectrumAlertDialog — reused from Sidebar pattern ────────────────────────

function SpectrumAlertDialog({
  isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}) {
  if (!isOpen) return null;
  return html`
    <div class="sp-alert-backdrop" onClick=${(e) => { if (e.target === e.currentTarget) onCancel(); }} role="presentation">
      <div class="sp-alert-dialog" role="alertdialog" aria-modal="true"
        aria-labelledby="sp-alert-title" aria-describedby="sp-alert-msg">
        <div class="sp-alert-header">
          <span class="sp-alert-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    </div>`;
}

// ── NameInput — inline rename/create ─────────────────────────────────────────

function NameInput({
  initial = '', placeholder, onCommit, onCancel,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) { ref.current.focus(); if (initial) ref.current.select(); }
  }, []);
  const commit = () => {
    const v = ref.current?.value.trim();
    if (v) onCommit(v);
    else onCancel();
  };
  const onKD = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };
  return html`<input ref=${ref} class="fm-name-input" defaultValue=${initial}
    placeholder=${placeholder} onKeyDown=${onKD} onBlur=${commit}
    onClick=${(e) => e.stopPropagation()}/>`;
}

// ── CtxMenu — right-click / dots menu ────────────────────────────────────────
// Delete is only shown to the folder's owner (matches Sidebar isOwner rule)

function CtxMenu({
  x, y, node, currentUser, onRename, onDelete, onAddSub, onClose,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const menuW = 170;
  const canDelete = isOwner(node, currentUser);
  const menuH = (node.isCategoryRoot ? 1 : 2) * 40 + (canDelete ? 50 : 10);
  const left = x + menuW > window.innerWidth ? x - menuW : x;
  const top = y + menuH > window.innerHeight ? y - menuH : y;

  return html`
    <div class="fm-ctx" ref=${ref} style=${{ left: `${left}px`, top: `${top}px` }}
      onClick=${(e) => e.stopPropagation()}>
      <button type="button" class="fm-ctx-btn"
        onClick=${() => { onAddSub(node); onClose(); }}>
        <${IcoFolderPlus}/> Add Subfolder
      </button>
      ${!node.isCategoryRoot && html`
        <button type="button" class="fm-ctx-btn"
          onClick=${() => { onRename(node); onClose(); }}>
          <${IcoEdit}/> Rename
        </button>`}
      ${canDelete && html`
        <div class="fm-ctx-divider"></div>
        <button type="button" class="fm-ctx-btn fm-ctx-btn--danger"
          onClick=${() => { onDelete(node); onClose(); }}>
          <${IcoTrash}/> Delete
        </button>`}
    </div>`;
}

// ── SearchResults ─────────────────────────────────────────────────────────────

function SearchResults({ results, onNavigate }) {
  if (results.length === 0) {
    return html`<div class="fm-search-empty"><${IcoSearch}/><p>No folders found</p></div>`;
  }
  return html`
    <div class="fm-search-results">
      ${results.map(({ node, ancestors }) => {
    const pathStr = ancestors.map((a) => a.name).join(' › ');
    const folders = countFolders(node);
    const ts = timeAgo(node.updatedAt);
    return html`
        <button key=${node.id} type="button" class="fm-search-row"
          onClick=${() => onNavigate(node, ancestors)}>
          <div class="fm-search-row-ico">
            <${FolderSvg}/>
          </div>
          <div class="fm-search-row-info">
            <div class="fm-search-row-top">
              <span class="fm-search-row-name">${node.name}</span>
              ${ts && html`<span class="fm-search-row-ts">${ts}</span>`}
            </div>
            <div class="fm-search-row-meta">
              ${pathStr
    ? html`<span class="fm-search-row-path">
                    ${ancestors.map((a, i) => html`
                      <span key=${a.id} class="fm-srp-crumb">${a.name}</span>
                      ${i < ancestors.length - 1 ? html`<span class="fm-srp-sep"> › </span>` : ''}
                    `)}
                    ${ancestors.length > 0 ? html`<span class="fm-srp-sep"> › </span>` : ''}
                    <span class="fm-srp-crumb fm-srp-cur">${node.name}</span>
                  </span>`
    : ''}
              ${folders > 0 && html`<span class="fm-search-row-folders">${folders} subfolder${folders !== 1 ? 's' : ''}</span>`}
            </div>
          </div>
        </button>`;
  })}
    </div>`;
}

// ── GridPanel — tile grid of folders only ────────────────────────────────────

function GridPanel({
  nodes, isRoot, selected, adding, renamingId,
  onSelect, onOpen, onCtx, onCommitAdd, onCancelAdd, onCommitRename, onCancelRename,
}) {
  // Only render folder-type nodes — never files
  const sortedNodes = sortNodes(nodes.filter((n) => n.type === 'folder'));
  const empty = sortedNodes.length === 0 && !adding;

  return html`
    <div class="fm-panel" onClick=${() => onSelect(null)}>
      ${empty && html`
        <div class="fm-empty">
          <${IcoEmptyBox}/>
          <p>${isRoot ? 'No folders yet' : 'Empty folder'}</p>
          <span>${isRoot ? 'Click "+ Add Folder" to get started.' : 'Use "+ Add Folder" above to add a subfolder.'}</span>
        </div>`}
      <div class="fm-tiles-grid">
        ${sortedNodes.map((node) => {
    const sel = selected === node.id;
    const ren = renamingId === node.id;
    const fc = countFolders(node);
    const ts = timeAgo(node.updatedAt);
    return html`
          <div key=${node.id} class=${`fm-tile${sel ? ' fm-tile--sel' : ''}`}
            onClick=${(e) => { e.stopPropagation(); onSelect(node.id); }}
            onDblClick=${(e) => { e.stopPropagation(); onOpen(node); }}
            onContextMenu=${(e) => { e.preventDefault(); e.stopPropagation(); onCtx(e, node); }}>
            <div class="fm-tile-ico"><${FolderSvg}/></div>
            <div class="fm-tile-body">
              ${ren
    ? html`<${NameInput} initial=${node.name} placeholder="Folder name"
                    onCommit=${(v) => onCommitRename(node, v)} onCancel=${onCancelRename}/>`
    : html`<span class="fm-tile-name" title=${node.name}>${node.name}</span>`}
              <div class="fm-tile-meta">
                <span class="fm-tile-folders">${fc > 0 ? `${fc} subfolder${fc !== 1 ? 's' : ''}` : 'No subfolders'}</span>
                ${ts && html`<span class="fm-tile-ts">${ts}</span>`}
              </div>
            </div>
            <button type="button" class="fm-tile-dots"
              onClick=${(e) => { e.stopPropagation(); onCtx(e, node); }}
              title="More options"><${IcoDots}/></button>
          </div>`;
  })}
        ${adding && html`
          <div class="fm-tile fm-tile--new">
            <div class="fm-tile-ico"><${FolderSvg} dim=${true}/></div>
            <div class="fm-tile-body">
              <${NameInput} placeholder="Folder name" onCommit=${onCommitAdd} onCancel=${onCancelAdd}/>
            </div>
          </div>`}
      </div>
    </div>`;
}

// ── FolderModal ───────────────────────────────────────────────────────────────

function FolderModal({ isOpen, onClose, onSelect }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stack, setStack] = useState([]);
  const [selected, setSelected] = useState(null);
  const [visible, setVisible] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [folderError, setFolderError] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  // Current user — fetched once from session (same as sidebar)
  const [currentUser, setCurrentUser] = useState(null);

  // ── Fetch current user from session (mirrors sidebar.js fetchCurrentUser) ──
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setCurrentUser(d?.user || null))
      .catch(() => setCurrentUser(null));
  }, []);

  // ── Fetch sidebar data — same endpoint as sidebar.js ─────────────────────
  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/sidebar/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.categories) {
        setTree(buildFolderTree(data.categories));
      } else {
        throw new Error(data.error || 'Failed to load');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open/close effects
  useEffect(() => {
    if (isOpen) {
      fetchFolders();
      setStack([]); setSelected(null); setSearchQ('');
      setAdding(false); setRenamingId(null); setCtx(null); setFolderError(null);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen, fetchFolders]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const esc = (e) => { if (e.key === 'Escape' && !renamingId && !adding && !deleteDialog) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [isOpen, renamingId, adding, deleteDialog, onClose]);

  // Stay in sync when sidebar refreshes
  useEffect(() => {
    window.addEventListener('refresh-sidebar', fetchFolders);
    return () => window.removeEventListener('refresh-sidebar', fetchFolders);
  }, [fetchFolders]);

  if (!isOpen && !visible) return null;

  // ── Derived state ──────────────────────────────────────────────────────────
  const isSearching = searchQ.trim().length > 0;
  const isRoot = stack.length === 0;
  const parentNode = stack.length ? findNode(tree, stack[stack.length - 1]) : null;
  const nodes = parentNode ? (parentNode.children || []) : tree;
  const crumbs = stack.map((id) => findNode(tree, id)).filter(Boolean);
  const selectedNode = selected ? findNode(tree, selected) : null;
  const showSelectedCrumb = !isSearching && selected && selectedNode;
  const searchResults = isSearching
    ? flattenTree(tree).filter(({ node }) => node.name.toLowerCase().includes(searchQ.trim().toLowerCase()))
    : [];

  // ── Navigation ─────────────────────────────────────────────────────────────
  const nav = (newStack) => {
    setStack(newStack); setSelected(null);
    setSearchQ(''); setAdding(false); setRenamingId(null);
  };
  const goRoot = () => nav([]);
  const goCrumb = (i) => nav(stack.slice(0, i + 1));
  const goBack = () => nav(stack.slice(0, -1));
  const goInto = (node) => {
    const ancestors = findAncestors(tree, node.id) || [];
    nav([...ancestors.map((a) => a.id), node.id]);
  };

  // ── Add subfolder ─────────────────────────────────────────────────────────
  const handleCommitAdd = async (name) => {
    setAdding(false);
    setFolderError(null);
    try {
      let res;
      if (stack.length === 0) {
        // Root level → create a new category (same as Sidebar "+ Category")
        res = await fetch(`${API_BASE}/sidebar/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        });
      } else {
        // Inside a category/folder → create a folder item (isFolder:true, no postId)
        const rootNode = findNode(tree, stack[0]);
        const category = rootNode ? rootNode.name : name;
        const currentNode = findNode(tree, stack[stack.length - 1]);
        const mongoParentId = (currentNode && !currentNode.isCategoryRoot) ? currentNode.id : null;
        res = await fetch(`${API_BASE}/sidebar-items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: name, category, parentId: mongoParentId, isFolder: true,
          }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFolderError(res.status === 409
          ? `A folder named "${name}" already exists here.`
          : (data.error || 'Failed to create folder.'));
        return;
      }
      await fetchFolders();
      // Keep sidebar in sync
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add folder failed:', err);
    }
  };

  // ── Rename — uses same PATCH /sidebar-items/:id as sidebar.js ─────────────
  const handleCommitRename = async (node, name) => {
    setRenamingId(null);
    if (node.isCategoryRoot) return; // category root rename not supported
    try {
      const res = await fetch(`${API_BASE}/sidebar-items/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFolderError(data.error || 'Rename failed.');
        return;
      }
      await fetchFolders();
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Rename failed:', err);
    }
  };

  // ── Delete — only owner can delete (Spectrum alert dialog, no window.confirm) ──
  const handleDeleteRequest = (node) => {
    if (!isOwner(node, currentUser)) return; // safety guard
    setDeleteDialog(node);
    setCtx(null);
  };

  const handleDeleteConfirm = async () => {
    const node = deleteDialog;
    setDeleteDialog(null);
    if (!node) return;
    try {
      const url = node.isCategoryRoot
        ? `${API_BASE}/sidebar/categories/${node.id}`
        : `${API_BASE}/sidebar-items/${node.id}`;
      const res = await fetch(url, { method: 'DELETE', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFolderError(data.error || 'Delete failed.');
        return;
      }
      if (selected === node.id) setSelected(null);
      if (stack.includes(node.id)) setStack(stack.slice(0, stack.indexOf(node.id)));
      await fetchFolders();
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete failed:', err);
    }
  };

  // goInto resets adding, so defer
  const handleAddSub = (node) => { goInto(node); setTimeout(() => setAdding(true), 0); };

  // ── Select / OK ─────────────────────────────────────────────────────────────
  const doOk = () => {
    const node = selectedNode;
    if (node) {
      const ancestors = findAncestors(tree, selected) || [];
      const path = [...ancestors.map((a) => a.name), node.name].join(' > ');
      const folderId = node.isCategoryRoot ? null : node.id;
      onSelect(node.name, path, folderId);
    } else if (stack.length > 0) {
      const currentId = stack[stack.length - 1];
      const currentNode = findNode(tree, currentId);
      if (currentNode) {
        const ancestors = findAncestors(tree, currentId) || [];
        const path = [...ancestors.map((a) => a.name), currentNode.name].join(' > ');
        const folderId = currentNode.isCategoryRoot ? null : currentNode.id;
        onSelect(currentNode.name, path, folderId);
      }
    }
    onClose();
  };

  const canSelect = !!(selected || stack.length > 0);

  return html`
    <div class=${`fm-overlay${visible && isOpen ? ' fm-overlay--in' : ''}`}
      onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="fm-modal" onClick=${() => { setSelected(null); setCtx(null); }}>

        <!-- Header -->
        <div class="fm-header">
          <div class="fm-nav">
            ${!isRoot && !isSearching && html`
              <button type="button" class="fm-back" onClick=${goBack}><${IcoBack}/></button>`}
            <div class="fm-breadcrumb">
              <button type="button"
                class=${`fm-crumb${isRoot && !showSelectedCrumb && !isSearching ? ' fm-crumb--cur' : ''}`}
                onClick=${goRoot}>Folders</button>
              ${!isSearching && crumbs.map((c, i) => html`
                <span key=${`s${c.id}`} class="fm-sep">›</span>
                <button key=${c.id} type="button"
                  class=${`fm-crumb${i === crumbs.length - 1 && !showSelectedCrumb ? ' fm-crumb--cur' : ''}`}
                  onClick=${() => goCrumb(i)}>${c.name}</button>`)}
              ${showSelectedCrumb && html`
                <span class="fm-sep">›</span>
                <span class="fm-crumb fm-crumb--cur">${selectedNode.name}</span>`}
              ${isSearching && html`
                <span class="fm-sep">›</span>
                <span class="fm-crumb fm-crumb--cur fm-crumb--search">Search results</span>`}
            </div>
          </div>
          <div class="fm-actions">
            <button type="button" class="fm-btn"
              onClick=${() => { setAdding(true); setRenamingId(null); setSearchQ(''); }}>
              <${IcoPlus}/> Add Folder
            </button>
          </div>
          <button type="button" class="fm-close" onClick=${onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Search bar -->
        <div class="fm-search-bar">
          <span class="fm-search-ico"><${IcoSearch}/></span>
          <input type="text" class="fm-search-input" placeholder="Search folders…"
            value=${searchQ} onInput=${(e) => setSearchQ(e.target.value)}
            onClick=${(e) => e.stopPropagation()}/>
          ${isSearching && html`
            <button type="button" class="fm-search-clear" onClick=${() => setSearchQ('')}>
              <${IcoClose}/>
            </button>`}
        </div>

        <!-- Body -->
        <div class="fm-body" onClick=${(e) => e.stopPropagation()}>
          ${folderError && html`
            <div class="fm-folder-error" onClick=${() => setFolderError(null)}>
              <${IcoWarn}/>
              ${folderError}
              <button type="button" class="fm-folder-error-close"><${IcoClose}/></button>
            </div>`}

          ${loading && html`
            <div class="fm-loading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFB300" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span>Loading folders…</span>
            </div>`}

          ${!loading && error && html`
            <div class="fm-error">
              <p>Failed to load: ${error}</p>
              <button type="button" class="fm-btn" onClick=${fetchFolders}>Retry</button>
            </div>`}

          ${!loading && !error && (isSearching
    ? html`<${SearchResults} results=${searchResults}
              onNavigate=${(node, ancestors) => {
      setStack(ancestors.map((a) => a.id));
      setSelected(null);
      setSearchQ('');
    }}/>`
    : html`<${GridPanel}
              nodes=${nodes}
              isRoot=${isRoot}
              selected=${selected}
              adding=${adding}
              renamingId=${renamingId}
              currentUser=${currentUser}
              onSelect=${(id) => setSelected((p) => (p === id ? null : id))}
              onOpen=${goInto}
              onCtx=${(e, node) => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, node }); }}
              onCommitAdd=${handleCommitAdd}
              onCancelAdd=${() => setAdding(false)}
              onCommitRename=${handleCommitRename}
              onCancelRename=${() => setRenamingId(null)}/>`)}
        </div>

        <!-- Footer -->
        <div class="fm-footer">
          <button type="button" class="fm-foot-btn fm-foot-btn--cancel" onClick=${onClose}>Cancel</button>
          <button type="button" class="fm-foot-btn fm-foot-btn--ok" onClick=${doOk}
            disabled=${!canSelect}
            style=${{ opacity: canSelect ? 1 : 0.45, cursor: canSelect ? 'pointer' : 'not-allowed' }}>
            Select
          </button>
        </div>
      </div>

      <!-- Context menu -->
      ${ctx && html`
        <${CtxMenu}
          x=${ctx.x} y=${ctx.y}
          node=${ctx.node}
          currentUser=${currentUser}
          onRename=${(node) => { setRenamingId(node.id); setCtx(null); }}
          onDelete=${handleDeleteRequest}
          onAddSub=${handleAddSub}
          onClose=${() => setCtx(null)}/>`}

      <!-- Spectrum delete dialog (replaces window.confirm) -->
      <${SpectrumAlertDialog}
        isOpen=${!!deleteDialog}
        title="Delete Folder"
        message=${deleteDialog ? `Delete "${deleteDialog.name}"? All subfolders inside will also be removed.` : ''}
        confirmLabel="Delete"
        onConfirm=${handleDeleteConfirm}
        onCancel=${() => setDeleteDialog(null)}/>
    </div>`;
}

// ── FolderApp ─────────────────────────────────────────────────────────────────

function FolderApp() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setIsOpen(true);
    window.addEventListener('folder:open', onOpen);
    return () => window.removeEventListener('folder:open', onOpen);
  }, []);
  const handleSelect = (name, path, folderId = null) => {
    localStorage.setItem('folder:pending-selection', JSON.stringify({
      name, path: path || name, folderId, ts: Date.now(),
    }));
    window.dispatchEvent(new CustomEvent('folder:selected', { detail: { name, path: path || name, folderId } }));
    setIsOpen(false);
  };
  return html`<${FolderModal} isOpen=${isOpen} onClose=${() => setIsOpen(false)} onSelect=${handleSelect}/>`;
}

export default function decorate() {
  let mount = document.getElementById('folder-root');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'folder-root';
    document.body.appendChild(mount);
  }
  render(html`<${FolderApp}/>`, mount);
}
