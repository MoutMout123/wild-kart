/* Wild Kart a déménagé : ce service worker efface l'ancien cache et se désinstalle */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))).then(() => self.registration.unregister()).then(() => self.clients.matchAll({ type: 'window' })).then((cs) => cs.forEach((c) => { try { c.navigate(c.url); } catch (x) { /* rien */ } }))); });
