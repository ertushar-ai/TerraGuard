// TerraGuard frontend -> FastAPI bridge.
// Load this file before page-specific modules.
window.TerraGuardAPI = (() => {
  const API_BASE = window.TERRAGUARD_API_BASE || "http://127.0.0.1:8000/api";

  function token() {
    return localStorage.getItem("terraGuardAccessToken");
  }

  async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const t = token();
    if (t) headers.Authorization = `Bearer ${t}`;

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || `API request failed (${response.status})`);
    return data;
  }

  return {
    base: API_BASE,
    request,
    weather: (lat, lon, location) => request(`/weather?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&location=${encodeURIComponent(location)}`),
    earthquakes: (lat, lon, location) => request(`/earthquakes?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&location=${encodeURIComponent(location)}`),
    landslide: (lat, lon, location) => request(`/landslide?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&location=${encodeURIComponent(location)}`),
    alerts: (lat, lon, location) => request(`/alerts?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&location=${encodeURIComponent(location)}`),
    searchLocations: (q, limit = 5) => request(`/locations/search?q=${encodeURIComponent(q)}&limit=${limit}`),
    signup: async (name, email, password) => {
      const data = await request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
      localStorage.setItem("terraGuardAccessToken", data.access_token);
      localStorage.setItem("terraGuardUser", JSON.stringify(data.user));
      localStorage.setItem("terraGuardLoggedIn", "true");
      return data;
    },
    login: async (email, password) => {
      const data = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      localStorage.setItem("terraGuardAccessToken", data.access_token);
      localStorage.setItem("terraGuardUser", JSON.stringify(data.user));
      localStorage.setItem("terraGuardLoggedIn", "true");
      return data;
    },
    me: () => request("/auth/me"),
    preferences: () => request("/preferences"),
    updatePreferences: (preferences) => request("/preferences", { method: "PUT", body: JSON.stringify(preferences) }),
    subscribePush: (subscription) => request("/notifications/subscribe", { method: "POST", body: JSON.stringify(subscription.toJSON ? subscription.toJSON() : subscription) }),
    unsubscribePush: (endpoint) => request(`/notifications/subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: "DELETE" }),
    vapidPublicKey: () => request("/notifications/vapid-public-key"),
    checkAlerts: (lat, lon, location) => request(`/alerts/check?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&location=${encodeURIComponent(location)}`, { method: "POST" }),
  };
})();
