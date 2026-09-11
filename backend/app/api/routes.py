from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import VAPID_PUBLIC_KEY
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.db_models import AlertHistory, PushSubscription, SavedLocation, User, UserPreference
from app.models.schemas import (
    AlertPreferences, Alert, AuthResponse, AuthUser, EarthquakeResponse,
    LoginRequest, PreferenceResponse, PushSubscriptionRequest,
    ReverseGeocodeResponse, SavedLocationRequest, SignupRequest,
)
from app.services.alerts import generate_alerts
from app.services.earthquake import get_earthquakes
from app.services.landslide import get_landslide
from app.services.location_service import reverse_geocode, search_locations
from app.services.notifications import notify_subscriptions, push_enabled
from app.services.weather import get_weather

router = APIRouter()

def user_response(user: User) -> AuthUser:
    return AuthUser(id=user.id, name=user.name, email=user.email)

def prefs_response(pref: UserPreference) -> PreferenceResponse:
    return PreferenceResponse(
        weather=pref.weather_alerts,
        landslide=pref.landslide_alerts,
        earthquake=pref.earthquake_alerts,
        minimumSeverity=pref.minimum_severity,
        browser=pref.browser_notifications,
        email=pref.email_notifications,
    )

@router.get("/locations/search")
async def locations_search(q: str = Query(min_length=2), limit: int = Query(5, ge=1, le=10)):
    try:
        return await search_locations(q, limit)
    except Exception as exc:
        raise HTTPException(502, f"Location service failed: {exc}") from exc

@router.get("/locations/reverse", response_model=ReverseGeocodeResponse)
async def locations_reverse(latitude: float, longitude: float):
    try:
        return await reverse_geocode(latitude, longitude)
    except Exception as exc:
        raise HTTPException(502, f"Reverse geocoding failed: {exc}") from exc

@router.get("/weather")
async def weather(latitude: float, longitude: float, location: str = "Delhi"):
    try:
        return await get_weather(latitude, longitude, location)
    except Exception as exc:
        raise HTTPException(502, f"Weather service failed: {exc}") from exc

@router.get("/earthquakes")
async def earthquakes(latitude: float, longitude: float, location: str = "Delhi"):
    try:
        return await get_earthquakes(latitude, longitude, location)
    except Exception as exc:
        raise HTTPException(502, f"Earthquake service failed: {exc}") from exc

@router.get("/landslide")
async def landslide(latitude: float, longitude: float, location: str = "Delhi"):
    try:
        return await get_landslide(latitude, longitude, location)
    except Exception as exc:
        raise HTTPException(502, f"Landslide service failed: {exc}") from exc

@router.get("/alerts")
async def alerts(latitude: float, longitude: float, location: str = "Delhi"):
    try:
        weather_data = await get_weather(latitude, longitude, location)
        landslide_data = await get_landslide(latitude, longitude, location)
        earthquake_data = await get_earthquakes(latitude, longitude, location)
        return {
            "location": location,
            "alerts": generate_alerts(weather_data, landslide_data, earthquake_data, location),
            "weather": weather_data,
            "landslide": landslide_data,
            "earthquake": earthquake_data,
        }
    except Exception as exc:
        raise HTTPException(502, f"Alert aggregation failed: {exc}") from exc

@router.post("/auth/signup", response_model=AuthResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists")

    user = User(name=payload.name.strip(), email=email, password_hash=hash_password(payload.password))
    user.preferences = UserPreference()
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user_response(user))

@router.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return AuthResponse(access_token=create_access_token(user.id), user=user_response(user))

@router.get("/auth/me", response_model=AuthUser)
def me(user: User = Depends(get_current_user)):
    return user_response(user)

@router.get("/preferences", response_model=PreferenceResponse)
def get_preferences(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    pref = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return prefs_response(pref)

@router.put("/preferences", response_model=PreferenceResponse)
def update_preferences(payload: AlertPreferences, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    allowed = {"Low", "Moderate", "High", "Critical"}
    if payload.minimumSeverity not in allowed:
        raise HTTPException(422, f"minimumSeverity must be one of {sorted(allowed)}")
    pref = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id))
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
    pref.weather_alerts = payload.weather
    pref.landslide_alerts = payload.landslide
    pref.earthquake_alerts = payload.earthquake
    pref.minimum_severity = payload.minimumSeverity
    pref.browser_notifications = payload.browser
    pref.email_notifications = payload.email
    db.commit()
    db.refresh(pref)
    return prefs_response(pref)

@router.get("/locations", response_model=list[SavedLocationRequest])
def saved_locations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(SavedLocation).where(SavedLocation.user_id == user.id).order_by(SavedLocation.id.desc())).all()
    return [SavedLocationRequest(name=x.name, latitude=x.latitude, longitude=x.longitude) for x in rows]

