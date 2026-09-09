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

export default function App() {
  const [activeTab,     setActiveTab]     = useState('vault');
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
      <main className="flex-1 w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">

        {activeTab === 'vault' && (
          <KnowledgeVault onStartQuizWithDoc={handleStartQuizWithDoc} />
        )}

        {activeTab === 'quiz' && (
          <QuizStudio
            selectedDocId={selectedDocId}
            onNavigateToStudyPlan={() => setActiveTab('study_plan')}
            onNavigateToRadar={() => setActiveTab('radar')}
          />
        )}

        {activeTab === 'canvas' && (
          <div className="space-y-6">
            <div className="glass-panel p-6 sm:p-8" style={{ borderColor: 'rgba(59,130,246,0.20)' }}>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Multimodal <span className="gradient-text-primary">Handwriting Lab</span>
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)', maxWidth: '640px' }}>
                Draw formulas, write derivations with your stylus or mouse, or upload a notebook photo.
                The computer vision pipeline reads your work and grades it against the rubric.
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

        {activeTab === 'mlops' && <MLOpsHub />}
      </main>

      {/* ── Footer ── */}
      <footer
        className="py-5 text-center text-xs"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: 'var(--text-muted)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Tutor Platform — Built by Udipto Mondal</span>
          <div className="flex items-center gap-3">
            {['RAG', 'Vision / CNN', 'Knowledge Tracing', 'MLflow'].map((t, i) => (
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
