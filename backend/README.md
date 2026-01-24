# AI Video Generation Platform - Backend

A FastAPI backend for the AI video generation platform using Google Veo 3.1.

## Features

- **Node-based Workflow**: Support for image, prompt, and video nodes
- **AI Video Generation**: Integration with Google Veo 3.1 for video generation
- **Face Analysis**: Extract and store face embeddings for character consistency
- **Prompt Enhancement**: AI-powered prompt improvement
- **Real-time Updates**: WebSocket support for live progress updates
- **Async Processing**: Background job processing with Redis queue

## Tech Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy
- **Queue**: Redis
- **Vector DB**: Qdrant for face embeddings
- **Storage**: Google Cloud Storage
- **AI**: Google Veo 3.1, Gemini

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL
- Redis
- Docker (optional)

### Local Development

1. **Clone and setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Start dependencies:**
```bash
# Using Docker
docker-compose up -d postgres redis qdrant

# Or start them manually
```

4. **Run migrations:**
```bash
alembic upgrade head
```

5. **Start the API:**
```bash
uvicorn app.main:app --reload --port 8000
```

6. **Start workers (in separate terminal):**
```bash
python -m app.workers.runner --type all
```

### Using Docker

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/{id}` - Get project with nodes
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

### Nodes
- `GET /api/projects/{id}/nodes` - List nodes
- `POST /api/projects/{id}/nodes` - Create node
- `PUT /api/projects/{id}/nodes/{nid}` - Update node
- `DELETE /api/projects/{id}/nodes/{nid}` - Delete node

### Connections
- `GET /api/projects/{id}/connections` - List connections
- `POST /api/projects/{id}/connections` - Create connection
- `DELETE /api/projects/{id}/connections/{cid}` - Delete connection

### AI Operations
- `POST /api/ai/analyze-face` - Analyze face image
- `POST /api/ai/enhance-prompt` - Enhance prompt with AI
- `POST /api/ai/generate-video` - Start video generation
- `POST /api/ai/extend-video` - Extend existing video
- `GET /api/ai/jobs/{job_id}` - Get job status

### Files
- `POST /api/files/upload` - Get signed upload URL
- `POST /api/files/upload-direct` - Upload file directly
- `GET /api/files/{id}` - Get signed download URL

### WebSocket
- `WS /ws/projects/{id}?token=xxx` - Real-time project updates

## Project Structure

```
backend/
├── app/
│   ├── api/           # API endpoints
│   ├── core/          # Core utilities (db, security, redis)
│   ├── models/        # SQLAlchemy models
│   ├── schemas/       # Pydantic schemas
│   ├── services/      # Business logic
│   └── workers/       # Async job processors
├── alembic/           # Database migrations
├── tests/             # Test files
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Running Tests

```bash
# Create test database
createdb videogen_test

# Run tests
pytest -v

# With coverage
pytest --cov=app tests/
```

## Environment Variables

See `.env.example` for all required environment variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GEMINI_API_KEY` - Google AI API key
- `GCS_BUCKET` - Google Cloud Storage bucket
- `JWT_SECRET` - Secret for JWT tokens

## License

MIT
