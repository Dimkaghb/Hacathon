import asyncio
import hashlib
import logging
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

logger = logging.getLogger(__name__)

# InsightFace ArcFace produces 512-dimensional embeddings
FACE_EMBEDDING_DIM = 512


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

    async def _ensure_collection(self, vector_size: int = FACE_EMBEDDING_DIM):
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
                        size=vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection '{settings.QDRANT_COLLECTION}' dim={vector_size}")
            else:
                # Check existing collection dimension — recreate if mismatched
                info = self.client.get_collection(settings.QDRANT_COLLECTION)
                existing_size = info.config.params.vectors.size
                if existing_size != vector_size:
                    logger.warning(
                        f"Qdrant collection dim mismatch: existing={existing_size}, "
                        f"required={vector_size}. Recreating collection."
                    )
                    self.client.delete_collection(settings.QDRANT_COLLECTION)
                    self.client.create_collection(
                        collection_name=settings.QDRANT_COLLECTION,
                        vectors_config=VectorParams(
                            size=vector_size,
                            distance=Distance.COSINE,
                        ),
                    )
                    logger.info(f"Recreated collection with dim={vector_size}")

        await loop.run_in_executor(None, _init)
        self._collection_initialized = True

    async def upsert_embedding(
        self,
        id: str,
        vector: List[float],
        metadata: Dict[str, Any],
    ) -> str:
        await self._ensure_collection(len(vector))

        loop = asyncio.get_event_loop()

        def _upsert():
            point_id = int(hashlib.md5(id.encode()).hexdigest(), 16) % (10**18)
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
        await self._ensure_collection(len(vector))

        loop = asyncio.get_event_loop()

        def _search():
            query_filter = None
            if filter_conditions:
                conditions = [
                    FieldCondition(key=k, match=MatchValue(value=v))
                    for k, v in filter_conditions.items()
                ]
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
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _get():
            point_id = int(hashlib.md5(id.encode()).hexdigest(), 16) % (10**18)
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
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _delete():
            point_id = int(hashlib.md5(id.encode()).hexdigest(), 16) % (10**18)
            self.client.delete(
                collection_name=settings.QDRANT_COLLECTION,
                points_selector=[point_id],
            )
            return True

        return await loop.run_in_executor(None, _delete)

    async def count_embeddings(self) -> int:
        await self._ensure_collection()

        loop = asyncio.get_event_loop()

        def _count():
            info = self.client.get_collection(settings.QDRANT_COLLECTION)
            return info.points_count

        return await loop.run_in_executor(None, _count)


vector_service = VectorService()
