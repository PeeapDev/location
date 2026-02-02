/**
 * Service Worker for Xeeno Map - True Offline Support
 *
 * Caches:
 * - App shell (HTML, CSS, JS)
 * - Static assets
 * - API responses for zones
 */

const CACHE_NAME = 'xeeno-map-v1';
const STATIC_CACHE = 'xeeno-static-v1';
const API_CACHE = 'xeeno-api-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/directory',
  '/search',
  '/manifest.json',
];

// API endpoints to cache
const API_PATTERNS = [
  '/api/v1/zones',
  '/api/v1/geography/zones',
  '/api/v1/search/districts',
  '/api/v1/zones/districts',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Some static assets failed to cache:', err);
      });
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network first, cache fallback
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(event.request, API_CACHE));
    return;
  }

  // Static assets - cache first, network fallback
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(event.request, STATIC_CACHE));
    return;
  }

  // HTML pages - network first for fresh content
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(event.request, STATIC_CACHE));
    return;
  }

  // Default - cache first
  event.respondWith(cacheFirstStrategy(event.request, CACHE_NAME));
});

// Check if request is an API call
function isApiRequest(url) {
  return API_PATTERNS.some((pattern) => url.pathname.includes(pattern));
}

// Check if request is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// Cache first strategy - good for static assets
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Return cached version, update cache in background
    updateCache(request, cache);
    return cachedResponse;
  }

  // Not in cache, fetch from network
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, return offline page
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Network first strategy - good for API and HTML
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Nothing in cache either
    return new Response(JSON.stringify({ error: 'Offline', message: 'No cached data available' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Update cache in background
async function updateCache(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Ignore network errors during background update
  }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_ZONES') {
    // Pre-cache zone data
    event.waitUntil(cacheZoneData(event.data.url));
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// Cache zone data for offline use
async function cacheZoneData(url) {
  try {
    const cache = await caches.open(API_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      await cache.put(url, response);
      console.log('[SW] Cached zone data:', url);
    }
  } catch (error) {
    console.error('[SW] Failed to cache zone data:', error);
  }
}

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

console.log('[SW] Service worker loaded');
