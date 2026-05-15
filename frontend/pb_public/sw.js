self.addEventListener('push', function(event) {
    if (!event.data) return;
    
    try {
        const payload = event.data.json();
        const options = {
            body: payload.body || 'Neue Benachrichtigung',
            icon: '/favicon.png', // Dein App-Icon
            badge: '/favicon.png', // Kleines Icon für die Statusleiste
            data: { url: payload.url || '/' },
            vibrate: [200, 100, 200]
        };

        event.waitUntil(
            self.registration.showNotification(payload.title || 'OrgaFlow', options)
        );
    } catch (err) {
        console.error('[SW] Fehler beim Verarbeiten der Push-Nachricht:', err);
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );
});