self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {}

  const title = data.title || "TerraGuard Alert";
  const options = {
    body: data.body || "A new disaster alert is available.",
    icon: "/assets/favicon.png",
    badge: "/assets/favicon.png",
    tag: `terraguard-${data.type || "alert"}-${data.severity || "notice"}`,
    data: { url: data.url || "/" },
    requireInteraction: data.severity === "Critical" || data.severity === "High",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) {
      if ("focus" in client) {
        client.navigate(url);
        return client.focus();
      }
    }
    return clients.openWindow(url);
  }));
});
