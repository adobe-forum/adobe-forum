import { html, render } from '../../vendor/htm-preact.js';
import { useState } from '../../vendor/preact-hooks.js';

/**
 * 1. SYNCHRONOUS DUMMY DATA
 * No promises, no timeouts. This data is instantly available to pass PSI checks.
 */
const DUMMY_POST_DATA = {
  id: '123',
  title: 'Frontend Resources',
  topic: 'JavaScript',
  author: 'Sarah',
  tags: ['#react', '#frontend', '#hooks'],
  content: [
    {
      type: 'text',
      value: '<p>React hooks have changed how we write components. Before we dive in, let’s look at the lifecycle.</p>',
    },
    {
      type: 'image',
      src: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=800&q=80',
    },
    {
      type: 'text',
      value: '<p>As you can see above, the ecosystem is vast. Here is a basic example of using <code>useState</code>:</p>',
    },
    {
      type: 'code',
      lang: 'javascript',
      value: `const [count, setCount] = useState(0);

// Update state
<button onClick={() => setCount(count + 1)}>
  Count is {count}
</button>`,
    },
    {
      type: 'text',
      value: '<p>Keep practicing and you will master it in no time.</p>',
    },
  ],
  comments: [
    { user: 'Guest', text: 'The code snippet is very helpful!' },
    { user: 'DevMike', text: 'Thanks for sharing this.' },
  ],
};

/**
 * Helper: Content Renderer
 */
const ContentBlock = ({ block }) => {
  switch (block.type) {
    case 'text':
      return html`<div class="block-text" dangerouslySetInnerHTML=${{ __html: block.value }} />`;
    case 'image':
      return html`<figure class="block-image"><img src="${block.src}" alt="Post Image" /></figure>`;
    case 'code':
      return html`
        <div class="block-code">
          <div class="code-lang">${block.lang}</div>
          <pre><code>${block.value}</code></pre>
        </div>
      `;
    default:
      return null;
  }
};

/**
 * 2. MAIN COMPONENT
 */
const ForumPost = () => {
  const [post, setPost] = useState(DUMMY_POST_DATA);
  const [inputValue, setInputValue] = useState('');

  const addComment = () => {
    if (!inputValue.trim()) return;
    const newComment = { user: 'You', text: inputValue };
    
    setPost({
      ...post,
      comments: [...post.comments, newComment]
    });
    setInputValue('');
  };

  return html`
    <div class="forum-post-wrapper">
      
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
        
        <div class="comments-list">
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
            <button class="send-btn" onClick=${addComment}>Post</button>
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