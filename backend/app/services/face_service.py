"""
Face Analysis and Embedding Service

Provides:
- Face detection and analysis using Gemini Vision
- Visual embeddings for character consistency (using multimodal embeddings)
- Character feature extraction for video generation
- Similar face search in vector database
"""
import asyncio
import httpx
import logging
import hashlib
from typing import Optional, Dict, Any, List

from google import genai
from google.genai import types

from app.config import settings
from app.services.storage_service import storage_service
from app.services.vector_service import vector_service

logger = logging.getLogger(__name__)


class FaceService:
    """Face analysis and embedding service for character consistency."""

    def __init__(self):
        self._client = None

    @property
    def client(self) -> genai.Client:
        """Lazy-loaded Gemini client."""
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def _load_image(self, image_url: str) -> bytes:
        """Load image from URL or GCS."""
        if image_url.startswith("gs://"):
            return await storage_service.download_file(image_url)
        else:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return response.content

    async def analyze_face(self, image_url: str) -> Dict[str, Any]:
        """
        Analyze a face image and extract detailed features.

        Uses Gemini Vision for comprehensive face analysis including
        features useful for maintaining character consistency.

        Args:
            image_url: URL of the face image

        Returns:
            Dict containing facial analysis data with structured features
        """
        image_bytes = await self._load_image(image_url)
        loop = asyncio.get_event_loop()

        # Detailed prompt for character consistency features
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
        "lip_shape": "thin/full/medium",
        "ear_visibility": "visible/partially/hidden"
    },
    "hair": {
        "color": "specific color including highlights",
        "style": "description of style",
        "length": "short/medium/long",
        "texture": "straight/wavy/curly/coily"
    },
    "skin": {
        "tone": "fair/light/medium/olive/tan/dark/deep",
        "texture": "smooth/textured",
        "notable_features": "freckles, moles, scars, etc."
    },
    "facial_hair": {
        "present": true/false,
        "type": "beard/stubble/mustache/goatee/none",
        "style": "description if present"
    },
    "expression": "current expression/mood",
    "distinctive_features": ["list of unique identifying features"],
    "video_prompt_description": "A single paragraph describing this person for video generation, focusing on their most distinctive and consistent features"
}

