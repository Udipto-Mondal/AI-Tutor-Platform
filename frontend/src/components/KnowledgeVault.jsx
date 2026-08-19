import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  BookOpen, 
  FolderPlus,
  RefreshCw,
  Eye,
  Hash
} from 'lucide-react';

export default function KnowledgeVault({ onStartQuizWithDoc }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocChunks, setSelectedDocChunks] = useState(null);
  const [inspectingDoc, setInspectingDoc] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/list');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error('Error fetching documents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setStatusMessage({ type: 'info', text: `Ingesting & indexing ${file.name} into Vector DB...` });

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage({ type: 'success', text: data.message });
        fetchDocuments();
      } else {
        const err = await res.json();
        setStatusMessage({ type: 'error', text: err.detail || 'Upload failed' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network error uploading document' });
    } finally {
      setUploading(false);
    }
  };

  const handleLoadSamples = async () => {
    setLoading(true);
    setStatusMessage({ type: 'info', text: 'Loading pre-configured AI & ML course materials...' });
    try {
      const res = await fetch('/api/documents/load-sample', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
        setStatusMessage({ type: 'success', text: 'Sample course notes indexed into ChromaDB vector store!' });
      }
    } catch (e) {
      setStatusMessage({ type: 'error', text: 'Failed to load samples' });
    } finally {
      setLoading(false);
    }
  };

  const handleInspectChunks = async (doc) => {
    setInspectingDoc(doc);
    try {
      const res = await fetch(`/api/documents/${doc.id}/chunks`);
      if (res.ok) {
        const chunks = await res.json();
        setSelectedDocChunks(chunks);
      }
    } catch (e) {
      console.error('Error loading chunks:', e);
    }
  };

  const filteredDocs = documents.filter(d => 
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.topics_covered && d.topics_covered.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
              <Layers className="h-3.5 w-3.5" />
              <span>RAG Knowledge Ingestion Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Your Personal <span className="gradient-text-primary">Knowledge Vault</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Upload PDF textbooks, lecture notes, or markdown cheatsheets. Our chunking engine parses, extracts topics, and indexes vector embeddings into ChromaDB for instant agentic quiz generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleLoadSamples}
              disabled={loading}
              className="btn-secondary text-xs py-2.5 px-4"
            >
              <RefreshCw className={`h-4 w-4 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Load Sample Notes</span>
            </button>
            
            <label className="btn-primary text-xs py-2.5 px-4 cursor-pointer">
              <UploadCloud className="h-4 w-4" />
              <span>{uploading ? 'Processing...' : 'Upload Notes / PDF'}</span>
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf,.txt,.md,.markdown,.docx" 
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Status Alert */}
        {statusMessage && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2.5 border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
              : 'bg-indigo-950/50 border-indigo-800/60 text-indigo-300'
          }`}>
            {statusMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search indexed topics or files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total Indexed Docs: <span className="text-indigo-400 font-bold">{documents.length}</span>
        </div>
      </div>

      {/* Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="glass-panel p-12 text-center space-y-4">
          <BookOpen className="h-12 w-12 mx-auto text-slate-600 animate-bounce" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No study materials in the vault yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload your own notes (.pdf, .md, .txt) or click 'Load Sample Notes' above to populate with Neural Networks and Calculus material.
            </p>
          </div>
          <button onClick={handleLoadSamples} className="btn-primary text-xs py-2 px-4 mx-auto">
            <FolderPlus className="h-4 w-4" />
            <span>Load Sample Deep Learning Notes</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div 
              key={doc.id}
              className="glass-panel p-5 flex flex-col justify-between space-y-4 hover:border-indigo-500/50 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase font-semibold">
                    {doc.file_type}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {doc.filename}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-mono">
                    <span>{(doc.size_bytes / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span className="text-cyan-400">{doc.num_chunks} vector chunks</span>
                  </div>
                </div>

                {/* Topics Pills */}
                {doc.topics_covered && doc.topics_covered.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {doc.topics_covered.slice(0, 3).map((topic, idx) => (
                      <span 
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-indigo-300"
                      >
                        {topic}
                      </span>
                    ))}
                    {doc.topics_covered.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 text-slate-500">
                        +{doc.topics_covered.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleInspectChunks(doc)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 py-1.5 px-2.5 rounded hover:bg-slate-800/60 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Inspect Chunks</span>
                </button>

                <button
                  onClick={() => onStartQuizWithDoc(doc.id)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Take Quiz</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chunks Inspection Modal */}
      {selectedDocChunks && inspectingDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-3xl max-h-[85vh] flex flex-col p-6 space-y-4 border-indigo-500/40">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-400" />
                  <span>Vector Chunks: {inspectingDoc.filename}</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {selectedDocChunks.length} semantic embeddings stored in ChromaDB
                </p>
              </div>
              <button
                onClick={() => setSelectedDocChunks(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 pr-2 flex-1">
              {selectedDocChunks.map((chunk, idx) => (
                <div key={chunk.id} className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span className="text-indigo-400 font-semibold flex items-center gap-1">
                      <Hash className="h-3 w-3" /> Chunk #{chunk.chunk_index}
                    </span>
                    <span>{chunk.metadata?.word_count || 0} words</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  const docId = inspectingDoc.id;
                  setSelectedDocChunks(null);
                  onStartQuizWithDoc(docId);
                }}
                className="btn-primary text-xs py-2 px-4"
              >
                <Sparkles className="h-4 w-4" />
                <span>Generate Adaptive Quiz from this Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
