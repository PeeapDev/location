"""Application configuration and settings."""

from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Xeeno Map"
    app_version: str = "0.1.0"
    debug: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://xeeno:xeeno_secret_2024@localhost:5432/xeeno_map"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Security
    secret_key: str = "xeeno-dev-secret-key-change-in-production"
    api_key_header: str = "X-API-Key"

    # Google Maps API
    google_maps_api_key: Optional[str] = None

    # CORS - allow common development ports
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:4000",
        "http://localhost:5000",
        "http://localhost:5173",  # Vite
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:4000",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]

    # Sierra Leone bounds for validation
    sl_bounds: dict = {
        "min_lat": 6.85,
        "max_lat": 10.0,
        "min_lon": -13.5,
        "max_lon": -10.25
    }

    # GPS accuracy thresholds (meters)
    gps_accuracy_excellent: float = 5.0
    gps_accuracy_good: float = 10.0
    gps_accuracy_acceptable: float = 25.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Allow extra environment variables


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
