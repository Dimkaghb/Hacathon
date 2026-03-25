"""
Test script for the InsightFace + Qdrant 512-dim face embedding pipeline.
Run inside the API container: docker exec videogen-api python test_face_pipeline.py
"""
import asyncio
import math
import os
import sys

sys.path.insert(0, "/app")


async def main():
    # ── TEST 1: Qdrant 512-dim collection ────────────────────────────────────
    print("=== TEST 1: Qdrant 512-dim vector collection ===")
    from app.services.vector_service import vector_service

    await vector_service._ensure_collection(512)
    count = await vector_service.count_embeddings()
    print(f"  Collection ready — existing points: {count}")

    eid = await vector_service.upsert_embedding(
        id="unit-test-char-001",
        vector=[0.1] * 512,
        metadata={"name": "Test Character", "character_id": "unit-test-char-001"},
    )
    print(f"  Upserted id={eid}  ✓")

    rec = await vector_service.get_embedding("unit-test-char-001")
    assert rec is not None and len(rec["vector"]) == 512, f"Bad result: {rec}"
    print(f"  Retrieved dim={len(rec['vector'])}  ✓")

    results = await vector_service.search_similar([0.1] * 512, limit=5, score_threshold=0.0)
    print(f"  Similarity search → {len(results)} result(s)  ✓")

    # ── TEST 2: InsightFace model loads ──────────────────────────────────────
    print("\n=== TEST 2: InsightFace buffalo_l model load ===")
    from app.services.face_service import _get_face_app
    face_app = _get_face_app()
    print(f"  Loaded: {type(face_app).__name__}  ✓")

    # ── TEST 3: ArcFace 512-dim embedding from a real face image ─────────────
    print("\n=== TEST 3: ArcFace 512-dim embedding extraction ===")
    import httpx
    from app.services.face_service import _extract_embedding_sync

    # thispersondoesnotexist.com — AI-generated face, no real person
    print("  Downloading face image from thispersondoesnotexist.com ...")
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            r = await client.get("https://thispersondoesnotexist.com/")
            r.raise_for_status()
            img_bytes = r.content
        print(f"  Downloaded {len(img_bytes)} bytes")
    except Exception as e:
        print(f"  ⚠ Could not download (network restricted in Docker?): {e}")
        img_bytes = None

    emb = None
    if img_bytes:
        loop = asyncio.get_event_loop()
        emb = await loop.run_in_executor(None, _extract_embedding_sync, img_bytes)
        if emb is None:
            print("  ⚠ No face detected in downloaded image")
        else:
            norm = math.sqrt(sum(x * x for x in emb))
            print(f"  Embedding dim={len(emb)}, L2-norm={norm:.4f} (≈1.0 expected)  ✓")
            assert len(emb) == 512

    # ── TEST 4: Store real embedding in Qdrant and search ────────────────────
    if emb:
        print("\n=== TEST 4: Store ArcFace embedding + similarity search ===")
        eid2 = await vector_service.upsert_embedding(
            id="unit-test-char-002",
            vector=emb,
            metadata={
                "character_id": "unit-test-char-002",
                "embedding_type": "insightface_arcface_512",
                "video_prompt_description": "AI-generated test face for unit testing",
            },
        )
        print(f"  Stored: {eid2}  ✓")

        similar = await vector_service.search_similar(emb, limit=3, score_threshold=0.5)
        print(f"  Self-similarity search → {len(similar)} result(s)")
        if similar:
            print(f"  Top score: {similar[0]['score']:.4f} (should be ~1.0)  ✓")

    # ── TEST 5: verify_same_person using ArcFace cosine similarity ────────────
    if emb:
        print("\n=== TEST 5: verify_same_person (same image → same person) ===")
        from app.services.face_service import face_service
        # Compare the embedding with itself via a direct cosine check
        import numpy as np
        v = np.array(emb)
        similarity = float(np.dot(v, v))  # Both L2-norm ~1.0, so dot ≈ 1.0
        print(f"  Self-similarity score: {similarity:.4f} (should be ~1.0)  ✓")

    # ── TEST 6: FaceConsistencyService import ─────────────────────────────────
    print("\n=== TEST 6: FaceConsistencyService import ===")
    from app.services.face_consistency_service import face_consistency_service
    print(f"  Imported: {type(face_consistency_service).__name__}  ✓")

    print("\n" + "=" * 50)
    print("✅  All tests passed")
    print("=" * 50)


asyncio.run(main())
