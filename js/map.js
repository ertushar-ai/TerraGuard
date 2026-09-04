const mapLocations = {
    Delhi: { latitude: 28.6139, longitude: 77.2090 },
    Ghaziabad: { latitude: 28.6692, longitude: 77.4538 },
    Dehradun: { latitude: 30.3165, longitude: 78.0322 },
    Shimla: { latitude: 31.1048, longitude: 77.1734 },
    Srinagar: { latitude: 34.0837, longitude: 74.7973 },
    Gangtok: { latitude: 27.3389, longitude: 88.6065 },
    Darjeeling: { latitude: 27.0410, longitude: 88.2663 },
    Manali: { latitude: 32.2396, longitude: 77.1887 },
    Mussoorie: { latitude: 30.4598, longitude: 78.0664 },
    Nainital: { latitude: 29.3919, longitude: 79.4542 }
};

async function initializeMap() {
    const mapElement = document.querySelector("[data-map]");

    if (!mapElement) return;

    if (typeof L === "undefined") {
        console.error("Leaflet is not loaded.");
        return;
    }

    const selectedLocation =
        localStorage.getItem("terraGuardLocation") || "Delhi";

    try {
        const coordinates =
            await getLocationCoordinates(selectedLocation);

        createMap(
            mapElement,
            coordinates.latitude,
            coordinates.longitude,
            selectedLocation
        );
    } catch (error) {
        console.error("Map initialization failed:", error);

        const fallback = mapLocations.Delhi;

        createMap(
            mapElement,
            fallback.latitude,
            fallback.longitude,
            "Delhi"
        );
    }
}

async function getLocationCoordinates(location) {
    if (mapLocations[location]) {
        return mapLocations[location];
    }

    return await geocodeLocation(location);
}

async function geocodeLocation(location) {
    const url =
        "https://nominatim.openstreetmap.org/search?" +
        new URLSearchParams({
            q: `${location}, India`,
            format: "json",
            limit: "1"
        });

    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Location search failed.");
    }

    const data = await response.json();

    if (!data.length) {
        throw new Error("Location not found.");
    }

    return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
    };
}

function createMap(
    mapElement,
    latitude,
    longitude,
    locationName
) {
    if (window.TerraGuardMapInstance) {
        window.TerraGuardMapInstance.remove();
        window.TerraGuardMapInstance = null;
    }

    const map = L.map(mapElement).setView(
        [latitude, longitude],
        7
    );

    window.TerraGuardMapInstance = map;

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }
    ).addTo(map);

    const locationMarker = L.marker([
        latitude,
        longitude
    ]).addTo(map);

    locationMarker.bindPopup(`
        <div>
            <strong>${escapeHTML(locationName)}</strong><br>
            Selected monitoring location
        </div>
    `);

    loadEarthquakeMarkers(
        map,
        latitude,
        longitude
    );

    addDemoLandslideMarkers(map);

    locationMarker.openPopup();
}

