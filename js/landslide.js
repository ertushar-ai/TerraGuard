const terraGuardLandslideConfig = {
    rainThreshold: 0.1,
    significantRainThreshold: 2,
    maxDryGapHours: 1,
    thresholds: {
        rainfall1h: 20,
        rainfall3h: 40,
        rainfall6h: 60,
        rainfall12h: 80,
        rainfall24h: 100,
        rainfall72h: 150,
        rainfall7d: 200,
        duration6h: 6,
        duration12h: 12,
        duration24h: 24,
        intensity5: 5,
        intensity10: 10,
        intensity20: 20
    }
};

function getLandslideCoordinates(location) {
    if (window.TerraGuard?.getSavedCoordinates) {
        const coordinates = window.TerraGuard.getSavedCoordinates();

        if (
            coordinates &&
            Number.isFinite(Number(coordinates.latitude)) &&
            Number.isFinite(Number(coordinates.longitude))
        ) {
            return {
                latitude: Number(coordinates.latitude),
                longitude: Number(coordinates.longitude)
            };
        }
    }

    const latitude = Number(localStorage.getItem("terraGuardLatitude"));
    const longitude = Number(localStorage.getItem("terraGuardLongitude"));

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude };
    }

    if (String(location).toLowerCase() === "delhi") {
        return {
            latitude: 28.6139,
            longitude: 77.2090
        };
    }

    return null;
}

