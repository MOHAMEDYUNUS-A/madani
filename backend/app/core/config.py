import os
from typing import Optional
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Compute portable fallback storage directory
_ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
_DEFAULT_STORAGE = str(_ROOT_DIR / "storage")

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/madani_db"
    JWT_SECRET: str = "supersecretjwtsecretkeychangeinproduction12345!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REDIS_URL: str = "redis://localhost:6379/0"
    
    STORAGE_MODE: str = "local" # local or s3
    STORAGE_DIR: str = _DEFAULT_STORAGE
    STORAGE_ENDPOINT: Optional[str] = None
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_BUCKET: str = "madani-assets"
    
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:8000"
    
    EMAIL_API_KEY: Optional[str] = None
    PAYMENT_API_KEY: Optional[str] = None
    ENV: str = "development"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure storage directory exists
if settings.STORAGE_MODE == "local" and settings.STORAGE_DIR:
    os.makedirs(settings.STORAGE_DIR, exist_ok=True)
