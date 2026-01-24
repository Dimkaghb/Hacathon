# Image Upload Display Issue - Root Cause & Fix

## Problem Description

Images upload successfully to Google Cloud Storage (GCS) but fail to display in the frontend canvas. The browser blocks the image requests due to CORS policy.

## Root Cause

When the frontend tries to display an image using `<img src="https://storage.googleapis.com/...">`, the browser makes a **cross-origin request** to Google's storage servers. Without proper CORS configuration on the GCS bucket, the browser's security policy blocks these requests.

### Current Flow:
```
1. ✅ User uploads image via ImageNode component
2. ✅ Frontend sends image to backend /api/files/upload-direct
3. ✅ Backend uploads to GCS bucket (ravenai-bucket)
4. ✅ Backend generates signed URL (valid for 1 year)
5. ✅ Backend returns signed URL to frontend
6. ✅ Frontend stores URL in node.data.image_url
7. ❌ Browser tries to load image from storage.googleapis.com
8. ❌ CORS check fails → Image blocked
```

## Solution: Configure CORS on GCS Bucket

You need to configure CORS on your GCS bucket to allow the frontend domain to access images.

### Option 1: Using the Setup Script (Recommended)

I've created a Python script to configure CORS automatically:

```bash
cd backend
python setup_cors.py
```

This will:
- Configure CORS for `http://localhost:3000` and `http://localhost:8000`
- Allow GET, HEAD, and OPTIONS methods
- Set appropriate cache headers

### Option 2: Using gsutil Command

1. Create a `cors.json` file:

```json
[
  {
    "origin": ["http://localhost:3000", "http://localhost:8000", "https://yourdomain.com"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
```

2. Apply CORS configuration:

```bash
gsutil cors set cors.json gs://ravenai-bucket
```

3. Verify configuration:

```bash
gsutil cors get gs://ravenai-bucket
```

### Option 3: Using Google Cloud Console

1. Go to [Cloud Storage Browser](https://console.cloud.google.com/storage/browser)
2. Click on your bucket: `ravenai-bucket`
3. Click **Configuration** tab
4. Under **CORS**, click **Edit**
5. Add the following configuration:

```json
[
  {
    "origin": ["http://localhost:3000"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
```

## Testing the Fix

After configuring CORS, test the setup:

```bash
cd backend
python test_storage.py
```

This script will:
1. ✅ Check bucket access
2. ✅ Verify IAM permissions
3. ✅ Test file upload
4. ✅ Test signed URL generation
5. ✅ Verify CORS configuration
6. ✅ Clean up test files

## Additional Checks

### 1. Service Account Permissions

Your service account needs these roles:
- **Storage Admin** (or Storage Object Admin) - for uploading files
- **Service Account Token Creator** - for generating signed URLs

To add the Token Creator role:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  YOUR_SERVICE_ACCOUNT@raven-462512.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator
```

### 2. Bucket Permissions

Make sure your bucket has public access enabled for signed URLs:

```bash
gsutil iam ch allUsers:objectViewer gs://ravenai-bucket
```

Or configure it in Cloud Console:
1. Go to bucket → **Permissions**
2. Grant `Storage Object Viewer` to `allUsers` (for signed URLs to work)

## Expected Behavior After Fix

1. User uploads image ✅
2. Image appears in the canvas immediately ✅
3. Green checkmark shows "Uploaded successfully" ✅
4. Image persists after page refresh ✅
5. Image is accessible to all users with the signed URL ✅

## Troubleshooting

### Image still not showing after CORS fix?

1. **Clear browser cache**: Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

2. **Check browser console**: Look for CORS errors
   ```
   Access to image at 'https://storage.googleapis.com/...' from origin 
   'http://localhost:3000' has been blocked by CORS policy
   ```

3. **Verify CORS is applied**:
   ```bash
   gsutil cors get gs://ravenai-bucket
   ```

4. **Check signed URL is valid**: Copy the image URL and open in a new tab
   - If you see "SignatureDoesNotMatch", your service account lacks signing permissions
   - If you see "AccessDenied", check bucket IAM permissions

5. **Test storage setup**:
   ```bash
   python test_storage.py
   ```

### Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `CORS policy: No 'Access-Control-Allow-Origin' header` | CORS not configured | Run `python setup_cors.py` |
| `SignatureDoesNotMatch` | Service account can't sign URLs | Add Token Creator role |
| `AccessDenied` | Bucket permissions issue | Check IAM permissions |
| `Failed to fetch` | Network/backend down | Check backend is running |

## Production Deployment

When deploying to production, update the CORS origins:

```json
{
  "origin": [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  "method": ["GET", "HEAD"],
  "responseHeader": ["Content-Type"],
  "maxAgeSeconds": 3600
}
```

And apply:

```bash
gsutil cors set cors-production.json gs://ravenai-bucket
```

## Files Modified/Created

- ✅ `backend/setup_cors.py` - Script to configure CORS
- ✅ `backend/test_storage.py` - Script to test storage setup
- ✅ `IMAGE_UPLOAD_FIX.md` - This documentation

## References

- [GCS CORS Documentation](https://cloud.google.com/storage/docs/cross-origin)
- [Signed URLs Documentation](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Service Account Permissions](https://cloud.google.com/iam/docs/service-accounts)
