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
    """Worker for processing face analysis jobs."""

    def __init__(self):
        super().__init__(job_type="face_analysis")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a face analysis job.

        Steps:
        1. Analyze the face image
        2. Extract embeddings
        3. Store in vector database
        4. Update character with metadata
        """
        node_id = job_data["node_id"]
        character_id = job_data["character_id"]
        project_id = job_data["project_id"]
        image_url = job_data["image_url"]

        # Step 1: Broadcast progress
        await self.broadcast_progress(
            project_id, node_id, 10, "processing", "Analyzing face..."
        )

        # Step 2: Analyze face
        analysis = await face_service.analyze_face(image_url)

        await self.broadcast_progress(
            project_id, node_id, 40, "processing", "Extracting features..."
        )

        # Step 3: Store embedding
        embedding_id = await face_service.store_face_embedding(
            character_id=character_id,
            image_url=image_url,
            metadata={"project_id": project_id},
        )

        await self.broadcast_progress(
            project_id, node_id, 70, "processing", "Saving character..."
        )

        # Step 4: Update character in database
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Character).where(Character.id == UUID(character_id))
            )
            character = result.scalar_one_or_none()

            if character:
                character.embedding_id = embedding_id
                character.metadata = {**character.metadata, **analysis}
                await db.commit()

        await self.broadcast_progress(
            project_id, node_id, 100, "completed", "Analysis complete"
        )

        return {
            "character_id": character_id,
            "embedding_id": embedding_id,
            "analysis": analysis,
        }


face_worker = FaceAnalysisWorker()
