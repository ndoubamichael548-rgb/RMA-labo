// ── RMA Labo — Service Worker ──
// Met l'app en cache pour fonctionner hors ligne
const CACHE = 'rma-labo-v1';

// Ressources à mettre en cache dès la 1ère visite
const PRECACHE = [
  './',
  './index.html',
];

// Ressources externes lourdes — mises en cache après 1er chargement
const RUNTIME_CACHE = [
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js',
];

// Installation : mise en cache des ressources locales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch : stratégie Cache First pour les ressources locales,
// Network First pour Firebase (données temps réel)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase Firestore — toujours réseau (données temps réel)
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('firebase') ||
      url.pathname.includes('/v1/projects/')) {
    return; // laisser passer sans cache
  }

  // Scripts Firebase et jsPDF — cache après 1er chargement
  if (RUNTIME_CACHE.some(u => e.request.url.startsWith(u))) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
          return response;
        }).catch(() => cached); // si hors ligne, renvoyer le cache
      })
    );
    return;
  }

  // Ressources locales (index.html, CSS inline) — Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Hors ligne et pas en cache → renvoyer index.html
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