async function fetchRainfallData(latitude, longitude) {
    const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        "&hourly=precipitation" +
        "&past_days=7" +
        "&forecast_days=1" +
        "&timezone=Asia%2FKolkata";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Open-Meteo request failed: ${response.status}`);
    }

    const data = await response.json();

    if (
        !data.hourly ||
        !Array.isArray(data.hourly.time) ||
        !Array.isArray(data.hourly.precipitation)
    ) {
        throw new Error("Invalid rainfall data received");
    }

    return data;
}

function findCurrentRainfallIndex(timeValues) {
    if (!Array.isArray(timeValues) || timeValues.length === 0) {
        return -1;
    }

    const now = Date.now();
    let closestIndex = 0;
    let smallestDifference = Infinity;

    timeValues.forEach((time, index) => {
        const timestamp = new Date(time).getTime();

        if (!Number.isFinite(timestamp)) return;

        const difference = Math.abs(timestamp - now);

        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function getRecentRainfall(
    rainfallValues,
    numberOfHours,
    endIndex = rainfallValues.length - 1
) {
    if (!Array.isArray(rainfallValues) || rainfallValues.length === 0) {
        return 0;
    }

    const startIndex = Math.max(
        0,
        endIndex - numberOfHours + 1
    );

    let total = 0;

    for (let i = startIndex; i <= endIndex; i++) {
        const rainfall = Number(rainfallValues[i]);

        if (!Number.isFinite(rainfall)) continue;

        total += rainfall;
    }

    return Number(total.toFixed(2));
}

function calculateRainfallEvent(rainfallValues, currentIndex) {
    if (
        !Array.isArray(rainfallValues) ||
        rainfallValues.length === 0 ||
        currentIndex < 0
    ) {
        return {
            durationHours: 0,
            rainfallAmount: 0,
            averageIntensity: 0,
            peakIntensity: 0,
            dryGapHours: 0,
            significantRainHours: 0,
            eventStartIndex: currentIndex,
            eventEndIndex: currentIndex
        };
    }

    let durationHours = 0;
    let rainfallAmount = 0;
    let dryGapHours = 0;
    let significantRainHours = 0;
    let peakIntensity = 0;
    let eventStarted = false;
    let eventStartIndex = currentIndex;

    const eventEndIndex = currentIndex;

    for (let i = currentIndex; i >= 0; i--) {
        const rainfall = Number(rainfallValues[i]) || 0;

        peakIntensity = Math.max(peakIntensity, rainfall);

        if (
            rainfall >=
            terraGuardLandslideConfig.significantRainThreshold
        ) {
            significantRainHours++;
        }

        if (
            rainfall >=
            terraGuardLandslideConfig.rainThreshold
        ) {
            eventStarted = true;
            dryGapHours = 0;
            durationHours++;
            rainfallAmount += rainfall;
            eventStartIndex = i;
            continue;
        }

        if (!eventStarted) continue;

        dryGapHours++;

        if (
            dryGapHours <=
            terraGuardLandslideConfig.maxDryGapHours
        ) {
            durationHours++;
            continue;
        }

        break;
    }

    if (!eventStarted) {
        return {
            durationHours: 0,
            rainfallAmount: 0,
            averageIntensity: 0,
            peakIntensity: 0,
            dryGapHours: 0,
            significantRainHours: 0,
            eventStartIndex: currentIndex,
            eventEndIndex: currentIndex
        };
    }

    const averageIntensity =
        durationHours > 0
            ? rainfallAmount / durationHours
            : 0;

    return {
        durationHours,
        rainfallAmount: Number(rainfallAmount.toFixed(2)),
        averageIntensity: Number(averageIntensity.toFixed(2)),
        peakIntensity: Number(peakIntensity.toFixed(2)),
        dryGapHours,
        significantRainHours,
        eventStartIndex,
        eventEndIndex
    };
}

function calculateRainfallIntensity(
    rainfallAmount,
    durationHours
) {
    if (durationHours <= 0) return 0;

    return Number(
        (rainfallAmount / durationHours).toFixed(2)
    );
}

function getIntensityCategory(intensity) {
    const value = Number(intensity) || 0;
    const thresholds = terraGuardLandslideConfig.thresholds;

    if (value >= thresholds.intensity20) return "Very High";
    if (value >= thresholds.intensity10) return "High";
    if (value >= thresholds.intensity5) return "Moderate";
    if (value >= 0.1) return "Light";

    return "None";
}

function calculateRisk(data) {
    let score = 0;
    const triggered = [];
    const { thresholds } = terraGuardLandslideConfig;

    if (data.rainfall1h >= thresholds.rainfall1h) {
        score += 3;
        triggered.push("Heavy rainfall during the last 1 hour");
    }

    if (data.rainfall3h >= thresholds.rainfall3h) {
        score += 3;
        triggered.push("High rainfall accumulation during the last 3 hours");
    }

    if (data.rainfall6h >= thresholds.rainfall6h) {
        score += 3;
        triggered.push("High rainfall accumulation during the last 6 hours");
    }

    if (data.rainfall12h >= thresholds.rainfall12h) {
        score += 2;
        triggered.push("High rainfall accumulation during the last 12 hours");
    }

    if (data.rainfall24h >= thresholds.rainfall24h) {
        score += 3;
        triggered.push("High 24-hour rainfall accumulation");
    }

    if (data.rainfall72h >= thresholds.rainfall72h) {
        score += 2;
        triggered.push("High rainfall accumulation during the last 3 days");
    }

    if (data.rainfall7d >= thresholds.rainfall7d) {
        score += 2;
        triggered.push("High weekly rainfall accumulation");
    }

    if (data.rainfallDurationHours >= thresholds.duration6h) {
        score += 1;
        triggered.push("Rainfall event has lasted for 6 or more hours");
    }

    if (data.rainfallDurationHours >= thresholds.duration12h) {
        score += 2;
        triggered.push("Rainfall event has lasted for 12 or more hours");
    }

    if (data.rainfallDurationHours >= thresholds.duration24h) {
        score += 3;
        triggered.push("Rainfall event has lasted for 24 or more hours");
    }

    if (data.rainfallIntensity >= thresholds.intensity5) {
        score += 1;
        triggered.push(
            `Average rainfall intensity is ${data.rainfallIntensity} mm/h`
        );
    }

    if (data.rainfallIntensity >= thresholds.intensity10) {
        score += 2;
        triggered.push("High average rainfall intensity detected");
    }

    if (data.rainfallIntensity >= thresholds.intensity20) {
        score += 3;
        triggered.push("Very high average rainfall intensity detected");
    }

    if (data.peakRainfall >= 20) {
        score += 2;
        triggered.push(
            `Peak hourly rainfall reached ${data.peakRainfall} mm`
        );
    }

    if (data.significantRainHours >= 6) {
        score += 1;
        triggered.push("Rainfall remained significant for multiple hours");
    }

    const maximumScore = 33;

    score = Math.min(score, maximumScore);

    const percentage = Math.min(
        100,
        Math.round((score / maximumScore) * 100)
    );

    let risk;

    if (score >= 23) risk = "Critical";
    else if (score >= 15) risk = "High";
    else if (score >= 7) risk = "Moderate";
    else risk = "Low";

    if (
        data.rainfallDurationHours === 0 &&
        data.rainfall24h < 1
    ) {
        triggered.push("No significant continuous rainfall detected");
    }

    return {
        risk,
        score,
        maximumScore,
        percentage,
        triggered
    };
}

async function updateLandslideUI() {
    const location =
        localStorage.getItem("terraGuardLocation") || "Delhi";

    try {
        const data = await fetchLandslideData(location);

        window.TerraGuardLandslideData = data;

        setLandslideValue(
            "[data-landslide-location]",
            data.location
        );

        setLandslideValue(
            "[data-landslide-rainfall-1]",
            `${data.rainfall1h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-3]",
            `${data.rainfall3h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-6]",
            `${data.rainfall6h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-12]",
            `${data.rainfall12h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-24]",
            `${data.rainfall24h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-72]",
            `${data.rainfall72h} mm`
        );

        setLandslideValue(
            "[data-landslide-rainfall-7]",
            `${data.rainfall7d} mm`
        );

        setLandslideValue(
            "[data-landslide-duration]",
            `${data.rainfallDurationHours} hours`
        );

        setLandslideValue(
            "[data-landslide-intensity]",
            `${data.rainfallIntensity} mm/h`
        );

        setLandslideValue(
            "[data-landslide-risk]",
            data.risk
        );

        setLandslideValue(
            "[data-landslide-score]",
            `${data.score}/${data.maximumScore}`
        );

        setLandslideValue(
            "[data-landslide-percentage]",
            `${data.percentage}%`
        );

        const progressElement =
            document.querySelector("[data-landslide-progress]");

        if (progressElement) {
            progressElement.style.width = `${data.percentage}%`;
        }

        const messageElement =
            document.querySelector("[data-landslide-message]");

        if (messageElement) {
            messageElement.textContent = createRiskMessage(data);
        }

        const triggerElement =
            document.querySelector("[data-landslide-triggers]");

        if (triggerElement) {
            if (data.triggered && data.triggered.length > 0) {
                triggerElement.innerHTML =
                    data.triggered
                        .map(
                            trigger =>
                                `<div class="flex items-start gap-2 mb-2"><span>⚠️</span><span>${escapeHTML(trigger)}</span></div>`
                        )
                        .join("");
            } else {
                triggerElement.textContent =
                    "No significant rainfall risk factors detected.";
            }
        }

        updateLandslideRiskBadge(data.risk);

        return data;
    } catch (error) {
        console.error("Landslide data error:", error);

        setLandslideValue(
            "[data-landslide-risk]",
            "Unavailable"
        );

        setLandslideValue(
            "[data-landslide-score]",
            "--"
        );

        setLandslideValue(
            "[data-landslide-percentage]",
            "0%"
        );

        setLandslideValue(
            "[data-landslide-message]",
            "TerraGuard could not retrieve rainfall data for this location."
        );

        return null;
    }
}

