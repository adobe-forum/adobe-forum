import { h, render } from '../../vendor/preact.js';
import { useEffect, useRef, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

const html = htm.bind(h);

// Mock categories data - replace with your actual API call
const EXISTING_CATEGORIES = [
  'sql-server',
  'objective-c',
  'ajax',
  'javascript',
  'python',
  'java',
  'react',
  'node.js',
  'css',
  'html',
];

// ============================================
// DOM TO JSON CONVERTER
// ============================================

function domToJson(element) {
  if (!element || element.nodeType !== 1) {
    return null;
  }
  const obj = {
    tag: element.tagName.toLowerCase(),
  };
  if (element.attributes.length > 0) {
    obj.attributes = {};
    Array.from(element.attributes).forEach((attr) => {
      obj.attributes[attr.name] = attr.value;
    });
  }
  const children = [];
  Array.from(element.childNodes).forEach((node) => {
    if (node.nodeType === 1) {
      const childObj = domToJson(node);
      if (childObj) children.push(childObj);
    } else if (node.nodeType === 3) {
      const text = node.nodeValue.trim();
      if (text) {
        children.push({ text });
      }
    }
  });
  if (children.length > 0) {
    obj.children = children;
  }
  return obj;
}

// ============================================
// TOOLBAR ICONS (loaded from /icons/ folder)
// ============================================

// Map toolbar commands to icon filenames
const ICON_FILES = {
  bold: 'bold',
  italic: 'italic',
  strike: 'strikethrough',
  code: 'code',
  codeBlock: 'code-block',
  link: 'link',
  image: 'image',
  blockquote: 'quote',
  orderedList: 'ordered-list',
  bulletList: 'unordered-list',
  outdent: 'outdent',
  indent: 'indent',
  table: 'table',
  clean: 'clean',
};

// Shared icon cache — survives component re-renders
const iconCache = {};

async function loadIcons() {
  if (Object.keys(iconCache).length > 0) return iconCache;
  const entries = await Promise.all(
    Object.entries(ICON_FILES).map(async ([cmd, file]) => {
      try {
        const resp = await fetch(`/icons/${file}.svg`);
        if (resp.ok) return [cmd, await resp.text()];
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`Failed to load icon: ${file}.svg`, e);
      }
      return [cmd, ''];
    }),
  );
  entries.forEach(([cmd, svg]) => { iconCache[cmd] = svg; });
  return iconCache;
}

// Block format tags for the heading / paragraph dropdown
const BLOCK_FORMATS = {
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
};

// ============================================
// RICH TEXT EDITOR COMPONENT
// ============================================

