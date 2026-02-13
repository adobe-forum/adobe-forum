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

const ICON_BASE_PATH = '/icons';

async function loadIcon(name) {
  const resp = await fetch(`${ICON_BASE_PATH}/${name}.svg`);
  return resp.text();
}

async function loadIcons(names) {
  const entries = await Promise.all(
    names.map(async (name) => [name, await loadIcon(name)]),
  );
  return Object.fromEntries(entries);
}

function ToolbarIcon({ svgMarkup }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && svgMarkup) {
      ref.current.innerHTML = svgMarkup;
    }
  }, [svgMarkup]);
  return html`<span className="toolbar-icon" ref=${ref} />`;
}

function RichTextToolbar({ onFormat, activeFormats }) {
  const [icons, setIcons] = useState({});
  const [fontSizeOpen, setFontSizeOpen] = useState(false);
  const fontSizeRef = useRef(null);

  useEffect(() => {
    const iconNames = [
      'font-size', 'bold', 'italic', 'strikethrough',
      'code', 'code-block', 'superscript', 'link', 'quote', 'image', 'table',
      'ordered-list', 'unordered-list', 'indent',
      'help',
      'preview',
    ];
    loadIcons(iconNames).then(setIcons);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fontSizeRef.current
        && !fontSizeRef.current.contains(e.target)) {
        setFontSizeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener(
      'mousedown',
      handleClickOutside,
    );
  }, []);

  const fontSizes = [
    { label: 'Small', value: '2' },
    { label: 'Normal', value: '3' },
    { label: 'Large', value: '4' },
    { label: 'Huge', value: '5' },
  ];

  const formatButtons = [
    { iconName: 'bold', command: 'bold', label: 'Bold' },
    { iconName: 'italic', command: 'italic', label: 'Italic' },
    { iconName: 'strikethrough', command: 'strikeThrough', label: 'Strikethrough' },
  ];

  const insertButtons = [
    { iconName: 'code', command: 'code', label: 'Inline Code' },
    { iconName: 'code-block', command: 'codeBlock', label: 'Code Block' },
    { iconName: 'superscript', command: 'superscript', label: 'Superscript' },
    { iconName: 'link', command: 'link', label: 'Insert Link' },
    { iconName: 'quote', command: 'quote', label: 'Quote' },
    { iconName: 'image', command: 'image', label: 'Insert Image' },
    { iconName: 'table', command: 'table', label: 'Insert Table' },
  ];

  const listButtons = [
    { iconName: 'ordered-list', command: 'insertOrderedList', label: 'Numbered List' },
    { iconName: 'unordered-list', command: 'insertUnorderedList', label: 'Bulleted List' },
    { iconName: 'indent', command: 'indent', label: 'Indent' },
  ];

  const moreButtons = [
    { iconName: 'help', command: 'help', label: 'Help' },
  ];

  const viewButtons = [
    { iconName: 'preview', command: 'preview', label: 'Preview' },
  ];

  const renderButtons = (buttons) => buttons.map((btn) => html`
    <button
      key=${btn.command}
      className=${`toolbar-btn ${activeFormats.includes(btn.command) ? 'active' : ''}`}
      onClick=${() => onFormat(btn.command)}
      title=${btn.label}
      type="button"
    >
      <${ToolbarIcon} svgMarkup=${icons[btn.iconName]} />
    </button>
  `);

  return html`
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <div className="font-size-wrapper" ref=${fontSizeRef}>
          <button
            type="button"
            className=${`toolbar-btn ${fontSizeOpen ? 'active' : ''}`}
            onClick=${() => setFontSizeOpen(!fontSizeOpen)}
            title="Font Size"
          >
            <${ToolbarIcon} svgMarkup=${icons['font-size']} />
          </button>
          ${fontSizeOpen && html`
            <div className="font-size-dropdown">
              ${fontSizes.map((fs) => html`
                <div
                  key=${fs.value}
                  className="font-size-option"
                  onClick=${() => {
    onFormat(`fontSize:${fs.value}`);
    setFontSizeOpen(false);
  }}
                >
                  <span style=${{ fontSize: `${fs.value * 4 + 6}px` }}>${fs.label}</span>
                </div>
              `)}
            </div>
          `}
        </div>
        ${renderButtons(formatButtons)}
      </div>
      <div className="toolbar-group">${renderButtons(insertButtons)}</div>
      <div className="toolbar-group">${renderButtons(listButtons)}</div>
      <div className="toolbar-group">${renderButtons(moreButtons)}</div>
      <div className="toolbar-group">${renderButtons(viewButtons)}</div>
    </div>
  `;
}

