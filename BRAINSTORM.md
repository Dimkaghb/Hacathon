# Axel Platform Deep Brainstorm: UGC Content Creation Engine

## Current State Assessment

Your platform already has strong foundations:
- Node-based canvas with Prompt → Video → Extension chains
- Character system with face analysis + Qdrant embeddings
- Veo 3.1 integration with extension/chaining (up to 20 segments)
- Credit-based monetization

But right now it's a **generic AI video tool**, not a **UGC content creation machine**. The canvas exposes too much plumbing — users have to manually create Prompt nodes, connect them to Video nodes, wire up characters, manage extensions. That's a developer's mental model, not a content creator's.

---

## The Core Insight

Content creators don't think in "prompts" and "extensions." They think: **"I want Sarah to do a product testimonial hook."** That's it. One character, one scene type, one click.

The complexity should be **hidden inside smart nodes**, not spread across the canvas as separate low-level nodes. The canvas should feel like a **storyboard**, not a wiring diagram.

---

## The Simplest Flow: Character + Scene

The core UX innovation is two **smart node types** that make the most common workflow dead simple. These don't replace the full system (Product Node, Setting Node, Templates, etc. still exist for power users) — they make the 80% use case effortless:

### Character Node
- User clicks "Character" in the dock → **picker window opens** showing their character library
- User selects (or creates) a character → it appears as a **single clean node** on the canvas
- The node shows: face image, name, selected wardrobe — that's it
- Behind the scenes: face analysis, prompt DNA, wardrobe description, performance style are all baked in
- Same character can be used across unlimited projects
- User can create and manage **many characters** in their library

### Scene Node
- User clicks "Scene" in the dock → **picker window opens** showing a gallery of scene types
- Gallery includes: Hooks (curiosity, POV, controversy...), Testimonials, GRWM, Unboxing, Before/After, CTA, etc.
- User picks a scene → it appears as a **single clean node** on the canvas
- The node shows: scene type, editable script text, duration, a "Generate" button — clean and simple
- Behind the scenes: the prompt template, setting/location, camera angle, lighting, tone are all baked into the scene definition
- User can customize the script text but doesn't have to touch prompts, settings, or technical details

### The Magic: Connect and Generate

```
[Character: Sarah] ──→ [Scene: Hook - "Stop scrolling if you have dry skin..."]
```

That's it. User connects Character to Scene, clicks Generate, gets a video. The system internally:
1. Reads Sarah's prompt DNA + wardrobe description
2. Reads the Scene's prompt template + setting + camera + lighting
3. Combines everything into a single optimized Veo prompt
4. Generates the video
5. Shows it inline in the Scene node

**For the simplest case: Character → Scene → Video. For more control, users can still add Product Nodes, Setting Nodes, connect multiple inputs to Video nodes, use Templates, etc.**

---

## Feature Brainstorm

### 1. Character Library (User-Level)

**The Problem:** Every competitor (HeyGen, Creatify, Arcads) treats each video as isolated. When a brand wants 20 variations with the same character, they're starting from zero each time.

**The Idea:** A **persistent Character Library** that lives at the user level. Think of it as a casting directory.

**What each character stores:**
- **Visual identity** — reference images (front, profile, 3/4), face embedding (existing Qdrant system), clothing presets
- **Wardrobe presets** — multiple outfits per character ("casual hoodie", "professional blazer", "towel robe for morning routine"). Each preset has reference images and a prompt snippet describing the look.
- **Prompt DNA** — a refined character description paragraph that produces consistent results in Veo. Evolves as user rates outputs.
- **Voice profile** — tone/energy descriptors for prompt engineering ("enthusiastic but not salesy", "calm authority"). Ready for when Veo adds voice.
- **Performance style** — "talks with hands", "looks slightly off-camera", "natural pauses", "leans into camera"

**How it works on canvas:**
- User clicks "Character" in dock → picker window shows all their characters
- They select one → a Character Node appears showing face image + name + wardrobe selector
- They connect it to one or more Scene nodes
- The character's full prompt DNA + wardrobe is injected automatically into every connected scene

**Why this wins:** Brands spend weeks finding the right AI character. Once they find one that converts, they want to **lock it in** and reuse it in every campaign. No competitor does this well.

---

### 2. Scene Gallery — Pre-Built Smart Scenes

**The Problem:** Content creators think in **formats**: "unboxing," "before/after," "GRWM," "talking head testimonial." They don't think in "write a prompt and connect it to a video node."

**The Idea:** A **Scene Gallery** where each scene type is a self-contained unit with everything baked in.

