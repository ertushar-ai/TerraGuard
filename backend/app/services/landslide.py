from datetime import datetime
import httpx
from app.core.config import settings

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

THRESHOLDS = {
    "rainfall1h": 20, "rainfall3h": 40, "rainfall6h": 60,
    "rainfall12h": 80, "rainfall24h": 100, "rainfall72h": 150,
    "rainfall7d": 200, "duration6h": 6, "duration12h": 12,
    "duration24h": 24, "intensity5": 5, "intensity10": 10, "intensity20": 20,
}


def sum_hours(values, end_index, hours):
    start = max(0, end_index - hours + 1)
    return round(sum(float(v or 0) for v in values[start:end_index + 1]), 2)


def calculate_event(values, current_index):
    amount = 0
    duration = 0
    peak = 0
    dry_gap = 0
    started = False

    for i in range(current_index, -1, -1):
        rainfall = float(values[i] or 0)
        peak = max(peak, rainfall)

        if rainfall >= 0.1:
            started = True
            dry_gap = 0
            duration += 1
            amount += rainfall
        elif started:
            dry_gap += 1
            if dry_gap <= 1:
                duration += 1
            else:
                break

    intensity = amount / duration if duration else 0
    return {
        "duration": round(duration, 2),
        "amount": round(amount, 2),
        "intensity": round(intensity, 2),
        "peak": round(peak, 2),
    }


def calculate_risk(data):
    score = 0
    triggered = []

    checks = [
        ("rainfall1h", 3, "Heavy rainfall during the last 1 hour"),
        ("rainfall3h", 3, "High rainfall accumulation during the last 3 hours"),
        ("rainfall6h", 3, "High rainfall accumulation during the last 6 hours"),
        ("rainfall12h", 2, "High rainfall accumulation during the last 12 hours"),
        ("rainfall24h", 3, "High 24-hour rainfall accumulation"),
        ("rainfall72h", 2, "High rainfall accumulation during the last 3 days"),
        ("rainfall7d", 2, "High weekly rainfall accumulation"),
    ]
    for key, points, reason in checks:
        if data[key] >= THRESHOLDS[key]:
            score += points
            triggered.append(reason)

    if data["rainfallDurationHours"] >= THRESHOLDS["duration6h"]:
        score += 2; triggered.append("Rainfall has continued for at least 6 hours")
    if data["rainfallDurationHours"] >= THRESHOLDS["duration12h"]:
        score += 2; triggered.append("Rainfall has continued for at least 12 hours")
    if data["rainfallDurationHours"] >= THRESHOLDS["duration24h"]:
        score += 3; triggered.append("Rainfall has continued for at least 24 hours")

    if data["averageIntensity"] >= THRESHOLDS["intensity5"]:
        score += 2; triggered.append("Moderate-to-heavy rainfall intensity")
    if data["averageIntensity"] >= THRESHOLDS["intensity10"]:
        score += 2; triggered.append("High rainfall intensity")
    if data["averageIntensity"] >= THRESHOLDS["intensity20"]:
        score += 3; triggered.append("Very high rainfall intensity")

    if score >= 23:
        risk = "Critical"
    elif score >= 15:
        risk = "High"
    elif score >= 7:
        risk = "Moderate"
    else:
        risk = "Low"

    percentage = min(100, round((score / 33) * 100))
    return {"risk": risk, "score": score, "percentage": percentage, "triggered": triggered}


async def get_landslide(latitude, longitude, location):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "precipitation",
        "past_days": 7,
        "forecast_days": 1,
        "timezone": "Asia/Kolkata",
    }

    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        response = await client.get(OPEN_METEO_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    hourly = payload.get("hourly") or {}
    values = hourly.get("precipitation") or []
    times = hourly.get("time") or []

    if not values:
        raise ValueError("No rainfall data returned by Open-Meteo.")

    now = datetime.now()
    current_index = min(
        range(len(times)),
        key=lambda i: abs(datetime.fromisoformat(times[i]).replace(tzinfo=None) - now)
    )

    event = calculate_event(values, current_index)

    data = {
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "rainfall1h": sum_hours(values, current_index, 1),
        "rainfall3h": sum_hours(values, current_index, 3),
        "rainfall6h": sum_hours(values, current_index, 6),
        "rainfall12h": sum_hours(values, current_index, 12),
        "rainfall24h": sum_hours(values, current_index, 24),
        "rainfall72h": sum_hours(values, current_index, 72),
        "rainfall7d": sum_hours(values, current_index, 168),
        "rainfallDurationHours": event["duration"],
        "rainfallEventAmount": event["amount"],
        "averageIntensity": event["intensity"],
        "peakRainfall": event["peak"],
        "lastUpdated": times[current_index] if current_index < len(times) else now.isoformat(),
    }
    data["risk"] = calculate_risk(data)
    return data
