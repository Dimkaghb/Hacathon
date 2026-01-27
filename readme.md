# Axel - AIcd Video Generation Platform.




A node-based AI video generation platform powered by Google Veo 3.1. Create, extend, and chain videos using an intuitive visual interface.

## 🎯 Features.

- **Text-to-Video Generation**: Generate high-quality videos from text prompts
- **Image-to-Video Generation**: Animate static images into videos
- **Video Extension**: Seamlessly extend videos with temporal continuity (up to 20 extensions)
- **Character Consistency**: Maintain character features across video sequences using face analysis
- **Node-Based Editor**: Visual workflow using React Flow for intuitive video creation
- **Real-time Progress**: WebSocket updates for live generation progress tracking

## 🏗️ Architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Landing Page │  │ Auth (Login) │  │ Main Editor (Canvas) │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                              │                                   │
│                    React Flow Canvas                             │
│           (Prompt, Image, Video, Extension Nodes)                │
└─────────────────────────────────────────────────────────────────┘
                               │
                    REST API + WebSocket
                               │
┌─────────────────────────────────────────────────────────────────┐
│                       Backend (FastAPI)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ Auth API   │  │ Projects   │  │ Nodes API  │  │ AI API    │ │
│  │ /api/auth  │  │ /api/proj  │  │ /api/nodes │  │ /api/ai   │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│                              │                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Services Layer                          │ │
│  │  VeoService │ FaceService │ PromptService │ StorageService │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────┐
│                        Celery Workers                            │
│  ┌──────────────────┐  ┌───────────────────┐  ┌──────────────┐ │
│  │ Video Generation │  │ Video Extension   │  │ Face Analysis│ │
│  │ Worker           │  │ Worker            │  │ Worker       │ │
│  └──────────────────┘  └───────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ PostgreSQL │  │   Redis    │  │ Google Veo │  │    GCS    │ │
│  │ (Database) │  │ (Broker)   │  │  3.1 API   │  │ (Storage) │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Hacathon/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # REST API endpoints
│   │   │   ├── auth.py        # Authentication (register, login, refresh)
│   │   │   ├── projects.py    # Project CRUD operations
│   │   │   ├── nodes.py       # Node management
│   │   │   ├── connections.py # Node connections
│   │   │   ├── ai.py          # AI operations (generate, extend)
│   │   │   └── websocket.py   # Real-time updates
│   │   ├── core/              # Core infrastructure
│   │   │   ├── database.py    # PostgreSQL + SQLAlchemy
│   │   │   ├── celery_app.py  # Task queue configuration
│   │   │   ├── redis.py       # Redis connection
│   │   │   └── security.py    # JWT authentication
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   │   ├── veo_service.py # Google Veo 3.1 integration
│   │   │   ├── face_service.py# Face analysis for character consistency
│   │   │   ├── prompt_service.py # AI prompt enhancement
│   │   │   └── storage_service.py # GCS file storage
│   │   ├── workers/           # Celery worker implementations
│   │   └── tasks/             # Celery task definitions
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Test suite
│   ├── requirements.txt
│   └── docker-compose.yml
│
├── frontend/                   # Next.js Frontend
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── login/             # Authentication
│   │   └── main/              # Main editor
│   ├── components/
│   │   ├── canvas/            # React Flow components
│   │   │   ├── ReactFlowCanvas.tsx  # Main canvas
│   │   │   ├── nodes/         # Custom node types
│   │   │   │   ├── VideoNodeRF.tsx
│   │   │   │   ├── PromptNodeRF.tsx
│   │   │   │   ├── ImageNodeRF.tsx
│   │   │   │   └── ExtensionNodeRF.tsx
│   │   │   └── edges/         # Custom edge types
│   │   ├── landing/           # Landing page sections
│   │   └── ui/                # Reusable UI components
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   ├── contexts/          # React contexts (Auth)
│   │   └── types/             # TypeScript types
│   └── package.json
│
├── monitor_job.sh             # Job monitoring utility
├── quick_test.sh              # Quick API test script
└── test_video_flow.sh         # Full E2E test script
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (Frontend)
- **Python** 3.11+ (Backend)
- **PostgreSQL** 14+
- **Redis** 6+
- **Google Cloud Account** with Veo API access

