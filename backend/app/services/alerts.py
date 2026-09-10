from datetime import datetime, timezone

SEVERITY = {"Safe": 0, "Low": 1, "Moderate": 2, "High": 3, "Critical": 4}


def generate_alerts(weather=None, landslide=None, earthquake=None, location="Delhi"):
    alerts = []
    now = datetime.now(timezone.utc).isoformat()

    if weather:
        if weather.get("rainfall_probability", 0) >= 80:
            alerts.append({
                "id": f"weather-rain-probability-{location}",
                "type": "weather", "risk": "High",
                "title": "Heavy Rainfall Warning",
                "message": f"Rainfall probability is {weather['rainfall_probability']:.0f}% in {location}.",
                "time": now, "source": "Weather Monitoring",
            })
        if weather.get("precipitation", 0) >= 20:
            alerts.append({
                "id": f"weather-rain-current-{location}",
                "type": "weather", "risk": "High",
                "title": "Heavy Rainfall Detected",
                "message": f"{weather['precipitation']:.1f} mm of precipitation is currently affecting {location}.",
                "time": now, "source": "Weather Monitoring",
            })
        if weather.get("wind", 0) >= 50:
            alerts.append({
                "id": f"weather-wind-{location}",
                "type": "weather", "risk": "High",
                "title": "Strong Wind Warning",
                "message": f"Wind speed has reached {weather['wind']:.1f} km/h in {location}.",
                "time": now, "source": "Weather Monitoring",
            })

    if landslide:
        risk = landslide.get("risk", {}).get("risk", "Low")
        if risk in {"Moderate", "High", "Critical"}:
            alerts.append({
                "id": f"landslide-{location}-{risk}",
                "type": "landslide", "risk": risk,
                "title": f"{risk} Landslide Risk",
                "message": f"{risk} landslide risk detected near {location}.",
                "time": now, "source": "Rainfall & Landslide Monitoring",
            })

    if earthquake and earthquake.get("risk") in {"Moderate", "High", "Critical"}:
        alerts.append({
            "id": f"earthquake-{location}-{earthquake.get('magnitude', 0)}",
            "type": "earthquake",
            "risk": earthquake["risk"],
            "title": "Earthquake Risk Alert",
            "message": (
                f"Magnitude {earthquake['magnitude']:.1f} earthquake detected "
                f"{earthquake['distance']:.1f} km from {location}."
            ),
            "time": now,
            "source": "USGS Earthquake Hazards Program",
        })

    return sorted(alerts, key=lambda x: SEVERITY[x["risk"]], reverse=True)
