#!/bin/bash
set -e

echo "============================================================"
echo "VIDEO GENERATION & EXTENSION FLOW TEST"
echo "============================================================"
echo ""

BASE_URL="http://localhost:8000"
EMAIL="user@example.com"
PASSWORD="password123"

# Step 1: Login or Register
echo "1. Authenticating..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || \
  curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
echo "✓ Authenticated successfully"
echo ""

# Step 2: Create Project
echo "2. Creating project..."
PROJECT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Video Extension Test","description":"Testing video generation and extension"}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created project (ID: $PROJECT_ID)"
echo ""

# Step 3: Create Video Node
echo "3. Creating video node..."
NODE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/$PROJECT_ID/nodes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"video","position":{"x":100,"y":100},"data":{"prompt":"sunset over ocean"}}')

NODE_ID=$(echo $NODE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created video node (ID: $NODE_ID)"
echo ""

# Step 4: Generate Video
echo "4. Generating video..."
echo "⏳ This will take 1-3 minutes..."
JOB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/generate-video" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"node_id\":\"$NODE_ID\",\"prompt\":\"A beautiful sunset over the ocean with gentle waves, cinematic quality\",\"resolution\":\"720p\",\"aspect_ratio\":\"16:9\",\"duration\":4,\"num_videos\":1,\"use_fast_model\":false}")

JOB_ID=$(echo $JOB_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['job_id'])")
echo "  Started generation job: $JOB_ID"

# Poll for completion
MAX_WAIT=360
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))

  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['status'])")
  PROGRESS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('progress', 0))" 2>/dev/null || echo "0")

  if [ "$STATUS" = "completed" ]; then
    VIDEO_URL=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['result']['video_url'])")
    echo "✓ Video generated successfully!"
    echo "  Video URL: $VIDEO_URL"
    break
  elif [ "$STATUS" = "failed" ]; then
    ERROR=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))")
    echo "✗ Video generation failed: $ERROR"
    exit 1
  else
    echo "  Progress: ${PROGRESS}% - $STATUS"
  fi
done

if [ -z "$VIDEO_URL" ]; then
  echo "✗ Video generation timed out"
  exit 1
fi

echo ""

# Step 5: Create Extension Node
echo "5. Creating extension node..."
EXT_NODE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/projects/$PROJECT_ID/nodes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"video","position":{"x":300,"y":100},"data":{"prompt":"continued ocean waves"}}')

EXT_NODE_ID=$(echo $EXT_NODE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created extension node (ID: $EXT_NODE_ID)"
echo ""

# Step 6: Extend Video
echo "6. Extending video..."
echo "⏳ This will take 1-3 minutes..."
EXT_JOB_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/extend-video" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"node_id\":\"$EXT_NODE_ID\",\"video_url\":\"$VIDEO_URL\",\"prompt\":\"Continue with more ocean waves rolling onto the beach at sunset\",\"extension_count\":1}")

EXT_JOB_ID=$(echo $EXT_JOB_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['job_id'])")
echo "  Started extension job: $EXT_JOB_ID"

# Poll for completion
ELAPSED=0
EXTENDED_URL=""
while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep 5
  ELAPSED=$((ELAPSED + 5))

  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/jobs/$EXT_JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['status'])")
  PROGRESS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('progress', 0))" 2>/dev/null || echo "0")

  if [ "$STATUS" = "completed" ]; then
    EXTENDED_URL=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['result']['video_url'])")
    echo "✓ Video extended successfully!"
    echo "  Extended video URL: $EXTENDED_URL"
    break
  elif [ "$STATUS" = "failed" ]; then
    ERROR=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))")
    echo "✗ Video extension failed: $ERROR"
    echo ""
    echo "This error indicates the fix may not have worked."
    echo "Please check the backend logs for more details."
    exit 1
  else
    echo "  Progress: ${PROGRESS}% - $STATUS"
  fi
done

if [ -z "$EXTENDED_URL" ]; then
  echo "✗ Video extension timed out"
  exit 1
fi

echo ""
echo "============================================================"
echo "✓ FULL FLOW COMPLETED SUCCESSFULLY!"
echo "============================================================"
echo ""
echo "Original video: $VIDEO_URL"
echo "Extended video: $EXTENDED_URL"
echo ""
echo "The encoding error has been fixed! ✨"