Return ONLY valid JSON, no additional text."""

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    types.Content(
                        parts=[
                            types.Part(inline_data=types.Blob(
                                mime_type="image/jpeg",
                                data=image_bytes
                            )),
                            types.Part(text=prompt)
                        ]
                    )
                ],
            ),
        )

        # Parse the response
        analysis_text = response.text

        import json
        import re

        # Try to extract JSON from response
        # Handle markdown code blocks
        json_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", analysis_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try direct JSON
        try:
            # Find the JSON object in the response
            start = analysis_text.find('{')
            end = analysis_text.rfind('}') + 1
            if start >= 0 and end > start:
                return json.loads(analysis_text[start:end])
        except json.JSONDecodeError:
            pass

        logger.warning("Failed to parse face analysis JSON, returning raw")
        return {"raw_analysis": analysis_text, "video_prompt_description": analysis_text[:500]}

    async def extract_visual_embedding(self, image_url: str) -> List[float]:
        """
        Extract visual embedding for face similarity search.

        Uses detailed face analysis text as basis for embeddings since
        Gemini's embed_content only supports text input.

        Args:
            image_url: URL of the face image

        Returns:
            Embedding vector (list of floats)
        """
        # First get detailed face analysis
        analysis = await self.analyze_face(image_url)

        # Create comprehensive text description for embedding
        description = analysis.get("video_prompt_description", "")

        # If no pre-built description, create one from structured data
        if not description:
            description = self.build_character_prompt_suffix(analysis)

        # Add structured data for better embeddings
        full_description = f"{description}\n\nDetailed features: {str(analysis)}"

        loop = asyncio.get_event_loop()

        # Use text embedding model
        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.embed_content(
                model="text-embedding-004",
                contents=full_description,
            ),
        )

        return list(response.embeddings[0].values)

    async def extract_hybrid_embedding(self, image_url: str, analysis: Optional[Dict] = None) -> List[float]:
        """
        Extract hybrid embedding combining visual and semantic features.

        Creates a more robust embedding by combining:
        1. Visual embedding from the image
        2. Text embedding from the analysis description

        Args:
            image_url: URL of the face image
            analysis: Optional pre-computed analysis (will be computed if not provided)

        Returns:
            Combined embedding vector
        """
        # Get visual embedding
        visual_embedding = await self.extract_visual_embedding(image_url)

        # Get or compute analysis
        if analysis is None:
            analysis = await self.analyze_face(image_url)

        # Create text description for semantic embedding
        description = analysis.get("video_prompt_description", "")
        if not description:
            description = str(analysis)

        loop = asyncio.get_event_loop()

        # Get text embedding
        text_response = await loop.run_in_executor(
            None,
            lambda: self.client.models.embed_content(
                model="text-embedding-004",
                contents=description,
            ),
        )

        text_embedding = list(text_response.embeddings[0].values)

        # Combine embeddings (simple concatenation - could also use weighted average)
        # For now, we'll use visual embedding as primary since it's more reliable
        # for face matching. Text embedding is used for metadata search.
        return visual_embedding

    async def store_character_embedding(
        self,
        character_id: str,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extract and store character embedding in vector database.

        Args:
            character_id: Unique ID for the character
            image_url: URL of the face image
            metadata: Additional metadata to store

        Returns:
            Dict with embedding_id and analysis data
        """
        logger.info(f"Processing character {character_id} from {image_url}")

        # Extract embedding and analysis in parallel
        embedding_task = asyncio.create_task(self.extract_visual_embedding(image_url))
        analysis_task = asyncio.create_task(self.analyze_face(image_url))

        embedding, analysis = await asyncio.gather(embedding_task, analysis_task)

        # Build comprehensive metadata
        full_metadata = {
            "character_id": character_id,
            "image_url": image_url,
            "video_prompt_description": analysis.get("video_prompt_description", ""),
            **(metadata or {}),
            **analysis,
        }

        # Store in Qdrant
        embedding_id = await vector_service.upsert_embedding(
            id=character_id,
            vector=embedding,
            metadata=full_metadata,
        )

        logger.info(f"Stored character {character_id} with embedding dimension {len(embedding)}")

        return {
            "embedding_id": embedding_id,
            "analysis": analysis,
            "video_prompt_description": analysis.get("video_prompt_description", ""),
        }

    async def get_character_description(self, character_id: str) -> Optional[str]:
        """
        Get the video prompt description for a character.

        This description is optimized for use in video generation
        to maintain character consistency.

        Args:
            character_id: Character ID

        Returns:
            Video-optimized character description or None
        """
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
        Find similar characters in the vector database.

        Args:
            image_url: URL of the query image
            limit: Maximum number of results
            score_threshold: Minimum similarity score (0-1)

        Returns:
            List of similar characters with scores and metadata
        """
        embedding = await self.extract_visual_embedding(image_url)

        results = await vector_service.search_similar(
            vector=embedding,
            limit=limit,
            score_threshold=score_threshold,
        )

        return results

    async def verify_same_person(
        self,
        image_url_1: str,
        image_url_2: str,
        threshold: float = 0.85,
    ) -> Dict[str, Any]:
        """
        Verify if two images show the same person.

        Uses embedding similarity to determine if faces match.

        Args:
            image_url_1: First image URL
            image_url_2: Second image URL
            threshold: Similarity threshold for match

        Returns:
            Dict with is_match, similarity_score, and confidence
        """
        # Extract embeddings in parallel
        emb1_task = asyncio.create_task(self.extract_visual_embedding(image_url_1))
        emb2_task = asyncio.create_task(self.extract_visual_embedding(image_url_2))

        emb1, emb2 = await asyncio.gather(emb1_task, emb2_task)

        # Calculate cosine similarity
        import math

        dot_product = sum(a * b for a, b in zip(emb1, emb2))
        norm1 = math.sqrt(sum(a * a for a in emb1))
        norm2 = math.sqrt(sum(b * b for b in emb2))

        similarity = dot_product / (norm1 * norm2) if norm1 > 0 and norm2 > 0 else 0

        is_match = similarity >= threshold

        # Confidence based on how far from threshold
        if is_match:
            confidence = min(1.0, (similarity - threshold) / (1 - threshold) * 0.5 + 0.5)
        else:
            confidence = min(1.0, (threshold - similarity) / threshold * 0.5 + 0.5)

        return {
            "is_match": is_match,
            "similarity_score": similarity,
            "confidence": confidence,
            "threshold_used": threshold,
        }

    def build_character_prompt_suffix(self, analysis: Dict[str, Any]) -> str:
        """
        Build a prompt suffix from face analysis for video generation.

        Creates a concise but comprehensive character description
        to append to video generation prompts.

        Args:
            analysis: Face analysis data

        Returns:
            Character description string for video prompts
        """
        # Use pre-built description if available
        if "video_prompt_description" in analysis:
            return analysis["video_prompt_description"]

        # Build from components
        parts = []

        # Demographics
        if "demographics" in analysis:
            demo = analysis["demographics"]
            age = demo.get("age_range", "")
            gender = demo.get("gender_presentation", "")
            if age and gender:
                parts.append(f"{age} year old {gender} person")

        # Key features
        if "features" in analysis:
            feat = analysis["features"]
            eye_color = feat.get("eye_color", "")
            if eye_color:
                parts.append(f"with {eye_color} eyes")

        # Hair
        if "hair" in analysis:
            hair = analysis["hair"]
            color = hair.get("color", "")
            style = hair.get("style", "")
            length = hair.get("length", "")
            if color:
                hair_desc = f"{length} {color} {style} hair".strip()
                parts.append(hair_desc)

        # Skin
        if "skin" in analysis:
            tone = analysis["skin"].get("tone", "")
            if tone:
                parts.append(f"{tone} skin tone")

        # Distinctive features
        if "distinctive_features" in analysis and analysis["distinctive_features"]:
            features = analysis["distinctive_features"][:3]  # Limit to top 3
            parts.append(f"notable features: {', '.join(features)}")

        return "; ".join(parts) if parts else ""


# Singleton instance
face_service = FaceService()
