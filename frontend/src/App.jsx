import React, { useState } from 'react';
import Navbar           from './components/Navbar';
import KnowledgeVault   from './components/KnowledgeVault';
import QuizStudio       from './components/QuizStudio';
import HandwritingCanvas from './components/HandwritingCanvas';
import MasteryRadar     from './components/MasteryRadar';
import StudyPlanView    from './components/StudyPlanView';
import MLOpsHub         from './components/MLOpsHub';
import SocraticTutorDrawer from './components/SocraticTutorDrawer';
import { MessageSquare, X } from 'lucide-react';
import { getStoredDocuments } from './utils/documentStorage';

export default function App() {
  const [activeTab,     setActiveTab]     = useState('vault');
  const [documents,     setDocuments]     = useState(getStoredDocuments);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [tutorOpen,     setTutorOpen]     = useState(false);

  const handleStartQuizWithDoc = (docId) => {
    setSelectedDocId(docId);
    setActiveTab('quiz');
  };

  const handleStartQuizWithTopic = () => {
    setActiveTab('quiz');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-deep)' }}>

      {/* ── Navbar ── */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenTutor={() => setTutorOpen((v) => !v)}
      />

      {/* ── Page Content ── */}
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {activeTab === 'vault' && (
          <KnowledgeVault 
            documents={documents}
            setDocuments={setDocuments}
            onStartQuizWithDoc={handleStartQuizWithDoc} 
          />
        )}

        {activeTab === 'quiz' && (
          <QuizStudio
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDocId={setSelectedDocId}
            onNavigateToStudyPlan={() => setActiveTab('study_plan')}
            onNavigateToRadar={() => setActiveTab('radar')}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="space-y-6 animate-fade-up">
            <div className="glass-panel p-6 sm:p-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mb-2">
                <span>Multimodal Vision & CNN</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Multimodal <span className="gradient-text-primary">Handwriting Lab</span>
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-2xl">
                Draw formulas, write derivations with your stylus or mouse, or upload a notebook photo.
                The computer vision pipeline reads your handwritten work and grades it against the rubric.
              </p>
            </div>
            <HandwritingCanvas isStandalone={true} />
          </div>
        )}

        {activeTab === 'radar' && (
          <MasteryRadar
            onNavigateToStudyPlan={() => setActiveTab('study_plan')}
            onStartQuizWithTopic={handleStartQuizWithTopic}
          />
        )}

        {activeTab === 'study_plan' && (
          <StudyPlanView
            onStartQuizWithTopic={handleStartQuizWithTopic}
            onOpenHandwritingLab={() => setActiveTab('canvas')}
          />
        )}

        {activeTab === 'mlops' && (
          <MLOpsHub />
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-5 text-center text-xs border-t border-blue-900/30 bg-[#070d1e]/85 backdrop-blur text-slate-400"
      >
        <div className="max-w-screen-xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-300">AI Tutor Platform — Personalized Adaptive Learning</span>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            {['RAG Architecture', 'Vision / CNN', 'Knowledge Tracing', 'Adaptive Planner'].map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 && <span className="opacity-30">·</span>}
                <span>{t}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Floating AI Chat Button ── */}
      <button
        onClick={() => setTutorOpen((v) => !v)}
        className="float-chat-btn"
        aria-label="Open Leo AI Tutor"
        title="Ask Leo — AI Tutor"
      >
        {tutorOpen
          ? <X           className="h-5 w-5 text-white" />
          : <MessageSquare className="h-5 w-5 text-white" />
        }
      </button>

      {/* ── Floating Chat Panel ── */}
      <SocraticTutorDrawer
        isOpen={tutorOpen}
        onClose={() => setTutorOpen(false)}
      />
    </div>
  );
}