**What each scene stores internally:**
- **Prompt template** — with variables like `{character}`, `{product}`, `{pain_point}` that get auto-filled
- **Setting** — location, lighting, camera angle (e.g., "bathroom, natural window light, selfie angle")
- **Duration** — default seconds for this scene type
- Tone** — the emotional register ("enthusiastic", "vulnerable", "authoritative")
- **Editable script** — the human-readable text the user sees and can customize

Scene Gallery Categories

| Category | Scene Types | Duration |
|----------|------------|----------|
| **Hooks | Curiosity, POV, Controversy, Social Proof, Relatable, Urgency, Challenge | 3-5s |
| Body** | Problem, Solution, Proof, Tutorial Step, Lifestyle Moment, Product Demo | 5-10s |
| **Closers** | CTA, Before/After Reveal, Testimonial Wrap, Offer/Discount | 3-5s |
| **Full Formats** | Complete Testimonial (4 scenes), GRWM (5 scenes), Unboxing (4 scenes), Day in the Life (6 scenes) | 15-60s |

Single scenes** appear as one node. **Full formats** stamp a pre-connected chain of scene nodes onto the canvas.

**Key UX:** The user sees a clean gallery with thumbnails and descriptions. They pick a scene, it appears on canvas. They edit the script text if they want. They don't touch prompts, settings, or technical details.

---

### 3. Scene Chaining — Multi-Scene Videos

**The Problem:** UGC videos are almost never a single shot. They follow structures: Hook → Problem → Solution → CTA. Each segment needs to extend from the previous one for visual continuity.

**The Idea:** Scene nodes can **chain** — the output of one scene feeds into the next.

```
[Character: Sarah] ──→ [Hook: "Stop scrolling..."]
                                    │
                                    ↓ (auto-extends)
                       [Problem: "I used to struggle..."]
                                    │
                                    ↓ (auto-extends)
                       [CTA: "Link in my bio"]
```

**How it works:**
- First scene in a chain → generates a fresh video (text-to-video or image-to-video via Veo)
- Subsequent scenes → automatically extend the previous video (Veo extension API)
- The `veo_video_uri` flows automatically through the chain — the user never sees it
- Each scene node shows its own video segment inline after generation
- Scenes can be reordered by reconnecting

**The user experience:** Build a storyboard by placing scene nodes in order, connect them top to bottom, hit "Generate All." The system chains everything together.

---

### 4. Product Context — Embedded in Scenes

**The Problem:** Every UGC video is about a **product**. Product details (name, benefits, claims) need to flow into every scene's prompt. But making users create a separate "Product Node" and wire it into every scene is too much friction.

**Two approaches (user chooses):**

**Option A — Product Card (embedded in project)**
- A simple form in the sidebar or project settings: product name, benefits, claims, tone
- Automatically available to every scene node in the project
- Scene templates auto-fill `{product}`, `{benefits}`, `{pain_point}` from the product card

**Option B — Product Node (for power users)**
- A lightweight node on canvas for users who work with multiple products per project
- Connect Product → Scene to override the default product context
- Useful for A/B testing same character + same hook + different products

**Either way:** Product context flows into scene prompts automatically. The user fills in product details once, and every scene knows about it.

---

### 5. Branching — The Variation Engine (Killer Feature)

**The Problem:** Serious DTC brands need **20-40 UGC variations per month**. Different hooks, different angles, same character. Today, each variation is built from scratch.

**The Idea:** Connect the **same Character to multiple Scene nodes** for instant variations.

```
                   ┌──→ [Hook A: "Stop scrolling if..."] → [Body] → [CTA]
                   │
[Character: Sarah] ├──→ [Hook B: "Nobody told me..."] → [Body] → [CTA]
                   │
                   └──→ [Hook C: "POV: You just found..."] → [Body] → [CTA]
```

**How branching works:**
- Right-click any Scene node → "Create Variation" → clones the downstream chain with a vertical offset
- The cloned scenes inherit the same character connection and product context
- Only the branched scene's script text is different
- Generate all variations in one session from one canvas

**A/B Testing View:**
- Side-by-side comparison panel for branched variations
- Tag branches: "Winner", "Loser", "Control"
- Notes field for performance learnings
- Future: connect to Meta/TikTok ad APIs for automatic performance import

**Why this is a killer feature:** This mirrors how real ad creative teams work. They call it "hook testing" — same ad, 5 different hooks, see which one wins. Axel lets them generate all 5 in one session.

---

### 6. Smart Stitch — Automatic Video Assembly

**The Problem:** Scene chaining via Veo extension creates continuous video, but users may also want to combine separately-generated scenes or add transitions.

**The Idea:** A **Stitch Node** that takes multiple completed scene nodes and assembles them into a final cut:
- Define scene order by connection sequence
- Add transition hints (hard cut, fade, crossfade)
- Export in platform-specific formats (9:16 for TikTok, 4:5 for Instagram feed, 1:1 for stories)
- **0 credits** — assembly only, no AI generation