function RichTextEditor({ onChange, minChars = 20 }) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const activeCellRef = useRef(null);
  const resizeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [charCount, setCharCount] = useState(0);
  const [showTableTools, setShowTableTools] = useState(false);
  const [icons, setIcons] = useState(iconCache);
  const [activeFormats, setActiveFormats] = useState({});

  // Load icons from /icons/ folder on mount
  useEffect(() => {
    loadIcons().then((loaded) => setIcons({ ...loaded }));
  }, []);

  const emitChange = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const htmlContent = editor.innerHTML.replace(/\u200B/g, '');
    const jsonContent = domToJson(editor);
    const textLength = editor.textContent.replace(/\u200B/g, '').trim().length;
    setCharCount(textLength);
    onChange(htmlContent, jsonContent);
  };

  // ---- Image resize overlay ----

  const clearImageResize = () => {
    if (!resizeRef.current) return;
    const { overlay } = resizeRef.current;
    if (overlay && overlay.parentNode) overlay.remove();
    resizeRef.current = null;
  };

  const showImageResize = (img) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Don't re-create overlay for the same image
    if (resizeRef.current && resizeRef.current.img === img) return;
    clearImageResize();

    const ceContainer = containerRef.current;
    if (!ceContainer) return;

    // Prevent native browser image drag
    img.setAttribute('draggable', 'false');

    const overlay = document.createElement('div');
    overlay.className = 'img-resize-overlay';

    const corners = ['nw', 'ne', 'sw', 'se'];
    corners.forEach((pos) => {
      const handle = document.createElement('div');
      handle.className = `img-resize-handle img-resize-handle-${pos}`;
      handle.dataset.pos = pos;
      overlay.appendChild(handle);
    });

    ceContainer.appendChild(overlay);
    resizeRef.current = { img, overlay };

    // Position overlay on top of the image, accounting for editor scroll
    const positionOverlay = () => {
      const cRect = ceContainer.getBoundingClientRect();
      const iRect = img.getBoundingClientRect();
      overlay.style.top = `${iRect.top - cRect.top + editor.scrollTop}px`;
      overlay.style.left = `${iRect.left - cRect.left + editor.scrollLeft}px`;
      overlay.style.width = `${iRect.width}px`;
      overlay.style.height = `${iRect.height}px`;
    };
    positionOverlay();

    // Attach drag logic directly on each handle
    corners.forEach((pos) => {
      const handle = overlay.querySelector(`.img-resize-handle-${pos}`);
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startW = img.getBoundingClientRect().width;
        const startH = img.getBoundingClientRect().height;
        const ratio = startH / startW;
        const maxW = ceContainer.clientWidth;

        const onMouseMove = (ev) => {
          ev.preventDefault();
          const isLeft = pos.endsWith('w');
          const dx = isLeft ? startX - ev.clientX : ev.clientX - startX;
          let newW = Math.round(startW + dx);
          if (newW < 50) newW = 50;
          if (newW > maxW) newW = maxW;
          const newH = Math.round(newW * ratio);

          img.style.width = `${newW}px`;
          img.style.height = `${newH}px`;
          overlay.style.width = `${newW}px`;
          overlay.style.height = `${newH}px`;

          // Re-position overlay
          const cRect = ceContainer.getBoundingClientRect();
          const iRect = img.getBoundingClientRect();
          overlay.style.top = `${iRect.top - cRect.top + editor.scrollTop}px`;
          overlay.style.left = `${iRect.left - cRect.left + editor.scrollLeft}px`;
        };

        const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.style.userSelect = '';

          const finalW = img.getBoundingClientRect().width;
          img.setAttribute('width', Math.round(finalW));
          img.removeAttribute('height');
          img.style.height = 'auto';

          positionOverlay();
          emitChange();
        };

        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  };

  const detectTableContext = () => {
    const selection = window.getSelection();
    if (selection.rangeCount) {
      const anchor = selection.anchorNode?.nodeType === 3
        ? selection.anchorNode.parentElement
        : selection.anchorNode;
      const cell = anchor?.closest('td, th');
      activeCellRef.current = cell || null;
      setShowTableTools(!!cell);
    } else {
      activeCellRef.current = null;
      setShowTableTools(false);
    }
  };

  // ---- Table operations ----

  const addRow = (position) => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const row = cell.closest('tr');
    if (!row) return;
    const colCount = row.cells.length;
    const newRow = document.createElement('tr');
    Array.from({ length: colCount }).forEach(() => {
      const td = document.createElement('td');
      td.innerHTML = '<br>';
      newRow.appendChild(td);
    });
    if (position === 'above') {
      row.parentNode.insertBefore(newRow, row);
    } else {
      row.parentNode.insertBefore(newRow, row.nextSibling);
    }
    emitChange();
  };

  const addColumn = (position) => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const colIndex = cell.cellIndex;
    Array.from(table.rows).forEach((row) => {
      const newCell = document.createElement('td');
      newCell.innerHTML = '<br>';
      const insertIndex = position === 'left' ? colIndex : colIndex + 1;
      if (insertIndex >= row.cells.length) {
        row.appendChild(newCell);
      } else {
        row.insertBefore(newCell, row.cells[insertIndex]);
      }
    });
    emitChange();
  };

  const deleteRow = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return;
    if (table.rows.length <= 1) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      table.parentNode.insertBefore(p, table);
      table.remove();
    } else {
      row.remove();
    }
    activeCellRef.current = null;
    setShowTableTools(false);
    emitChange();
  };

  const deleteColumn = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const colIndex = cell.cellIndex;
    const firstRowCells = table.rows[0]?.cells.length || 0;
    if (firstRowCells <= 1) {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      table.parentNode.insertBefore(p, table);
      table.remove();
    } else {
      Array.from(table.rows).forEach((row) => {
        if (row.cells[colIndex]) {
          row.cells[colIndex].remove();
        }
      });
    }
    activeCellRef.current = null;
    setShowTableTools(false);
    emitChange();
  };

  const mergeCellRight = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const nextCell = cell.nextElementSibling;
    if (!nextCell) return;
    const currentSpan = parseInt(cell.getAttribute('colspan') || '1', 10);
    const nextSpan = parseInt(nextCell.getAttribute('colspan') || '1', 10);
    cell.setAttribute('colspan', currentSpan + nextSpan);
    if (nextCell.textContent.trim()) {
      cell.innerHTML += ` ${nextCell.innerHTML}`;
    }
    nextCell.remove();
    emitChange();
  };

  const mergeCellDown = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const row = cell.closest('tr');
    const nextRow = row?.nextElementSibling;
    if (!nextRow) return;
    const colIndex = cell.cellIndex;
    const belowCell = nextRow.cells[colIndex];
    if (!belowCell) return;
    const currentSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
    const belowSpan = parseInt(belowCell.getAttribute('rowspan') || '1', 10);
    cell.setAttribute('rowspan', currentSpan + belowSpan);
    if (belowCell.textContent.trim()) {
      cell.innerHTML += ` ${belowCell.innerHTML}`;
    }
    belowCell.remove();
    emitChange();
  };

  const deleteTable = () => {
    const cell = activeCellRef.current;
    if (!cell) return;
    const table = cell.closest('table');
    if (!table) return;
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    table.parentNode.insertBefore(p, table);
    table.remove();
    activeCellRef.current = null;
    setShowTableTools(false);
    emitChange();
  };

  // ---- Helper functions ----

  const updateCodeLineNumbers = () => {
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const pres = editor.querySelectorAll('pre');
      pres.forEach((pre) => {
        const lineArr = pre.textContent.split('\n');
        if (lineArr[lineArr.length - 1] === '') lineArr.pop();
        const lineCount = lineArr.length || 1;
        const nums = Array.from(
          { length: lineCount },
          (_, i) => i + 1,
        ).join('\\a ');
        pre.style.setProperty('--line-nums', `"${nums}"`);
      });
    });
  };

  const ensureLeadingParagraph = () => {
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      const first = editor.firstElementChild;
      if (first && first.tagName === 'TABLE') {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        editor.insertBefore(p, first);
      }
    });
  };

  const updatePlaceholder = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const hasContent = editor.textContent.trim().length > 0
      || editor.querySelector('table, img, iframe');
    editor.classList.toggle('is-empty', !hasContent);
  };

  // ---- Format commands ----

  const handleInlineCode = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const editor = editorRef.current;

    let parent = range.commonAncestorContainer;
    if (parent.nodeType === 3) parent = parent.parentElement;
    const existingCode = parent.closest('code');

    if (existingCode && editor.contains(existingCode)) {
      // Toggle OFF: insert a spacer text node after <code> so browser
      // clearly sees the cursor as "outside code" when Enter is pressed
      const spacer = document.createTextNode('\u200B');
      existingCode.after(spacer);
      const newRange = document.createRange();
      newRange.setStart(spacer, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      // Remove empty code elements left behind
      if (!existingCode.textContent.replace(/\u200B/g, '')) existingCode.remove();
    } else if (!range.collapsed) {
      // Wrap selected text in <code>
      const code = document.createElement('code');
      range.surroundContents(code);
      const newRange = document.createRange();
      newRange.selectNodeContents(code);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      // Toggle ON: create empty <code> at cursor and place cursor inside
      const code = document.createElement('code');
      code.textContent = '\u200B';
      range.insertNode(code);
      const newRange = document.createRange();
      newRange.setStart(code.firstChild, 1);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
  };

  const handleCodeBlock = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const editor = editorRef.current;

    let block = sel.anchorNode;
    while (block && block.parentNode !== editor) {
      block = block.parentNode;
    }
    if (!block) return;

    if (block.tagName === 'PRE') {
      // Exit code block: insert a new paragraph after it and move cursor there
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      block.after(p);
      const newRange = document.createRange();
      newRange.setStart(p, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      const pre = document.createElement('pre');
      pre.textContent = block.textContent || '';
      block.replaceWith(pre);
      const newRange = document.createRange();
      newRange.setStart(pre, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    updateCodeLineNumbers();
  };

  const handleBlockquote = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const editor = editorRef.current;

    let block = sel.anchorNode;
    while (block && block.parentNode !== editor) {
      block = block.parentNode;
    }
    if (!block) return;

    if (block.tagName === 'BLOCKQUOTE') {
      const p = document.createElement('p');
      p.innerHTML = block.innerHTML || '<br>';
      block.replaceWith(p);
    } else {
      const bq = document.createElement('blockquote');
      bq.innerHTML = block.innerHTML || '<br>';
      block.replaceWith(bq);
    }
  };

  const handleTableInsert = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const table = document.createElement('table');
    Array.from({ length: 3 }).forEach(() => {
      const tr = document.createElement('tr');
      Array.from({ length: 3 }).forEach(() => {
        const td = document.createElement('td');
        td.innerHTML = '<br>';
        tr.appendChild(td);
      });
      table.appendChild(tr);
    });

    const trailing = document.createElement('p');
    trailing.innerHTML = '<br>';

    let insertAfter = null;
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      let node = sel.anchorNode;
      while (node && node !== editor
        && node.parentNode !== editor) {
        node = node.parentNode;
      }
      if (node && node.parentNode === editor) {
        insertAfter = node;
      }
    }

    if (insertAfter && insertAfter.nextSibling) {
      editor.insertBefore(trailing, insertAfter.nextSibling);
      editor.insertBefore(table, trailing);
    } else {
      editor.appendChild(table);
      editor.appendChild(trailing);
    }

    const firstCell = table.querySelector('td');
    if (firstCell) {
      const domRange = document.createRange();
      domRange.setStart(firstCell, 0);
      domRange.collapse(true);
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(domRange);
      }
    }

    updatePlaceholder();
    emitChange();
    detectTableContext();
  };

  const handleBlockFormat = (tag) => {
    if (!BLOCK_FORMATS[tag]) return;
    document.execCommand('formatBlock', false, tag);
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      document.execCommand('insertImage', false, reader.result);
      updatePlaceholder();
      emitChange();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLinkInsert = () => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    // eslint-disable-next-line no-alert
    const url = prompt('Enter URL:');
    if (!url) return;
    document.execCommand('createLink', false, url);
  };

  const updateActiveFormats = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    if (!editor.contains(sel.anchorNode)) return;

    const fmt = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      strike: document.queryCommandState('strikeThrough'),
      orderedList: document.queryCommandState('insertOrderedList'),
      bulletList: document.queryCommandState('insertUnorderedList'),
    };

    // Walk up from cursor to detect block-level and inline elements
    let node = sel.anchorNode;
    while (node && node !== editor) {
      const tag = node.nodeName;
      if (tag === 'PRE') fmt.codeBlock = true;
      if (tag === 'CODE' && node.parentNode?.nodeName !== 'PRE') fmt.code = true;
      if (tag === 'BLOCKQUOTE') fmt.blockquote = true;
      node = node.parentNode;
    }

    // Detect current block format (p, h1-h6)
    let block = sel.anchorNode;
    while (block && block.parentNode !== editor) {
      block = block.parentNode;
    }
    if (block) {
      const bn = block.nodeName.toLowerCase();
      if (BLOCK_FORMATS[bn]) fmt.blockFormat = bn;
      else fmt.blockFormat = 'p';
    }

    setActiveFormats(fmt);
  };

  const execFormat = (cmd, value) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    switch (cmd) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'strike':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'orderedList':
        document.execCommand('insertOrderedList', false, null);
        break;
      case 'bulletList':
        document.execCommand('insertUnorderedList', false, null);
        break;
      case 'indent':
        document.execCommand('indent', false, null);
        break;
      case 'outdent':
        document.execCommand('outdent', false, null);
        break;
      case 'link':
        handleLinkInsert();
        break;
      case 'image':
        if (fileInputRef.current) fileInputRef.current.click();
        return; // Don't emit change yet — wait for file input
      case 'blockFormat':
        handleBlockFormat(value);
        break;
      case 'code':
        handleInlineCode();
        break;
      case 'codeBlock':
        handleCodeBlock();
        break;
      case 'blockquote':
        handleBlockquote();
        break;
      case 'table':
        handleTableInsert();
        return; // Already calls emitChange
      case 'clean':
        document.execCommand('removeFormat', false, null);
        document.execCommand('unlink', false, null);
        break;
      default:
        break;
    }

    emitChange();
    updateActiveFormats();
  };

  // ---- useEffect: initialise editor and attach events ----

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return undefined;

    // Start with one empty paragraph
    if (!editor.innerHTML.trim()) {
      editor.innerHTML = '<p><br></p>';
    }
    updatePlaceholder();

    // Input handler
    const onInput = () => {
      // Clean up inline <code> artifacts
      editor.querySelectorAll('code').forEach((code) => {
        if (code.closest('pre')) return; // Don't touch code inside pre blocks
        // Strip ZWS from codes that have real content
        if (code.textContent.includes('\u200B') && code.textContent.length > 1) {
          code.textContent = code.textContent.replace(/\u200B/g, '');
        }
        // Unwrap <code> that only contains <br> (browser clones this on Enter)
        if (code.childNodes.length === 1 && code.firstChild.nodeName === 'BR') {
          code.parentNode.insertBefore(code.firstChild, code);
          code.remove();
          return;
        }
        // Remove completely empty <code> elements
        if (!code.childNodes.length) {
          code.remove();
        }
      });
      updatePlaceholder();
      clearImageResize();
      emitChange();
      detectTableContext();
      updateCodeLineNumbers();
      ensureLeadingParagraph();
      updateActiveFormats();
    };
    editor.addEventListener('input', onInput);

    // Selection change
    const onSelectionChange = () => {
      if (document.activeElement === editor
        || editor.contains(document.activeElement)) {
        detectTableContext();
        updateActiveFormats();
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);

    // Click handler for images
    const onEditorClick = (e) => {
      detectTableContext();
      updateActiveFormats();
      if (e.target.tagName === 'IMG') {
        showImageResize(e.target);
      } else if (!e.target.closest('.img-resize-overlay')) {
        clearImageResize();
      }
    };
    editor.addEventListener('click', onEditorClick);

    // Clear resize overlay when clicking outside the editor
    const onDocMouseDown = (e) => {
      if (resizeRef.current
        && !containerRef.current.contains(e.target)) {
        clearImageResize();
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);

    // Keyboard handler for tables and structural keys
    const onKeyDown = (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete'
        && e.key !== 'Enter') return;

      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) return;

      // ── Inside a table cell ──
      let nd = sel.anchorNode;
      let insideTd = false;
      while (nd && nd !== editor) {
        if (nd.nodeName === 'TD') { insideTd = true; break; }
        nd = nd.parentNode;
      }

      if (insideTd) {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const br = document.createElement('br');
          range.insertNode(br);
          range.setStartAfter(br);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          emitChange();
        }
        return;
      }

      // ── Find the direct-child block of the editor ──
      let block = sel.anchorNode;
      while (block && block.parentNode !== editor) {
        block = block.parentNode;
      }
      if (!block) return;

      // ── Enter inside a code block (always handle, even without a table) ──
      if (e.key === 'Enter' && block.nodeName === 'PRE') {
        e.preventDefault();
        e.stopPropagation();
        const range = sel.getRangeAt(0);
        if (!range.collapsed) range.deleteContents();
        const nl = document.createTextNode('\n');
        range.insertNode(nl);
        range.setStartAfter(nl);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        emitChange();
        updateCodeLineNumbers();
        return;
      }

      // ── Enter inside inline <code> — exit code formatting for the new line ──
      if (e.key === 'Enter') {
        let codeNode = sel.anchorNode;
        while (codeNode && codeNode !== editor) {
          if (codeNode.nodeName === 'CODE'
            && codeNode.parentNode?.nodeName !== 'PRE') break;
          codeNode = codeNode.parentNode;
        }
        if (codeNode && codeNode.nodeName === 'CODE') {
          e.preventDefault();
          e.stopPropagation();
          const range = sel.getRangeAt(0);
          // Split: keep text before cursor in <code>, text after goes to new <p>
          const afterRange = document.createRange();
          afterRange.setStart(range.startContainer, range.startOffset);
          afterRange.setEndAfter(codeNode);
          const trailing = afterRange.extractContents().textContent;
          // Remove empty code elements
          if (!codeNode.textContent.replace(/\u200B/g, '')) codeNode.remove();
          const newP = document.createElement('p');
          newP.textContent = trailing.replace(/\u200B/g, '') || '';
          if (!newP.textContent) newP.innerHTML = '<br>';
          block.after(newP);
          const nr = document.createRange();
          nr.setStart(newP, 0);
          nr.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nr);
          emitChange();
          updateActiveFormats();
          return;
        }
      }

      // ── Outside table cells ──
      if (!editor.querySelector('table')) return;

      e.stopPropagation();

      const range = sel.getRangeAt(0);

      // ── Backspace ──
      if (e.key === 'Backspace') {
        if (!range.collapsed) return;

        const preRange = document.createRange();
        preRange.setStart(block, 0);
        preRange.setEnd(range.startContainer, range.startOffset);
        const atStart = preRange.toString().length === 0;

        if (atStart) {
          e.preventDefault();
          const prev = block.previousElementSibling;
          if (!prev || prev.tagName === 'TABLE') return;

          if (prev.lastChild && prev.lastChild.nodeName === 'BR'
            && !prev.textContent.trim()) {
            prev.removeChild(prev.lastChild);
          }
          const mergeNode = prev.lastChild;
          const mergeOff = mergeNode && mergeNode.nodeType === 3
            ? mergeNode.textContent.length : 0;
          const isEmpty = !block.textContent.trim()
            && block.childNodes.length <= 1;
          if (!isEmpty) {
            while (block.firstChild) {
              prev.appendChild(block.firstChild);
            }
          }
          block.remove();
          const nr = document.createRange();
          if (mergeNode && mergeNode.nodeType === 3) {
            nr.setStart(mergeNode, mergeOff);
          } else if (mergeNode) {
            nr.setStartAfter(mergeNode);
          } else {
            nr.setStart(prev, 0);
          }
          nr.collapse(true);
          sel.removeAllRanges();
          sel.addRange(nr);
          emitChange();
        }
        return;
      }

      // ── Delete ──
      if (e.key === 'Delete') {
        if (!range.collapsed) return;

        const postRange = document.createRange();
        postRange.setStart(range.endContainer, range.endOffset);
        postRange.setEnd(block, block.childNodes.length);
        const atEnd = postRange.toString().length === 0;

        if (atEnd) {
          e.preventDefault();
          const next = block.nextElementSibling;
          if (!next || next.tagName === 'TABLE') return;
          const isNextEmpty = !next.textContent.trim()
            && next.childNodes.length <= 1;
          if (!isNextEmpty) {
            while (next.firstChild) {
              block.appendChild(next.firstChild);
            }
          }
          next.remove();
          emitChange();
        }
        return;
      }

      // ── Enter ──
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!range.collapsed) range.deleteContents();

        const newP = document.createElement('p');
        const afterRange = document.createRange();
        afterRange.setStart(range.startContainer, range.startOffset);
        afterRange.setEnd(block, block.childNodes.length);
        const frag = afterRange.extractContents();

        if (frag.textContent.trim() || frag.querySelector('img')) {
          newP.appendChild(frag);
        } else {
          newP.innerHTML = '<br>';
        }
        if (!block.textContent && !block.querySelector('img')) {
          block.innerHTML = '<br>';
        }
        if (block.nextSibling) {
          editor.insertBefore(newP, block.nextSibling);
        } else {
          editor.appendChild(newP);
        }
        const nr = document.createRange();
        nr.setStart(newP, 0);
        nr.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nr);
        emitChange();
      }
    };
    editor.addEventListener('keydown', onKeyDown, true);

    return () => {
      editor.removeEventListener('input', onInput);
      editor.removeEventListener('click', onEditorClick);
      editor.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('mousedown', onDocMouseDown);
    };
  }, []);

  const isValid = charCount >= minChars;

  // ---- Toolbar button helper ----
  const tbBtn = (cmd, title) => html`
    <button type="button"
      className=${`ce-toolbar-btn${activeFormats[cmd] ? ' active' : ''}`}
      title=${title}
      onMouseDown=${(e) => { e.preventDefault(); execFormat(cmd); }}
      dangerouslySetInnerHTML=${{ __html: icons[cmd] || '' }}
    />`;

  return html`
    <div className="ce-editor-wrapper">
      <div className="ce-toolbar">
        <span className="ce-toolbar-group">
          <select className="ce-size-select" title="Block Format"
            value=${activeFormats.blockFormat || 'p'}
            onMouseDown=${(e) => e.stopPropagation()}
            onChange=${(e) => { execFormat('blockFormat', e.target.value); }}>
            <option value="p">Paragraph</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
            <option value="h4">H4</option>
            <option value="h5">H5</option>
            <option value="h6">H6</option>
          </select>
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('bold', 'Bold')}
          ${tbBtn('italic', 'Italic')}
          ${tbBtn('strike', 'Strikethrough')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('code', 'Inline Code')}
          ${tbBtn('codeBlock', 'Code Block')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('link', 'Insert Link')}
          ${tbBtn('image', 'Insert Image')}
          ${tbBtn('blockquote', 'Blockquote')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('orderedList', 'Ordered List')}
          ${tbBtn('bulletList', 'Bullet List')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('outdent', 'Decrease Indent')}
          ${tbBtn('indent', 'Increase Indent')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('table', 'Insert Table')}
        </span>
        <span className="ce-toolbar-group">
          ${tbBtn('clean', 'Clear Formatting')}
        </span>
      </div>
      <div className="ce-container" ref=${containerRef}>
        <div className="ce-editor" ref=${editorRef}
          contentEditable="true"
          data-placeholder="Write your question details here..."
        ></div>
      </div>
      <input type="file" ref=${fileInputRef} accept="image/*"
        style="display:none" onChange=${handleImageFile} />
      ${showTableTools && html`
        <div className="table-toolbar">
          <div className="table-toolbar-group">
            <span className="table-toolbar-label">Row</span>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); addRow('above'); }}
              title="Add Row Above">+ Above</button>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); addRow('below'); }}
              title="Add Row Below">+ Below</button>
            <button type="button" className="table-toolbar-btn table-toolbar-btn-danger"
              onMouseDown=${(e) => { e.preventDefault(); deleteRow(); }}
              title="Delete Row">\u00D7 Delete</button>
          </div>
          <div className="table-toolbar-group">
            <span className="table-toolbar-label">Column</span>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); addColumn('left'); }}
              title="Add Column Left">+ Left</button>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); addColumn('right'); }}
              title="Add Column Right">+ Right</button>
            <button type="button" className="table-toolbar-btn table-toolbar-btn-danger"
              onMouseDown=${(e) => { e.preventDefault(); deleteColumn(); }}
              title="Delete Column">\u00D7 Delete</button>
          </div>
          <div className="table-toolbar-group">
            <span className="table-toolbar-label">Merge</span>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); mergeCellRight(); }}
              title="Merge Cell Right">\u2192 Right</button>
            <button type="button" className="table-toolbar-btn"
              onMouseDown=${(e) => { e.preventDefault(); mergeCellDown(); }}
              title="Merge Cell Down">\u2193 Down</button>
          </div>
          <div className="table-toolbar-group">
            <button type="button" className="table-toolbar-btn table-toolbar-btn-danger"
              onMouseDown=${(e) => { e.preventDefault(); deleteTable(); }}
              title="Delete Table">\u00D7 Delete Table</button>
          </div>
        </div>
      `}
      ${!isValid && html`
        <div className=${`char-counter ${charCount > 0 ? 'warning' : ''}`}>
          ${charCount} / ${minChars} characters minimum
        </div>
      `}
    </div>
  `;
}

