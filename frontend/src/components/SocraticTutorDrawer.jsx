import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  BookOpen,
  ChevronDown,
  Loader2,
  Bot
} from 'lucide-react';

const QUICK_PROMPTS = [
  'Why does Sigmoid cause vanishing gradients?',
  'Explain the chain rule in backpropagation',
  'How does Adam optimizer work?',
  'What is dropout regularization?',
];

const INITIAL_MSG = {
  role: 'assistant',
  content:
    "Hello! I'm Leo, your AI Tutor. Ask me anything about your study material — I'll guide you step by step rather than just giving you the answer.",
  citations: ['Knowledge Vault'],
};

export default function SocraticTutorDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef               = useRef(null);
  const inputRef                = useRef(null);

  /* auto-scroll */
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  /* focus input when opened */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg) return;
    setMessages((p) => [...p, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default_student',
          message: msg,
          chat_history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((p) => [
          ...p,
          {
            role: 'assistant',
            content: data.reply,
            hints: data.hints_provided || [],
            citations: data.citations || [],
            follow_up: data.follow_up_question,
          },
        ]);
      } else throw new Error('Network error');
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content:
            "I'm having a connection issue right now. Try refreshing or check your Knowledge Vault notes for context.",
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="chat-drawer animate-slide-in-right"
      role="dialog"
      aria-label="Leo AI Tutor"
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3.5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(13, 21, 37, 0.70)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#0891b2)',
              boxShadow: '0 0 16px rgba(37,99,235,0.45)',
            }}
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Leo — AI Tutor</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Grounded in your Knowledge Vault
            </p>
          </div>
          <span className="badge badge-green ml-1">Live</span>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Close tutor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Quick Prompts ── */}
      <div
        className="flex gap-2 px-3 py-2.5 overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        {QUICK_PROMPTS.map((q, i) => (
          <button
            key={i}
            onClick={() => send(q)}
            className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors"
            style={{
              background: 'rgba(37,99,235,0.10)',
              border: '1px solid rgba(59,130,246,0.20)',
              color: '#93c5fd',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className="max-w-[88%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
              style={
                m.role === 'user'
                  ? {
                      background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                      color: '#fff',
                      borderBottomRightRadius: '4px',
                      boxShadow: '0 2px 10px rgba(37,99,235,0.30)',
                    }
                  : {
                      background: 'rgba(20,30,52,0.85)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      color: '#cbd5e1',
                      borderBottomLeftRadius: '4px',
                    }
              }
            >
              <p className="whitespace-pre-wrap text-[13px]">{m.content}</p>

              {/* Hints */}
              {m.hints?.length > 0 && (
                <div
                  className="mt-2.5 pt-2.5 space-y-1"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-[11px] font-semibold" style={{ color: '#93c5fd' }}>
                    Guided hints:
                  </p>
                  {m.hints.map((h, hi) => (
                    <p key={hi} className="text-[12px]" style={{ color: '#94a3b8' }}>
                      {hi + 1}. {h}
                    </p>
                  ))}
                </div>
              )}

              {/* Citations */}
              {m.citations?.length > 0 && (
                <div
                  className="flex items-center gap-1.5 mt-2 pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <BookOpen className="h-3 w-3 shrink-0" style={{ color: '#60a5fa' }} />
                  <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                    {m.citations.join(', ')}
                  </span>
                </div>
              )}

              {/* Follow-up suggestion */}
              {m.follow_up && (
                <button
                  onClick={() => send(m.follow_up)}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#5eead4' }}
                >
                  <ChevronDown className="h-3 w-3" />
                  {m.follow_up}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[12px]" style={{ color: '#60a5fa' }}>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Leo is thinking...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl outline-none transition-colors"
            style={{
              background: 'rgba(20,30,52,0.80)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#f0f4ff',
              caretColor: '#3b82f6',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'rgba(59,130,246,0.45)')}
            onBlur={(e)  => (e.target.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-35"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              boxShadow: '0 2px 10px rgba(37,99,235,0.40)',
            }}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