function CodeBlockModal({ onInsert, onClose }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const textareaRef = useRef(null);
  const langRef = useRef(null);

  const languages = [
    '', 'javascript', 'python', 'java', 'html', 'css',
    'sql', 'typescript', 'bash', 'json', 'xml', 'php', 'ruby', 'go', 'rust',
  ];

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInsert = () => {
    if (code.trim()) {
      onInsert(code, language);
    }
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newCode = `${code.substring(0, start)}  ${code.substring(end)}`;
      setCode(newCode);
      requestAnimationFrame(() => {
        ta.selectionStart = start + 2;
        ta.selectionEnd = start + 2;
      });
    }
  };

  return html`
    <div className="code-modal-overlay" onClick=${onClose}>
      <div className="code-modal" onClick=${(e) => e.stopPropagation()}>
        <div className="code-modal-header">
          <h3>Insert Code Block</h3>
          <button type="button" className="code-modal-close" onClick=${onClose}>×</button>
        </div>
        <div className="code-modal-body">
          <label className="code-modal-label">
            Language
            <div className="lang-select-wrapper" ref=${langRef}>
              <button
                type="button"
                className="lang-select-btn"
                onClick=${() => setLangOpen(!langOpen)}
              >
                ${language || 'Plain text'}
                <span className="lang-select-arrow">${langOpen ? '\u25B2' : '\u25BC'}</span>
              </button>
              ${langOpen && html`
                <div className="lang-select-dropdown">
                  ${languages.map((lang) => html`
                    <div
                      key=${lang}
                      className=${`lang-select-option ${language === lang ? 'selected' : ''}`}
                      onClick=${() => { setLanguage(lang); setLangOpen(false); }}
                    >
                      ${lang || 'Plain text'}
                    </div>
                  `)}
                </div>
              `}
            </div>
          </label>
          <textarea
            ref=${textareaRef}
            className="code-modal-textarea"
            value=${code}
            onInput=${(e) => setCode(e.target.value)}
            onKeyDown=${handleKeyDown}
            placeholder="Paste or type your code here..."
            rows="10"
          />
        </div>
        <div className="code-modal-footer">
          <button type="button" className="btn btn-cancel" onClick=${onClose}>Cancel</button>
          <button type="button" className="btn btn-submit" onClick=${handleInsert}>Insert Code</button>
        </div>
      </div>
    </div>
  `;
}

