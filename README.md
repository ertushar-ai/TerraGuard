# TerraGuard 🌍

### Python-First Local Disaster Monitoring & Alert System

> **⚠️ Academic Disclaimer**: TerraGuard is an academic mini-project for disaster monitoring and risk indication. It is **NOT** an official emergency warning system.

---

## 📌 Overview

TerraGuard is a production-quality, web-based local disaster monitoring application. It evaluates real-time environmental data for a user's location, including **weather conditions, rainfall intensity, landslide hazards, and earthquake activity**.

The application is built with a **Python-First architecture**: all core business logic, risk calculations, data normalization, alert generation, deduplication, user management, location processing, and Web Push notifications are executed in the **FastAPI Python backend**. The frontend consists of vanilla HTML, CSS, and JavaScript.

---

## 🏗️ Architecture

```text
               ┌─────────────────────────────────────────┐
               │         Frontend (Browser UI)           │
               │ Vanilla HTML5, CSS3, JS, Leaflet Map    │
               └────────────────────┬────────────────────┘
                                    │
                               REST │ API (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Python Backend                          │
│                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Auth & JWT       │  │ Location Service │  │ Weather Service      │  │
│  │ pwdlib / Argon2  │  │ Nominatim / GPS  │  │ Open-Meteo           │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Earthquake Engine│  │ Landslide Engine │  │ Centralized Alert    │  │
│  │ USGS Query       │  │ Rainfall Accum.  │  │ & Deduplication      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐                            │
│  │ Web Push VAPID   │  │ SQLAlchemy ORM   │                            │
│  │ PyWebPush        │  │ SQLite/Postgres  │                            │
│  └──────────────────┘  └──────────────────┘                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Backend Endpoints

### 🔐 Authentication & Profile
- `POST /api/auth/signup` – Register user with Argon2 password hashing
- `POST /api/auth/login` – Authenticate user and issue JWT token
- `GET /api/auth/me` – Retrieve current authenticated user profile

### 📍 Location Service
- `GET /api/locations/search?q={query}` – Search locations via Nominatim
- `GET /api/locations/reverse?latitude={lat}&longitude={lon}` – Reverse geocode GPS coordinates to locality name
- `GET /api/locations` – Get saved user locations
- `POST /api/locations` – Save a user location

### 🌦️ Environmental & Disaster Engines
- `GET /api/weather?latitude={lat}&longitude={lon}&location={name}` – Normalized weather & weather risk
- `GET /api/earthquakes?latitude={lat}&longitude={lon}&location={name}` – Distance-filtered USGS earthquakes & risk
- `GET /api/landslide?latitude={lat}&longitude={lon}&location={name}` – Multi-hour rainfall accumulation & landslide risk
- `GET /api/alerts?latitude={lat}&longitude={lon}&location={name}` – Aggregated disaster alert evaluation

### 🚨 Alert History & Notifications
- `POST /api/alerts/check` – Python alert engine check, deduplication, and push trigger
- `GET /api/alerts/history` – Persistent alert history for authenticated user
- `GET /api/preferences` – Retrieve alert & notification preferences
- `PUT /api/preferences` – Update minimum severity and notification toggles
- `GET /api/notifications/vapid-public-key` – Obtain VAPID public key
- `POST /api/notifications/subscribe` – Register browser Web Push subscription
- `DELETE /api/notifications/subscribe` – Unsubscribe Web Push endpoint

---

## 📦 Setup & Installation

### Prerequisites
- **Python 3.10+**
- **Node.js / Live Server** (optional for local HTTP server)

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn Server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
FastAPI Interactive Swagger Documentation will be available at: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup
Run a simple HTTP server from the project root:
```bash
# From project root directory
python -m http.server 8080 --directory .
```
Access the application at `http://127.0.0.1:8080` or open `index.html`.

---

## 🔑 Environment Variables (`.env`)

Located in `backend/.env`:
```env
APP_NAME=TerraGuard
APP_ENV=development
SECRET_KEY=terraguard_secret_jwt_key_change_in_production
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL=sqlite:///./terraguard.db
CORS_ORIGINS=*
HTTP_TIMEOUT=15.0

# Web Push VAPID keys
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@terraguard.local
```

---

## 📱 Mobile & GPS Geolocation
TerraGuard requests browser geolocation permission upon initial load:
- Uses `enableHighAccuracy: true` for phone GPS.
- Saves raw `latitude` and `longitude` coordinates as the authoritative source of truth.
- Performs reverse geocoding to display meaningful locality names without losing coordinate precision.
- Supports manual location search and location selection fallback when GPS is unavailable.

---

## 🎨 Visual Identity & Nature Scene
- Features a **programmatically rendered, cinematic anime-inspired nature background** created using HTML + SVG + CSS keyframe animations.
- Depicts a rainy mountain valley framing rich tree foliage, mist/fog, continuous falling rain, drifting leaves, and a winding river.
- **Zero external JPG/PNG background images** are used; the scene is lightweight, vector-based, and fully responsive across devices.

---

## 🛡️ License & Academic Note
TerraGuard is developed as an academic project demonstrating Python-first full-stack disaster monitoring.
