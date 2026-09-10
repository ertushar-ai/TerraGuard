const CACHE_NAME = "terraguard-v1";

self.addEventListener("install", event => {
    console.log("[TerraGuard SW] Installed");
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    console.log("[TerraGuard SW] Activated");
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
    let data = {
        title: "TerraGuard Alert",
        body: "A new disaster alert has been received.",
        icon: "/assets/favicon.png",
        badge: "/assets/favicon.png"
    };

    if (event.data) {
        try {
            data = {
                ...data,
                ...event.data.json()
            };
        } catch (error) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag || "terraguard-alert",
            data: data.data || {}
        })
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(clientList => {
            for (const client of clientList) {
                if ("focus" in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow("/");
            }
        })
    );
});