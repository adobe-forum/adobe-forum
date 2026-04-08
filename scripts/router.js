const HOME_PATHS = new Set(['/', '/index', '/index.html']);
const POST_PATHS = new Set(['/post', '/post.html']);
const ROUTE_EVENT = 'af-route-change';
const ROUTER_STATE_KEY = '__AF_ROUTER__';

function normalizePath(pathname = '/') {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function buildPostUrl(postId) {
  return `/?post=${encodeURIComponent(String(postId))}`;
}

function parseLocation(pathname = window.location.pathname, search = window.location.search) {
  const normalized = normalizePath(pathname);
  const params = new URLSearchParams(search);
  const postId = params.get('post');

  if (HOME_PATHS.has(normalized) && postId) {
    return {
      view: 'post',
      postId,
      path: '/',
      url: buildPostUrl(postId),
    };
  }

  if (HOME_PATHS.has(normalized)) {
    return { view: 'home', path: '/', url: '/' };
  }

  if (POST_PATHS.has(normalized) && params.get('id')) {
    return {
      view: 'post',
      postId: params.get('id'),
      path: '/',
      url: buildPostUrl(params.get('id')),
    };
  }

  return { view: 'home', path: '/', url: '/' };
}

function ensureRouterState() {
  if (!window[ROUTER_STATE_KEY]) {
    window[ROUTER_STATE_KEY] = {
      initialized: false,
      currentRoute: parseLocation(window.location.pathname, window.location.search),
    };
  }

  return window[ROUTER_STATE_KEY];
}

function readLegacyPostId() {
  try {
    const storedPostId = sessionStorage.getItem('af_open_post');
    if (storedPostId) {
      sessionStorage.removeItem('af_open_post');
      return storedPostId;
    }
  } catch (e) {
    // Ignore storage errors and continue with URL parsing.
  }

  const params = new URLSearchParams(window.location.search);
  return params.get('openPost');
}

function broadcastRoute(route, meta = {}) {
  const routerState = ensureRouterState();
  routerState.currentRoute = route;

  window.dispatchEvent(new CustomEvent(ROUTE_EVENT, {
    detail: {
      ...route,
      source: meta.source || 'router',
      scroll: meta.scroll !== false,
      sidebarItemId: meta.sidebarItemId || null,
    },
  }));
}

function applyRoute(route, meta = {}) {
  const finalRoute = route.view === 'post' && route.postId
    ? {
      ...route,
      path: '/',
      url: buildPostUrl(route.postId),
    }
    : { view: 'home', path: '/', url: '/' };

  const historyState = finalRoute.view === 'post'
    ? { view: 'post', postId: finalRoute.postId }
    : { view: 'home' };

  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const nextUrl = finalRoute.url;

  if (meta.updateHistory !== false && currentUrl !== nextUrl) {
    const historyMethod = meta.replace ? 'replaceState' : 'pushState';
    window.history[historyMethod](historyState, '', nextUrl);
  }

  broadcastRoute(finalRoute, meta);
}

export function getCurrentRoute() {
  return ensureRouterState().currentRoute;
}

export function navigateToPost(postId, options = {}) {
  if (!postId) return;

  applyRoute({
    view: 'post',
    postId: String(postId),
  }, options);
}

export function navigateHome(options = {}) {
  applyRoute({ view: 'home' }, options);
}

export function initRouter() {
  const routerState = ensureRouterState();
  if (routerState.initialized) {
    broadcastRoute(routerState.currentRoute, { source: 'router-reinit', scroll: false });
    return routerState.currentRoute;
  }

  routerState.initialized = true;

  window.addEventListener('popstate', () => {
    broadcastRoute(parseLocation(window.location.pathname, window.location.search), {
      source: 'popstate',
      scroll: true,
    });
  });

  window.addEventListener('load-forum-post', (event) => {
    const { postId, sidebarItemId, skipRouter } = event.detail || {};
    if (skipRouter || !postId) return;

    navigateToPost(postId, {
      sidebarItemId,
      source: 'legacy-load-forum-post',
    });
  });

  window.addEventListener('show-cards', (event) => {
    if (event.detail?.skipRouter) return;
    navigateHome({ source: 'legacy-show-cards' });
  });

  const parsedInitialRoute = parseLocation(window.location.pathname, window.location.search);
  const legacyPostId = parsedInitialRoute.view === 'post' ? null : readLegacyPostId();
  const initialRoute = legacyPostId
    ? { view: 'post', postId: String(legacyPostId) }
    : parsedInitialRoute;

  applyRoute(initialRoute, {
    replace: true,
    updateHistory: true,
    source: 'initial-load',
    scroll: false,
  });

  return initialRoute;
}
