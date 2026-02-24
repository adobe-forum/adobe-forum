const API_BASE_URL = 'http://localhost:5000/api';
const PAGE_SIZE = 12;

// ── Extract first image from post body HTML ───────────────────────────
function extractImage(body) {
  if (!body) return null;
  const doc = new DOMParser().parseFromString(body, 'text/html');
  const img = doc.querySelector('img');
  return img ? img.src : null;
}

// ── Extract plain text excerpt ────────────────────────────────────────
function extractExcerpt(body, max = 100) {
  if (!body) return '';
  const doc = new DOMParser().parseFromString(body, 'text/html');
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

// ── Avatar initials ───────────────────────────────────────────────────
function avatarInitials(name) {
  if (!name || name === 'Anonymous') return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    : name[0].toUpperCase();
}

// ── Consistent avatar color from name ────────────────────────────────
function avatarColor(name) {
  const colors = ['#DA1F26', '#0265DC', '#12805C', '#7B2D8B', '#E68619', '#1473E6'];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i += 1) {
    // eslint-disable-next-line no-bitwise
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ── Build card HTML ───────────────────────────────────────────────────
function buildCard(post) {
  /* eslint-disable no-underscore-dangle */
  const id = post._id || post.id;

  const tags = (post.tags || []).slice(0, 3)
    .map((tag) => {
      const clean = tag.startsWith('#') ? tag : `#${tag}`;
      return `<span class="card-tag">${clean}</span>`;
    }).join('');

  const imgSrc = post.image || extractImage(post.body);
  const image = imgSrc
    ? `<img src="${imgSrc}" alt="${post.title}" class="card-img-box" loading="lazy" />`
    : '<div class="card-img-box card-img--placeholder"></div>';

  const author = post.author?.name || post.author?.username || post.author
    || post.createdBy?.name || post.createdBy?.username || post.createdBy
    || post.userId?.name || post.userId?.username || 'Anonymous';

  const initials = avatarInitials(author);
  const avColor = avatarColor(author);
  const excerpt = extractExcerpt(post.body || post.description || post.content || '');

  return `
    <article class="card" data-post-id="${id}">
      <div class="card-img-wrapper">
        ${image}
        ${post.category ? `<span class="card-category-badge">${post.category}</span>` : ''}
      </div>
      <div class="card-body">
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        <h3 class="card-title">${post.title}</h3>
        <p class="card-meta">
          <span class="card-avatar" style="background:${avColor}">${initials}</span>
          <span class="card-author">${author}</span>
        </p>
        ${excerpt ? `<p class="card-desc">${excerpt}</p>` : ''}
      </div>
      <div class="card-read-more">
        Read more
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </article>
  `;
  /* eslint-enable no-underscore-dangle */
}

// ── Build pagination HTML ─────────────────────────────────────────────
function buildPagination(currentPage, totalPages) {
  if (totalPages <= 1) return '';

  let pages = '';

  pages += `<button class="page-btn page-prev" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  const delta = 2;
  const start = Math.max(1, currentPage - delta);
  const end = Math.min(totalPages, currentPage + delta);

  if (start > 1) {
    pages += '<button class="page-btn" data-page="1">1</button>';
    if (start > 2) pages += '<span class="page-ellipsis">…</span>';
  }

  for (let i = start; i <= end; i += 1) {
    pages += `<button class="page-btn ${i === currentPage ? 'is-active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) pages += '<span class="page-ellipsis">…</span>';
    pages += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  pages += `<button class="page-btn page-next" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;

  return `<div class="cards-pagination">${pages}</div>`;
}

export default async function decorate(block) {
  const rows = [...block.children];
  const title = rows[0]?.children[0]?.textContent.trim() || '';
  const subtitle = rows[0]?.children[1]?.textContent.trim() || '';

  block.innerHTML = `
    <div class="cards-header">
      <h2 class="cards-title">${title}</h2>
      ${subtitle ? `<p class="cards-subtitle">${subtitle}</p>` : ''}
    </div>
    <div class="cards-grid"></div>
    <div class="cards-no-results" style="display:none;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>No posts found matching your search.</p>
      <span>Try a different keyword or clear the search.</span>
    </div>
    <div class="cards-pagination-wrapper"></div>
  `;

  const grid = block.querySelector('.cards-grid');
  const noResults = block.querySelector('.cards-no-results');
  const pagWrapper = block.querySelector('.cards-pagination-wrapper');

  grid.innerHTML = Array(6).fill(`
    <div class="card card--skeleton">
      <div class="card-img-box skeleton-box"></div>
      <div class="card-body">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line medium"></div>
      </div>
    </div>
  `).join('');

  // 1. Select ALL possible card wrappers that sidebar.js might have hidden
  const getCardsWrappers = () => document.querySelectorAll('.cards-display-wrapper, .cards-wrapper, .cards-container, .cards-display, .cards');
  const getForumWrapper = () => document.querySelector('.forum-post-wrapper');
  const getSearchWrapper = () => document.querySelector('.search-bar-wrapper');

  const showCards = () => {
    const cws = getCardsWrappers();
    const fw = getForumWrapper();
    const sw = getSearchWrapper();

    // 2. Loop through and unhide all of them
    cws.forEach((cw) => { if (cw) cw.style.display = ''; });
    if (fw) fw.style.display = 'none';
    if (sw) sw.style.display = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showPost = (postId) => {
    const cws = getCardsWrappers();
    const fw = getForumWrapper();
    const sw = getSearchWrapper();

    // 3. Loop through and hide all of them to remain consistent
    cws.forEach((cw) => { if (cw) cw.style.display = 'none'; });
    if (fw) fw.style.display = '';
    if (sw) sw.style.display = 'none';

    window.dispatchEvent(new CustomEvent('load-forum-post', { detail: { postId } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.addEventListener('show-cards', showCards);

  requestAnimationFrame(() => {
    const fw = getForumWrapper();
    if (fw) fw.style.display = 'none';
  });

  try {
    const res = await fetch(`${API_BASE_URL}/posts`);
    const data = await res.json();
    const allPosts = data.posts || data || [];

    if (!allPosts.length) {
      grid.innerHTML = '<p class="cards-empty">No posts found.</p>';
      return;
    }

    let currentPage = 1;
    let filteredPosts = [...allPosts];

    const renderPage = (page) => {
      currentPage = page;
      const totalPages = Math.ceil(filteredPosts.length / PAGE_SIZE);
      const start = (page - 1) * PAGE_SIZE;
      const pagePosts = filteredPosts.slice(start, start + PAGE_SIZE);

      grid.innerHTML = pagePosts.map(buildCard).join('');

      grid.querySelectorAll('.card').forEach((card) => {
        card.addEventListener('click', () => showPost(card.dataset.postId));
      });

      pagWrapper.innerHTML = buildPagination(currentPage, totalPages);

      pagWrapper.querySelectorAll('.page-btn:not([disabled])').forEach((btn) => {
        btn.addEventListener('click', () => {
          renderPage(Number(btn.dataset.page));
          block.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    };

    renderPage(1);

    window.addEventListener('search-posts', (e) => {
      const query = e.detail.query.toLowerCase().trim();

      if (!query) {
        filteredPosts = [...allPosts];
        noResults.style.display = 'none';
        grid.style.display = '';
        pagWrapper.style.display = '';
        renderPage(1);
        return;
      }

      // Split query by spaces — each word is a separate term
      // A card matches if it contains ANY of the words (OR logic)
      const terms = query.split(/\s+/).filter(Boolean);

      filteredPosts = allPosts.filter((post) => {
        const searchable = [
          post.title,
          post.category,
          post.description,
          ...(post.tags || []),
          extractExcerpt(post.body || ''),
        ].join(' ').toLowerCase();
        // Match if ANY term is found in the searchable text
        return terms.some((term) => searchable.includes(term));
      });

      if (!filteredPosts.length) {
        grid.style.display = 'none';
        pagWrapper.style.display = 'none';
        noResults.style.display = 'flex';
      } else {
        grid.style.display = '';
        pagWrapper.style.display = '';
        noResults.style.display = 'none';
        renderPage(1);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('cards-display: failed to fetch posts', err);
    grid.innerHTML = '<p class="cards-error">Failed to load posts. Please try again.</p>';
  }
}