async function loadEarthquakeMarkers(
    map,
    latitude,
    longitude
) {
    try {
        const endTime = new Date();

        const startTime = new Date(
            endTime.getTime() -
            7 * 24 * 60 * 60 * 1000
        );

        const params = new URLSearchParams({
            format: "geojson",
            starttime: startTime.toISOString(),
            endtime: endTime.toISOString(),
            latitude,
            longitude,
            maxradiuskm: 500,
            minmagnitude: 2.5,
            orderby: "time",
            limit: 50
        });

        const url =
            "https://earthquake.usgs.gov/fdsnws/event/1/query?" +
            params.toString();

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `USGS request failed: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.features || data.features.length === 0) {
            console.log(
                "No recent USGS earthquakes found near the selected location."
            );

            return;
        }

        data.features.forEach(earthquake => {
            addEarthquakeMarker(
                map,
                earthquake,
                latitude,
                longitude
            );
        });

        console.log(
            `${data.features.length} earthquake(s) loaded from USGS.`
        );
    } catch (error) {
        console.error(
            "Unable to load USGS earthquake data:",
            error
        );
    }
}

function addEarthquakeMarker(
    map,
    earthquake,
    selectedLatitude,
    selectedLongitude
) {
    const properties = earthquake.properties || {};
    const coordinates =
        earthquake.geometry?.coordinates || [];

    const magnitude = Number(properties.mag || 0);
    const epicenterLongitude = Number(coordinates[0]);
    const epicenterLatitude = Number(coordinates[1]);
    const depth = Number(coordinates[2] || 0);

    if (
        !Number.isFinite(epicenterLatitude) ||
        !Number.isFinite(epicenterLongitude)
    ) {
        return;
    }

    const distance =
        window.TerraGuardUtils.calculateDistance(
            selectedLatitude,
            selectedLongitude,
            epicenterLatitude,
            epicenterLongitude
        );

    const riskResult =
        window.TerraGuardUtils.calculateEarthquakeRisk(
            magnitude,
            distance,
            depth
        );

    const risk = riskResult.level;

    const marker = L.circleMarker(
        [epicenterLatitude, epicenterLongitude],
        {
            radius: getEarthquakeMarkerSize(magnitude),
            fillOpacity: 0.75,
            weight: 2,
            color: getEarthquakeColor(risk),
            fillColor: getEarthquakeColor(risk)
        }
    ).addTo(map);

    const eventTime = properties.time
        ? new Date(properties.time).toLocaleString()
        : "Unknown";

    const place =
        properties.place || "Unknown location";

    marker.bindPopup(`
        <div style="min-width: 220px;">
            <strong>Earthquake</strong><hr>
            <div><strong>Magnitude:</strong> ${magnitude.toFixed(1)}</div>
            <div><strong>Depth:</strong> ${depth.toFixed(1)} km</div>
            <div><strong>Distance:</strong> ${distance.toFixed(1)} km</div>
            <div><strong>Risk:</strong> ${escapeHTML(risk)}</div>
            <div><strong>Location:</strong> ${escapeHTML(place)}</div>
            <div><strong>Time:</strong> ${escapeHTML(eventTime)}</div>
        </div>
    `);
}

function getEarthquakeMarkerSize(magnitude) {
    if (magnitude >= 7) return 14;
    if (magnitude >= 6) return 12;
    if (magnitude >= 5) return 10;
    if (magnitude >= 4) return 8;

    return 6;
}

function getEarthquakeColor(risk) {
    switch (risk) {
        case "Critical":
            return "#283618";
        case "High":
            return "#BC6C25";
        case "Moderate":
            return "#DDA15E";
        default:
            return "#606C38";
    }
}

function addDemoLandslideMarkers(map) {
    const landslideLocations = [
        {
            name: "Dehradun",
            latitude: 30.3165,
            longitude: 78.0322,
            risk: "Moderate"
        },
        {
            name: "Mussoorie",
            latitude: 30.4598,
            longitude: 78.0664,
            risk: "Moderate"
        },
        {
            name: "Nainital",
            latitude: 29.3919,
            longitude: 79.4542,
            risk: "Low"
        }
    ];

    landslideLocations.forEach(location => {
        const marker = L.circleMarker(
            [
                location.latitude,
                location.longitude
            ],
            {
                radius: 7,
                fillOpacity: 0.7,
                weight: 2,
                color: getLandslideColor(location.risk),
                fillColor: getLandslideColor(location.risk)
            }
        ).addTo(map);

        marker.bindPopup(`
            <div style="min-width: 190px;">
                <strong>Landslide Monitoring Area</strong><hr>
                <div>
                    <strong>Location:</strong>
                    ${escapeHTML(location.name)}
                </div>
                <div>
                    <strong>Risk:</strong>
                    ${escapeHTML(location.risk)}
                </div>
                <small>Sample monitoring data</small>
            </div>
        `);
    });
}

function getLandslideColor(risk) {
    switch (risk) {
        case "Critical":
            return "#283618";
        case "High":
            return "#BC6C25";
        case "Moderate":
            return "#DDA15E";
        default:
            return "#606C38";
    }
}

async function refreshMap() {
    const mapElement = document.querySelector("[data-map]");

    if (!mapElement) return;

    if (window.TerraGuardMapInstance) {
        window.TerraGuardMapInstance.remove();
        window.TerraGuardMapInstance = null;
    }

    await initializeMap();
}

window.TerraGuardMap = {
    initializeMap,
    refreshMap,
    geocodeLocation,
    getLocationCoordinates,
    loadEarthquakeMarkers
};

document.addEventListener(
    "DOMContentLoaded",
    initializeMap
);