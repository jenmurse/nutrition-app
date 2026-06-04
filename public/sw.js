/* eslint-disable */
/**
 * Good Measure service worker.
 *
 * Goal: read-only offline access. When the user is at the grocery store with
 * spotty service, they can still see today's plan, the pantry, recipes, and
 * the shopping list — anything they've loaded recently this session.
 *
 * Strategy:
 *   - HTML page navigations: network-first → cache fallback → offline shell
 *   - Static assets (/_next/static, /icons, fonts):           cache-first
 *   - API GET requests:                                       network-first → cache fallback
 *   - API mutations (POST/PUT/PATCH/DELETE):                  network-only (fail loudly when offline)
 *   - Images (R2, /uploads/, og-image):                       cache-first, long-lived
 *
 * Bump CACHE_VERSION on schema-breaking changes to evict old caches on next load.
 */

const CACHE_VERSION = "v1";
const PAGE_CACHE     = `gm-pages-${CACHE_VERSION}`;
const ASSET_CACHE    = `gm-assets-${CACHE_VERSION}`;
const API_CACHE      = `gm-api-${CACHE_VERSION}`;
const IMAGE_CACHE    = `gm-images-${CACHE_VERSION}`;

const OFFLINE_URL = "/offline";

// ── Install: precache the offline shell ──────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches, take control of open tabs ─────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const valid = new Set([PAGE_CACHE, ASSET_CACHE, API_CACHE, IMAGE_CACHE]);
      await Promise.all(keys.map((k) => (valid.has(k) ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

// ── Fetch router ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    // Mutations pass through. The app handles the offline error itself.
    return;
  }

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // 1. API requests — network-first, cache fallback
  //    EXCEPT /api/health which the offline indicator uses to probe
  //    reachability — it must hit the real network or fail cleanly.
  if (sameOrigin && url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/health") {
      // Pass through to the browser's default fetch; no caching.
      return;
    }
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // 2. Static assets — cache-first
  if (
    sameOrigin &&
    (url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/PWA_icon-") ||
      url.pathname.endsWith(".woff") ||
      url.pathname.endsWith(".woff2") ||
      url.pathname.endsWith(".ttf"))
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // 3. Images — cache-first
  const isImage =
    request.destination === "image" ||
    url.pathname.startsWith("/og-image") ||
    url.hostname.includes("r2.dev") ||
    url.hostname.includes("cloudflarestorage");
  if (isImage) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // 4. HTML page navigations — network-first, cache fallback, offline shell as last resort
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // 5. Everything else — try network, fall back to cache
  if (sameOrigin) {
    event.respondWith(networkFirst(request, ASSET_CACHE));
  }
});

// ── Strategies ───────────────────────────────────────────────────

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    // Only cache OK + opaque responses
    if (fresh && (fresh.ok || fresh.type === "opaque")) {
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in background
    fetch(request)
      .then((fresh) => {
        if (fresh && (fresh.ok || fresh.type === "opaque")) cache.put(request, fresh.clone()).catch(() => {});
      })
      .catch(() => {});
    return cached;
  }
  const fresh = await fetch(request);
  if (fresh && (fresh.ok || fresh.type === "opaque")) cache.put(request, fresh.clone()).catch(() => {});
  return fresh;
}

async function navigationHandler(request) {
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (err) {
    const cache = await caches.open(PAGE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    throw err;
  }
}
