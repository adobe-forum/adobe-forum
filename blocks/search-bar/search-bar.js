import { h, render } from '../../vendor/preact.js';
import { useEffect, useRef, useState } from '../../vendor/preact-hooks.js';
import htm from '../../vendor/htm.js';

// Bind HTM to Preact's hyperscript function
const html = htm.bind(h);

// 1. Define the Preact Component
function SearchBar({ initialPlaceholder }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // useEffect handles our Debounce logic automatically!
  useEffect(() => {
    // Set a timer to dispatch the event after 300ms
    const debounceTimer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('search-posts', { detail: { query } }));
    }, 300);

    // Cleanup function: If 'query' changes BEFORE 300ms, this clears the old timer
    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleInput = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = () => {
    setQuery('');
    // Refocus the input box so the user can immediately type again
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
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
      </div>
    </form>
  `;
}

// 3. Keep the standard decorate function to mount the Preact component
export default function decorate(block) {
  // Read placeholder from da.live BEFORE clearing
  const placeholder = block.querySelector('div')?.textContent.trim() || 'Search posts...';

<<<<<<< HEAD
  block.innerHTML = `
        <form class="search-form" action="#" novalidate>
          <div class="search-form-inner">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" focusable="false" aria-hidden="true">
              <path d="M12.5 11h-.79l-.28-.27A6.471 6.471 0 0 0 13 6.5 6.5 6.5 0 1 0 6.5 13c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L17.49 16l-4.99-5zm-6 0C4.01 11 2 8.99 2 6.5S4.01 2 6.5 2 11 4.01 11 6.5 8.99 11 6.5 11z"/>
            </svg>
            <input
              type="search"
              class="search-input"
              placeholder="${placeholder}"
              aria-label="Search posts"
              autocomplete="off"
            />
            <button type="button" class="search-clear" aria-label="Clear search">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" focusable="false" aria-hidden="true">
                <path d="M13 6.06L11.94 5 9 7.94 6.06 5 5 6.06 7.94 9 5 11.94 6.06 13 9 10.06 11.94 13 13 11.94 10.06 9z"/>
              </svg>
            </button>
          </div>
        </form>
      `;

  const form = block.querySelector('.search-form');
  const input = block.querySelector('.search-input');
  const clearBtn = block.querySelector('.search-clear');

  form.addEventListener('submit', (e) => e.preventDefault());

  input.addEventListener('input', () => {
    // Send RAW value (no trim) so trailing space is preserved.
    // This lets cards-display split "salman " correctly when user
    // starts typing the next word e.g. "salman vishnu".
    // cards-display does: query.split(/\s+/).filter(Boolean) — OR match.
    const raw = input.value;
    clearBtn.classList.toggle('is-visible', raw.length > 0);
    window.dispatchEvent(new CustomEvent('search-posts', { detail: { query: raw } }));
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.classList.remove('is-visible');
    window.dispatchEvent(new CustomEvent('search-posts', { detail: { query: '' } }));
    input.focus();
  });
=======
  // Clear the original HTML from the block
  block.innerHTML = '';

  // Render the Preact component into the block
  render(html`<${SearchBar} initialPlaceholder=${placeholder} />`, block);
>>>>>>> 70501aac6f728e7396450b1fa2bd94b8b5e881fc
}
