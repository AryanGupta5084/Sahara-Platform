const STATIC_CACHE_NAME = 'sahara-static-v1';
const DYNAMIC_CACHE_NAME = 'sahara-dynamic-v1';

const CORE_APP_SHELL = [
    '/index.html',
    '/styles.css',
    '/admin.css',
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                return cache.addAll(CORE_APP_SHELL);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                return response;
            }
            
            return fetch(event.request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                
                const responseToCache = networkResponse.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                    .then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    
                return networkResponse;
            });
        })
    );
});