function setLandslideValue(selector, value) {
    document
        .querySelectorAll(selector)
        .forEach(element => {
            element.textContent = value;
        });
}

function createRiskMessage(data) {
    switch (String(data.risk).toLowerCase()) {
        case "critical":
            return `Critical rainfall-triggered landslide conditions are detected at ${data.location}. ${data.rainfall24h} mm of rainfall was recorded over the last 24 hours. The current rainfall event has lasted approximately ${data.rainfallDurationHours} hours with an average intensity of ${data.rainfallIntensity} mm/h. Immediate monitoring is recommended.`;

        case "high":
            return `High landslide risk detected at ${data.location}. ${data.rainfall24h} mm of rainfall has accumulated over the last 24 hours, while the current rainfall event has lasted approximately ${data.rainfallDurationHours} hours. Continued monitoring is recommended.`;

        case "moderate":
            return `Moderate landslide risk detected at ${data.location}. Recent rainfall accumulation is ${data.rainfall24h} mm over 24 hours, with a current rainfall duration of ${data.rainfallDurationHours} hours. Continued monitoring is recommended.`;

        case "low":
            return `Current rainfall conditions at ${data.location} indicate a relatively low rainfall-triggered landslide risk.`;

        default:
            return "TerraGuard is analysing rainfall amount, intensity and duration.";
    }
}

function updateLandslideRiskBadge(risk) {
    document
        .querySelectorAll("[data-landslide-risk]")
        .forEach(element => {
            element.classList.remove(
                "risk-badge-low",
                "risk-badge-moderate",
                "risk-badge-high",
                "risk-badge-critical"
            );

            switch (String(risk).toLowerCase()) {
                case "critical":
                    element.classList.add("risk-badge-critical");
                    break;

                case "high":
                    element.classList.add("risk-badge-high");
                    break;

                case "moderate":
                    element.classList.add("risk-badge-moderate");
                    break;

                case "low":
                    element.classList.add("risk-badge-low");
                    break;
            }
        });
}

