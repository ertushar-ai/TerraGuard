from datetime import datetime
import httpx
from app.core.config import settings

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

WEATHER_CODES = {
    0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing Rime Fog",
    51: "Light Drizzle", 53: "Moderate Drizzle", 55: "Dense Drizzle",
    56: "Light Freezing Drizzle", 57: "Dense Freezing Drizzle",
    61: "Slight Rain", 63: "Moderate Rain", 65: "Heavy Rain",
    66: "Light Freezing Rain", 67: "Heavy Freezing Rain",
    71: "Slight Snow", 73: "Moderate Snow", 75: "Heavy Snow", 77: "Snow Grains",
    80: "Slight Rain Showers", 81: "Moderate Rain Showers", 82: "Violent Rain Showers",
    85: "Slight Snow Showers", 86: "Heavy Snow Showers",
    95: "Thunderstorm", 96: "Thunderstorm with Hail", 99: "Thunderstorm with Heavy Hail",
}

def calculate_weather_risk(data):
    score = 0
    reasons = []

    rp = float(data.get("rainfall_probability", 0))
    humidity = float(data.get("humidity", 0))
    wind = float(data.get("wind", 0))
    precipitation = float(data.get("precipitation", 0))
    code = int(data.get("weather_code") or 0)

    if rp >= 80:
        score += 3; reasons.append("Very high rainfall probability")
    elif rp >= 60:
        score += 2; reasons.append("High rainfall probability")
    elif rp >= 40:
        score += 1; reasons.append("Elevated rainfall probability")

    if humidity >= 85:
        score += 2; reasons.append("Very high humidity")
    elif humidity >= 70:
        score += 1; reasons.append("High humidity")

    if wind >= 50:
        score += 3; reasons.append("Very strong winds")
    elif wind >= 30:
        score += 2; reasons.append("Strong winds")
    elif wind >= 20:
        score += 1; reasons.append("Elevated wind speed")

    if precipitation >= 20:
        score += 2; reasons.append("Heavy current precipitation")
    elif precipitation >= 10:
        score += 1; reasons.append("Moderate current precipitation")

    if 95 <= code <= 99:
        score += 3; reasons.append("Thunderstorm detected")

    if score >= 8:
        level = "Critical"
    elif score >= 6:
        level = "High"
    elif score >= 3:
        level = "Moderate"
    else:
        level = "Low"

    return {"level": level, "score": score, "reasons": reasons}

async def get_weather(latitude: float, longitude: float, location: str):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join([
            "temperature_2m", "relative_humidity_2m", "apparent_temperature",
            "precipitation", "rain", "wind_speed_10m", "weather_code"
        ]),
        "hourly": "precipitation_probability",
        "temperature_unit": "celsius",
        "wind_speed_unit": "kmh",
        "timezone": "Asia/Kolkata",
        "forecast_days": 1,
    }

    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    current = payload.get("current")
    if not current:
        raise ValueError("Open-Meteo returned no current weather data.")

    probability = 0
    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])
    probabilities = hourly.get("precipitation_probability", [])
    current_time = current.get("time")

    if current_time in times:
        index = times.index(current_time)
        probability = float(probabilities[index] or 0)

    result = {
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "temperature": current.get("temperature_2m"),
        "feels_like": current.get("apparent_temperature"),
        "humidity": current.get("relative_humidity_2m"),
        "wind": current.get("wind_speed_10m"),
        "rainfall_probability": probability,
        "precipitation": current.get("precipitation") or 0,
        "rain": current.get("rain") or 0,
        "weather_code": current.get("weather_code"),
        "condition": WEATHER_CODES.get(current.get("weather_code"), "Unknown"),
        "last_updated": current.get("time") or datetime.now().isoformat(),
    }
    result["risk"] = calculate_weather_risk(result)
    return result
