import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  X,
  Send,
  BookOpen,
  ChevronDown,
  Loader2,
  Bot,
  Sparkles,
  KeyRound,
  Check
} from 'lucide-react';
import { getStoredDocuments } from '../utils/documentStorage';
import { getDocumentText } from '../utils/textStore';
import { cleanDocumentTitle } from '../utils/pdfExtractor';

const INITIAL_MSG = {
  role: 'assistant',
  content:
    "Hello! I'm Leo, your Socratic AI Tutor. Ask me anything about your study material — I'll guide you step by step through inquiry and progressive hints rather than just giving you the answer.",
  citations: ['Knowledge Vault'],
};

function isGreetingMessage(str) {
  const cleaned = (str || '').trim().toLowerCase().replace(/[^\w\s\u0980-\u09FF]/g, '');
  return (
    /^(?:hi|hello|hey|greetings|hola|good\s*(?:morning|afternoon|evening)|assalamu\s*alaikum|salam|sup|yo|হাই|হ্যালো|হে|সালাম|নমস্কার|কেমন\s*আছো|কেমন\s*আছেন)\b/i.test(cleaned) ||
    cleaned.length <= 3
  );
}

async function callGeminiTutor(apiKey, userMsg, history, docContext, docTitle) {
  const recentHistoryText = history
    .slice(-5)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Leo'}: ${m.content}`)
    .join('\n');

  const prompt = `You are 'Leo', a world-class, encouraging Socratic AI Tutor on the AI Tutor Platform.
Your goal is to guide the student to understand concepts on their own through guided inquiry, step-by-step reasoning, and progressive hints, rather than just giving away the answer.

Grounding Context from Student's Uploaded Notes ("${docTitle}"):
${(docContext || '').slice(0, 4500) || 'General academic concepts.'}

Recent Conversation:
${recentHistoryText}

Student's Question:
"${userMsg}"

Instructions:
1. If the student speaks Bengali, reply in natural, fluent Bengali. If English, reply in English.
2. Ground your explanations in their uploaded document ("${docTitle}") whenever possible.
3. Offer warm, encouraging Socratic guidance.
4. Provide 2 distinct, progressive hints.
5. Provide a thoughtful follow-up question.

Return ONLY a valid JSON object matching this schema (no markdown fences):
{
  "reply": "Conversational Socratic guidance",
  "hints": ["Hint 1", "Hint 2"],
  "citations": ["${docTitle}"],
  "follow_up": "Reflective follow-up question"
}`;

  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
        try {
          const parsed = JSON.parse(cleanJson);
          if (parsed.reply) {
            return {
              reply: parsed.reply,
              hints_provided: parsed.hints || [],
              citations: parsed.citations || [docTitle],
              follow_up_question: parsed.follow_up || null
            };
          }
        } catch {
          if (rawText.trim()) {
            return {
              reply: rawText.trim(),
              hints_provided: ["Focus on the key relationships stated in your study notes."],
              citations: [docTitle],
              follow_up_question: "How would you express this concept in your own words?"
            };
          }
        }
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Gemini API call failed');
}

