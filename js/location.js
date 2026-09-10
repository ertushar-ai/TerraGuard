/* =========================================================
   TerraGuard - Automatic GPS Location
   ========================================================= */

   (() => {
    "use strict";

    const KEYS = {
        location: "terraGuardLocation",
        latitude: "terraGuardLatitude",
        longitude: "terraGuardLongitude",
        data: "terraGuardLocationData",
        gpsInitialized: "terraGuardGPSInitialized"
    };

    const DEFAULT_LOCATION = {
        name: "Delhi",
        latitude: 28.6139,
        longitude: 77.2090,
        displayName: "Delhi, India"
    };

    // ---------------------------------------------------------
    // Read saved location
    // ---------------------------------------------------------

    function getSavedLocation() {
        const name =
            localStorage.getItem(KEYS.location);

        const latitude =
            Number(
                localStorage.getItem(KEYS.latitude)
            );

        const longitude =
            Number(
                localStorage.getItem(KEYS.longitude)
            );

        if (
            name &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
        ) {
            return {
                name,
                latitude,
                longitude
            };
        }

        return null;
    }

    // ---------------------------------------------------------
    // Save location
    // ---------------------------------------------------------

    function saveLocation(location) {
        localStorage.setItem(
            KEYS.location,
            location.name
        );

        localStorage.setItem(
            KEYS.latitude,
            String(location.latitude)
        );

        localStorage.setItem(
            KEYS.longitude,
            String(location.longitude)
        );

        localStorage.setItem(
            KEYS.data,
            JSON.stringify(location)
        );
    }

    // ---------------------------------------------------------
    // Notification
    // ---------------------------------------------------------

    function showMessage(message, type = "info") {
        if (
            window.TerraGuard &&
            typeof window.TerraGuard.showNotification === "function"
        ) {
            window.TerraGuard.showNotification(
                message,
                type
            );
            return;
        }

        const old =
            document.getElementById(
                "terraguard-location-message"
            );

        if (old) {
            old.remove();
        }

        const box =
            document.createElement("div");

        box.id =
            "terraguard-location-message";

        box.textContent = message;

        box.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 99999;
            padding: 14px 18px;
            border-radius: 10px;
            background: #283618;
            color: white;
            font: 14px Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,.2);
        `;

        document.body.appendChild(box);

        setTimeout(() => {
            box.remove();
        }, 5000);
    }

    // ---------------------------------------------------------
    // Get browser GPS
    // ---------------------------------------------------------

    function getBrowserLocation() {
        return new Promise(
            (resolve, reject) => {

                if (
                    !navigator.geolocation
                ) {
                    reject(
                        new Error(
                            "Geolocation is not supported by this browser."
                        )
                    );
                    return;
                }

                navigator.geolocation.getCurrentPosition(

                    position => {
                        resolve({
                            latitude:
                                position.coords.latitude,

                            longitude:
                                position.coords.longitude,

                            accuracy:
                                position.coords.accuracy
                        });
                    },

                    error => {

                        console.error(
                            "GPS error:",
                            error
                        );

                        switch (error.code) {

                            case 1:
                                reject(
                                    new Error(
                                        "Location permission was denied."
                                    )
                                );
                                break;

                            case 2:
                                reject(
                                    new Error(
                                        "Your location is currently unavailable."
                                    )
                                );
                                break;

                            case 3:
                                reject(
                                    new Error(
                                        "Location request timed out."
                                    )
                                );
                                break;

                            default:
                                reject(
                                    new Error(
                                        "Unable to detect your location."
                                    )
                                );
                        }
                    },

                    {
                        enableHighAccuracy: true,
                        timeout: 20000,
                        maximumAge: 0
                    }
                );
            }
        );
    }

    // ---------------------------------------------------------
    // Reverse geocode GPS coordinates
    // ---------------------------------------------------------

    async function reverseGeocode(
        latitude,
        longitude
    ) {
        try {
            if (window.TerraGuardAPI && typeof window.TerraGuardAPI.request === "function") {
                const backendResult = await window.TerraGuardAPI.request(
                    `/locations/reverse?latitude=${latitude}&longitude=${longitude}`
                );
                if (backendResult && backendResult.name) {
                    return {
                        name: backendResult.name,
                        latitude,
                        longitude,
                        displayName: backendResult.display_name || backendResult.name,
                        address: backendResult.address || {}
                    };
                }
            }
        } catch (backendError) {
            console.warn("Backend reverse geocode failed, using direct client fallback:", backendError);
        }

        const params =
            new URLSearchParams({
                format: "jsonv2",
                lat: latitude,
                lon: longitude,
                zoom: "10",
                addressdetails: "1",
                "accept-language": "en"
            });

        const response =
            await fetch(
                `https://nominatim.openstreetmap.org/reverse?${params}`,
                {
                    headers: {
                        "Accept":
                            "application/json"
                    }
                }
            );

        if (!response.ok) {
            throw new Error(
                `Location service error (${response.status})`
            );
        }

        const data =
            await response.json();

        const address =
            data.address || {};

        const name =
            address.city ||
            address.town ||
            address.municipality ||
            address.village ||
            address.suburb ||
            address.county ||
            address.state_district ||
            address.state ||
            "Your Location";

        return {
            name,
            latitude,
            longitude,
            displayName:
                data.display_name || name,
            osmType:
                data.osm_type || "",
            osmId:
                data.osm_id || "",
            address
        };
    }

    // ---------------------------------------------------------
    // Update UI
    // ---------------------------------------------------------

    function updateUI(location) {

        if (
            window.TerraGuard &&
            typeof window.TerraGuard.updateLocationDisplays ===
                "function"
        ) {
            window.TerraGuard.updateLocationDisplays(
                location.name
            );
        }

        document
            .querySelectorAll(
                "#location-input"
            )
            .forEach(input => {
                input.value =
                    location.name;
            });

        document
            .querySelectorAll(
                "#navbar-location"
            )
            .forEach(element => {
                element.textContent =
                    location.name;
            });

        document
            .querySelectorAll(
                "[data-dashboard-location]"
            )
            .forEach(element => {
                element.textContent =
                    location.name;
            });

        document
            .querySelectorAll(
                "[data-location]"
            )
            .forEach(element => {
                element.textContent =
                    location.name;
            });
    }

    // ---------------------------------------------------------
    // Distance check
    // ---------------------------------------------------------

    function distanceInMeters(
        lat1,
        lon1,
        lat2,
        lon2
    ) {
        const earthRadius = 6371000;

        const dLat =
            (lat2 - lat1) *
            Math.PI / 180;

        const dLon =
            (lon2 - lon1) *
            Math.PI / 180;

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) *
            Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;

        return (
            2 *
            earthRadius *
            Math.atan2(
                Math.sqrt(a),
                Math.sqrt(1 - a)
            )
        );
    }

    // ---------------------------------------------------------
    // Detect + save
    // ---------------------------------------------------------

    async function detectLocation(
        reloadAfterDetection = false
    ) {

        showMessage(
            "📍 Detecting your current location..."
        );

        try {

            const gps =
                await getBrowserLocation();

            console.log(
                "TerraGuard GPS coordinates:",
                gps
            );

            showMessage(
                "📍 GPS location found. Identifying area..."
            );

            const location =
                await reverseGeocode(
                    gps.latitude,
                    gps.longitude
                );

            location.accuracy =
                gps.accuracy;

            location.detectedAt =
                new Date().toISOString();

            const previous =
                getSavedLocation();

            const moved =
                !previous ||
                distanceInMeters(
                    previous.latitude,
                    previous.longitude,
                    location.latitude,
                    location.longitude
                ) > 100;

            saveLocation(location);

            localStorage.setItem(
                KEYS.gpsInitialized,
                "true"
            );

            updateUI(location);

            console.log(
                "TerraGuard detected location:",
                location
            );

            window.dispatchEvent(
                new CustomEvent(
                    "terraGuardLocationChanged",
                    {
                        detail: location
                    }
                )
            );

            showMessage(
                `📍 Monitoring ${location.name}`,
                "success"
            );

            /*
             * Reload only when necessary.
             *
             * This makes weather / earthquake /
             * landslide modules read the new GPS
             * coordinates from LocalStorage.
             */

            if (
                reloadAfterDetection &&
                moved
            ) {
                setTimeout(() => {
                    window.location.reload();
                }, 700);
            }

            return location;

        } catch (error) {

            console.error(
                "TerraGuard automatic location failed:",
                error
            );

            showMessage(
                `📍 ${error.message}`,
                "error"
            );

            const saved =
                getSavedLocation();

            if (saved) {
                updateUI(saved);
                return saved;
            }

            saveLocation(
                DEFAULT_LOCATION
            );

            updateUI(
                DEFAULT_LOCATION
            );

            return DEFAULT_LOCATION;
        }
    }

    // ---------------------------------------------------------
    // Check permission state
    // ---------------------------------------------------------

    async function getPermissionState() {

        if (
            !navigator.permissions ||
            !navigator.permissions.query
        ) {
            return "unknown";
        }

        try {

            const permission =
                await navigator.permissions.query({
                    name: "geolocation"
                });

            return permission.state;

        } catch {
            return "unknown";
        }
    }

    // ---------------------------------------------------------
    // Initialize
    // ---------------------------------------------------------

    async function initialize() {

        const saved =
            getSavedLocation();

        const gpsInitialized =
            localStorage.getItem(
                KEYS.gpsInitialized
            ) === "true";

        const permission =
            await getPermissionState();

        console.log(
            "TerraGuard location status:",
            {
                saved,
                gpsInitialized,
                permission
            }
        );

        /*
         * FIRST VISIT
         *
         * Even if an old manual location exists,
         * if GPS permission has never been initialized,
         * explicitly request the browser location.
         */

        if (
            !gpsInitialized ||
            permission === "prompt"
        ) {

            await detectLocation(
                true
            );

            return;
        }

        /*
         * Permission already granted.
         *
         * Refresh GPS automatically when the user
         * returns to the dashboard.
         */

        if (
            permission === "granted"
        ) {

            await detectLocation(
                true
            );

            return;
        }

        /*
         * Permission denied.
         *
         * Don't repeatedly annoy the user.
         * Use the saved/manual location.
         */

        if (saved) {
            updateUI(saved);
            return;
        }

        saveLocation(
            DEFAULT_LOCATION
        );

        updateUI(
            DEFAULT_LOCATION
        );
    }

    // ---------------------------------------------------------
    // Public API
    // ---------------------------------------------------------

    window.TerraGuardLocation = {

        detect: () =>
            detectLocation(true),

        get: getSavedLocation,

        save: saveLocation,

        request: getBrowserLocation
    };

    // ---------------------------------------------------------
    // Start
    // ---------------------------------------------------------

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize,
            { once: true }
        );

    } else {

        initialize();

    }

})();