import { html, render } from '../../vendor/htm-preact.js';
import { useState, useRef, useEffect } from '../../vendor/preact-hooks.js';

/**
 * Parse HTML body and convert to content blocks
 * Extracts code blocks (pre.ql-syntax) and keeps other HTML as text
 */
function parseHtmlToContentBlocks(htmlString) {
  if (!htmlString) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const contentBlocks = [];
  let textBuffer = [];

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      const combinedHtml = textBuffer.join('');
      if (combinedHtml.trim()) {
        contentBlocks.push({
          type: 'text',
          value: combinedHtml,
        });
      }
      textBuffer = [];
    }
  };

  Array.from(doc.body.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'PRE' && node.classList.contains('ql-syntax')) {
      flushTextBuffer();
      contentBlocks.push({
        type: 'code',
        lang: 'javascript',
        value: node.textContent,
      });
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'IMG') {
      flushTextBuffer();
      contentBlocks.push({
        type: 'image',
        src: node.src,
      });
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tempDiv = document.createElement('div');
      tempDiv.appendChild(node.cloneNode(true));
      textBuffer.push(tempDiv.innerHTML);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      textBuffer.push(node.textContent);
    }
  });

  flushTextBuffer();

  if (contentBlocks.length === 0 && htmlString.trim()) {
    return [{ type: 'text', value: htmlString }];
  }

  return contentBlocks;
}

const ContentBlock = ({ block }) => {
  switch (block.type) {
    case 'text':
      return html`<div class="block-text" dangerouslySetInnerHTML=${{ __html: block.value }} />`;
    case 'image':
      return html`<figure class="block-image"><img src="${block.src}" alt="Post Image" /></figure>`;
    case 'code': {
      const lines = block.value.split('\n');
      const lineNumbers = lines.map((_, i) => html`<span>${i + 1}</span>`);

      return html`
        <div class="block-code">
          <div class="code-inner">
            <div class="code-line-nums">${lineNumbers}</div>
            <pre class="code-content">${block.value}</pre>
          </div>
        </div>
      `;
    }
    default:
      return null;
  }
};

const ArrowIcon = () => html`
  <svg
    class="spectrum-Icon spectrum-Icon--sizeS spectrum-ActionButton-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 18 18"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M11.5 8.5H2v1h9.5l-3.5 3.5 .7.7 4.7-4.7-4.7-4.7-.7.7 3.5 3.5z" fill="currentColor"/>
  </svg>
`;

const BackIcon = () => html`
  <svg
    class="spectrum-Icon spectrum-Icon--sizeS spectrum-ActionButton-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <line x1="19" y1="12" x2="5" y2="12"></line>
    <polyline points="12 19 5 12 12 5"></polyline>
  </svg>
`;

const ForumPost = () => {
  const [post, setPost] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const commentsListRef = useRef(null);

  useEffect(() => {
    if (commentsListRef.current) {
      commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
    }
  }, [post ? post.comments : null]);

  useEffect(() => {
    const handleLoadPost = async (event) => {
      const { postId } = event.detail;
      // eslint-disable-next-line no-console
      console.log('🔵 load-forum-post event received with postId:', postId);
      if (!postId) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ No postId provided to load-forum-post event');
        return;
      }

      setLoading(true);
      try {
        const url = `http://localhost:5000/api/posts/${postId}`;
        // eslint-disable-next-line no-console
        console.log('🚀 Fetching post from:', url);
        const response = await fetch(url);
        // eslint-disable-next-line no-console
        console.log('📡 Response status:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          // eslint-disable-next-line no-console
          console.log('📦 Response data:', data);

          if (data.success && data.post) {
            const fetchedPost = data.post;
            // eslint-disable-next-line no-console
            console.log('✓ Post fetched successfully:', fetchedPost.title);

            const contentBlocks = parseHtmlToContentBlocks(fetchedPost.body);

            const transformedPost = {
              id: fetchedPost._id, // eslint-disable-line no-underscore-dangle
              title: fetchedPost.title,
              topic: fetchedPost.category,
              author: 'User',
              tags: fetchedPost.tags || [],
              content: contentBlocks,
              comments: [],
            };
            // eslint-disable-next-line no-console
            console.log('✓ Post loaded and displayed:', transformedPost.title);
            setPost(transformedPost);
          } else {
            // eslint-disable-next-line no-console
            console.error('❌ API returned unsuccessful response:', data);
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('❌ HTTP Error - Status:', response.status);
          const errorData = await response.json().catch(() => ({}));
          // eslint-disable-next-line no-console
          console.error('Error details:', errorData);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('❌ Network/fetch error:', error.message);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('load-forum-post', handleLoadPost);
    return () => {
      window.removeEventListener('load-forum-post', handleLoadPost);
    };
  }, []);

  if (!post) {
    return html`
      <div class="forum-post-wrapper">
        <div class="loading-state">
          ${loading ? 'Loading post...' : 'Select a post from the sidebar to view it.'}
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

  // ── Back to cards ──────────────────────────────────────────────────
  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('show-cards'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return html`
    <div class="forum-post-wrapper">
      ${loading && html`<div class="loading-overlay">Loading post...</div>`}

      <button
        class="spectrum-ActionButton spectrum-ActionButton--sizeM spectrum-ActionButton--quiet forum-back-btn"
        onClick=${handleBack}
        aria-label="Back to Posts"
      >
        <${BackIcon} />
        <span class="spectrum-ActionButton-label">Back to Posts</span>
      </button>

      <div class="tags-row">
        ${post.tags.map((tag) => html`<span class="tag-pill">${tag}</span>`)}
      </div>
      <h1 class="post-title">${post.title}</h1>
      <div class="post-meta">
        <span class="author-name">${post.author}</span>
        <span class="meta-separator">•</span>
        <span class="topic-name">${post.topic}</span>
      </div>

      <div class="post-content-area">
        ${post.content.map((block, index) => html`<${ContentBlock} block=${block} key=${index} />`)}
      </div>

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
  block.innerHTML = '';
  render(html`<${ForumPost} />`, block);
}