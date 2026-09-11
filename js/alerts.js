const terraGuardAlertConfig = {
    weather: {
        rainfallProbability: 80,
        windSpeed: 50,
        precipitation: 20
    },
    landslide: {
        riskLevels: ["Moderate", "High", "Critical"]
    },
    earthquake: {
        magnitude: 5,
        riskLevels: ["Moderate", "High", "Critical"]
    },
    notifications: {
        storageKey: "terraGuardNotifiedAlerts",
        maximumStoredAlerts: 50
    },
    preferences: {
        storageKey: "terraGuardAlertPreferences",
        defaultMinimumSeverity: "High"
    }
};

const terraGuardSeverityOrder = {
    Critical: 4,
    High: 3,
    Moderate: 2,
    Low: 1,
    Safe: 0
};

function getAlertPreferences() {
    const defaultPreferences = {
        weather: true,
        landslide: true,
        earthquake: true,
        minimumSeverity: "High",
        browser: true,
        email: false
    };

    try {
        const stored =
            localStorage.getItem(
                terraGuardAlertConfig.preferences.storageKey
            );

        if (!stored) {
            return defaultPreferences;
        }

        const parsed = JSON.parse(stored);

        if (
            !parsed ||
            typeof parsed !== "object"
        ) {
            return defaultPreferences;
        }

        return {
            ...defaultPreferences,
            ...parsed
        };
    } catch (error) {
        console.error(
            "Failed to load alert preferences:",
            error
        );

        return defaultPreferences;
    }
}

function meetsMinimumSeverity(
    alertRisk,
    minimumSeverity
) {
    const alertLevel =
        terraGuardSeverityOrder[alertRisk] || 0;

    const minimumLevel =
        terraGuardSeverityOrder[minimumSeverity] || 0;

    return alertLevel >= minimumLevel;
}

function applyAlertPreferences(alerts) {
    const preferences =
        getAlertPreferences();

    return alerts.filter(alert => {
        if (
            alert.type === "weather" &&
            preferences.weather !== true
        ) {
            return false;
        }

        if (
            alert.type === "landslide" &&
            preferences.landslide !== true
        ) {
            return false;
        }

        if (
            alert.type === "earthquake" &&
            preferences.earthquake !== true
        ) {
            return false;
        }

        return meetsMinimumSeverity(
            String(alert.risk || "Low"),
            preferences.minimumSeverity ||
                terraGuardAlertConfig.preferences
                    .defaultMinimumSeverity
        );
    });
}

