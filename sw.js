// Offline support: cache the app shell, serve it network-first so updates arrive.
const CACHE = "daybreak-v38";
const SHELL = ["./", "index.html", "style.css", "app.js", "routine.json", "recipes.json", "workouts.json", "schedule.js", "icons.js", "sound.js", "sky.js", "fairy.js", "ambient.js", "notify.js", "manifest.webmanifest", "icons/favicon-64.png", "icons/icon-maskable-512.png", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/badge-96.png"];

self.addEventListener("install", (e) => {
  // Cache each file on its own, so one flaky download can't stop the app from installing.
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(SHELL.map((f) => c.add(f))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});

// Reminders sent by Daybreak's notification helper.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Daybreak", {
    body: d.body || "",
    icon: "icons/icon-192.png",
    badge: "icons/badge-96.png",
    tag: d.tag || "daybreak",
    renotify: true,
    data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) if ("focus" in w) return w.focus();
    return self.clients.openWindow(e.notification.data && e.notification.data.url || "./");
  })());
});
