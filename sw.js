// Service worker — cache applicatif minimal pour usage hors-ligne (PWA)
const CACHE_NAME = 'voyageraujapon-v1';
const APP_SHELL = [
	'./',
	'./index.html',
	'./style.css',
	'./app.js',
	'./manifest.webmanifest',
	'./icon.svg'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
		)
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	event.respondWith(
		caches.match(event.request).then((cached) => {
			const fetchPromise = fetch(event.request)
				.then((response) => {
					if (response.ok && event.request.url.startsWith(self.location.origin)) {
						const copy = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
					}
					return response;
				})
				.catch(() => cached);
			return cached || fetchPromise;
		})
	);
});
