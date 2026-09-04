const terraGuardDefaultLocation = "Delhi";

let locationSearchTimeout = null;
let locationSearchRequestId = 0;

document.addEventListener("DOMContentLoaded", () => {
    initializeDashboard();
    initializeButtons();
    initializeMobileMenu();
    initializeLocation();
    updateLastUpdated();
});

function initializeDashboard() {
    const savedLocation = localStorage.getItem("terraGuardLocation") || terraGuardDefaultLocation;
    updateLocationDisplays(savedLocation);
}

function initializeLocation() {
    const savedLocation = localStorage.getItem("terraGuardLocation") || terraGuardDefaultLocation;

    localStorage.setItem("terraGuardLocation", savedLocation);
    updateLocationDisplays(savedLocation);

    const locationInput = document.getElementById("location-input");
    const locationButton = document.getElementById("change-location-button");
    const suggestions = document.getElementById("location-suggestions");

    if (locationInput) {
        locationInput.value = savedLocation;

        locationInput.addEventListener("input", handleLocationSearch);

        locationInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                changeLocation();
            }

            if (event.key === "Escape") {
                hideLocationSuggestions();
            }
        });

        locationInput.addEventListener("focus", () => {
            if (locationInput.value.trim().length >= 2) {
                handleLocationSearch();
            }
        });
    }

    if (locationButton) {
        locationButton.addEventListener("click", changeLocation);
    }

    document.addEventListener("click", event => {
        const input = document.getElementById("location-input");

        if (
            suggestions &&
            input &&
            event.target !== input &&
            !suggestions.contains(event.target)
        ) {
            hideLocationSuggestions();
        }
    });
}

function handleLocationSearch() {
    const input = document.getElementById("location-input");
    if (!input) return;

    const query = input.value.trim();

    if (query.length < 2) {
        hideLocationSuggestions();
        return;
    }

    clearTimeout(locationSearchTimeout);
    locationSearchTimeout = setTimeout(() => searchIndianLocations(query), 400);
}

async function searchIndianLocations(query) {
    const suggestions = document.getElementById("location-suggestions");
    if (!suggestions) return;

    const requestId = ++locationSearchRequestId;

    suggestions.innerHTML = `<div class="px-4 py-3 text-sm text-gray-500">Searching locations...</div>`;
    suggestions.classList.remove("hidden");

    try {
        const url = "https://nominatim.openstreetmap.org/search?" +
            new URLSearchParams({
                q: query,
                format: "jsonv2",
                addressdetails: "1",
                limit: "5",
                countrycodes: "in",
                "accept-language": "en"
            });

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim HTTP ${response.status}`);
        }

        const results = await response.json();

        if (requestId !== locationSearchRequestId) return;

        displayLocationSuggestions(results);
    } catch (error) {
        console.error("Location search error:", error);

        if (requestId !== locationSearchRequestId) return;

        suggestions.innerHTML = `<div class="px-4 py-3 text-sm text-red-600">Unable to search locations. Please try again.</div>`;
        suggestions.classList.remove("hidden");
    }
}

function displayLocationSuggestions(results) {
    const suggestions = document.getElementById("location-suggestions");
    if (!suggestions) return;

    if (!results || results.length === 0) {
        suggestions.innerHTML = `<div class="px-4 py-3 text-sm text-gray-500">No Indian locations found.</div>`;
        suggestions.classList.remove("hidden");
        return;
    }

    suggestions.innerHTML = "";

    results.forEach(result => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "w-full text-left px-4 py-3 hover:bg-primary/10 transition border-b border-gray-100 last:border-b-0";

        const name = result.name ||
            (result.display_name
                ? result.display_name.split(",")[0]
                : "Unknown location");

        const details = result.display_name || "India";

        item.innerHTML = `
            <div class="flex items-start gap-2">
                <span class="text-lg">📍</span>
                <div class="min-w-0">
                    <div class="font-semibold text-dark">${escapeHTML(name)}</div>
                    <div class="text-xs text-gray-500 truncate">${escapeHTML(details)}</div>
                </div>
            </div>
        `;

        item.addEventListener("click", () => selectLocation(result));
        suggestions.appendChild(item);
    });

    suggestions.classList.remove("hidden");
}

function selectLocation(result) {
    const locationInput = document.getElementById("location-input");
    if (!locationInput || !result) return;

    const locationName = getLocationName(result);

    localStorage.setItem("terraGuardLocation", locationName);
    localStorage.setItem("terraGuardLatitude", result.lat);
    localStorage.setItem("terraGuardLongitude", result.lon);

    localStorage.setItem(
        "terraGuardLocationData",
        JSON.stringify({
            name: locationName,
            latitude: Number(result.lat),
            longitude: Number(result.lon),
            displayName: result.display_name || "",
            osmType: result.osm_type || "",
            osmId: result.osm_id || "",
            address: result.address || {}
        })
    );

    locationInput.value = locationName;
    hideLocationSuggestions();
    updateLocationDisplays(locationName);
    showNotification(`Monitoring location changed to ${locationName}.`, "success");

    setTimeout(() => window.location.reload(), 500);
}

async function changeLocation() {
    const locationInput = document.getElementById("location-input");
    if (!locationInput) return;

    const enteredLocation = locationInput.value.trim();

    if (!enteredLocation) {
        showNotification("Please enter a location.", "error");
        return;
    }

    await searchAndSetLocation(enteredLocation);
}

async function searchAndSetLocation(query) {
    const locationButton = document.getElementById("change-location-button");

    if (locationButton) {
        locationButton.disabled = true;
        locationButton.textContent = "Searching...";
    }

    try {
        const url = "https://nominatim.openstreetmap.org/search?" +
            new URLSearchParams({
                q: query,
                format: "jsonv2",
                addressdetails: "1",
                limit: "5",
                countrycodes: "in",
                "accept-language": "en"
            });

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim HTTP ${response.status}`);
        }

        const results = await response.json();

        if (!results || results.length === 0) {
            showNotification("No Indian location found. Please try another location.", "error");
            return;
        }

        selectLocation(results[0]);
    } catch (error) {
        console.error("Location selection error:", error);
        showNotification("Unable to find this location. Please try again.", "error");
    } finally {
        if (locationButton) {
            locationButton.disabled = false;
            locationButton.textContent = "Set";
        }
    }
}

