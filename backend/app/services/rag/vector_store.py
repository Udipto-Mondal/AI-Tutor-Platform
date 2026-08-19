"""
Vector Store & Hybrid Retrieval Engine.
Integrates ChromaDB for dense vector embeddings and provides fallback TF-IDF/Dense search.
"""

import os
import math
import numpy as np
from typing import List, Dict, Any, Optional
from app.models.schemas import DocumentChunk
from app.core.config import settings

class FastLocalEmbeddingFunction:
    """Fast, local TF-IDF / Hashed dense embedding function for ChromaDB without external network downloads."""
    def __call__(self, input: List[str]) -> List[List[float]]:
        embeddings = []
        dim = 128
        for text in input:
            vec = np.zeros(dim, dtype=np.float32)
            words = text.lower().split()
            for w in words:
                idx = hash(w) % dim
                vec[idx] += 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            embeddings.append(vec.tolist())
        return embeddings

    def name(self) -> str:
        return "fast_local_embedding"

class VectorStore:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.in_memory_chunks: Dict[str, DocumentChunk] = {}
        self.embedding_fn = FastLocalEmbeddingFunction()
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            
            persist_dir = str(settings.CHROMA_DIR)
            self.chroma_client = chromadb.PersistentClient(path=persist_dir)
            self.collection = self.chroma_client.get_or_create_collection(
                name="study_vault_v2",
                embedding_function=self.embedding_fn,
                metadata={"hnsw:space": "cosine"}
            )
            print("[VectorStore] ChromaDB initialized successfully at", persist_dir)
        except Exception as e:
            print(f"[VectorStore] ChromaDB fallback mode (In-Memory TF-IDF): {e}")
            self.chroma_client = None
            self.collection = None

    def add_chunks(self, chunks: List[DocumentChunk]):
        for c in chunks:
            self.in_memory_chunks[c.id] = c
            
        if self.collection:
            try:
                ids = [c.id for c in chunks]
                documents = [c.content for c in chunks]
                metadatas = [c.metadata for c in chunks]
                
                # Check for existing
                self.collection.upsert(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            except Exception as e:
                print(f"[VectorStore] Error adding to Chroma: {e}")

    def query(self, query_text: str, top_k: int = 4, doc_ids: Optional[List[str]] = None) -> List[DocumentChunk]:
        if not self.in_memory_chunks:
            return []

        # If Chroma is active, use dense search
        if self.collection:
            try:
                where_clause = None
                if doc_ids and len(doc_ids) == 1:
                    where_clause = {"doc_id": doc_ids[0]}
                    
                results = self.collection.query(
                    query_texts=[query_text],
                    n_results=min(top_k, len(self.in_memory_chunks)),
                    where=where_clause
                )
                
                matched_chunks = []
                if results and results.get("ids") and results["ids"][0]:
                    for chunk_id in results["ids"][0]:
                        if chunk_id in self.in_memory_chunks:
                            matched_chunks.append(self.in_memory_chunks[chunk_id])
                if matched_chunks:
                    return matched_chunks
            except Exception as e:
                print(f"[VectorStore] Chroma query fallback: {e}")

        # In-memory hybrid keyword + TF-IDF cosine ranking fallback
        return self._keyword_search(query_text, top_k=top_k, doc_ids=doc_ids)

    def _keyword_search(self, query: str, top_k: int = 4, doc_ids: Optional[List[str]] = None) -> List[DocumentChunk]:
        query_terms = [t.lower() for t in query.split() if len(t) > 2]
        if not query_terms:
            return list(self.in_memory_chunks.values())[:top_k]
            
        scored_chunks = []
        for c in self.in_memory_chunks.values():
            if doc_ids and c.doc_id not in doc_ids:
                continue
                
            content_lower = c.content.lower()
            score = 0.0
            for term in query_terms:
                count = content_lower.count(term)
                if count > 0:
                    score += 1.0 + math.log(count + 1)
                    
            if score > 0:
                scored_chunks.append((score, c))
                
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        if scored_chunks:
            return [c for _, c in scored_chunks[:top_k]]
        return list(self.in_memory_chunks.values())[:top_k]

vector_store = VectorStore()
