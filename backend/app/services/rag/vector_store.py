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
    def __call__(self, input: Any) -> List[List[float]]:
        embeddings = []
        dim = 128
        if isinstance(input, str):
            items = [input]
        elif isinstance(input, (list, tuple)):
            items = []
            for it in input:
                if isinstance(it, (list, tuple)):
                    items.append(" ".join(str(x) for x in it))
                else:
                    items.append(str(it))
        else:
            items = [str(input)]
            
        for text in items:
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

    def embed_query(self, input=None, query=None, *args, **kwargs) -> List[float]:
        val = input if input is not None else (query if query is not None else (args[0] if args else ""))
        if isinstance(val, (list, tuple)):
            val = val[0] if val else ""
        return self([str(val)])[0] if val else [0.0] * 128

    def embed_documents(self, input=None, documents=None, *args, **kwargs) -> List[List[float]]:
        docs = input if input is not None else (documents if documents is not None else (args[0] if args else []))
        return self(docs) if docs else []

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

    def remove_chunks(self, doc_id: str):
        """Remove all chunks belonging to a document from in-memory index and ChromaDB."""
        chunk_ids = [cid for cid, c in self.in_memory_chunks.items() if c.doc_id == doc_id]
        for cid in chunk_ids:
            del self.in_memory_chunks[cid]
        if self.collection and chunk_ids:
            try:
                self.collection.delete(ids=chunk_ids)
            except Exception as e:
                print(f"[VectorStore] Chroma delete warning: {e}")

    def hydrate_from_storage(self):
        try:
            from app.db.storage import storage
            if storage.chunks:
                for c in storage.chunks.values():
                    self.in_memory_chunks[c.id] = c
                if self.collection and self.in_memory_chunks:
                    self.collection.upsert(
                        ids=[c.id for c in self.in_memory_chunks.values()],
                        documents=[c.content for c in self.in_memory_chunks.values()],
                        metadatas=[c.metadata for c in self.in_memory_chunks.values()]
                    )
        except Exception as e:
            print(f"[VectorStore] Hydration warning: {e}")

    def query(self, query_text: str, top_k: int = 4, doc_ids: Optional[List[str]] = None) -> List[DocumentChunk]:
        if not self.in_memory_chunks:
            self.hydrate_from_storage()
            
        if not self.in_memory_chunks:
            return []

        # If Chroma is active, use dense search
        if self.collection:
            try:
                where_clause = None
                if doc_ids and len(doc_ids) == 1:
                    where_clause = {"doc_id": doc_ids[0]}
                    
                query_vec = self.embedding_fn([query_text])
                results = self.collection.query(
                    query_embeddings=query_vec,
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
        
        # Get candidate pool: filter by doc_ids if specified
        candidate_chunks = [
            c for c in self.in_memory_chunks.values()
            if not doc_ids or c.doc_id in doc_ids
        ]
        
        if not candidate_chunks:
            return []
        
        if not query_terms:
            return candidate_chunks[:top_k]
            
        scored_chunks = []
        for c in candidate_chunks:
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
        # Return all doc-filtered chunks if no keyword matched (non-Latin / Bengali text case)
        return candidate_chunks[:top_k]

vector_store = VectorStore()
