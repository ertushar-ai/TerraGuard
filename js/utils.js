function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit"
    });
}

function formatDateTime(date) {
    const value = new Date(date);
    return `${formatDate(value)} ${formatTime(value)}`;
}

function formatNumber(value, decimals = 1) {
    const number = Number(value);
    return Number.isNaN(number) ? "0" : number.toFixed(decimals);
}

function formatDistance(distance) {
    const value = Number(distance);
    if (Number.isNaN(value)) return "0 km";
    if (value < 1) return `${Math.round(value * 1000)} m`;
    return `${value.toFixed(1)} km`;
}

function formatTemperature(value) {
    return `${Math.round(Number(value))}°C`;
}

function formatPercentage(value) {
    return `${Math.round(Number(value))}%`;
}

function getRiskLevelClass(riskLevel) {
    switch (String(riskLevel).toLowerCase()) {
        case "low":
        case "safe": return "risk-badge-low";
        case "moderate": return "risk-badge-moderate";
        case "high": return "risk-badge-high";
        case "critical": return "risk-badge-critical";
        default: return "risk-badge-low";
    }
}

function getRiskLabel(riskLevel) {
    switch (String(riskLevel).toLowerCase()) {
        case "low": return "Low";
        case "moderate": return "Moderate";
        case "high": return "High";
        case "critical": return "Critical";
        case "safe": return "Safe";
        default: return "Unknown";
    }
}

function getElement(selector) {
    return document.querySelector(selector);
}

function getElements(selector) {
    return document.querySelectorAll(selector);
}

function setText(selector, value) {
    const element = getElement(selector);
    if (element) element.textContent = value;
}

function showElement(selector) {
    const element = getElement(selector);
    if (element) element.classList.remove("hidden");
}

function hideElement(selector) {
    const element = getElement(selector);
    if (element) element.classList.add("hidden");
}

function saveLocation(location) {
    localStorage.setItem("terraGuardLocation", location);
}

function loadLocation() {
    return localStorage.getItem("terraGuardLocation") || "Delhi";
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
}

function debounce(callback, delay = 300) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => callback(...args), delay);
    };
}

function setLoading(element, loading) {
    if (!element) return;

    if (loading) {
        element.classList.add("loading");
        element.setAttribute("aria-busy", "true");
    } else {
        element.classList.remove("loading");
        element.removeAttribute("aria-busy");
    }
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function getTimestamp() {
    return new Date().toISOString();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const earthRadius = 6371;
    const latDiff = (lat2 - lat1) * Math.PI / 180;
    const lonDiff = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(latDiff / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(lonDiff / 2) ** 2;

    return earthRadius * 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );
}

function calculateEarthquakeRisk(
    magnitude,
    distance,
    depth = 0,
    earthquakes = []
) {
    let score = 0;
    const reasons = [];

    if (magnitude >= 7) {
        score += 8;
        reasons.push("Very strong earthquake magnitude");
    } else if (magnitude >= 6) {
        score += 7;
        reasons.push("Strong earthquake magnitude");
    } else if (magnitude >= 5) {
        score += 5;
        reasons.push("Moderate earthquake magnitude");
    } else if (magnitude >= 4) {
        score += 3;
        reasons.push("Noticeable earthquake magnitude");
    } else if (magnitude >= 2.5) {
        score += 1;
    }

    if (distance <= 50) {
        score += 8;
        reasons.push("Earthquake is very close to the selected location");
    } else if (distance <= 100) {
        score += 6;
        reasons.push("Earthquake is within 100 km");
    } else if (distance <= 200) {
        score += 4;
        reasons.push("Earthquake is within 200 km");
    } else if (distance <= 300) {
        score += 2;
        reasons.push("Earthquake is within 300 km");
    }

    if (depth >= 0 && depth <= 10) {
        score += 4;
        reasons.push("Very shallow earthquake");
    } else if (depth <= 30) {
        score += 3;
    } else if (depth <= 70) {
        score += 1;
    }

    const recentEarthquakes = earthquakes.filter(eq =>
        Date.now() - eq.time.getTime() <= 72 * 60 * 60 * 1000
    );

    if (recentEarthquakes.length >= 5) {
        score += 5;
        reasons.push("High recent earthquake activity");
    } else if (recentEarthquakes.length >= 3) {
        score += 3;
        reasons.push("Multiple recent earthquakes detected");
    } else if (recentEarthquakes.length >= 2) {
        score += 1;
    }

    let level;

    if (score >= 20) level = "Critical";
    else if (score >= 14) level = "High";
    else if (score >= 8) level = "Moderate";
    else if (score >= 4) level = "Low";
    else level = "Safe";

    return {
        level,
        score,
        reasons
    };
}

window.TerraGuardUtils = {
    formatDate,
    formatTime,
    formatDateTime,
    formatNumber,
    formatDistance,
    formatTemperature,
    formatPercentage,
    getRiskLevelClass,
    getRiskLabel,
    getElement,
    getElements,
    setText,
    showElement,
    hideElement,
    saveLocation,
    loadLocation,
    fetchJSON,
    debounce,
    setLoading,
    escapeHTML,
    getTimestamp,
    calculateDistance,
    calculateEarthquakeRisk
};