function generateLocalSocraticReply(userMsg, docContext, docTitle) {
  const isBangla = /[\u0980-\u09FF]/.test(userMsg);
  let matchedExcerpt = '';
  if (docContext) {
    const sentences = docContext.split(/(?<=[.?!।\n])\s+/).filter(s => s.length > 15);
    const words = userMsg.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const best = sentences.find(s => words.some(w => s.toLowerCase().includes(w)));
    matchedExcerpt = best ? best.slice(0, 240) : sentences[0]?.slice(0, 240) || '';
  }

  if (isBangla) {
    return {
      reply: `চমৎকার প্রশ্ন! আসুন আপনার "${docTitle}" স্টাডি নোটের আলোকে বিষয়টি ধাপে ধাপে বিশ্লেষণ করি।\n\n${matchedExcerpt ? `> *"${matchedExcerpt}..."*\n\n` : ''}মূল ধারণাটি বুঝতে হলে প্রথমে দেখতে হবে এই বিষয়ে আপনার নোটে কী প্রধান কারণ বা প্রমাণ উপস্থাপন করা হয়েছে।`,
      hints_provided: [
        `নোটের "${docTitle}" অংশের সংশ্লিষ্ট মূল সংজ্ঞা ও তথ্যগুলো মনোযোগ দিয়ে লক্ষ্য করুন।`,
        `কার্যকারণ সম্পর্ক বা প্রধান ফলাফলগুলোর মধ্যে ধারাবাহিকতা বোঝার চেষ্টা করুন।`
      ],
      citations: [docTitle],
      follow_up_question: `আপনি কি এই প্রসঙ্গের প্রধান শিক্ষা বা সিদ্ধান্তটি সংক্ষেপে বলতে পারেন?`
    };
  }

  return {
    reply: `Great question! Let's explore this step-by-step using your "${docTitle}" material.\n\n${matchedExcerpt ? `> *"${matchedExcerpt}..."*\n\n` : ''}To unpack this conceptually, think about the primary principle or observation described in your reading.`,
    hints_provided: [
      `Review the definitions and evidence outlined in "${docTitle}".`,
      `Consider how intermediate steps lead up to the overall conclusion.`
    ],
    citations: [docTitle],
    follow_up_question: `How would you connect this principle to your own reasoning?`
  };
}

