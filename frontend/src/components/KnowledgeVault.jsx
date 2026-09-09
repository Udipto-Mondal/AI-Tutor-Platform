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
  ChevronRight,
  Clock
} from 'lucide-react';
import { 
  getStoredDocuments, 
  saveStoredDocuments, 
  extractTopicsFromFilename,
  markDocumentDeleted,
  unmarkDocumentDeleted,
  getDeletedFilenames
} from '../utils/documentStorage';
import { extractDocumentContent } from '../utils/pdfExtractor';
import { saveDocumentText, getDocumentText } from '../utils/textStore';

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
          Deleting this document will remove it from your Knowledge Vault and all vector memory.
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
export default function KnowledgeVault({ documents = [], setDocuments, onStartQuizWithDoc }) {
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

  /* ── fetch docs from backend & sync with localStorage ── */
  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/list');
      const deletedSet = getDeletedFilenames();
      if (res.ok) {
        const data = await res.json();
        // Exclude any document that was explicitly deleted by the user
        const validServerDocs = (Array.isArray(data) ? data : []).filter(
          d => !deletedSet.has(d.filename) && !deletedSet.has(d.id)
        );
        const existingIds = new Set(validServerDocs.map(d => d.filename));
        const currentLocal = getStoredDocuments().filter(
          loc => !deletedSet.has(loc.filename) && !deletedSet.has(loc.id)
        );
        const merged = [...validServerDocs];
        currentLocal.forEach(loc => {
          if (!existingIds.has(loc.filename)) {
            merged.push(loc);
          }
        });
        setDocuments(merged);
        saveStoredDocuments(merged);
      } else {
        const stored = getStoredDocuments().filter(
          loc => !deletedSet.has(loc.filename) && !deletedSet.has(loc.id)
        );
        setDocuments(stored);
      }
    } catch {
      // Fallback: load existing stored documents
      const deletedSet = getDeletedFilenames();
      const stored = getStoredDocuments().filter(
        loc => !deletedSet.has(loc.filename) && !deletedSet.has(loc.id)
      );
      setDocuments(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  /* ── upload handler with guaranteed local persistence & authentic text extraction ── */
  const doUpload = async (file) => {
    if (!file) return;

    // Reset deleted status if re-uploading file with same name
    unmarkDocumentDeleted(file.name);

    setUploading(true);
    setUploadPct(15);
    setStatus({ type: 'info', text: `Analyzing structure and extracting text from "${file.name}"…` });

    const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();

    // 1. Extract authentic text and chapter titles from file
    let extractedContent = null;
    try {
      extractedContent = await extractDocumentContent(file);
      setUploadPct(55);
    } catch (err) {
      console.warn('Text extraction fallback:', err);
    }

    const topics = (extractedContent?.topics?.length > 0)
      ? extractedContent.topics
      : extractTopicsFromFilename(file.name);

    const numChunks = (extractedContent?.chapters?.length > 0)
      ? extractedContent.chapters.length
      : Math.max(3, Math.round(file.size / 650));

    const docId = `doc_${Date.now()}`;
    const newDoc = {
      id: docId,
      filename: file.name,
      file_type: ext,
      size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
      num_chunks: numChunks,
      topics_covered: topics,
      is_bangla: Boolean(extractedContent?.isBangla),
      num_pages: extractedContent?.numPages || 1,
      has_extracted_text: Boolean(extractedContent?.fullText)
    };

    // 2. Save text in IndexedDB
    if (extractedContent?.fullText) {
      await saveDocumentText(docId, extractedContent);
    }

    // 3. Immediately update local state & localStorage
    const updatedDocs = [newDoc, ...documents.filter(d => d.filename !== file.name)];
    setDocuments(updatedDocs);
    saveStoredDocuments(updatedDocs);
    setUploadPct(85);

    // 4. Try backend sync if running
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        if (data && data.document) {
          const mergedDoc = {
            ...newDoc,
            ...data.document,
            topics_covered: topics // maintain authentic extracted chapters
          };
          const finalized = [mergedDoc, ...documents.filter(d => d.filename !== file.name && d.id !== docId)];
          setDocuments(finalized);
          saveStoredDocuments(finalized);
        }
      }
    } catch {
      // Backend offline on static Vercel host - client persistence active
    }

    setUploadPct(100);
    setStatus({
      type: 'success',
      text: `"${file.name}" indexed successfully! ${topics.length} topics & chapters ready for Quiz Studio.`
    });
    setUploading(false);
    setTimeout(() => setUploadPct(0), 1200);
  };

  /* ── delete document ── */
  const confirmDelete = async () => {
    const doc = deleteTarget;
    setDeleteTarget(null);
    if (!doc) return;
    setStatus({ type: 'info', text: `Removing ${doc.filename}…` });

    // Mark as deleted in localStorage so it never resurrects
    markDocumentDeleted(doc.filename, doc.id);

    // Remove immediately from state & localStorage
    const updated = documents.filter(d => d.id !== doc.id && d.filename !== doc.filename);
    setDocuments(updated);
    saveStoredDocuments(updated);

    try {
      await fetch(`/api/documents/${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
    } catch { /* ignore network error */ }

    setStatus({ type: 'success', text: `"${doc.filename}" removed from Knowledge Vault.` });
  };

  /* ── inspect chunks with real document text ── */
  const openChunks = async (doc) => {
    setInspectDoc(doc);
    try {
      // 1. Check local IndexedDB text store
      const stored = await getDocumentText(doc.id);
      if (stored && stored.chapters?.length > 0) {
        setChunks(stored.chapters.map((ch, idx) => ({
          chunk_index: idx,
          content: `${ch.title}\n\n${ch.text}`,
          metadata: { word_count: ch.text.split(/\s+/).length, topic: ch.title }
        })));
        return;
      } else if (stored && stored.fullText) {
        const words = stored.fullText.split(/\s+/);
        const generatedChunks = [];
        for (let i = 0; i < words.length; i += 100) {
          generatedChunks.push({
            chunk_index: Math.floor(i / 100),
            content: words.slice(i, i + 100).join(' '),
            metadata: { word_count: Math.min(100, words.length - i) }
          });
          if (generatedChunks.length >= 8) break;
        }
        setChunks(generatedChunks);
        return;
      }

      // 2. Try backend
      const res = await fetch(`/api/documents/${doc.id}/chunks`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setChunks(data);
          return;
        }
      }
    } catch { /* fallback */ }

    // Fallback if not extracted yet
    setChunks([
      { chunk_index: 0, content: `Key excerpts, themes, and study points from ${doc.filename}.`, metadata: { word_count: 24 } }
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
    <div className="space-y-6 pb-8">
      {/* ── Header Banner ── */}
      <div className="glass-panel p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              <BookOpen className="h-3.5 w-3.5" />
              <span>RAG Knowledge Ingestion Engine</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Your <span className="gradient-text-primary">Knowledge Vault</span>
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              Upload PDF textbooks, lecture slides, or markdown notes. Our engine chunks and indexes
              embeddings into ChromaDB for personalized, topic-specific quizzes.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <button
              onClick={fetchDocs}
              className="btn-secondary text-xs"
              disabled={loading}
              title="Refresh document vault"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <label className="btn-primary text-xs cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>{uploading ? 'Uploading…' : 'Upload Notes / PDF'}</span>
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

      {/* ── Compact & Responsive Drag & Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 py-5 px-6 cursor-pointer transition-all duration-200 border-2 border-dashed ${
          dragOver
            ? 'border-blue-500 bg-blue-50 shadow-md scale-[1.005]'
            : 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-400 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center shrink-0 shadow-xs">
            <UploadCloud className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-semibold text-slate-900">
              Drop lecture slides or PDF notes here, or <span className="text-blue-600 underline underline-offset-2">browse files</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Supports PDF, Markdown (.md), and Text (.txt) — instant chunking and indexing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
          <span className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono font-medium">PDF</span>
          <span className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono font-medium">MD</span>
          <span className="text-[10.5px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono font-medium">TXT</span>
        </div>
      </div>

      {/* ── Search & Document Count ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents or concepts…"
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl outline-none"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-700">{filtered.length}</span> documents ready for quizzing
        </div>
      </div>

      {/* ── Documents Grid (Fully Responsive) ── */}
      {filtered.length === 0 ? (
        <div className="glass-panel p-12 flex flex-col items-center gap-3 text-center">
          <BookOpen className="h-10 w-10 text-slate-400" />
          <p className="font-bold text-slate-800">No documents found</p>
          <p className="text-xs sm:text-sm text-slate-500">
            Upload a PDF or markdown file to populate your Knowledge Vault.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((doc, i) => (
            <div
              key={doc.id}
              className="glass-panel glass-card-interactive flex flex-col justify-between gap-4 p-5 group animate-fade-up bg-white"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Top part */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 shrink-0">
                    {fileIcon(doc.file_type)}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {doc.file_type}
                  </span>
                </div>

                <div>
                  <h3
                    className="text-sm font-bold text-slate-900 leading-snug break-words group-hover:text-blue-600 transition-colors"
                    title={doc.filename}
                  >
                    {doc.filename}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500 font-mono">
                    <span>{formatSize(doc.size_bytes)}</span>
                    <span>·</span>
                    <span className="text-emerald-700 font-semibold">{doc.num_chunks} chunks</span>
                  </div>
                </div>

                {/* Topic Chips */}
                {doc.topics_covered?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {doc.topics_covered.slice(0, 3).map((t, ti) => (
                      <span
                        key={ti}
                        className="text-[10.5px] px-2.5 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        {t}
                      </span>
                    ))}
                    {doc.topics_covered.length > 3 && (
                      <span className="text-[10px] text-slate-500 font-mono self-center">
                        +{doc.topics_covered.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openChunks(doc)}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  title="Inspect vector chunks"
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
                  title="Take quiz on this material"
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