async function checkAlerts(
    monitoringData = {}
) {
    const currentLocation =
        localStorage.getItem("terraGuardLocation") ||
        "Delhi";

    const latitude =
        Number(
            localStorage.getItem(
                "terraGuardLatitude"
            )
        ) || 28.6139;

    const longitude =
        Number(
            localStorage.getItem(
                "terraGuardLongitude"
            )
        ) || 77.2090;

    try {
        if (
            window.TerraGuardAPI &&
            typeof window.TerraGuardAPI.checkAlerts ===
                "function" &&
            localStorage.getItem(
                "terraGuardAccessToken"
            )
        ) {
            const response =
                await window.TerraGuardAPI.checkAlerts(
                    latitude,
                    longitude,
                    currentLocation
                );

            if (
                response &&
                Array.isArray(response.alerts)
            ) {
                console.log(
                    "TerraGuard Python Centralized Alerts:",
                    response.alerts
                );

                displayAlerts(response.alerts);

                window.TerraGuardAlertsData =
                    response.alerts;

                return response.alerts;
            }
        }
    } catch (backendError) {
        console.warn(
            "Backend alert check failed, falling back to local evaluation:",
            backendError
        );
    }

    const preferences =
        getAlertPreferences();

    const alerts = [];

    let weather =
        monitoringData.weather ||
        window.TerraGuardWeatherData ||
        null;

    let landslide =
        monitoringData.landslide ||
        window.TerraGuardLandslideData ||
        null;

    let earthquake =
        monitoringData.earthquake ||
        window.TerraGuardEarthquakeData ||
        null;

    if (
        preferences.weather === true &&
        !weather &&
        window.TerraGuardWeather?.fetchWeatherData
    ) {
        try {
            weather =
                await window.TerraGuardWeather.fetchWeatherData(
                    currentLocation
                );
        } catch (error) {
            console.error(
                "Weather alert check failed:",
                error
            );
        }
    }

    if (
        preferences.landslide === true &&
        !landslide &&
        window.TerraGuardLandslide?.fetchLandslideData
    ) {
        try {
            landslide =
                await window.TerraGuardLandslide.fetchLandslideData(
                    currentLocation
                );
        } catch (error) {
            console.error(
                "Landslide alert check failed:",
                error
            );
        }
    }

    if (
        preferences.earthquake === true &&
        !earthquake &&
        window.TerraGuardEarthquake?.fetchEarthquakeData
    ) {
        try {
            earthquake =
                await window.TerraGuardEarthquake.fetchEarthquakeData(
                    currentLocation
                );
        } catch (error) {
            console.error(
                "Earthquake alert check failed:",
                error
            );
        }
    }

    if (
        preferences.weather === true &&
        weather
    ) {
        const rainfallProbability =
            Number(
                weather.rainfallProbability
            );

        const windSpeed =
            Number(weather.wind);

        const precipitation =
            Number(weather.precipitation);

        if (
            Number.isFinite(
                rainfallProbability
            ) &&
            rainfallProbability >=
                terraGuardAlertConfig
                    .weather
                    .rainfallProbability
        ) {
            alerts.push({
                id:
                    `weather-rain-probability-${currentLocation}-${Math.floor(Date.now() / 3600000)}`,
                type: "weather",
                risk: "High",
                title:
                    "Heavy Rainfall Warning",
                message:
                    `Rainfall probability is ${rainfallProbability}% in ${currentLocation}.`,
                time: new Date(),
                source:
                    "Weather Monitoring"
            });
        }

        if (
            Number.isFinite(
                precipitation
            ) &&
            precipitation >=
                terraGuardAlertConfig
                    .weather
                    .precipitation
        ) {
            alerts.push({
                id:
                    `weather-rain-current-${currentLocation}-${Math.floor(Date.now() / 3600000)}`,
                type: "weather",
                risk: "High",
                title:
                    "Heavy Rainfall Detected",
                message:
                    `${precipitation.toFixed(1)} mm of precipitation is currently affecting ${currentLocation}.`,
                time: new Date(),
                source:
                    "Weather Monitoring"
            });
        }

        if (
            Number.isFinite(windSpeed) &&
            windSpeed >=
                terraGuardAlertConfig
                    .weather
                    .windSpeed
        ) {
            alerts.push({
                id:
                    `weather-wind-${currentLocation}-${Math.floor(Date.now() / 3600000)}`,
                type: "weather",
                risk: "High",
                title:
                    "Strong Wind Warning",
                message:
                    `Wind speed has reached ${windSpeed.toFixed(1)} km/h in ${currentLocation}.`,
                time: new Date(),
                source:
                    "Weather Monitoring"
            });
        }
    }

    if (
        preferences.landslide === true &&
        landslide &&
        window.TerraGuardLandslide?.calculateRisk
    ) {
        try {
            const result =
                window.TerraGuardLandslide.calculateRisk(
                    landslide
                );

            if (result) {
                const risk =
                    String(
                        result.risk || "Low"
                    );

                const duration =
                    Number(
                        landslide.rainfallDurationHours
                    );

                const intensity =
                    Number(
                        landslide.averageIntensity
                    );

                const rainfallAmount =
                    Number(
                        landslide.rainfallEventAmount
                    );

                const peakRainfall =
                    Number(
                        landslide.peakRainfall
                    );

                if (
                    terraGuardAlertConfig
                        .landslide
                        .riskLevels
                        .includes(risk)
                ) {
                    let message =
                        `${risk} landslide risk detected near ${currentLocation}.`;

                    if (
                        Number.isFinite(
                            rainfallAmount
                        ) &&
                        Number.isFinite(
                            duration
                        )
                    ) {
                        message +=
                            ` Rainfall of ${rainfallAmount.toFixed(1)} mm has continued for approximately ${duration.toFixed(1)} hours.`;
                    }

                    if (
                        Number.isFinite(
                            intensity
                        ) &&
                        intensity > 0
                    ) {
                        message +=
                            ` Average intensity is ${intensity.toFixed(1)} mm/h.`;
                    }

                    alerts.push({
                        id:
                            `landslide-${currentLocation}-${risk}-${Math.round(rainfallAmount)}-${Math.round(duration)}-${Math.round(intensity * 10)}`,
                        type: "landslide",
                        risk,
                        title:
                            `${risk} Landslide Risk`,
                        message,
                        time: new Date(),
                        source:
                            result.dataSource ||
                            "Rainfall Monitoring"
                    });
                }

                if (
                    Number.isFinite(
                        intensity
                    ) &&
                    intensity >= 10 &&
                    risk !== "High" &&
                    risk !== "Critical"
                ) {
                    alerts.push({
                        id:
                            `landslide-intensity-${currentLocation}-${Math.round(intensity * 10)}`,
                        type: "landslide",
                        risk: "High",
                        title:
                            "High Rainfall Intensity",
                        message:
                            `Rainfall intensity has reached ${intensity.toFixed(1)} mm/h near ${currentLocation}. Continued rainfall may increase landslide risk.`,
                        time: new Date(),
                        source:
                            result.dataSource ||
                            "Rainfall Monitoring"
                    });
                }

                if (
                    Number.isFinite(
                        duration
                    ) &&
                    duration >= 12 &&
                    risk !== "High" &&
                    risk !== "Critical"
                ) {
                    alerts.push({
                        id:
                            `landslide-duration-${currentLocation}-${Math.round(duration)}`,
                        type: "landslide",
                        risk: "Moderate",
                        title:
                            "Prolonged Rainfall Alert",
                        message:
                            `Continuous rainfall has lasted approximately ${duration.toFixed(1)} hours near ${currentLocation}. Prolonged rainfall can increase landslide risk.`,
                        time: new Date(),
                        source:
                            result.dataSource ||
                            "Rainfall Monitoring"
                    });
                }

                if (
                    Number.isFinite(
                        peakRainfall
                    ) &&
                    peakRainfall >= 20 &&
                    risk !== "High" &&
                    risk !== "Critical"
                ) {
                    alerts.push({
                        id:
                            `landslide-peak-${currentLocation}-${Math.round(peakRainfall * 10)}`,
                        type: "landslide",
                        risk: "Moderate",
                        title:
                            "Heavy Rainfall Event",
                        message:
                            `Hourly rainfall has reached ${peakRainfall.toFixed(1)} mm near ${currentLocation}. Monitor the area for increasing landslide risk.`,
                        time: new Date(),
                        source:
                            result.dataSource ||
                            "Rainfall Monitoring"
                    });
                }
            }
        } catch (error) {
            console.error(
                "Landslide alert processing failed:",
                error
            );
        }
    }

    if (
        preferences.earthquake === true &&
        earthquake
    ) {
        const magnitude =
            Number(
                earthquake.magnitude
            );

        const distance =
            Number(
                earthquake.distance
            );

        const depth =
            Number(
                earthquake.depth
            );

        const earthquakeRisk =
            typeof earthquake.risk === "object"
                ? earthquake.risk.level
                : earthquake.risk;

        const risk =
            String(
                earthquakeRisk || "Safe"
            );

        if (
            Number.isFinite(magnitude) &&
            magnitude >=
                terraGuardAlertConfig
                    .earthquake
                    .magnitude
        ) {
            let message =
                `Magnitude ${magnitude.toFixed(1)} earthquake detected near ${currentLocation}.`;

            if (
                Number.isFinite(distance)
            ) {
                message +=
                    ` The event is approximately ${distance.toFixed(1)} km away.`;
            }

            if (
                Number.isFinite(depth)
            ) {
                message +=
                    ` Depth: ${depth.toFixed(1)} km.`;
            }

            alerts.push({
                id:
                    `earthquake-${earthquake.id || currentLocation}-${magnitude}-${Math.round(distance)}`,
                type: "earthquake",
                risk:
                    terraGuardAlertConfig
                        .earthquake
                        .riskLevels
                        .includes(risk)
                        ? risk
                        : "High",
                title:
                    "Significant Earthquake Detected",
                message,
                time:
                    earthquake.time
                        ? new Date(
                              earthquake.time
                          )
                        : new Date(),
                source:
                    earthquake.dataSource ||
                    "USGS Earthquake Hazards Program"
            });
        } else if (
            terraGuardAlertConfig
                .earthquake
                .riskLevels
                .includes(risk)
        ) {
            let message =
                `${risk} earthquake activity detected near ${currentLocation}.`;

            if (
                Number.isFinite(magnitude) &&
                magnitude > 0
            ) {
                message +=
                    ` Magnitude: ${magnitude.toFixed(1)}.`;
            }

            if (
                Number.isFinite(distance)
            ) {
                message +=
                    ` Distance: ${distance.toFixed(1)} km.`;
            }

            alerts.push({
                id:
                    `earthquake-risk-${earthquake.id || currentLocation}-${risk}`,
                type: "earthquake",
                risk,
                title:
                    `${risk} Earthquake Risk`,
                message,
                time:
                    earthquake.time
                        ? new Date(
                              earthquake.time
                          )
                        : new Date(),
                source:
                    earthquake.dataSource ||
                    "USGS Earthquake Hazards Program"
            });
        }
    }

    const uniqueAlerts = [];
    const alertKeys = new Set();

    alerts.forEach(alert => {
        const key =
            `${alert.type}-${alert.title}-${alert.message}`;

        if (!alertKeys.has(key)) {
            alertKeys.add(key);
            uniqueAlerts.push(alert);
        }
    });

    const filteredAlerts =
        applyAlertPreferences(
            uniqueAlerts
        );

    filteredAlerts.sort(
        (a, b) =>
            (
                terraGuardSeverityOrder[
                    b.risk
                ] || 0
            ) -
            (
                terraGuardSeverityOrder[
                    a.risk
                ] || 0
            )
    );

    displayAlerts(filteredAlerts);

    window.TerraGuardAlertsData =
        filteredAlerts;

    return filteredAlerts;
}

