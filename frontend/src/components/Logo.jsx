import React from 'react';

/**
 * Executive-grade Vector SVG Logo for AI Tutor Platform.
 * Crisp, modern geometric neural prism with electric blue & cyan gradient.
 * Zero pixelation on Retina/4K screens.
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
        {/* Ambient Glow */}
        <div
          className="absolute inset-0 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #14b8a6 100%)',
          }}
        />

        {/* SVG Emblem Canvas */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative drop-shadow-[0_2px_12px_rgba(59,130,246,0.35)]"
        >
          <defs>
            <linearGradient id="logo-grad-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="logo-grad-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0.20)" />
            </linearGradient>
            <linearGradient id="logo-grad-core" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>

          {/* Outer Rounded Squircle Frame */}
          <rect
            x="2"
            y="2"
            width="36"
            height="36"
            rx="11"
            fill="#091122"
            stroke="url(#logo-grad-stroke)"
            strokeWidth="1.5"
          />

          {/* Inner Geometric Neural Prism */}
          {/* Top vertex to center */}
          <path
            d="M20 9L29 15.5V24.5L20 31L11 24.5V15.5L20 9Z"
            stroke="url(#logo-grad-primary)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            fill="rgba(59,130,246,0.08)"
          />

          {/* Internal Cross Facets */}
          <path
            d="M20 9V20M29 15.5L20 20M11 15.5L20 20M20 20V31M20 20L29 24.5M20 20L11 24.5"
            stroke="url(#logo-grad-core)"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Core Glowing Node */}
          <circle cx="20" cy="20" r="2.5" fill="#ffffff" />
          <circle cx="20" cy="20" r="4" stroke="#67e8f9" strokeWidth="1" opacity="0.6" />
        </svg>
      </div>

      {/* ── Wordmark & Badge ── */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[16px] sm:text-[18px] font-extrabold tracking-tight text-white font-heading">
                AI Tutor
              </span>
              <span className="text-[9.5px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-cyan-400 border border-cyan-500/25 tracking-wider font-mono uppercase">
                Studio
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
