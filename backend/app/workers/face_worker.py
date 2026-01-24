"""
Face Analysis Worker

Handles async face analysis jobs with:
- Comprehensive face feature extraction
- Visual embedding generation for character consistency
- Vector database storage for similarity search
"""
import logging
from typing import Dict, Any
from uuid import UUID
from sqlalchemy import select

from app.workers.base import BaseWorker
from app.services.face_service import face_service
from app.core.database import AsyncSessionLocal
from app.models.character import Character

logger = logging.getLogger(__name__)


class FaceAnalysisWorker(BaseWorker):
    """Worker for processing face analysis jobs with visual embeddings."""

    def __init__(self):
        super().__init__(job_type="face_analysis")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a face analysis job.

        Steps:
        1. Analyze the face image for features
        2. Extract visual embeddings for similarity
        3. Store in vector database
        4. Update character with metadata and video prompt description
        """
        node_id = job_data["node_id"]
        character_id = job_data["character_id"]
        project_id = job_data["project_id"]
        image_url = job_data["image_url"]

        logger.info(f"Processing face analysis for character {character_id}")

        # Step 1: Broadcast progress
        await self.broadcast_progress(
            project_id, node_id, 10, "processing", "Analyzing face features..."
        )

        # Step 2: Store character embedding (this does analysis + embedding in parallel)
        try:
            result = await face_service.store_character_embedding(
                character_id=character_id,
                image_url=image_url,
                metadata={"project_id": project_id},
            )
        except Exception as e:
            logger.error(f"Face analysis failed: {e}")
            raise Exception(f"Failed to analyze face: {str(e)}")

        embedding_id = result["embedding_id"]
        analysis = result["analysis"]
        video_prompt_description = result.get("video_prompt_description", "")

        await self.broadcast_progress(
            project_id, node_id, 70, "processing", "Saving character data..."
        )

        # Step 3: Update character in database with analysis results
        async with AsyncSessionLocal() as db:
            db_result = await db.execute(
                select(Character).where(Character.id == UUID(character_id))
            )
            character = db_result.scalar_one_or_none()

            if character:
                character.embedding_id = embedding_id
                character.analysis_data = {
                    **character.analysis_data,
                    **analysis,
                    "video_prompt_description": video_prompt_description,
                }
                await db.commit()
                logger.info(f"Updated character {character_id} with analysis data")

        await self.broadcast_progress(
            project_id, node_id, 100, "completed", "Face analysis complete"
        )

        return {
            "character_id": character_id,
            "embedding_id": embedding_id,
            "analysis": analysis,
            "video_prompt_description": video_prompt_description,
        }


# Singleton instance
face_worker = FaceAnalysisWorker()
