import React, { useState } from 'react';
import {
  BookOpen,
  Zap,
  PenLine,
  BarChart3,
  CalendarCheck,
  GitBranch,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import Logo from './Logo';

const NAV_ITEMS = [
  { id: 'vault',      label: 'Knowledge Vault', icon: BookOpen,      tag: 'RAG' },
  { id: 'quiz',       label: 'Quiz Studio',      icon: Zap,           tag: 'Agent' },
  { id: 'canvas',     label: 'Handwriting Lab',  icon: PenLine,       tag: 'Vision' },
  { id: 'radar',      label: 'Mastery Radar',    icon: BarChart3,     tag: 'ML' },
  { id: 'study_plan', label: 'Study Plan',        icon: CalendarCheck, tag: 'Adaptive' },
  { id: 'mlops',      label: 'MLOps Hub',         icon: GitBranch,     tag: 'MLflow' },
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
        className="sticky top-0 z-40 w-full transition-colors duration-300"
        style={{
          background: 'rgba(235, 245, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(186, 230, 253, 0.75)',
          boxShadow: '0 2px 16px rgba(37, 99, 235, 0.04)',
        }}
      >
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* ── Brand Logo (Vector Geometric Neural Prism) ── */}
            <button
              onClick={() => handleTab('vault')}
              className="focus:outline-none transition-transform duration-200 active:scale-95"
              aria-label="AI Tutor — Go to Knowledge Vault"
            >
              <Logo size={38} />
            </button>

            {/* ── Desktop Nav ── */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
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
                      fontWeight: active ? 600 : 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      transition: 'all 0.18s ease',
                      color: active ? '#1d4ed8' : '#475569',
                      background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
                      border: active ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    }}
                  >
                    <Icon style={{ width: '14px', height: '14px', flexShrink: 0, color: active ? '#2563eb' : '#64748b' }} />
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
                        background: 'linear-gradient(90deg,#2563eb,#0284c7)',
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
              borderTop: '1px solid rgba(186, 230, 253, 0.75)',
              background: 'rgba(235, 245, 255, 0.98)',
              backdropFilter: 'blur(24px)',
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
                      background: active ? 'rgba(37,99,235,0.10)' : 'rgba(255,255,255,0.70)',
                      border: active
                        ? '1px solid rgba(37,99,235,0.30)'
                        : '1px solid rgba(186,230,253,0.50)',
                      color: active ? '#1d4ed8' : '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <Icon style={{ width: '15px', height: '15px', flexShrink: 0, color: active ? '#2563eb' : '#64748b' }} />
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
