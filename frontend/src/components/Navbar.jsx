import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  PenLine,
  BarChart3,
  CalendarCheck,
  Gauge,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'vault',      label: 'Knowledge Vault', icon: BookOpen,      tag: 'RAG' },
  { id: 'quiz',       label: 'Quiz Studio',      icon: Zap,           tag: 'Agent' },
  { id: 'canvas',     label: 'Handwriting Lab',  icon: PenLine,       tag: 'Vision' },
  { id: 'radar',      label: 'Mastery Radar',    icon: BarChart3,     tag: 'ML' },
  { id: 'study_plan', label: 'Study Plan',        icon: CalendarCheck, tag: 'Adaptive' },
  { id: 'mlops',      label: 'MLOps Hub',         icon: Gauge,         tag: 'MLflow' },
];

export default function Navbar({ activeTab, setActiveTab, onOpenTutor }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTab = (id) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: 'rgba(6,11,20,0.92)',
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* ── Brand Logo (Humanized Black Circle Icon) ── */}
            <button
              onClick={() => handleTab('vault')}
              className="flex items-center gap-2.5 sm:gap-3 shrink-0 group focus:outline-none transition-transform duration-200 active:scale-95"
              aria-label="AI Tutor — Go to Knowledge Vault"
            >
              <div
                className="relative rounded-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.45)]"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  border: '1.5px solid rgba(255, 255, 255, 0.14)',
                  boxShadow: '0 0 16px rgba(59,130,246,0.30), 0 2px 8px rgba(0,0,0,0.5)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: '#0a0f1d',
                }}
              >
                <img
                  src="/ai-tutor-circle.png"
                  alt="AI Tutor"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '9999px',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              {/* Clean professional wordmark — visible on all viewports */}
              <div className="flex items-center gap-1.5 font-heading">
                <span className="text-[15px] sm:text-[17px] font-extrabold text-white tracking-tight">
                  AI Tutor
                </span>
                <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-400 border border-cyan-500/25 tracking-wide font-mono">
                  Platform
                </span>
              </div>
            </button>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
              {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTab(id)}
                    style={{
                      position: 'relative',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      transition: 'all 0.18s ease',
                      color: active ? '#93c5fd' : '#94a3b8',
                      background: active ? 'rgba(37,99,235,0.12)' : 'transparent',
                      border: active ? '1px solid rgba(59,130,246,0.28)' : '1px solid transparent',
                    }}
                  >
                    <Icon style={{ width: '13px', height: '13px', flexShrink: 0 }} />
                    <span>{label}</span>
                    {active && (
                      <span style={{
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        height: '2px',
                        width: '28px',
                        borderRadius: '99px',
                        background: 'linear-gradient(90deg,#3b82f6,#14b8a6)',
                      }} />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* ── Right Actions ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                onClick={onOpenTutor}
                className="btn-primary hidden sm:inline-flex"
                aria-label="Open AI Tutor"
              >
                <MessageSquare style={{ width: '15px', height: '15px' }} />
                <span className="hidden md:inline">Ask Leo</span>
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden"
                aria-label="Toggle menu"
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  background: mobileOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {mobileOpen
                  ? <X style={{ width: '20px', height: '20px' }} />
                  : <Menu style={{ width: '20px', height: '20px' }} />
                }
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Drawer ── */}
        {mobileOpen && (
          <div
            className="lg:hidden animate-fade-up"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              background: 'rgba(8,14,26,0.98)',
            }}
          >
            <div
              className="max-w-screen-xl mx-auto px-4 py-3"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}
            >
              {NAV_ITEMS.map(({ id, label, icon: Icon, tag }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleTab(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      background: active ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '1px solid rgba(59,130,246,0.32)'
                        : '1px solid rgba(255,255,255,0.06)',
                      color: active ? '#93c5fd' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon style={{ width: '15px', height: '15px', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '12.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {label}
                      </p>
                      <p style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                        {tag}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={() => { onOpenTutor(); setMobileOpen(false); }}
                className="btn-primary w-full justify-center"
                style={{ paddingTop: '12px', paddingBottom: '12px' }}
              >
                <MessageSquare style={{ width: '15px', height: '15px' }} />
                Ask Leo — AI Tutor
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
