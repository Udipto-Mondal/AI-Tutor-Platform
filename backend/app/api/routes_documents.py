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
        
        # If this filename was previously marked as deleted, restore it now that user uploaded it
        storage.unmark_filename_deleted(file.filename)
        
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
    # Auto-load sample materials ONLY on initial fresh database where user has not deleted anything
    if not docs and not storage.deleted_filenames:
        await load_sample_materials()
        docs = storage.get_all_documents()
    
    # Filter out any files marked as deleted by user
    active_docs = [d for d in docs if not storage.is_filename_deleted(d.filename)]
    
    # Deduplicate: keep the entry with the most chunks for each unique filename
    seen: dict = {}
    for doc in active_docs:
        fname = doc.filename
        if fname not in seen or doc.num_chunks > seen[fname].num_chunks:
            seen[fname] = doc
    return list(seen.values())

@router.get("/{doc_id}/chunks", response_model=List[DocumentChunk])
async def get_document_chunks(doc_id: str):
    return storage.get_document_chunks(doc_id)

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its associated chunks from storage and vector store."""
    doc = storage.documents.get(doc_id)
    if not doc:
        # Search by filename
        doc = next((d for d in storage.documents.values() if d.filename == doc_id), None)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    
    filename = doc.filename
    
    # Find all IDs associated with this filename to remove all duplicate chunks
    all_matching_ids = [d.id for d in storage.documents.values() if d.filename == filename or d.id == doc_id]
    
    # 1. Remove from in-memory vector store
    for m_id in all_matching_ids:
        try:
            vector_store.remove_chunks(m_id)
        except Exception:
            pass  # non-fatal
    
    # 2. Remove from persistent storage (purges all matching records & marks filename deleted)
    storage.delete_document(doc.id)
    storage.mark_filename_deleted(filename)
    
    # 3. Remove physical file from uploads directory (if it was an uploaded file)
    try:
        upload_path = settings.UPLOAD_DIR / filename
        if upload_path.exists():
            upload_path.unlink()
    except Exception:
        pass  # file may not exist if it was a sample
    
    return {"success": True, "message": f"Document '{filename}' permanently deleted.", "doc_id": doc_id}

@router.post("/load-sample", response_model=List[DocumentInfo])
async def load_sample_materials():
    """Ingests sample notes located in data/sample_materials/ if not deleted by user."""
    results = []
    if settings.SAMPLE_MATERIALS_DIR.exists():
        for sample_file in settings.SAMPLE_MATERIALS_DIR.glob("*.*"):
            if sample_file.suffix.lower() in [".md", ".txt", ".pdf"]:
                # If user explicitly deleted this sample material, NEVER re-ingest it!
                if storage.is_filename_deleted(sample_file.name):
                    continue
                    
                # Check if already ingested AND chunks exist in storage
                doc_matches = [d for d in storage.documents.values() if d.filename == sample_file.name]
                has_chunks = bool(doc_matches and any(c.doc_id == doc_matches[0].id for c in storage.chunks.values()))
                
                if not doc_matches or not has_chunks:
                    doc_info, chunks = ingest_document(sample_file, filename=sample_file.name)
                    storage.save_document(doc_info, chunks)
                    vector_store.add_chunks(chunks)
                    results.append(doc_info)
                else:
                    for d in doc_matches:
                        c_list = storage.get_document_chunks(d.id)
                        if c_list:
                            vector_store.add_chunks(c_list)
    return storage.get_all_documents()