async function initializeAlerts(
    location = null,
    monitoringData = {}
) {
    if (location) {
        localStorage.setItem(
            "terraGuardLocation",
            location
        );
    }

    return await checkAlerts(
        monitoringData
    );
}

function displayAlerts(alerts) {
    const container =
        document.querySelector(
            "[data-alerts-container]"
        );

    if (!container) return;

    container.innerHTML = "";

    if (
        !alerts ||
        alerts.length === 0
    ) {
        container.innerHTML = `
            <div class="alert-card">
                <div class="alert-icon">✓</div>
                <div class="alert-content">
                    <h3 class="alert-title">No Active Alerts</h3>
                    <p class="alert-message">No significant disaster conditions have been detected for the selected location.</p>
                    <span class="alert-time">Monitoring active</span>
                </div>
            </div>
        `;

        return;
    }

    alerts.forEach(alert => {
        container.appendChild(
            createAlertElement(alert)
        );
    });
}

function createAlertElement(alert) {
    const element =
        document.createElement("div");

    element.className =
        "alert-card";

    const riskClass =
        String(
            alert.risk || "Low"
        )
            .toLowerCase()
            .replace(
                /\s+/g,
                "-"
            );

    element.classList.add(
        `alert-${riskClass}`
    );

    const icon =
        getAlertIcon(
            alert.type
        );

    const time =
        formatAlertTime(
            alert.time
        );

    element.innerHTML = `
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
            <h3 class="alert-title">${escapeHTML(alert.title)}</h3>
            <p class="alert-message">${escapeHTML(alert.message)}</p>
            <span class="alert-time">${escapeHTML(time)}</span>
        </div>
    `;

    return element;
}

