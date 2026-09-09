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
  Zap,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MathText from './MathText';

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
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col p-6 sm:p-8 space-y-6 border border-slate-200 rounded-2xl shadow-2xl my-auto animate-in zoom-in-95 duration-200">
        
        {/* Header Summary Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              isPassing 
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-md shadow-emerald-500/20' 
                : 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-md shadow-amber-500/20'
            }`}>
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  Assessment Diagnostic Report
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono border border-slate-200">
                  {report.quiz_id}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                {report.summary_feedback}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 self-start sm:self-center transition-colors"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-semibold">Score</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              <span className="gradient-text-primary">{report.overall_score}</span> / {report.max_score}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-semibold">Proficiency</span>
            <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${isPassing ? 'text-emerald-600' : 'text-amber-600'}`}>
              {report.percentage}%
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-semibold">Duration</span>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-slate-400" />
              <span>{Math.round(report.total_time_seconds)}s</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-500 uppercase font-mono font-semibold">Weak Alerts</span>
            <div className="text-xl sm:text-2xl font-extrabold text-rose-600 mt-1">
              {report.weak_topics_flagged.length}
            </div>
          </div>
        </div>

        {/* Weak Topic Alert Box if present */}
        {report.weak_topics_flagged.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-800">
                  Knowledge Tracing: Weak Concepts Flagged for Remediation
                </h4>
                <p className="text-xs text-rose-700">
                  Focus revision on: <span className="font-bold text-slate-900">{report.weak_topics_flagged.join(', ')}</span>
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
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-blue-600" />
            <span>Question-by-Question Diagnostic Breakdown</span>
          </h3>

          {report.question_results.map((q, idx) => (
            <div 
              key={q.question_id || idx}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center font-mono border border-blue-200">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {q.topic}
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono border border-slate-200">
                    {q.question_type}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${q.score >= 0.7 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {(q.score * 100).toFixed(0)}%
                  </span>
                  {q.is_correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-600" />
                  )}
                </div>
              </div>

              {/* OCR transcription for handwritten */}
              {q.extracted_text && (
                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-200 text-xs font-mono text-blue-950">
                  <span className="text-[10px] text-slate-500 block mb-0.5 font-semibold">Transcribed Solution / Submission:</span>
                  {q.extracted_text}
                </div>
              )}

              {/* Rubric item points */}
              {q.rubric_breakdown && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {q.rubric_breakdown.map((r, rIdx) => (
                    <div key={rIdx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between">
                      <span className="text-slate-600">{r.criterion}</span>
                      <span className={`font-mono font-bold ${r.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {r.earned_points}/{r.max_points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Feedback */}
              <p className="text-xs text-slate-700 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                 {q.feedback}
              </p>

              {/* Remedial tip */}
              {q.remedial_tip && (
                <p className="text-[11px] text-amber-800 font-medium">
                   Study Tip: {q.remedial_tip}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => { onClose(); onNavigateToRadar(); }}
            className="btn-secondary text-xs py-2 px-4 w-full sm:w-auto"
          >
            <Target className="h-4 w-4 text-blue-600" />
            <span>View Mastery Radar Analytics</span>
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-800 py-2 px-3 font-medium"
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
