# AI Video Generation Platform

## Project Overview
A Figma + n8n style node-based platform for AI video generation. Users create visual workflows where nodes represent images, prompts, and videos that connect together to generate AI-powered video content.

## Architecture

### Frontend (`/frontend`)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Purpose**: Node-based canvas editor for video workflows

### Backend (`/backend`)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Queue**: Redis + BullMQ for async jobs
- **Vector DB**: Qdrant for face embeddings
- **Storage**: Google Cloud Storage
- **Video AI**: Google Veo 3.1

## Core Workflow
```
Image Upload → Face Analysis → Character Created
     ↓
Prompt Node → AI Enhancement → Enhanced Prompt
     ↓
Video Generation (Veo 3.1) → Video Output
     ↓
Video Extension → Extended Video (up to 20 extensions)
```

## Node Types
1. **Image Node**: Uploaded face image with extracted embeddings for character consistency
2. **Prompt Node**: Text prompt with AI enhancement capabilities
3. **Video Node**: Generated video from image + prompt combination

## Key Technologies

### Google Veo 3.1 Integration
- Model: `veo-3.1-generate-preview`
- Capabilities: text-to-video, image-to-video, video extension
- Resolutions: 720p, 1080p, 4K
- Duration: 4, 6, or 8 seconds per generation
- Extension: Up to 20 consecutive extensions (720p only)

```python
from google import genai
client = genai.Client()
operation = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt="...",
    image=image_object,  # Optional: for image-to-video
    config=types.GenerateVideosConfig(resolution="1080p")
)
```

### Database Schema
- `users`: User accounts
- `projects`: Workspace/canvas containers
- `characters`: Persisted face identities with embeddings
- `nodes`: Workflow nodes (image, prompt, video)
- `connections`: Node-to-node edges
- `jobs`: Async processing tasks

### API Structure
```
/api/auth/*           - Authentication
/api/projects/*       - Project CRUD
/api/projects/{id}/nodes/*        - Node management
/api/projects/{id}/connections/*  - Edge management
/api/ai/*             - AI operations (face analysis, video generation)
/api/files/*          - File upload/download
/ws/projects/{id}     - WebSocket for real-time updates
```

## Development Commands

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database
```bash
# Run migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

### Docker
```bash
docker-compose up -d  # Start all services
docker-compose logs -f api  # View API logs
```

## Environment Variables
Required in `backend/.env`:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `GEMINI_API_KEY` - Google AI API key
- `GOOGLE_CLOUD_PROJECT` - GCP project ID
- `GCS_BUCKET` - Cloud Storage bucket name
- `JWT_SECRET` - Auth secret key
- `QDRANT_HOST` - Vector DB host

## File Structure
```
hackathonproject/
├── frontend/          # Next.js application
│   ├── app/          # App Router pages
│   └── components/   # React components
├── backend/          # FastAPI application
│   ├── app/
│   │   ├── api/      # Route handlers
│   │   ├── models/   # SQLAlchemy models
│   │   ├── schemas/  # Pydantic schemas
│   │   ├── services/ # Business logic
│   │   └── workers/  # Async job processors
│   └── alembic/      # DB migrations
└── CLAUDE.md         # This file
```

## Implementation Notes

### Video Generation Flow
1. User creates prompt node connected to image node
2. API receives generation request
3. Job queued in Redis
4. Worker calls Veo 3.1 API (async operation)
5. Worker polls until complete (~10s to 6min)
6. Video downloaded to GCS
7. Node updated, WebSocket broadcasts completion

### Character Consistency
- Face embeddings stored in Qdrant
- Same character_id used across related nodes
- Embeddings passed to video generation for consistency

### Error Handling
- Veo may block generation due to safety filters
- Workers implement retry with exponential backoff
- Failed jobs marked with error details
- WebSocket notifies frontend of failures
