"""
Reset Qdrant collection with correct dimensions.

Run this if you get dimension mismatch errors.
"""
import asyncio
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from app.config import settings


async def reset_collection():
    """Delete and recreate the collection with correct dimensions."""
    client = QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
    )

    collection_name = settings.QDRANT_COLLECTION

    # Check if collection exists
    collections = client.get_collections().collections
    collection_names = [c.name for c in collections]

    if collection_name in collection_names:
        print(f"Deleting existing collection: {collection_name}")
        client.delete_collection(collection_name)
        print(f"✓ Deleted {collection_name}")

    # Create collection with correct dimensions
    print(f"Creating collection with 768 dimensions (text-embedding-004)")
    client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=768,  # text-embedding-004 dimension
            distance=Distance.COSINE,
        ),
    )
    print(f"✓ Created {collection_name} with correct dimensions")
    print("\nQdrant collection is ready!")


if __name__ == "__main__":
    asyncio.run(reset_collection())
