import React, { useState } from 'react';
import Navbar from './components/Navbar';
import KnowledgeVault from './components/KnowledgeVault';
import QuizStudio from './components/QuizStudio';
import HandwritingCanvas from './components/HandwritingCanvas';
import MasteryRadar from './components/MasteryRadar';
import StudyPlanView from './components/StudyPlanView';
import MLOpsHub from './components/MLOpsHub';
import SocraticTutorDrawer from './components/SocraticTutorDrawer';

export default function App() {
  const [activeTab, setActiveTab] = useState('vault');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  const handleStartQuizWithDoc = (docId) => {
    setSelectedDocId(docId);
    setActiveTab('quiz');
  };

  const handleStartQuizWithTopic = (topic) => {
    setActiveTab('quiz');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sticky Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onOpenTutor={() => setIsTutorOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <div className="glass-panel p-6 border-indigo-500/30">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                Multimodal <span className="gradient-text-primary">Handwriting Lab</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Draw formulas, write derivations with your stylus/mouse, or upload notebook photos. The Computer Vision and OCR pipeline parses mathematical symbols and evaluates logic against ground-truth rubrics with partial credit.
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

      {/* Socratic Interactive AI Tutor Drawer */}
      <SocraticTutorDrawer
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AI Tutor Platform © 2026 • Built for Udipto-Mondal</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>RAG</span>
            <span>•</span>
            <span>Vision OCR / CNN</span>
            <span>•</span>
            <span>Knowledge Tracing</span>
            <span>•</span>
            <span>MLflow</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
