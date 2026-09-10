/**
 * Client-Side Document & PDF Text Extractor
 * Extracts authentic text, detects language, extracts chapter titles/headings,
 * and chunks content for real RAG and quiz generation in the browser.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Vite and production deployments
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.0'}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Extract full text and structure from an uploaded File (PDF, TXT, MD)
 * @param {File} file 
 * @returns {Promise<{ fullText: string, topics: string[], chapters: Array<{title: string, text: string}>, isBangla: boolean, numPages: number }>}
 */
/**
 * Cleans and sanitizes raw PDF/Document text:
 * Strips unicode replacement character (\uFFFD), unprintable chars,
 * fixes broken ligatures and common OCR/PDF font mapping artifacts.
 */
export function sanitizeExtractedText(str) {
  if (!str) return '';
  return str
    // Strip unicode replacement characters (\uFFFD -> '')
    .replace(/\uFFFD+/g, ' ')
    // Normalize zero-width, non-breaking spaces, and control chars
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\uFEFF]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Fix common unicode ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
    // Fix common OCR / textbook decoding anomalies
    .replace(/\bQ!JESTIONS\b/gi, 'QUESTIONS')
    .replace(/\bQ!UESTIONS\b/gi, 'QUESTIONS')
    .replace(/\bAPP LE\b/gi, 'APPLE')
    .replace(/\bMcDOWELL\b/gi, 'McDowell')
    .replace(/the\s+[\uFFFD\.\·]+\s*CODING/gi, 'the CODING')
    // Fix hyphenated line wraps (e.g. "com-\nplexity" -> "complexity")
    .replace(/([a-zA-Z]{3,})-\s*\n\s*([a-zA-Z]{3,})/g, '$1$2')
    // Collapse redundant spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Extract full text and structure from an uploaded File (PDF, TXT, MD)
 * @param {File} file 
 * @returns {Promise<{ fullText: string, topics: string[], chapters: Array<{title: string, text: string}>, isBangla: boolean, numPages: number, pages?: Array<{pageNumber: number, text: string}> }>}
 */
export async function extractDocumentContent(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    const rawText = await file.text();
    const sanitized = sanitizeExtractedText(rawText);
    return processExtractedText(sanitized, file.name, 1, [{ pageNumber: 1, text: sanitized }]);
  }

  if (ext === 'pdf') {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });

      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const pagesData = [];

      // Extract up to 60 pages to maintain speedy browser performance
      const maxPages = Math.min(numPages, 60);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageRaw = content.items
            .map((item) => item.str || '')
            .join(' ');
          const cleanedPage = sanitizeExtractedText(pageRaw);
          if (cleanedPage && cleanedPage.length > 5) {
            pagesData.push({ pageNumber: i, text: cleanedPage });
          }
        } catch (pageErr) {
          console.warn(`Error reading page ${i}:`, pageErr);
        }
      }

      const fullText = pagesData.map(p => p.text).join('\n\n');
      return processExtractedText(fullText, file.name, numPages, pagesData);
    } catch (pdfErr) {
      console.error('PDF extraction failed, falling back to text stream:', pdfErr);
      // Fallback: try raw text decode in case it contains readable streams
      try {
        const raw = await file.text();
        const readable = sanitizeExtractedText(raw.replace(/[^\x20-\x7E\u0980-\u09FF\n\r\t]/g, ' '));
        if (readable.length > 200) {
          return processExtractedText(readable, file.name, 1, [{ pageNumber: 1, text: readable }]);
        }
      } catch {
        // ignore
      }
      throw pdfErr;
    }
  }

  // Fallback for other files
  const fallbackText = await file.text().catch(() => '');
  const sanitizedFallback = sanitizeExtractedText(fallbackText);
  return processExtractedText(sanitizedFallback, file.name, 1, [{ pageNumber: 1, text: sanitizedFallback }]);
}

/**
 * Process text, extract topics/chapters, and detect language
 */
function processExtractedText(fullText, filename, numPages, pagesData = []) {
  const isBangla = /[\u0980-\u09FF]/.test(fullText);

  // Extract chapters / sections
  const chapters = extractChapters(fullText, isBangla);
  
  // Extract topic list
  let topics = [];
  if (chapters.length > 0) {
    topics = chapters.map(c => c.title);
  } else {
    topics = generateFallbackTopics(fullText, filename, isBangla);
  }

  // Ensure unique, clean topics
  const uniqueTopics = Array.from(new Set(topics.filter(t => t && t.trim().length > 2))).slice(0, 10);

  // If still empty, supply default
  if (uniqueTopics.length === 0) {
    uniqueTopics.push(isBangla ? 'মূল বিষয়বস্তু ও বিশ্লেষণ' : 'Core Overview & Analysis');
  }

  return {
    fullText,
    topics: uniqueTopics,
    chapters,
    isBangla,
    numPages,
    pages: pagesData
  };
}

/**
 * Extracts chapter titles and sections from text
 */