@router.post("/locations", response_model=SavedLocationRequest)
def save_location(payload: SavedLocationRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = SavedLocation(user_id=user.id, name=payload.name, latitude=payload.latitude, longitude=payload.longitude)
    db.add(row)
    db.commit()
    return payload

@router.get("/notifications/vapid-public-key")
def vapid_public_key():
    return {"publicKey": VAPID_PUBLIC_KEY, "enabled": push_enabled()}

@router.post("/notifications/subscribe")
def subscribe_push(payload: PushSubscriptionRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p256dh = payload.keys.get("p256dh")
    auth = payload.keys.get("auth")
    if not p256dh or not auth:
        raise HTTPException(422, "Push subscription must include p256dh and auth keys")

    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    if row:
        row.user_id = user.id
        row.p256dh = p256dh
        row.auth = auth
    else:
        row = PushSubscription(user_id=user.id, endpoint=payload.endpoint, p256dh=p256dh, auth=auth)
        db.add(row)
    db.commit()
    return {"status": "subscribed", "pushEnabled": push_enabled()}

@router.delete("/notifications/subscribe")
def unsubscribe_push(endpoint: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == endpoint, PushSubscription.user_id == user.id))
    if row:
        db.delete(row)
        db.commit()
    return {"status": "unsubscribed"}

@router.post("/alerts/check")
async def check_alerts(latitude: float, longitude: float, location: str = "Delhi", user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    weather_data = await get_weather(latitude, longitude, location)
    landslide_data = await get_landslide(latitude, longitude, location)
    earthquake_data = await get_earthquakes(latitude, longitude, location)
    generated = generate_alerts(weather_data, landslide_data, earthquake_data, location)

    pref = db.scalar(select(UserPreference).where(UserPreference.user_id == user.id)) or UserPreference(user_id=user.id)
    db.add(pref) if pref.id is None else None

    severity_rank = {"Low": 1, "Moderate": 2, "High": 3, "Critical": 4}
    min_rank = severity_rank.get(pref.minimum_severity, 3)
    eligible = []
    for alert in generated:
        pref_field = {"weather": "weather_alerts", "landslide": "landslide_alerts", "earthquake": "earthquake_alerts"}.get(alert["type"])
        if pref_field and not getattr(pref, pref_field):
            continue
        severity = alert.get("risk", "Low")
        if severity_rank.get(severity, 0) < min_rank:
            continue
        eligible.append(alert)

        alert_key = alert.get("id") or f"{alert['type']}:{severity}:{alert['title']}:{location}"
        exists = db.scalar(select(AlertHistory).where(AlertHistory.user_id == user.id, AlertHistory.alert_key == alert_key))
        if not exists:
            db.add(AlertHistory(
                user_id=user.id,
                alert_key=alert_key,
                alert_type=alert["type"],
                severity=severity,
                title=alert["title"],
                message=alert["message"],
                location=location,
            ))

    db.commit()

    if eligible and pref.browser_notifications:
        subscriptions = db.scalars(select(PushSubscription).where(PushSubscription.user_id == user.id)).all()
        for alert in eligible:
            severity = alert.get("risk", "Low")
            sent = notify_subscriptions(subscriptions, {
                "title": f"TerraGuard: {alert['title']}",
                "body": alert["message"],
                "severity": severity,
                "type": alert["type"],
                "location": location,
                "url": "/",
            })
            if sent:
                row = db.scalar(select(AlertHistory).where(AlertHistory.user_id == user.id, AlertHistory.alert_key == (alert.get("id") or f"{alert['type']}:{severity}:{alert['title']}:{location}")))
                if row:
                    row.notified = True
        db.commit()

    return {"location": location, "alerts": eligible, "notificationConfigured": push_enabled()}

@router.get("/alerts/history", response_model=list[Alert])
def alert_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(AlertHistory).where(AlertHistory.user_id == user.id).order_by(AlertHistory.created_at.desc()).limit(50)).all()
    return [Alert(
        id=str(x.id), type=x.alert_type, severity=x.severity, title=x.title,
        message=x.message, location=x.location,
        timestamp=x.created_at.isoformat(), metadata={"notified": x.notified},
    ) for x in rows]

@router.get("/config")
def config():
    return {
        "version": "2.0.0",
        "providers": {"weather": "Open-Meteo", "earthquake": "USGS", "geocoding": "Nominatim / OpenStreetMap"},
        "refresh_minutes": 10,
        "database": True,
        "authentication": "JWT",
        "web_push": push_enabled(),
    }