export default function SocraticTutorDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Active Gemini API key (loaded from .env via Vite or user-entered in drawer)
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '';
  const activeKey = (localStorage.getItem('gemini_api_key') || envKey || '').trim();

  useEffect(() => {
    if (!localStorage.getItem('gemini_api_key') && envKey) {
      try {
        localStorage.setItem('gemini_api_key', envKey);
      } catch {
        // ignore
      }
    }
  }, [envKey]);

  /* Dynamic quick prompts based on the student's actual active document */
  const docs = getStoredDocuments();
  const primaryDoc = docs[0] || null;
  const docTitle = primaryDoc ? cleanDocumentTitle(primaryDoc.filename) : 'Knowledge Vault';
  const isCoding = /\b(?:leetcode|dsa|data[\s_-]?structures?|algorithms?[\s_-]?design|cracking[\s_-]?the[\s_-]?coding)\b/i.test(primaryDoc?.filename || '');

  let dynamicPrompts = [
    `Summarize the key objectives of ${docTitle}`,
    'What are the core findings and principles?',
    'Give me a step-by-step hint on this topic',
    'Can you test my understanding with a question?'
  ];

  if (/blockchain/i.test(docTitle)) {
    dynamicPrompts = [
      'What are the primary evaluation criteria for Blockchain projects?',
      'How does consensus mechanism impact scalability?',
      'Explain smart contract security & architecture',
      'What are the key requirements for the Olympiad submission?'
    ];
  } else if (/dengue/i.test(docTitle)) {
    dynamicPrompts = [
      'What are the primary clinical stages of Dengue?',
      'How does mosquito vector transmission occur?',
      'Explain the warning signs and diagnostic criteria',
      'What are the recommended prevention protocols?'
    ];
  } else if (isCoding) {
    dynamicPrompts = [
      'Why does Sigmoid cause vanishing gradients?',
      'Explain the chain rule in backpropagation',
      'How does Adam optimizer work?',
      'What is dropout regularization?'
    ];
  }

  /* auto-scroll */
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  /* focus input when opened */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const handleSaveCustomKey = (e) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setKeySaved(true);
      setTimeout(() => {
        setKeySaved(false);
        setShowKeyConfig(false);
      }, 1500);
    }
  };

  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg) return;
    setMessages((p) => [...p, { role: 'user', content: msg }]);
    setInput('');
    setLoading(true);

    // Natural greeting intent handling
    if (isGreetingMessage(msg)) {
      const isBangla = /[\u0980-\u09FF]/.test(msg);
      const greetingReply = isBangla
        ? `হ্যালো! আমি লিও, আপনার সোক্রেটিক এআই টিউটর।\n\nআমি দেখতে পাচ্ছি আপনার স্টাডি ম্যাটেরিয়াল হিসেবে **"${docTitle}"** সংযুক্ত রয়েছে।\n\nআজ আপনি এই ডকুমেন্টের কোন বিষয়টি নিয়ে আলোচনা করতে চান? যেকোনো প্রশ্ন করুন—আমি আপনাকে সরাসরি উত্তর না দিয়ে ধাপে ধাপে বিষয়টির মূল ধারণা বুঝিয়ে দেব!`
        : `Hello! Great to have you here! I'm Leo, your Socratic AI Tutor.\n\nI see you have **"${docTitle}"** loaded in your workspace.\n\nWhat topic or question would you like to explore today? You can ask me to explain key principles, test your understanding, or work through a concept step by step!`;

      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: greetingReply,
          hints: [
            isBangla ? 'ডকুমেন্টের মূল উদ্দেশ্য বা নির্দিষ্ট কোনো পরিচ্ছেদ নিয়ে প্রশ্ন করতে পারেন।' : 'Try asking about the main purpose or a specific section of this document.',
            isBangla ? 'অথবা উপরের সাজেস্টেড প্রম্পট বাটনে ক্লিক করে দ্রুত শুরু করতে পারেন।' : 'Or click any of the suggested prompt buttons above to get started quickly.'
          ],
          citations: [docTitle],
          follow_up: isBangla ? 'আজ কোন বিষয়টি দিয়ে শুরু করতে চান?' : 'Which part of the material should we explore first?'
        }
      ]);
      setLoading(false);
      return;
    }

    // Retrieve authentic document context from storage/IndexedDB
    let docContext = '';
    if (primaryDoc) {
      try {
        const rec = await getDocumentText(primaryDoc.id);
        docContext = rec?.fullText || '';
      } catch {
        // ignore
      }
    }

    // 1. If Gemini API key is available, call Gemini 3.6 Flash directly from browser
    if (activeKey && activeKey.length > 10) {
      try {
        const geminiData = await callGeminiTutor(activeKey, msg, messages, docContext, docTitle);
        setMessages((p) => [
          ...p,
          {
            role: 'assistant',
            content: geminiData.reply,
            hints: geminiData.hints_provided || [],
            citations: geminiData.citations || [docTitle],
            follow_up: geminiData.follow_up_question,
          },
        ]);
        setLoading(false);
        return;
      } catch (err) {
        console.warn('Direct Gemini tutor call fallback:', err);
      }
    }

    // 2. Try backend endpoint if running
    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: 'default_student',
          message: msg,
          current_topic: docTitle,
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
            citations: data.citations || [docTitle],
            follow_up: data.follow_up_question,
          },
        ]);
        setLoading(false);
        return;
      }
    } catch {
      // backend offline
    }

    // 3. Grounded local Socratic synthesizer (never shows connection error)
    const localReply = generateLocalSocraticReply(msg, docContext, docTitle);
    setMessages((p) => [
      ...p,
      {
        role: 'assistant',
        content: localReply.reply,
        hints: localReply.hints_provided,
        citations: localReply.citations,
        follow_up: localReply.follow_up_question,
      },
    ]);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="chat-drawer animate-slide-in-right"
      role="dialog"
      aria-label="Leo AI Tutor"
    >
      {/* ── Header (Fixed, strictly non-overlapping) ── */}
      <div
        className="flex items-center justify-between px-4 py-3.5 shrink-0 relative z-10"
        style={{
          borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
          background: '#09122a',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#0284c7)',
              boxShadow: '0 2px 10px rgba(37,99,235,0.30)',
            }}
          >
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white leading-tight">Leo — AI Tutor</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-500/30 font-mono font-semibold flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-cyan-300" />
                <span>{activeKey ? 'Gemini 3.6 Flash' : 'Socratic AI'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[210px]" title={docTitle}>
              Grounded in {docTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-blue-950/50"
            title="Gemini API Key configuration"
            aria-label="Gemini API Key"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-white hover:bg-blue-950/50"
            aria-label="Close tutor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Optional Gemini Key Configuration Panel ── */}
      {showKeyConfig && (
        <form
          onSubmit={handleSaveCustomKey}
          className="p-3 bg-[#070e22] border-b border-blue-500/20 text-xs space-y-2 shrink-0 relative z-10 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-blue-400" />
              <span>Google Gemini API Key</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">
              {activeKey ? '● Connected' : '○ Not Configured'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder={activeKey ? '••••••••••••••••••••' : 'Enter Gemini API key...'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0c1838] border border-blue-500/30 text-white placeholder-slate-500 outline-none text-xs"
            />
            <button
              type="submit"
              className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap flex items-center gap-1"
            >
              {keySaved ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* ── Quick Prompts (Fixed bar, horizontal scroll, no overlap) ── */}
      <div
        className="flex gap-2 px-3 py-2.5 overflow-x-auto shrink-0 relative z-10"
        style={{ borderBottom: '1px solid rgba(59, 130, 246, 0.20)', background: '#070e20' }}
      >
        {dynamicPrompts.map((q, i) => (
          <button
            key={i}
            onClick={() => send(q)}
            className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors hover:bg-blue-900/40 truncate max-w-xs"
            style={{
              background: 'rgba(37,99,235,0.15)',
              border: '1px solid rgba(59,130,246,0.30)',
              color: '#93c5fd',
            }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* ── Messages (Strictly scrolling viewport with min-h-0) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 bg-[#060c1c]">
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
                      boxShadow: '0 2px 10px rgba(37,99,235,0.25)',
                    }
                  : {
                      background: '#0c1838',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      color: '#f1f5f9',
                      borderBottomLeftRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.30)',
                    }
              }
            >
              <p className="whitespace-pre-wrap text-[13px]">{m.content}</p>

              {/* Hints */}
              {m.hints?.length > 0 && (
                <div
                  className="mt-2.5 pt-2.5 space-y-1"
                  style={{ borderTop: '1px solid rgba(59, 130, 246, 0.20)' }}
                >
                  <p className="text-[11px] font-semibold text-blue-400">
                    Guided hints:
                  </p>
                  {m.hints.map((h, hi) => (
                    <p key={hi} className="text-[12px] text-slate-300">
                      {hi + 1}. {h}
                    </p>
                  ))}
                </div>
              )}

              {/* Citations */}
              {m.citations?.length > 0 && (
                <div
                  className="flex items-center gap-1.5 mt-2 pt-2"
                  style={{ borderTop: '1px solid rgba(59, 130, 246, 0.20)' }}
                >
                  <BookOpen className="h-3 w-3 shrink-0 text-blue-400" />
                  <span className="text-[10.5px] text-slate-400">
                    {m.citations.join(', ')}
                  </span>
                </div>
              )}

              {/* Follow-up suggestion */}
              {m.follow_up && (
                <button
                  onClick={() => send(m.follow_up)}
                  className="mt-2 flex items-center gap-1.5 text-[11px] font-medium transition-opacity hover:opacity-80 text-cyan-400 hover:text-cyan-300"
                >
                  <ChevronDown className="h-3 w-3" />
                  {m.follow_up}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-blue-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Leo is formulating Socratic guidance...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Bar (Fixed at bottom) ── */}
      <div
        className="px-4 py-3 bg-[#09122a] shrink-0 relative z-10"
        style={{ borderTop: '1px solid rgba(59, 130, 246, 0.25)' }}
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
            placeholder={`Ask Leo about ${docTitle}...`}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-xl outline-none transition-colors border border-blue-500/30 text-white bg-[#060c1c] focus:bg-[#0c1838] focus:border-blue-400 placeholder-slate-500"
            style={{
              caretColor: '#60a5fa',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-35"
            style={{
              background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              boxShadow: '0 2px 10px rgba(37,99,235,0.30)',
            }}
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
}
