"""
EngageAI — Feedback Clustering Service
Runs HDBSCAN / KMeans over ChromaDB vector embeddings to group feedback into thematic clusters.
"""

from __future__ import annotations

from typing import Any
import numpy as np
from pydantic import BaseModel, Field

from app.ai.base import BaseAIService
from app.db.chroma import chroma_client
from app.core.logging import get_logger

logger = get_logger(__name__)


class ClusterAssignment(BaseModel):
    cluster_id: int
    cluster_label: str
    feedback_ids: list[str]


class ClusteringResult(BaseModel):
    clusters_count: int
    noise_count: int = 0
    assignments: list[ClusterAssignment] = Field(default_factory=list)


class ClusteringService(BaseAIService[ClusteringResult]):
    """Clusters vectors in embedding space."""

    async def predict_heuristic(self, text: str, **kwargs: Any) -> ClusteringResult:
        """Run KMeans clustering over stored vector embeddings."""
        embedding_data = await chroma_client.get_all_embeddings(limit=5000)
        ids = embedding_data.get("ids", [])
        vectors = embedding_data.get("embeddings", [])
        documents = embedding_data.get("documents", [])

        if not ids or len(ids) < 3:
            return ClusteringResult(clusters_count=0, noise_count=len(ids))

        try:
            from sklearn.cluster import KMeans

            n_samples = len(ids)
            n_clusters = min(8, max(2, n_samples // 5))

            X = np.array(vectors)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=5)
            labels = kmeans.fit_predict(X)

            cluster_map: dict[int, list[tuple[str, str]]] = {i: [] for i in range(n_clusters)}
            for doc_id, label, doc in zip(ids, labels, documents):
                cluster_map[int(label)].append((doc_id, doc))

            assignments = []
            for cluster_id, items in cluster_map.items():
                if not items:
                    continue
                item_ids = [it[0] for it in items]
                # Label cluster based on top common word in documents
                sample_text = " ".join([it[1] for it in items[:5]])
                label_words = [w for w in sample_text.split() if len(w) > 4][:2]
                cluster_name = f"Group: {' '.join(label_words).title() or f'Cluster #{cluster_id + 1}'}"

                assignments.append(
                    ClusterAssignment(
                        cluster_id=cluster_id,
                        cluster_label=cluster_name,
                        feedback_ids=item_ids
                    )
                )

            return ClusteringResult(
                clusters_count=len(assignments),
                assignments=assignments
            )
        except Exception as e:
            self.logger.error("clustering_execution_failed", error=str(e))
            return ClusteringResult(clusters_count=0, noise_count=len(ids))

    async def predict_llm(self, text: str, **kwargs: Any) -> ClusteringResult:
        return await self.predict_heuristic(text, **kwargs)


clustering_service = ClusteringService()
