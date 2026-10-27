import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/madani_db"
    JWT_SECRET: str = "supersecretjwtsecretkeychangeinproduction12345!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REDIS_URL: str = "redis://localhost:6379/0"
    
    STORAGE_MODE: str = "local" # local or s3
    STORAGE_DIR: str = "c:/Users/niran/Desktop/Madani/storage"
    STORAGE_ENDPOINT: Optional[str] = None
    STORAGE_ACCESS_KEY: Optional[str] = None
    STORAGE_SECRET_KEY: Optional[str] = None
    STORAGE_BUCKET: str = "madani-assets"
    
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
