from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/videogen"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Google Cloud
    GOOGLE_CLOUD_PROJECT: str = ""
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
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # Veo Configuration
    VEO_MODEL: str = "veo-3.1-generate-preview"
    VEO_FAST_MODEL: str = "veo-3.1-fast-generate-preview"
    VEO_DEFAULT_RESOLUTION: str = "1080p"
    VEO_DEFAULT_DURATION: int = 8
    VEO_DEFAULT_ASPECT_RATIO: str = "16:9"
    VEO_POLL_INTERVAL: int = 10
    VEO_MAX_POLL_TIME: int = 360

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
