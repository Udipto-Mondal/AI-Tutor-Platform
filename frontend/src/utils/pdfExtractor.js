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
export async function extractDocumentContent(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  if (ext === 'txt' || ext === 'md' || ext === 'markdown') {
    const rawText = await file.text();
    return processExtractedText(rawText, file.name, 1);
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
      const pagesText = [];

      // Extract up to 60 pages to maintain speedy browser performance
      const maxPages = Math.min(numPages, 60);
      for (let i = 1; i <= maxPages; i++) {
        try {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageStr = content.items
            .map((item) => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (pageStr) {
            pagesText.push(`\n--- Page ${i} ---\n${pageStr}`);
          }
        } catch (pageErr) {
          console.warn(`Error reading page ${i}:`, pageErr);
        }
      }

      const fullText = pagesText.join('\n\n');
      return processExtractedText(fullText, file.name, numPages);
    } catch (pdfErr) {
      console.error('PDF extraction failed, falling back to text stream:', pdfErr);
      // Fallback: try raw text decode in case it contains readable streams
      try {
        const raw = await file.text();
        const readable = raw.replace(/[^\x20-\x7E\u0980-\u09FF\n\r\t]/g, ' ').replace(/\s+/g, ' ');
        if (readable.length > 200) {
          return processExtractedText(readable, file.name, 1);
        }
      } catch {
        // ignore
      }
      throw pdfErr;
    }
  }

  // Fallback for other files
  const fallbackText = await file.text().catch(() => '');
  return processExtractedText(fallbackText, file.name, 1);
}

/**
 * Process text, extract topics/chapters, and detect language
 */
function processExtractedText(fullText, filename, numPages) {
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
    numPages
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

function cleanHeading(str) {
  return str
    .replace(/[._\-–—]+$/g, '')
    .replace(/^\d+[\s\t]+www\.[^\s]+/i, '')
    .replace(/\.{2,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fallback topic generation when no formal chapter headings are detected
 */
function generateFallbackTopics(text, filename, isBangla) {
  const cleanName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  if (isBangla) {
    return [
      `সামগ্রিক বিষয়বস্তু (${cleanName})`,
      'প্রধান ঘটনাপ্রবাহ ও চরিত্র বিশ্লেষণ',
      'উদ্ধৃতাংশ ও মূল আলোচনা'
    ];
  } else {
    return [
      `Comprehensive Overview (${cleanName})`,
      'Key Concepts & Methodologies',
      'Analytical Evaluation & Findings'
    ];
  }
}
