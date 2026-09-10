const weatherLocations = {
    "Delhi": { latitude: 28.6139, longitude: 77.2090 },
    "Ghaziabad": { latitude: 28.6692, longitude: 77.4538 },
    "Dehradun": { latitude: 30.3165, longitude: 78.0322 },
    "Shimla": { latitude: 31.1048, longitude: 77.1734 },
    "Srinagar": { latitude: 34.0837, longitude: 74.7973 },
    "Gangtok": { latitude: 27.3389, longitude: 88.6065 },
    "Darjeeling": { latitude: 27.0410, longitude: 88.2663 },
    "Manali": { latitude: 32.2396, longitude: 77.1887 },
    "Mussoorie": { latitude: 30.4598, longitude: 78.0664 },
    "Nainital": { latitude: 29.3919, longitude: 79.4542 }
};

function getWeatherCoordinates(location) {
    const savedLatitude = localStorage.getItem("terraGuardLatitude");
    const savedLongitude = localStorage.getItem("terraGuardLongitude");

    if (savedLatitude && savedLongitude) {
        const latitude = Number(savedLatitude);
        const longitude = Number(savedLongitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            return { latitude, longitude };
        }
    }

    const savedLocationData = localStorage.getItem("terraGuardLocationData");

    if (savedLocationData) {
        try {
            const locationData = JSON.parse(savedLocationData);
            const latitude = Number(locationData.latitude);
            const longitude = Number(locationData.longitude);

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                return { latitude, longitude };
            }
        } catch (error) {
            console.warn("Unable to read saved location data:", error);
        }
    }

    if (weatherLocations[location]) {
        return weatherLocations[location];
    }

    return null;
}

async function initializeWeather() {
    const location = localStorage.getItem("terraGuardLocation") || "Delhi";
    await loadWeather(location);

    const refreshButton = document.querySelector("[data-weather-refresh]");

    if (refreshButton && !refreshButton.dataset.weatherInitialized) {
        refreshButton.dataset.weatherInitialized = "true";

        refreshButton.addEventListener("click", () => {
            const currentLocation =
                localStorage.getItem("terraGuardLocation") || "Delhi";

            loadWeather(currentLocation);
        });
    }

    if (!window.TerraGuardWeatherRefreshInterval) {
        window.TerraGuardWeatherRefreshInterval = setInterval(() => {
            const currentLocation =
                localStorage.getItem("terraGuardLocation") || "Delhi";

            loadWeather(currentLocation);
        }, 10 * 60 * 1000);
    }
}

async function loadWeather(location) {
    try {
        const weatherData = await fetchWeatherData(location);

        window.TerraGuardWeatherData = weatherData;

        updateWeatherUI(weatherData);

        window.dispatchEvent(
            new CustomEvent("terraguard:weather-updated", {
                detail: weatherData
            })
        );

        return weatherData;
    } catch (error) {
        console.error("Weather API Error:", error);

        window.TerraGuard?.showNotification?.(
            "Unable to load weather data.",
            "error"
        );

        return null;
    }
}

async function fetchWeatherData(location) {
    const coordinates = getWeatherCoordinates(location);

    if (!coordinates) {
        throw new Error(`Coordinates not found for location: ${location}`);
    }

    try {
        if (window.TerraGuardAPI && typeof window.TerraGuardAPI.weather === "function") {
            const data = await window.TerraGuardAPI.weather(coordinates.latitude, coordinates.longitude, location);
            if (data && data.temperature !== undefined) {
                return {
                    location: data.location || location,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    temperature: data.temperature,
                    apparent_temperature: data.feels_like !== undefined ? data.feels_like : data.feelsLike,
                    relative_humidity_2m: data.humidity,
                    wind_speed_10m: data.wind,
                    rainfall_probability: data.rainfall_probability !== undefined ? data.rainfall_probability : data.rainfallProbability,
                    precipitation: data.precipitation,
                    rain: data.rain,
                    weather_code: data.weather_code !== undefined ? data.weather_code : data.weatherCode,
                    condition: data.condition,
                    time: data.last_updated || data.lastUpdated,
                    risk: data.risk || { level: "Low", score: 0, reasons: [] }
                };
            }
        }
    } catch (backendError) {
        console.warn("FastAPI weather endpoint failed, using direct Open-Meteo fallback:", backendError);
    }

    const url =
        "https://api.open-meteo.com/v1/forecast" +
        `?latitude=${coordinates.latitude}` +
        `&longitude=${coordinates.longitude}` +
        "&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,wind_speed_10m,weather_code" +
        "&hourly=precipitation_probability" +
        "&temperature_unit=celsius" +
        "&wind_speed_unit=kmh" +
        "&timezone=Asia%2FKolkata" +
        "&forecast_days=1";

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Weather request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.current) {
        throw new Error("Open-Meteo returned no current weather data.");
    }

    const current = data.current;
    let rainfallProbability = 0;

    if (
        data.hourly &&
        Array.isArray(data.hourly.time) &&
        Array.isArray(data.hourly.precipitation_probability)
    ) {
        let currentHourIndex = data.hourly.time.indexOf(current.time);

        if (currentHourIndex === -1) {
            currentHourIndex = findClosestTimeIndex(
                current.time,
                data.hourly.time
            );
        }

        if (currentHourIndex >= 0) {
            rainfallProbability =
                Number(
                    data.hourly.precipitation_probability[currentHourIndex]
                ) || 0;
        }
    }

    const weather = {
        location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        temperature: current.temperature_2m,
        feelsLike: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        wind: current.wind_speed_10m,
        rainfallProbability,
        precipitation: current.precipitation ?? 0,
        rain: current.rain ?? 0,
        weatherCode: current.weather_code,
        condition: getWeatherCondition(current.weather_code),
        lastUpdated: current.time
    };

    weather.risk = calculateWeatherRisk(weather);

    return weather;
}

