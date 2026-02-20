export default function decorate(block) {
    // Read placeholder from da.live BEFORE clearing
    const placeholder = block.querySelector('div')?.textContent.trim() || 'Search posts...';
  
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
  
    const form     = block.querySelector('.search-form');
    const input    = block.querySelector('.search-input');
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
  }