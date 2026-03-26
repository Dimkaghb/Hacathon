# Axel Pitch Speech

**Duration:** ~6 Minutes | **Tone:** Clear, Expert, Direct

---

## I. The Problem: The "Slot Machine" Effect (0:00 - 1:15)

"Good afternoon. Look at this video. These AI avatars are viral, but there is a major problem for real brands: **Character Drift.**

Right now, AI video generation is like a **slot machine**. You type a prompt, you pull the lever, and you pray the result is consistent. If you need the same character to appear in multiple videos, the face changes and the lighting shifts.

In the industry, we call this **'AI Slop.'** It is unusable for long-term marketing because brands need 100% control. This is why I built **Axel**."

---

## II. The Solution: A Stateful Canvas UI (1:15 - 2:15)

"Axel is a platform built for **deterministic control**. I moved away from the simple text box and replaced it with a **node-based canvas**.

Think of it as a **Directed Acyclic Graph (DAG)** for video. Instead of guessing what the AI will do, I allow creators to build their videos like a machine. You connect components, set parameters, and define the logic. I am not just giving you a generator; I am giving you a professional, repeatable workflow."

---

## III. Deep Dive: Identity Lock & Vector Math (2:15 - 3:30)

"The biggest problem I solved is character consistency. I call this the **Identity Lock**.

Technically, I use the **InsightFace ArcFace model** to extract a **512-dimensional feature vector** from a reference image. This embedding represents the 'Digital DNA' of a face — the distance between the eyes, the jaw curvature, the cheekbone geometry — all encoded into 512 floating-point numbers.

I store these vectors in a **Qdrant vector database** with **cosine distance** and **HNSW indexing**. During generation, the system retrieves the character's embedding and its associated **Gemini 2.0 Flash visual analysis** — a structured breakdown of skin tone, hair, eye shape, and distinctive features — which gets injected directly into the video prompt.

But here is the key breakthrough. When a Character node is connected, Axel takes the character's source image and passes it as the **first frame** to **Google Veo 3.1's image-to-video pipeline**. Veo does not just read a description — it literally **starts the video from the character's face** and animates forward. The identity is anchored from frame one.

So I have three layers: the source image anchoring the visual identity, the Gemini description enriching the prompt, and the ArcFace embedding available for cosine similarity verification. The character stays the same not because I am hoping — but because mathematically, there is nowhere else for the generation to go."

---

## IV. Architecture: LangGraph & Non-Destructive Branching (3:30 - 4:45)

"To manage the logic, I use **LangGraph**.

Standard video tools are 'stateless' — if you change one small detail, you have to restart the whole render, which wastes GPU power. In Axel, I treat the pipeline as a **Stateful Multi-Agent Graph**.

The breakthrough here is **Checkpointing**. Because LangGraph saves the **'Shared State'** at every single node, I can offer **Non-Destructive Branching**.

**Example:** If you make a video of a character in Paris, and then you want that same character in Italy, you don't re-render the whole project. You just fork the graph at the 'Setting' node. Axel uses the **saved checkpoint** for the character identity — the 512-dim embedding, the Gemini analysis, the source image — and only recalculates the **delta**: the new environment. Combined with my **Celery worker pools** that run async video generation and face analysis on separate queues, this reduces compute costs dramatically and allows for real-time versioning.

Each generated video stores a **Veo video URI** for temporal continuity — I can chain up to **20 sequential extensions**, each seamlessly continuing from the last frame. Combined with my **FFmpeg stitching pipeline** that supports cut and crossfade transitions, creators build full-length content from 8-second building blocks."

---

## V. Market & Demo (4:45 - 5:30)

*(Visual: 1.5-minute demo showing the Canvas UI, the Character Library, the Qdrant retrieval, and the Paris-to-Italy branch)*

"As you can see in the demo, the interface is designed for speed.

