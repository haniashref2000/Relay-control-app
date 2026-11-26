// Service worker for Relay Control
// - Page files: network first (you always get the newest version), cache as fallback
// - MQTT library from CDNs: cache first (the app still opens if a CDN is down)
// - MQTT WebSocket traffic is not touched
const VER = "relay-v1";
const SHELL = ["./relay.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const CDN = /(^|\.)(cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com)$/;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VER).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function store(req, res) {
  if (res.ok || res.type === "opaque") {
    const copy = res.clone();
    caches.open(VER).then((c) => c.put(req, copy));
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => store(req, res))
        .catch(() => caches.match(req).then((m) => m || caches.match("./relay.html")))
    );
  } else if (CDN.test(url.hostname)) {
    e.respondWith(
      caches.match(req).then((m) => m || fetch(req).then((res) => store(req, res)))
    );
  }
});