function findClosestTimeIndex(targetTime, timeArray) {
    if (
        !targetTime ||
        !Array.isArray(timeArray) ||
        timeArray.length === 0
    ) {
        return -1;
    }

    const target = new Date(targetTime).getTime();

    if (Number.isNaN(target)) return -1;

    let closestIndex = 0;
    let smallestDifference = Infinity;

    timeArray.forEach((timeValue, index) => {
        const time = new Date(timeValue).getTime();

        if (Number.isNaN(time)) return;

        const difference = Math.abs(target - time);

        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}

function getWeatherCondition(code) {
    const weatherCodes = {
        0: "Clear Sky",
        1: "Mainly Clear",
        2: "Partly Cloudy",
        3: "Overcast",
        45: "Fog",
        48: "Depositing Rime Fog",
        51: "Light Drizzle",
        53: "Moderate Drizzle",
        55: "Dense Drizzle",
        56: "Light Freezing Drizzle",
        57: "Dense Freezing Drizzle",
        61: "Slight Rain",
        63: "Moderate Rain",
        65: "Heavy Rain",
        66: "Light Freezing Rain",
        67: "Heavy Freezing Rain",
        71: "Slight Snow",
        73: "Moderate Snow",
        75: "Heavy Snow",
        77: "Snow Grains",
        80: "Slight Rain Showers",
        81: "Moderate Rain Showers",
        82: "Violent Rain Showers",
        85: "Slight Snow Showers",
        86: "Heavy Snow Showers",
        95: "Thunderstorm",
        96: "Thunderstorm with Hail",
        99: "Thunderstorm with Heavy Hail"
    };

    return weatherCodes[code] || "Unknown";
}

function calculateWeatherRisk(data) {
    let score = 0;

    if (data.rainfallProbability >= 80) score += 3;
    else if (data.rainfallProbability >= 60) score += 2;
    else if (data.rainfallProbability >= 40) score += 1;

    if (data.humidity >= 85) score += 2;
    else if (data.humidity >= 70) score += 1;

    if (data.wind >= 50) score += 3;
    else if (data.wind >= 30) score += 2;
    else if (data.wind >= 20) score += 1;

    if (data.precipitation >= 20) score += 2;
    else if (data.precipitation >= 10) score += 1;

    if (data.weatherCode >= 95 && data.weatherCode <= 99) score += 3;

    let level = "Low";

    if (score >= 8) level = "Critical";
    else if (score >= 6) level = "High";
    else if (score >= 3) level = "Moderate";

    return { level, score };
}

function updateWeatherUI(data) {
    const set = (selector, value) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
    };

    set("[data-weather-location]", data.location);
    set("[data-weather-temperature]", `${Math.round(data.temperature)}°C`);
    set("[data-weather-feels-like]", `${Math.round(data.feelsLike)}°C`);
    set("[data-weather-humidity]", `${Math.round(data.humidity)}%`);
    set("[data-weather-wind]", `${Math.round(data.wind)} km/h`);
    set("[data-weather-rainfall]", `${Math.round(data.rainfallProbability)}%`);
    set("[data-weather-condition]", data.condition);

    const precipitation = document.querySelector(
        "[data-weather-precipitation]"
    );

    if (precipitation) {
        precipitation.textContent =
            `${Number(data.precipitation).toFixed(1)} mm`;
    }

    const risk = document.querySelector("[data-weather-risk]");

    if (risk) {
        risk.textContent = data.risk.level;
        risk.className =
            "risk-badge " + getRiskBadgeClass(data.risk.level);
    }
}

function getRiskBadgeClass(level) {
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

window.TerraGuardWeather = {
    initialize: initializeWeather,
    loadWeather,
    fetchWeatherData,
    calculateWeatherRisk,
    getWeatherCondition
};

document.addEventListener("DOMContentLoaded", () => {
    if (document.querySelector("[data-weather-refresh]")) {
        initializeWeather();
    }
});