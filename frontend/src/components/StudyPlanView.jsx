import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  RotateCw, 
  BookOpen, 
  PenTool, 
  Flame, 
  ArrowRight,
  Layers,
  HelpCircle,
  Award
} from 'lucide-react';

export default function StudyPlanView({ onStartQuizWithTopic, onOpenHandwritingLab }) {
  const [studyPlan, setStudyPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeFlippedCards, setActiveFlippedCards] = useState({}); // { cardId: boolean }

  const fetchStudyPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/study-plan/default_student');
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data);
      }
    } catch (e) {
      console.error('Error loading study plan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyPlan();
  }, []);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const res = await fetch('/api/study-plan/task/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default_student',
          task_id: taskId,
          completed: !currentStatus
        })
      });
      if (res.ok) {
        // Update local state
        setStudyPlan((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            daily_schedule: prev.daily_schedule.map((t) => 
              t.id === taskId ? { ...t, completed: !currentStatus } : t
            )
          };
        });
      }
    } catch (e) {
      console.error('Task toggle error:', e);
    }
  };

  const handleRegeneratePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/study-plan/generate?student_id=default_student', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStudyPlan(data);
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCardFlip = (cardId) => {
    setActiveFlippedCards((prev) => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  if (loading || !studyPlan) {
    return (
      <div className="glass-panel p-16 text-center space-y-4">
        <Sparkles className="h-8 w-8 mx-auto text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Generating personalized remediation schedule & flashcards...</p>
      </div>
    );
  }

  const completedTasks = studyPlan.daily_schedule.filter(t => t.completed).length;
  const totalTasks = studyPlan.daily_schedule.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden border-indigo-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              <span>Adaptive Remediation Roadmap</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Personalized <span className="gradient-text-emerald">Study Plan</span>
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Tailored specifically to your weak concepts ({studyPlan.weak_topics.join(', ') || 'All Core Topics'}). Follow daily micro-sessions to reach concept mastery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center min-w-32">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Plan Progress</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {progressPct}%
              </div>
              <span className="text-[10px] text-slate-500">{completedTasks}/{totalTasks} tasks</span>
            </div>

            <button
              onClick={handleRegeneratePlan}
              className="btn-secondary text-xs py-2 px-3"
            >
              <RotateCw className="h-4 w-4 text-indigo-400" />
              <span>Re-optimize Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: 7-Day Task Schedule & Active Recall Flashcards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: 7-Day Roadmap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>Daily Actionable Roadmap</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              7-Day Sprint
            </span>
          </div>

          <div className="space-y-3">
            {studyPlan.daily_schedule.map((task) => (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task.id, task.completed)}
                className={`glass-panel p-4 flex items-start gap-3.5 cursor-pointer transition-all ${
                  task.completed 
                    ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                    : 'border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900/90'
                }`}
              >
                <button className="mt-0.5 text-slate-400 hover:text-emerald-400 transition-colors">
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${task.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      Day {task.day_number}: {task.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {task.duration_minutes} min
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {task.topic}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {task.task_type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Remediation Flashcards */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span>Targeted Remediation Flashcards</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Click to Flip
            </span>
          </div>

          <div className="space-y-4">
            {studyPlan.recommended_flashcards && studyPlan.recommended_flashcards.length > 0 ? (
              studyPlan.recommended_flashcards.map((fc) => {
                const isFlipped = !!activeFlippedCards[fc.id];
                return (
                  <div
                    key={fc.id}
                    onClick={() => toggleCardFlip(fc.id)}
                    className="glass-panel p-5 min-h-48 flex flex-col justify-between cursor-pointer border-indigo-500/20 hover:border-indigo-500/60 transition-all group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono">
                        {fc.topic}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <RotateCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-300 text-indigo-400" />
                        <span>{isFlipped ? 'Answer View' : 'Prompt View'}</span>
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="py-4 text-center">
                      {!isFlipped ? (
                        <p className="text-xs sm:text-sm font-bold text-slate-100 leading-relaxed">
                          {fc.front_prompt}
                        </p>
                      ) : (
                        <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono text-cyan-300 leading-relaxed">
                          {fc.back_solution}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 text-center text-[10px] text-slate-500">
                      {isFlipped ? 'Click again to return to question' : 'Click card to reveal proof & solution'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-panel p-8 text-center text-xs text-slate-400">
                No flashcards needed — all monitored concepts are in healthy status!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
