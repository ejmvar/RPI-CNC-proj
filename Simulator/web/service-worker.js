/**
 * Service Worker for CNC Simulator
 * Provides offline support and resource caching
 */

/* global self, caches, clients, location */

const CACHE_VERSION = 'cnc-simulator-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Resources to cache on install
const STATIC_CACHE_URLS = [
  '/',
  '/front.html',
  '/css/theme.css',
  '/css/auth-ui.css',
  '/css/file-library-ui.css',
  '/css/keyboard-shortcuts.css',
  '/css/user-preferences.css',
  '/css/visualization.css',
  '/js/theme-manager.mjs',
  '/js/keyboard-shortcuts.mjs',
  '/js/user-preferences.mjs',
  '/js/auth-ui.mjs',
  '/js/file-library-ui.mjs',
  '/js/camera-bookmarks.mjs',
  '/js/measurement-tools.mjs',
  '/js/viewport-manager.mjs',
  '/js/screenshot-exporter.mjs',
  '/js/gcode-parser.mjs',
  '/js/gcode-transform.mjs',
  '/js/three-helper.mjs',
  '/js/controls.mjs',
  '/js/mesh.mjs',
  '/js/toolpath.mjs',
  '/static/three.min.js',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Skip WebSocket requests
  if (url.pathname.startsWith('/ws')) {
    return;
  }

  event.respondWith(
    caches
      .match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update in background
          fetchAndCache(request);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetchAndCache(request);
      })
      .catch((error) => {
        console.error('[ServiceWorker] Fetch failed:', error);

        // Return offline page if available
        return caches.match('/offline.html');
      })
  );
});

/**
 * Fetch from network and cache the response
 */
async function fetchAndCache(request) {
  try {
    const response = await fetch(request);

    // Only cache successful responses
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[ServiceWorker] Fetch error:', error);
    throw error;
  }
}

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((name) => caches.delete(name)));
      })
    );
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

/**
 * Sync files when back online
 */
async function syncFiles() {
  console.log('[ServiceWorker] Syncing files...');
  // Implementation would sync pending file uploads/changes
}

// Push notifications (future feature)
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'CNC Simulator';
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});

console.log('[ServiceWorker] Loaded');
