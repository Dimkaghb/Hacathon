# Video Generation Flow - Verification & Fixes

## Overview

This document describes the complete video generation flow from frontend to backend, including persistence and preview functionality.

## Flow Diagram

```
Frontend (User clicks Generate)
    ↓
POST /api/ai/generate-video
    ↓
Backend creates Job (status: PENDING)
    ↓
Job enqueued to Redis
    ↓
Worker picks up job from Redis
    ↓
Worker processes job:
  - Calls Veo API
  - Polls for completion
  - Downloads video
  - Uploads to GCS
  - Returns signed URL
    ↓
Worker updates:
  - Job.status = COMPLETED
  - Job.result = {video_url, ...}
  - Node.status = COMPLETED
  - Node.data = {video_url, ...}
    ↓
Frontend polls job status
    ↓
Frontend displays video preview
```

## Critical Bug Fixed

### Issue: Job ID Mismatch
**Problem**: The `enqueue()` method was generating a NEW UUID instead of using the job_id from the database, causing job tracking issues.

**Fix**: Updated `enqueue()` to use the existing `job_id` from `job_data`:
```python
# Before (WRONG):
job_id = str(uuid.uuid4())  # Generated new ID
job_data["job_id"] = job_id

# After (CORRECT):
job_id = job_data.get("job_id")  # Use existing ID from DB
if not job_id:
    raise ValueError("job_data must contain 'job_id'")
```

## Persistence Verification

### ✅ Database Persistence
1. **Job Persistence**:
   - Job created in database with `status = PENDING`
   - Job ID stored in database
   - Job data stored in `Job.result` (JSON column)
   - Persists even if user leaves page

2. **Node Data Persistence**:
   - Worker calls `update_node_status()` which merges result into `node.data`
   - `video_url` stored in `node.data.video_url` (JSON column)
   - Node status updated to `COMPLETED`
   - All data persists in PostgreSQL

3. **Data Loading**:
   - Frontend loads all nodes on page load via `nodesApi.list(projectId)`
   - All node data, including `video_url`, loaded from database
   - Connections also loaded and restored

### ✅ Resume Polling on Page Reload
1. **Auto-Resume Logic**:
   - On page load, checks for nodes with `status === 'processing'`
   - Fetches latest job via `/api/ai/nodes/{node_id}/jobs/latest`
   - Resumes polling if job is still `processing` or `pending`
   - Updates node status if job completed while user was away

2. **New API Endpoint**:
   - `GET /api/ai/nodes/{node_id}/jobs/latest`
   - Returns the most recent job for a node
   - Used to resume polling after page reload

### ✅ Video Preview
1. **Embedded Video Player**:
   - `<video>` element with controls
   - Shows video directly in the node
   - Includes "Open in new tab" link
   - Handles signed URLs from GCS

2. **Smart Display**:
   - Shows video if `video_url` exists, regardless of status
   - Handles GCS URIs with warning message
   - Video preview works when loaded from database

## Frontend Processing

### Video Generation Request
```typescript
// Frontend calls:
aiApi.generateVideo({
  node_id: nodeId,
  prompt: prompt,  // From connected prompt node
  image_url: imageUrl,  // From connected image node (optional)
  resolution: '1080p',
  duration: 8,
  aspect_ratio: '16:9',
})
```

### Polling Mechanism
- Starts polling 2 seconds after job creation
- Polls every 3 seconds while job is processing
- Stops when job is `completed` or `failed`
- Handles errors gracefully (404 = job not found, others = retry with longer interval)

### Status Updates
- `PENDING` → Job created, waiting for worker
- `PROCESSING` → Worker is processing
- `COMPLETED` → Video ready, `video_url` available
- `FAILED` → Error occurred, `error_message` available

## Backend Processing

### Job Creation
1. Verify node exists and user has access
2. Update node status to `PROCESSING`
3. Create `Job` record with `status = PENDING`
4. Enqueue job to Redis with all parameters
5. Return `JobStatusResponse` with `job_id`

### Worker Processing
1. Worker dequeues job from Redis
2. Updates job status to `PROCESSING`
3. Calls Veo API to start generation
4. Polls Veo operation until complete
5. Downloads generated video
6. Uploads to GCS storage
7. Updates job with `status = COMPLETED`, `result = {video_url, ...}`
8. Updates node with `status = COMPLETED`, `data = {video_url, ...}`

## Storage

### Video Storage
- Videos uploaded to Google Cloud Storage
- Stored at path: `videos/{project_id}/{video_id}.mp4`
- Returns signed download URL (valid for 1 year)
- URL can be used directly in `<video>` tags

## Error Handling

### Frontend
- Network errors: Clear message about backend connection
- Job not found (404): Stop polling, reset node to idle
- Other errors: Continue polling with longer interval (10s)

### Backend
- Job failures: Stored in `Job.error` and `Node.error_message`
- Worker errors: Logged and job marked as `FAILED`
- Timeout handling: Job fails after max poll time

## Worker Requirements

**IMPORTANT**: The video worker must be running for jobs to be processed!

### Running Workers

**Option 1: Docker Compose**
```bash
docker-compose up worker-video
```

**Option 2: Manual**
```bash
cd backend
python -m app.workers.runner --type video_generation
```

**Option 3: All Workers**
```bash
python -m app.workers.runner --type all
```

## Verification Checklist

- [ ] Worker is running (check logs for "Starting video_generation worker")
- [ ] Redis is accessible
- [ ] Database connection working
- [ ] GCS credentials configured (for video storage)
- [ ] Veo API key configured (GEMINI_API_KEY)
- [ ] Jobs are being dequeued from Redis
- [ ] Job status updates are being saved to database
- [ ] Frontend polling is working
- [ ] Video URLs are being generated correctly
- [ ] Video preview displays when loaded from database

## Testing

1. **Test Persistence**:
   - Generate a video
   - Wait for it to complete
   - Refresh the page
   - Verify video still displays

2. **Test Resume Polling**:
   - Start video generation
   - Refresh page while it's processing
   - Verify polling resumes and completes

3. **Test Preview**:
   - Generate a video
   - Verify video player appears in node
   - Click play to verify video loads
   - Test "Open in new tab" link

## Known Issues & Solutions

### Issue: Job stays in PENDING status
**Solution**: Ensure worker is running:
```bash
docker-compose up worker-video
# or
python -m app.workers.runner --type video_generation
```

### Issue: Video URL is GCS URI (gs://...)
**Solution**: Fixed - `upload_file()` now returns signed URL instead of GCS URI

### Issue: Job ID mismatch
**Solution**: Fixed - `enqueue()` now uses existing job_id from database
