"""
Document Management & RAG Ingestion API Routes.
"""

import os
import shutil
from pathlib import Path
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models.schemas import DocumentInfo, DocumentChunk, IngestionResponse
from app.services.rag.ingestion import ingest_document
from app.services.rag.vector_store import vector_store
from app.db.storage import storage
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents & RAG Vault"])

@router.post("/upload", response_model=IngestionResponse)
async def upload_document(file: UploadFile = File(...)):
    try:
        dest_path = settings.UPLOAD_DIR / file.filename
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        doc_info, chunks = ingest_document(dest_path, filename=file.filename)
        
        # Save to storage & index in vector DB
        storage.save_document(doc_info, chunks)
        vector_store.add_chunks(chunks)
        
        return IngestionResponse(
            success=True,
            document=doc_info,
            message=f"Successfully ingested and indexed {doc_info.filename} ({doc_info.num_chunks} chunks)."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest document: {str(e)}")

@router.get("/list", response_model=List[DocumentInfo])
async def list_documents():
    docs = storage.get_all_documents()
    if not docs:
        # Auto-load sample materials if nothing loaded yet
        await load_sample_materials()
        docs = storage.get_all_documents()
    return docs

@router.get("/{doc_id}/chunks", response_model=List[DocumentChunk])
async def get_document_chunks(doc_id: str):
    chunks = [c for c in storage.chunks.values() if c.doc_id == doc_id]
    return sorted(chunks, key=lambda x: x.chunk_index)

@router.post("/load-sample", response_model=List[DocumentInfo])
async def load_sample_materials():
    """Ingests all sample notes located in data/sample_materials/"""
    results = []
    if settings.SAMPLE_MATERIALS_DIR.exists():
        for sample_file in settings.SAMPLE_MATERIALS_DIR.glob("*.*"):
            if sample_file.suffix.lower() in [".md", ".txt", ".pdf"]:
                # Check if already ingested
                already_exists = any(d.filename == sample_file.name for d in storage.documents.values())
                if not already_exists:
                    doc_info, chunks = ingest_document(sample_file, filename=sample_file.name)
                    storage.save_document(doc_info, chunks)
                    vector_store.add_chunks(chunks)
                    results.append(doc_info)
    return storage.get_all_documents()
