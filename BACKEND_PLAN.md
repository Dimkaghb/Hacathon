# Backend Architecture Plan for Node-Based Video Generation Platform

## Overview
This document outlines the backend architecture for a "Figma + n8n" style video generation platform. The system is designed to handle complex workflows involving image analysis, consistent character generation, prompt enhancement, and video generation/extension using a node-based interface.

## Core Design Principles
1.  **Node-Based Orchestration:** The backend treats user interactions as a graph of dependencies. Execution is event-driven.
2.  **Asynchronous Processing:** All AI operations (face analysis, video generation) are background jobs.
3.  **State Persistence:** Every node state, connection, and asset is persisted to allow session resumption and history.
4.  **Consistency:** Character consistency is enforced via shared embedding vectors.

## System Components

### 1. API Gateway & Application Server
*   **Technology:** Python (FastAPI) or Node.js (Express/NestJS). Python is preferred for AI integration.
*   **Role:** Handles HTTP/WebSocket requests from the frontend. Manages project state (CRUD nodes, connections).
*   **Endpoints:**
    *   `/projects`: Manage canvas sessions.
    *   `/nodes`: Create, update, delete nodes.
    *   `/connections`: Link nodes.
    *   `/jobs`: Monitor task status.
    *   `/assets`: Upload/Download media.

### 2. Task Orchestration (The "n8n" Engine)
*   **Technology:** Celery (with Redis/RabbitMQ) or Temporal.io.
*   **Role:** Manages the execution flow. When a user triggers "Generate", the orchestrator traverses the graph backwards from the target node to resolve dependencies.
*   **Workflow:**
    1.  User clicks "Generate" on a Video Node.
    2.  System checks inputs (Image Node, Prompt Node).
    3.  If inputs are not ready, trigger their respective tasks.
    4.  Once inputs are ready, schedule the Video Generation task.

### 3. AI Service Layer (Microservices)
Each major AI function should be an isolated service or worker type to allow independent scaling.

*   **Face Analysis Service:**
    *   **Input:** User uploaded image.
    *   **Model:** InsightFace, FaceNet, or proprietary API.
    *   **Output:** Face Embedding Vector (stored in Vector DB), Facial features metadata (expression, age, gender).
    *   **Action:** Stores vector with a `character_id`.

*   **Prompt Engineering Service:**
    *   **Input:** Raw user text, optional image context.
    *   **Model:** LLM (GPT-4, Claude 3, Llama 3).
    *   **Action:** Refines prompts for specific video models (e.g., adding "cinematic lighting, 8k" keywords).

*   **Video Generation Service:**
    *   **Input:** Prompt, Face Embedding/Reference Image.
    *   **Model:** Google Veo 3.1 (as requested), Stable Video Diffusion, or others.
    *   **Action:** Generates video. Checks for `character_id` to inject face embeddings (IP-Adapter style) for consistency.

*   **Video Extension Service:**
    *   **Input:** Last frame of existing video + Prompt.
    *   **Action:** Generates continuation video.

### 4. Data Storage Layer
*   **Relational DB (PostgreSQL):** Stores User data, Project graphs (Nodes/Edges JSON structure), Job history.
*   **Vector DB (Qdrant / Pinecone):**
    *   **Collection:** `characters`
    *   **Payload:** `{ user_id, project_id, embedding_vector, source_image_url }`
    *   **Usage:** When generating video, query this DB to get the consistent face representation.
*   **Object Storage (AWS S3 / MinIO):** Stores raw images, generated videos, and thumbnails.

## Detailed Data Flow

### Scenario: Image -> Prompt -> Video

1.  **Image Node:**
    *   User uploads `face.jpg`.
    *   **Backend:** Uploads to S3. Triggers `FaceAnalysisTask`.
    *   **Result:** `face_embedding` saved to Qdrant. Node status updated to "Ready".

2.  **Prompt Node:**
    *   User types "A warrior standing on a mountain".
    *   **Backend:** Saves text. (Optional) Triggers `PromptEnhanceTask`.
    *   **Result:** Node stores "Cinematic shot of a warrior...".

3.  **Video Node:**
    *   User connects Image Node and Prompt Node to Video Node.
    *   User clicks "Generate".
    *   **Backend:**
        1.  Retrieves `face_embedding` from Image Node context.
        2.  Retrieves `enhanced_prompt` from Prompt Node.
        3.  Dispatches `VideoGenerationTask` with these inputs.
    *   **Worker:** Calls Video Model API.
    *   **Completion:** Webhook updates Node status with `video_url`.

4.  **Extension (Video Node 2):**
    *   User pulls connection from Video Node 1 to Video Node 2.
    *   **Backend:** Extracts last frame of Video 1 (or keeps it cached).
    *   **Task:** `ImageToVideoTask` using the last frame as the starting point.

## API Schema Concepts (Draft)

```json
// Node Structure
{
  "id": "node_123",
  "type": "video_generation",
  "position": { "x": 100, "y": 200 },
  "inputs": {
    "image": "node_abc_output", // Reference to Image Node
    "prompt": "node_xyz_output" // Reference to Prompt Node
  },
  "parameters": {
    "aspect_ratio": "16:9",
    "duration": 5
  },
  "status": "processing", // idle, processing, completed, error
  "output": {
    "video_url": "s3://..."
  }
}
```

## Security & Best Practices
*   **Presigned URLs:** Use S3 presigned URLs for uploads/downloads to avoid routing heavy traffic through the API server.
*   **Rate Limiting:** Per-user limits on GPU-heavy tasks.
*   **WebSocket:** Real-time updates for progress bars on the nodes.

