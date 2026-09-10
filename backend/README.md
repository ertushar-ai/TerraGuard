# TerraGuard Backend v2

FastAPI backend for TerraGuard with:

- Open-Meteo weather data
- USGS earthquake data
- OpenStreetMap/Nominatim geocoding
- TerraGuard landslide risk calculation
- Aggregated alerts
- PostgreSQL database (SQLite fallback for quick local testing)
- Real password hashing (Argon2)
- JWT authentication
- User preferences
- Saved locations
- Alert history
- Web Push subscription storage
- Web Push sending when VAPID is configured

## 1. Install

From CMD:

```cmd
cd /d C:\Users\Aditya\TerraGuard\backend
venv\Scripts\activate.bat
pip install -r requirements.txt
```

Copy `.env.example` to `.env`.

## 2. PostgreSQL

If Docker Desktop is installed:

```cmd
docker compose up -d postgres
```

The default `.env` database URL connects to this PostgreSQL container.

If you do not have Docker/PostgreSQL yet, use this temporary local fallback in `.env`:

```env
DATABASE_URL=sqlite:///./terraguard.db
```

The same SQLAlchemy models work with both.

## 3. Run

```cmd
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000/docs`.

Tables are created automatically on startup for this academic project. For a larger production deployment, add Alembic migrations.

## 4. Test authentication

Swagger -> `POST /api/auth/signup`:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Test@12345"
}
```

Copy the returned `access_token`. Swagger's Authorize button accepts `Bearer <token>`.

## 5. Web Push

Push needs VAPID keys. Generate keys using your installed `py-vapid` package and put the public/private values into `.env` along with:

```env
VAPID_SUBJECT=mailto:admin@example.com
```

The frontend helper files are in `frontend-integration/`:

- `api.js` - frontend API bridge
- `notifications.js` - permission/subscription flow
- `sw.js` - browser push service worker

The service worker must be served from the website origin (HTTPS in production; localhost is allowed for development).

## API groups

### Public
- GET `/api/locations/search`
- GET `/api/weather`
- GET `/api/earthquakes`
- GET `/api/landslide`
- GET `/api/alerts`
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/config`

### Authenticated
- GET `/api/auth/me`
- GET/PUT `/api/preferences`
- GET/POST `/api/locations`
- GET `/api/notifications/vapid-public-key`
- POST/DELETE `/api/notifications/subscribe`
- POST `/api/alerts/check`
- GET `/api/alerts/history`
