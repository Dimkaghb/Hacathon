# Video Generation API Fix

## Problem
The `google-genai` SDK version 0.5.0 doesn't include the `generate_videos()` method, causing the error:
```
AttributeError: 'Models' object has no attribute 'generate_videos'
```

## Solution

### 1. SDK Upgrade
Updated `requirements.txt` to use `google-genai>=1.0.0` which should include video generation support.

### 2. REST API Fallback
Implemented a REST API fallback that works with the current SDK version (0.5.0) until the container is rebuilt with the new SDK version.

### Changes Made

#### `backend/requirements.txt`
- Changed `google-genai==0.5.0` to `google-genai>=1.0.0`

#### `backend/app/services/veo_service.py`
- Added check for `generate_videos` method existence
- If method exists (SDK >= 1.0.0), use SDK method
- If method doesn't exist, fallback to REST API
- Implemented `_generate_video_rest_api()` method
- Implemented `_poll_operation_rest_api()` method
- Added comprehensive error handling and logging

## API Endpoint

The REST API endpoint used is:
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateVideos
```

With headers:
- `Content-Type: application/json`
- `x-goog-api-key: {GEMINI_API_KEY}`

## Request Payload Format

```json
{
  "prompt": "Your video description",
  "config": {
    "resolution": "1080p",
    "aspect_ratio": "16:9",
    "duration_seconds": "8",
    "negative_prompt": "optional"
  }
}
```

## Response Format

The API returns an operation object with a `name` field:
```json
{
  "name": "operations/...",
  "done": false,
  ...
}
```

## Next Steps

1. **Rebuild Docker containers** to get the updated SDK version:
   ```bash
   cd backend
   docker-compose build worker-video
   docker-compose up -d worker-video
   ```

2. **Test video generation** - The code will automatically:
   - Try to use SDK method if available (after rebuild)
   - Fallback to REST API if SDK method doesn't exist (current state)

3. **Monitor logs** for any API errors or issues

## Error Handling

The implementation includes:
- Detailed error messages with HTTP status codes
- Full response logging for debugging
- Proper operation ID format handling
- Timeout handling (60s for generation, 30s for polling)

## Testing

After rebuilding, test with:
1. Create a prompt node with text
2. Connect it to a video node
3. Click "Generate Video"
4. Check logs for progress and any errors
