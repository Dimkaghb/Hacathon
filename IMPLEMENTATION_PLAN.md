# Axel UGC Platform — Step-by-Step Implementation Plan

> This plan maps every brainstormed feature to concrete implementation steps, grounded in the actual codebase patterns. Each step references exact files, models, and interfaces that need to change.

---

## Table of Contents

- [Phase 1: Foundation — Character Library, Product Node, Setting Node](#phase-1-foundation)
- [Phase 2: Templates — Scene Gallery, Scene Templates & Hook Library](#phase-2-templates)
- [Phase 3: Branching — Variation Engine & A/B Canvas](#phase-3-branching)
- [Phase 4: Assembly & Export — Smart Stitch & Platform Export](#phase-4-assembly--export)
- [Phase 5: Accessibility & Growth — Script Mode, Campaigns, Community](#phase-5-accessibility--growth)

---

## Phase 1: Foundation

**Goal:** Extend the data model with a user-level Character Library (supporting multiple characters), Product Node, and Setting Node — the reusable building blocks that all future features depend on.

**Duration estimate: Weeks 1–3**

---

### Step 1.1: Character Library — User-Level, Multiple Characters

**What:** Transform the existing `Character` model (currently project-scoped, single image) into a user-level **Character Library** where each user can create, manage, and reuse **many characters** across projects. Characters are selected via a picker window when placing them on the canvas.

#### 1.1.1 — Backend: Evolve `Character` Model to User-Level

**File:** `backend/app/models/character.py` (modify existing)

Migrate the existing `Character` model from project-scoped to user-scoped:

```
Character (evolved)
├── id: UUID (PK)
├── user_id: UUID (FK → users.id, CASCADE) — CHANGED: owned by user, not project
├── name: String(255) — display name ("Beach Sarah", "Lab Coat Emily")
├── source_images: JSON — array of image URLs [{url, angle: "front"|"profile"|"3/4", is_primary: bool}]
│   (replaces single source_image_url)
├── prompt_dna: Text — refined character description paragraph for consistent Veo results
├── voice_profile: JSON — {tone, energy, pacing, speech_patterns, example_phrases}
├── performance_style: JSON — {gestures, camera_behavior, pauses, mannerisms}
├── embedding_id: String(255) — Qdrant vector DB reference (existing field, keep as-is)
├── analysis_data: JSON — facial analysis from Gemini Vision (existing field, keep as-is)
├── metadata: JSON — {tags, category, notes}
├── created_at, updated_at: DateTime
```

**Key change:** `project_id` FK → `user_id` FK. The same character can now appear in unlimited projects.

**Backward compatibility:** Migrate existing project-scoped characters to their project owner's user-level library. Add a data migration step that reads `project.user_id` for each existing character and sets `character.user_id` accordingly.

#### 1.1.2 — Backend: `WardrobePreset` Model

**File:** `backend/app/models/wardrobe_preset.py` (new)

```
WardrobePreset
├── id: UUID (PK)
├── character_id: UUID (FK → characters.id, CASCADE)
├── name: String(255) — "Casual Hoodie Look", "Professional Blazer"
├── description: Text — structured clothing description for prompt injection
├── reference_images: JSON — array of image URLs showing the outfit
├── clothing_details: JSON — {top, bottom, shoes, accessories, colors, style, fit}
├── prompt_snippet: Text — pre-written prompt fragment: "wearing a white oversized hoodie..."
├── created_at: DateTime
```

Each character can have **multiple wardrobe presets**. When placing a Character Node on canvas, the user selects both the character and which wardrobe to use.

#### 1.1.3 — Backend: Schemas

**File:** `backend/app/schemas/ai.py` (modify existing `CharacterCreate`, `CharacterResponse`)

```
CharacterCreate (updated):
  name: str
  source_images: List[Dict]  — [{url: str, angle: str, is_primary: bool}]
  voice_profile: Optional[Dict]
  performance_style: Optional[Dict]

CharacterUpdate (new):
  name: Optional[str]
  prompt_dna: Optional[str]
  voice_profile: Optional[Dict]
  performance_style: Optional[Dict]
  metadata: Optional[Dict]

CharacterResponse (updated):
  id, user_id, name, source_images, prompt_dna, voice_profile,
  performance_style, embedding_id, analysis_data, metadata,
  wardrobe_presets: List[WardrobePresetResponse], created_at, updated_at

WardrobePresetCreate:
  name: str
  description: Optional[str]
  reference_images: List[str]
  clothing_details: Optional[Dict]
  prompt_snippet: Optional[str]

WardrobePresetResponse:
  id, character_id, name, description, reference_images,
  clothing_details, prompt_snippet, created_at
```

#### 1.1.4 — Backend: Character Library API Endpoints

**File:** `backend/app/api/characters.py` (new — replaces character endpoints currently inside `ai.py`)

Mount at `/api/characters` in `main.py`.

```
GET    /api/characters                              — List ALL user's characters (the library)
POST   /api/characters                              — Create new character in library
GET    /api/characters/{id}                         — Get single character with wardrobe presets
PUT    /api/characters/{id}                         — Update character details
DELETE /api/characters/{id}                         — Delete character from library

POST   /api/characters/{id}/analyze                 — Run face analysis (reuse face_service, 5 credits)
POST   /api/characters/{id}/wardrobe                — Add wardrobe preset
PUT    /api/characters/{id}/wardrobe/{preset_id}    — Update wardrobe preset
DELETE /api/characters/{id}/wardrobe/{preset_id}    — Delete wardrobe preset
```

**Dependencies:** `get_current_user` (auth), `get_db` (session). No subscription required for CRUD, only for `/analyze` (5 credits).

**Important:** Move existing character-related endpoints out of `api/ai.py` into this new dedicated router.

#### 1.1.5 — Backend: Update Video Generation to Use Character Library

**File:** `backend/app/tasks/video_tasks.py`

In the `generate_video` task, update the character description loading to include wardrobe and performance data:

```python
# Current: loads from project-scoped Character
character_description = loop.run_until_complete(
    face_service.get_character_description(character_id)
)

# New: load full character + wardrobe preset
character = load_character(character_id)  # Now user-scoped
wardrobe = load_wardrobe_preset(wardrobe_preset_id) if wardrobe_preset_id else None

character_description = character.prompt_dna or character_description
if wardrobe:
    character_description += f"\n{wardrobe.prompt_snippet}"
if character.performance_style:
    character_description += f"\nPerformance: {format_performance(character.performance_style)}"
```

**File:** `backend/app/schemas/ai.py` — Add `wardrobe_preset_id` to `VideoGenerateRequest`.

#### 1.1.6 — Backend: Alembic Migration

**File:** `backend/alembic/versions/YYYYMMDD_evolve_character_to_library.py` (new)

```python
def upgrade():
    # 1. Add new columns to characters table: user_id, source_images, prompt_dna,
    #    voice_profile, performance_style, metadata
    # 2. Migrate existing characters: set user_id from project.user_id
    # 3. Drop project_id FK (or keep nullable for backward compat during transition)
    # 4. Create wardrobe_presets table
    # 5. Add wardrobe_preset_id column to nodes table
```

Follow the idempotent enum creation pattern from `20260206_add_subscriptions_and_credits.py`.

#### 1.1.7 — Frontend: Character Library Panel (Picker Window)

**File:** `frontend/components/canvas/panels/CharacterLibraryPanel.tsx` (new)

This is the **picker window** that opens when the user clicks "Character" in the dock:

```
CharacterLibraryPanel (modal or slide-out)
├── Header: "Your Characters" + "Create Character" button
├── Search bar (filter by name/tag)
├── Character grid:
│   ├── Character Card:
│   │   ├── Primary face image (thumbnail)
│   │   ├── Name
│   │   ├── Wardrobe count badge
│   │   ├── Tags (optional)
│   │   └── Click → selects this character
│   └── ... (all user's characters)
├── On character select:
│   ├── Show wardrobe selector (if character has multiple wardrobes)
│   └── Confirm → creates CharacterNode on canvas with selected character + wardrobe
├── Create Character flow (inline or separate modal):
│   ├── Upload reference images
│   ├── Enter name
│   ├── Optional: run face analysis
│   ├── Optional: add wardrobe presets
│   └── Save → added to library, optionally place on canvas
```

**File:** `frontend/lib/api.ts` — Add `characterLibraryApi` section with all CRUD + wardrobe methods.

#### 1.1.8 — Frontend: CharacterNodeRF Component

**File:** `frontend/components/canvas/nodes/CharacterNodeRF.tsx` (new)

```
CharacterNode
├── Output handle: "character-output" (right)
├── Display:
│   ├── Character face image (thumbnail from library)
│   ├── Character name
│   ├── Selected wardrobe name + preview
│   ├── Wardrobe dropdown (switch between presets)
│   └── "Change Character" button → re-opens picker
├── Data stored in Node.data:
│   {
│     character_id: UUID,
│     wardrobe_preset_id: UUID | null,
│     name: string,          // Cached for display
│     image_url: string,     // Cached primary image
│     wardrobe_name: string  // Cached for display
│   }
```

Register in `nodes/index.ts`, add `CHARACTER` to `NodeType` enum, add to floating dock.

#### 1.1.9 — Frontend: Wire CharacterNode into Video Generation

**File:** `frontend/components/canvas/ReactFlowCanvas.tsx`

Update `getConnectedData()` to extract character data from connected CharacterNode:

```typescript
if (sourceNode.type === 'character' && sourceNode.data?.character_id) {
    characterData = {
        character_id: sourceNode.data.character_id,
        wardrobe_preset_id: sourceNode.data.wardrobe_preset_id,
    };
}
```

Update `handleGenerateVideo()` to pass character data to API.

Update `VideoNodeRF.tsx` to show "Character ✓" indicator when character is connected.

#### 1.1.10 — Frontend: Update Floating Dock

**File:** `frontend/components/canvas/ReactFlowCanvas.tsx` (or `floating-dock.tsx`)

Add "Character" dock item that opens the Character Library picker:

```typescript
{
    title: "Character",
    icon: <IconUser />,
    onClick: (e) => { e.preventDefault(); setShowCharacterPicker(true); },
    id: 'character',
}
```

When user selects a character from the picker, a CharacterNode is created at the current viewport center.

---

### Step 1.2: Product Node

**What:** A new node type that stores structured product data and injects it into prompts.

#### 1.2.1 — Backend: Add New Node Types to Enum

**File:** `backend/app/models/node.py`

```python
class NodeType(str, enum.Enum):
    IMAGE = "image"
    PROMPT = "prompt"
    VIDEO = "video"
    CONTAINER = "container"
    RATIO = "ratio"
    SCENE = "scene"
    EXTENSION = "extension"
    CHARACTER = "character"   # New
    PRODUCT = "product"       # New
    SETTING = "setting"       # New (step 1.3)
```

**File:** `backend/app/schemas/node.py` — Mirror the enum addition.

**Migration:** Alter the `nodetype` PostgreSQL enum to add new values.

```python
# In migration:
op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'character'")
op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'product'")
op.execute("ALTER TYPE nodetype ADD VALUE IF NOT EXISTS 'setting'")
```

#### 1.2.2 — Backend: Product Node Data Schema

The Product node uses the existing `Node.data` JSON field. Define the expected structure:

```json
{
  "product_name": "GlowSerum Pro",
  "brand": "SkinCo",
  "category": "skincare",
  "benefits": ["Reduces fine lines", "Deep hydration", "Visible results in 2 weeks"],
  "target_audience": "Women 25-45 concerned about aging",
  "tone": "clinical-authority",
  "claims": ["Dermatologist recommended", "100,000+ happy customers"],
  "product_images": ["https://...front.jpg", "https://...side.jpg"],
  "price_point": "$49.99",
  "prompt_context": "Auto-generated: premium skincare serum for anti-aging..."
}
```

#### 1.2.3 — Backend: Product Context Injection into Prompts

**File:** `backend/app/services/prompt_service.py`

Add a function that builds prompt context from product data:

```python
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
    return ". ".join(parts) + "."
```

**File:** `backend/app/tasks/video_tasks.py`

In the generate_video task, if product data is provided, append it to the prompt alongside character description:

```python
final_prompt = user_prompt
if character_description:
    final_prompt += f"\n\nCharacter: {character_description}"
if product_context:
    final_prompt += f"\n\nProduct context: {product_context}"
```

#### 1.2.4 — Frontend: ProductNodeRF Component

**File:** `frontend/components/canvas/nodes/ProductNodeRF.tsx` (new)

```
ProductNode
├── Output handle: "product-output" (right)
├── Fields:
│   ├── Product name (text input)
│   ├── Brand (text input)
│   ├── Category (dropdown: skincare, tech, food, fashion, fitness, other)
│   ├── Benefits (tag input — add/remove chips)
│   ├── Target audience (text input)
│   ├── Tone (dropdown: clinical, enthusiastic, casual, luxury, fun)
│   ├── Claims/social proof (tag input)
│   └── Product images (upload zone, max 3)
├── Data stored in Node.data JSON
```

Register in `nodes/index.ts`, add to floating dock with `IconPackage` icon.

#### 1.2.5 — Frontend: Wire Product into Video Generation

**File:** `frontend/components/canvas/ReactFlowCanvas.tsx`

Update `getConnectedData()`:

```typescript
if (sourceNode.type === 'product') {
    productData = sourceNode.data;
}
```

Update `handleGenerateVideo()` to pass product_data to API.

Update `VideoNodeRF.tsx` to show "Product ✓" indicator.

Add `product-input` handle to VideoNodeRF (left side, new position).

---

### Step 1.3: Setting/Location Node

**What:** A node that defines the visual environment (location, lighting, camera angle) and injects it into prompts for consistency across scenes.

#### 1.3.1 — Frontend: SettingNodeRF Component

**File:** `frontend/components/canvas/nodes/SettingNodeRF.tsx` (new)

```
SettingNode
├── Output handle: "setting-output" (right)
├── Fields:
│   ├── Location (dropdown + custom: bathroom, kitchen, bedroom, office, outdoor, car, gym, studio)
│   ├── Lighting (dropdown: natural-window, ring-light, golden-hour, overhead, dim-ambient)
│   ├── Camera angle (dropdown: selfie, eye-level, slightly-below, overhead, dutch-angle)
│   ├── Vibe (dropdown: messy-authentic, clean-minimal, cozy, professional, energetic)
│   └── Custom details (textarea for additional setting description)
├── Data:
│   {
│     location: "bathroom",
│     lighting: "natural-window",
│     camera_angle: "selfie",
│     vibe: "messy-authentic",
│     custom_details: "Morning light streaming through frosted window",
│     prompt_snippet: "Auto-generated: In a bathroom with natural window light..."
│   }
```

#### 1.3.2 — Backend: Setting Context Injection

**File:** `backend/app/services/prompt_service.py`

```python
def build_setting_context(setting_data: dict) -> str:
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
        parts.append(setting_data['custom_details'])
    return ". ".join(parts)
```

#### 1.3.3 — Frontend & Backend: Wire Setting into Video Generation

Same pattern as Product: add `setting-input` handle to VideoNode, update `getConnectedData()`, pass setting data through API to task, append to prompt.

---

### Step 1.4: Update VideoNode to Accept All New Inputs

**File:** `frontend/components/canvas/nodes/VideoNodeRF.tsx`

Add new input handles:

```
Left side handles:
├── prompt-input (30%) — existing
├── image-input (45%) — existing
├── character-input (60%) — NEW
├── product-input (75%) — NEW
└── setting-input (90%) — NEW
```

Show connection indicators for each:

```
Connected inputs:
✓ Prompt: "A person reviewing skincare..."
✓ Character: Sarah (Casual Look)
✓ Product: GlowSerum Pro
✓ Setting: Bathroom, Natural Light
○ Image: (optional)
```

---

## Phase 2: Templates

**Goal:** Scene Gallery with picker-based scene selection, pre-built Scene Templates, and Hook Library.

**Duration estimate: Weeks 3–5**

---

### Step 2.1: Scene Gallery — Pre-Built Smart Scene Types

**What:** Enhance the existing Scene Node into a picker-based node where users select from a gallery of pre-built scene types (hooks, testimonials, GRWM, etc.). Each scene type has baked-in prompt templates, settings, duration, and tone — the user just customizes the script text.

#### 2.1.1 — Backend: `SceneDefinition` Model

**File:** `backend/app/models/scene_definition.py` (new)

```
SceneDefinition
├── id: UUID (PK)
├── name: String(255) — "Curiosity Hook", "Product Testimonial", "Before/After Reveal"
├── category: String(100) — "hook"|"body"|"closer"|"full_format"
├── subcategory: String(100) — "curiosity"|"pov"|"controversy"|"social_proof"|"problem"|"solution"|"cta"
├── description: Text — user-facing description of this scene type
├── thumbnail_url: String(2048) — preview image/icon for gallery display
├── prompt_template: Text — with variables: "{character} looks at camera and says: '{script_text}'"
├── default_script: Text — default editable text: "Stop scrolling if you have dry skin..."
├── setting: JSON — {location, lighting, camera_angle, vibe} baked-in defaults
├── duration: Integer — default duration in seconds (e.g., 5)
├── tone: String(100) — "enthusiastic"|"vulnerable"|"authoritative"|"casual"
├── is_system: Boolean — true for built-in scenes, false for user-created
├── creator_id: UUID (FK → users.id, nullable) — null for system scenes
├── usage_count: Integer — how many times used (for ranking in gallery)
├── sort_order: Integer — display order within category
├── created_at, updated_at: DateTime
```

**Key insight:** This is NOT a full multi-node template (that's Step 2.2). This is a **single scene type** definition. When a user picks "Curiosity Hook" from the gallery, one Scene Node appears on canvas with all the settings baked in.

#### 2.1.2 — Backend: Scene Definition API

**File:** `backend/app/api/scene_definitions.py` (new)

Mount at `/api/scene-definitions` in `main.py`.

```
GET  /api/scene-definitions                — List all scene definitions (for gallery)
GET  /api/scene-definitions?category=hook  — Filter by category
GET  /api/scene-definitions/{id}           — Get single scene definition
POST /api/scene-definitions                — Create custom scene definition (user)
```

#### 2.1.3 — Backend: Seed System Scene Definitions

**File:** `backend/app/seeds/scene_definitions.py` (new)

Pre-built scene definitions to seed:

```python
SYSTEM_SCENES = [
    # Hooks (3-5s)
    {
        "name": "Curiosity Hook",
        "category": "hook", "subcategory": "curiosity",
        "prompt_template": "{character} looks directly at the camera with an excited expression and says: '{script_text}'",
        "default_script": "I tried {product} for 30 days and the results shocked me...",
        "setting": {"location": "bedroom", "lighting": "natural-window", "camera_angle": "selfie"},
        "duration": 5, "tone": "enthusiastic"
    },
    {
        "name": "POV Hook",
        "category": "hook", "subcategory": "pov",
        "prompt_template": "{character} with a knowing smile, filmed from a first-person perspective, saying: '{script_text}'",
        "default_script": "POV: You finally found a {product_category} that actually works...",
        "setting": {"location": "bathroom", "lighting": "ring-light", "camera_angle": "eye-level"},
        "duration": 4, "tone": "relatable"
    },
    {
        "name": "Controversy Hook",
        "category": "hook", "subcategory": "controversy",
        "prompt_template": "{character} with a serious expression, leaning slightly toward the camera, saying: '{script_text}'",
        "default_script": "Unpopular opinion: most {product_category} is overrated. Except this one...",
        "setting": {"location": "studio", "lighting": "overhead", "camera_angle": "slightly-below"},
        "duration": 5, "tone": "authoritative"
    },
    # ... more hooks: Social Proof, Relatable, Urgency, Challenge

    # Body (5-10s)
    {
        "name": "Problem Statement",
        "category": "body", "subcategory": "problem",
        "prompt_template": "{character} speaking vulnerably, slightly looking away then back at camera: '{script_text}'",
        "default_script": "I used to struggle with {pain_point}. Nothing I tried worked...",
        "setting": {"location": "bathroom", "lighting": "natural-window", "camera_angle": "selfie"},
        "duration": 7, "tone": "vulnerable"
    },
    {
        "name": "Solution Reveal",
        "category": "body", "subcategory": "solution",
        "prompt_template": "{character} brightening up, holding or gesturing toward a product, saying: '{script_text}'",
        "default_script": "Then I discovered {product} and everything changed...",
        "setting": {"location": "bedroom", "lighting": "natural-window", "camera_angle": "selfie"},
        "duration": 8, "tone": "enthusiastic"
    },
    # ... more body: Proof, Tutorial Step, Lifestyle Moment, Product Demo

    # Closers (3-5s)
    {
        "name": "CTA — Link in Bio",
        "category": "closer", "subcategory": "cta",
        "prompt_template": "{character} looking at camera confidently and pointing down, saying: '{script_text}'",
        "default_script": "Link in my bio, you're welcome",
        "setting": {"location": "bedroom", "lighting": "natural-window", "camera_angle": "selfie"},
        "duration": 3, "tone": "casual"
    },
    # ... more closers: Before/After Reveal, Testimonial Wrap, Offer/Discount
]
```

Run via: `python -m app.seeds.scene_definitions` or Alembic data migration.

#### 2.1.4 — Frontend: Scene Gallery Picker (Picker Window)

**File:** `frontend/components/canvas/panels/SceneGalleryPanel.tsx` (new)

This is the **picker window** that opens when the user clicks "Scene" in the dock:

```
SceneGalleryPanel (modal or slide-out)
├── Header: "Scene Gallery" + search bar
├── Category tabs: All | Hooks | Body | Closers
├── Scene grid:
│   ├── Scene Card:
│   │   ├── Thumbnail/icon for scene type
│   │   ├── Name ("Curiosity Hook")
│   │   ├── Duration badge ("5s")
│   │   ├── Tone indicator
│   │   ├── Default script preview (truncated)
│   │   └── Click → selects this scene type
│   └── ... (all available scene definitions)
├── On scene select:
│   └── Creates a Scene Node on canvas pre-filled with:
│       - scene_definition_id
│       - Editable script text (from default_script)
│       - Duration (from definition)
│       - All internal settings (prompt_template, setting, tone) — hidden from user
├── "Custom Scene" option at bottom → creates blank Scene Node (manual)
```

#### 2.1.5 — Frontend: Enhance SceneNodeRF Component

**File:** `frontend/components/canvas/nodes/SceneNodeRF.tsx` (modify existing)

The current SceneNode is a simple textarea. Enhance it to work with scene definitions:

```
SceneNode (enhanced)
├── Input handles:
│   ├── "character-input" (left, top) — accepts Character Node connection
│   ├── "product-input" (left, middle) — accepts Product Node connection (optional)
│   ├── "scene-chain-input" (top) — accepts previous Scene Node for chaining
│   └── "setting-input" (left, bottom) — accepts Setting Node connection (optional, overrides baked-in)
├── Output handles:
│   ├── "scene-chain-output" (bottom) — chains to next Scene Node
│   └── "video-output" (right) — outputs generated video
├── Display:
│   ├── Scene type label ("Curiosity Hook") + category badge
│   ├── Editable script text area (user can customize)
│   ├── Duration display/slider
│   ├── Video preview (inline, after generation)
│   ├── "Generate" button
│   └── Status indicator (idle / processing / completed)
├── Hidden internal data (from scene definition):
│   ├── prompt_template
│   ├── setting (location, lighting, camera, vibe)
│   └── tone
├── Data stored in Node.data:
│   {
│     scene_definition_id: UUID,
│     scene_type: "hook",
│     scene_name: "Curiosity Hook",
│     script_text: "I tried GlowSerum for 30 days and...",
│     duration: 5,
│     prompt_template: "...",
│     setting: {...},
│     tone: "enthusiastic",
│     video_url: null,        // Filled after generation
│     veo_video_uri: null,    // For extension chaining
│     veo_video_name: null
│   }
```

**Generation logic inside SceneNode:**
When user clicks "Generate":
1. Read connected Character Node → get character description + wardrobe
2. Read connected Product Node → get product context (optional)
3. Read connected Setting Node → override baked-in setting (optional)
4. Fill prompt_template variables with character + product + script_text
5. Check if there's an incoming scene-chain connection → if yes, call extend-video (Veo extension); if no, call generate-video (fresh)
6. Show video inline in the node after completion

#### 2.1.6 — Frontend: Update Floating Dock for Scene Gallery

**File:** `frontend/components/canvas/ReactFlowCanvas.tsx`

Add/update "Scene" dock item to open the gallery picker:

```typescript
{
    title: "Scene",
    icon: <IconMovie />,
    onClick: (e) => { e.preventDefault(); setShowSceneGallery(true); },
    id: 'scene',
}
```

---

### Step 2.2: Multi-Node Templates (Full Formats)

**What:** Pre-built template blueprints that stamp entire multi-node graphs onto the canvas. These are for "Full Formats" like complete Testimonials (4 scenes), GRWM (5 scenes), Unboxing (4 scenes) — a connected chain of Scene Nodes with Character + Product slots.

#### 2.2.1 — Backend: Template Model

**File:** `backend/app/models/template.py` (new)

```
Template
├── id: UUID (PK)
├── name: String(255) — "Product Testimonial"
├── description: Text — "A 4-scene testimonial with hook → problem → solution → CTA"
├── category: String(100) — "testimonial"|"unboxing"|"grwm"|"before-after"|"tutorial"
├── is_system: Boolean — true for built-in templates, false for user-created
├── creator_id: UUID (FK → users.id, nullable) — null for system templates
├── thumbnail_url: String(2048)
├── scene_count: Integer — number of scenes in the chain
├── estimated_duration: String(50) — "15-30s"
├── best_for: JSON — ["product reviews", "skincare", "DTC"]
├── graph_definition: JSON — the full node graph blueprint (see 2.2.2)
├── usage_count: Integer — how many times used (for ranking)
├── created_at, updated_at: DateTime
```

#### 2.2.2 — Template Graph Definition Schema

The `graph_definition` JSON stores a portable node graph that can be stamped onto any canvas. Now using the new node types (Character, Scene, Product, Setting):

```json
{
  "nodes": [
    {
      "ref_id": "character_slot",
      "type": "character",
      "position": {"x": 0, "y": 200},
      "data": {},
      "label": "Your Character",
      "required": true
    },
    {
      "ref_id": "product_slot",
      "type": "product",
      "position": {"x": 0, "y": 400},
      "data": {},
      "label": "Your Product",
      "required": true
    },
    {
      "ref_id": "hook_scene",
      "type": "scene",
      "position": {"x": 400, "y": 100},
      "data": {
        "scene_definition_id": "<curiosity-hook-id>",
        "script_text": "I tried {product} for 30 days and the results shocked me...",
        "duration": 5
      },
      "label": "Hook (5s)"
    },
    {
      "ref_id": "problem_scene",
      "type": "scene",
      "position": {"x": 400, "y": 300},
      "data": {
        "scene_definition_id": "<problem-statement-id>",
        "script_text": "I used to struggle with {pain_point}. Nothing worked.",
        "duration": 7
      },
      "label": "Problem (7s)"
    },
    {
      "ref_id": "solution_scene",
      "type": "scene",
      "position": {"x": 400, "y": 500},
      "data": {
        "scene_definition_id": "<solution-reveal-id>",
        "script_text": "Then I discovered {product} and everything changed...",
        "duration": 8
      },
      "label": "Solution (8s)"
    },
    {
      "ref_id": "cta_scene",
      "type": "scene",
      "position": {"x": 400, "y": 700},
      "data": {
        "scene_definition_id": "<cta-link-bio-id>",
        "script_text": "Link in my bio, you're welcome",
        "duration": 3
      },
      "label": "CTA (3s)"
    }
  ],
  "connections": [
    {"source": "character_slot", "source_handle": "character-output", "target": "hook_scene", "target_handle": "character-input"},
    {"source": "product_slot", "source_handle": "product-output", "target": "hook_scene", "target_handle": "product-input"},
    {"source": "hook_scene", "source_handle": "scene-chain-output", "target": "problem_scene", "target_handle": "scene-chain-input"},
    {"source": "problem_scene", "source_handle": "scene-chain-output", "target": "solution_scene", "target_handle": "scene-chain-input"},
    {"source": "solution_scene", "source_handle": "scene-chain-output", "target": "cta_scene", "target_handle": "scene-chain-input"}
  ],
  "variables": [
    {"key": "product", "label": "Product Name", "type": "text"},
    {"key": "pain_point", "label": "Pain Point", "type": "text", "placeholder": "dry skin, acne, etc."}
  ]
}
```

**Note:** Character connects only to the first scene — subsequent scenes inherit through the chain. Product can connect to the first scene and auto-propagate.

#### 2.2.3 — Backend: Template API

**File:** `backend/app/api/templates.py` (new)

Mount at `/api/templates`.

```
GET    /api/templates                    — List templates (filter by category, system/user)
GET    /api/templates/{id}               — Get single template with full graph_definition
POST   /api/templates                    — Create user template (from existing project graph)
DELETE /api/templates/{id}               — Delete user template
POST   /api/templates/{id}/instantiate   — Stamp template onto a project canvas
```

The `/instantiate` endpoint creates all nodes and connections from the graph_definition:

```python
@router.post("/{template_id}/instantiate")
async def instantiate_template(
    template_id: UUID,
    project_id: UUID,
    offset_x: float = 0,
    offset_y: float = 0,
    variables: Dict[str, str] = {},
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = await get_template(db, template_id)
    ref_to_node_id = {}

    for node_def in template.graph_definition["nodes"]:
        data = substitute_variables(node_def["data"], variables)
        node = Node(
            project_id=project_id,
            type=NodeType(node_def["type"]),
            position_x=node_def["position"]["x"] + offset_x,
            position_y=node_def["position"]["y"] + offset_y,
            data=data,
        )
        db.add(node)
        await db.flush()
        ref_to_node_id[node_def["ref_id"]] = node.id

    for conn_def in template.graph_definition["connections"]:
        connection = Connection(
            project_id=project_id,
            source_node_id=ref_to_node_id[conn_def["source"]],
            target_node_id=ref_to_node_id[conn_def["target"]],
            source_handle=conn_def.get("source_handle"),
            target_handle=conn_def.get("target_handle"),
        )
        db.add(connection)

    await db.commit()
    return {"nodes": [...], "connections": [...]}
```

#### 2.2.4 — Backend: Seed System Templates

**File:** `backend/app/seeds/templates.py` (new)

Pre-built full-format templates: Product Testimonial, GRWM, Before/After, Unboxing, Problem→Agitate→Solve, Day in the Life, Tutorial/How-To.

#### 2.2.5 — Frontend: Template Browser Panel

**File:** `frontend/components/canvas/panels/TemplateBrowserPanel.tsx` (new)

Accessed from a "Templates" dock item or the existing "Components" button:

```
TemplateBrowserPanel (slide-out or modal)
├── Search bar
├── Category filter tabs: All | Testimonial | Unboxing | GRWM | Before/After | Tutorial
├── Template grid:
│   ├── Template Card:
│   │   ├── Thumbnail (preview of node graph)
│   │   ├── Name
│   │   ├── Scene count + estimated duration
│   │   ├── "Best for" tags
│   │   └── "Use Template" button
│   └── ...
├── On "Use Template" click:
│   ├── Show variable input modal:
│   │   ├── Select Character (from library picker)
│   │   ├── Fill product name, pain point, etc.
│   │   └── Confirm → stamps full graph onto canvas
│   └── Call POST /api/templates/{id}/instantiate
```

**File:** `frontend/lib/api.ts` — Add `templatesApi` section.

---

### Step 2.3: Hook Library

#### 2.3.1 — Backend: Hook Model

**File:** `backend/app/models/hook.py` (new)

```
Hook
├── id: UUID (PK)
├── category: String(50) — "curiosity"|"controversy"|"social-proof"|"pov"|"relatable"|"urgency"|"challenge"
├── template_text: Text — "I tried {product} for {duration} and..."
├── example_filled: Text — "I tried GlowSerum for 30 days and the results shocked me"
├── variables: JSON — [{key: "product", type: "text"}, {key: "duration", type: "text"}]
├── performance_score: Float — community rating 0-5
├── usage_count: Integer
├── is_system: Boolean
├── creator_id: UUID (nullable)
├── created_at: DateTime
```

#### 2.3.2 — Backend: Hook API

**File:** `backend/app/api/hooks.py` (new)

```
GET    /api/hooks                    — List hooks (filter by category)
POST   /api/hooks                    — Create user hook
POST   /api/hooks/{id}/use           — Use hook (creates PromptNode or fills Scene script, increments usage)
POST   /api/hooks/generate-variants  — AI-generates 3-5 hook variations from a product description
```

The `/generate-variants` endpoint uses Gemini to create hook text:

```python
@router.post("/generate-variants")
async def generate_hook_variants(
    product_name: str,
    pain_point: str,
    tone: str = "enthusiastic",
    count: int = 5,
):
    prompt = f"""Generate {count} UGC video hooks for "{product_name}".
    Pain point: {pain_point}. Tone: {tone}.
    Each hook should be 1-2 sentences, designed to stop scrolling in first 3 seconds.
    Return as JSON array of strings."""

    response = await prompt_service.generate_with_gemini(prompt)
    return {"hooks": parse_json_array(response)}
```

#### 2.3.3 — Backend: Seed System Hooks

**File:** `backend/app/seeds/hooks.py` (new)

15+ pre-built hooks across categories: Curiosity, Social Proof, POV, Relatable, Urgency, Challenge, Controversy.

#### 2.3.4 — Frontend: Hook Library Panel

**File:** `frontend/components/canvas/panels/HookLibraryPanel.tsx` (new)

```
HookLibraryPanel
├── Category tabs: All | Curiosity | Social Proof | POV | Relatable | Urgency | Challenge
├── AI Generate section:
│   ├── Product name input
│   ├── Pain point input
│   ├── "Generate Hooks" button → calls /api/hooks/generate-variants
│   └── Shows generated hooks as cards
├── Hook cards:
│   ├── Hook template text with {variables} highlighted
│   ├── Usage count + performance score
│   ├── "Use as Script" → fills connected Scene Node's script_text
│   └── "Branch with This" → creates branch variation (Phase 3 dependency)
```

---

## Phase 3: Branching

**Goal:** The killer feature — branch from any node to create variations, with A/B comparison view.

**Duration estimate: Weeks 5–7**

---

### Step 3.1: Branch Operation

#### 3.1.1 — Backend: Branch Endpoint

**File:** `backend/app/api/nodes.py` (extend existing)

```
POST /api/projects/{project_id}/nodes/{node_id}/branch
```

```python
@router.post("/{project_id}/nodes/{node_id}/branch")
async def branch_from_node(
    project_id: UUID,
    node_id: UUID,
    branch_config: BranchConfig,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clone all downstream nodes from the branch point.

    Given: A → B → C → D
    Branch from B creates: A → B → C → D  (original)
                           A → B' → C' → D' (branch)

    Where B' is a copy of B with modified data (e.g., different script).
    Upstream connections (A → B) are shared — the same Character/Product
    nodes feed both the original and branched chains.
    """
    # 1. Find the branch point node
    branch_node = await get_node(db, project_id, node_id, current_user.id)

    # 2. Collect downstream chain (BFS from branch_node)
    downstream_nodes = await collect_downstream_chain(db, project_id, node_id)

    # 3. Clone each downstream node with offset position
    clone_map = {}
    offset_y = 250

    for original_node in downstream_nodes:
        cloned = Node(
            project_id=project_id,
            type=original_node.type,
            position_x=original_node.position_x,
            position_y=original_node.position_y + offset_y,
            data=deep_copy(original_node.data),
            status=NodeStatus.IDLE,
            character_id=original_node.character_id,
        )
        # Clear generated content from cloned data
        cloned.data.pop("video_url", None)
        cloned.data.pop("veo_video_uri", None)
        cloned.data.pop("veo_video_name", None)
        cloned.data.pop("progress", None)

        db.add(cloned)
        await db.flush()
        clone_map[original_node.id] = cloned

    # 4. Clone internal connections (between downstream nodes)
    # 5. Re-attach upstream connections to cloned entry point
    # 6. Apply branch modifications
    await db.commit()

    return {
        "cloned_nodes": [...],
        "cloned_connections": [...],
        "branch_group_id": str(uuid4()),
    }
```

**Schema:**
```python
class BranchConfig(BaseModel):
    offset_y: float = 250
    modifications: Optional[Dict[str, Dict[str, Any]]] = None
    # e.g., {"node_id": {"script_text": "Different hook text..."}}
```

#### 3.1.2 — Backend: Helper — Collect Downstream Chain

**File:** `backend/app/api/nodes.py` (helper function)

```python
async def collect_downstream_chain(db, project_id, start_node_id) -> List[Node]:
    """BFS traversal to collect all nodes downstream of start_node_id."""
    visited = set()
    queue = [start_node_id]
    result = []

    while queue:
        current_id = queue.pop(0)
        if current_id in visited:
            continue
        visited.add(current_id)

        node = await db.get(Node, current_id)
        if node:
            result.append(node)

        outgoing = await db.execute(
            select(Connection).where(
                Connection.project_id == project_id,
                Connection.source_node_id == current_id,
            )
        )
        for conn in outgoing.scalars():
            if conn.target_node_id not in visited:
                queue.append(conn.target_node_id)

    return result
```

#### 3.1.3 — Frontend: Branch Action on Nodes

**File:** `frontend/components/canvas/nodes/SceneNodeRF.tsx` (and VideoNodeRF, ExtensionNodeRF)

Add a "Branch" button to node context menu or toolbar:

```typescript
<button onClick={() => data.onBranch?.()} title="Create variation branch">
  <IconGitBranch size={14} /> Branch
</button>
```

**File:** `frontend/components/canvas/ReactFlowCanvas.tsx`

Add `handleBranch` function that calls the API and adds cloned nodes/edges to the canvas.

#### 3.1.4 — Frontend: Visual Branch Indicators

**File:** `frontend/components/canvas/edges/BranchEdge.tsx` (new)

Dashed line style, color-coded by branch group, label on hover.

Track branch groups in ReactFlowCanvas state for visual grouping.

---

### Step 3.2: A/B Canvas View

#### 3.2.1 — Frontend: A/B Comparison Panel

**File:** `frontend/components/canvas/panels/ABComparisonPanel.tsx` (new)

```
ABComparisonPanel (overlay or split view)
├── Branch selector (dropdown of branch groups in project)
├── Side-by-side video players:
│   ├── Branch A: [Video Player] — "Hook A: Stop scrolling if..."
│   ├── Branch B: [Video Player] — "Hook B: Nobody told me..."
│   └── Branch C: [Video Player] — "Hook C: POV: You just found..."
├── Per-branch controls:
│   ├── Tag: "Winner" | "Loser" | "Control" | custom
│   ├── Notes textarea
│   └── Export button
├── Comparison metrics (manual input for now):
│   ├── CTR, Hook rate, Conversion rate
```

#### 3.2.2 — Backend: Branch Metadata

Stored in existing `Node.data` JSON field — no new model needed:

```json
{
  "branch_group_id": "uuid",
  "branch_label": "Hook A",
  "branch_tag": "winner",
  "branch_notes": "2x higher CTR than Hook B",
  "branch_metrics": { "ctr": 3.2, "hook_rate": 45, "conversion_rate": 1.8 }
}
```

---

## Phase 4: Assembly & Export

**Goal:** Stitch multiple video scenes into final cuts, export in platform-specific formats.

**Duration estimate: Weeks 7–9**

---

### Step 4.1: Smart Stitch Node

#### 4.1.1 — Backend: Stitch Service

**File:** `backend/app/services/stitch_service.py` (new)

Uses FFmpeg to concatenate video files:

```python
class StitchService:
    async def stitch_videos(
        self,
        video_urls: List[str],
        transitions: List[str],  # "cut" | "fade" | "crossfade"
        output_format: str = "mp4",
        target_aspect_ratio: Optional[str] = None,
    ) -> str:
        # 1. Download all videos to temp dir
        # 2. FFmpeg concatenation with transitions
        # 3. Resize/crop to target aspect ratio if specified
        # 4. Upload to GCS
        # 5. Return signed URL
```

**Dependencies:** Add `ffmpeg-python` to `requirements.txt`.

#### 4.1.2 — Backend: Stitch API & Worker

**File:** `backend/app/api/ai.py` (extend)

```
POST /api/ai/stitch-videos
```

Credit cost: **0 credits** (assembly only, no AI generation).

**File:** `backend/app/workers/stitch_worker.py` (new) or add Celery task to existing tasks.

**File:** `backend/app/models/node.py` — Add `STITCH = "stitch"` to `NodeType`
**File:** `backend/app/models/job.py` — Add `VIDEO_STITCH = "video_stitch"` to `JobType`

#### 4.1.3 — Frontend: StitchNodeRF Component

**File:** `frontend/components/canvas/nodes/StitchNodeRF.tsx` (new)

```
StitchNode
├── Multiple input handles (left): dynamic, max 10
├── Output handle: "stitch-output" (right)
├── Display:
│   ├── Scene order list (drag to reorder)
│   ├── Total duration
│   ├── Transition selector per junction: cut | fade | crossfade
│   ├── Aspect ratio selector: 9:16 (TikTok) | 4:5 (IG Feed) | 1:1 (Stories) | 16:9 (YouTube)
│   └── "Stitch" button (0 credits!)
├── After stitching: video preview + download button
```

Register in `nodes/index.ts`, add to dock.

---

### Step 4.2: Platform Export Presets

#### 4.2.1 — Backend: Export Configuration

**File:** `backend/app/services/stitch_service.py` (extend)

```python
PLATFORM_PRESETS = {
    "tiktok":          {"aspect_ratio": "9:16", "max_duration": 60, "resolution": "1080x1920"},
    "instagram_reels": {"aspect_ratio": "9:16", "max_duration": 90, "resolution": "1080x1920"},
    "instagram_feed":  {"aspect_ratio": "4:5",  "max_duration": 60, "resolution": "1080x1350"},
    "youtube_shorts":  {"aspect_ratio": "9:16", "max_duration": 60, "resolution": "1080x1920"},
    "youtube":         {"aspect_ratio": "16:9", "max_duration": None, "resolution": "1920x1080"},
}
```

#### 4.2.2 — Frontend: Export Dialog

**File:** `frontend/components/canvas/dialogs/ExportDialog.tsx` (new)

Platform buttons with icons, preview with aspect ratio crop, download.

---

## Phase 5: Accessibility & Growth

**Goal:** Script Mode for non-visual users, Campaign organization, and Community Templates.

**Duration estimate: Weeks 9–12**

---

### Step 5.1: Script Mode

#### 5.1.1 — Frontend: Script Editor

**File:** `frontend/app/script/page.tsx` (new) or toggle within `main/page.tsx`

```
ScriptEditor
├── Top bar:
│   ├── Character selector (from library picker)
│   ├── Product quick-fill (name, benefits)
│   ├── Setting quick-fill (location, lighting)
│   └── Toggle: "Script Mode" ↔ "Canvas Mode"
├── Script area:
│   ├── Scene blocks:
│   │   ├── [HOOK - 3s] "Okay I need to tell you about this serum..."
│   │   ├── [PROBLEM - 5s] "I've tried everything for my dry patches..."
│   │   ├── [SOLUTION - 8s] "My dermatologist recommended GlowSerum..."
│   │   └── [CTA - 3s] "Link in my bio, you're welcome"
│   ├── Add scene button (+)
│   └── Reorder via drag
├── "Generate All" → converts script to canvas node graph, generates all scenes
├── "Open in Canvas" → switches to canvas view
```

#### 5.1.2 — Backend: Script-to-Graph Endpoint

**File:** `backend/app/api/ai.py` (extend)

```
POST /api/ai/script-to-graph
```

Converts a script (list of scene blocks with character/product context) into a full node graph on the canvas. Creates Character Node + Product Node + Scene chain, wires everything together.

---

### Step 5.2: Campaign Organization

#### 5.2.1 — Backend: Campaign Model

**File:** `backend/app/models/campaign.py` (new)

```
Campaign
├── id: UUID (PK)
├── user_id: UUID (FK → users.id, CASCADE)
├── name: String(255) — "Summer Skincare Launch"
├── description: Text
├── status: String(50) — "active" | "archived" | "draft"
├── metadata: JSON — {tags, target_platform, budget, start_date, end_date}
├── created_at, updated_at: DateTime
```

**Relationships:**
- `projects` — many-to-many via `campaign_projects` table
- `characters` — many-to-many via `campaign_characters` table

#### 5.2.2 — Backend: Campaign API

**File:** `backend/app/api/campaigns.py` (new)

```
GET    /api/campaigns                           — List campaigns
POST   /api/campaigns                           — Create campaign
GET    /api/campaigns/{id}                      — Get campaign with projects + characters
PUT    /api/campaigns/{id}                      — Update campaign
DELETE /api/campaigns/{id}                      — Delete campaign
POST   /api/campaigns/{id}/projects/{pid}       — Add project to campaign
POST   /api/campaigns/{id}/characters/{cid}     — Add character to campaign
```

#### 5.2.3 — Frontend: Campaign Dashboard

**File:** `frontend/app/dashboard/page.tsx` (extend)

Campaign card grid above project list, with expand-to-see-projects, status badges, character/project counts.

---

### Step 5.3: Community Templates (Remix)

#### 5.3.1 — Backend: Publish & Community Endpoints

**File:** `backend/app/api/templates.py` (extend)

```
POST /api/templates/{id}/publish    — Make user template public
GET  /api/templates/community       — List published community templates
POST /api/templates/{id}/remix      — Use a community template (increments usage_count)
```

Add fields to Template model: `is_published`, `published_at`, `remix_count`, `rating`.

#### 5.3.2 — Frontend: Community Tab

**File:** `frontend/components/canvas/panels/TemplateBrowserPanel.tsx` (extend)

Add tab: "System" | "My Templates" | "Community" with sort/filter and rating.

#### 5.3.3 — Credit Rewards for Template Creators

**File:** `backend/app/services/subscription_service.py` (extend)

Award 1 credit to creator when their published template is remixed.

---

## Summary: All New Files

### Backend New Files
```
backend/app/models/
├── wardrobe_preset.py          (Phase 1)
├── scene_definition.py         (Phase 2)
├── template.py                 (Phase 2)
├── hook.py                     (Phase 2)
├── campaign.py                 (Phase 5)

backend/app/schemas/
├── wardrobe_preset.py          (Phase 1)
├── scene_definition.py         (Phase 2)
├── template.py                 (Phase 2)
├── hook.py                     (Phase 2)
├── campaign.py                 (Phase 5)

backend/app/api/
├── characters.py               (Phase 1 — new dedicated router)
├── scene_definitions.py        (Phase 2)
├── templates.py                (Phase 2)
├── hooks.py                    (Phase 2)
├── campaigns.py                (Phase 5)

backend/app/services/
├── stitch_service.py           (Phase 4)

backend/app/seeds/
├── scene_definitions.py        (Phase 2)
├── templates.py                (Phase 2)
├── hooks.py                    (Phase 2)

backend/app/workers/
├── stitch_worker.py            (Phase 4)

backend/alembic/versions/
├── YYYYMMDD_evolve_character_to_library.py    (Phase 1)
├── YYYYMMDD_add_new_node_types.py             (Phase 1)
├── YYYYMMDD_add_scene_defs_templates_hooks.py (Phase 2)
├── YYYYMMDD_add_campaigns.py                  (Phase 5)
```

### Backend Modified Files
```
backend/app/models/character.py         — Evolve: project_id → user_id, add new fields
backend/app/models/node.py              — New enum values (CHARACTER, PRODUCT, SETTING, STITCH)
backend/app/models/job.py               — New enum value (VIDEO_STITCH)
backend/app/schemas/node.py             — Mirror enum additions
backend/app/schemas/ai.py               — Update CharacterCreate/Response, add wardrobe_preset_id to VideoGenerateRequest
backend/app/api/ai.py                   — Add stitch endpoint, script-to-graph endpoint; move character endpoints out
backend/app/api/nodes.py                — Add branch endpoint
backend/app/tasks/video_tasks.py        — Load character library + wardrobe + product + setting into prompts
backend/app/services/prompt_service.py  — Add build_product_context(), build_setting_context()
backend/app/services/subscription_service.py — Add template reward credits
backend/app/main.py                     — Mount new routers (characters, scene_definitions, templates, hooks, campaigns)
backend/requirements.txt                — Add ffmpeg-python
```

### Frontend New Files
```
frontend/components/canvas/nodes/
├── CharacterNodeRF.tsx         (Phase 1)
├── ProductNodeRF.tsx           (Phase 1)
├── SettingNodeRF.tsx           (Phase 1)
├── StitchNodeRF.tsx            (Phase 4)

frontend/components/canvas/panels/
├── CharacterLibraryPanel.tsx   (Phase 1 — character picker window)
├── SceneGalleryPanel.tsx       (Phase 2 — scene picker window)
├── TemplateBrowserPanel.tsx    (Phase 2)
├── HookLibraryPanel.tsx        (Phase 2)
├── ABComparisonPanel.tsx       (Phase 3)

frontend/components/canvas/edges/
├── BranchEdge.tsx              (Phase 3)

frontend/components/canvas/dialogs/
├── ExportDialog.tsx            (Phase 4)

frontend/app/
├── script/page.tsx             (Phase 5)
```

### Frontend Modified Files
```
frontend/components/canvas/nodes/index.ts           — Register new node types (character, product, setting, stitch)
frontend/components/canvas/nodes/SceneNodeRF.tsx     — Major enhancement: scene gallery integration, generation logic, chaining
frontend/components/canvas/nodes/VideoNodeRF.tsx     — Add new input handles (character, product, setting) + indicators
frontend/components/canvas/ReactFlowCanvas.tsx       — Update getConnectedData, add handleBranch, add handleStitch, dock items
frontend/components/ui/floating-dock.tsx             — Add new dock items (Character, Scene, Templates)
frontend/lib/api.ts                                  — Add characterLibraryApi, sceneDefinitionsApi, templatesApi, hooksApi, campaignsApi
frontend/app/main/page.tsx                           — Add Script Mode toggle, template browser trigger
frontend/app/dashboard/page.tsx                      — Add campaigns section
```

---

## Summary: Credit Costs for New Features

| Operation | Credits | Rationale |
|-----------|---------|-----------|
| Character Library CRUD | 0 | Encourage character creation |
| Character face analysis | 5 | Existing cost, uses Gemini |
| Wardrobe preset CRUD | 0 | Data entry, no AI |
| Product/Setting node CRUD | 0 | Data entry, no AI |
| Scene definition browsing | 0 | Gallery browsing, no AI |
| Template instantiation | 0 | Stamping graph, no AI |
| Hook generation (AI) | 0 | Use existing free prompt enhancement |
| Branch operation | 0 | Graph cloning, no AI |
| Video generation (per scene) | 25/10 | Existing cost (standard/fast) |
| Video extension (per scene) | 25/10 | Existing cost (standard/fast) |
| Video stitching | 0 | FFmpeg only, no AI — encourages more scenes |
| Export/re-encode | 0 | FFmpeg only |
| Script-to-graph conversion | 0 | Graph creation, no AI |

**Strategy:** Only charge for AI video generation (Veo API calls). Everything else is free to maximize the number of scenes users create (which consume credits).

---

## Implementation Dependencies Graph

```
Phase 1: Foundation
  ├── 1.1 Character Library  ←── no dependencies
  ├── 1.2 Product Node       ←── no dependencies
  └── 1.3 Setting Node       ←── no dependencies
       │
       ▼
Phase 2: Templates
  ├── 2.1 Scene Gallery      ←── benefits from 1.1 (Character picker), but can work independently
  ├── 2.2 Full Templates     ←── depends on 1.1, 1.2, 1.3, 2.1 (templates reference all node types)
  └── 2.3 Hook Library       ←── depends on 1.2 (hooks reference product variables)
       │
       ▼
Phase 3: Branching
  ├── 3.1 Branch Operation   ←── no strict dependency, but more valuable after Scene Gallery exists
  └── 3.2 A/B Canvas         ←── depends on 3.1
       │
       ▼
Phase 4: Assembly
  ├── 4.1 Smart Stitch       ←── depends on having multiple video scenes (any phase)
  └── 4.2 Platform Export     ←── depends on 4.1
       │
       ▼
Phase 5: Growth
  ├── 5.1 Script Mode        ←── depends on 1.1, 2.1 (uses character library + scene definitions)
  ├── 5.2 Campaigns          ←── depends on 1.1 (character sharing across projects)
  └── 5.3 Community Templates ←── depends on 2.2 (template model)
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3. Phases 4 and 5 can be parallelized.