### Backend Setup

1. **Clone and navigate to backend:**
   ```bash
   cd Hacathon/backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration:
   # - DATABASE_URL: PostgreSQL connection string
   # - REDIS_URL: Redis connection string
   # - GEMINI_API_KEY: Google Gemini/Veo API key
   # - GCS_BUCKET: Google Cloud Storage bucket name
   # - JWT_SECRET: Secret key for JWT tokens
   ```

5. **Run database migrations:**
   ```bash
   alembic upgrade head
   ```

6. **Start the backend:**
   ```bash
   # Terminal 1: API Server
   uvicorn app.main:app --reload --port 8000
   
   # Terminal 2: Celery Worker
   celery -A app.core.celery_app worker --loglevel=info
   ```

### Frontend Setup

1. **Navigate to frontend:**
   ```bash
   cd Hacathon/frontend
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment:**
   ```bash
   # Create .env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Start development server:**
   ```bash
   pnpm dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## 🔧 Node Types

| Node Type | Purpose | Inputs | Outputs |
|-----------|---------|--------|---------|
| **Prompt** | Text description for video | - | Text prompt |
| **Image** | Source image upload | - | Image URL |
| **Video** | Generate video from inputs | Prompt, Image (optional) | Video URL |
| **Extension** | Extend existing video | Video, Prompt | Extended video |
| **Container** | Group related nodes | - | - |
| **Ratio** | Set aspect ratio | - | Ratio config |
| **Scene** | Scene configuration | - | Scene settings |

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project with nodes
- `DELETE /api/projects/{id}` - Delete project

### Nodes
- `GET /api/projects/{id}/nodes` - List nodes
- `POST /api/projects/{id}/nodes` - Create node
- `PUT /api/projects/{id}/nodes/{node_id}` - Update node
- `DELETE /api/projects/{id}/nodes/{node_id}` - Delete node

### AI Operations
- `POST /api/ai/generate-video` - Start video generation
- `POST /api/ai/extend-video` - Start video extension
- `POST /api/ai/enhance-prompt` - Enhance prompt with AI
- `GET /api/ai/jobs/{job_id}` - Get job status

## 🧪 Testing Scripts

The repository includes utility scripts for testing and monitoring:

### `quick_test.sh`
Quick API endpoint validation. Tests authentication, project creation, and video extension request acceptance without waiting for generation.

```bash
chmod +x quick_test.sh
./quick_test.sh
```

### `test_video_flow.sh`
Full end-to-end test of video generation and extension. Takes 6-12 minutes to complete.

```bash
chmod +x test_video_flow.sh
./test_video_flow.sh
```

### `monitor_job.sh`
Monitor an active job's progress in real-time.

```bash
chmod +x monitor_job.sh
./monitor_job.sh <job_id>
```

## 🔐 Environment Variables

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql+asyncpg://user:pass@localhost:5432/videogen` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379/0` |
| `GEMINI_API_KEY` | Google Gemini API key | `your-api-key` |
| `GCS_BUCKET` | GCS bucket for videos | `your-bucket-name` |
| `JWT_SECRET` | Secret for JWT signing | `your-secret-key` |
| `VEO_MODEL` | Veo model version | `veo-3.1-generate-preview` |

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000` |

## 🎬 Video Generation Specs

- **Resolutions**: 720p
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Duration**: 4-8 seconds per generation
- **Extensions**: Up to 20 per video chain
- **Models**: Standard (higher quality) or Fast (quicker generation)

## 📄 License

This project was created for a hackathon. Check with the team for licensing details.