async function fetchLandslideData(location) {
    const coordinates = getLandslideCoordinates(location);

    if (!coordinates) {
        throw new Error("Location coordinates are not available");
    }

    const weatherData = await fetchRainfallData(
        coordinates.latitude,
        coordinates.longitude
    );

    const rainfall = weatherData.hourly.precipitation;
    const timeValues = weatherData.hourly.time;

    let currentIndex = findCurrentRainfallIndex(timeValues);

    if (currentIndex < 0) {
        currentIndex = rainfall.length - 1;
    }

    const rainfall1h = getRecentRainfall(rainfall, 1, currentIndex);
    const rainfall3h = getRecentRainfall(rainfall, 3, currentIndex);
    const rainfall6h = getRecentRainfall(rainfall, 6, currentIndex);
    const rainfall12h = getRecentRainfall(rainfall, 12, currentIndex);
    const rainfall24h = getRecentRainfall(rainfall, 24, currentIndex);
    const rainfall72h = getRecentRainfall(rainfall, 72, currentIndex);
    const rainfall7d = getRecentRainfall(rainfall, 168, currentIndex);

    const rainfallEvent =
        calculateRainfallEvent(rainfall, currentIndex);

    const rainfallIntensity =
        calculateRainfallIntensity(
            rainfallEvent.rainfallAmount,
            rainfallEvent.durationHours
        );

    const intensityCategory =
        getIntensityCategory(rainfallIntensity);

    const data = {
        location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        rainfall1h: Number(rainfall1h.toFixed(2)),
        rainfall3h: Number(rainfall3h.toFixed(2)),
        rainfall6h: Number(rainfall6h.toFixed(2)),
        rainfall12h: Number(rainfall12h.toFixed(2)),
        rainfall24h: Number(rainfall24h.toFixed(2)),
        rainfall72h: Number(rainfall72h.toFixed(2)),
        rainfall7d: Number(rainfall7d.toFixed(2)),
        rainfallDurationHours: rainfallEvent.durationHours,
        rainfallEventAmount: rainfallEvent.rainfallAmount,
        rainfallIntensity,
        averageIntensity: rainfallEvent.averageIntensity,
        peakRainfall: rainfallEvent.peakIntensity,
        significantRainHours: rainfallEvent.significantRainHours,
        dryGapHours: rainfallEvent.dryGapHours,
        intensityCategory,
        dataSource: "Open-Meteo rainfall analysis",
        lastUpdated: new Date().toISOString()
    };

    const riskResult = calculateRisk(data);

    return {
        ...data,
        risk: riskResult.risk,
        score: riskResult.score,
        maximumScore: riskResult.maximumScore,
        percentage: riskResult.percentage,
        triggered: riskResult.triggered
    };
}

function getDemoLandslideData(location = "Delhi") {
    return {
        location,
        rainfall1h: 0,
        rainfall3h: 0,
        rainfall6h: 0,
        rainfall12h: 0,
        rainfall24h: 0,
        rainfall72h: 0,
        rainfall7d: 0,
        rainfallDurationHours: 0,
        rainfallEventAmount: 0,
        rainfallIntensity: 0,
        averageIntensity: 0,
        peakRainfall: 0,
        significantRainHours: 0,
        dryGapHours: 0,
        intensityCategory: "None",
        risk: "Low",
        score: 0,
        maximumScore: 33,
        percentage: 0,
        triggered: [],
        dataSource: "Demo"
    };
}

async function initializeLandslide() {
    return updateLandslideUI();
}

async function refreshLandslide() {
    return updateLandslideUI();
}

window.TerraGuardLandslide = {
    initialize: initializeLandslide,
    refresh: refreshLandslide,
    fetchLandslideData,
    calculateRisk,
    getDemoLandslideData
};

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("[data-landslide-refresh]")) {
        const refreshButton =
            document.querySelector("[data-landslide-refresh]");

        if (!refreshButton.dataset.landslideInitialized) {
            refreshButton.dataset.landslideInitialized = "true";

            refreshButton.addEventListener(
                "click",
                refreshLandslide
            );
        }

        initializeLandslide();
    }
});

if (!window.TerraGuardLandslideRefreshInterval) {
    window.TerraGuardLandslideRefreshInterval = setInterval(() => {
        if (document.querySelector("[data-landslide-refresh]")) {
            refreshLandslide();
        }
    }, 10 * 60 * 1000);
}