import React from 'react';

/**
 * MathText Component
 * Renders mathematical expressions, Greek symbols, superscripts, and subscripts
 * with executive-grade typography instead of raw unparsed strings (e.g. w_ij^(l) -> w_ij^(l)).
 */

// Greek letter dictionary
const GREEK_MAP = {
  delta: 'δ',
  Delta: 'Δ',
  sigma: 'σ',
  Sigma: 'Σ',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  lambda: 'λ',
  theta: 'θ',
  pi: 'π',
  omega: 'ω',
  mu: 'μ',
  epsilon: 'ε',
  phi: 'φ',
};

function formatMathToken(token, key) {
  // Clean dollar signs, asterisks, backslashes
  let clean = token.replace(/^\$+|\$+$/g, '').replace(/^\\/, '');

  // Check for Greek words
  for (const [name, sym] of Object.entries(GREEK_MAP)) {
    const reg = new RegExp(`\\\\?${name}`, 'g');
    clean = clean.replace(reg, sym);
  }

  // Replace \times with ×
  clean = clean.replace(/\\?times/g, '×');
  clean = clean.replace(/\\?cdot/g, '·');
  clean = clean.replace(/\\?partial/g, '∂');

  // If token is a derivative ratio like dL/dw_ij, dL/dz_j, dz_j/dw_ij
  const derivMatch = clean.match(/^d([A-Za-z]+)\/d([a-zA-Z_0-9\^()]+)$/);
  if (derivMatch) {
    const num = derivMatch[1];
    const den = derivMatch[2].replace(/[{}]/g, '');
    return (
      <span key={key} className="inline-flex items-center px-1 py-0.5 rounded bg-blue-50/80 border border-blue-200/80 font-serif italic text-blue-800 font-semibold text-[0.92em]">
        <span>∂{num}</span>
        <span className="mx-0.5 not-italic text-slate-400">/</span>
        <span>∂{den}</span>
      </span>
    );
  }

  // Check if token contains sub/sup: e.g. w_ij^(l), delta_j^(l), a_i^(l-1), W^T
  const subSupRegex = /^([a-zA-ZδΔσΣαβγλθπωμεφ∂]+)(?:_([a-zA-Z0-9]+|\{[^}]+\}))?(?:\^(\([^)]+\)|[a-zA-Z0-9]+|\{[^}]+\}))?$/;
  const match = clean.match(subSupRegex);

  if (match) {
    const [, base, sub, sup] = match;
    const cleanSub = sub ? sub.replace(/[{}]/g, '') : null;
    const cleanSup = sup ? sup.replace(/[{()}]/g, '') : null;

    return (
      <span
        key={key}
        className="inline-flex items-baseline font-serif italic text-blue-700 font-bold px-0.5 tracking-tight"
      >
        <span>{base}</span>
        {cleanSub && (
          <sub className="text-[0.72em] font-sans not-italic text-blue-600 -bottom-0.5 relative ml-[0.5px]">
            {cleanSub}
          </sub>
        )}
        {cleanSup && (
          <sup className="text-[0.72em] font-sans not-italic text-blue-600 -top-1 relative ml-[0.5px]">
            {cleanSup}
          </sup>
        )}
      </span>
    );
  }

  // If token is a mathematical dimension like 32x32 or 32\times32 or 5x5
  const dimMatch = clean.match(/^(\d+)\s*(?:[xX×]|\\times)\s*(\d+)$/);
  if (dimMatch) {
    return (
      <span key={key} className="inline-block font-mono text-blue-800 font-medium px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[0.9em]">
        {dimMatch[1]} × {dimMatch[2]}
      </span>
    );
  }

  // If token is an isolated mathematical assignment like P = 2 or S = 1 or O = ...
  if (/^[A-Za-z]\s*=\s*[\d\w]/.test(clean)) {
    return (
      <span key={key} className="inline-block font-mono text-blue-800 font-medium px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[0.9em]">
        {clean}
      </span>
    );
  }

  // Single math variable like L, l, W, X, b, z
  if (/^[a-zA-Z]$/.test(clean)) {
    return (
      <span key={key} className="font-serif italic text-blue-700 font-bold px-0.5">
        {clean}
      </span>
    );
  }

  // Fallback math span
  return (
    <span key={key} className="font-mono text-blue-800 text-[0.95em]">
      {clean}
    </span>
  );
}

export default function MathText({ text, className = '' }) {
  if (!text) return null;

  // Split by LaTeX math blocks $...$ or words
  // First, check if text has $...$ blocks
  const parts = [];
  const segments = text.split(/(\$[^$]+\$)/g);

  let keyCounter = 0;

  segments.forEach((seg) => {
    if (!seg) return;

    if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 1) {
      // It's a math expression
      const inner = seg.slice(1, -1).trim();
      const tokens = inner.split(/\s+/);
      tokens.forEach((tok) => {
        parts.push(formatMathToken(tok, `math-${keyCounter++}`));
        parts.push(' ');
      });
    } else {
      // Normal text: check for math words like w_ij^(l), delta_j^(l), etc.
      const words = seg.split(/(\s+)/);
      words.forEach((w) => {
        if (/^\s+$/.test(w)) {
          parts.push(w);
          return;
        }

        // Check if word contains math patterns
        const isMathWord =
          /[_\^]/.test(w) ||
          /\\?(?:delta|sigma|alpha|beta|gamma|lambda|times|partial)/i.test(w) ||
          /^\d+\s*(?:\\times|[xX])\s*\d+$/.test(w) ||
          /^[A-Z]=/.test(w);

        // Check for isolated variable wrapped in punctuation: e.g. "loss L", "layer l"
        const cleanWord = w.replace(/[.,:;?!()]/g, '');
        const isSingleVar = cleanWord.length === 1 && /^[A-Za-z]$/.test(cleanWord) && (w.includes('L') || w.includes('l'));

        if (isMathWord) {
          // Extract leading/trailing punctuation
          const leadPunct = w.match(/^[.,:;?!()]+/)?.[0] || '';
          const trailPunct = w.match(/[.,:;?!()]+$/)?.[0] || '';
          const core = w.slice(leadPunct.length, w.length - trailPunct.length);

          if (leadPunct) parts.push(leadPunct);
          parts.push(formatMathToken(core, `tok-${keyCounter++}`));
          if (trailPunct) parts.push(trailPunct);
        } else if (isSingleVar) {
          const leadPunct = w.match(/^[.,:;?!()]+/)?.[0] || '';
          const trailPunct = w.match(/[.,:;?!()]+$/)?.[0] || '';
          const core = w.slice(leadPunct.length, w.length - trailPunct.length);

          if (leadPunct) parts.push(leadPunct);
          parts.push(formatMathToken(core, `var-${keyCounter++}`));
          if (trailPunct) parts.push(trailPunct);
        } else {
          // Normal word
          parts.push(w);
        }
      });
    }
  });

  return (
    <span className={`inline leading-relaxed ${className}`}>
      {parts}
    </span>
  );
}
