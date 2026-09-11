import httpx
from app.core.config import settings

NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {
    "Accept": "application/json",
    "User-Agent": "TerraGuard/2.0 (academic disaster monitor; contact@terraguard.local)",
}

def validate_coordinates(latitude: float, longitude: float) -> bool:
    return -90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0

async def reverse_geocode(latitude: float, longitude: float) -> dict:
    if not validate_coordinates(latitude, longitude):
        raise ValueError("Invalid latitude or longitude range")

    params = {
        "format": "jsonv2",
        "lat": str(latitude),
        "lon": str(longitude),
        "zoom": "10",
        "addressdetails": "1",
        "accept-language": "en",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
            response = await client.get(NOMINATIM_REVERSE_URL, params=params, headers=HEADERS)
            response.raise_for_status()
            data = response.json()

        address = data.get("address", {})
        city_name = (
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("county")
            or address.get("state_district")
            or address.get("state")
            or data.get("name")
            or "Unknown Location"
        )
        display_name = data.get("display_name", city_name)

        return {
            "name": city_name,
            "display_name": display_name,
            "latitude": latitude,
            "longitude": longitude,
            "address": address,
        }
    except Exception as exc:
        return {
            "name": f"{latitude:.2f}, {longitude:.2f}",
            "display_name": f"Coordinates ({latitude:.4f}, {longitude:.4f})",
            "latitude": latitude,
            "longitude": longitude,
            "address": {},
            "error": str(exc),
        }

async def search_locations(query: str, limit: int = 5) -> list[dict]:
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": "1",
        "limit": limit,
        "accept-language": "en",
    }

    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        response = await client.get(NOMINATIM_SEARCH_URL, params=params, headers=HEADERS)
        response.raise_for_status()
        data = response.json()

    return [
        {
            "name": item.get("name") or (item.get("display_name", "").split(",")[0]),
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"]),
            "display_name": item.get("display_name"),
            "address": item.get("address", {}),
        }
        for item in data
    ]
