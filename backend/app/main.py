from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import APP_NAME, CORS_ORIGINS
from app.db.session import init_db

app = FastAPI(
    title=APP_NAME,
    version="2.0.0",
    description="TerraGuard disaster monitoring, alert, authentication and notification API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"name": APP_NAME, "status": "running", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(router, prefix="/api")
