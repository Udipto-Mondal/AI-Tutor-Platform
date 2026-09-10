import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  RotateCw, 
  BookOpen, 
  PenTool, 
  Layers,
  HelpCircle,
  Award
} from 'lucide-react';
import MathText from './MathText';

const DEFAULT_FALLBACK_PLAN = {
  plan_id: 'plan_default_01',
  student_id: 'default_student',
  weak_topics: ['Backpropagation & Gradients', 'Activation Functions'],
  encouragement_note: 'You are making steady progress! Focusing 20-30 minutes daily on Backpropagation & Gradients will bring your mastery above 85%.',
  daily_schedule: [
    {
      id: 'task_01',
      day_number: 1,
      topic: 'Backpropagation & Gradients',
      task_type: 'concept_review',
      title: 'Master Core Concept: Backpropagation & Gradients',
      description: 'Read course notes on Backpropagation. Review the calculus Chain Rule and intermediate delta equations.',
      duration_minutes: 25,
      completed: false
    },
    {
      id: 'task_02',
      day_number: 2,
      topic: 'Backpropagation & Gradients',
      task_type: 'handwritten_practice',
      title: 'Handwritten Derivation Practice: Backpropagation',
      description: 'Write out the complete step-by-step partial derivative dL/dw_ij by hand on the canvas.',
      duration_minutes: 20,
      completed: false
    },
    {
      id: 'task_03',
      day_number: 3,
      topic: 'Activation Functions',
      task_type: 'quiz',
      title: 'Targeted Retention Assessment: Activation Functions',
      description: 'Take a 4-question adaptive quiz to verify your understanding of Sigmoid and ReLU derivatives.',
      duration_minutes: 15,
      completed: false
    },
    {
      id: 'task_04',
      day_number: 4,
      topic: 'Convolutional Neural Networks',
      task_type: 'concept_review',
      title: 'Spatial Dimension Calculations: CNNs',
      description: 'Practice calculating output spatial sizes O = ((W - K + 2P)/S) + 1 for various kernel configurations.',
      duration_minutes: 20,
      completed: false
    }
  ],
  recommended_flashcards: [
    {
      id: 'fc_01',
      topic: 'Backpropagation & Gradients',
      front_prompt: 'What is the Chain Rule formula used to compute dL/dw_ij?',
      back_solution: 'dL/dw_ij = (dL/dz_j) * (dz_j/dw_ij) = delta_j * a_i^(l-1)',
      difficulty: 'Medium'
    },
    {
      id: 'fc_02',
      topic: 'Convolutional Neural Networks',
      front_prompt: 'What is the spatial output size formula for a convolutional layer?',
      back_solution: 'O = floor((W - K + 2P)/S) + 1, where W=input size, K=kernel, P=padding, S=stride.',
      difficulty: 'Medium'
    },
    {
      id: 'fc_03',
      topic: 'Activation Functions',
      front_prompt: 'Why does Sigmoid suffer from the vanishing gradient problem?',
      back_solution: "Its derivative sigma'(z) = sigma(z)(1 - sigma(z)) has a max value of 0.25, dampening gradients in deep networks.",
      difficulty: 'Hard'
    }
  ]
};

export default function StudyPlanView({ onStartQuizWithTopic, onOpenHandwritingLab }) {
  const [studyPlan, setStudyPlan] = useState(DEFAULT_FALLBACK_PLAN);
  const [loading, setLoading] = useState(false);
  const [activeFlippedCards, setActiveFlippedCards] = useState({});

  const fetchStudyPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/study-plan/default_student');
      if (res.ok) {
        const data = await res.json();
        if (data && data.daily_schedule && data.daily_schedule.length > 0) {
          setStudyPlan(data);
        }
      }
    } catch (e) {
      console.warn('Backend connecting, using baseline study plan:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudyPlan();
  }, []);

  const handleToggleTask = async (taskId, currentStatus) => {
    // Optimistic UI update
    setStudyPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        daily_schedule: prev.daily_schedule.map((t) => 
          t.id === taskId ? { ...t, completed: !currentStatus } : t
        )
      };
    });

    try {
      await fetch('/api/study-plan/task/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default_student',
          task_id: taskId,
          completed: !currentStatus
        })
      });
    } catch (e) {
      console.warn('Failed to sync task toggle to backend:', e);
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

  const schedule = studyPlan.daily_schedule || DEFAULT_FALLBACK_PLAN.daily_schedule;
  const completedTasks = schedule.filter(t => t.completed).length;
  const totalTasks = schedule.length;
  const progressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden border-blue-500/25">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              <span>Adaptive Remediation Roadmap</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Personalized <span className="gradient-text-emerald">Study Plan</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tailored specifically to your weak concepts ({(studyPlan.weak_topics || []).join(', ') || 'All Core Topics'}). Follow daily micro-sessions to reach concept mastery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-[#0a1329] border border-blue-500/25 text-center min-w-32 shadow-md">
              <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Plan Progress</span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {progressPct}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono">{completedTasks}/{totalTasks} tasks</span>
            </div>

            <button
              onClick={handleRegeneratePlan}
              className="btn-secondary text-xs py-2 px-3"
            >
              <RotateCw className={`h-4 w-4 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
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
            {schedule.map((task) => (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task.id, task.completed)}
                className={`glass-panel p-4 flex items-start gap-3.5 cursor-pointer transition-all ${
                  task.completed 
                    ? 'bg-slate-900/40 border-slate-800 opacity-60' 
                    : 'bg-[#0a1329] border-blue-500/20 hover:border-emerald-500/40 hover:bg-emerald-950/10 shadow-xs'
                }`}
              >
                <button className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors">
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-500" />
                  )}
                </button>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                      Day {task.day_number}: {task.title}
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-blue-950/60 text-slate-300 font-mono border border-blue-800/60">
                      {task.duration_minutes} min
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-medium bg-blue-950/60 text-blue-300 border border-blue-800">
                      {task.topic}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
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
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>Targeted Remediation Flashcards</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Click to Flip
            </span>
          </div>

          <div className="space-y-4">
            {(studyPlan.recommended_flashcards || DEFAULT_FALLBACK_PLAN.recommended_flashcards).map((fc) => {
              const isFlipped = !!activeFlippedCards[fc.id];
              return (
                <div
                  key={fc.id}
                  onClick={() => toggleCardFlip(fc.id)}
                  className="glass-panel p-5 min-h-48 flex flex-col justify-between cursor-pointer border-blue-500/25 hover:border-blue-400/50 bg-[#0a1329] shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-medium bg-blue-950/60 text-blue-300 border border-blue-800">
                      {fc.topic}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <RotateCw className="h-3 w-3 group-hover:rotate-180 transition-transform duration-300 text-blue-400" />
                      <span>{isFlipped ? 'Answer View' : 'Prompt View'}</span>
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="py-4 text-center">
                    {!isFlipped ? (
                      <p className="text-xs sm:text-sm font-medium text-white leading-relaxed">
                        <MathText text={fc.front_prompt} />
                      </p>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-[#060d1d] border border-blue-500/30 text-xs font-mono text-blue-200 leading-relaxed text-left">
                        <MathText text={fc.back_solution} />
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-center text-[10px] text-slate-400">
                    {isFlipped ? 'Click again to return to question' : 'Click card to reveal proof & solution'}
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
