import React, { useEffect } from 'react';
import { 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Sparkles, 
  ArrowRight, 
  BookOpen, 
  Target,
  FileCheck,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GradingReportModal({ report, onClose, onNavigateToStudyPlan, onNavigateToRadar }) {
  useEffect(() => {
    if (report && report.percentage >= 70) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // Confetti fallback
      }
    }
  }, [report]);

  if (!report) return null;

  const isPassing = report.percentage >= 70;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col p-6 sm:p-8 space-y-6 border-indigo-500/40 my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              isPassing 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/20' 
                : 'bg-gradient-to-tr from-amber-600 to-orange-400 shadow-lg shadow-amber-500/20'
            }`}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  Assessment Diagnostic Report
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {report.quiz_id}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {report.summary_feedback}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 self-start sm:self-center"
          >
            ✕
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Score</span>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-1">
              <span className="gradient-text-primary">{report.overall_score}</span> / {report.max_score}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Proficiency</span>
            <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${isPassing ? 'text-emerald-400' : 'text-amber-400'}`}>
              {report.percentage}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Duration</span>
            <div className="text-xl sm:text-2xl font-extrabold text-white mt-1 flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{Math.round(report.total_time_seconds)}s</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-mono">Weak Alerts</span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-400 mt-1">
              {report.weak_topics_flagged.length}
            </div>
          </div>
        </div>

        {/* Weak Topic Alert Box if present */}
        {report.weak_topics_flagged.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-300">
                  ML Knowledge Tracing: Weak Concepts Flagged for Remediation
                </h4>
                <p className="text-xs text-rose-200/80">
                  Focus revision on: <span className="font-semibold text-white">{report.weak_topics_flagged.join(', ')}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => { onClose(); onNavigateToStudyPlan(); }}
              className="btn-primary text-xs py-2 px-3 self-end sm:self-center shrink-0"
            >
              <span>Build Remediation Plan</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Detailed Question By Question Analysis */}
        <div className="overflow-y-auto space-y-4 pr-1 flex-1 max-h-96">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-indigo-400" />
            <span>Question-by-Question Diagnostic Breakdown</span>
          </h3>

          {report.question_results.map((q, idx) => (
            <div 
              key={q.question_id || idx}
              className="p-4 rounded-xl bg-slate-900/90 border border-slate-800/80 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-slate-800 text-indigo-400 text-xs font-bold flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-300">
                    {q.topic}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {q.question_type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${q.score >= 0.7 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(q.score * 100).toFixed(0)}%
                  </span>
                  {q.is_correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                </div>
              </div>

              {/* OCR transcription for handwritten */}
              {q.extracted_text && (
                <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-indigo-300">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Transcribed Solution / Submission:</span>
                  {q.extracted_text}
                </div>
              )}

              {/* Rubric item points */}
              {q.rubric_breakdown && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.rubric_breakdown.map((r, rIdx) => (
                    <div key={rIdx} className="p-2 rounded bg-slate-950/50 border border-slate-800 text-[11px] flex items-center justify-between">
                      <span className="text-slate-400">{r.criterion}</span>
                      <span className={`font-mono font-bold ${r.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {r.earned_points}/{r.max_points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Feedback */}
              <p className="text-xs text-slate-300 bg-indigo-950/20 p-2.5 rounded-lg border border-indigo-900/30">
                💡 {q.feedback}
              </p>

              {/* Remedial tip */}
              {q.remedial_tip && (
                <p className="text-[11px] text-amber-300/90 font-medium">
                  🎯 Study Tip: {q.remedial_tip}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => { onClose(); onNavigateToRadar(); }}
            className="btn-secondary text-xs py-2 px-4 w-full sm:w-auto"
          >
            <Target className="h-4 w-4 text-cyan-400" />
            <span>View Mastery Radar Analytics</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white py-2 px-3"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onNavigateToStudyPlan(); }}
              className="btn-primary text-xs py-2 px-4 w-full sm:w-auto"
            >
              <Zap className="h-4 w-4" />
              <span>Personalized Study Plan</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