function getAlertIcon(type) {
    switch (type) {
        case "weather":
            return "🌧️";
        case "landslide":
            return "🏔️";
        case "earthquake":
            return "🌎";
        default:
            return "⚠️";
    }
}

function formatAlertTime(time) {
    if (!time) return "Just now";

    const date =
        new Date(time);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "Just now";
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}

async function requestNotificationPermission() {
    const preferences =
        getAlertPreferences();

    if (
        preferences.browser !== true
    ) {
        console.log(
            "Browser notifications are disabled in user preferences."
        );

        return false;
    }

    if (
        !("Notification" in window)
    ) {
        console.warn(
            "Browser notifications are not supported."
        );

        return false;
    }

    if (
        Notification.permission ===
        "granted"
    ) {
        return true;
    }

    if (
        Notification.permission ===
        "denied"
    ) {
        return false;
    }

    try {
        const permission =
            await Notification.requestPermission();

        return (
            permission ===
            "granted"
        );
    } catch (error) {
        console.error(
            "Notification permission request failed:",
            error
        );

        return false;
    }
}

function getNotifiedAlerts() {
    try {
        const stored =
            localStorage.getItem(
                terraGuardAlertConfig
                    .notifications
                    .storageKey
            );

        if (!stored) return [];

        const parsed =
            JSON.parse(stored);

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch (error) {
        console.error(
            "Failed to read notification history:",
            error
        );

        return [];
    }
}

function storeNotifiedAlert(
    alertId
) {
    if (!alertId) return;

    let notifiedAlerts =
        getNotifiedAlerts();

    if (
        notifiedAlerts.includes(
            alertId
        )
    ) {
        return;
    }

    notifiedAlerts.push(
        alertId
    );

    if (
        notifiedAlerts.length >
        terraGuardAlertConfig
            .notifications
            .maximumStoredAlerts
    ) {
        notifiedAlerts =
            notifiedAlerts.slice(
                -terraGuardAlertConfig
                    .notifications
                    .maximumStoredAlerts
            );
    }

    try {
        localStorage.setItem(
            terraGuardAlertConfig
                .notifications
                .storageKey,
            JSON.stringify(
                notifiedAlerts
            )
        );
    } catch (error) {
        console.error(
            "Failed to store notification history:",
            error
        );
    }
}

function sendBrowserNotification(
    alert
) {
    if (!alert) return;

    const preferences =
        getAlertPreferences();

    if (
        preferences.browser !== true
    ) {
        return;
    }

    if (
        !("Notification" in window)
    ) {
        return;
    }

    if (
        Notification.permission !==
        "granted"
    ) {
        return;
    }

    try {
        const notifiedAlerts =
            getNotifiedAlerts();

        if (
            alert.id &&
            notifiedAlerts.includes(
                alert.id
            )
        ) {
            return;
        }

        const notification =
            new Notification(
                `TerraGuard: ${alert.title}`,
                {
                    body:
                        alert.message,
                    icon:
                        "assets/icons/terraguard.png",
                    tag:
                        alert.id ||
                        `terraguard-${Date.now()}`
                }
            );

        if (alert.id) {
            storeNotifiedAlert(
                alert.id
            );
        }

        setTimeout(() => {
            try {
                notification.close();
            } catch {}
        }, 10000);
    } catch (error) {
        console.error(
            "Failed to send browser notification:",
            error
        );
    }
}

async function checkAndNotifyAlerts(
    location = null,
    monitoringData = {}
) {
    const alerts =
        await initializeAlerts(
            location,
            monitoringData
        );

    if (
        !alerts ||
        alerts.length === 0
    ) {
        return [];
    }

    alerts.forEach(
        alert =>
            sendBrowserNotification(
                alert
            )
    );

    return alerts;
}

function clearNotificationHistory() {
    try {
        localStorage.removeItem(
            terraGuardAlertConfig
                .notifications
                .storageKey
        );
    } catch (error) {
        console.error(
            "Failed to clear notification history:",
            error
        );
    }
}

function getAlertSummary(alerts) {
    if (
        !Array.isArray(alerts)
    ) {
        return {
            total: 0,
            critical: 0,
            high: 0,
            moderate: 0,
            low: 0
        };
    }

    return {
        total:
            alerts.length,
        critical:
            alerts.filter(
                a =>
                    a.risk ===
                    "Critical"
            ).length,
        high:
            alerts.filter(
                a =>
                    a.risk ===
                    "High"
            ).length,
        moderate:
            alerts.filter(
                a =>
                    a.risk ===
                    "Moderate"
            ).length,
        low:
            alerts.filter(
                a =>
                    a.risk ===
                    "Low"
            ).length
    };
}

window.TerraGuardAlerts = {
    initializeAlerts,
    displayAlerts,
    createAlertElement,
    requestNotificationPermission,
    sendBrowserNotification,
    checkAndNotifyAlerts,
    clearNotificationHistory,
    getAlertSummary,
    getAlertPreferences,
    applyAlertPreferences,
    meetsMinimumSeverity
};

document.addEventListener(
    "DOMContentLoaded",
    () => {
        if (
            !document.querySelector(
                "[data-dashboard-weather-condition]"
            )
        ) {
            initializeAlerts();
        }
    }
);