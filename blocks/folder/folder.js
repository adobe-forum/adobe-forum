import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect, useCallback } from '../../vendor/preact-hooks.js';

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'eds-folder-tree';
let _seed = Date.now();
const uid = () => `n${(_seed += 1)}`;

const loadTree = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const saveTree = (t) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch { /* noop */ }
};

// ── Sort helper ───────────────────────────────────────────────────────────────
const sortNodes = (nodes) =>
  [...nodes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

// ── Duplicate check ───────────────────────────────────────────────────────────
const hasDuplicate = (siblings, name, excludeId = null) =>
  siblings.some(
    (n) => n.id !== excludeId && n.name.toLowerCase() === name.trim().toLowerCase()
  );

// ── Immutable tree helpers ────────────────────────────────────────────────────
const findNode = (tree, id) => {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) { const f = findNode(n.children, id); if (f) return f; }
  }
  return null;
};

const deleteById = (tree, id) =>
  tree.filter((n) => n.id !== id)
    .map((n) => (n.children ? { ...n, children: deleteById(n.children, id) } : n));

const renameById = (tree, id, name) =>
  tree.map((n) => {
    if (n.id === id) return { ...n, name };
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

// Move node: removes it from its current position, drops it into targetParentId.
// Guards against dropping a folder into itself or its own descendants.
const isAncestor = (tree, ancestorId, nodeId) => {
  const node = findNode(tree, ancestorId);
  if (!node || !node.children) return false;
  for (const c of node.children) {
    if (c.id === nodeId) return true;
    if (isAncestor(tree, c.id, nodeId)) return true;
  }
  return false;
};

const moveNode = (tree, nodeId, targetParentId) => {
  // Don't move into self or own descendant
  if (nodeId === targetParentId) return tree;
  if (isAncestor(tree, nodeId, targetParentId)) return tree;
  const node = findNode(tree, nodeId);
  if (!node) return tree;
  const withoutNode = deleteById(tree, nodeId);
  return insertInto(withoutNode, targetParentId, node);
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoClose = () => html`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const IcoBack  = () => html`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const IcoEdit  = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const IcoTrash = () => html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`;

const IcoFolder = () => html`
  <svg viewBox="0 0 88 72" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <path d="M4 16C4 13.8 5.8 12 8 12H32L42 22H80C82.2 22 84 23.8 84 26V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V16Z" fill="#FFB300"/>
    <path d="M4 32H84V62C84 64.2 82.2 66 80 66H8C5.8 66 4 64.2 4 62V32Z" fill="#FFC107"/>
    <rect x="4" y="32" width="80" height="5" fill="#FFB300" opacity="0.4"/>
  </svg>`;

const IcoFile = () => html`
  <svg viewBox="0 0 72 88" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
    <rect x="6" y="4" width="52" height="68" rx="4" fill="#E8EAF6"/>
    <path d="M42 4L58 20H42V4Z" fill="#B0BEC5"/>
    <rect x="14" y="34" width="34" height="4" rx="2" fill="#9FA8DA"/>
    <rect x="14" y="44" width="26" height="4" rx="2" fill="#9FA8DA"/>
    <rect x="14" y="54" width="30" height="4" rx="2" fill="#9FA8DA"/>
  </svg>`;

const IcoEmptyBox = () => html`
  <svg viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 36C12 30.5 16.5 26 22 26H72L90 44H158C163.5 44 168 48.5 168 54V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V36Z" fill="#FFF3E0"/>
    <path d="M12 68H168V114C168 119.5 163.5 124 158 124H22C16.5 124 12 119.5 12 114V68Z" fill="#FFB300" opacity="0.12"/>
    <circle cx="90" cy="86" r="22" fill="#FFE082" opacity="0.5"/>
    <path d="M82 86H98M90 78V94" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

// ── Inline name input ─────────────────────────────────────────────────────────
function NameInput({ initial = '', placeholder, siblings = [], excludeId = null, onCommit, onCancel }) {
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
    if (e.key === 'Enter')  { e.preventDefault(); commit(); }
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
function CtxMenu({ x, y, node, onRename, onDelete, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', h), 0);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const menuW = 150; const menuH = 80;
  const left = x + menuW > window.innerWidth  ? x - menuW : x;
  const top  = y + menuH > window.innerHeight ? y - menuH : y;

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

// ── Grid panel ────────────────────────────────────────────────────────────────
function GridPanel({ nodes, isRoot, selected, renamingId, adding,
  onSelect, onOpen, onCtx, onCommitRename, onCancelRename,
  onCommitAdd, onCancelAdd, onMove, onDelete }) {

  const sortedNodes = sortNodes(nodes);
  const empty = nodes.length === 0 && !adding;

  // ── Drag state (local to this panel) ─────────────────────────────────────
  const [dragId,   setDragId]   = useState(null); // id of node being dragged
  const [overId,   setOverId]   = useState(null); // id of folder being hovered
  const [overRoot, setOverRoot] = useState(false); // hovering the empty panel bg

  // ── Keyboard navigation ───────────────────────────────────────────────────
  // We keep a ref to the grid so we can query its children.
  const gridRef = useRef(null);

  // Build the focusable id list in sorted order (mirrors what we render)
  const focusableIds = sortedNodes.map((n) => n.id);

  const handleGridKeyDown = (e) => {
    if (!selected) return;
    const idx = focusableIds.indexOf(selected);
    if (idx === -1) return;

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
        // Estimate columns from grid width / item width (≈110px min + 8px gap)
        const cols = gridRef.current
          ? Math.max(1, Math.round(gridRef.current.offsetWidth / 118))
          : 1;
        const next = focusableIds[idx + cols];
        if (next) onSelect(next);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const cols = gridRef.current
          ? Math.max(1, Math.round(gridRef.current.offsetWidth / 118))
          : 1;
        const prev = focusableIds[idx - cols];
        if (prev) onSelect(prev);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        const node = nodes.find((n) => n.id === selected);
        if (node?.type === 'folder') onOpen(node);
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

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const onDragStart = (e, node) => {
    setDragId(node.id);
    e.dataTransfer.effectAllowed = 'move';
    // Use a ghost clone so the original stays visible
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
    setDragId(null); setOverId(null);
  };

  // Drop on the panel background → move to current folder (parentId handled upstream)
  const onDragOverPanel = (e) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverRoot(true);
    setOverId(null);
  };

  const onDropPanel = (e) => {
    e.preventDefault();
    if (dragId) onMove(dragId, null); // null = "current level" sentinel
    setDragId(null); setOverId(null); setOverRoot(false);
  };

  return html`
    <div
      class=${`fm-panel${overRoot ? ' fm-panel--drop' : ''}`}
      tabIndex="0"
      onKeyDown=${handleGridKeyDown}
      onClick=${() => onSelect(null)}
      onDragOver=${onDragOverPanel}
      onDragLeave=${() => setOverRoot(false)}
      onDrop=${onDropPanel}>

      ${empty && html`
        <div class="fm-empty">
          <${IcoEmptyBox}/>
          <p>${isRoot ? 'No folders yet' : 'This folder is empty'}</p>
          <span>${isRoot
            ? 'Click "+ New Folder" to create your first category folder'
            : 'Use the buttons above to add folders or files'}</span>
        </div>`}

      <div class="fm-grid" ref=${gridRef}>
        ${sortedNodes.map((node) => {
          const sel  = selected    === node.id;
          const ren  = renamingId  === node.id;
          const dir  = node.type   === 'folder';
          const drag = dragId      === node.id;
          const over = overId      === node.id;

          return html`
            <div key=${node.id}
              class=${[
                'fm-item',
                sel  ? 'fm-item--sel'  : '',
                dir  ? 'fm-item--dir'  : 'fm-item--file',
                drag ? 'fm-item--drag' : '',
                over ? 'fm-item--over' : '',
              ].filter(Boolean).join(' ')}
              tabIndex=${sel ? '0' : '-1'}
              draggable="true"
              onDragStart=${(e) => onDragStart(e, node)}
              onDragEnd=${onDragEnd}
              onDragOver=${(e) => onDragOverFolder(e, node)}
              onDragLeave=${() => { if (overId === node.id) setOverId(null); }}
              onDrop=${(e) => onDropFolder(e, node)}
              onClick=${(e) => { e.stopPropagation(); onSelect(node.id); }}
              onDblClick=${(e) => { e.stopPropagation(); if (dir) onOpen(node); }}
              onContextMenu=${(e) => { e.preventDefault(); e.stopPropagation(); onCtx(e, node); }}>

              <div class="fm-item-ico">
                ${dir ? html`<${IcoFolder}/>` : html`<${IcoFile}/>`}
              </div>

              ${ren
                ? html`<${NameInput}
                    initial=${node.name}
                    placeholder=${dir ? 'Folder name' : 'File name'}
                    siblings=${nodes}
                    excludeId=${node.id}
                    onCommit=${(v) => onCommitRename(node.id, v)}
                    onCancel=${onCancelRename}/>`
                : html`<span class="fm-item-lbl" title=${node.name}>${node.name}</span>`}
            </div>`;
        })}

        ${adding && html`
          <div class="fm-item fm-item--new">
            <div class="fm-item-ico">
              ${adding.type === 'folder' ? html`<${IcoFolder}/>` : html`<${IcoFile}/>`}
            </div>
            <${NameInput}
              placeholder=${adding.type === 'folder' ? 'Folder name' : 'File name'}
              siblings=${nodes}
              onCommit=${onCommitAdd}
              onCancel=${onCancelAdd}/>
          </div>`}
      </div>
    </div>`;
}

// ── Folder modal ──────────────────────────────────────────────────────────────
function FolderModal({ onClose, onSelect }) {
  const [tree,      setTree]      = useState(loadTree);
  const [stack,     setStack]     = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [renamingId,setRenamingId]= useState(null);
  const [adding,    setAdding]    = useState(null);
  const [ctx,       setCtx]       = useState(null);
  const [visible,   setVisible]   = useState(false);

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    // Esc only closes if no inline edit is active (NameInput handles its own Esc)
    const esc = (e) => { if (e.key === 'Escape' && !renamingId && !adding) doClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [renamingId, adding]);

  const persist  = (t) => { setTree(t); saveTree(t); };
  const doClose  = () => { setVisible(false); setTimeout(onClose, 200); };
  const doOk     = () => {
    const node = selected ? findNode(tree, selected) : null;
    if (onSelect) onSelect(node?.name || null);
    doClose();
  };

  // navigation
  const isRoot     = stack.length === 0;
  const parentId   = stack.length ? stack[stack.length - 1] : null;
  const parentNode = parentId ? findNode(tree, parentId) : null;
  const nodes      = parentNode ? (parentNode.children || []) : tree;
  const crumbs     = stack.map((id) => findNode(tree, id)).filter(Boolean);

  const reset   = () => { setSelected(null); setAdding(null); setRenamingId(null); };
  const goRoot  = () => { setStack([]); reset(); };
  const goCrumb = (i) => { setStack(stack.slice(0, i + 1)); reset(); };
  const goBack  = () => { setStack(stack.slice(0, -1)); reset(); };
  const goInto  = (node) => { setStack([...stack, node.id]); reset(); };

  // add
  const startAdd  = (type) => { setAdding({ type }); setRenamingId(null); setSelected(null); };
  const commitAdd = (name) => {
    const newNode = { id: uid(), name, type: adding.type, children: adding.type === 'folder' ? [] : undefined };
    persist(insertInto(tree, parentId, newNode));
    setAdding(null);
  };

  // rename
  const startRename  = (node) => { setRenamingId(node.id); setAdding(null); setCtx(null); };
  const commitRename = (id, name) => { persist(renameById(tree, id, name)); setRenamingId(null); };

  // delete
  const doDelete = (id) => {
    if (selected === id) setSelected(null);
    if (stack.includes(id)) setStack(stack.slice(0, stack.indexOf(id)));
    persist(deleteById(tree, id));
    setCtx(null);
  };

  // ── Move (drag-and-drop) ──────────────────────────────────────────────────
  // targetId: the folder to move INTO, or null meaning "current level"
  const doMove = (nodeId, targetId) => {
    // null sentinel → move to current view's parent
    const realTarget = targetId === null ? parentId : targetId;

    // Guard: would this create a duplicate name at the destination?
    const node = findNode(tree, nodeId);
    if (!node) return;
    const destParentNode = realTarget ? findNode(tree, realTarget) : null;
    const destSiblings   = destParentNode ? (destParentNode.children || []) : tree;
    if (hasDuplicate(destSiblings, node.name, nodeId)) {
      // Silently skip — item with same name already exists at destination
      return;
    }

    const newTree = moveNode(tree, nodeId, realTarget);
    if (newTree !== tree) persist(newTree);
  };

  return html`
    <div class=${`fm-overlay ${visible ? 'fm-overlay--in' : ''}`}
      onClick=${(e) => { if (e.target === e.currentTarget) doClose(); }}>

      <div class="fm-modal" onClick=${() => { setSelected(null); setCtx(null); }}>

        <!-- HEADER -->
        <div class="fm-header">
          <div class="fm-nav">
            ${!isRoot && html`
              <button type="button" class="fm-back" onClick=${goBack}><${IcoBack}/></button>`}
            <div class="fm-breadcrumb">
              <button type="button"
                class=${`fm-crumb ${isRoot ? 'fm-crumb--cur' : ''}`}
                onClick=${goRoot}>Categories</button>
              ${crumbs.map((c, i) => html`
                <span key=${'s'+c.id} class="fm-sep">›</span>
                <button key=${c.id} type="button"
                  class=${`fm-crumb ${i === crumbs.length-1 ? 'fm-crumb--cur' : ''}`}
                  onClick=${() => goCrumb(i)}>${c.name}</button>`)}
            </div>
          </div>

          <div class="fm-actions">
            <button type="button" class="fm-btn" onClick=${() => startAdd('folder')}>
              + New Folder
            </button>
            ${!isRoot && html`
              <button type="button" class="fm-btn" onClick=${() => startAdd('file')}>
                + New File
              </button>`}
          </div>

          <button type="button" class="fm-close" onClick=${doClose}><${IcoClose}/></button>
        </div>

        <!-- BODY -->
        <div class="fm-body" onClick=${(e) => e.stopPropagation()}>
          <${GridPanel}
            nodes=${nodes} isRoot=${isRoot}
            selected=${selected} renamingId=${renamingId} adding=${adding}
            onSelect=${(id) => setSelected((p) => p === id ? null : id)}
            onOpen=${goInto}
            onCtx=${(e, node) => setCtx({ x: e.clientX, y: e.clientY, node })}
            onCommitRename=${commitRename}
            onCancelRename=${() => setRenamingId(null)}
            onCommitAdd=${commitAdd}
            onCancelAdd=${() => setAdding(null)}
            onMove=${doMove}
            onDelete=${doDelete}/>
        </div>

        <!-- FOOTER -->
        <div class="fm-footer">
          <button type="button" class="fm-foot-btn fm-foot-btn--cancel" onClick=${doClose}>Cancel</button>
          <button type="button" class="fm-foot-btn fm-foot-btn--ok" onClick=${doOk}>
            ${selected ? 'Select' : 'OK'}
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
  const doClose  = () => { setOpen(false); window.history.back(); };
  const doSelect = (name) => {
    if (name) document.dispatchEvent(new CustomEvent('folder:selected', { detail: { name } }));
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