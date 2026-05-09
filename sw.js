/* ═══════════════════════════════════════════════
   Centro Cuídate · Service Worker v3
   Gestiona caché offline y notificaciones push
   ═══════════════════════════════════════════════ */

const CACHE = "ccuida-v3";
const SHELL = ["./"];

/* ── INSTALACIÓN: precachear el shell ── */
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

/* ── ACTIVACIÓN: limpiar cachés viejas ── */
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

/* ── FETCH: servir desde caché cuando no hay red ── */
self.addEventListener("fetch", function(e) {
  var url = e.request.url;
  /* Solo interceptar navegación y recursos propios (no Firebase/APIs) */
  if (
    e.request.mode === "navigate" ||
    (url.indexOf(self.location.origin) === 0 &&
     url.indexOf("firebase") < 0 &&
     url.indexOf("googleapis") < 0)
  ) {
    e.respondWith(
      fetch(e.request).then(function(r) {
        if (r && r.status === 200) {
          var cl = r.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, cl); });
        }
        return r;
      }).catch(function() {
        return caches.match(e.request).then(function(c) {
          return c || caches.match("./");
        });
      })
    );
    return;
  }
});

/* ── MENSAJES: programar notificaciones de recordatorio ── */
self.addEventListener("message", function(e) {
  if (!e.data || e.data.type !== "SCHEDULE_NOTIF") return;
  var d = e.data;
  setTimeout(function() {
    self.registration.showNotification(d.title || "Centro Cuídate", {
      body: d.body || "Recordatorio",
      tag: "rem-" + d.id,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
  }, d.delay || 0);
});

/* ── CLICK EN NOTIFICACIÓN: abrir la app ── */
self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(function(cs) {
      for (var i = 0; i < cs.length; i++) {
        if (cs[i].focus) return cs[i].focus();
      }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});
