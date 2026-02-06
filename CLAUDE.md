# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Axel is a node-based AI video generation platform powered by Google Veo 3.1. Users create, extend, and chain videos through a visual React Flow canvas. The app is a full-stack monorepo: **Next.js 16 frontend** + **FastAPI backend** with Celery workers for async video generation.

## Commands

### Backend (run from `backend/`)

```bash
# Setup
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# Run API server
uvicorn app.main:app --reload --port 8000

# Run Celery worker (separate terminal)
celery -A app.core.celery_app worker --loglevel=info

# Alternative async workers
python -m app.workers.runner --type all

# Start infrastructure (PostgreSQL, Redis, Qdrant)
docker-compose up -d postgres redis qdrant

# Tests
pytest -v
pytest --cov=app tests/

# Linting
black .
isort .
mypy .
```

### Frontend (run from `frontend/`)

```bash
pnpm install
pnpm dev          # Dev server on localhost:3000
pnpm build        # Production build
pnpm lint         # ESLint
```

### Shell test scripts (from repo root)

```bash
./quick_test.sh                # Quick API validation (~2 min, no video gen)
./test_video_flow.sh           # Full E2E with actual video generation (~6-12 min)
./monitor_job.sh <job_id>      # Real-time job progress monitoring
```

## Architecture

```
Frontend (Next.js 16 + React Flow)
        │
   REST API + WebSocket
        │
Backend (FastAPI) ── Services Layer ── Celery Workers
        │                                    │
   PostgreSQL          Redis (broker)    Google Veo 3.1 API
                       Qdrant (vectors)  Google Cloud Storage
```

### Backend layers (`backend/app/`)

- **`api/`** — FastAPI route handlers. Routes are mounted under `/api/auth`, `/api/projects`, `/api/ai`, `/api/files`. The `ai.py` endpoint is the most complex (~414 lines), orchestrating video generation/extension/face analysis.
- **`services/`** — Business logic. `veo_service.py` wraps the Google Veo 3.1 API (generate, extend, poll). `face_service.py` handles face embedding extraction. `prompt_service.py` enhances prompts via Gemini. `storage_service.py` handles GCS uploads/downloads.
- **`workers/`** — Celery worker implementations (`video_worker.py`, `extension_worker.py`, `face_worker.py`). Inherit from `base.py` BaseWorker. Launched via `runner.py`.
- **`tasks/`** — Celery task definitions that dispatch to workers. `video_tasks.py` defines `generate_video` and `extend_video`.
- **`models/`** — SQLAlchemy ORM models with UUID primary keys. Key models: User, Project, Node, Connection, Job, Character. All use async sessions.
- **`schemas/`** — Pydantic request/response schemas mirroring models.
- **`core/`** — Infrastructure: `database.py` (async PostgreSQL via asyncpg), `celery_app.py`, `redis.py`, `security.py` (JWT + bcrypt).
- **`config.py`** — pydantic-settings `Settings` class. All config comes from environment variables / `.env` file.

### Frontend layers (`frontend/`)

- **`app/`** — Next.js pages: landing (`page.tsx`), login (`login/page.tsx`), main editor (`main/page.tsx`).
- **`components/canvas/`** — React Flow canvas. `ReactFlowCanvas.tsx` is the main component. Custom nodes in `nodes/` (VideoNode, PromptNode, ImageNode, ExtensionNode) and custom edges in `edges/`.
- **`components/landing/`** — Landing page section components (Hero, Features, FAQ, etc.).
- **`lib/api.ts`** — API client for all backend communication (HTTP + WebSocket).
- **`lib/contexts/AuthContext.tsx`** — Authentication state management, token storage in localStorage.

### Key data flows

**Video generation:** Frontend POST `/api/ai/generate-video` → Job created (PENDING) → Celery task dispatched → Worker calls Veo 3.1 → Polls for completion (10s interval, 360s max) → Downloads video → Uploads to GCS → Updates Job/Node status → Frontend polls `/api/ai/jobs/{id}`.

**Job status lifecycle:** PENDING → PROCESSING → COMPLETED/FAILED

**Node types:** PROMPT, IMAGE, VIDEO, EXTENSION, CONTAINER, RATIO, SCENE

## Environment Variables

### Backend (`backend/.env`)
`DATABASE_URL`, `REDIS_URL`, `GEMINI_API_KEY`, `GCS_BUCKET`, `JWT_SECRET`, `GOOGLE_CLOUD_PROJECT`, `VEO_MODEL`

### Frontend (`frontend/.env.local`)
`NEXT_PUBLIC_API_URL=http://localhost:8000`

## Infrastructure Dependencies

PostgreSQL 14+, Redis 6+, Qdrant (vector DB for face embeddings), Google Cloud Storage, Google Veo 3.1 API access.

## API Documentation

When the backend is running: Swagger UI at `/docs`, ReDoc at `/redoc`.
