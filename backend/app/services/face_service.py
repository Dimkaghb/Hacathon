"""
Face Analysis and Embedding Service

Uses InsightFace (ArcFace) for real 512-dim face embeddings stored in Qdrant.
Gemini Vision is still used for text descriptions injected into prompts.
"""
import asyncio
import logging
import os
import threading
from typing import Optional, Dict, Any, List

import httpx
import numpy as np

from app.config import settings
from app.services.storage_service import storage_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)

# ── InsightFace singleton (one per process, thread-safe init) ────────────────
_face_app = None
_face_app_lock = threading.Lock()


def _get_face_app():
    """Lazy-load InsightFace FaceAnalysis model (buffalo_l = det + ArcFace)."""
    global _face_app
    if _face_app is None:
        with _face_app_lock:
            if _face_app is None:
                try:
                    import insightface
                    from insightface.app import FaceAnalysis

                    os.environ.setdefault("INSIGHTFACE_HOME", settings.INSIGHTFACE_HOME)
                    os.makedirs(settings.INSIGHTFACE_HOME, exist_ok=True)

                    app = FaceAnalysis(
                        name="buffalo_l",
                        root=settings.INSIGHTFACE_HOME,
                        providers=["CPUExecutionProvider"],
                    )
                    app.prepare(ctx_id=-1, det_size=(640, 640))
                    _face_app = app
                    logger.info("InsightFace buffalo_l loaded (512-dim ArcFace embeddings)")
                except Exception as e:
                    logger.error(f"Failed to load InsightFace: {e}")
                    raise
    return _face_app


def _extract_embedding_sync(image_bytes: bytes) -> Optional[List[float]]:
    """
    Extract 512-dim ArcFace embedding from image bytes.
    Returns None if no face detected.
    Runs synchronously — call via run_in_executor.
    """
    import cv2

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image bytes")

    app = _get_face_app()
    faces = app.get(img)

    if not faces:
        return None

    # Use the largest detected face (most prominent)
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    # ArcFace embedding is already L2-normalized (unit vector)
    embedding = face.embedding  # numpy array, shape (512,)
    return embedding.tolist()


