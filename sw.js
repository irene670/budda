// 雲禪 — offline shell. The page, icons and 3D library are cached so the app opens and beads
// can be counted without a network; the chanting and lectures still stream from their publishers.
const CACHE = "yunchan-v52";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || r.destination === "audio" || r.headers.has("range")) return;   // audio streams straight from the network
  const u = new URL(r.url);
  if (r.mode === "navigate"){
    // newest page when online, cached page when not
    // only the app itself may replace the cached page: a landing page under q/ must never take its place
    const isApp = /\/(index\.html)?$/.test(u.pathname);
    e.respondWith(fetch(r.url, { cache:"no-cache", credentials:"same-origin" }).then(res => { if (isApp){ const cp = res.clone(); caches.open(CACHE).then(c => c.put("index.html", cp)); } return res; })
      .catch(() => caches.match(isApp ? "index.html" : r).then(hit => hit || caches.match("index.html"))));
    return;
  }
  const cacheable = u.origin === location.origin || /(^|\.)(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok || res.type === "opaque"){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
    return res;
  })));
});
