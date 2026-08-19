import React from 'react';
import { 
  BookOpen, 
  Sparkles, 
  PenTool, 
  BarChart3, 
  Calendar, 
  Activity, 
  Bot,
  BrainCircuit,
  GraduationCap
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenTutor }) {
  const navItems = [
    { id: 'vault', label: 'Knowledge Vault', icon: BookOpen, tag: 'RAG' },
    { id: 'quiz', label: 'Quiz Studio', icon: Sparkles, tag: 'Agent' },
    { id: 'canvas', label: 'Handwriting Lab', icon: PenTool, tag: 'Vision/CNN' },
    { id: 'radar', label: 'Mastery Radar', icon: BarChart3, tag: 'ML Knowledge Tracing' },
    { id: 'study_plan', label: 'Adaptive Study Plan', icon: Calendar, tag: 'Recommender' },
    { id: 'mlops', label: 'MLOps Hub', icon: Activity, tag: 'MLflow' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('vault')}>
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight font-heading">
                  AI Tutor <span className="gradient-text-primary">Platform</span>
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/60 font-semibold font-mono">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                End-to-End Multimodal AI Learning & Knowledge Tracing
              </p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action Right */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenTutor}
              className="btn-primary text-xs py-2 px-3.5"
            >
              <Bot className="h-4 w-4 text-cyan-300 animate-pulse" />
              <span>Ask Leo Tutor</span>
            </button>
          </div>
        </div>

        {/* Mobile & Small screens scrollable tabs */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto pb-2 pt-1 border-t border-slate-800/40">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                  isActive 
                    ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