I also built a **template system** with 7 production-ready blueprints — Product Testimonial, GRWM, Before/After, Unboxing — each a pre-built node graph that stamps onto the canvas. Users can **publish templates** to the community, other creators **remix** them, and the original creator earns bonus credits. This creates a **flywheel** that scales content production.

The market is moving toward **Hyper-Personalized Content**. Brands no longer want one video for everyone; they want a thousand videos tailored for different people. Axel is the engine that makes this level of production possible and affordable."

---

## VI. About Me & Closing (5:30 - 6:00)

"My name is Dinmukhammed. I am a finalist of the nFactorial incubator and I work as an AI Engineer at Choco-holding. My background is in building automated AI systems that solve real-world business friction.

I am building Axel to be the professional standard for controlled AI video. Thank you for your time, and I am ready for your questions."

---

---

# PART 2: Tech Concepts Explained (Study This)

Before the Q&A section, here is a plain-language explanation of every technical concept you mention in the speech. Understand these deeply — do not memorize, understand.

---

### ArcFace & the 512-Dimensional Embedding

ArcFace is a **loss function**, not a model architecture. The actual neural network is a ResNet-50 (called `w600k_r50` in InsightFace's buffalo_l pack). It was trained on 600,000 face identities.

What makes ArcFace special is how it was trained. Standard classification says "push this face toward its class." ArcFace adds an **angular margin penalty** — it forces the network to separate faces by a fixed angular gap on a hypersphere. Think of it like this: normal training says "get close to your class." ArcFace says "get close, but leave a mandatory gap of 0.5 radians to every other class." This produces embeddings that are tightly clustered per identity and widely separated between identities.

The output is 512 floating-point numbers. Each number is not "eye distance" or "jaw width" — they are abstract learned features. A human cannot look at dimension #347 and say what it means. But the model learned that these 512 dimensions, taken together, uniquely fingerprint a face. Two photos of you will produce vectors with cosine similarity > 0.5. Your photo vs. a stranger will be < 0.3.

**Key fact:** InsightFace's ArcFace output is NOT L2-normalized by default. The raw norm is ~25-30. Qdrant handles this internally when using cosine distance (it normalizes before comparing). But if you compute cosine similarity manually (like in `verify_same_person`), you MUST normalize first: `v = v / (norm(v) + 1e-8)`.

---

### Cosine Similarity vs. Euclidean Distance

You store vectors with **cosine distance** in Qdrant. Why not Euclidean?

Cosine similarity measures the **angle** between two vectors, ignoring magnitude. Euclidean distance measures the **straight-line distance**. For face embeddings, the angle is what matters — two photos of the same person might have different lighting, causing different magnitudes, but the direction stays the same.

Formula: `cos(A, B) = dot(A, B) / (|A| * |B|)`

Range: -1 to 1 (1 = identical direction, 0 = orthogonal, -1 = opposite).

Your thresholds: 0.5 for same-person verification (permissive), 0.75 for character matching in search (strict).

---

### HNSW (Hierarchical Navigable Small World)

Brute-force vector search compares the query against every stored vector. For 1 million faces, that is 1 million dot products — too slow for real-time.

HNSW builds a **multi-layer graph** over the vectors. The top layer has few nodes and long-distance connections (like an express highway). Each lower layer has more nodes and shorter connections (like local streets). To search, you start at the top layer, hop to the closest neighbor, drop to the next layer, repeat. You quickly zoom from the global neighborhood to the exact match.

Complexity: O(log N) instead of O(N). For 1 million vectors, brute force = 1M comparisons. HNSW ≈ 20 comparisons. That is why search takes <10ms.

**Trade-off:** HNSW uses more memory (stores the graph structure) and insert is slower than brute force. But for read-heavy workloads like face retrieval, it is the industry standard.

---

### Qdrant Point ID Generation

Qdrant requires integer point IDs. Character IDs are UUIDs (strings). The conversion:

```python
point_id = int(hashlib.md5(id.encode()).hexdigest(), 16) % (10**18)
```

Why `hashlib.md5` and not Python's `hash()`? Because Python's `hash()` is randomized per process (PYTHONHASHSEED). The Celery worker and FastAPI server are different processes — `hash("abc")` returns different values in each. This caused a real bug: the worker stored the embedding under hash X, the API looked it up under hash Y, and got nothing. MD5 is deterministic across all processes.

---

### Image-to-Video as Identity Anchor

Veo 3.1 supports two modes: text-to-video and image-to-video. In image-to-video, you provide a reference image as the **first frame**, and Veo animates forward from it.

This is the strongest signal for character consistency. The model does not interpret a text description of "brown-haired woman with green eyes" — it sees the actual pixels of that face and generates motion that preserves them. The face shape, skin color, bone structure — they are all baked into frame 1, and the temporal model propagates them forward.

In your code, when `image_url` is not provided by the user but a Character node is connected with a source image, that source image automatically becomes the `effective_image_url` — turning text-to-video into image-to-video silently.

---

### Gemini 2.0 Flash Visual Analysis

The second parallel pipeline. While ArcFace extracts a numeric vector, Gemini reads the image and produces a **structured JSON**:

```json
{
  "demographics": {"age_range": "25-30", "gender_presentation": "feminine"},
  "facial_structure": {"face_shape": "oval", "jawline": "soft"},
  "features": {"eye_color": "green", "eye_shape": "almond"},
  "hair": {"color": "dark brown", "length": "medium"},
  "video_prompt_description": "A 25-30 year old woman with oval face, green almond eyes, medium dark brown wavy hair..."
}
```

The `video_prompt_description` field gets appended to the Veo prompt. This is the text-level guidance that complements the image-level anchoring.

---

### LangGraph Shared State & Checkpointing

LangGraph is a framework for building stateful, multi-step AI workflows as graphs. Each node is a function that reads and writes to a shared state dictionary. The state persists between steps and can be checkpointed (saved to disk/database).

In Axel's context: the character embedding, the Gemini analysis, the wardrobe preset, the product context — all of this is "state" that flows through the graph. When you fork a branch (change the Setting node from Paris to Italy), the character state is already checkpointed. Only the Setting node recalculates. This is analogous to Git branching — you do not re-clone the whole repo, you branch from the existing commit.

The Celery worker pools are the execution engine: the `video` queue handles Veo generation, the `face` queue handles InsightFace analysis. Each worker reads the checkpointed state, executes its step, and writes the result back.

---

### Veo Video Extension & Temporal Continuity

When Veo generates a video, it returns a `veo_video_uri` — a server-side reference to the generated video. To extend, you pass this URI back to Veo with a new prompt. Veo reads the last frames of the original and generates new frames that seamlessly continue.

Limitation: extension only works at 720p, and only with Veo-generated videos (you cannot extend a video you uploaded). Maximum 20 extensions per chain. Each extension also returns a new `veo_video_uri` for further chaining.

---

### Credit System & Failure Recovery

Credits use a **SELECT FOR UPDATE** lock to prevent race conditions (two simultaneous generations draining the same balance). The transaction log is append-only — every deduction, refund, and allocation is a row. The current balance is the sum of all transactions, but it is also cached on the Subscription model for performance.

Failure recovery: Celery tasks retry 3 times with exponential backoff (30s, 60s, 120s + jitter). On permanent failure, `refund_credits_sync` writes a REFUND transaction. This uses a sync SQLAlchemy session (not async) because Celery tasks run in their own event loop.

---

---

# PART 3: Tricky Questions from PhD/SWE Judges

---

### Q1: "ArcFace embeddings are trained on face recognition, not generation. How does a recognition embedding actually help a generative model produce consistent faces?"

**Answer:** "You are right — the ArcFace embedding does not directly feed into Veo's latent space. Veo has no embedding input port. What I do is use the embedding for three indirect purposes. First, as a **retrieval key** — when a character is selected, I use the embedding to look up the stored Gemini visual analysis from Qdrant metadata, which becomes the text prompt. Second, as a **verification signal** — after generation, I can extract the ArcFace embedding from the output video frames and compare cosine similarity against the reference to score consistency. Third, the embedding is a prerequisite for the InsightFace face swap pipeline if I enable post-processing. But the primary consistency driver is not the embedding itself — it is passing the character's source image as the **first frame** via image-to-video. The embedding is the index, the image is the anchor."

---

### Q2: "You say cosine similarity threshold of 0.5 for verification. ArcFace papers report 0.28-0.35 as optimal thresholds on LFW. Why is yours so high? Aren't you getting false negatives?"

**Answer:** "Good catch. The canonical ArcFace thresholds are measured on L2-normalized embeddings on academic benchmarks like LFW with controlled conditions. My threshold is higher because I am operating in a different context — comparing AI-generated faces against real reference photos. Generated faces have artifacts, style variations, and subtle deformations that real-to-real comparisons do not. A threshold of 0.28 would match too aggressively and flag clearly different AI faces as 'same person.' I tuned 0.5 empirically — it catches genuine identity matches while rejecting Veo's hallucinated variations. For the character search use case (finding similar characters in the library), I use 0.75 because there I want high precision, not recall."

---

### Q3: "HNSW gives approximate nearest neighbors, not exact. What is your recall rate, and how do you handle the case where the correct character is missed?"

**Answer:** "For my use case, HNSW recall is not a critical concern because I am not doing open-set search. When a user generates a video, the character ID is explicitly selected in the UI — the Character node stores the character_id directly. I look up the embedding by ID, not by similarity search. The HNSW search is only used for the 'find similar characters' feature and same-person verification, where approximate results are acceptable. In those cases, Qdrant's default HNSW parameters — `m=16, ef_construction=200` — give >99% recall@10 for collections under 100k vectors, which is well above my expected scale."

---

### Q4: "You hash UUIDs with MD5 to create Qdrant point IDs. MD5 has known collision properties. With modulo 10^18, what is your collision probability, and what happens if two characters collide?"

**Answer:** "The hash space after modulo is 10^18, roughly 60 bits. By the birthday paradox, collision probability exceeds 1% at approximately sqrt(2 * 10^18) ≈ 1.4 billion characters. My application will never have more than a few million characters. At 1 million characters, collision probability is approximately 5 * 10^-7 — effectively zero. If a collision did happen, one character's embedding would overwrite the other in Qdrant's upsert. In production, I would add a collision check — retrieve the point after insert and verify the `original_id` in the payload matches. But at current scale, the math says this is not a practical risk."

---

### Q5: "Image-to-video anchoring gives you frame 1 consistency. But diffusion models can drift significantly by frame 192. How do you prevent temporal identity drift within a single 8-second clip?"

**Answer:** "I rely on Veo 3.1's internal temporal attention mechanism — it is not a frame-by-frame diffusion model, it is a video-native architecture that generates all frames jointly with temporal consistency built into the attention layers. Google's published benchmarks show strong identity preservation across 8-second clips when starting from a reference image. For longer content that chains multiple 8-second clips via extensions, each extension receives the previous clip's `veo_video_uri` — Veo reads the tail frames and continues, so identity anchoring carries forward. If I detect drift across clips, I can run ArcFace on extracted keyframes and flag clips where cosine similarity drops below threshold for manual review or re-generation."

---

### Q6: "You mentioned LangGraph checkpointing. LangGraph checkpoints are typically stored in SQLite or PostgreSQL via LangGraph's built-in checkpointer. Which checkpointer backend do you use, and how do you handle checkpoint size with 512-dim embeddings?"

**Answer:** "I use PostgreSQL as the persistence layer. The checkpoint state includes the character metadata, the Gemini analysis JSON, and generation parameters — but not the raw 512-dim embedding vector itself. The embedding stays in Qdrant and is referenced by character_id. The checkpoint stores the ID, Qdrant stores the vector. This keeps checkpoint size small — typically under 10KB per node state. When a branch is forked, the system loads the checkpoint, resolves the character_id to retrieve the embedding from Qdrant, and only recalculates the nodes that changed. The Qdrant retrieval adds ~5-10ms, which is negligible compared to the 2-6 minute Veo generation time."

---

### Q7: "Gemini 2.0 Flash analysis and ArcFace extraction run in parallel. What happens if Gemini returns a description that contradicts the ArcFace embedding — for example, Gemini says 'blue eyes' but the actual face has brown eyes?"

**Answer:** "They serve different purposes, so a contradiction does not create a conflict. The ArcFace embedding is a 512-dim numeric vector — it does not contain interpretable attributes like 'eye color.' It captures holistic face geometry for similarity matching. The Gemini description is text that gets injected into the Veo prompt for guidance. If Gemini hallucinates 'blue eyes' on a brown-eyed face, the image-to-video pipeline still wins — Veo sees the actual pixels of brown eyes in the source image. The text prompt is a soft hint; the image input is a hard constraint. In practice, Gemini 2.0 Flash is quite accurate on visible facial features. But even when it is wrong, the system's three-layer design means one layer's error is overridden by the others."

---

### Q8: "Your Celery workers use `asyncio.new_event_loop()` inside synchronous tasks. This is an anti-pattern — you are creating and destroying event loops per task. Why not use an async-native task framework like `arq` or Celery's async support?"

**Answer:** "You are correct — `new_event_loop()` per task is not ideal. The reason is pragmatic: Celery's native async task support was experimental and unreliable when I started building this. The `loop.run_until_complete()` pattern gives me deterministic control over when async calls execute within the synchronous Celery task boundary. Each task creates one loop, uses it for all async operations (Veo polling, GCS uploads, face processing), and closes it in a `finally` block. The overhead of loop creation is microseconds — negligible compared to the 2-6 minute Veo generation. For production at scale, I would move to a fully async worker like `arq` or Celery with the `gevent` pool. But at current throughput — tens of jobs per hour — this pattern works reliably."

---

### Q9: "You store face embeddings in Qdrant but character metadata in PostgreSQL. This is a dual-write problem. What happens if the Qdrant upsert succeeds but the PostgreSQL commit fails, or vice versa?"

**Answer:** "Good observation. The flow is: PostgreSQL first, Qdrant second. When a character is created, the Character row is committed to PostgreSQL. Then the face analysis Celery task runs asynchronously — it extracts the embedding and upserts to Qdrant. If the Qdrant upsert fails, the character exists in PostgreSQL but has no embedding — the `embedding_id` field stays null. The system handles this gracefully: generation falls back to text-only prompt injection without the embedding. The user can retry face analysis manually. The reverse case — Qdrant succeeds, PostgreSQL fails — cannot happen because the PostgreSQL commit triggers the Celery task. If PostgreSQL rolls back, the task is never dispatched. It is an eventually-consistent design: PostgreSQL is the source of truth, Qdrant is a derived index that can be rebuilt from the source images at any time."

---

### Q10: "Veo 3.1 is a closed API. You have no control over the model weights, the latent space, or the attention mechanism. How is this different from any other wrapper around an API? What is your actual moat?"

**Answer:** "Fair question. The moat is not the API call — anyone can call Veo. The moat is the **orchestration layer** that makes the output deterministic and repeatable.

Without Axel, a user types a prompt and gets a random result. With Axel, the same character node + the same setting node + the same prompt node produces the same visual identity every time, because the source image anchors the generation, the embedding validates it, and the prompt is enriched with structured character data.

The second moat is the **workflow graph itself** — the templates, the campaigns, the extension chaining. A brand does not want to call an API. They want to produce 50 variations of a product video with the same spokesperson. That requires node-based composition, template instantiation with variable substitution, and credit management. The API is the engine, but Axel is the car.

And if Google ships a better model tomorrow, I swap one line — the `VEO_MODEL` config — and every workflow upgrades instantly. My value is model-agnostic."
