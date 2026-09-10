import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Layers,
  BrainCircuit,
  Zap,
  RefreshCw
} from 'lucide-react';

const DEFAULT_FALLBACK_PROFILE = {
  student_id: 'default_student',
  overall_proficiency: 0.68,
  learning_velocity: 1.25,
  weak_topics: ['Backpropagation & Gradients', 'Activation Functions'],
  recommended_focus: 'Backpropagation & Gradients',
  topic_breakdown: [
    { topic: 'Neural Network Architecture', mastery_score: 0.85, attempts_count: 5, correct_count: 4, predicted_weak_risk: 0.15, status: 'Mastered' },
    { topic: 'Backpropagation & Gradients', mastery_score: 0.42, attempts_count: 6, correct_count: 2, predicted_weak_risk: 0.58, status: 'Needs Remediation' },
    { topic: 'Activation Functions', mastery_score: 0.55, attempts_count: 4, correct_count: 2, predicted_weak_risk: 0.45, status: 'In Progress' },
    { topic: 'Loss Functions & Optimization', mastery_score: 0.72, attempts_count: 5, correct_count: 3, predicted_weak_risk: 0.28, status: 'In Progress' },
    { topic: 'Convolutional Neural Networks', mastery_score: 0.78, attempts_count: 4, correct_count: 3, predicted_weak_risk: 0.22, status: 'Mastered' },
    { topic: 'Regularization & Dropout', mastery_score: 0.65, attempts_count: 3, correct_count: 2, predicted_weak_risk: 0.35, status: 'In Progress' }
  ]
};

export default function MasteryRadar({ onNavigateToStudyPlan, onStartQuizWithTopic }) {
  const [profile, setProfile] = useState(DEFAULT_FALLBACK_PROFILE);
  const [loading, setLoading] = useState(false);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/mastery/default_student');
      if (res.ok) {
        const data = await res.json();
        if (data && data.topic_breakdown && data.topic_breakdown.length > 0) {
          setProfile(data);
          setIsLiveConnected(true);
        }
      }
    } catch (e) {
      console.warn('Backend connecting, using baseline telemetry:', e);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const topics = profile.topic_breakdown || DEFAULT_FALLBACK_PROFILE.topic_breakdown;
  const numTopics = topics.length;

  // Generate SVG Radar points
  const centerX = 160;
  const centerY = 160;
  const maxRadius = 110;

  const points = topics.map((t, idx) => {
    const angle = (Math.PI * 2 / numTopics) * idx - (Math.PI / 2);
    const r = maxRadius * (t.mastery_score || 0.5);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden border-blue-500/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Machine Learning Knowledge Tracing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Student Concept <span className="gradient-text-primary">Mastery Radar</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Real-time probabilistic tracking trained on quiz attempts, reaction latencies, handwritten accuracy, and forgetting curves to predict weak topics before exams.
            </p>
          </div>

          {/* Key Metric Gauges */}
          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-[#0a1329] border border-blue-500/25 text-center min-w-28 shadow-md">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Proficiency</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                <span className="gradient-text-primary">{Math.round((profile.overall_proficiency || 0.68) * 100)}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0a1329] border border-blue-500/25 text-center min-w-28 shadow-md">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Velocity</span>
              <div className="text-2xl font-extrabold text-blue-400 mt-1 flex items-center justify-center gap-1">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>{profile.learning_velocity || 1.2}x</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Radar Chart + Weak Topic Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Radar SVG Visualizer */}
        <div className="lg:col-span-6 glass-panel p-6 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              <span>Multidimensional Knowledge Polygon</span>
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchProfile} 
                className="text-xs text-slate-400 hover:text-white p-1 rounded hover:bg-blue-950/50"
                title="Refresh from Backend"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-[11px] text-slate-400 font-mono">
                {numTopics} Monitored Topics
              </span>
            </div>
          </div>

          <div className="relative w-80 h-80 flex items-center justify-center">
            <svg viewBox="0 0 320 320" className="w-full h-full">
              {/* Concentric Guide Circles */}
              {[0.25, 0.5, 0.75, 1.0].map((level, i) => (
                <circle
                  key={i}
                  cx={centerX}
                  cy={centerY}
                  r={maxRadius * level}
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.2)"
                  strokeDasharray="3 3"
                />
              ))}

              {/* Topic Axis Lines */}
              {topics.map((t, idx) => {
                const angle = (Math.PI * 2 / numTopics) * idx - (Math.PI / 2);
                const x = centerX + maxRadius * Math.cos(angle);
                const y = centerY + maxRadius * Math.sin(angle);
                return (
                  <line
                    key={idx}
                    x1={centerX}
                    y1={centerY}
                    x2={x}
                    y2={y}
                    stroke="rgba(148, 163, 184, 0.2)"
                  />
                );
              })}

              {/* Filled Mastery Polygon */}
              {points && (
                <polygon
                  points={points}
                  fill="rgba(59, 130, 246, 0.25)"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  className="transition-all duration-500 ease-out"
                />
              )}

              {/* Point Markers */}
              {topics.map((t, idx) => {
                const angle = (Math.PI * 2 / numTopics) * idx - (Math.PI / 2);
                const r = maxRadius * (t.mastery_score || 0.5);
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill={t.mastery_score >= 0.75 ? '#10b981' : t.mastery_score >= 0.5 ? '#3b82f6' : '#f43f5e'}
                    stroke="#0a1329"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &gt;75% Mastered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> 50-75% In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &lt;50% Weak Topic
            </span>
          </div>
        </div>

        {/* Detailed Topic Mastery Breakdown List */}
        <div className="lg:col-span-6 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span>Concept Competency Status</span>
            </h3>
            <button
              onClick={onNavigateToStudyPlan}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <span>Build Remediation Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {topics.map((t, idx) => {
              const isWeak = t.status === 'Needs Remediation' || t.mastery_score < 0.6;
              return (
                <div 
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isWeak 
                      ? 'bg-rose-950/20 border-rose-900/40 hover:border-rose-700/60' 
                      : 'bg-[#0a1329] border-blue-500/20 hover:border-blue-500/40 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {t.topic}
                      </span>
                      {isWeak && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">
                          Weak Topic
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      t.mastery_score >= 0.75 ? 'text-emerald-400' : t.mastery_score >= 0.5 ? 'text-blue-400' : 'text-rose-400'
                    }`}>
                      {Math.round((t.mastery_score || 0.5) * 100)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        t.mastery_score >= 0.75 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                          : t.mastery_score >= 0.5 
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500' 
                          : 'bg-gradient-to-r from-rose-500 to-orange-500'
                      }`}
                      style={{ width: `${Math.max(5, (t.mastery_score || 0.5) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{t.attempts_count || 1} quiz attempts ({t.correct_count || 0} correct)</span>
                    <span className="text-slate-400">Risk of failure: {Math.round((t.predicted_weak_risk || 0.35) * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
