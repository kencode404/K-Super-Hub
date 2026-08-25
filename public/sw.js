const CACHE_NAME = 'k-super-hub-v2'
const APP_SHELL = [
  '/K-Super-Hub/',
  '/K-Super-Hub/manifest.webmanifest',
  '/K-Super-Hub/k-super-hub-icon.png',
  '/K-Super-Hub/icons/k-super-hub-192.png',
  '/K-Super-Hub/icons/k-super-hub-512.png',
  '/K-Super-Hub/icons/k-super-hub-maskable-512.png',
  '/K-Super-Hub/icons/apple-touch-icon.png',
]

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll(APP_SHELL)

  const pageResponse = await fetch('/K-Super-Hub/', { cache: 'reload' })
  const html = await pageResponse.clone().text()
  await cache.put('/K-Super-Hub/', pageResponse)

  const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/K-Super-Hub/'))
    .map((url) => url.href)

  await cache.addAll([...new Set(assetUrls)])
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('k-super-hub-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put('/K-Super-Hub/', copy))
          return response
        })
        .catch(() => caches.match('/K-Super-Hub/')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
