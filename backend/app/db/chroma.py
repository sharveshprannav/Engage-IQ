"""
EngageAI Backend — ChromaDB Client Wrapper
Async-compatible ChromaDB client for feedback embeddings, semantic search,
and duplicate detection.
"""

from __future__ import annotations

from typing import Any, Optional

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    HAS_CHROMADB = True
except ImportError:
    chromadb = None
    ChromaSettings = None
    HAS_CHROMADB = False

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Collection name for feedback embeddings
FEEDBACK_COLLECTION = "feedback_embeddings"


class ChromaDBClient:
    """Wrapper around ChromaDB client for feedback embedding operations."""

    def __init__(self) -> None:
        self._client: Optional[chromadb.HttpClient] = None
        self._collection: Optional[chromadb.Collection] = None

    async def initialize(self) -> None:
        """Initialize the ChromaDB client and ensure collection exists."""
        if not HAS_CHROMADB:
            logger.info("chromadb_not_installed_using_fallback")
            return

        try:
            self._client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(
                    anonymized_telemetry=False,
                ),
            )
            # Get or create the feedback embeddings collection
            self._collection = self._client.get_or_create_collection(
                name=FEEDBACK_COLLECTION,
                metadata={
                    "description": "Customer feedback embeddings for semantic search and duplicate detection",
                    "hnsw:space": "cosine",
                },
            )
            logger.info(
                "chromadb_initialized",
                collection=FEEDBACK_COLLECTION,
                count=self._collection.count(),
            )
        except Exception as e:
            logger.error("chromadb_init_failed", error=str(e))
            # Don't crash — ChromaDB might not be available in dev
            self._client = None
            self._collection = None

    @property
    def is_available(self) -> bool:
        """Check if ChromaDB client is connected."""
        return self._client is not None and self._collection is not None

    async def upsert_embedding(
        self,
        embedding_id: str,
        embedding: list[float],
        metadata: dict[str, Any],
        document: str,
    ) -> None:
        """
        Upsert a feedback embedding into ChromaDB.
        
        Args:
            embedding_id: Unique ID for this embedding (usually feedback UUID)
            embedding: The embedding vector
            metadata: Metadata fields (feedback_id, category, sentiment, etc.)
            document: The original text
        """
        if not self.is_available:
            logger.warning("chromadb_unavailable", action="upsert_embedding")
            return

        try:
            self._collection.upsert(
                ids=[embedding_id],
                embeddings=[embedding],
                metadatas=[metadata],
                documents=[document],
            )
            logger.debug("embedding_upserted", id=embedding_id)
        except Exception as e:
            logger.error("embedding_upsert_failed", id=embedding_id, error=str(e))

    async def query_similar(
        self,
        query_embedding: list[float],
        n_results: int = 10,
        where: Optional[dict[str, Any]] = None,
        where_document: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Query for similar embeddings using cosine similarity.
        
        Args:
            query_embedding: The query vector
            n_results: Number of results to return
            where: Metadata filter conditions
            where_document: Document content filter conditions
            
        Returns:
            ChromaDB query results with ids, distances, metadatas, documents
        """
        if not self.is_available:
            logger.warning("chromadb_unavailable", action="query_similar")
            return {"ids": [[]], "distances": [[]], "metadatas": [[]], "documents": [[]]}

        try:
            kwargs: dict[str, Any] = {
                "query_embeddings": [query_embedding],
                "n_results": n_results,
            }
            if where:
                kwargs["where"] = where
            if where_document:
                kwargs["where_document"] = where_document

            results = self._collection.query(**kwargs)
            return results
        except Exception as e:
            logger.error("embedding_query_failed", error=str(e))
            return {"ids": [[]], "distances": [[]], "metadatas": [[]], "documents": [[]]}

    async def check_duplicates(
        self,
        embedding: list[float],
        threshold: Optional[float] = None,
        exclude_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """
        Check for duplicate feedback by cosine similarity.
        
        Args:
            embedding: The embedding to check against
            threshold: Cosine similarity threshold (default from config)
            exclude_id: ID to exclude from results (the item itself)
            
        Returns:
            List of duplicates with {id, similarity, metadata}
        """
        if threshold is None:
            threshold = settings.PRIORITY_DUPLICATE_THRESHOLD

        results = await self.query_similar(
            query_embedding=embedding,
            n_results=5,
        )

        duplicates = []
        if results["ids"] and results["ids"][0]:
            for i, (doc_id, distance) in enumerate(
                zip(results["ids"][0], results["distances"][0])
            ):
                # ChromaDB returns cosine distance, convert to similarity
                similarity = 1 - distance
                if similarity >= threshold and doc_id != exclude_id:
                    duplicates.append({
                        "id": doc_id,
                        "similarity": round(similarity, 4),
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "document": results["documents"][0][i] if results["documents"] else "",
                    })

        return duplicates

    async def get_all_embeddings(
        self,
        where: Optional[dict[str, Any]] = None,
        limit: int = 10000,
    ) -> dict[str, Any]:
        """
        Get all embeddings for clustering operations.
        
        Args:
            where: Optional metadata filter
            limit: Maximum number of embeddings to retrieve
            
        Returns:
            Dict with ids, embeddings, metadatas
        """
        if not self.is_available:
            return {"ids": [], "embeddings": [], "metadatas": []}

        try:
            kwargs: dict[str, Any] = {
                "limit": limit,
                "include": ["embeddings", "metadatas", "documents"],
            }
            if where:
                kwargs["where"] = where

            results = self._collection.get(**kwargs)
            return results
        except Exception as e:
            logger.error("get_all_embeddings_failed", error=str(e))
            return {"ids": [], "embeddings": [], "metadatas": []}

    async def delete_embedding(self, embedding_id: str) -> None:
        """Delete an embedding by ID."""
        if not self.is_available:
            return
        try:
            self._collection.delete(ids=[embedding_id])
        except Exception as e:
            logger.error("embedding_delete_failed", id=embedding_id, error=str(e))

    async def close(self) -> None:
        """Clean up ChromaDB client resources."""
        self._collection = None
        self._client = None


# Singleton instance
chroma_client = ChromaDBClient()
