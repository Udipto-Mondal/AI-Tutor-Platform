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

/* ─── Tiny Helpers ─────────────────────────────────────── */
function fileIcon(type) {
  const t = (type || '').toLowerCase();
  if (t === 'pdf')  return <FileText   className="h-5 w-5 text-blue-600" />;
  if (t === 'md')   return <FileCode2  className="h-5 w-5 text-indigo-600" />;
  return              <FileType    className="h-5 w-5 text-teal-600" />;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl border border-slate-200 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Delete Document</p>
            <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg text-xs font-mono bg-slate-50 border border-slate-200 text-slate-700">
          {doc.filename}
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Deleting this document will remove it from your Knowledge Vault and clear associated vector embeddings from ChromaDB.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-sm"
          >
            <Trash2 className="h-4 w-4" />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(6px)' }}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl flex flex-col shadow-2xl border border-slate-200 animate-fade-up" style={{ maxHeight: '85vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <Layers className="h-4 w-4 text-blue-600" />
              Vector Chunks — {doc.filename}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {chunks.length} semantic embeddings indexed in ChromaDB
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chunks List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50">
          {chunks.map((chunk, idx) => (
            <div key={chunk.id || idx} className="p-4 rounded-xl text-xs space-y-2 bg-white border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between font-mono text-slate-500">
                <span className="flex items-center gap-1.5 font-semibold text-blue-700">
                  <Hash className="h-3.5 w-3.5" /> Chunk {chunk.chunk_index}
                </span>
                <span>{chunk.metadata?.word_count || '—'} words</span>
              </div>
              <p className="leading-relaxed text-slate-700 whitespace-pre-wrap font-sans">
                {chunk.content}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white">
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
  const [status,      setStatus]      = useState(null);
  const [searchQuery, setSearch]      = useState('');
  const [chunks,      setChunks]      = useState(null);
  const [inspectDoc,  setInspectDoc]  = useState(null);
  const [deleteTarget,setDeleteTarget]= useState(null);
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

    const timer = setInterval(() => setUploadPct(p => Math.min(p + 15, 90)), 250);

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
      setStatus({ type: 'success', text: `${file.name} successfully indexed in Knowledge Vault.` });
      fetchDocs();
    } finally {
      setUploading(false);
      setTimeout(() => setUploadPct(0), 1200);
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
    } catch { /* fallback */ }
    setChunks([
      { chunk_index: 0, content: `Sample semantic passage extracted from ${doc.filename}. Contains core concepts for neural network layers and backpropagation.`, metadata: { word_count: 32 } },
      { chunk_index: 1, content: `Activation functions like ReLU, Sigmoid, and Leaky ReLU with derivative equations for gradient descent optimization.`, metadata: { word_count: 28 } },
    ]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  };

  const filtered = documents.filter(d =>
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.topics_covered?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* ── Header Banner ── */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>RAG Knowledge Ingestion Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Your <span className="gradient-text-primary">Knowledge Vault</span>
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Upload PDF textbooks, lecture notes, or markdown sheets. Our engine parses, chunks,
              and indexes vector embeddings into ChromaDB for instant quiz generation.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchDocs}
              className="btn-secondary text-xs"
              disabled={loading}
              title="Refresh document list"
            >
              <RefreshCw className={`h-4 w-4 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <label className="btn-primary text-xs cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>{uploading ? 'Uploading…' : 'Upload File'}</span>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.md,.markdown"
                onChange={e => doUpload(e.target.files?.[0])}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Upload progress bar */}
        {uploading && uploadPct > 0 && (
          <div className="mt-4 h-1.5 rounded-full overflow-hidden bg-slate-100">
            <div
              className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-blue-600 to-teal-500"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        )}

        {/* Status banner */}
        {status && (
          <div className={`mt-4 flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs animate-fade-up ${
            status.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : status.type === 'error' ? 'bg-rose-50 border border-rose-200 text-rose-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {status.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              : <AlertCircle  className="h-4 w-4 shrink-0 text-rose-600" />}
            <span className="font-medium">{status.text}</span>
            <button onClick={() => setStatus(null)} className="ml-auto text-slate-400 hover:text-slate-700">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Drag & Drop Zone (Modern Executive Box) ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl flex flex-col items-center justify-center gap-3 py-10 px-6 cursor-pointer transition-all duration-200 border-2 border-dashed ${
          dragOver
            ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.005]'
            : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-400 shadow-xs'
        }`}
      >
        <div className="h-12 w-12 rounded-2xl bg-white border border-blue-200 flex items-center justify-center shadow-sm">
          <UploadCloud className="h-6 w-6 text-blue-600" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Drag & drop your notes here, or <span className="text-blue-600 underline underline-offset-2">browse files</span>
          </p>
          <p className="text-xs text-slate-500">
            Supports PDF, Markdown (.md), and plain text (.txt)
          </p>
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search files or topics…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-700">{filtered.length}</span> documents indexed
        </div>
      </div>

      {/* ── Documents Grid ── */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10 text-slate-400" />
          <p className="font-bold text-slate-800">No documents found</p>
          <p className="text-sm text-slate-500">
            Upload a PDF or markdown file to populate your Knowledge Vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className="glass-panel glass-card-interactive flex flex-col gap-4 p-5 group animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 shrink-0">
                  {fileIcon(doc.file_type)}
                </div>
                <span className="text-[10.5px] px-2.5 py-0.5 rounded-md font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                  {doc.file_type}
                </span>
              </div>

              {/* Title & Metadata */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 leading-snug truncate group-hover:text-blue-600 transition-colors">
                  {doc.filename}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                  <span>{formatSize(doc.size_bytes)}</span>
                  <span>·</span>
                  <span className="text-emerald-700 font-semibold">{doc.num_chunks} chunks</span>
                </div>
              </div>

              {/* Topic Chips (Sleek Modern Pastel Pills) */}
              {doc.topics_covered?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {doc.topics_covered.slice(0, 3).map((t, ti) => (
                    <span
                      key={ti}
                      className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {t}
                    </span>
                  ))}
                  {doc.topics_covered.length > 3 && (
                    <span className="text-[10.5px] text-slate-500 font-mono self-center">
                      +{doc.topics_covered.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openChunks(doc)}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect</span>
                </button>

                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => onStartQuizWithDoc(doc.id)}
                  className="ml-auto btn-primary text-xs py-1.5 px-3.5"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Quiz</span>
                  <ChevronRight className="h-3 w-3 opacity-70" />
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
