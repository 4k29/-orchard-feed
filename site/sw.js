const CACHE_NAME = "orchard-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./manual-sync.css",
  "./app.js",
  "./manual-sync.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function networkFirstFeed(request) {
  const cache = await caches.open(CACHE_NAME);
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) await cache.put(cacheUrl.href, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(cacheUrl.href);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request).catch(() => caches.match("./index.html")));
    return;
  }

  const isLocalFeed =
    url.origin === self.location.origin && url.pathname.endsWith("/data/articles.json");
  const isRawFeed =
    url.hostname === "raw.githubusercontent.com" && url.pathname.endsWith("/data/articles.json");

  if (isLocalFeed || isRawFeed) {
    event.respondWith(networkFirstFeed(request));
    return;
  }

  if (url.hostname === "api.github.com") return;

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.hostname === "raw.githubusercontent.com") {
    event.respondWith(networkFirst(request));
  }
});