class FaceService:
    """Face analysis and embedding service for character consistency."""

    async def _load_image(self, image_url: str) -> bytes:
        """Load image from URL or GCS."""
        if image_url.startswith("gs://"):
            return await storage_service.download_file(image_url)
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(image_url)
            response.raise_for_status()
            return response.content

    async def extract_face_embedding(self, image_url: str) -> Optional[List[float]]:
        """
        Extract 512-dim InsightFace ArcFace embedding from an image.

        Returns None if no face is detected (caller decides how to handle).
        """
        image_bytes = await self._load_image(image_url)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _extract_embedding_sync, image_bytes)

    async def analyze_face(self, image_url: str) -> Dict[str, Any]:
        """
        Analyze a face image with Gemini Vision for a detailed text description.
        Used for prompt injection to guide Veo generation.
        """
        from google import genai
        from google.genai import types

        image_bytes = await self._load_image(image_url)
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        loop = asyncio.get_event_loop()

        prompt = """Analyze this face image in detail for video generation character consistency.

Provide a comprehensive analysis in JSON format with these exact keys:

{
    "demographics": {
        "age_range": "estimated age range like '25-30'",
        "gender_presentation": "masculine/feminine/androgynous",
        "ethnicity_appearance": "general ethnic appearance"
    },
    "facial_structure": {
        "face_shape": "oval/round/square/heart/oblong",
        "jawline": "description",
        "cheekbones": "prominent/subtle/average",
        "forehead": "high/average/low"
    },
    "features": {
        "eye_color": "specific color",
        "eye_shape": "almond/round/hooded/monolid",
        "eyebrows": "thick/thin/arched/straight",
        "nose_type": "description",
        "lip_shape": "thin/full/medium"
    },
    "hair": {
        "color": "specific color including highlights",
        "style": "description of style",
        "length": "short/medium/long",
        "texture": "straight/wavy/curly/coily"
    },
    "skin": {
        "tone": "fair/light/medium/olive/tan/dark/deep",
        "notable_features": "freckles, moles, scars, etc."
    },
    "facial_hair": {
        "present": true,
        "type": "beard/stubble/mustache/goatee/none",
        "style": "description if present"
    },
    "distinctive_features": ["list of unique identifying features"],
    "video_prompt_description": "A single paragraph describing this person for video generation, focusing on their most distinctive and consistent features"
}

Return ONLY valid JSON, no additional text."""

        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Content(
                        parts=[
                            types.Part(inline_data=types.Blob(
                                mime_type="image/jpeg",
                                data=image_bytes,
                            )),
                            types.Part(text=prompt),
                        ]
                    )
                ],
            ),
        )

        import json, re
        analysis_text = response.text

        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", analysis_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        try:
            start = analysis_text.find('{')
            end = analysis_text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(analysis_text[start:end])
        except json.JSONDecodeError:
            pass

        logger.warning("Failed to parse face analysis JSON, returning raw text")
        return {"raw_analysis": analysis_text, "video_prompt_description": analysis_text[:500]}

    async def store_character_embedding(
        self,
        character_id: str,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extract InsightFace ArcFace embedding + Gemini text analysis,
        store both in Qdrant. Returns embedding_id and analysis.
        """
        logger.info(f"Processing character {character_id} from {image_url}")

        # Run embedding extraction and text analysis in parallel
        embedding_task = asyncio.create_task(self.extract_face_embedding(image_url))
        analysis_task = asyncio.create_task(self.analyze_face(image_url))
        embedding, analysis = await asyncio.gather(embedding_task, analysis_task)

        if embedding is None:
            logger.warning(f"No face detected in {image_url}, falling back to zero vector")
            embedding = [0.0] * 512

        full_metadata = {
            "character_id": character_id,
            "image_url": image_url,
            "embedding_type": "insightface_arcface_512",
            "video_prompt_description": analysis.get("video_prompt_description", ""),
            **(metadata or {}),
            **{k: v for k, v in analysis.items() if k != "video_prompt_description"},
        }

        embedding_id = await vector_service.upsert_embedding(
            id=character_id,
            vector=embedding,
            metadata=full_metadata,
        )

        logger.info(f"Stored character {character_id} with 512-dim ArcFace embedding")

        return {
            "embedding_id": embedding_id,
            "analysis": analysis,
            "video_prompt_description": analysis.get("video_prompt_description", ""),
        }

    async def get_character_description(self, character_id: str) -> Optional[str]:
        """Get the stored Gemini text description for a character (for prompt injection)."""
        embedding_data = await vector_service.get_embedding(character_id)
        if embedding_data and embedding_data.get("metadata"):
            return embedding_data["metadata"].get("video_prompt_description")
        return None

    async def find_similar_characters(
        self,
        image_url: str,
        limit: int = 5,
        score_threshold: float = 0.75,
    ) -> List[Dict[str, Any]]:
        """
        Find similar characters using ArcFace embedding similarity.
        This is a genuine face-similarity search (512-dim cosine distance).
        """
        embedding = await self.extract_face_embedding(image_url)
        if embedding is None:
            return []

        return await vector_service.search_similar(
            vector=embedding,
            limit=limit,
            score_threshold=score_threshold,
        )

    async def verify_same_person(
        self,
        image_url_1: str,
        image_url_2: str,
        threshold: float = 0.5,  # ArcFace cosine similarity threshold (lower = stricter)
    ) -> Dict[str, Any]:
        """
        Verify if two images show the same person using ArcFace embeddings.
        ArcFace cosine similarity > 0.5 is typically considered a match.
        """
        emb1_task = asyncio.create_task(self.extract_face_embedding(image_url_1))
        emb2_task = asyncio.create_task(self.extract_face_embedding(image_url_2))
        emb1, emb2 = await asyncio.gather(emb1_task, emb2_task)

        if emb1 is None or emb2 is None:
            return {"is_match": False, "similarity_score": 0.0, "error": "No face detected"}

        v1, v2 = np.array(emb1), np.array(emb2)
        # Explicitly normalize — InsightFace returns unnormalized ArcFace features;
        # Qdrant handles this internally but we must do it ourselves here
        v1 = v1 / (np.linalg.norm(v1) + 1e-8)
        v2 = v2 / (np.linalg.norm(v2) + 1e-8)
        similarity = float(np.dot(v1, v2))
        is_match = similarity >= threshold

        return {
            "is_match": is_match,
            "similarity_score": similarity,
            "threshold_used": threshold,
        }

    def build_character_prompt_suffix(self, analysis: Dict[str, Any]) -> str:
        """Build a prompt suffix from face analysis for Veo prompt injection."""
        if "video_prompt_description" in analysis:
            return analysis["video_prompt_description"]

        parts = []
        if "demographics" in analysis:
            demo = analysis["demographics"]
            age = demo.get("age_range", "")
            gender = demo.get("gender_presentation", "")
            if age and gender:
                parts.append(f"{age} year old {gender} person")

        if "features" in analysis:
            eye_color = analysis["features"].get("eye_color", "")
            if eye_color:
                parts.append(f"with {eye_color} eyes")

        if "hair" in analysis:
            hair = analysis["hair"]
            color = hair.get("color", "")
            length = hair.get("length", "")
            style = hair.get("style", "")
            if color:
                parts.append(f"{length} {color} {style} hair".strip())

        if "skin" in analysis:
            tone = analysis["skin"].get("tone", "")
            if tone:
                parts.append(f"{tone} skin tone")

        if "distinctive_features" in analysis and analysis["distinctive_features"]:
            parts.append(f"notable: {', '.join(analysis['distinctive_features'][:3])}")

        return "; ".join(parts) if parts else ""

    # Keep old name as alias for backwards compatibility with face_tasks
    async def extract_visual_embedding(self, image_url: str) -> List[float]:
        result = await self.extract_face_embedding(image_url)
        return result if result is not None else [0.0] * 512


face_service = FaceService()
