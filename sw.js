const CACHE_NAME = 'zenith-immortal-v3'; // Bumping this obliterates the old cache

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest-core.json', // FIX: Updated to match your HTML file's manifest name
    './tailwind.js',
    './chart.js',
    './confetti.js'
];

// Install Phase: Lock local assets into the vault
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

// Activation Phase: Purge old V1 caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) return caches.delete(cache);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interception Phase: Stale-While-Revalidate for HTML, Cache-First for Heavy Assets
self.addEventListener('fetch', (event) => {
    // 1. Dynamic update protocol for the main app interface
    if (event.request.mode === 'navigate' || event.request.url.includes('index.html')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                    return networkResponse;
                }).catch(() => cachedResponse); // Stay immortal if offline
                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // 2. Strict offline lock for heavy libraries and fonts
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request).then((networkResponse) => {
                if (event.request.url.includes('font-awesome') || event.request.url.includes('fontawesome')) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => { cache.put(event.request, responseClone); });
                }
                return networkResponse;
            }).catch(() => new Response('', { status: 408, statusText: 'Offline' }));
        })
    );
});
