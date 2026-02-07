# Thumbnail System Debug Guide

## How Thumbnails Work

1. **Automatic Capture**: When you add/remove nodes in the canvas, a screenshot is automatically captured after 2 seconds of inactivity
2. **Upload**: The screenshot is uploaded to Google Cloud Storage (GCS)
3. **Database**: The signed URL is stored in the `projects.thumbnail_url` column
4. **Display**: Dashboard shows the thumbnail image or "No preview" placeholder

## Manual Testing

### Test Thumbnail Capture

1. Open a project in `/main`
2. Open browser DevTools Console (F12)
3. Add some nodes to the canvas (drag from bottom dock)
4. Wait 2 seconds, watch for logs:
   ```
   [Thumbnail] Node count changed: 3 render: 2
   [Thumbnail] Scheduling capture in 2 seconds...
   [Thumbnail] Attempting capture, nodes: 3 capturing: false
   [Thumbnail] Generating blob...
   [Thumbnail] Blob generated, size: 12345 bytes
   [Thumbnail] Uploading screenshot for project: abc-123
   [Thumbnail] Upload successful: https://storage.googleapis.com/...
   ```

### Manual Trigger (If Automatic Fails)

In browser console:
```javascript
// Trigger thumbnail capture manually
window.captureThumbnail()
```

### Check Upload Request

In DevTools Network tab, look for:
```
POST /api/projects/{project-id}/thumbnail
Status: 200
Response: { thumbnail_url: "https://storage.googleapis.com/..." }
```

## Troubleshooting

### No logs appearing

**Problem**: No `[Thumbnail]` logs in console

**Solutions**:
- Verify you're on `/main?project=xxx` page (not dashboard)
- Check that nodes exist on canvas
- Try manual trigger: `window.captureThumbnail()`

### "Blob generation failed"

**Problem**: `toBlob()` returns null

**Solutions**:
- Check for CORS errors in console
- Verify `.react-flow__viewport` element exists
- Try refreshing the page

### Upload fails with 401

**Problem**: `POST /api/projects/{id}/thumbnail` returns 401

**Solutions**:
- You're not logged in - go to `/login`
- Token expired - logout and login again
- Check localStorage has `access_token`

### Upload succeeds but dashboard shows "No preview"

**Problem**: Upload works but image doesn't display

**Possible causes**:
1. **GCS Signed URL expired** (after 7 days)
   - Solution: Recapture thumbnail
   - Check: URL should have `X-Goog-Expires` param

2. **GCS Permissions issue**
   - Check backend logs for GCS errors
   - Verify service account has `storage.objects.create` permission

3. **Database not updated**
   - Check: `docker exec videogen-postgres psql -U postgres -d videogen -c "SELECT id, name, thumbnail_url FROM projects;"`
   - URL should be populated

4. **CORS issue**
   - GCS bucket needs CORS configuration
   - Check browser console for CORS errors

### Test GCS Upload Directly

In backend container:
```bash
docker exec videogen-api python3 << 'EOF'
import asyncio
from app.services.storage_service import storage_service

async def test():
    url = await storage_service.upload_file(
        file_data=b"test",
        object_name="thumbnails/test/test.txt",
        content_type="text/plain"
    )
    print("Success:", url)

asyncio.run(test())
EOF
```

### Check Database

```bash
docker exec videogen-postgres psql -U postgres -d videogen -c "SELECT id, name, thumbnail_url FROM projects ORDER BY updated_at DESC LIMIT 5;"
```

Expected output:
- `thumbnail_url` should be a long URL starting with `https://storage.googleapis.com/ravenai-bucket/thumbnails/...`

### Check GCS Bucket

List files in bucket:
```bash
docker exec videogen-api python3 << 'EOF'
from google.cloud import storage
client = storage.Client(project='raven')
bucket = client.bucket('ravenai-bucket')
blobs = list(bucket.list_blobs(prefix='thumbnails/', max_results=10))
print(f"Found {len(blobs)} thumbnails:")
for blob in blobs:
    print(f"  - {blob.name} ({blob.size} bytes)")
EOF
```

## Configuration

### Backend (.env)

Required variables:
```bash
GOOGLE_CLOUD_PROJECT=raven
GOOGLE_APPLICATION_CREDENTIALS=raven-462512-c0a4374b2c63.json
GCS_BUCKET=ravenai-bucket
```

### GCS Bucket CORS (if needed)

If browser can't load images due to CORS:

```bash
gsutil cors set cors.json gs://ravenai-bucket
```

**cors.json:**
```json
[
  {
    "origin": ["http://localhost:3000", "https://tryaxel.app"],
    "method": ["GET"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

## Architecture

### Frontend Flow
```
ReactFlowCanvas (canvas page)
  └─ ScreenshotCapture component
     ├─ Monitors node count changes
     ├─ Debounces 2 seconds
     ├─ Uses html-to-image/toBlob to capture .react-flow__viewport
     ├─ Calls projectsApi.uploadThumbnail(projectId, blob)
     └─ Logs success/failure

Dashboard
  └─ Displays project.thumbnail_url or <EmptyThumbnail />
```

### Backend Flow
```
POST /api/projects/{id}/thumbnail
  ├─ Accepts multipart/form-data file
  ├─ Validates image/* content type
  ├─ Generates path: thumbnails/{user_id}/{project_id}/{uuid}.png
  ├─ Calls storage_service.upload_file()
  │   ├─ Uploads to GCS
  │   └─ Returns signed URL (valid 7 days)
  ├─ Updates project.thumbnail_url in database
  └─ Returns { thumbnail_url }
```

### Storage Service
```
storage_service.upload_file()
  ├─ Creates GCS blob
  ├─ Uploads bytes with content_type
  ├─ Generates signed URL (v4, 7 day expiry)
  └─ Returns URL
```

## Current Issues

1. ✅ Synthetic node visualization removed
2. ✅ Screenshot capture implemented
3. ✅ Backend endpoint working
4. ⚠️ **Not tested end-to-end** - Need to verify:
   - Blob generation works in browser
   - Upload reaches backend
   - GCS upload succeeds
   - URL stored in database
   - Dashboard displays image

## Next Steps

1. Open `/main` and add nodes
2. Watch console for `[Thumbnail]` logs
3. Check Network tab for upload request
4. Verify database has URL
5. Go to `/dashboard` and see thumbnail
6. If fails, use manual trigger: `window.captureThumbnail()`
