window.TerraGuardNotifications = {
  async enable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      throw new Error("This browser does not support Web Push notifications.");
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Notification permission was not granted.");

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const keyData = await window.TerraGuardAPI.vapidPublicKey();
    if (!keyData.publicKey) throw new Error("Web Push is not configured on the backend yet.");

    const existing = await registration.pushManager.getSubscription();
    const subscription = existing || await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(keyData.publicKey),
    });

    await window.TerraGuardAPI.subscribePush(subscription);
    return subscription;
  },

  async disable() {
    const registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) return;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await window.TerraGuardAPI.unsubscribePush(subscription.endpoint);
    await subscription.unsubscribe();
  },

  urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  },
};
