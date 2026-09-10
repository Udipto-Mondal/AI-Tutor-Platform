import React from 'react';

/**
 * Executive-grade Responsive Vector Logo for AI Tutor Platform.
 * Deep Midnight Navy & Sapphire palette with cyan glowing neural core.
 * Fluidly responsive across mobile, tablet, and 4K desktop screens.
 */
export default function Logo({ size = 36, showWordmark = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 shrink-0 select-none group ${className}`}>
      {/* ── Vector Emblem ── */}
      <div
        className="relative flex items-center justify-center transition-all duration-300 group-hover:scale-105"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* Ambient Sapphire Glow */}
        <div
          className="absolute inset-0 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 50%, #06b6d4 100%)',
          }}
        />

        {/* SVG Emblem Canvas */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative drop-shadow-[0_2px_12px_rgba(37,99,235,0.45)]"
        >
          <defs>
            <linearGradient id="logo-navy-bg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b1739" />
              <stop offset="100%" stopColor="#070f26" />
            </linearGradient>
            <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="logo-grad-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.70)" />
              <stop offset="50%" stopColor="rgba(37, 99, 235, 0.45)" />
              <stop offset="100%" stopColor="rgba(30, 58, 138, 0.35)" />
            </linearGradient>
            <linearGradient id="logo-grad-core" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Squircle Frame in Deep Navy */}
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            rx="11"
            fill="url(#logo-navy-bg)"
            stroke="url(#logo-grad-stroke)"
            strokeWidth="1.5"
          />

          {/* Inner Geometric Neural Prism */}
          <path
            d="M20 9L29 15.5V24.5L20 31L11 24.5V15.5L20 9Z"
            stroke="url(#logo-grad-primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            fill="rgba(56, 189, 248, 0.08)"
          />

          {/* Internal Cross Facets */}
          <path
            d="M20 9V20M29 15.5L20 20M11 15.5L20 20M20 20V31M20 20L29 24.5M20 20L11 24.5"
            stroke="url(#logo-grad-core)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Core Glowing Node */}
          <circle cx="20" cy="20" r="2.5" fill="#38bdf8" />
          <circle cx="20" cy="20" r="4.5" stroke="#38bdf8" strokeWidth="1" opacity="0.45" />
        </svg>
      </div>

      {/* ── Wordmark (Responsive & Theme-Aligned) ── */}
      {showWordmark && (
        <div className="flex items-center gap-1.5">
          <span className="text-[17px] sm:text-[19px] font-black tracking-tight text-white font-heading">
            AI
          </span>
          <span className="text-[17px] sm:text-[19px] font-bold tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent font-heading">
            Tutor
          </span>
          <span className="hidden sm:inline-flex ml-1.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase text-cyan-300 bg-blue-950/80 border border-cyan-500/30 rounded-md shadow-xs">
            PLATFORM
          </span>
        </div>
      )}
    </div>
  );
}
