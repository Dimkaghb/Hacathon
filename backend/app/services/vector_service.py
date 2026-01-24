import asyncio
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

from app.config import settings


class VectorService:
    def __init__(self):
        self._client = None
        self._collection_initialized = False

    @property
    def client(self):
        if self._client is None:
            self._client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
            )
        return self._client

    async def _ensure_collection(self):
        """Ensure the collection exists with proper configuration."""
        if self._collection_initialized:
            return

        loop = asyncio.get_event_loop()

        def _init():
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]

            if settings.QDRANT_COLLECTION not in collection_names:
                self.client.create_collection(
                    collection_name=settings.QDRANT_COLLECTION,
                    vectors_config=VectorParams(
                        size=768,  # text-embedding-004 dimension
                        distance=Distance.COSINE,
                    ),
                )

        await loop.run_in_executor(None, _init)
        self._collection_initialized = True

    async def upsert_embedding(
        self,
        id: str,
        vector: List[float],
        metadata: Dict[str, Any],
    ) -> str:
        """
        Insert or update an embedding in the vector database.

        Args:
            id: Unique identifier for the embedding
            vector: Embedding vector
            metadata: Associated metadata

        Returns:
            The embedding ID
        """
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _upsert():
            # Convert string ID to integer hash for Qdrant
            point_id = abs(hash(id)) % (10**18)

            self.client.upsert(
                collection_name=settings.QDRANT_COLLECTION,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={**metadata, "original_id": id},
                    )
                ],
            )
            return id

        return await loop.run_in_executor(None, _upsert)

    async def search_similar(
        self,
        vector: List[float],
        limit: int = 5,
        score_threshold: float = 0.7,
        filter_conditions: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search for similar vectors.

        Args:
            vector: Query vector
            limit: Maximum number of results
            score_threshold: Minimum similarity score
            filter_conditions: Optional metadata filters

        Returns:
            List of results with scores and metadata
        """
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _search():
            query_filter = None
            if filter_conditions:
                conditions = []
                for key, value in filter_conditions.items():
                    conditions.append(
                        FieldCondition(
                            key=key,
                            match=MatchValue(value=value),
                        )
                    )
                query_filter = Filter(must=conditions)

            results = self.client.search(
                collection_name=settings.QDRANT_COLLECTION,
                query_vector=vector,
                limit=limit,
                score_threshold=score_threshold,
                query_filter=query_filter,
            )

            return [
                {
                    "id": result.payload.get("original_id", str(result.id)),
                    "score": result.score,
                    "metadata": result.payload,
                }
                for result in results
            ]

        return await loop.run_in_executor(None, _search)

    async def get_embedding(self, id: str) -> Optional[Dict[str, Any]]:
        """
        Get an embedding by ID.

        Args:
            id: Embedding ID

        Returns:
            Embedding data with vector and metadata, or None
        """
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _get():
            point_id = abs(hash(id)) % (10**18)
            results = self.client.retrieve(
                collection_name=settings.QDRANT_COLLECTION,
                ids=[point_id],
                with_vectors=True,
            )

            if results:
                point = results[0]
                return {
                    "id": id,
                    "vector": point.vector,
                    "metadata": point.payload,
                }
            return None

        return await loop.run_in_executor(None, _get)

    async def delete_embedding(self, id: str) -> bool:
        """
        Delete an embedding by ID.

        Args:
            id: Embedding ID

        Returns:
            True if deleted
        """
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _delete():
            point_id = abs(hash(id)) % (10**18)
            self.client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=[point_id],
            )
            return True

        return await loop.run_in_executor(None, _delete)

    async def count_embeddings(self) -> int:
        """
        Get the total count of embeddings in the collection.

        Returns:
            Number of embeddings
        """
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _count():
            info = self.client.get_collection(settings.QDRANT_COLLECTION)
            return info.points_count

        return await loop.run_in_executor(None, _count)


vector_service = VectorService()
