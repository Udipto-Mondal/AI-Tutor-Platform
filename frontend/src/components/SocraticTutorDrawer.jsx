import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Lightbulb, 
  BookOpen, 
  HelpCircle,
  BrainCircuit,
  CornerDownLeft
} from 'lucide-react';

export default function SocraticTutorDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm Leo, your Socratic AI Tutor. 🎓 I won't just hand you final answers—I'll guide your thinking step-by-step so you master the underlying intuitions and math proofs. What concept would you like to explore?",
      hints: ["Ask for a conceptual explanation", "Ask for a step-by-step mathematical hint"],
      citations: ["deep_learning_neural_networks.md"]
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    "Why does Sigmoid suffer from vanishing gradients?",
    "Derive the output dimensions of a 32x32 CNN with 5x5 filter",
    "How does Adam combine Momentum & RMSprop?",
    "Give me a hint on Backpropagation chain rule"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend = inputMessage) => {
    if (!textToSend.trim()) return;

    const userMsg = { role: 'user', content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default_student',
          message: textToSend,
          chat_history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            hints: data.hints_provided || [],
            citations: data.citations || [],
            follow_up: data.follow_up_question
          }
        ]);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having a brief connection hitch. Remember: in backpropagation, every weight gradient is computed as the local error delta times the upstream activation!",
          hints: ["Review your notes in the Knowledge Vault."],
          citations: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950/95 border-l border-indigo-500/30 backdrop-blur-xl shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-500/30">
            <Bot className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Leo Socratic Tutor</h3>
              <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Grounded in your Knowledge Vault
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
          >
            <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                : 'glass-panel text-slate-200 rounded-bl-none border-slate-800 space-y-2'
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>

              {/* Citations Tag */}
              {m.citations && m.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <BookOpen className="h-3 w-3 text-indigo-400" />
                  <span>Notes: {m.citations.join(', ')}</span>
                </div>
              )}

              {/* Hints Box */}
              {m.hints && m.hints.length > 0 && (
                <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-900/50 space-y-1 text-[11px] text-indigo-300">
                  <div className="flex items-center gap-1 font-bold">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                    <span>Scaffolded Hints:</span>
                  </div>
                  {m.hints.map((hint, hIdx) => (
                    <p key={hIdx} className="text-slate-300 pl-4 list-disc">• {hint}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
            <Sparkles className="h-4 w-4 animate-spin" />
            <span>Leo is formulating Socratic inquiry...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/40 overflow-x-auto flex gap-1.5 scrollbar-none">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qp)}
            className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/60 shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask a question or explain your reasoning..."
            className="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="p-2.5 rounded-xl bg-indigo-600 text-white disabled:opacity-30 hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/30"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
