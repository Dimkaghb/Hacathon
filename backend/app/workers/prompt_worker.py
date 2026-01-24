import logging
from typing import Dict, Any

from app.workers.base import BaseWorker
from app.services.prompt_service import prompt_service

logger = logging.getLogger(__name__)


class PromptEnhancementWorker(BaseWorker):
    """Worker for processing prompt enhancement jobs."""

    def __init__(self):
        super().__init__(job_type="prompt_enhancement")

    async def process(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a prompt enhancement job.

        Steps:
        1. Enhance the prompt using AI
        2. Generate variations if requested
        3. Return enhanced prompt and suggestions
        """
        node_id = job_data["node_id"]
        project_id = job_data["project_id"]
        prompt = job_data["prompt"]
        style = job_data.get("style")
        mood = job_data.get("mood")
        generate_variations = job_data.get("generate_variations", False)

        # Step 1: Broadcast progress
        await self.broadcast_progress(
            project_id, node_id, 10, "processing", "Enhancing prompt..."
        )

        # Step 2: Enhance prompt
        enhanced = await prompt_service.enhance_prompt(
            prompt=prompt,
            style=style,
            mood=mood,
        )

        await self.broadcast_progress(
            project_id, node_id, 50, "processing", "Generating suggestions..."
        )

        # Step 3: Generate variations if requested
        variations = []
        if generate_variations:
            variations = await prompt_service.generate_prompt_variations(
                prompt=enhanced.enhanced_prompt,
                count=3,
            )

        await self.broadcast_progress(
            project_id, node_id, 100, "completed", "Enhancement complete"
        )

        return {
            "original_prompt": prompt,
            "enhanced_prompt": enhanced.enhanced_prompt,
            "suggestions": enhanced.suggestions,
            "variations": variations,
        }


prompt_worker = PromptEnhancementWorker()