This separates **generation** (creative, expensive) from **assembly** (mechanical, free).

---

### 7. Script Mode — For Writers Who Don't Think Visually

**The Problem:** Some users are copywriters, not visual thinkers. The canvas can be intimidating.

**The Idea:** A **Script Mode** that's a simple text editor:

```
CHARACTER: Sarah (casual look)
PRODUCT: GlowSerum Pro

---

[HOOK - 3s]
"Okay I need to tell you about this serum because it literally changed my skin"

[PROBLEM - 5s]
"I've tried everything for my dry patches. Nothing worked."

[SOLUTION - 8s]
"My dermatologist recommended GlowSerum and look at this texture now"

[CTA - 3s]
"Link in my bio, you're welcome"
```

Hit "Generate" → the system **auto-creates the canvas** (Character + Scene chain), generates all scenes. The user never touches the canvas unless they want to.

Toggle to Canvas Mode at any time to see and modify the generated storyboard.

---

### 8. Campaign Organization

**The Problem:** A brand running a real UGC operation has: 3 characters, 5 products, 4 scene templates, generating 30+ variations per month. A flat project list won't scale.

**The Idea:** A **Campaign** level above Projects:

```
Campaign: "Summer Skincare Launch"
├── Characters: Beach Sarah, Lab Coat Emily
├── Products: SPF50 Sunscreen, After-Sun Serum
├── Project: Hook Testing — SPF50 (15 variations)
├── Project: Testimonial Series — Serum (5 videos)
└── Project: Before/After — Both Products (8 videos)
```

Characters and Products live at the Campaign level and are shared across all projects within it.

---

### 9. Community Scene Library (Remix)

**The Problem:** Building a scene library is expensive. Your best users will create better scene definitions than you can pre-build.

**The Idea:** Let users **publish** their custom scenes as community templates:
- "Sarah's Viral Curiosity Hook" → 47 uses
- "DTC Skincare 3-Scene Testimonial" → 120 uses
- "TikTok Shop Review Formula" → 89 uses

Creators earn credits when others use their scenes. Flywheel: better scenes → more users → more scenes.

---

### 10. Content Calendar Mode (Future)

The canvas zooms out to show a **calendar grid**. Each day has slots for content. Users drag scene templates onto days, assign characters and products, and hit "Generate Week." The platform batch-generates an entire week's worth of content overnight.

This is where "AI video tool" becomes "AI content team."

---

## Prioritized Implementation Roadmap

### Phase 1 — Smart Nodes (Weeks 1-3)
1. **Character Library** — User-level character management with wardrobe presets
2. **Character Node** — Picker-based node that references character library
3. **Scene Gallery** — Pre-built scene definitions with prompt templates, settings, duration
4. **Scene Node** — Picker-based node that encapsulates all scene logic + video generation

This is the core paradigm shift. After this phase, the canvas feels completely different.

### Phase 2 — Chaining & Product (Weeks 3-5)
5. **Scene Chaining** — Auto-extension when scenes are connected in sequence
6. **Product Context** — Sidebar product card + optional Product node for power users
7. **"Full Format" Templates** — Pre-connected scene chains (Testimonial, GRWM, etc.)

### Phase 3 — Branching & Testing (Weeks 5-7)
8. **Branch from any Scene** — Clone downstream chain with variation
9. **A/B Comparison View** — Side-by-side comparison of branched variations

### Phase 4 — Assembly & Export (Weeks 7-9)
10. **Smart Stitch** — FFmpeg-based scene assembly (0 credits)
11. **Platform Export** — Aspect ratio presets for TikTok, Reels, Shorts, YouTube

### Phase 5 — Accessibility & Growth (Weeks 9-12)
12. **Script Mode** — Text-first workflow that auto-generates canvas
13. **Campaign Organization** — Multi-project hierarchy with shared characters/products
14. **Community Scene Library** — User-published scenes with credit rewards

---

## The Competitive Moat

Every competitor (HeyGen, Creatify, Arcads) offers a **linear** workflow: pick avatar → write script → generate video. One video at a time. Done.

Axel's canvas enables something fundamentally different: **a visual storyboard where Character + Scene = Video**, with branching for instant variations and chaining for multi-scene content.

**The positioning: "Axel is where brands build content systems, not individual videos."**

A brand doesn't want one video. They want:
- 1 character × 5 hooks × 1 product = **5 hook variations in one canvas**
- Pick the winner → extend it into a full testimonial → export for TikTok + Reels
- Next week: same character, new product, same winning hook structure → **5 more variations in minutes**

Nobody else has this architecture. The two-node paradigm makes it dead simple for beginners while the canvas gives power users full control.