function RichTextEditor({ value, onChange, minChars = 20 }) {
  const [activeFormats, setActiveFormats] = useState([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const updateActiveFormats = () => {
    const formats = [];
    if (document.queryCommandState('bold')) formats.push('bold');
    if (document.queryCommandState('italic')) formats.push('italic');
    if (document.queryCommandState('strikeThrough')) {
      formats.push('strikeThrough');
    }
    if (document.queryCommandState('superscript')) {
      formats.push('superscript');
    }
    if (document.queryCommandState('insertOrderedList')) {
      formats.push('insertOrderedList');
    }
    if (document.queryCommandState('insertUnorderedList')) {
      formats.push('insertUnorderedList');
    }

    const selection = window.getSelection();
    if (selection.rangeCount) {
      const anchor = selection.anchorNode?.parentElement;
      if (anchor) {
        const codeParent = anchor.closest('code');
        if (codeParent && !codeParent.closest('pre')) {
          formats.push('code');
        }
        if (codeParent && codeParent.closest('pre')) {
          formats.push('codeBlock');
        }
        if (anchor.closest('a')) formats.push('link');
        if (anchor.closest('blockquote')) formats.push('quote');
      }
    }
    setActiveFormats(formats);
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
      updateActiveFormats();
    }
  };

  const toggleInlineCode = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const codeParent = selection
      .anchorNode?.parentElement?.closest('code');

    if (codeParent && !codeParent.closest('pre')) {
      const parent = codeParent.parentNode;
      while (codeParent.firstChild) {
        parent.insertBefore(codeParent.firstChild, codeParent);
      }
      parent.removeChild(codeParent);
    } else if (!range.collapsed) {
      const code = document.createElement('code');
      range.surroundContents(code);
    }
    handleInput();
  };

  const insertCodeBlock = (code, language) => {
    editorRef.current?.focus();
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langAttr = language
      ? ` class="language-${language}"`
      : '';
    const lines = escaped.split('\n');
    const numberedLines = lines
      .map((line) => `<div class="code-line">${line || ' '}</div>`)
      .join('');
    const langLabel = language
      ? `<div class="code-lang-label">${language}</div>`
      : '';
    const blockHtml = `<pre>${langLabel}`
      + `<code${langAttr}>${numberedLines}</code>`
      + '</pre><p><br></p>';
    document.execCommand('insertHTML', false, blockHtml);
    handleInput();
  };

  const handleFormat = (command) => {
    if (command.startsWith('fontSize:')) {
      const size = command.split(':')[1];
      document.execCommand('fontSize', false, size);
      handleInput();
      return;
    }
    if (command === 'link') {
      // eslint-disable-next-line no-alert
      const url = prompt('Enter URL:');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    } else if (command === 'code') {
      toggleInlineCode();
      return;
    } else if (command === 'codeBlock') {
      setShowCodeModal(true);
      return;
    } else if (command === 'image') {
      fileInputRef.current?.click();
      return;
    } else if (command === 'indent') {
      const selection = window.getSelection();
      if (!selection.rangeCount) return;
      const anchor = selection.anchorNode;
      const editor = editorRef.current;
      if (!editor) return;
      let node = anchor?.nodeType === 3
        ? anchor.parentElement : anchor;
      if (node === editor) {
        document.execCommand('formatBlock', false, 'p');
        node = selection.anchorNode?.nodeType === 3
          ? selection.anchorNode.parentElement
          : selection.anchorNode;
      }
      let block = null;
      while (node && node !== editor) {
        if (node.parentElement === editor) {
          block = node;
          break;
        }
        node = node.parentElement;
      }
      if (block) {
        const current = parseInt(
          block.style.marginLeft || '0',
          10,
        );
        block.style.marginLeft = `${current + 40}px`;
      }
      handleInput();
      return;
    } else if (command === 'quote') {
      const selection = window.getSelection();
      const anchor = selection.rangeCount
        && selection.anchorNode;
      const el = anchor?.nodeType === 3
        ? anchor.parentElement : anchor;
      const blockquote = el?.closest('blockquote');
      if (blockquote) {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        blockquote.parentNode.insertBefore(
          p,
          blockquote.nextSibling,
        );
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
      } else {
        document.execCommand(
          'formatBlock',
          false,
          'blockquote',
        );
      }
    } else {
      document.execCommand(command, false, null);
    }
    updateActiveFormats();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editorRef.current?.focus();
      const imgHtml = '<img src="'
        + `${reader.result}" alt="${file.name}"`
        + ' style="max-width:100%;height:auto;" />'
        + '<p><br></p>';
      document.execCommand('insertHTML', false, imgHtml);
      handleInput();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const normalizeCodeBlocks = () => {
    if (!editorRef.current) return;
    const pres = editorRef.current.querySelectorAll('pre');
    pres.forEach((pre) => {
      let code = pre.querySelector('code');
      if (!code) {
        code = document.createElement('code');
        code.textContent = pre.textContent;
        pre.innerHTML = '';
        pre.appendChild(code);
      }
      if (code.querySelector('.code-line')) return;
      const text = code.textContent;
      const lines = text.split('\n');
      code.innerHTML = '';
      lines.forEach((line) => {
        const div = document.createElement('div');
        div.className = 'code-line';
        div.textContent = line || ' ';
        code.appendChild(div);
      });
    });
  };

  const handlePaste = () => {
    setTimeout(() => {
      normalizeCodeBlocks();
      handleInput();
    }, 0);
  };

  const handleEditorKeyDown = (e) => {
    if (e.key === 'Enter') {
      const selection = window.getSelection();
      const anchor = selection.rangeCount && selection.anchorNode;
      if (!anchor) return;

      const el = anchor.nodeType === 3 ? anchor.parentElement : anchor;
      const blockquote = el?.closest('blockquote');
      if (blockquote) {
        const text = anchor.textContent || '';
        if (text.trim() === '') {
          e.preventDefault();
          // Remove the empty line inside the blockquote
          const currentBlock = el.closest('div, p') || el;
          if (currentBlock !== blockquote) {
            blockquote.removeChild(currentBlock);
          }
          // Insert a new paragraph after the blockquote
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          blockquote.parentNode.insertBefore(p, blockquote.nextSibling);
          // Move cursor into the new paragraph
          const range = document.createRange();
          range.setStart(p, 0);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          handleInput();
        }
      }
    }
  };

  const charCount = editorRef.current?.textContent?.length || 0;
  const isValid = charCount >= minChars;

  return html`
    <div className="editor-wrapper">
      <${RichTextToolbar} onFormat=${handleFormat} activeFormats=${activeFormats} />
      <div
        ref=${editorRef}
        className="editor-content"
        contentEditable
        onInput=${handleInput}
        onPaste=${handlePaste}
        onKeyDown=${handleEditorKeyDown}
        onKeyUp=${updateActiveFormats}
        onClick=${updateActiveFormats}
        data-placeholder=""
        dangerouslySetInnerHTML=${{ __html: value }}
      />
      <div className=${`char-counter ${!isValid && charCount > 0 ? 'warning' : ''}`}>
        ${charCount} / ${minChars} characters minimum
      </div>
    </div>
    <input
      ref=${fileInputRef}
      type="file"
      accept="image/*"
      style=${{ display: 'none' }}
      onChange=${handleImageUpload}
    />
    ${showCodeModal && html`
      <${CodeBlockModal}
        onInsert=${insertCodeBlock}
        onClose=${() => setShowCodeModal(false)}
      />
    `}
  `;
}

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
      <div className="tags-helper">
        ${tags.length}/${maxTags} tags used
      </div>
    </div>
  `;
}

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

function CreatePost() {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

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
        alert('Your question has been posted successfully!');
        // Reset form
        setTitle('');
        setCategory('');
        setBody('');
        setTags([]);
      } else {
        // eslint-disable-next-line no-console
        console.error('Error creating post:', result.error);
        alert(`Error: ${result.error || 'Failed to create post'}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Network error:', error);
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
          <div className=${`char-counter ${title.length < 15 && title.length > 0 ? 'warning' : ''}`}>
            ${title.length} / 15 characters minimum
          </div>
        </div>

        <div className="form-group">
          <label>
            Category<span className="required">*</span>
          </label>
          <p className="helper-text">
            Search for an existing category or create a new one.
          </p>
          ${category ? html`
            <div>
              <input
                type="text"
                value=${category}
                readOnly
                style=${{ backgroundColor: '#f6f7f8' }}
              />
              <button
                type="button"
                onClick=${() => setCategory('')}
                style=${{ marginTop: '8px', padding: '4px 12px', fontSize: '12px' }}
              >
                Change Category
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
            value=${body}
            onChange=${setBody}
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
