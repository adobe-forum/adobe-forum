import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

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

const ForumPost = ({ blockEl }) => {
  const [post, setPost] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const commentsListRef = useRef(null);

  // NEW: edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // NEW: read logged-in user from localStorage
  const getCurrentUser = () => {
    try { return JSON.parse(localStorage.getItem('forum_user')) || null; } catch { return null; }
  };

  // NEW: check if current user owns this post
  const isOwner = (() => {
    if (!post) return false;
    const user = getCurrentUser();
    if (!user || !post.createdById) return false;
    return String(user._id) === String(post.createdById);
  })();

  // NEW: open edit mode — pre-fill fields
  const handleEditStart = () => {
    setEditTitle(post.title);
    setEditBody(post.body);
    setEditError('');
    setIsEditing(true);
  };

  // NEW: cancel edit — just close
  const handleEditCancel = () => {
    setIsEditing(false);
    setEditError('');
  };

  // NEW: save edit — PATCH /api/posts/:id
  const handleEditSave = async () => {
    const trimmedTitle = editTitle.trim();
    const plainText = editBody.replace(/<[^>]*>/g, '').trim();
    if (!trimmedTitle) { setEditError('Title cannot be empty.'); return; }
    if (plainText.length < 20) { setEditError('Body must be at least 20 characters.'); return; }

    setEditSaving(true);
    setEditError('');
    try {
      const token = localStorage.getItem('forum_token') || '';
      const res = await fetch(`http://localhost:5000/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: trimmedTitle, body: editBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Save failed.');
      } else {
        // Update local post state with saved values — no full reload needed
        setPost((prev) => ({ ...prev, title: data.post.title, body: data.post.body }));
        setIsEditing(false);
      }
    } catch {
      setEditError('Network error. Please try again.');
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    if (commentsListRef.current && post) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
    }
  }, [post?.comments]);

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

  // Listen for sidebar click events
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
        const url = `http://localhost:5000/api/posts/${postId}`;
        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.post) {
            const fetchedPost = data.post;
            const transformedPost = {
              id: fetchedPost._id, // eslint-disable-line no-underscore-dangle
              title: fetchedPost.title,
              topic: fetchedPost.category,
              author: fetchedPost.createdBy?.username || fetchedPost.authorName || 'Community Member',
              // NEW: store createdBy id so isOwner check works
              createdById: fetchedPost.createdBy?._id // eslint-disable-line no-underscore-dangle
                ? String(fetchedPost.createdBy._id) // eslint-disable-line no-underscore-dangle
                : String(fetchedPost.createdBy || ''),
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

      ${isEditing ? html`
        <!-- ── INLINE EDIT FORM ── -->
        <div style="margin-bottom: 32px;">
          <input
            type="text"
            value=${editTitle}
            onInput=${(e) => setEditTitle(e.target.value)}
            style="
              width: 100%; font-size: 1.6rem; font-weight: 800;
              border: 2px solid var(--spectrum-blue-500, #1473e6);
              border-radius: 6px; padding: 8px 12px; margin-bottom: 16px;
              font-family: var(--heading-font-family); box-sizing: border-box;
              outline: none; color: var(--text-color);
            "
            placeholder="Post title"
          />
          <textarea
            value=${editBody}
            onInput=${(e) => setEditBody(e.target.value)}
            rows="12"
            style="
              width: 100%; font-size: 1rem; line-height: 1.7;
              border: 2px solid var(--spectrum-blue-500, #1473e6);
              border-radius: 6px; padding: 12px; margin-bottom: 12px;
              font-family: var(--body-font-family); box-sizing: border-box;
              resize: vertical; outline: none; color: var(--text-color);
            "
            placeholder="Post body (HTML supported)"
          />
          ${editError && html`
            <p style="color: #d7373f; font-size: 0.9rem; margin: 0 0 12px;">${editError}</p>
          `}
          <div style="display: flex; gap: 12px;">
            <button
              onClick=${handleEditSave}
              disabled=${editSaving}
              style="
                background: var(--spectrum-accent-color-900, #0265dc);
                color: #fff; border: none; border-radius: 20px;
                padding: 8px 22px; font-size: 0.9rem; font-weight: 700;
                cursor: ${editSaving ? 'not-allowed' : 'pointer'};
                opacity: ${editSaving ? 0.6 : 1};
                font-family: var(--body-font-family);
              "
            >${editSaving ? 'Saving…' : 'Save changes'}</button>
            <button
              onClick=${handleEditCancel}
              style="
                background: transparent;
                color: var(--spectrum-gray-700, #4b4b4b);
                border: 1px solid var(--spectrum-gray-300, #d3d3d3);
                border-radius: 20px; padding: 8px 22px;
                font-size: 0.9rem; font-weight: 600; cursor: pointer;
                font-family: var(--body-font-family);
              "
            >Cancel</button>
          </div>
        </div>
      ` : html`
        <!-- ── NORMAL VIEW ── -->
        <div class="tags-row">
          ${post.tags.map((tag) => html`<span class="tag-pill">${tag}</span>`)}
        </div>

        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 12px;">
          <h1 class="post-title" style="margin: 0;">${post.title}</h1>
          ${isOwner && html`
            <button
              onClick=${handleEditStart}
              title="Edit post"
              style="
                flex-shrink: 0; margin-top: 6px;
                background: transparent;
                border: 1px solid var(--spectrum-gray-300, #d3d3d3);
                border-radius: 20px; padding: 6px 14px;
                font-size: 0.82rem; font-weight: 600; cursor: pointer;
                color: var(--spectrum-gray-700, #4b4b4b);
                font-family: var(--body-font-family);
                display: inline-flex; align-items: center; gap: 6px;
                transition: background 0.15s;
              "
              onMouseEnter=${(e) => { e.currentTarget.style.background = 'var(--spectrum-gray-100, #f5f5f5)'; }}
              onMouseLeave=${(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
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
      `}

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