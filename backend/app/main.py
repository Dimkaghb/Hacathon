from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from fastapi.responses import JSONResponse

from app.config import settings
from app.core.database import engine, Base
from app.core.redis import close_redis
from app.core.exceptions import InsufficientCreditsError
from app.api import auth, projects, nodes, connections, ai, files, subscriptions, webhooks, characters, scene_definitions, templates, hooks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_redis()
    await engine.dispose()
    logger.info("Cleanup complete")


app = FastAPI(
    title="AI Video Generation Platform",
    description="Node-based platform for AI video generation using Google Veo 3.1",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware - must be added before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(nodes.router, prefix="/api/projects", tags=["Nodes"])
app.include_router(connections.router, prefix="/api/projects", tags=["Connections"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Operations"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["Subscriptions"])
app.include_router(webhooks.router, prefix="/api/webhooks", tags=["Webhooks"])
app.include_router(characters.router, prefix="/api/characters", tags=["Characters"])
app.include_router(scene_definitions.router, prefix="/api/scene-definitions", tags=["Scene Definitions"])
app.include_router(templates.router, prefix="/api/templates", tags=["Templates"])
app.include_router(hooks.router, prefix="/api/hooks", tags=["Hooks"])


@app.exception_handler(InsufficientCreditsError)
async def insufficient_credits_handler(request, exc: InsufficientCreditsError):
    return JSONResponse(
        status_code=402,
        content={
            "detail": "Insufficient credits",
            "required": exc.required,
            "available": exc.available,
        },
    )


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/")
async def root():
    return {
        "message": "AI Video Generation Platform API",
        "docs": "/docs",
        "version": "1.0.0"
    }
