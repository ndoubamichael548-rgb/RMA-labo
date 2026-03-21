// RMA Labo — Service Worker v2
const CACHE_NAME = 'rma-labo-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['./', './index.html']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Firebase = jamais en cache (données temps réel)
  if(url.hostname.includes('googleapis.com') || url.hostname.includes('firebase')) return;
  // Ressources externes = cache après 1er chargement
  if(url.hostname !== location.hostname) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if(cached) return cached;
        return fetch(e.request).then(res => {
          if(res && res.status===200){const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));}
          return res;
        }).catch(()=>cached);
      })
    );
    return;
  }
  // index.html = Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res&&res.status===200){const c=res.clone();caches.open(CACHE_NAME).then(ca=>ca.put(e.request,c));}
        return res;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
