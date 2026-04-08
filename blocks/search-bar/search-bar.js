import { h, render } from '../../vendor/preact.js';
import { useRef, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

// Bind HTM to Preact's hyperscript function
const html = htm.bind(h);

function SearchBar({ initialPlaceholder }) {
  // Pull initial query from the browser URL parameter if a shared link was used
  const initialQuery = new URLSearchParams(window.location.search).get('search') || '';
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef(null);

  const executeSearch = (q) => {
    window.dispatchEvent(new CustomEvent('search-posts', { detail: { query: q !== undefined ? q : query } }));
  };

  const handleInput = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    executeSearch('');
    // Refocus the input box so the user can immediately type again
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch();
  };

  // 2. Return the UI using HTM
  return html`
    <form class="search-form" action="#" novalidate onSubmit=${handleSubmit}>
      <div class="search-form-inner">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" focusable="false" aria-hidden="true">
          <path d="M12.5 11h-.79l-.28-.27A6.471 6.471 0 0 0 13 6.5 6.5 6.5 0 1 0 6.5 13c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0C4.01 11 2 8.99 2 6.5S4.01 2 6.5 2 11 4.01 11 6.5 8.99 11 6.5 11z"/>
        </svg>
        
        <input
          ref=${inputRef}
          type="search"
          class="search-input"
          placeholder=${initialPlaceholder}
          aria-label="Search posts"
          autocomplete="off"
          value=${query}
          onInput=${handleInput}
        />
        
        <button 
          type="button" 
          class="search-clear ${query.length > 0 ? 'is-visible' : ''}" 
          aria-label="Clear search"
          onClick=${handleClear}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" focusable="false" aria-hidden="true">
            <path d="M13 6.06L11.94 5 9 7.94 6.06 5 5 6.06 7.94 9 5 11.94 6.06 13 9 10.06 11.94 13 13 11.94 10.06 9z"/>
          </svg>
        </button>
        <button type="submit" class="search-submit" aria-label="Search">
           Search
        </button>
      </div>
    </form>
  `;
}

// 3. Keep the standard decorate function to mount the Preact component
export default function decorate(block) {
  // Read placeholder from da.live BEFORE clearing
  const placeholder = block.querySelector('div')?.textContent.trim() || 'Search posts...';

  // Clear the original HTML from the block
  block.innerHTML = '';

  // Render the Preact component into the block
  render(html`<${SearchBar} initialPlaceholder=${placeholder} />`, block);
}