// ============================================
// CATEGORY SEARCH
// ============================================

function CategorySearch({ value, onChange, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const searchValue = e.target.value;
    onChange(searchValue);

    if (searchValue.trim()) {
      const filtered = EXISTING_CATEGORIES.filter(
        (cat) => cat.toLowerCase().includes(
          searchValue.toLowerCase(),
        ),
      );
      setFilteredCategories(filtered);
      setIsOpen(true);
    } else {
      setFilteredCategories([]);
      setIsOpen(false);
    }
  };

  const handleSelectCategory = (category) => {
    onSelect(category);
    onChange('');
    setIsOpen(false);
  };

  const handleAddNewCategory = () => {
    onSelect(value);
    onChange('');
    setIsOpen(false);
  };

  const showAddButton = value.trim()
    && !EXISTING_CATEGORIES.some((cat) => cat.toLowerCase() === value.toLowerCase());

  return html`
    <div className="category-search-wrapper" ref=${wrapperRef}>
      <input
        ref=${inputRef}
        type="text"
        value=${value}
        onInput=${handleInputChange}
        onFocus=${() => value.trim() && setIsOpen(true)}
        placeholder="Search for a category..."
      />
      ${isOpen && (filteredCategories.length > 0 || showAddButton) && html`
        <div className="category-dropdown">
          ${filteredCategories.map((category) => html`
            <div
              key=${category}
              className="category-option"
              onClick=${() => handleSelectCategory(category)}
            >
              ${category}
            </div>
          `)}
          ${showAddButton && html`
            <div className="add-category-btn" onClick=${handleAddNewCategory}>
              Create "${value}"
            </div>
          `}
        </div>
      `}
    </div>
  `;
}

