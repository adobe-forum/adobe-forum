const LANG_LABELS = {
  html: 'HTML',
  css: 'CSS',
  javascript: 'JS',
};

const COPY_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

export function renderTabbedCodeBlocks(root) {
  if (!root) return;

  root.querySelectorAll('.code-tabs-wrapper[data-generated="true"]').forEach((wrapper) => wrapper.remove());

  const preTags = Array.from(root.querySelectorAll('pre'));
  if (preTags.length === 0) return;

  const snippets = preTags.map((pre) => ({
    lang: pre.dataset.language || 'plaintext',
    code: pre.textContent,
  }));

  const wrapper = document.createElement('div');
  wrapper.className = 'code-tabs-wrapper';
  wrapper.dataset.generated = 'true';

  const tabBar = document.createElement('div');
  tabBar.className = 'code-tabbar';

  const tabList = document.createElement('div');
  tabList.className = 'code-tab-list';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'code-copy-btn';
  copyBtn.title = 'Copy code';
  copyBtn.innerHTML = COPY_SVG;

  tabBar.appendChild(tabList);
  tabBar.appendChild(copyBtn);

  const panelsContainer = document.createElement('div');
  panelsContainer.className = 'code-panels';

  let activeIndex = 0;

  const activateTab = (idx) => {
    activeIndex = idx;
    tabList.querySelectorAll('.code-tab').forEach((tab, tabIndex) => {
      tab.classList.toggle('active', tabIndex === idx);
    });
    panelsContainer.querySelectorAll('.code-panel').forEach((panel, panelIndex) => {
      panel.classList.toggle('active', panelIndex === idx);
    });
  };

  snippets.forEach(({ lang, code }, index) => {
    const label = LANG_LABELS[lang] || 'CODE';

    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = `code-tab${index === 0 ? ' active' : ''}`;
    tab.textContent = label;
    tab.addEventListener('mousedown', (e) => {
      e.preventDefault();
      activateTab(index);
    });
    tabList.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = `code-panel${index === 0 ? ' active' : ''}`;

    const badge = document.createElement('span');
    badge.className = `code-lang-badge code-badge-${lang}`;
    badge.textContent = label;
    panel.appendChild(badge);

    const lines = code.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    const gutter = document.createElement('div');
    gutter.className = 'tabs-gutter';
    lines.forEach((_, lineIndex) => {
      const span = document.createElement('span');
      span.className = 'tabs-num';
      span.textContent = lineIndex + 1;
      gutter.appendChild(span);
    });

    const content = document.createElement('div');
    content.className = 'tabs-content';
    content.textContent = code;

    const codeBody = document.createElement('div');
    codeBody.className = 'code-body';
    codeBody.appendChild(gutter);
    codeBody.appendChild(content);
    panel.appendChild(codeBody);

    panelsContainer.appendChild(panel);
  });

  copyBtn.addEventListener('click', () => {
    const activePanel = panelsContainer.querySelectorAll('.code-panel')[activeIndex];
    const text = activePanel?.querySelector('.tabs-content')?.textContent || '';

    if (!navigator.clipboard?.writeText) return;

    navigator.clipboard.writeText(text).then(() => {
      copyBtn.classList.add('copied');
      copyBtn.title = 'Copied!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.title = 'Copy code';
      }, 1800);
    }).catch(() => {});
  });

  wrapper.appendChild(tabBar);
  wrapper.appendChild(panelsContainer);

  preTags.forEach((pre) => pre.remove());
  root.appendChild(wrapper);
}
