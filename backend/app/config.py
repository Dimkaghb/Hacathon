from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache
from typing import List, Optional
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="allow"
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/videogen"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    GEMINI_API_KEY: str = ""
    GCS_BUCKET: str = ""

    # Qdrant
    QDRANT_HOST: str = "localhost"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "face_embeddings"

    # Auth
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # App
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["*"]  # Allow all origins for development

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Parse CORS_ORIGINS from JSON string or comma-separated values"""
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            # Try JSON parsing first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # Fall back to comma-separated
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return ["*"]

    # Polar.sh
    POLAR_ACCESS_TOKEN: str = ""
    POLAR_WEBHOOK_SECRET: str = ""
    POLAR_PRO_PRODUCT_ID: str = ""
    POLAR_SANDBOX: bool = True
    POLAR_SUCCESS_URL: str = "http://localhost:3000/subscription/success"

    # Credits
    CREDITS_PRO_MONTHLY: int = 300
    CREDITS_TRIAL: int = 50
    TRIAL_DAYS: int = 3

    # Veo Configuration
    VEO_MODEL: str = "veo-3.1-generate-preview"
    VEO_FAST_MODEL: str = "veo-3.1-fast-generate-preview"
    VEO_DEFAULT_RESOLUTION: str = "720p"
    VEO_DEFAULT_DURATION: int = 8
    VEO_DEFAULT_ASPECT_RATIO: str = "16:9"
    VEO_POLL_INTERVAL: int = 10
    VEO_MAX_POLL_TIME: int = 360


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
