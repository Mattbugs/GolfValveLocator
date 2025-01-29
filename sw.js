// Wersja cache - zmień ją gdy aktualizujesz pliki
const CACHE_VERSION = 'v2';
const CACHE_NAME = `golf-valve-locator-${CACHE_VERSION}`;

// Lista zasobów do przechowania w cache
const ASSETS = [
  '/',
  '/index.html',
  '/skrzynki.json',
  '/manifest.json',
  
  // Zasoby zewnętrzne (ważne dla działania offline)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  
  // Ikony
  'https://cdn-icons-png.flaticon.com/512/684/684908.png', // ikona użytkownika
  'https://cdn-icons-png.flaticon.com/512/447/447031.png'  // ikona skrzynki
];

// Instalacja Service Workera
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Dodawanie zasobów do cache');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktywacja Service Workera
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Usuwanie starego cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptowanie żądań
self.addEventListener('fetch', (event) => {
  // Pomijanie żądań nie-GET i Mapbox
  if (event.request.method !== 'GET' || event.request.url.includes('api.mapbox.com')) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Zwróć zasób z cache jeśli istnieje
        if (cachedResponse) {
          return cachedResponse;
        }

        // W przeciwnym razie pobierz z sieci
        return fetch(event.request)
          .then((response) => {
            // Dodaj nowe zasoby do cache
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // Fallback dla błędów (np. brak połączenia)
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});