function getLocationName(result) {
    const address = result.address || {};

    return (
        address.city ||
        address.town ||
        address.municipality ||
        address.village ||
        address.suburb ||
        address.county ||
        result.name ||
        (result.display_name
            ? result.display_name.split(",")[0]
            : "Unknown location")
    );
}

function hideLocationSuggestions() {
    const suggestions = document.getElementById("location-suggestions");

    if (suggestions) {
        suggestions.classList.add("hidden");
    }
}

function updateLocationDisplays(location) {
    document.querySelectorAll("#navbar-location").forEach(
        el => el.textContent = location
    );

    document.querySelectorAll("[data-dashboard-location]").forEach(
        el => el.textContent = location
    );

    document.querySelectorAll("[data-location]").forEach(
        el => el.textContent = location
    );
}

function initializeButtons() {
    document.querySelectorAll("[data-view-map]").forEach(button => {
        button.addEventListener("click", () => {
            window.location.href = "pages/map.html";
        });
    });

    document.querySelectorAll("[data-refresh]").forEach(button => {
        button.addEventListener("click", () => {
            window.location.reload();
        });
    });
}

function initializeMobileMenu() {
    const menuButton = document.getElementById("mobile-menu-button");
    const mobileMenu = document.getElementById("mobile-menu");

    if (!menuButton || !mobileMenu) return;

    menuButton.addEventListener("click", () => {
        mobileMenu.classList.toggle("hidden");
    });
}

function updateLastUpdated() {
    const elements = document.querySelectorAll("[data-last-updated]");
    if (!elements.length) return;

    const updateTime = () => {
        const time = new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });

        elements.forEach(el => {
            el.textContent = `Updated at ${time}`;
        });
    };

    updateTime();
}

function showNotification(message, type = "info") {
    const existing = document.getElementById("terraguard-notification");

    if (existing) {
        existing.remove();
    }

    const notification = document.createElement("div");
    notification.id = "terraguard-notification";
    notification.textContent = message;
    notification.className = `fixed top-20 right-5 z-50 max-w-sm px-5 py-3 rounded-lg shadow-lg text-sm font-semibold transition-all duration-300 ${getNotificationClass(type)}`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = "0";
        notification.style.transform = "translateY(-10px)";

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 2500);
}

function getNotificationClass(type) {
    switch (type) {
        case "success":
            return "bg-primary text-cream";
        case "error":
            return "bg-accent text-white";
        case "warning":
            return "bg-secondary text-dark";
        default:
            return "bg-dark text-cream";
    }
}

function getSavedCoordinates() {
    const latitude = Number(localStorage.getItem("terraGuardLatitude"));
    const longitude = Number(localStorage.getItem("terraGuardLongitude"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return { latitude, longitude };
}

function getSavedLocationData() {
    try {
        const data = localStorage.getItem("terraGuardLocationData");

        if (!data) return null;

        return JSON.parse(data);
    } catch (error) {
        console.error("Location data error:", error);
        return null;
    }
}

function searchLocation(query) {
    if (!query || !query.trim()) return;

    searchAndSetLocation(query.trim());
}

window.TerraGuard = {
    showNotification,
    updateLocationDisplays,
    changeLocation,
    searchLocation,
    getSavedCoordinates,
    getSavedLocationData
};