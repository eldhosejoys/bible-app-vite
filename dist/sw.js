// Version this cache - increment when you deploy a new build
const CACHE_VERSION = "v1767940074661";
const CACHE_NAME = `bible-app-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const urlsToCache = [
  "/",
  "/index.html",
  // Auto-generated: Vite build assets
  "/assets/index-941e209f.js",
  "/assets/index-a25918d7.css",
  "/manifest.json",
  "/favicon.ico",
  "/assets/json/intro.json",
  "/assets/json/title.json",
  "/assets/json/bible.json",
  "/assets/json/eng-bible.json",
  "/assets/json/headings/bibleheadings.json",
  "/assets/images/ml-bible.webp",
  "/assets/images/writer.png",
  "/assets/images/date.png",
  "/logo192.png",
  "/logo512.png",
  "/assets/images/arrow-right.svg",
  "/assets/images/arrow-left.svg",
  "/assets/images/play.svg",
  "/assets/images/clipboard.svg",
  "/assets/images/stop.svg",
  "/assets/images/clipboard-check.svg",
  "/assets/images/clipboard-x.svg",
];

// Patterns for progressive caching (cached when first accessed)
const PROGRESSIVE_CACHE_PATTERNS = {
  // JS and CSS files (including hashed versions)
  assets: /\.(js|css)$/,
  // Cross-reference JSON files
  crossRef: /^\/assets\/json\/books-cross\/\d+\.json$/,
};

// Install event - pre-cache essential files
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        urlsToCache.map((url) =>
          fetch(url)
            .then((response) => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch((err) => console.log(`Failed to cache ${url}:`, err))
        )
      );
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Delete old versioned caches and legacy 'cache'
            return (name.startsWith("bible-app-") && name !== CACHE_NAME) || name === "cache";
          })
          .map((name) => {
            console.log(`Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - simple cache-first strategy
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-http/https requests
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') {
    return;
  }

  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestPath = requestUrl.pathname;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If cached, return it
      if (cachedResponse) {
        return cachedResponse;
      }

      // Not cached - try to fetch
      return fetch(event.request)
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response not ok');
          }

          // Determine if we should cache this response
          const shouldCache =
            urlsToCache.includes(requestPath) ||
            PROGRESSIVE_CACHE_PATTERNS.assets.test(requestPath) ||
            PROGRESSIVE_CACHE_PATTERNS.crossRef.test(requestPath);

          if (shouldCache) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          // Offline and not cached
          if (PROGRESSIVE_CACHE_PATTERNS.crossRef.test(requestPath)) {
            // Return empty array for cross-references
            return new Response(JSON.stringify([]), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          // For navigation requests, return the cached homepage
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          // For other assets, return 404
          return new Response('', { status: 404, statusText: 'Not Found' });
        });
    })
  );
});