// ============================================
// TAGS INPUT
// ============================================

function TagsInput({ tags, onTagsChange, maxTags = 5 }) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  // Mock tag suggestions - replace with your actual data
  const TAG_SUGGESTIONS = [
    'sql-server', 'objective-c', 'ajax', 'javascript', 'python',
    'java', 'react', 'node.js', 'css', 'html', 'angular',
    'vue', 'typescript', 'mongodb', 'postgresql',
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const { value } = e.target;
    setInputValue(value);

    if (value.trim()) {
      const filtered = TAG_SUGGESTIONS.filter(
        (tag) => tag.toLowerCase().includes(
          value.toLowerCase(),
        ) && !tags.includes(tag),
      );
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const addTag = (tag) => {
    if (tags.length < maxTags && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
      setInputValue('');
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  const removeTag = (tagToRemove) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue.trim());
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return html`
    <div className="tags-wrapper" ref=${wrapperRef}>
      <div className="tags-input-container">
        ${tags.map((tag) => html`
          <span key=${tag} className="tag-chip">
            ${tag}
            <button
              type="button"
              className="tag-remove"
              onClick=${() => removeTag(tag)}
              aria-label=${`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        `)}
        <input
          ref=${inputRef}
          type="text"
          className="tags-input"
          value=${inputValue}
          onInput=${handleInputChange}
          onKeyDown=${handleKeyDown}
          onFocus=${() => inputValue.trim() && setIsOpen(true)}
          placeholder=${tags.length === 0 ? 'e.g. (sql-server objective-c ajax)' : ''}
          disabled=${tags.length >= maxTags}
        />
      </div>
      ${isOpen && suggestions.length > 0 && html`
        <div className="tags-dropdown">
          ${suggestions.map((tag) => html`
            <div
              key=${tag}
              className="tag-option"
              onClick=${() => addTag(tag)}
            >
              ${tag}
            </div>
          `)}
        </div>
      `}
      ${tags.length === 0 && html`
        <div className="tags-helper">
          Add at least 1 tag
        </div>
      `}
    </div>
  `;
}

// ============================================
// PREVIEW MODAL
// ============================================

function PreviewModal({
  title, category, body, tags, onBack, onPost,
}) {
  const bodyRef = useRef(null);

  // Add line numbers to code blocks after the body HTML is rendered
  useEffect(() => {
    if (!bodyRef.current) return;
    bodyRef.current.querySelectorAll('pre').forEach((pre) => {
      const lineArr = pre.textContent.split('\n');
      if (lineArr[lineArr.length - 1] === '') lineArr.pop();
      const lineCount = lineArr.length || 1;
      const nums = Array.from(
        { length: lineCount },
        (_, i) => i + 1,
      ).join('\\a ');
      pre.style.setProperty('--line-nums', `"${nums}"`);
    });
  }, [body]);

  return html`
    <div className="preview-modal-overlay" onClick=${onBack}>
      <div className="preview-modal" onClick=${(e) => e.stopPropagation()}>
        <div className="preview-modal-body">
          <div className="preview-post">
            ${tags.length > 0 && html`
              <div className="preview-tags">
                ${tags.map((tag) => html`
                  <span key=${tag} className="preview-tag">#${tag}</span>
                `)}
              </div>
            `}
            <h1 className="preview-title">${title}</h1>
            <div className="preview-meta">
              <span className="preview-author">You</span>
              ${category && html`
                <span className="preview-meta-sep">\u00B7</span>
                <span className="preview-category">${category}</span>
              `}
            </div>
            <div
              ref=${bodyRef}
              className="preview-body-content"
              dangerouslySetInnerHTML=${{ __html: body }}
            />
          </div>
        </div>
        <div className="preview-modal-footer">
          <button type="button" className="btn btn-cancel" onClick=${onBack}>
            Back to Edit
          </button>
          <button type="button" className="btn btn-submit btn-ready" onClick=${onPost}>
            Post
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// CREATE POST
// ============================================

function CreatePost() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [body, setBody] = useState('');
  const [bodyJson, setBodyJson] = useState(null);
  const [tags, setTags] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Single mutable ref that always holds the latest post JSON
  const postDataRef = useRef({
    title: '', category: '', body: null, tags: [],
  });

  const handleBodyChange = (htmlContent, jsonContent) => {
    setBody(htmlContent);
    setBodyJson(jsonContent);
  };

  // Update the single ref in-place whenever any field changes
  useEffect(() => {
    postDataRef.current = {
      title,
      category,
      body: bodyJson,
      tags,
    };
    // eslint-disable-next-line no-console
    console.clear();
    // eslint-disable-next-line no-console
    console.log('Live post JSON:', postDataRef.current);
  }, [title, category, bodyJson, tags]);

  const missingFields = [];
  if (title.length < 15) missingFields.push('Title (min 15 characters)');
  if (!category) missingFields.push('Category');
  if (body.replace(/<[^>]*>/g, '').length < 20) missingFields.push('Body (min 20 characters)');
  if (tags.length === 0) missingFields.push('Tags (at least 1)');
  const isFormValid = missingFields.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) return;
    setShowPreview(true);
  };

  const handlePost = async () => {
    // Prepend # to each tag before sending to the backend
    const tagsWithHash = tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    const postData = {
      title,
      category,
      body,
      tags: tagsWithHash,
    };

    // eslint-disable-next-line no-console
    console.log('Sending post data:', postData);

    try {
      const response = await fetch('http://localhost:5000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      const result = await response.json();

      if (response.ok) {
        // eslint-disable-next-line no-console
        console.log('Post created successfully:', result);
        showToast('Your question has been posted successfully!', 'success');
        // Reset form
        setTitle('');
        setCategory('');
        setBody('');
        setBodyJson(null);
        setTags([]);
      } else {
        // eslint-disable-next-line no-console
        console.error('Error creating post:', result.error);
        showToast(result.error || 'Failed to create post', 'error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Network error:', error);
      showToast('Network error: Unable to connect to the server.', 'error');
    }

    setShowPreview(false);
  };

  const handleCancel = () => {
    // eslint-disable-next-line no-alert, no-restricted-globals
    if (confirm('Are you sure you want to discard this post?')) {
      setTitle('');
      setCategory('');
      setBody('');
      setBodyJson(null);
      setTags([]);
    }
  };

  return html`
    <div className="create-post">
      <h1>
        Post your thoughts
        <span className="required-text">Required fields *</span>
      </h1>

      <form onSubmit=${handleSubmit}>
        <div className="form-group">
          <label>
            Title<span className="required">*</span>
          </label>
          <p className="helper-text">
            Be specific and imagine you're asking a question to another person. Min 15 characters.
          </p>
          <input
            type="text"
            value=${title}
            onInput=${(e) => setTitle(e.target.value)}
            placeholder=""
          />
          ${title.length < 15 && html`
            <div className=${`char-counter ${title.length > 0 ? 'warning' : ''}`}>
              ${title.length} / 15 characters minimum
            </div>
          `}
        </div>

        <div className="form-group">
          <label>
            Category<span className="required">*</span>
          </label>
          <p className="helper-text">
            Search for an existing category or create a new one.
          </p>
          ${category ? html`
            <div className="category-chip">
              <span>${category}</span>
              <button
                type="button"
                className="category-remove"
                onClick=${() => setCategory('')}
                aria-label="Remove category"
              >
                ×
              </button>
            </div>
          ` : html`
            <${CategorySearch}
              value=${categorySearch}
              onChange=${setCategorySearch}
              onSelect=${setCategory}
            />
          `}
        </div>

        <div className="form-group">
          <label>
            Body<span className="required">*</span>
          </label>
          <p className="helper-text">
            Include all the information someone would need to answer your question. Min 20 characters.
          </p>
          <${RichTextEditor}
            onChange=${handleBodyChange}
            minChars=${20}
          />
        </div>

        <div className="form-group">
          <label>
            Tags<span className="required">*</span>
          </label>
          <p className="helper-text">
            Add up to 5 tags to describe what your question is about. Start typing to see suggestions.
          </p>
          <${TagsInput}
            tags=${tags}
            onTagsChange=${setTags}
            maxTags=${5}
          />
        </div>

        <div className="submit-section">
          <button type="button" className="btn btn-cancel" onClick=${handleCancel}>
            Cancel
          </button>
          <div className="submit-btn-wrapper">
            <button
              type="submit"
              className=${`btn btn-submit ${isFormValid ? 'btn-ready' : 'btn-incomplete'}`}
              disabled=${!isFormValid}
            >
              Post
            </button>
            ${!isFormValid && html`
              <div className="submit-tooltip">
                <strong>Missing fields:</strong>
                <ul>
                  ${missingFields.map((f) => html`<li key=${f}>${f}</li>`)}
                </ul>
              </div>
            `}
          </div>
        </div>
      </form>
      ${showPreview && html`
        <${PreviewModal}
          title=${title}
          category=${category}
          body=${body}
          tags=${tags}
          onBack=${() => setShowPreview(false)}
          onPost=${handlePost}
        />
      `}
      ${toast && html`
        <div className=${`cp-toast cp-toast-${toast.type}`}>
          <span className="cp-toast-msg">${toast.message}</span>
          <button type="button" className="cp-toast-close" onClick=${() => setToast(null)}
            aria-label="Dismiss">\u00D7</button>
        </div>
      `}
    </div>
  `;
}

export default function decorate(block) {
  const app = html`<${CreatePost} />`;
  render(app, block);
}
