import httpx
from app.core.config import settings

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


async def search_locations(query: str, limit: int = 5):
    params = {
        "q": query,
        "format": "jsonv2",
        "addressdetails": 1,
        "limit": limit,
        "countrycodes": "in",
        "accept-language": "en",
    }
    headers = {
        "Accept": "application/json",
        "User-Agent": "TerraGuard/1.0 academic-disaster-monitor",
    }

    async with httpx.AsyncClient(timeout=settings.http_timeout) as client:
        response = await client.get(NOMINATIM_URL, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()

    return [
        {
            "name": item.get("name") or item.get("display_name", "").split(",")[0],
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"]),
            "display_name": item.get("display_name"),
            "osm_type": item.get("osm_type"),
            "osm_id": item.get("osm_id"),
            "address": item.get("address", {}),
        }
        for item in data
    ]
