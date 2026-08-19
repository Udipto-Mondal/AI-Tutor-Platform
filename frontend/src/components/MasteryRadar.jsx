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
  Zap
} from 'lucide-react';

export default function MasteryRadar({ onNavigateToStudyPlan, onStartQuizWithTopic }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics/mastery/default_student');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error('Error loading mastery profile:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading || !profile) {
    return (
      <div className="glass-panel p-12 text-center space-y-4">
        <BrainCircuit className="h-8 w-8 mx-auto text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading student knowledge tracing metrics...</p>
      </div>
    );
  }

  const topics = profile.topic_breakdown || [];
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
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden border-indigo-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Machine Learning Knowledge Tracing Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Student Concept <span className="gradient-text-primary">Mastery Radar</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Real-time probabilistic tracking trained on quiz attempts, reaction latencies, handwritten accuracy, and forgetting curves to predict weak topics before exams.
            </p>
          </div>

          {/* Key Metric Gauges */}
          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-28">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Proficiency</span>
              <div className="text-2xl font-extrabold text-white mt-1">
                <span className="gradient-text-primary">{(profile.overall_proficiency * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-28">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Velocity</span>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1 flex items-center justify-center gap-1">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>{profile.learning_velocity}x</span>
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
              <Target className="h-4 w-4 text-indigo-400" />
              <span>Multidimensional Knowledge Polygon</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              {numTopics} Monitored Topics
            </span>
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
                  stroke="rgba(255, 255, 255, 0.08)"
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
                    stroke="rgba(255, 255, 255, 0.12)"
                  />
                );
              })}

              {/* Filled Mastery Polygon */}
              {points && (
                <polygon
                  points={points}
                  fill="rgba(99, 102, 241, 0.25)"
                  stroke="#818cf8"
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
                    fill={t.mastery_score >= 0.75 ? '#34d399' : t.mastery_score >= 0.5 ? '#818cf8' : '#f43f5e'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> &gt;75% Mastered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" /> 50-75% In Progress
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> &lt;50% Weak Topic
            </span>
          </div>
        </div>

        {/* Detailed Topic Mastery Breakdown List */}
        <div className="lg:col-span-6 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
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
                      ? 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {t.topic}
                      </span>
                      {isWeak && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          Weak Topic
                        </span>
                      )}
                    </div>
                    <span className={`text-xs font-mono font-bold ${
                      t.mastery_score >= 0.75 ? 'text-emerald-400' : t.mastery_score >= 0.5 ? 'text-indigo-400' : 'text-rose-400'
                    }`}>
                      {(t.mastery_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        t.mastery_score >= 0.75 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                          : t.mastery_score >= 0.5 
                          ? 'bg-gradient-to-r from-indigo-500 to-cyan-400' 
                          : 'bg-gradient-to-r from-rose-600 to-orange-500'
                      }`}
                      style={{ width: `${Math.max(5, t.mastery_score * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>{t.attempts_count} quiz attempts ({t.correct_count} correct)</span>
                    <span className="text-slate-500">Risk of failure: {(t.predicted_weak_risk * 100).toFixed(0)}%</span>
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
