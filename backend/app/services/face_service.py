import asyncio
import httpx
from typing import Optional, Dict, Any, List
from google import genai

from app.config import settings
from app.services.storage_service import storage_service
from app.services.vector_service import vector_service


class FaceService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def _load_image(self, image_url: str) -> bytes:
        """Load image from URL or GCS"""
        if image_url.startswith("gs://"):
            return await storage_service.download_file(image_url)
        else:
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url)
                response.raise_for_status()
                return response.content

    async def analyze_face(self, image_url: str) -> Dict[str, Any]:
        """
        Analyze a face image and extract features.

        Args:
            image_url: URL of the face image

        Returns:
            Dict containing facial analysis data
        """
        image_bytes = await self._load_image(image_url)

        # Use Gemini for face analysis
        loop = asyncio.get_event_loop()

        prompt = """Analyze this face image and provide:
1. Estimated age range
2. Gender presentation
3. Key facial features (hair color, eye color, skin tone, facial hair if any)
4. Expression/mood
5. Any distinctive features

Return as JSON with keys: age_range, gender, hair_color, eye_color, skin_tone, facial_hair, expression, distinctive_features"""

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}},
                    prompt,
                ],
            ),
        )

        # Parse the response
        analysis_text = response.text

        # Try to extract JSON from response
        import json
        import re

        # Find JSON in response
        json_match = re.search(r"\{[^{}]*\}", analysis_text, re.DOTALL)
        if json_match:
            try:
                analysis = json.loads(json_match.group())
            except json.JSONDecodeError:
                analysis = {"raw_analysis": analysis_text}
        else:
            analysis = {"raw_analysis": analysis_text}

        return analysis

    async def extract_embedding(self, image_url: str) -> List[float]:
        """
        Extract face embedding vector for similarity search.

        Args:
            image_url: URL of the face image

        Returns:
            Embedding vector (list of floats)
        """
        image_bytes = await self._load_image(image_url)

        # Use Gemini's embedding model
        loop = asyncio.get_event_loop()

        # Note: In production, you'd use a dedicated face embedding model
        # For now, we use text embedding of the face description
        analysis = await self.analyze_face(image_url)
        description = str(analysis)

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.embed_content(
                model="text-embedding-004",
                contents=description,
            ),
        )

        return response.embeddings[0].values

    async def store_face_embedding(
        self,
        character_id: str,
        image_url: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Extract and store face embedding in vector database.

        Args:
            character_id: Unique ID for the character
            image_url: URL of the face image
            metadata: Additional metadata to store

        Returns:
            Embedding ID in vector database
        """
        # Extract embedding
        embedding = await self.extract_embedding(image_url)

        # Analyze face for metadata
        analysis = await self.analyze_face(image_url)

        # Combine metadata
        full_metadata = {
            "character_id": character_id,
            "image_url": image_url,
            **(metadata or {}),
            **analysis,
        }

        # Store in Qdrant
        embedding_id = await vector_service.upsert_embedding(
            id=character_id,
            vector=embedding,
            metadata=full_metadata,
        )

        return embedding_id

    async def find_similar_faces(
        self,
        image_url: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Find similar faces in the vector database.

        Args:
            image_url: URL of the query image
            limit: Maximum number of results

        Returns:
            List of similar faces with scores and metadata
        """
        embedding = await self.extract_embedding(image_url)

        results = await vector_service.search_similar(
            vector=embedding,
            limit=limit,
        )

        return results


face_service = FaceService()
