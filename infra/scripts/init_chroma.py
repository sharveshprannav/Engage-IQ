"""
EngageAI — ChromaDB Collection Initialization Script
Ensures feedback_embeddings collection is created with proper metadata schema and HNSW parameters.
"""

import asyncio
from app.db.chroma import chroma_client
from app.core.logging import get_logger

logger = get_logger("InitChromaScript")


async def main():
    print("⚡ Initializing ChromaDB vector collection...")
    await chroma_client.initialize()
    if chroma_client.is_available:
        print("✅ ChromaDB collection 'feedback_embeddings' initialized successfully!")
    else:
        print("⚠️ ChromaDB server unavailable. Continuing in fallback mode.")
    await chroma_client.close()


if __name__ == "__main__":
    asyncio.run(main())
