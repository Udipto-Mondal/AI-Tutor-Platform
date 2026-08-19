"""
Document Ingestion & Semantic Chunking Engine.
Supports PDF, Markdown, Plain Text, and DOCX files.
Extracts semantic metadata and produces overlap-controlled chunks.
"""

import os
import re
import uuid
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone

from app.models.schemas import DocumentInfo, DocumentChunk
from app.core.config import settings

def extract_text_from_file(filepath: Path) -> str:
    ext = filepath.suffix.lower()
    text = ""
    
    if ext in [".txt", ".md", ".markdown"]:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
            
    elif ext == ".pdf":
        try:
            import pypdf
            reader = pypdf.PdfReader(str(filepath))
            pages = []
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    pages.append(f"--- Page {i+1} ---\n{page_text}")
            text = "\n\n".join(pages)
        except Exception as e:
            print(f"Error reading PDF {filepath}: {e}")
            
    elif ext in [".docx", ".doc"]:
        try:
            import docx
            doc = docx.Document(str(filepath))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            text = "\n\n".join(paragraphs)
        except Exception as e:
            print(f"Error reading Word document {filepath}: {e}")
            
    else:
        # Fallback raw text attempt
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
        except Exception as e:
            print(f"Unsupported file format: {ext} ({e})")
            
    return text

def extract_topics_from_text(text: str) -> List[str]:
    # Extract markdown headers or prominent topic names
    headers = re.findall(r"^#{1,3}\s+(.+)$", text, flags=re.MULTILINE)
    cleaned_topics = []
    
    for h in headers:
        clean_h = re.sub(r"^\d+[\.\)]\s*", "", h).strip()
        clean_h = re.sub(r"[:#]", "", clean_h).strip()
        if len(clean_h) > 3 and clean_h not in cleaned_topics:
            cleaned_topics.append(clean_h)
            
    if not cleaned_topics:
        # Fallback heuristics
        candidates = ["Neural Networks", "Optimization", "Backpropagation", "CNNs", "Complexity", "Data Structures"]
        cleaned_topics = [c for c in candidates if c.lower() in text.lower()]
        
    return cleaned_topics[:8]

def chunk_text(text: str, doc_id: str, doc_name: str, chunk_size: int = 450, chunk_overlap: int = 60) -> List[DocumentChunk]:
    # Split on double newlines / markdown sections first
    raw_paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    
    chunks = []
    current_chunk_words = []
    current_len = 0
    chunk_idx = 0
    
    for para in raw_paragraphs:
        words = para.split()
        if not words:
            continue
            
        if current_len + len(words) > chunk_size and current_chunk_words:
            # Emit current chunk
            chunk_content = " ".join(current_chunk_words)
            chunk_id = f"{doc_id}_chunk_{chunk_idx:03d}"
            chunks.append(DocumentChunk(
                id=chunk_id,
                doc_id=doc_id,
                doc_name=doc_name,
                chunk_index=chunk_idx,
                content=chunk_content,
                metadata={
                    "doc_id": doc_id,
                    "doc_name": doc_name,
                    "chunk_index": chunk_idx,
                    "word_count": len(current_chunk_words)
                }
            ))
            chunk_idx += 1
            # Retain overlap words
            overlap_words = current_chunk_words[-chunk_overlap:] if len(current_chunk_words) > chunk_overlap else []
            current_chunk_words = overlap_words + words
            current_len = len(current_chunk_words)
        else:
            current_chunk_words.extend(words)
            current_len += len(words)
            
    if current_chunk_words:
        chunk_content = " ".join(current_chunk_words)
        chunk_id = f"{doc_id}_chunk_{chunk_idx:03d}"
        chunks.append(DocumentChunk(
            id=chunk_id,
            doc_id=doc_id,
            doc_name=doc_name,
            chunk_index=chunk_idx,
            content=chunk_content,
            metadata={
                "doc_id": doc_id,
                "doc_name": doc_name,
                "chunk_index": chunk_idx,
                "word_count": len(current_chunk_words)
            }
        ))
        
    return chunks

def ingest_document(filepath: Path, filename: Optional[str] = None) -> Tuple[DocumentInfo, List[DocumentChunk]]:
    fname = filename or filepath.name
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    text = extract_text_from_file(filepath)
    topics = extract_topics_from_text(text)
    chunks = chunk_text(text, doc_id=doc_id, doc_name=fname)
    
    file_size = filepath.stat().st_size if filepath.exists() else len(text.encode("utf-8"))
    
    doc_info = DocumentInfo(
        id=doc_id,
        filename=fname,
        filepath=str(filepath),
        file_type=filepath.suffix.lstrip(".").lower() or "txt",
        size_bytes=file_size,
        uploaded_at=datetime.now(timezone.utc),
        num_chunks=len(chunks),
        topics_covered=topics
    )
    
    return doc_info, chunks