function extractChapters(text, isBangla) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const chapters = [];

  // Patterns for chapter headings
  // 1. Bengali numbered items: ১. ..., ২. ..., ১৫. ..., অধ্যায় ১, ইত্যাদি
  // 2. English numbered items: 1. Introduction, Chapter 1, Section 2.1
  const banglaNumRegex = /^(?:[১-৯][০-৯]*|[1-9][0-9]*)\s*[\.\:\-]\s*([^\.]{3,70})/i;
  const banglaChapterRegex = /^(?:সূচিপত্র|অধ্যায়\s+[১-৯0-9]+|দৃশ্য\s+[১-৯0-9]+)\s*[\:\-]?\s*(.*)/i;
  const englishChapterRegex = /^(?:Chapter\s+\d+|Section\s+\d+|Part\s+[IVX\d]+|[0-9]+\.[0-9]*)\s*[\:\-]?\s*([^\.]{3,70})/i;
  const markdownHeaderRegex = /^#{1,3}\s+(.+)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check markdown header
    let match = line.match(markdownHeaderRegex);
    if (match && match[1]) {
      const cleanTitle = cleanHeading(match[1]);
      if (cleanTitle && cleanTitle.length < 80) {
        chapters.push({ title: cleanTitle, lineIndex: i });
        continue;
      }
    }

    // Check Bengali numbering
    match = line.match(banglaNumRegex);
    if (match && match[0]) {
      const cleanTitle = cleanHeading(match[0]);
      if (cleanTitle && cleanTitle.length >= 4 && cleanTitle.length <= 80) {
        chapters.push({ title: cleanTitle, lineIndex: i });
        continue;
      }
    }

    // Check Chapter keyword
    match = line.match(isBangla ? banglaChapterRegex : englishChapterRegex);
    if (match && match[0]) {
      const cleanTitle = cleanHeading(match[0]);
      if (cleanTitle && cleanTitle.length >= 4 && cleanTitle.length <= 80) {
        chapters.push({ title: cleanTitle, lineIndex: i });
        continue;
      }
    }
  }

  // Deduplicate and associate text slices
  const uniqueChapters = [];
  const seen = new Set();

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const key = ch.title.toLowerCase().replace(/\s+/g, '');
    if (!seen.has(key)) {
      seen.add(key);
      const nextLineIdx = chapters[i + 1] ? chapters[i + 1].lineIndex : Math.min(lines.length, ch.lineIndex + 50);
      const sliceText = lines.slice(ch.lineIndex, nextLineIdx).join(' ');
      uniqueChapters.push({
        title: ch.title,
        text: sliceText.slice(0, 3000)
      });
    }
  }

  return uniqueChapters.slice(0, 12);
}

export function cleanDocumentTitle(filename) {
  if (!filename) return 'Study Material';
  let clean = filename
    .replace(/\.[^/.]+$/, '') // remove extension (.pdf, .md, etc.)
    .replace(/\[[^\]]*\]/g, '') // remove brackets like [EnglishOnlineClub.com]
    .replace(/\([^)]*\)/g, '') // remove parens like (6th Edition)
    .replace(/[-_]+/g, ' ')
    .replace(/\b(?:189|programming questions|solutions|edition|pdf|ebook|download|www\.[^\s]+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip dangling trailing prepositions & conjunctions
  let prev = '';
  while (prev !== clean) {
    prev = clean;
    clean = clean.replace(/[\s\-_–—,:;]+(?:and|or|for|with|by|to|of|in|at|&)\s*$/i, '').trim();
    clean = clean.replace(/[\s\-_–—,:;]+$/i, '').trim();
  }

  if (!clean || clean.length < 2) {
    clean = filename.replace(/\.[^/.]+$/, '').trim();
  }
  return clean;
}

export function cleanTopicString(str) {
  if (!str) return 'Core Concepts';
  let clean = str
    .replace(/^Comprehensive Overview \((.*)\)$/i, '$1')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(?:189|programming questions|solutions|edition|pdf|ebook|download|www\.[^\s]+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip dangling trailing prepositions & conjunctions
  let prev = '';
  while (prev !== clean) {
    prev = clean;
    clean = clean.replace(/[\s\-_–—,:;]+(?:and|or|for|with|by|to|of|in|at|&)\s*$/i, '').trim();
    clean = clean.replace(/[\s\-_–—,:;]+$/i, '').trim();
  }
  return clean || 'Core Concepts';
}

function cleanHeading(str) {
  return str
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[._\-–—]+$/g, '')
    .replace(/^\d+[\s\t]+www\.[^\s]+/i, '')
    .replace(/\.{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent topic generation without noisy filenames
 */
function generateFallbackTopics(text, filename, isBangla) {
  const sample = (text || '').toLowerCase();

  if (isBangla) {
    return [
      'মূল বিষয়বস্তু ও চরিত্র রূপায়ণ',
      'প্রধান ঘটনাপ্রবাহ ও সংলাপ বিশ্লেষণ',
      'উদ্ধৃতি ও প্রেক্ষাপট অনুধাবন',
      'সারমর্ম ও সামগ্রিক মূল্যায়ন'
    ];
  }

  // Detect coding / algorithms content
  const isCoding = /\b(?:algorithm|binary|tree|graph|array|string|complexity|big-?o|dynamic programming|data structure|stack|queue|sort|interview|pointer|recursion)\b/i.test(sample) ||
    /coding|program|interview/i.test(filename);

  if (isCoding) {
    return [
      'Data Structures & Big-O Complexity',
      'Algorithm Design & Edge Cases',
      'Problem Solving & Invariants',
      'System Architecture & Scalability'
    ];
  }

  // Detect machine learning / neural networks content
  const isML = /\b(?:neural|gradient|weight|loss|activation|backpropagation|tensor|epoch|convolution)\b/i.test(sample) ||
    /deep|learning|neural/i.test(filename);

  if (isML) {
    return [
      'Neural Architectures & Forward Pass',
      'Loss Functions & Optimization',
      'Backpropagation & Gradients',
      'Regularization & Convergence'
    ];
  }

  // General academic
  return [
    'Core Concepts & Foundations',
    'Methodologies & Structural Analysis',
    'Analytical Evaluation & Findings',
    'Critical Synthesis & Applications'
  ];
}
