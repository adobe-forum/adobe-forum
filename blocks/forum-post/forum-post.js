import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

const API_BASE = 'http://localhost:5000/api';

// ============================================
// ICONS
// ============================================

const ArrowIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path d="M11.5 8.5H2v1h9.5l-3.5 3.5 .7.7 4.7-4.7-4.7-4.7-.7.7 3.5 3.5z" fill="currentColor"/>
  </svg>
`;

const BackIcon = () => html`
  <svg class="spectrum-action-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
`;

const EditIcon = () => html`
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    style="display:block;flex-shrink:0;">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
`;

// ============================================
// HELPERS
// ============================================

/**
 * Calls GET /api/auth/me and returns the user object, or null if not logged in.
 */
async function fetchCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || null;
  } catch {
    return null;
  }
}

/**
 * Dispatch edit-post:open — the create-post block listens for this and
 * switches into edit mode, pre-filling all fields and calling PATCH on save.
 */
function openEditForm(post) {
  const categoryName = post.topic || '';
  window.dispatchEvent(new CustomEvent('edit-post:open', {
    detail: {
      id: post.id,
      title: post.title,
      body: post.body,
      tags: (post.tags || []).map((t) => t.replace(/^#/, '')), // strip leading #
      category: categoryName,
    },
  }));
}

/**
 * Returns true if currentUser is the creator of this post.
 */
function isOwner(post, currentUser) {
  if (!currentUser || !post?.createdBy) return false;
  return String(post.createdBy) === String(currentUser._id);
}

// ============================================
// FORUM POST
// ============================================

const ForumPost = ({ blockEl }) => {
  const [post, setPost] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const commentsListRef = useRef(null);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (commentsListRef.current && post) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
    }
  }, [post?.comments]);

  // Fetch current user on mount + re-fetch when auth state changes
  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser);
    const onAuthChanged = () => fetchCurrentUser().then(setCurrentUser);
    window.addEventListener('forum-auth-changed', onAuthChanged);
    return () => window.removeEventListener('forum-auth-changed', onAuthChanged);
  }, []);

  // Transform raw <pre> tags into the locked two-column Flexbox layout
  useEffect(() => {
    if (!post || !post.body) return;

    const preTags = document.querySelectorAll('.post-body-raw pre');
    preTags.forEach((pre) => {
      if (pre.classList.contains('formatted-code-block')) return;

      const codeText = pre.textContent;
      const lines = codeText.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();

      const gutter = document.createElement('div');
      gutter.className = 'code-gutter';
      lines.forEach((_, i) => {
        const span = document.createElement('span');
        span.textContent = i + 1;
        gutter.appendChild(span);
      });

      const content = document.createElement('div');
      content.className = 'code-content';
      content.textContent = codeText;

      pre.innerHTML = '';
      pre.classList.add('formatted-code-block');
      pre.appendChild(gutter);
      pre.appendChild(content);
    });
  }, [post]);

  // Also listen for edit-post:saved so we can refresh the view after a save
  useEffect(() => {
    const handlePostSaved = (e) => {
      const updated = e.detail;
      if (!updated || !post || updated.id !== post.id) return;
      setPost((prev) => (prev ? { ...prev, ...updated } : prev));
    };
    window.addEventListener('edit-post:saved', handlePostSaved);
    return () => window.removeEventListener('edit-post:saved', handlePostSaved);
  }, [post]);

  useEffect(() => {
    const handleLoadPost = async (event) => {
      const { postId } = event.detail;
      if (!postId) return;

      setLoading(true);

      // Show this block, hide cards
      if (blockEl) blockEl.style.display = 'block';
      const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
      cardsWrappers.forEach((el) => { el.style.display = 'none'; });

      try {
        const url = `${API_BASE}/posts/${postId}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.post) {
            const fetchedPost = data.post;
            const transformedPost = {
              // eslint-disable-next-line no-underscore-dangle
              id: fetchedPost._id,
              title: fetchedPost.title,
              topic: fetchedPost.category,
              author: fetchedPost.author || 'User',
              // Store createdBy so we can check ownership
              // eslint-disable-next-line no-underscore-dangle
              createdBy: fetchedPost.createdBy
                ? String(fetchedPost.createdBy._id || fetchedPost.createdBy)
                : null,
              tags: fetchedPost.tags || [],
              body: fetchedPost.body,
              comments: [],
            };
            setPost(transformedPost);
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Network/fetch error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    // Listen for back-to-cards event
    const handleShowCards = () => {
      setPost(null);
      if (blockEl) blockEl.style.display = 'none';
      const cardsWrappers = document.querySelectorAll('.cards-wrapper, .cards-container, .cards-display, .cards');
      cardsWrappers.forEach((el) => { el.style.display = ''; });
    };

    window.addEventListener('load-forum-post', handleLoadPost);
    window.addEventListener('show-cards', handleShowCards);
    return () => {
      window.removeEventListener('load-forum-post', handleLoadPost);
      window.removeEventListener('show-cards', handleShowCards);
    };
  }, [blockEl]);

  if (!post) {
    return html`
      <div class="forum-post-wrapper">
        <div class="loading-state">
          ${loading ? 'Loading post...' : ''}
        </div>
      </div>
    `;
  }

  const addComment = () => {
    if (!inputValue.trim()) return;
    const newComment = { user: 'You', text: inputValue };
    setPost({
      ...post,
      comments: [...post.comments, newComment],
    });
    setInputValue('');
  };

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('show-cards'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canEdit = isOwner(post, currentUser);

  return html`
    <div class="forum-post-wrapper">
      ${loading && html`<div class="loading-overlay">Loading post...</div>`}

      <button
        class="spectrum-action-button spectrum-action-button-size-m spectrum-action-button-quiet forum-back-btn"
        onClick=${handleBack}
        aria-label="Back to Posts"
      >
        <${BackIcon} />
        <span class="spectrum-action-button-label">Back to Posts</span>
      </button>

      <div class="tags-row">
        ${post.tags.map((tag) => html`<span class="tag-pill">${tag}</span>`)}
      </div>

      <div class="post-title-row">
        <h1 class="post-title">${post.title}</h1>
        ${canEdit && html`
          <button class="post-edit-btn" title="Edit post" onClick=${() => openEditForm(post)}>
            <${EditIcon} />
            <span>Edit</span>
          </button>
        `}
      </div>

      <div class="post-meta">
        <span class="author-name">${post.author}</span>
        <span class="meta-separator">•</span>
        <span class="topic-name">${post.topic}</span>
      </div>

      <div
        class="post-body-raw"
        dangerouslySetInnerHTML=${{ __html: post.body }}
      />

      <hr class="post-divider" />

      <div class="discussion-section">
        <h3 class="discussion-header">
          Discussion <span class="count">(${post.comments.length})</span>
        </h3>

        <div class="comments-list" ref=${commentsListRef}>
          ${post.comments.map((c) => html`
            <div class="comment-row">
              <div class="comment-avatar">${c.user.charAt(0)}</div>
              <div class="comment-body">
                <div class="comment-user">${c.user}</div>
                <div class="comment-text">${c.text}</div>
              </div>
            </div>
          `)}
        </div>

        <div class="comment-form-container">
          <div class="comment-input-wrapper">
            <input
              type="text"
              placeholder="Add a comment..."
              class="comment-input"
              value=${inputValue}
              onInput=${(e) => setInputValue(e.target.value)}
              onKeyDown=${(e) => e.key === 'Enter' && addComment()}
            />
            <button class="send-btn" onClick=${addComment} aria-label="Post comment">
              <${ArrowIcon} />
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
};

export default function decorate(block) {
  // Hide the block initially — it only shows when a post is loaded
  block.style.display = 'none';
  block.innerHTML = '';
  render(html`<${ForumPost} blockEl=${block} />`, block);
}
