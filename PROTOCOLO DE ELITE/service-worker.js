/* Offline-first cache (app shell + runtime) */
const CACHE_NAME = 'doencas-galinhas-v1'
const RUNTIME_CACHE = 'doencas-galinhas-runtime-v1'

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/diseases.json',
  '/version.json',
  '/app-icon-192.png',
  '/app-icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => (n !== CACHE_NAME && n !== RUNTIME_CACHE ? caches.delete(n) : Promise.resolve()))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          if (!res || res.status !== 200) return res
          const copy = res.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => {
          if (request.destination === 'document') return caches.match('/offline.html')
          return undefined
        })
    }),
  )
})

