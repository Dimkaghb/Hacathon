#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: $0 <job_id>"
  echo "Example: $0 92e4ec7e-e8eb-4ce2-a1b8-99ce5eb285c4"
  exit 1
fi

JOB_ID=$1
BASE_URL="http://localhost:8000"

# Get token for user@example.com
EMAIL="user@example.com"
PASSWORD="password123"

TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null)

TOKEN=$(echo $TOKEN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate. Using most recent test user..."
  # Try to get from the latest registration
  exit 1
fi

echo "Monitoring job: $JOB_ID"
echo "Press Ctrl+C to stop monitoring"
echo ""

MAX_WAIT=360
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/ai/jobs/$JOB_ID" \
    -H "Authorization: Bearer $TOKEN")

  STATUS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null)
  PROGRESS=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('progress', 0))" 2>/dev/null)

  TIMESTAMP=$(date "+%H:%M:%S")

  if [ "$STATUS" = "completed" ]; then
    echo "[$TIMESTAMP] ✓ JOB COMPLETED!"
    echo ""
    VIDEO_URL=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('result', {}).get('video_url', 'N/A'))" 2>/dev/null)
    echo "Extended video URL: $VIDEO_URL"
    echo ""
    echo "Full response:"
    echo $STATUS_RESPONSE | python3 -m json.tool
    exit 0
  elif [ "$STATUS" = "failed" ]; then
    echo "[$TIMESTAMP] ✗ JOB FAILED"
    echo ""
    ERROR=$(echo $STATUS_RESPONSE | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))" 2>/dev/null)
    echo "Error: $ERROR"
    echo ""
    echo "Full response:"
    echo $STATUS_RESPONSE | python3 -m json.tool
    exit 1
  else
    echo "[$TIMESTAMP] Progress: ${PROGRESS}% - Status: $STATUS"
  fi

  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

echo ""
echo "Monitoring timed out after ${MAX_WAIT} seconds"
