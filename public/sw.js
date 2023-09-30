const CACHE_NAME = "cache";

let urlsToCache = [
    "/",
    "/favicon.ico",
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

// Function to fetch and cache a URL
function fetchAndCache(url) {

  return fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch");
      }
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(url, responseClone);
      });
      return response;
    })
    .catch(() => {
      return caches.match('/'); // show home page
      // Handle fetch errors, e.g., serve a fallback response
    });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(urlsToCache.map((url) => fetchAndCache(url)));
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  const requestPath = new URL(event.request.url).pathname;
  const regex = /\.(css|js)$/ ;

  if (regex.test(requestPath)) {
    // Handle URLs matching the pattern differently if needed
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {

    if (cachedResponse && requestPath.endsWith(".json")) {
        // Check if the cached response is older than 4 days
        const cacheTimestamp = new Date(cachedResponse.headers.get("date"));
        const currentDate = new Date();

        if (currentDate - cacheTimestamp > 5 * 24 * 60 * 60 * 1000) {
          // Cached JSON response is older than 4 days, fetch and cache again if online
          if (navigator.onLine) {
            return fetchAndCache(event.request);
          }
        }

        // Return the cached JSON response
        return cachedResponse;
      }

       if (cachedResponse) {
        // Return cached response
        return cachedResponse;
      }

      // Cache and return network response for URLs to be cached
      if (urlsToCache.includes(requestPath) || regex.test(requestPath)) {
        return fetchAndCache(event.request);
      }

      // For other URLs, do not cache and fetch from the network directly
      
      if (navigator.onLine) {
        return fetch(event.request);
      }else{
        return caches.match('/');
      }
    })
  );
});
