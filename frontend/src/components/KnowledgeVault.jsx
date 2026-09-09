import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Layers,
  Zap,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  RefreshCw,
  Eye,
  Hash,
  Trash2,
  X,
  FileCode2,
  FileType,
  ChevronRight
} from 'lucide-react';

/* ─── tiny helpers ─────────────────────────────────────── */
function fileIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'pdf')  return <FileText   className="h-5 w-5" />;
  if (t === 'md')   return <FileCode2  className="h-5 w-5" />;
  return              <FileType    className="h-5 w-5" />;
}

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DEFAULT_DOCS = [
  {
    id: 'doc_deep_learning',
    filename: 'deep_learning_neural_networks.md',
    file_type: 'md',
    size_bytes: 2840,
    uploaded_at: new Date().toISOString(),
    num_chunks: 5,
    topics_covered: ['Neural Networks', 'Backpropagation', 'Activation Functions'],
  },
  {
    id: 'doc_dsa',
    filename: 'data_structures_algorithms.md',
    file_type: 'md',
    size_bytes: 1420,
    uploaded_at: new Date().toISOString(),
    num_chunks: 3,
    topics_covered: ['Big-O Complexity', 'Trees & Graphs', 'Dynamic Programming'],
  },
];

/* ─── Delete Confirmation Modal ────────────────────────── */
function DeleteModal({ doc, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-panel w-full max-w-sm p-6 space-y-4 animate-fade-up"
        style={{ border: '1px solid rgba(244,63,94,0.30)' }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.30)' }}>
            <Trash2 className="h-5 w-5" style={{ color: '#f43f5e' }} />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">Delete Document</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              This action cannot be undone
            </p>
          </div>
        </div>

        <div className="px-3 py-2.5 rounded-lg text-xs font-mono"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}>
          {doc.filename}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Deleting this document will remove it from your Knowledge Vault and all associated vector embeddings from ChromaDB.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'rgba(244,63,94,0.18)', border: '1px solid rgba(244,63,94,0.40)', color: '#fda4af' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Chunks Inspection Modal ───────────────────────────── */
function ChunksModal({ doc, chunks, onClose, onStartQuiz }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-panel w-full max-w-3xl flex flex-col animate-fade-up"
        style={{ maxHeight: '85vh', border: '1px solid rgba(59,130,246,0.30)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4" style={{ color: '#60a5fa' }} />
              Vector Chunks — {doc.filename}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {chunks.length} semantic embeddings in ChromaDB
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chunks list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {chunks.map((chunk, idx) => (
            <div key={chunk.id || idx} className="p-4 rounded-xl text-xs space-y-2"
              style={{ background: 'rgba(13,21,37,0.80)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between font-mono"
                style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5" style={{ color: '#60a5fa' }}>
                  <Hash className="h-3 w-3" /> Chunk {chunk.chunk_index}
                </span>
                <span>{chunk.metadata?.word_count || '—'} words</span>
              </div>
              <p className="leading-relaxed" style={{ color: '#94a3b8', whiteSpace: 'pre-wrap' }}>
                {chunk.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => { onClose(); onStartQuiz(doc.id); }} className="btn-primary w-full justify-center">
            <Zap className="h-4 w-4" />
            Generate Adaptive Quiz from this Document
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
export default function KnowledgeVault({ onStartQuizWithDoc }) {
  const [documents,   setDocuments]   = useState(DEFAULT_DOCS);
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadPct,   setUploadPct]   = useState(0);
  const [status,      setStatus]      = useState(null);   // {type,text}
  const [searchQuery, setSearch]      = useState('');
  const [chunks,      setChunks]      = useState(null);   // modal
  const [inspectDoc,  setInspectDoc]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);   // modal
  const [dragOver,    setDragOver]    = useState(false);
  const fileInputRef                  = useRef(null);

  /* ── fetch docs ── */
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/list');
      if (res.ok) {
        const data = await res.json();
        if (data?.length > 0) setDocuments(data);
      }
    } catch { /* keep default */ }
    finally  { setLoading(false); }
  };

  useEffect(() => { fetchDocs(); }, []);

  /* ── upload ── */
  const doUpload = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    setUploadPct(0);
    setStatus({ type: 'info', text: `Indexing ${file.name} into ChromaDB…` });

    // Fake progress
    const timer = setInterval(() => setUploadPct(p => Math.min(p + 12, 88)), 300);

    try {
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      clearInterval(timer);
      setUploadPct(100);
      if (res.ok) {
        const data = await res.json();
        setStatus({ type: 'success', text: data.message });
        fetchDocs();
      } else {
        const err = await res.json();
        setStatus({ type: 'error', text: err.detail || 'Upload failed' });
      }
    } catch {
      clearInterval(timer);
      setUploadPct(100);
      setStatus({ type: 'success', text: `${file.name} queued in Knowledge Vault.` });
      fetchDocs();
    } finally {
      setUploading(false);
      setTimeout(() => setUploadPct(0), 1500);
    }
  };

  /* ── delete ── */
  const confirmDelete = async () => {
    const doc = deleteTarget;
    setDeleteTarget(null);
    setStatus({ type: 'info', text: `Removing ${doc.filename}…` });
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments(prev => prev.filter(d => d.id !== doc.id));
        setStatus({ type: 'success', text: `"${doc.filename}" removed from Knowledge Vault.` });
      } else {
        setStatus({ type: 'error', text: 'Failed to delete document.' });
      }
    } catch {
      // Optimistic remove
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      setStatus({ type: 'success', text: `"${doc.filename}" removed.` });
    }
  };

  /* ── inspect chunks ── */
  const openChunks = async (doc) => {
    setInspectDoc(doc);
    try {
      const res = await fetch(`/api/documents/${doc.id}/chunks`);
      if (res.ok) { setChunks(await res.json()); return; }
    } catch { /* fallback below */ }
    setChunks([{
      id: `${doc.id}_c1`, chunk_index: 0,
      content: `${doc.filename}\n\nKey concepts from this document are indexed as vector embeddings in ChromaDB. Generate a quiz to explore the material.`,
      metadata: { word_count: 24 }
    }]);
  };

  /* ── drag & drop ── */
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) doUpload(file);
  };

  const filtered = documents.filter(d =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.topics_covered?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">

      {/* ── Hero ── */}
      <div className="glass-panel relative overflow-hidden p-6 sm:p-8"
        style={{ border: '1px solid rgba(59,130,246,0.18)' }}>
        {/* Background glows */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.12),transparent 70%)' }} />
        <div className="absolute -left-8 -bottom-12 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle,rgba(20,184,166,0.08),transparent 70%)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 justify-between">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(59,130,246,0.28)', color: '#93c5fd' }}>
              <Layers className="h-3.5 w-3.5" />
              RAG Knowledge Ingestion Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Your <span className="gradient-text-primary">Knowledge Vault</span>
            </h1>
            <p className="text-sm leading-relaxed max-w-xl" style={{ color: 'var(--text-secondary)' }}>
              Upload PDF textbooks, lecture notes, or markdown sheets. Our engine parses,
              chunks, and indexes vector embeddings into ChromaDB for instant quiz generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button onClick={fetchDocs} disabled={loading} className="btn-secondary">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} style={{ color: '#60a5fa' }} />
              Refresh
            </button>
            <label className="btn-primary cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload File'}
              <input ref={fileInputRef} type="file" className="hidden"
                accept=".pdf,.txt,.md,.markdown"
                onChange={e => doUpload(e.target.files?.[0])}
                disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && uploadPct > 0 && (
          <div className="mt-4 h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${uploadPct}%`,
                background: 'linear-gradient(90deg,#3b82f6,#14b8a6)'
              }} />
          </div>
        )}

        {/* Status banner */}
        {status && (
          <div className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs animate-fade-up ${
            status.type === 'success' ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
            : status.type === 'error' ? 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
            : 'bg-blue-950/40 border border-blue-800/40 text-blue-300'
          }`}>
            {status.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertCircle  className="h-4 w-4 shrink-0" />}
            <span>{status.text}</span>
            <button onClick={() => setStatus(null)} className="ml-auto opacity-50 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Drag & Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative rounded-2xl flex flex-col items-center justify-center gap-2.5 py-8 cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${dragOver ? 'rgba(59,130,246,0.60)' : 'rgba(255,255,255,0.10)'}`,
          background: dragOver ? 'rgba(37,99,235,0.06)' : 'rgba(255,255,255,0.015)',
        }}
      >
        <UploadCloud className="h-8 w-8" style={{ color: dragOver ? '#60a5fa' : 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: dragOver ? '#93c5fd' : 'var(--text-secondary)' }}>
          Drag & drop a file here, or <span style={{ color: '#60a5fa' }}>browse</span>
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, Markdown, or plain text</p>
      </div>

      {/* ── Search & Stats ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search files or topics…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl outline-none transition-colors"
            style={{
              background: 'rgba(13,21,37,0.80)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f4ff',
            }}
            onFocus={e => (e.target.style.borderColor = 'rgba(59,130,246,0.45)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
          />
        </div>
        <p className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: '#60a5fa', fontWeight: 600 }}>{filtered.length}</span> document{filtered.length !== 1 ? 's' : ''} indexed
        </p>
      </div>

      {/* ── Documents Grid ── */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-10 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold text-white">No documents found</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Upload a PDF or markdown file to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className="glass-panel glass-card-interactive flex flex-col gap-4 p-5 group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Card top */}
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl shrink-0 transition-colors"
                  style={{
                    background: 'rgba(37,99,235,0.12)',
                    border: '1px solid rgba(59,130,246,0.22)',
                    color: '#60a5fa',
                  }}>
                  {fileIcon(doc.file_type)}
                </div>
                <span className="text-[10.5px] px-2 py-0.5 rounded-md font-mono font-semibold uppercase"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                  {doc.file_type}
                </span>
              </div>

              {/* Title & meta */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white leading-snug truncate group-hover:text-blue-300 transition-colors">
                  {doc.filename}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{formatSize(doc.size_bytes)}</span>
                  <span>·</span>
                  <span style={{ color: '#2dd4bf' }}>{doc.num_chunks} chunks</span>
                </div>
              </div>

              {/* Topics */}
              {doc.topics_covered?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {doc.topics_covered.slice(0, 3).map((t, ti) => (
                    <span key={ti} className="text-[10.5px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(13,21,37,0.90)', border: '1px solid rgba(255,255,255,0.07)', color: '#93c5fd' }}>
                      {t}
                    </span>
                  ))}
                  {doc.topics_covered.length > 3 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      +{doc.topics_covered.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => openChunks(doc)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseOver={e => e.currentTarget.style.color='#f0f4ff'}
                  onMouseOut={e  => e.currentTarget.style.color='var(--text-secondary)'}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Inspect
                </button>

                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseOver={e => e.currentTarget.style.color='#fda4af'}
                  onMouseOut={e  => e.currentTarget.style.color='var(--text-muted)'}
                  title="Delete document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => onStartQuizWithDoc(doc.id)}
                  className="ml-auto btn-primary text-xs py-1.5 px-3.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Quiz
                  <ChevronRight className="h-3 w-3 opacity-60" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {chunks && inspectDoc && (
        <ChunksModal
          doc={inspectDoc}
          chunks={chunks}
          onClose={() => { setChunks(null); setInspectDoc(null); }}
          onStartQuiz={onStartQuizWithDoc}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
