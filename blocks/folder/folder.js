import { html, render } from '../../vendor/htm-preact.js';
import {
  useState, useRef, useEffect, useCallback, useMemo,
} from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

const MAX_DEPTH = 10; // max folder nesting depth (breadcrumb levels, root = level 1)

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// REQ 3+4: Files (isFolder===false) are kept in the tree for ownership checks but
// marked with type:'file' so GridPanel still renders ONLY folders.
// createdBy is preserved as a plain string for ownership checks (req 6).
const toFolderNode = (item) => {
  // eslint-disable-next-line no-underscore-dangle
  const isFile = item.isFolder === false;
  const children = isFile ? [] : (item.children || []).map(toFolderNode).filter(Boolean);
  return {
    // eslint-disable-next-line no-underscore-dangle
    id: String(item._id || item.id),
    name: item.title || item.name,
    type: isFile ? 'file' : 'folder',
    isFolder: !isFile,
    updatedAt: item.createdAt || item.updatedAt || null,
    // eslint-disable-next-line no-underscore-dangle
    createdBy: item.createdBy ? String(item.createdBy._id || item.createdBy) : null,
    children,
  };
};

// REQ 2: Build folder tree from sidebar categories (same data source as sidebar).
const buildFolderTree = (categories) => categories.map((cat) => ({
  id: cat.id,
  name: cat.name,
  type: 'folder',
  isFolder: true,
  isCategoryRoot: true,
  updatedAt: null,
  createdBy: cat.createdBy ? String(cat.createdBy) : null,
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
  (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }),
);

// REQ 6: ownership check — mirrors sidebar's isOwner()
const isOwner = (node, currentUser) => {
  if (!currentUser) return false;
  if (!node.createdBy) return false;
  // eslint-disable-next-line no-underscore-dangle
  return node.createdBy === String(currentUser._id || currentUser.id);
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoClose = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const IcoBack = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const IcoSearch = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
const IcoPlus = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
const IcoDots = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>`;
const IcoEdit = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const IcoTrash = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;
const IcoFolderPlus = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`;
const IcoEmptyBox = () => html`
  <svg viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C12 30.5 16.5 26 22 26H72L90 44H158C163.5 44 168 48.5 168 54V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V36Z" fill="#FFF3E0"/>
    <path d="M12 68H168V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V68Z" fill="#FFB300" opacity="0.12"/>
    <circle cx="90" cy="86" r="22" fill="#FFE082" opacity="0.5"/>
    <path d="M82 86H98M90 78V94" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

// ─── Spectrum Alert Dialog (mirrors sidebar's SpectrumAlertDialog) ─────────────

function SpectrumAlertDialog({
  isOpen, title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}) {
  if (!isOpen) return null;
  return html`
    <div class="sp-alert-backdrop"
      onClick=${(e) => { if (e.target === e.currentTarget) onCancel(); }}
      role="presentation">
      <div class="sp-alert-dialog" role="alertdialog" aria-modal="true">
        <div class="sp-alert-header">
          <span class="sp-alert-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <h2 class="sp-alert-title">${title}</h2>
        </div>
        <div class="sp-alert-body">
          <p class="sp-alert-message">${message}</p>
        </div>
        <div class="sp-alert-footer">
          <button class="sp-btn sp-btn-secondary" onClick=${onCancel}>Cancel</button>
          <button class="sp-btn sp-btn-destructive" onClick=${onConfirm}>${confirmLabel}</button>
        </div>
      </div>
    </div>
  `;
}

// ─── Inline name input with duplicate validation ──────────────────────────────
// onValidate(value) → returns error string or null (called before onCommit)

function NameInput({
  initial = '', placeholder, onCommit, onCancel, onValidate = null,
}) {
  const ref = useRef(null);
  const doneRef = useRef(false);
  const [inputErr, setInputErr] = useState('');
  const hasErrRef = useRef(false);

  useEffect(() => {
    if (ref.current) { ref.current.focus(); if (initial) ref.current.select(); }
  }, []);

  // Listen for ANY mousedown outside the input — cancel immediately if error showing
  useEffect(() => {
    const onMouseDown = (e) => {
      if (hasErrRef.current && ref.current && !ref.current.contains(e.target)) {
        e.preventDefault(); // prevent blur from firing separately
        if (!doneRef.current) { doneRef.current = true; onCancel(); }
      }
    };
    document.addEventListener('mousedown', onMouseDown, true); // capture phase
    return () => document.removeEventListener('mousedown', onMouseDown, true);
  }, []);

  const cancel = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCancel();
  };

  const commit = () => {
    if (doneRef.current) return;
    const v = ref.current?.value.trim();
    if (!v) { cancel(); return; }
    if (onValidate) {
      const err = onValidate(v);
      if (err) {
        hasErrRef.current = true;
        setInputErr(err);
        return;
      }
    }
    doneRef.current = true;
    onCommit(v);
  };

  const onKD = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); if (hasErrRef.current) cancel(); else commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  const onInput = () => {
    if (hasErrRef.current) { hasErrRef.current = false; setInputErr(''); }
  };

  // onBlur only commits when there's no error
  const onBlur = () => { if (!hasErrRef.current) commit(); };

  return html`
    <div style="width:100%">
      <input ref=${ref}
        class=${`fm-name-input${inputErr ? ' fm-name-input--err' : ''}`}
        defaultValue=${initial}
        placeholder=${placeholder}
        onKeyDown=${onKD}
        onBlur=${onBlur}
        onInput=${onInput}
        onClick=${(e) => e.stopPropagation()}/>
      ${inputErr && html`<div class="fm-name-err">${inputErr}</div>`}
    </div>`;
}

// ─── Context menu ─────────────────────────────────────────────────────────────
// REQ 5: rename available for all non-root folders
// REQ 6: delete visible ONLY to creator

function CtxMenu({
  x, y, node, nodeDepth, currentUser, onRename, onDelete, onAddSub, onClose,
}) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Subfolder count for Add Subfolder limit check
  const subAtLimit = nodeDepth >= MAX_DEPTH - 1;

  // Rename: only owner, not category root
  const canRename = !node.isCategoryRoot && isOwner(node, currentUser);
  // Delete: only owner
  const canDelete = isOwner(node, currentUser);

  const left = x + 170 > window.innerWidth ? x - 170 : x;
  const top = y + 150 > window.innerHeight ? y - 150 : y;

  return html`
    <div class="fm-ctx" ref=${ref} style=${{ left: `${left}px`, top: `${top}px` }}
      onClick=${(e) => e.stopPropagation()}>
      <button type="button" class=${`fm-ctx-btn${subAtLimit ? ' fm-ctx-btn--disabled' : ''}`}
        disabled=${subAtLimit}
        title=${subAtLimit ? `Maximum of ${MAX_DEPTH} subfolders reached` : ''}
        onClick=${() => { if (!subAtLimit) { onAddSub(node); onClose(); } }}>
        <${IcoFolderPlus}/> Add Subfolder
        ${subAtLimit && html`<span class="fm-ctx-limit"> (limit reached)</span>`}
      </button>
      ${canRename && html`
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

// ─── Search results ───────────────────────────────────────────────────────────

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
              <svg viewBox="0 0 88 72" fill="none" style="width:100%;height:100%">
                <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300"/>
                <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107"/>
              </svg>
            </div>
            <div class="fm-search-row-info">
              <div class="fm-search-row-top">
                <span class="fm-search-row-name">${node.name}</span>
                ${ts && html`<span class="fm-search-row-ts">${ts}</span>`}
              </div>
              <div class="fm-search-row-meta">
                ${pathStr && html`<span class="fm-search-row-path">${pathStr}</span>`}
                ${folders > 0 && html`<span class="fm-search-row-folders">${folders} subfolder${folders !== 1 ? 's' : ''}</span>`}
              </div>
            </div>
          </button>`;
  })}
    </div>`;
}

// ─── Grid panel ───────────────────────────────────────────────────────────────
// REQ 4: only renders folder-type nodes (files already stripped upstream)

function GridPanel({
  nodes, isRoot, selected, adding, renamingId, currentUser, atDepthLimit,
  onSelect, onOpen, onCtx, onCommitAdd, onCancelAdd, onCommitRename, onCancelRename,
}) {
  // Detect touch device once
  const isTouchDevice = useRef(
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  );
  const sortedNodes = useMemo(
    () => sortNodes(nodes.filter((n) => n.type === 'folder')),
    [nodes],
  );
  const empty = sortedNodes.length === 0 && !adding;

  // Case-insensitive duplicate check + name length + subfolder limit
  const validateAdd = (name) => {
    const lower = name.toLowerCase();
    const dup = sortedNodes.some((n) => n.name.toLowerCase() === lower);
    if (dup) return `A folder named "${name}" already exists here.`;
    if (!isRoot && atDepthLimit) return `Folder limit reached — subfolders can only be nested ${MAX_DEPTH} levels deep.`;
    return null;
  };

  const makeValidateRename = (currentName) => (name) => {
    const lower = name.toLowerCase();
    if (lower === currentName.toLowerCase()) return null; // same name is fine
    const dup = sortedNodes.some((n) => n.name.toLowerCase() === lower);
    return dup ? `A folder named "${name}" already exists here.` : null;
  };

  const atLimit = !isRoot && atDepthLimit;

  let emptyHint = 'Use "+ Add Folder" above to add a subfolder.';
  if (isRoot) emptyHint = 'Click "+ Add Folder" to get started.';
  else if (atDepthLimit) emptyHint = 'Maximum nesting depth reached.';

  return html`
    <div class="fm-panel" onClick=${() => onSelect(null)}>
      ${empty && html`
        <div class="fm-empty">
          <${IcoEmptyBox}/>
          <p>${isRoot ? 'No folders yet' : 'Empty folder'}</p>
          <span>${emptyHint}</span>
        </div>`}
      <div class="fm-tiles-grid">
        ${sortedNodes.map((node) => {
    const sel = selected === node.id;
    const ren = renamingId === node.id;
    const fc = countFolders(node);
    const ts = timeAgo(node.updatedAt);
    return html`
            <div key=${node.id} class=${`fm-tile${sel ? ' fm-tile--sel' : ''}`}
              tabIndex="0"
              role="button"
              aria-label=${node.name}
              onClick=${(e) => {
    e.stopPropagation();
    if (isTouchDevice.current) {
      // On touch: first tap selects, second tap opens
      if (sel) { onOpen(node); } else { onSelect(node.id); }
    } else {
      onSelect(node.id);
    }
  }}
              onDblClick=${(e) => { e.stopPropagation(); onOpen(node); }}
              onKeyDown=${(e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(node); }
    if (e.key === 'Escape') { e.preventDefault(); onSelect(null); }
  }}
              onContextMenu=${(e) => { e.preventDefault(); e.stopPropagation(); onCtx(e, node); }}>
              <div class="fm-tile-ico">
                <svg viewBox="0 0 88 72" fill="none">
                  <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300"/>
                  <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107"/>
                  <rect x="4" y="32" width="80" height="5" fill="#FFB300" opacity="0.4"/>
                </svg>
              </div>
              <div class="fm-tile-body">
                ${ren
    ? html`<${NameInput} initial=${node.name} placeholder="Folder name"
                      onValidate=${makeValidateRename(node.name)}
                      onCommit=${(v) => onCommitRename(node, v)} onCancel=${onCancelRename}/>`
    : html`<span class="fm-tile-name" title=${node.name}>${node.name}</span>`}
                <div class="fm-tile-meta">
                  <span class="fm-tile-folders">${fc > 0 ? `${fc} subfolder${fc !== 1 ? 's' : ''}` : 'No subfolders'}</span>
                  ${ts && html`<span class="fm-tile-ts">${ts}</span>`}
                </div>
              </div>
              ${currentUser && html`
                <button type="button" class="fm-tile-dots"
                  onClick=${(e) => { e.stopPropagation(); onCtx(e, node); }}
                  title="More options"><${IcoDots}/></button>`}
            </div>`;
  })}
        ${adding && html`
          <div class="fm-tile fm-tile--new fm-tile--adding">
            <div class="fm-tile-ico">
              <svg viewBox="0 0 88 72" fill="none">
                <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300" opacity="0.35"/>
                <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107" opacity="0.35"/>
              </svg>
            </div>
            <div class="fm-tile-body">
              <${NameInput} placeholder="Folder name" onValidate=${validateAdd} onCommit=${onCommitAdd} onCancel=${onCancelAdd}/>
            </div>
          </div>`}
      </div>
      ${atLimit && html`
        <div class="fm-limit-warning">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>
            <strong>Subfolder limit reached.</strong>
            Folders can only be nested ${MAX_DEPTH} levels deep. Delete a subfolder or go back to a higher level to add more.
          </span>
        </div>`}
    </div>`;
}

// ─── Folder Modal ─────────────────────────────────────────────────────────────

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
  const [deleteDialog, setDeleteDialog] = useState(null); // REQ 6: Spectrum dialog
  // REQ 2: session-based current user (same as sidebar)
  const [currentUser, setCurrentUser] = useState(null);
  // REQ 7: in-memory cache so re-opens are instant
  const treeCache = useRef(null);

  // Mirror sidebar's fetchCurrentUser pattern
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        if (res.ok) {
          const d = await res.json();
          setCurrentUser(d.user);
        } else setCurrentUser(null);
      } catch { setCurrentUser(null); }
    };
    fetchUser();
    const onAuth = () => fetchUser();
    window.addEventListener('forum-auth-changed', onAuth);
    return () => window.removeEventListener('forum-auth-changed', onAuth);
  }, []);

  // REQ 7: force=true bypasses cache and hits the network
  const fetchFolders = useCallback(async (force = false) => {
    if (!force && treeCache.current) { setTree(treeCache.current); return; }
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${API_BASE}/sidebar/categories`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.categories) {
        const built = buildFolderTree(data.categories);
        treeCache.current = built;
        setTree(built);
      } else throw new Error(data.error || 'Failed to load');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }, []);

  // REQ 7: on open, show cache instantly then refresh in background
  useEffect(() => {
    if (isOpen) {
      setStack([]); setSelected(null); setSearchQ('');
      setAdding(false); setRenamingId(null); setCtx(null); setFolderError(null);
      if (treeCache.current) setTree(treeCache.current);
      requestAnimationFrame(() => setVisible(true));
      fetchFolders(true);
      document.documentElement.classList.add('fm-scroll-lock');
      document.body.classList.add('fm-scroll-lock');
    } else {
      setVisible(false);
      document.documentElement.classList.remove('fm-scroll-lock');
      document.body.classList.remove('fm-scroll-lock');
    }
    return () => {
      document.documentElement.classList.remove('fm-scroll-lock');
      document.body.classList.remove('fm-scroll-lock');
    };
  }, [isOpen]);

  // Sync with sidebar refreshes (REQ 2: linked data source)
  useEffect(() => {
    const onRefresh = () => { treeCache.current = null; if (isOpen) fetchFolders(true); };
    window.addEventListener('refresh-sidebar', onRefresh);
    return () => window.removeEventListener('refresh-sidebar', onRefresh);
  }, [isOpen, fetchFolders]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const esc = (e) => { if (e.key === 'Escape' && !renamingId && !adding) onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [isOpen, renamingId, adding]);

  if (!isOpen && !visible) return null;

  const isSearching = searchQ.trim().length > 0;
  const isRoot = stack.length === 0;
  const parentNode = stack.length ? findNode(tree, stack[stack.length - 1]) : null;
  const nodes = parentNode ? (parentNode.children || []) : tree; // REQ 4: only folders in children
  const crumbs = stack.map((id) => findNode(tree, id)).filter(Boolean);
  const selectedNode = selected ? findNode(tree, selected) : null;
  const showSelectedCrumb = !isSearching && selected && selectedNode;
  const searchResults = isSearching
    ? flattenTree(tree).filter(
      ({ node }) => node.name.toLowerCase().includes(searchQ.trim().toLowerCase()),
    )
    : [];

  const nav = (newStack) => {
    setStack(newStack); setSelected(null); setSearchQ('');
    setAdding(false); setRenamingId(null);
  };
  const goRoot = () => nav([]);
  const goCrumb = (i) => nav(stack.slice(0, i + 1));
  const goBack = () => nav(stack.slice(0, -1));
  const goInto = (node) => {
    // Block navigation if already at max depth — just select the folder instead
    if (stack.length >= MAX_DEPTH - 1) {
      setSelected(node.id);
      return;
    }
    const ancestors = findAncestors(tree, node.id) || [];
    nav([...ancestors.map((a) => a.id), node.id]);
  };

  // Add folder — REQ 4: always isFolder:true, never creates files
  // Duplicate check is done client-side in GridPanel's validateAdd (case-insensitive)
  const handleCommitAdd = async (name) => {
    setAdding(false); setFolderError(null);

    // Hard guard: block if nesting depth would exceed MAX_DEPTH
    if (stack.length > 0 && stack.length >= MAX_DEPTH - 1) {
      setFolderError(`Subfolder limit reached — folders can only be nested ${MAX_DEPTH} levels deep. Go back to add more.`);
      return;
    }

    try {
      let res;
      if (stack.length === 0) {
        res = await fetch(`${API_BASE}/sidebar/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name }),
        });
      } else {
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
      treeCache.current = null;
      await fetchFolders(true);
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Add folder failed:', err);
    }
  };

  // REQ 5: Rename subfolder
  const handleCommitRename = async (node, name) => {
    setRenamingId(null);
    if (node.isCategoryRoot || name === node.name) return;
    try {
      const res = await fetch(`${API_BASE}/sidebar-items/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFolderError(d.error || 'Rename failed.');
        return;
      }
      treeCache.current = null;
      await fetchFolders(true);
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Rename failed:', err);
    }
  };

  // REQ 6: opens Spectrum dialog (not window.confirm)
  // Walks a node's children recursively to find the first item (file or subfolder)
  // not owned by currentUser
  const findBlockingChild = useCallback((node, user) => {
    const children = node.children || [];
    for (let i = 0; i < children.length; i += 1) {
      const child = children[i];
      if (!isOwner(child, user)) return child; // files and folders both checked
      if (child.isFolder) {
        const nested = findBlockingChild(child, user);
        if (nested) return nested;
      }
    }
    return null;
  }, []);

  // Show "Are you sure?" first — blocker check happens on confirm
  const handleDelete = (node) => setDeleteDialog(node);

  const confirmDelete = async () => {
    const node = deleteDialog;
    setDeleteDialog(null);
    if (!node || node.blocked) return;

    // After user confirms, check if any descendant is owned by another user
    const blocker = findBlockingChild(node, currentUser);
    if (blocker) {
      setFolderError(null);
      setDeleteDialog({
        blocked: true,
        blockerName: blocker.name,
        blockerType: blocker.isFolder ? 'subfolder' : 'file',
        parentName: node.name,
      });
      return;
    }

    try {
      const url = node.isCategoryRoot
        ? `${API_BASE}/sidebar/categories/${node.id}`
        : `${API_BASE}/sidebar-items/${node.id}`;
      await fetch(url, { method: 'DELETE', credentials: 'include' });
      if (selected === node.id) setSelected(null);
      if (stack.includes(node.id)) setStack(stack.slice(0, stack.indexOf(node.id)));
      treeCache.current = null;
      await fetchFolders(true);
      window.dispatchEvent(new CustomEvent('refresh-sidebar'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Delete failed:', err);
    }
  };

  const handleAddSub = (node) => {
    // stack.length + 1 = depth after entering this node
    if (stack.length + 1 >= MAX_DEPTH) {
      setFolderError(`Subfolder limit reached — folders can only be nested ${MAX_DEPTH} levels deep.`);
      return;
    }
    goInto(node);
    setTimeout(() => setAdding(true), 0);
  };

  const doOk = () => {
    const node = selectedNode;
    if (!node) return;
    const ancestors = findAncestors(tree, selected) || [];
    const path = [...ancestors.map((a) => a.name), node.name].join(' > ');
    onSelect(node.name, path, node.isCategoryRoot ? null : node.id);
    onClose();
  };

  const canSelect = !!selected; // only active when user explicitly clicks a folder
  const depthAtLimit = !isRoot && stack.length >= MAX_DEPTH - 1;
  const addAtLimit = depthAtLimit;

  return html`
    <div class=${`fm-overlay${visible && isOpen ? ' fm-overlay--in' : ''}`}
      onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="fm-modal" onClick=${() => { setCtx(null); }}>

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
          ${currentUser && !addAtLimit && html`
            <div class="fm-actions">
              <button type="button" class="fm-btn"
                onClick=${() => { setAdding(true); setRenamingId(null); setSearchQ(''); }}>
                <${IcoPlus}/> Add Folder
              </button>
            </div>`}
          <button type="button" class="fm-close" onClick=${onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

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

        <div class="fm-body" onClick=${(e) => e.stopPropagation()}>
          ${folderError && html`
            <div class="fm-folder-error" onClick=${() => setFolderError(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ${folderError}
              <button type="button" class="fm-folder-error-close"><${IcoClose}/></button>
            </div>`}

          ${loading && !treeCache.current && html`
            <div class="fm-loading">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFB300" stroke-width="2.5" stroke-linecap="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span>Loading folders…</span>
            </div>`}

          ${!loading && error && html`
            <div class="fm-error">
              <p>Failed to load: ${error}</p>
              <button type="button" class="fm-btn" onClick=${() => fetchFolders(true)}>Retry</button>
            </div>`}

          ${(!loading || treeCache.current) && !error && (isSearching
    ? html`<${SearchResults} results=${searchResults}
                onNavigate=${(node, ancestors) => {
      setStack(ancestors.map((a) => a.id));
      setSelected(node.id); setSearchQ('');
    }}/>`
    : html`<${GridPanel}
                nodes=${nodes}
                isRoot=${isRoot}
                selected=${selected}
                adding=${adding}
                renamingId=${renamingId}
                currentUser=${currentUser}
                atDepthLimit=${depthAtLimit}
                onSelect=${(id) => setSelected((p) => (p === id ? null : id))}
                onOpen=${goInto}
                onCtx=${(e, node) => { e.stopPropagation(); setCtx({ x: e.clientX, y: e.clientY, node }); }}
                onCommitAdd=${handleCommitAdd}
                onCancelAdd=${() => setAdding(false)}
                onCommitRename=${handleCommitRename}
                onCancelRename=${() => setRenamingId(null)}/>`)}
        </div>

        <div class="fm-footer">
          <button type="button" class="fm-foot-btn fm-foot-btn--cancel" onClick=${onClose}>Cancel</button>
          <button type="button" class="fm-foot-btn fm-foot-btn--ok" onClick=${doOk}
            disabled=${!canSelect}>
            Select
          </button>
        </div>
      </div>

      ${ctx && html`
        <${CtxMenu}
          x=${ctx.x} y=${ctx.y}
          node=${ctx.node}
          nodeDepth=${stack.length}
          currentUser=${currentUser}
          onRename=${(node) => setRenamingId(node.id)}
          onDelete=${handleDelete}
          onAddSub=${handleAddSub}
          onClose=${() => setCtx(null)}/>`}

      <${SpectrumAlertDialog}
        isOpen=${!!(deleteDialog && !deleteDialog.blocked)}
        title="Delete Folder"
        message=${deleteDialog && !deleteDialog.blocked ? `Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        onConfirm=${confirmDelete}
        onCancel=${() => setDeleteDialog(null)}
      />
      <${SpectrumAlertDialog}
        isOpen=${!!(deleteDialog && deleteDialog.blocked)}
        title="Cannot Delete"
        message=${deleteDialog && deleteDialog.blocked ? `Cannot delete: "${deleteDialog.blockerName}" ${deleteDialog.blockerType === 'file' ? '(a file)' : '(a subfolder)'} in this folder was created by another user. Ask them to remove it first.` : ''}
        confirmLabel="OK"
        onConfirm=${() => setDeleteDialog(null)}
        onCancel=${() => setDeleteDialog(null)}
      />
    </div>`;
}

// ─── App shell ────────────────────────────────────────────────────────────────

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
    window.dispatchEvent(new CustomEvent('folder:selected', {
      detail: { name, path: path || name, folderId },
    }));
    setIsOpen(false);
  };
  return html`<${FolderModal} isOpen=${isOpen} onClose=${() => setIsOpen(false)} onSelect=${handleSelect}/>`;
}

// ─── Decorate ─────────────────────────────────────────────────────────────────

export default function decorate() {
  let mount = document.getElementById('folder-root');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'folder-root';
    document.body.appendChild(mount);
  }
  render(html`<${FolderApp}/>`, mount);
}
