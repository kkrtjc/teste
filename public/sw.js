const CACHE_NAME = 'mura-manager-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// Instalação do Service Worker e cache dos recursos essenciais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Ativação do SW e limpeza de caches antigos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de Cache First com Fallback para Rede
self.addEventListener('fetch', (e) => {
  // Ignora chamadas para o Supabase ou recursos dinâmicos externos
  if (e.request.url.includes('supabase.co') || e.request.url.includes('chrome-extension')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Busca na rede em background para atualizar o cache (Stale While Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => { /* ignora erro de rede no offline */ });
        
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
