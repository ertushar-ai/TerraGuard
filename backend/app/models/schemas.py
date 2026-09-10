from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class Location(BaseModel):
    name: str
    latitude: float
    longitude: float
    displayName: Optional[str] = None
    osmType: Optional[str] = None
    osmId: Optional[int] = None
    address: Optional[dict] = None


class WeatherResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    temperature: float
    feelsLike: float
    humidity: float
    wind: float
    rainfallProbability: float
    precipitation: float
    rain: float
    weatherCode: int
    condition: str
    lastUpdated: str
    risk: dict


class Earthquake(BaseModel):
    id: str
    magnitude: float
    depth: float
    distance: float
    lat: float
    lon: float
    place: str
    time: str
    tsunami: bool = False
    url: Optional[str] = None
    risk: dict


class EarthquakeResponse(BaseModel):
    location: str
    latitude: float
    longitude: float
    count: int
    earthquakes: list[Earthquake]
    risk: dict
    lastUpdated: str


class AlertPreferences(BaseModel):
    weather: bool = True
    landslide: bool = True
    earthquake: bool = True
    minimumSeverity: str = "High"
    browser: bool = True
    email: bool = False


class Alert(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    message: str
    location: str
    timestamp: str
    metadata: dict = Field(default_factory=dict)


class SignupRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=1, max_length=128)


class AuthUser(BaseModel):
    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class PreferenceResponse(AlertPreferences):
    pass


class PushSubscriptionRequest(BaseModel):
    endpoint: str
    keys: dict


class SavedLocationRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    latitude: float
    longitude: float


class ReverseGeocodeResponse(BaseModel):
    name: str
    display_name: str
    latitude: float
    longitude: float
    address: Optional[dict] = None

