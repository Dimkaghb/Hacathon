import asyncio
from typing import Optional, List
from google import genai

from app.config import settings
from app.schemas.ai import PromptEnhanceResponse


class PromptService:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return self._client

    async def enhance_prompt(
        self,
        prompt: str,
        style: Optional[str] = None,
        mood: Optional[str] = None,
    ) -> PromptEnhanceResponse:
        """
        Enhance a video generation prompt using AI.

        Args:
            prompt: Original user prompt
            style: Optional style preference (cinematic, animated, realistic, etc.)
            mood: Optional mood preference (dramatic, peaceful, energetic, etc.)

        Returns:
            Enhanced prompt with suggestions
        """
        style_instruction = f"Style: {style}" if style else ""
        mood_instruction = f"Mood: {mood}" if mood else ""

        system_prompt = f"""You are an expert at writing prompts for AI video generation using Google Veo.

Your task is to enhance the user's prompt to create better video generation results.

Guidelines:
1. Add specific visual details (lighting, camera angles, movements)
2. Include temporal descriptions (how the scene progresses)
3. Specify the style and mood if not already present
4. Add environmental details
5. Keep it concise but descriptive (under 200 words)
6. Avoid text, watermarks, or logos in descriptions

{style_instruction}
{mood_instruction}

Return your response in this exact format:
ENHANCED_PROMPT: [your enhanced prompt]
SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]
- [suggestion 3]"""

        loop = asyncio.get_event_loop()

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    {"role": "user", "parts": [{"text": system_prompt}]},
                    {"role": "user", "parts": [{"text": f"Original prompt: {prompt}"}]},
                ],
            ),
        )

        response_text = response.text

        # Parse the response
        enhanced_prompt = prompt  # Default to original if parsing fails
        suggestions = []

        if "ENHANCED_PROMPT:" in response_text:
            parts = response_text.split("ENHANCED_PROMPT:")
            if len(parts) > 1:
                rest = parts[1]
                if "SUGGESTIONS:" in rest:
                    enhanced_prompt = rest.split("SUGGESTIONS:")[0].strip()
                    suggestions_text = rest.split("SUGGESTIONS:")[1]
                    # Extract bullet points
                    for line in suggestions_text.split("\n"):
                        line = line.strip()
                        if line.startswith("-"):
                            suggestions.append(line[1:].strip())
                else:
                    enhanced_prompt = rest.strip()

        return PromptEnhanceResponse(
            original_prompt=prompt,
            enhanced_prompt=enhanced_prompt,
            suggestions=suggestions[:5],  # Limit to 5 suggestions
        )

    async def generate_prompt_variations(
        self,
        prompt: str,
        count: int = 3,
    ) -> List[str]:
        """
        Generate variations of a prompt.

        Args:
            prompt: Original prompt
            count: Number of variations to generate

        Returns:
            List of prompt variations
        """
        system_prompt = f"""Generate {count} creative variations of the following video prompt.
Each variation should:
1. Maintain the core concept
2. Offer a different visual interpretation
3. Vary in style, mood, or perspective

Return exactly {count} variations, one per line, prefixed with numbers (1., 2., etc.)"""

        loop = asyncio.get_event_loop()

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    {"role": "user", "parts": [{"text": system_prompt}]},
                    {"role": "user", "parts": [{"text": f"Original prompt: {prompt}"}]},
                ],
            ),
        )

        response_text = response.text
        variations = []

        for line in response_text.split("\n"):
            line = line.strip()
            # Remove numbering prefixes
            if line and line[0].isdigit():
                # Find where the number ends
                for i, char in enumerate(line):
                    if char in ".)" or (i > 0 and not char.isdigit()):
                        variations.append(line[i + 1:].strip())
                        break

        return variations[:count]

    async def analyze_prompt(self, prompt: str) -> dict:
        """
        Analyze a prompt for potential issues or improvements.

        Args:
            prompt: Prompt to analyze

        Returns:
            Analysis results
        """
        system_prompt = """Analyze this video generation prompt and provide feedback:

1. Clarity score (1-10): How clear and specific is the prompt?
2. Visual richness (1-10): How many visual details are included?
3. Potential issues: List any problems (vague terms, conflicting instructions, etc.)
4. Missing elements: What could be added to improve it?

Return as JSON with keys: clarity_score, visual_richness, issues, missing_elements"""

        loop = asyncio.get_event_loop()

        response = await loop.run_in_executor(
            None,
            lambda: self.client.models.generate_content(
                model="gemini-2.0-flash",
                contents=[
                    {"role": "user", "parts": [{"text": system_prompt}]},
                    {"role": "user", "parts": [{"text": f"Prompt: {prompt}"}]},
                ],
            ),
        )

        response_text = response.text

        # Try to parse JSON
        import json
        import re

        json_match = re.search(r"\{[^{}]*\}", response_text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass

        return {"raw_analysis": response_text}


def build_product_context(product_data: dict) -> str:
    """Convert structured product data into prompt-friendly text."""
    parts = []
    if product_data.get("product_name"):
        parts.append(f"The product featured is {product_data['product_name']}")
    if product_data.get("brand"):
        parts.append(f"by {product_data['brand']}")
    if product_data.get("benefits"):
        parts.append(f"Key benefits: {', '.join(product_data['benefits'])}")
    if product_data.get("tone"):
        parts.append(f"The tone should be {product_data['tone']}")
    if product_data.get("target_audience"):
        parts.append(f"Target audience: {product_data['target_audience']}")
    return ". ".join(parts) + "." if parts else ""


def build_setting_context(setting_data: dict) -> str:
    """Convert structured setting data into prompt-friendly text."""
    parts = []
    if setting_data.get("location"):
        parts.append(f"Setting: {setting_data['location']}")
    if setting_data.get("lighting"):
        parts.append(f"Lighting: {setting_data['lighting'].replace('-', ' ')}")
    if setting_data.get("camera_angle"):
        parts.append(f"Camera: {setting_data['camera_angle'].replace('-', ' ')}")
    if setting_data.get("vibe"):
        parts.append(f"Visual vibe: {setting_data['vibe'].replace('-', ' ')}")
    if setting_data.get("custom_details"):
        parts.append(setting_data["custom_details"])
    return ". ".join(parts) if parts else ""


def format_performance(performance_style: dict) -> str:
    """Convert performance style dict into prompt text."""
    parts = []
    if performance_style.get("gestures"):
        parts.append(f"Gestures: {performance_style['gestures']}")
    if performance_style.get("camera_behavior"):
        parts.append(f"Camera behavior: {performance_style['camera_behavior']}")
    if performance_style.get("pacing"):
        parts.append(f"Pacing: {performance_style['pacing']}")
    if performance_style.get("mannerisms"):
        parts.append(f"Mannerisms: {performance_style['mannerisms']}")
    return ". ".join(parts) if parts else ""


prompt_service = PromptService()
