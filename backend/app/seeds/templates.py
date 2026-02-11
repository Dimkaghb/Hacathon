"""
Seed system templates.

Run: python -m app.seeds.templates
"""
import asyncio
import uuid
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.template import Template


SYSTEM_TEMPLATES = [
    # ── 1. Product Testimonial (4 scenes) ─────────────────────────────────
    {
        "name": "Product Testimonial",
        "description": "A 4-scene testimonial format: hook your audience, present the problem, reveal your product as the solution, and close with a strong CTA.",
        "category": "testimonial",
        "scene_count": 4,
        "estimated_duration": "20-30s",
        "best_for": ["product reviews", "skincare", "health & wellness", "SaaS demos"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "Curiosity Hook",
                        "scene_category": "hook",
                        "scene_tone": "intriguing",
                        "scene_duration": 4,
                        "prompt_template": "Close-up shot of {character} looking directly at camera with an intrigued expression, dramatic pause, cinematic lighting, shallow depth of field.",
                        "script_text": "You won't believe the difference {product_name} made for me...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Problem",
                    "required": True,
                    "data": {
                        "scene_name": "Problem Statement",
                        "scene_category": "body",
                        "scene_tone": "empathetic",
                        "scene_duration": 7,
                        "prompt_template": "Medium shot of {character} explaining a problem, expressive hand gestures, concerned expression, clean background, soft lighting.",
                        "script_text": "I used to struggle with {pain_point} every single day...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Solution",
                    "required": True,
                    "data": {
                        "scene_name": "Solution Reveal",
                        "scene_category": "body",
                        "scene_tone": "enthusiastic",
                        "scene_duration": 8,
                        "prompt_template": "Excited {character} revealing {product_name} to camera, bright lighting, clean product showcase, smooth camera movement.",
                        "script_text": "Then I found {product_name} and everything changed...",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} pointing down, friendly smile, clean background, bright lighting.",
                        "script_text": "Link in bio — you need to try {product_name}!",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 400, "y": -200},
                    "label": "Testimonial Character",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 800, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. GlowSerum"},
                {"key": "pain_point", "label": "Pain Point", "type": "text", "placeholder": "e.g. dry, flaky skin"},
            ],
        },
    },

    # ── 2. GRWM / Get Ready With Me (5 scenes) ───────────────────────────
    {
        "name": "GRWM / Get Ready With Me",
        "description": "A 5-scene Get Ready With Me format: hook viewers into your routine, walk through two key steps, show the lifestyle result, and close with a CTA.",
        "category": "grwm",
        "scene_count": 5,
        "estimated_duration": "30-45s",
        "best_for": ["beauty routines", "skincare", "fashion", "morning routines"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "POV Hook",
                        "scene_category": "hook",
                        "scene_tone": "relatable",
                        "scene_duration": 3,
                        "prompt_template": "POV shot, {character} in front of mirror, getting ready, warm lighting, intimate feel.",
                        "script_text": "Get ready with me using my favorite {product_name} routine...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Step 1",
                    "required": True,
                    "data": {
                        "scene_name": "GRWM / Routine",
                        "scene_category": "body",
                        "scene_tone": "casual",
                        "scene_duration": 8,
                        "prompt_template": "Mirror shot of {character} applying first step of routine, warm lighting, close-up on hands and product.",
                        "script_text": "First, I always start with...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Step 2",
                    "required": True,
                    "data": {
                        "scene_name": "GRWM / Routine",
                        "scene_category": "body",
                        "scene_tone": "casual",
                        "scene_duration": 8,
                        "prompt_template": "Close-up of {character} applying {product_name}, vanity angle, step-by-step process, warm lighting.",
                        "script_text": "Then I use {product_name} — this is the game changer...",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "Lifestyle",
                    "required": True,
                    "data": {
                        "scene_name": "Lifestyle Moment",
                        "scene_category": "body",
                        "scene_tone": "aspirational",
                        "scene_duration": 6,
                        "prompt_template": "Cinematic wide shot of {character} stepping out, golden hour lighting, confident walk, lifestyle b-roll feel.",
                        "script_text": "And now I'm ready to take on the day!",
                    },
                },
                {
                    "ref_id": "scene-5",
                    "type": "scene",
                    "position": {"x": 1600, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} pointing down, friendly smile, clean background, bright lighting.",
                        "script_text": "Shop my routine — link in bio!",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 600, "y": -200},
                    "label": "Creator",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 1000, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-4", "target": "scene-5", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. GlowSerum"},
            ],
        },
    },

    # ── 3. Before/After Transformation (3 scenes) ────────────────────────
    {
        "name": "Before/After Transformation",
        "description": "A punchy 3-scene format: hook with curiosity, reveal the dramatic before/after, and close with a CTA.",
        "category": "before-after",
        "scene_count": 3,
        "estimated_duration": "12-20s",
        "best_for": ["fitness transformations", "home renovation", "skincare results", "weight loss"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "Curiosity Hook",
                        "scene_category": "hook",
                        "scene_tone": "intriguing",
                        "scene_duration": 4,
                        "prompt_template": "Close-up shot of {character} looking directly at camera with a knowing smile, dramatic lighting, anticipation.",
                        "script_text": "Watch this transformation...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Before/After Reveal",
                    "required": True,
                    "data": {
                        "scene_name": "Before/After Reveal",
                        "scene_category": "body",
                        "scene_tone": "dramatic",
                        "scene_duration": 8,
                        "prompt_template": "Split-screen feel, {character} showing transformation result using {product_name}, dramatic reveal moment, impactful lighting transition.",
                        "script_text": "Before... and after just {time_period} with {product_name}!",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} pointing down, excited expression, clean background, bright lighting.",
                        "script_text": "Want the same results? Link in bio!",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 200, "y": -200},
                    "label": "Subject",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 600, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. FitPlan Pro"},
                {"key": "time_period", "label": "Time Period", "type": "text", "placeholder": "e.g. 30 days"},
            ],
        },
    },

    # ── 4. Unboxing (4 scenes) ────────────────────────────────────────────
    {
        "name": "Unboxing",
        "description": "A 4-scene unboxing format: build anticipation, showcase the product, demonstrate it in lifestyle context, and close with a CTA.",
        "category": "unboxing",
        "scene_count": 4,
        "estimated_duration": "20-30s",
        "best_for": ["tech gadgets", "subscription boxes", "fashion hauls", "gift reveals"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "Curiosity Hook",
                        "scene_category": "hook",
                        "scene_tone": "intriguing",
                        "scene_duration": 4,
                        "prompt_template": "Close-up of sealed package on table, {character} hands reaching to open it, dramatic lighting, anticipation building.",
                        "script_text": "Let's see what's inside this {product_name} package...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Product Reveal",
                    "required": True,
                    "data": {
                        "scene_name": "Product Demo",
                        "scene_category": "body",
                        "scene_tone": "enthusiastic",
                        "scene_duration": 8,
                        "prompt_template": "Close-up of {character} unboxing {product_name}, detailed hands pulling product out, well-lit showcase, excited reactions.",
                        "script_text": "Oh wow — the packaging is incredible! Look at this...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Lifestyle Demo",
                    "required": True,
                    "data": {
                        "scene_name": "Lifestyle Moment",
                        "scene_category": "body",
                        "scene_tone": "aspirational",
                        "scene_duration": 7,
                        "prompt_template": "Cinematic shot of {character} using {product_name} in real life, natural setting, golden hour lighting, lifestyle b-roll.",
                        "script_text": "And here's how it looks in action...",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "Offer / Discount",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 4,
                        "prompt_template": "Energetic {character} holding {product_name}, excited expression, text overlay space, dynamic framing.",
                        "script_text": "Use my code for a discount — link in bio!",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 400, "y": -200},
                    "label": "Unboxer",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 800, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. AirPods Max"},
            ],
        },
    },

    # ── 5. Problem → Agitate → Solve (4 scenes) ──────────────────────────
    {
        "name": "Problem → Agitate → Solve",
        "description": "Classic PAS copywriting framework as a 4-scene video: hook, present the problem, agitate it, then solve with your product.",
        "category": "problem-agitate-solve",
        "scene_count": 4,
        "estimated_duration": "20-30s",
        "best_for": ["SaaS products", "info products", "coaching", "health solutions"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "Relatable Hook",
                        "scene_category": "hook",
                        "scene_tone": "empathetic",
                        "scene_duration": 3,
                        "prompt_template": "Casual shot of {character} in everyday setting, frustrated expression, natural lighting, authentic vibe.",
                        "script_text": "Tired of {pain_point}? Same.",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Problem",
                    "required": True,
                    "data": {
                        "scene_name": "Problem Statement",
                        "scene_category": "body",
                        "scene_tone": "informative",
                        "scene_duration": 7,
                        "prompt_template": "Medium shot of {character} explaining the problem, concerned expression, expressive gestures, clean background.",
                        "script_text": "Here's the thing — {pain_point} affects everything...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Solution",
                    "required": True,
                    "data": {
                        "scene_name": "Solution Reveal",
                        "scene_category": "body",
                        "scene_tone": "enthusiastic",
                        "scene_duration": 8,
                        "prompt_template": "Excited {character} revealing {product_name} to camera, bright lighting, product showcase, energy shift from problem to solution.",
                        "script_text": "That's why I built {product_name}. It solves this in minutes.",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} speaking directly to camera, determined expression, clean background, bright lighting.",
                        "script_text": "Stop struggling. Link in bio to try {product_name} free.",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 400, "y": -200},
                    "label": "Presenter",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 800, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. TaskFlow AI"},
                {"key": "pain_point", "label": "Pain Point", "type": "text", "placeholder": "e.g. wasting hours on manual tasks"},
            ],
        },
    },

    # ── 6. Day in the Life (4 scenes) ─────────────────────────────────────
    {
        "name": "Day in the Life",
        "description": "A 4-scene vlog-style format: hook into your day, show lifestyle moments, naturally integrate your product, and close with a CTA.",
        "category": "tutorial",
        "scene_count": 4,
        "estimated_duration": "20-30s",
        "best_for": ["lifestyle brands", "fitness", "remote work", "daily vlogs"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "POV Hook",
                        "scene_category": "hook",
                        "scene_tone": "relatable",
                        "scene_duration": 3,
                        "prompt_template": "Morning POV shot, {character} waking up, natural morning light streaming in, alarm going off, authentic feel.",
                        "script_text": "A day in my life as a {role}...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Lifestyle",
                    "required": True,
                    "data": {
                        "scene_name": "Lifestyle Moment",
                        "scene_category": "body",
                        "scene_tone": "aspirational",
                        "scene_duration": 7,
                        "prompt_template": "Cinematic wide shot of {character} going about their day, golden hour lighting, aspirational setting, lifestyle b-roll.",
                        "script_text": "My mornings always start with...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Product Integration",
                    "required": True,
                    "data": {
                        "scene_name": "Product Demo",
                        "scene_category": "body",
                        "scene_tone": "casual",
                        "scene_duration": 8,
                        "prompt_template": "Medium shot of {character} naturally using {product_name} during their routine, soft lighting, authentic integration.",
                        "script_text": "One thing I can't live without is {product_name}...",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} in evening setting, relaxed smile, warm lighting, winding down.",
                        "script_text": "Try it yourself — link in bio!",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 400, "y": -200},
                    "label": "Creator",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 800, "y": -200},
                    "label": "Product",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. Morning Brew"},
                {"key": "role", "label": "Your Role", "type": "text", "placeholder": "e.g. content creator"},
            ],
        },
    },

    # ── 7. Tutorial / How-To (4 scenes) ───────────────────────────────────
    {
        "name": "Tutorial / How-To",
        "description": "A 4-scene instructional format: hook with the outcome, walk through two demo steps, and close with a CTA.",
        "category": "tutorial",
        "scene_count": 4,
        "estimated_duration": "20-30s",
        "best_for": ["how-to guides", "cooking recipes", "DIY projects", "tech tutorials"],
        "graph_definition": {
            "nodes": [
                {
                    "ref_id": "scene-1",
                    "type": "scene",
                    "position": {"x": 0, "y": 0},
                    "label": "Hook",
                    "required": True,
                    "data": {
                        "scene_name": "Social Proof Hook",
                        "scene_category": "hook",
                        "scene_tone": "authoritative",
                        "scene_duration": 4,
                        "prompt_template": "Confident {character} in professional setting, talking to camera, warm lighting, trustworthy atmosphere.",
                        "script_text": "Here's how to {tutorial_goal} in under 5 minutes...",
                    },
                },
                {
                    "ref_id": "scene-2",
                    "type": "scene",
                    "position": {"x": 400, "y": 0},
                    "label": "Demo Step 1",
                    "required": True,
                    "data": {
                        "scene_name": "Product Demo",
                        "scene_category": "body",
                        "scene_tone": "demonstrative",
                        "scene_duration": 8,
                        "prompt_template": "Close-up of {character} demonstrating step 1, detailed hand movements, well-lit workspace, clear instructions.",
                        "script_text": "Step 1: Start by...",
                    },
                },
                {
                    "ref_id": "scene-3",
                    "type": "scene",
                    "position": {"x": 800, "y": 0},
                    "label": "Demo Step 2",
                    "required": True,
                    "data": {
                        "scene_name": "Product Demo",
                        "scene_category": "body",
                        "scene_tone": "demonstrative",
                        "scene_duration": 8,
                        "prompt_template": "Close-up of {character} demonstrating step 2 with {product_name}, smooth transitions, professional setting.",
                        "script_text": "Step 2: Now take your {product_name} and...",
                    },
                },
                {
                    "ref_id": "scene-4",
                    "type": "scene",
                    "position": {"x": 1200, "y": 0},
                    "label": "CTA",
                    "required": True,
                    "data": {
                        "scene_name": "CTA - Link in Bio",
                        "scene_category": "closer",
                        "scene_tone": "urgent",
                        "scene_duration": 3,
                        "prompt_template": "Close-up of {character} showing the final result, proud expression, bright lighting, call to action.",
                        "script_text": "That's it! Follow for more tips and grab {product_name} in bio.",
                    },
                },
                {
                    "ref_id": "character-slot",
                    "type": "character",
                    "position": {"x": 400, "y": -200},
                    "label": "Instructor",
                    "required": False,
                    "data": {},
                },
                {
                    "ref_id": "product-slot",
                    "type": "product",
                    "position": {"x": 800, "y": -200},
                    "label": "Product / Tool",
                    "required": False,
                    "data": {},
                },
            ],
            "connections": [
                {"source": "scene-1", "target": "scene-2", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-2", "target": "scene-3", "source_handle": "output", "target_handle": "input"},
                {"source": "scene-3", "target": "scene-4", "source_handle": "output", "target_handle": "input"},
            ],
            "variables": [
                {"key": "product_name", "label": "Product Name", "type": "text", "placeholder": "e.g. Figma"},
                {"key": "tutorial_goal", "label": "Tutorial Goal", "type": "text", "placeholder": "e.g. design a logo"},
            ],
        },
    },
]


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if system templates already exist
        result = await session.execute(
            select(Template).where(Template.is_system == True).limit(1)
        )
        if result.scalar_one_or_none():
            print("System templates already seeded. Skipping.")
            return

        for template_data in SYSTEM_TEMPLATES:
            template = Template(
                id=uuid.uuid4(),
                is_system=True,
                **template_data,
            )
            session.add(template)

        await session.commit()
        print(f"Seeded {len(SYSTEM_TEMPLATES)} system templates.")


if __name__ == "__main__":
    asyncio.run(seed())
