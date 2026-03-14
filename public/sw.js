const CACHE_NAME = 'stitch-manager-v2';
const STATIC_CACHE = 'stitch-static-v2';

// Essential files to pre-cache for offline
const APP_SHELL = [
  '/',
  '/login',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/splash-icon.png',
  '/favicon.ico',
  '/offline.html',
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch(() => {
        // If some files fail, still install
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Helper: fetch with a timeout (prevents hanging on unstable network)
function fetchWithTimeout(request, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('timeout'));
    }, timeoutMs);

    fetch(request, { signal: controller.signal })
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // assetlinks.json: cache-first (critical for TWA verification offline)
  if (url.pathname === '/.well-known/assetlinks.json') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const networkFetch = fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);

        // Return cached immediately if available, update in background
        if (cached) {
          networkFetch; // fire-and-forget update
          return cached;
        }
        return networkFetch.then((r) => r || new Response('[]', {
          headers: { 'Content-Type': 'application/json' }
        }));
      })
    );
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?|ttf|eot|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Pages (HTML): stale-while-revalidate with 3s timeout
  // Serve cached version INSTANTLY, update cache in background
  if (event.request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        // Always try to fetch fresh version (with timeout to prevent hanging)
        const networkFetch = fetchWithTimeout(event.request, 3000)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => null);

        // If we have a cached version, return it immediately
        if (cached) {
          networkFetch; // update cache in background (fire-and-forget)
          return cached;
        }

        // No cache — must wait for network
        return networkFetch.then((response) => {
          if (response) return response;
          // Try the root page as fallback
          return caches.match('/').then((root) => {
            if (root) return root;
            // Last resort: serve offline page
            return caches.match('/offline.html');
          });
        });
      })
    );
    return;
  }

  // Next.js data/RSC payloads: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetchWithTimeout(event.request, 3000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        networkFetch; // fire-and-forget update
        return cached;
      }

      return networkFetch.then((response) => {
        return response || new Response('{}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      });
    })
  );
});
