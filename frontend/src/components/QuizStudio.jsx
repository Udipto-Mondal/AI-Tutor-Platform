import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  PenTool, 
  HelpCircle, 
  BookOpen, 
  Layers,
  Settings,
  Flame,
  Award
} from 'lucide-react';
import HandwritingCanvas from './HandwritingCanvas';
import GradingReportModal from './GradingReportModal';

export default function QuizStudio({ selectedDocId, onNavigateToStudyPlan, onNavigateToRadar }) {
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: { selected_option, text_answer, handwritten_image_base64 } }
  const [submitting, setSubmitting] = useState(false);
  const [gradingReport, setGradingReport] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 mins in sec
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(4);

  // Generate quiz on load or doc change
  const handleGenerateQuiz = async (docId = selectedDocId) => {
    setLoading(true);
    setGradingReport(null);
    setCurrentIdx(0);
    setAnswers({});

    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_ids: docId ? [docId] : null,
          num_questions: numQuestions,
          difficulty: quizDifficulty,
          include_handwritten: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQuiz(data);
        setTimeRemaining(data.time_limit_minutes * 60);
      }
    } catch (e) {
      console.error('Error generating quiz:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerateQuiz(selectedDocId);
  }, [selectedDocId]);

  // Timer countdown
  useEffect(() => {
    if (!quiz || gradingReport) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz, gradingReport]);

  const handleSelectOption = (qId, optionKey) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], selected_option: optionKey }
    }));
  };

  const handleTextAnswer = (qId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], text_answer: text }
    }));
  };

  const handleHandwrittenAnswer = (qId, imageBase64) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], handwritten_image_base64: imageBase64 }
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);

    const submissionPayload = {
      quiz_id: quiz.id,
      student_id: 'default_student',
      answers: quiz.questions.map((q) => {
        const ans = answers[q.id] || {};
        return {
          question_id: q.id,
          selected_option: ans.selected_option || null,
          text_answer: ans.text_answer || null,
          handwritten_image_base64: ans.handwritten_image_base64 || null,
          response_time_seconds: 45.0
        };
      })
    };

    try {
      const res = await fetch('/api/grading/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });

      if (res.ok) {
        const report = await res.json();
        setGradingReport(report);
      }
    } catch (e) {
      console.error('Submission error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="glass-panel p-16 text-center space-y-4">
        <Sparkles className="h-10 w-10 mx-auto text-indigo-400 animate-spin" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Synthesizing Adaptive Quiz...</h3>
          <p className="text-xs text-slate-400">
            Agent is parsing knowledge chunks, creating rubrics & balancing multi-format questions.
          </p>
        </div>
      </div>
    );
  }

  if (!quiz || quiz.questions.length === 0) {
    return (
      <div className="glass-panel p-12 text-center space-y-4">
        <Layers className="h-10 w-10 mx-auto text-indigo-400" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">No active quiz generated</h3>
          <p className="text-xs text-slate-400">
            Click below to generate an adaptive quiz from the indexed materials.
          </p>
        </div>
        <button onClick={() => handleGenerateQuiz()} className="btn-primary text-xs py-2 px-4 mx-auto">
          <Sparkles className="h-4 w-4" />
          <span>Generate New Quiz</span>
        </button>
      </div>
    );
  }

  const currentQ = quiz.questions[currentIdx];
  const currentAnswer = answers[currentQ.id] || {};
  const isLastQuestion = currentIdx === quiz.questions.length - 1;

  return (
    <div className="space-y-6">
      {/* Quiz Top Info Header */}
      <div className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-indigo-500/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white">
              {quiz.title}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              {currentQ.difficulty.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Topic Focus: <span className="text-cyan-400 font-semibold">{currentQ.topic}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
            <Clock className={`h-4 w-4 ${timeRemaining < 120 ? 'text-rose-400 animate-pulse' : 'text-indigo-400'}`} />
            <span className={timeRemaining < 120 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
              {formatTimer(timeRemaining)}
            </span>
          </div>

          <button
            onClick={() => handleGenerateQuiz()}
            className="text-xs text-slate-400 hover:text-slate-200 py-1.5 px-2.5 rounded bg-slate-800 hover:bg-slate-700"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Question Stepper Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {quiz.questions.map((q, idx) => {
          const isAnswered = answers[q.id]?.selected_option || answers[q.id]?.text_answer || answers[q.id]?.handwritten_image_base64;
          const isCurrent = idx === currentIdx;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(idx)}
              className={`flex-1 min-w-12 py-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1 transition-all ${
                isCurrent 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400'
                  : isAnswered
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>Q{idx + 1}</span>
              {isAnswered && <CheckCircle2 className="h-3 w-3" />}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono">Question {currentIdx + 1} of {quiz.questions.length}</span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Type: {currentQ.question_type.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-relaxed">
            {currentQ.question_text}
          </h3>
        </div>

        {/* MCQ Option Choices */}
        {currentQ.question_type === 'mcq' && currentQ.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options.map((opt) => {
              const isSelected = currentAnswer.selected_option === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleSelectOption(currentQ.id, opt.key)}
                  className={`p-4 rounded-xl text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 border ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span className={`h-6 w-6 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {opt.key}
                  </span>
                  <span className="leading-snug pt-0.5">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Short Answer Input */}
        {currentQ.question_type === 'short_answer' && (
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-300">
              Type your conceptual explanation:
            </label>
            <textarea
              rows={4}
              value={currentAnswer.text_answer || ''}
              onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
              placeholder="Explain the mechanism, equations, or computational properties..."
              className="w-full p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Handwritten Derivation Canvas Studio */}
        {currentQ.question_type === 'handwritten_derivation' && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <PenTool className="h-4 w-4" />
                <span>Handwritten Solution Canvas & Step-by-Step Proof</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Multimodal CNN / OCR Active
              </span>
            </div>

            <HandwritingCanvas
              initialImage={currentAnswer.handwritten_image_base64}
              onSaveAnswer={(imgBase64) => handleHandwrittenAnswer(currentQ.id, imgBase64)}
              questionPrompt={currentQ.question_text}
              topic={currentQ.topic}
              expectedAnswer={currentQ.expected_answer}
            />

            {/* Optional Fallback Text helper */}
            <div className="pt-1">
              <input
                type="text"
                placeholder="Optional text notes to accompany your handwritten sketch..."
                value={currentAnswer.text_answer || ''}
                onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Navigation & Submit Bar */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <button
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="btn-secondary text-xs py-2 px-3.5 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting}
              className="btn-primary text-xs py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-500/20"
            >
              <Send className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              <span>{submitting ? 'Evaluating with Vision & NLP...' : 'Submit & Grade Assessment'}</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentIdx((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
              className="btn-primary text-xs py-2 px-4"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grading Diagnostic Modal */}
      {gradingReport && (
        <GradingReportModal
          report={gradingReport}
          onClose={() => setGradingReport(null)}
          onNavigateToStudyPlan={onNavigateToStudyPlan}
          onNavigateToRadar={onNavigateToRadar}
        />
      )}
    </div>
  );
}
