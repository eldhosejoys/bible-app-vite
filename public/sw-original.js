const CACHE_NAME = "cache";
// The URLs to cache
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

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
       fetch("asset-manifest.json")
        .then(response => response.json())
        .then(data => {
          const entrypoints = data.entrypoints;
          entrypoints.forEach(entrypoint => {
            const url = data.files[entrypoint];
            if(url != undefined) {urlsToCache.push(url);}
          });
          return cache.addAll(urlsToCache);
        })
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
       fetch("asset-manifest.json")
        .then(response => response.json())
        .then(data => {
          const entrypoints = data.entrypoints;
          entrypoints.forEach(entrypoint => {
            const url = data.files[entrypoint];
            if(url != undefined) {urlsToCache.push(url);}
          });
          return cache.addAll(urlsToCache);
        })
    })
  );
});


// self.addEventListener("install", function (event) {
//   event.waitUntil(
//     caches.open(CACHE_NAME).then(function (cache) {
//       return cache.addAll(urlsToCache);
//     })
//   );
// });

self.addEventListener("fetch", function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cachedResponse) {
      let requestPath = new URL(event.request.url).pathname;
      //To check these patterns "static/css/main.7ae31c33.css", "static/js/main.7ae31c33.js";
      let regex = /static\/(css|js)\/.*\.(css|js)$/; // /^static\/(css|js)\/main\.[^\/]+\.(css|js)$/;

      if (regex.test(requestPath)) {
        // console.log("matched URL: " + requestPath);
        // console.log("Inside regex:" + requestPath);
      } else {
        // console.log("outside regex: " + requestPath);
      }

      // If the request is for one of the cached URLs that you want to update
      if (cachedResponse && (requestPath === "/" || regex.test(requestPath) )) {
        // console.log("update cache: " + requestPath);

        // Get the cached response and check the cached time
        return caches.open(CACHE_NAME).then(function (cache) {
          return cache.match(event.request).then(function (cachedResponse) {
            // Check if the browser is online
            if (navigator.onLine) {
              // Check if the cached resource is older than 24 minutes/hours
              var cacheTime = cachedResponse.headers.get("date");
              var currentTime = new Date();
              var diff = Math.abs(currentTime - new Date(cacheTime));
              var Difference = Math.floor(diff / 36e5); //  60,000 for minutes // for hours 36e5);
              if (Difference >= 24) {
                // Remove the old cached URL from the cache
                cache.delete(requestPath);

                if (regex.test(requestPath)) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.keys().then((keys) => {
                      keys.forEach((request) => {
                        if (regex.test(request.url)) {
                          cache.delete(request);
                        }
                      });
                    });
                  });
                }

                // Fetch the updated resource and cache it
                return fetch(event.request).then(function (response) {
                  // Clone the response because it can only be read once
                  var responseClone = response.clone();
                  cache.put(event.request, responseClone);
                  return response;
                });
              }
            }
            // Return the cached response if it's not older than 24 hours
            return cachedResponse;
          });
        });
      }

       if (cachedResponse) {
        // console.log("already cached url: " + requestPath);
        return cachedResponse;
       }

       if (urlsToCache.includes(requestPath) || regex.test(requestPath)) {
        return caches.open(CACHE_NAME).then(function (cache) {
          return fetch(event.request).then(function (response) {
            cache.put(event.request, response.clone());
            // console.log("cached url: " + requestPath);
            return response;
          });
        });
       }
      // Return the cached response for non-updatable URLs
      // console.log("no cache url: " + requestPath);
      // return cachedResponse || fetch(event.request);

// Otherwise, fetch the resource from the network
return cachedResponse || fetch(event.request)
.then(function(networkResponse) {
  // If the resource was fetched successfully, cache it
  if (networkResponse.status === 200) {
    caches.open(CACHE_NAME)
      .then(function(cache) {
        cache.put(event.request, networkResponse.clone());
      });
  }
  // Return the fetched response
  return networkResponse;
})
.catch(function(error) {
  // If the resource could not be fetched and there is no cached response, redirect to the home page
  if (!response) {
    return caches.match('/');
  }
  // Otherwise, return the cached response
  return response;
});


    })
  );
});
