const earthquakeLocations = {
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

const terraGuardEarthquakeConfig = {
    searchRadiusKm: 500,
    minimumMagnitude: 2.5,
    resultLimit: 50,
    lookbackDays: 7,
    criticalDistanceKm: 50,
    highDistanceKm: 100,
    moderateDistanceKm: 200,
    lowDistanceKm: 300
};

async function initializeEarthquake() {
    const location =
        localStorage.getItem("terraGuardLocation") || "Delhi";

    await loadEarthquakeData(location);

    const refreshButton =
        document.querySelector("[data-earthquake-refresh]");

    if (
        refreshButton &&
        !refreshButton.dataset.earthquakeInitialized
    ) {
        refreshButton.dataset.earthquakeInitialized = "true";

        refreshButton.addEventListener("click", () => {
            const currentLocation =
                localStorage.getItem("terraGuardLocation") || "Delhi";

            loadEarthquakeData(currentLocation);
        });
    }

    if (!window.TerraGuardEarthquakeRefreshInterval) {
        window.TerraGuardEarthquakeRefreshInterval =
            setInterval(() => {
                const currentLocation =
                    localStorage.getItem("terraGuardLocation") || "Delhi";

                loadEarthquakeData(currentLocation);
            }, 10 * 60 * 1000);
    }
}

function getEarthquakeCoordinates(location) {
    if (window.TerraGuard?.getSavedCoordinates) {
        const savedCoordinates =
            window.TerraGuard.getSavedCoordinates();

        if (
            savedCoordinates &&
            Number.isFinite(Number(savedCoordinates.latitude)) &&
            Number.isFinite(Number(savedCoordinates.longitude))
        ) {
            return {
                latitude: Number(savedCoordinates.latitude),
                longitude: Number(savedCoordinates.longitude)
            };
        }
    }

    const savedLatitude =
        Number(localStorage.getItem("terraGuardLatitude"));

    const savedLongitude =
        Number(localStorage.getItem("terraGuardLongitude"));

    if (
        Number.isFinite(savedLatitude) &&
        Number.isFinite(savedLongitude)
    ) {
        return {
            latitude: savedLatitude,
            longitude: savedLongitude
        };
    }

    return (
        earthquakeLocations[location] ||
        earthquakeLocations.Delhi
    );
}

async function loadEarthquakeData(location) {
    try {
        const data =
            await fetchEarthquakeData(location);

        window.TerraGuardEarthquakeData = data;

        updateEarthquakeUI(data);

        console.log(
            "TerraGuard Earthquake Data:",
            data
        );

        return data;
    } catch (error) {
        console.error(
            "USGS Earthquake API Error:",
            error
        );

        window.TerraGuard?.showNotification?.(
            "Unable to load earthquake data.",
            "error"
        );

        return null;
    }
}

async function fetchEarthquakeData(location) {
    const coordinates =
        getEarthquakeCoordinates(location);

    try {
        if (window.TerraGuardAPI && typeof window.TerraGuardAPI.earthquakes === "function") {
            const backendData = await window.TerraGuardAPI.earthquakes(coordinates.latitude, coordinates.longitude, location);
            if (backendData && Array.isArray(backendData.earthquakes)) {
                return backendData;
            }
        }
    } catch (backendError) {
        console.warn("FastAPI earthquake endpoint failed, using direct USGS fallback:", backendError);
    }

    const endTime = new Date();

    const startTime = new Date(
        endTime.getTime() -
        terraGuardEarthquakeConfig.lookbackDays *
        24 *
        60 *
        60 *
        1000
    );

    const params = new URLSearchParams({
        format: "geojson",
        starttime: startTime.toISOString(),
        endtime: endTime.toISOString(),
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        maxradiuskm: String(
            terraGuardEarthquakeConfig.searchRadiusKm
        ),
        minmagnitude: String(
            terraGuardEarthquakeConfig.minimumMagnitude
        ),
        orderby: "time",
        limit: String(
            terraGuardEarthquakeConfig.resultLimit
        )
    });

    const url =
        `https://earthquake.usgs.gov/fdsnws/event/1/query?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `USGS request failed: ${response.status}`
        );
    }

    const data = await response.json();

    const features =
        Array.isArray(data.features)
            ? data.features
            : [];

    const earthquakes = features
        .map(earthquake => {
            const properties =
                earthquake.properties || {};

            const geometry =
                earthquake.geometry || {};

            const eventCoordinates =
                geometry.coordinates || [];

            const latitude =
                Number(eventCoordinates[1]);

            const longitude =
                Number(eventCoordinates[0]);

            const depth =
                Number(eventCoordinates[2]) || 0;

            const magnitude =
                Number(properties.mag) || 0;

            const time =
                properties.time
                    ? new Date(properties.time)
                    : new Date();

            const distance =
                window.TerraGuardUtils.calculateDistance(
                    coordinates.latitude,
                    coordinates.longitude,
                    latitude,
                    longitude
                );

            return {
                id:
                    properties.code ||
                    earthquake.id ||
                    `earthquake-${time.getTime()}`,
                magnitude,
                depth,
                distance,
                latitude,
                longitude,
                place:
                    properties.place ||
                    "Unknown location",
                time,
                tsunami:
                    properties.tsunami === 1,
                url:
                    properties.url ||
                    null
            };
        })
        .filter(
            earthquake =>
                Number.isFinite(earthquake.latitude) &&
                Number.isFinite(earthquake.longitude)
        )
        .sort(
            (a, b) =>
                b.time - a.time
        );

    if (earthquakes.length === 0) {
        return {
            location,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            magnitude: 0,
            depth: 0,
            distance: 0,
            place: "No significant earthquake detected",
            time: new Date(),
            risk: "Safe",
            score: 0,
            earthquakes: [],
            nearbyEarthquakeCount: 0,
            strongestEarthquake: null,
            nearestEarthquake: null,
            dataSource:
                "USGS Earthquake Hazards Program",
            lastUpdated: new Date()
        };
    }

    const strongestEarthquake =
        [...earthquakes].sort(
            (a, b) =>
                b.magnitude - a.magnitude
        )[0];

    const nearestEarthquake =
        [...earthquakes].sort(
            (a, b) =>
                a.distance - b.distance
        )[0];

    const relevantEarthquake =
        findMostRelevantEarthquake(
            earthquakes
        );

    const riskResult =
        window.TerraGuardUtils.calculateEarthquakeRisk(
            relevantEarthquake.magnitude,
            relevantEarthquake.distance,
            relevantEarthquake.depth,
            earthquakes
        );

    return {
        location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        magnitude:
            relevantEarthquake.magnitude,
        depth:
            relevantEarthquake.depth,
        distance:
            relevantEarthquake.distance,
        latitudeEarthquake:
            relevantEarthquake.latitude,
        longitudeEarthquake:
            relevantEarthquake.longitude,
        place:
            relevantEarthquake.place,
        time:
            relevantEarthquake.time,
        risk:
            riskResult.level,
        score:
            riskResult.score,
        riskReasons:
            riskResult.reasons,
        earthquakes,
        nearbyEarthquakeCount:
            earthquakes.length,
        strongestEarthquake,
        nearestEarthquake,
        relevantEarthquake,
        dataSource:
            "USGS Earthquake Hazards Program",
        lastUpdated:
            new Date()
    };
}

function findMostRelevantEarthquake(earthquakes) {
    if (
        !earthquakes ||
        earthquakes.length === 0
    ) {
        return null;
    }

    let mostRelevant = earthquakes[0];
    let highestRelevanceScore = -Infinity;

    earthquakes.forEach(earthquake => {
        let score =
            earthquake.magnitude * 10;

        if (earthquake.distance <= 25) score += 30;
        else if (earthquake.distance <= 50) score += 25;
        else if (earthquake.distance <= 100) score += 20;
        else if (earthquake.distance <= 200) score += 12;
        else if (earthquake.distance <= 300) score += 6;

        if (earthquake.depth <= 10) score += 8;
        else if (earthquake.depth <= 30) score += 5;
        else if (earthquake.depth <= 70) score += 2;

        const ageHours =
            (Date.now() -
                earthquake.time.getTime()) /
            (60 * 60 * 1000);

        if (ageHours <= 24) score += 5;
        else if (ageHours <= 72) score += 2;

        if (
            score >
            highestRelevanceScore
        ) {
            highestRelevanceScore =
                score;

            mostRelevant =
                earthquake;
        }
    });

    return mostRelevant;
}

function updateEarthquakeUI(data) {
    const set = (
        selector,
        value
    ) => {
        const el =
            document.querySelector(
                selector
            );

        if (el) {
            el.textContent =
                value;
        }
    };

    set(
        "[data-earthquake-location]",
        data.location
    );

    set(
        "[data-earthquake-magnitude]",
        data.magnitude > 0
            ? data.magnitude.toFixed(1)
            : "0.0"
    );

    set(
        "[data-earthquake-depth]",
        `${Math.round(data.depth)} km`
    );

    set(
        "[data-earthquake-distance]",
        data.distance > 0
            ? `${Math.round(data.distance)} km`
            : "0 km"
    );

    set(
        "[data-earthquake-place]",
        data.place
    );

    set(
        "[data-earthquake-time]",
        formatEarthquakeTime(
            data.time
        )
    );

    set(
        "[data-earthquake-count]",
        String(
            data.nearbyEarthquakeCount ||
            0
        )
    );

    set(
        "[data-earthquake-source]",
        data.dataSource
    );

    set(
        "[data-earthquake-updated]",
        formatEarthquakeTime(
            data.lastUpdated
        )
    );

    if (
        data.strongestEarthquake
    ) {
        set(
            "[data-earthquake-strongest]",
            data.strongestEarthquake
                .magnitude
                .toFixed(1)
        );
    }

    const risk =
        document.querySelector(
            "[data-earthquake-risk]"
        );

    if (risk) {
        risk.textContent =
            data.risk;

        risk.className =
            "risk-badge " +
            getEarthquakeRiskClass(
                data.risk
            );
    }

    updateEarthquakeList(
        data.earthquakes
    );
}

function updateEarthquakeList(
    earthquakes
) {
    const container =
        document.querySelector(
            "[data-earthquake-list]"
        );

    if (!container) return;

    container.innerHTML = "";

    if (
        !earthquakes ||
        earthquakes.length === 0
    ) {
        container.innerHTML =
            `<div class="text-gray-500 text-sm">No significant earthquakes detected within the monitoring radius.</div>`;

        return;
    }

    earthquakes
        .slice(0, 10)
        .forEach(earthquake => {
            const item =
                document.createElement(
                    "div"
                );

            item.className =
                "border-b border-gray-200 py-3";

            item.innerHTML = `
                <div class="flex justify-between items-center gap-4">
                    <div>
                        <div class="font-semibold">
                            M${earthquake.magnitude.toFixed(1)}
                        </div>
                        <div class="text-sm text-gray-600">
                            ${escapeHTML(earthquake.place)}
                        </div>
                    </div>

                    <div class="text-right">
                        <div class="text-sm">
                            ${Math.round(earthquake.distance)} km
                        </div>
                        <div class="text-xs text-gray-500">
                            ${formatEarthquakeTime(earthquake.time)}
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(
                item
            );
        });
}

function formatEarthquakeTime(date) {
    return new Date(date).toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

function getEarthquakeRiskClass(level) {
    switch (level) {
        case "Low":
            return "risk-badge-low";
        case "Moderate":
            return "risk-badge-moderate";
        case "High":
            return "risk-badge-high";
        case "Critical":
            return "risk-badge-critical";
        default:
            return "risk-badge-low";
    }
}

window.TerraGuardEarthquake = {
    initialize: initializeEarthquake,
    loadEarthquakeData,
    fetchEarthquakeData,
    calculateEarthquakeRisk:
        window.TerraGuardUtils
            .calculateEarthquakeRisk,
    findMostRelevantEarthquake
};

document.addEventListener("DOMContentLoaded", () => {
    if (
        document.querySelector(
            "[data-earthquake-refresh]"
        )
    ) {
        initializeEarthquake();
    }
});