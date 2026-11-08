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

/* Push notifications.
 *
 * The server sends one short, already-encrypted payload; this worker only
 * displays it and decides where a click lands. Nothing in a payload is trusted
 * beyond its text: the destination must be a path on this origin, and anything
 * else opens the home page. Caching above is untouched by any of this.
 */

const PUSH_ICON = "/icons/icon-192.png";

/** Mirrors `isSafeNotificationPath` in `lib/push/messages.ts`. */
function safeNotificationPath(value) {
  if (typeof value !== "string" || value.length > 2048) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (/[\u0000-\u001f\u007f\\\s]/.test(value)) return "/";

  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search : "/";
  } catch {
    return "/";
  }
}

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = null;

      try {
        payload = event.data ? event.data.json() : null;
      } catch {
        payload = null;
      }

      const body =
        payload && typeof payload.body === "string" ? payload.body : "";
      const title =
        payload && typeof payload.title === "string" && payload.title
          ? payload.title
          : "Mimori";
      const tag =
        payload && typeof payload.tag === "string" && payload.tag
          ? payload.tag
          : "mimori";

      await self.registration.showNotification(title, {
        body,
        tag,
        icon: PUSH_ICON,
        badge: PUSH_ICON,
        data: { url: safeNotificationPath(payload && payload.url) },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = safeNotificationPath(
    event.notification.data && event.notification.data.url,
  );

  event.waitUntil(
    (async () => {
      // Prefer an open Mimori window: focus it and move it to the page the
      // notification is about, rather than opening a second copy of the app.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        try {
          if (new URL(client.url).origin !== self.location.origin) continue;
        } catch {
          continue;
        }

        await client.focus();

        if (typeof client.navigate === "function") {
          try {
            await client.navigate(new URL(target, self.location.origin).href);
          } catch {
            // Focus alone still puts the app in front of the user.
          }
        }

        return;
      }

      await self.clients.openWindow(target);
    })(),
  );
});
