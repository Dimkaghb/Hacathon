#!/bin/bash
# Download InsightFace models if not already present.
# Run this on first deployment or after wiping the models volume.

MODELS_DIR="${INSIGHTFACE_HOME:-/models/insightface}/models"
INSWAPPER_PATH="$MODELS_DIR/inswapper_128.onnx"
INSWAPPER_URL="https://github.com/deepinsight/insightface/releases/download/v0.7/inswapper_128.onnx"
INSWAPPER_SIZE=554196256  # 529 MB expected

mkdir -p "$MODELS_DIR"

# ── inswapper_128.onnx ─────────────────────────────────────────────────────
if [ -f "$INSWAPPER_PATH" ] && [ "$(stat -c%s "$INSWAPPER_PATH" 2>/dev/null || stat -f%z "$INSWAPPER_PATH" 2>/dev/null)" -ge "$INSWAPPER_SIZE" ]; then
    echo "[models] inswapper_128.onnx already present, skipping download."
else
    echo "[models] Downloading inswapper_128.onnx (~529 MB)..."
    curl -L --retry 3 --retry-delay 5 -o "$INSWAPPER_PATH" "$INSWAPPER_URL"
    if [ $? -eq 0 ]; then
        echo "[models] inswapper_128.onnx downloaded successfully."
    else
        echo "[models] WARNING: inswapper_128.onnx download failed. Face swap will be skipped." >&2
        rm -f "$INSWAPPER_PATH"
    fi
fi

# ── buffalo_l (auto-downloaded by InsightFace on first use) ───────────────
BUFFALO_DIR="$MODELS_DIR/buffalo_l"
if [ -d "$BUFFALO_DIR" ] && [ "$(ls -A "$BUFFALO_DIR" 2>/dev/null | wc -l)" -ge 4 ]; then
    echo "[models] buffalo_l already present, skipping download."
else
    echo "[models] Pre-downloading buffalo_l (face detection + ArcFace)..."
    python -c "
import os, sys
os.environ['INSIGHTFACE_HOME'] = os.environ.get('INSIGHTFACE_HOME', '/models/insightface')
try:
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name='buffalo_l', root=os.environ['INSIGHTFACE_HOME'], providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    print('[models] buffalo_l downloaded and ready.')
except Exception as e:
    print(f'[models] WARNING: buffalo_l download failed: {e}', file=sys.stderr)
"
fi

echo "[models] Model setup complete."
