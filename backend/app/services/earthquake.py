from datetime import datetime, timedelta, timezone
from math import radians, sin, cos, asin, sqrt
import httpx
from app.core.config import settings

USGS_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def distance_km(lat1, lon1, lat2, lon2):
    earth_radius = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * earth_radius * asin(sqrt(a))


def earthquake_risk(magnitude, distance, depth):
    score = 0
    reasons = []

    if magnitude >= 6:
        score += 4; reasons.append("Very strong earthquake magnitude")
    elif magnitude >= 5:
        score += 3; reasons.append("Strong earthquake magnitude")
    elif magnitude >= 4:
        score += 2; reasons.append("Moderate earthquake magnitude")
    elif magnitude >= 3:
        score += 1

    if distance <= 50:
        score += 4; reasons.append("Earthquake is very close to the selected location")
    elif distance <= 100:
        score += 3; reasons.append("Earthquake is close to the selected location")
    elif distance <= 200:
        score += 2; reasons.append("Earthquake is within the nearby monitoring radius")
    elif distance <= 300:
        score += 1

    if depth <= 10:
        score += 2; reasons.append("Shallow earthquake depth")
    elif depth <= 30:
        score += 1; reasons.append("Relatively shallow earthquake depth")

    if score >= 8:
        level = "Critical"
    elif score >= 6:
        level = "High"
    elif score >= 3:
        level = "Moderate"
    else:
        level = "Safe"

    return {"level": level, "score": score, "reasons": reasons}


async def get_earthquakes(latitude, longitude, location):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=7)
    params = {
        "format": "geojson",
        "starttime": start.isoformat(),
        "endtime": end.isoformat(),
        "latitude": latitude,
        "longitude": longitude,
        "maxradiuskm": 500,
        "minmagnitude": 2.5,
        "orderby": "time",
        "limit": 50,
    }

    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        response = await client.get(USGS_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    earthquakes = []
    for feature in payload.get("features", []):
        props = feature.get("properties") or {}
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 3:
            continue

        event_lon, event_lat, depth = map(float, coords[:3])
        magnitude = float(props.get("mag") or 0)
        event_time = datetime.fromtimestamp(
            (props.get("time") or 0) / 1000, tz=timezone.utc
        )

        earthquakes.append({
            "id": str(props.get("code") or feature.get("id") or event_time.timestamp()),
            "magnitude": magnitude,
            "depth": depth,
            "distance": distance_km(latitude, longitude, event_lat, event_lon),
            "latitude": event_lat,
            "longitude": event_lon,
            "place": props.get("place") or "Unknown location",
            "time": event_time.isoformat(),
            "tsunami": props.get("tsunami") == 1,
            "url": props.get("url"),
        })

    earthquakes.sort(key=lambda item: item["time"], reverse=True)

    if not earthquakes:
        return {
            "location": location,
            "latitude": latitude,
            "longitude": longitude,
            "magnitude": 0,
            "depth": 0,
            "distance": 0,
            "place": "No significant earthquake detected",
            "time": end.isoformat(),
            "risk": "Safe",
            "score": 0,
            "risk_reasons": [],
            "earthquakes": [],
            "nearby_earthquake_count": 0,
            "data_source": "USGS Earthquake Hazards Program",
            "last_updated": end.isoformat(),
        }

    relevant = min(earthquakes, key=lambda x: (x["distance"], -x["magnitude"]))
    risk = earthquake_risk(relevant["magnitude"], relevant["distance"], relevant["depth"])

    return {
        "location": location,
        "latitude": latitude,
        "longitude": longitude,
        "magnitude": relevant["magnitude"],
        "depth": relevant["depth"],
        "distance": relevant["distance"],
        "place": relevant["place"],
        "time": relevant["time"],
        "risk": risk["level"],
        "score": risk["score"],
        "risk_reasons": risk["reasons"],
        "earthquakes": earthquakes,
        "nearby_earthquake_count": len(earthquakes),
        "data_source": "USGS Earthquake Hazards Program",
        "last_updated": end.isoformat(),
    }
