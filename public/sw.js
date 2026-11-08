/* Mimori service worker.
 *
 * Caches only static, non-personal files: hashed Next.js bundles, icons and
 * the offline page. Everything else goes straight to the network, so gallery,
 * collection, photo booth and upload data is never served stale or cached.
 */

const VERSION = "mimori-v1";
const STATIC_CACHE = `${VERSION}-static`;
const PRECACHE_URLS = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon-180.png",
];

self.addEventListener("install", (event) => {
  // Waits for the next visit (or all tabs closing) before taking over, so an
  // update never swaps code under a user who is mid-interaction.
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {
        // A failed precache must not block installation; the offline page is
        // simply fetched when it is first needed.
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("mimori-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isApiOrUpload(url) {
  return url.pathname.startsWith("/api/");
}

function isCacheableStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only plain GET requests are ever answered from or written to the cache.
  // POST, PUT, PATCH and DELETE (mutations and uploads) pass straight through.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cloudinary images, other origins, and every API route stay network-only.
  if (url.origin !== self.location.origin) return;
  if (isApiOrUpload(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableStatic(url)) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstNavigation(request) {
  try {
    // Pages are never written to the cache: they carry personal data.
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE);
    const offline = await cache.match("/offline");
    return (
      offline ||
      new Response("You're offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
