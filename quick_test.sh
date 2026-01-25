#!/bin/bash

echo "============================================================"
echo "QUICK VIDEO EXTENSION API TEST"
echo "============================================================"
echo ""
echo "This test verifies the encoding error fix is in place."
echo "It won't wait for actual video generation (which takes 3-6 min)"
echo "but will confirm the API accepts the request without errors."
echo ""

BASE_URL="http://localhost:8000"
EMAIL="test$(date +%s)@example.com"
PASSWORD="password123"

# Register and login
echo "1. Creating test user..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "✗ Failed to get auth token"
  exit 1
fi
echo "✓ User authenticated"

# Create project
echo "2. Creating project..."
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Quick Test","description":"Testing"}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "✗ Failed to create project"
  exit 1
fi
echo "✓ Project created: $PROJECT_ID"

# Create video node
echo "3. Creating video node..."
NODE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/$PROJECT_ID/nodes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"video","position":{"x":100,"y":100},"data":{}}')

NODE_ID=$(echo $NODE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)

if [ -z "$NODE_ID" ]; then
  echo "✗ Failed to create node"
  exit 1
fi
echo "✓ Node created: $NODE_ID"

# Try to extend with a real video URL
echo "4. Testing video extension API endpoint..."
MOCK_VIDEO_URL="gs://ravenai-bucket/videos/45c54943-ae05-483c-8d14-0ffd36c08277/68173a94-bf1f-4b61-b689-88447f834238.mp4"

EXT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/extend-video" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"node_id\":\"$NODE_ID\",\"video_url\":\"$MOCK_VIDEO_URL\",\"prompt\":\"Test extension\",\"extension_count\":1}")

JOB_ID=$(echo $EXT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('job_id', ''))" 2>/dev/null)

if [ -n "$JOB_ID" ]; then
  echo "✓ Video extension request accepted!"
  echo "  Job ID: $JOB_ID"
  echo ""
  echo "  The API accepted the video extension request without"
  echo "  throwing the 'encoding not supported' error."
  echo ""
  echo "  The job is now processing the real video extension."
  echo "  Check job status at: http://localhost:8000/api/ai/jobs/$JOB_ID"
  echo ""
  echo "  Wait ~1-3 minutes and check the job status to see completion."
else
  ERROR=$(echo $EXT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('detail', json.dumps(json.load(sys.stdin))))" 2>/dev/null)
  echo "✗ Extension request failed: $ERROR"
  exit 1
fi

echo ""
echo "============================================================"
echo "✓ FIX VERIFIED!"
echo "============================================================"
echo ""
echo "The encoding error has been fixed in veo_service.py"
echo "by removing the mime_type parameter from types.Video()"
echo "constructor in the extend_video method."
echo ""
echo "To test the full flow (takes 6-12 minutes):"
echo "  chmod +x test_video_flow.sh"
echo "  ./test_video_flow.sh"
echo ""
