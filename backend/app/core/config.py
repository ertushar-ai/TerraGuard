import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_list(name: str, default: str) -> list[str]:
    value = os.getenv(name, default)
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_env: str
    secret_key: str
    access_token_expire_minutes: int
    database_url: str
    http_timeout: float
    vapid_public_key: str
    vapid_private_key: str
    vapid_subject: str
    cors_origins: list[str]


settings = Settings(
    app_name=os.getenv("APP_NAME", "TerraGuard API"),
    app_env=os.getenv("APP_ENV", "development"),
    secret_key=os.getenv(
        "SECRET_KEY",
        "terraguard-dev-secret-key-change-this-123456789",
    ),
    access_token_expire_minutes=_get_int(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        1440,
    ),
    database_url=os.getenv(
        "DATABASE_URL",
        "sqlite:///./terraguard.db",
    ),
    http_timeout=_get_float(
        "HTTP_TIMEOUT",
        15.0,
    ),
    vapid_public_key=os.getenv(
        "VAPID_PUBLIC_KEY",
        "",
    ),
    vapid_private_key=os.getenv(
        "VAPID_PRIVATE_KEY",
        "",
    ),
    vapid_subject=os.getenv(
        "VAPID_SUBJECT",
        "mailto:admin@example.com",
    ),
    cors_origins=_get_list(
        "CORS_ORIGINS",
        "http://127.0.0.1:5500,"
        "http://localhost:5500,"
        "http://localhost:3000",
    ),
)


# ---------------------------------------------------------
# Backward-compatible exports
# Existing backend modules import these directly.
# ---------------------------------------------------------

APP_NAME = settings.app_name
APP_ENV = settings.app_env

SECRET_KEY = settings.secret_key
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

DATABASE_URL = settings.database_url

HTTP_TIMEOUT = settings.http_timeout

VAPID_PUBLIC_KEY = settings.vapid_public_key
VAPID_PRIVATE_KEY = settings.vapid_private_key
VAPID_SUBJECT = settings.vapid_subject

CORS_ORIGINS = settings.cors_origins