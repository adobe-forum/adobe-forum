/* eslint-disable max-classes-per-file */
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
// QUILL LOADER
// ============================================

let quillLoaded = false;

function loadQuill() {
  if (quillLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/qill/quill.snow.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = '/vendor/qill/quill.min.js';
    script.onload = () => {
      quillLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Quill'));
    document.head.appendChild(script);
  });
}

// ============================================
// QUILL EDITOR COMPONENT
// ============================================

function QuillEditor({ onChange, minChars = 20 }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const activeCellRef = useRef(null);
  const [charCount, setCharCount] = useState(0);
  const [showTableTools, setShowTableTools] = useState(false);

  const emitChange = () => {
    const quill = quillRef.current;
    if (!quill) return;
    const editorEl = quill.root;
    const htmlContent = editorEl.innerHTML;
    const jsonContent = domToJson(editorEl);
    const textLength = quill.getText().trim().length;
    setCharCount(textLength);
    onChange(htmlContent, jsonContent);
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

  useEffect(() => {
    if (!containerRef.current) return undefined;

    loadQuill().then(() => {
      if (quillRef.current) return;

      // Register table blots so Quill recognises table elements
      /* eslint-disable no-undef */
      const Block = Quill.import('blots/block');
      const Container = Quill.import('blots/container');

      class TableCell extends Block {}
      TableCell.blotName = 'td';
      TableCell.tagName = 'TD';

      class TableRow extends Container {}
      TableRow.blotName = 'tr';
      TableRow.tagName = 'TR';
      TableRow.allowedChildren = [TableCell];
      TableRow.defaultChild = TableCell;

      class TableBody extends Container {}
      TableBody.blotName = 'tbody';
      TableBody.tagName = 'TBODY';
      TableBody.allowedChildren = [TableRow];
      TableBody.defaultChild = TableRow;

      class TableBlot extends Container {}
      TableBlot.blotName = 'table';
      TableBlot.tagName = 'TABLE';
      TableBlot.allowedChildren = [TableBody, TableRow];
      TableBlot.defaultChild = TableRow;

      Quill.register(TableCell);
      Quill.register(TableRow);
      Quill.register(TableBody);
      Quill.register(TableBlot);

      const quill = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder: 'Write your question details here...',
        modules: {
          toolbar: {
            container: [
              [{ size: ['small', false, 'large', 'huge'] }],
              ['bold', 'italic', 'strike'],
              ['code', 'code-block'],
              ['link', 'image', 'blockquote'],
              [{ list: 'ordered' }, { list: 'bullet' }],
              [{ indent: '-1' }, { indent: '+1' }],
              ['table'],
              ['clean'],
            ],
            handlers: {
              table() {
                const editor = quill.root;

                // Build a 3x3 table
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

                // Trailing paragraph so the cursor can escape below
                const trailing = document.createElement('p');
                trailing.innerHTML = '<br>';

                // Find the block-level node at the cursor
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

                // Pause Quill's MutationObserver so it won't strip
                // the table during its optimize pass
                const obs = quill.scroll && quill.scroll.observer;
                if (obs) obs.disconnect();

                if (insertAfter && insertAfter.nextSibling) {
                  editor.insertBefore(trailing, insertAfter.nextSibling);
                  editor.insertBefore(table, trailing);
                } else {
                  editor.appendChild(table);
                  editor.appendChild(trailing);
                }

                // Resume observing
                if (obs) {
                  obs.observe(editor, {
                    attributes: true,
                    characterData: true,
                    characterDataOldValue: true,
                    childList: true,
                    subtree: true,
                  });
                }

                // Place cursor in the first cell
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

                emitChange();
                detectTableContext();
              },
            },
          },
        },
      });
      /* eslint-enable no-undef */

      // Custom icons — toolbar is a sibling, so query from parent
      const wrapper = containerRef.current.parentElement;
      if (wrapper) {
        const codeBtn = wrapper.querySelector('.ql-code');
        if (codeBtn) {
          codeBtn.innerHTML = '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="5 7 1 9 5 11" fill="none" stroke-width="1.5"/><polyline class="ql-stroke" points="13 7 17 9 13 11" fill="none" stroke-width="1.5"/><line class="ql-stroke" x1="10" y1="4" x2="8" y2="14" stroke-width="1.5"/></svg>';
        }
        const codeBlockBtn = wrapper.querySelector('.ql-code-block');
        if (codeBlockBtn) {
          codeBlockBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" x="1" y="2" width="16" height="14" rx="2" fill="none" stroke-width="1.2"/><line class="ql-stroke" x1="4" y1="6" x2="8" y2="6" stroke-width="1.2"/><line class="ql-stroke" x1="4" y1="9" x2="11" y2="9" stroke-width="1.2"/><line class="ql-stroke" x1="4" y1="12" x2="7" y2="12" stroke-width="1.2"/></svg>';
        }
        const tableBtn = wrapper.querySelector('.ql-table');
        if (tableBtn) {
          tableBtn.innerHTML = '<svg viewBox="0 0 18 18"><rect class="ql-stroke" height="12" width="12" x="3" y="3" fill="none" stroke-width="1"/><line class="ql-stroke" x1="3" y1="7" x2="15" y2="7"/><line class="ql-stroke" x1="3" y1="11" x2="15" y2="11"/><line class="ql-stroke" x1="7" y1="3" x2="7" y2="15"/><line class="ql-stroke" x1="11" y1="3" x2="11" y2="15"/></svg>';
        }
      }

      quillRef.current = quill;

      quill.on('text-change', () => {
        emitChange();
        detectTableContext();
      });

      quill.on('selection-change', () => {
        detectTableContext();
      });

      // Detect table context on click inside editor
      quill.root.addEventListener('click', detectTableContext);
    });

    return undefined;
  }, []);

  const isValid = charCount >= minChars;

  return html`
    <div className="quill-editor-wrapper">
      <div ref=${containerRef} />
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
  return html`
    <div className="preview-modal-overlay" onClick=${onBack}>
      <div className="preview-modal" onClick=${(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h2>Preview Your Question</h2>
        </div>
        <div className="preview-modal-body">
          <div className="preview-field">
            <span className="preview-label">Title</span>
            <h3 className="preview-title">${title}</h3>
          </div>
          <div className="preview-field">
            <span className="preview-label">Category</span>
            <span className="preview-category">${category}</span>
          </div>
          <div className="preview-field">
            <span className="preview-label">Body</span>
            <div
              className="preview-body-content"
              dangerouslySetInnerHTML=${{ __html: body }}
            />
          </div>
          <div className="preview-field">
            <span className="preview-label">Tags</span>
            <div className="preview-tags">
              ${tags.map((tag) => html`
                <span key=${tag} className="preview-tag">${tag}</span>
              `)}
            </div>
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
        // eslint-disable-next-line no-alert
        alert('Your question has been posted successfully!');
        // Reset form
        setTitle('');
        setCategory('');
        setBody('');
        setBodyJson(null);
        setTags([]);
      } else {
        // eslint-disable-next-line no-console
        console.error('Error creating post:', result.error);
        // eslint-disable-next-line no-alert
        alert(`Error: ${result.error || 'Failed to create post'}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Network error:', error);
      // eslint-disable-next-line no-alert
      alert('Network error: Unable to connect to the server. Make sure the server is running.');
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
        Ask question
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
          <${QuillEditor}
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
              Post Question
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
    </div>
  `;
}

export default function decorate(block) {
  const app = html`<${CreatePost} />`;
  render(app, block);
}
