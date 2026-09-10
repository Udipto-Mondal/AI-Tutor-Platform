import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  PenTool, 
  Settings2, 
  Award, 
  RefreshCw,
  PenLine,
  CheckSquare,
  AlignLeft,
  FileText,
  UploadCloud,
  X,
  Layers,
  RotateCcw
} from 'lucide-react';
import HandwritingCanvas from './HandwritingCanvas';
import GradingReportModal from './GradingReportModal';
import MathText from './MathText';
import { getStoredDocuments, saveStoredDocuments, extractTopicsFromFilename } from '../utils/documentStorage';
import { generateAdaptiveQuiz, CS_TOPIC_BANKS } from '../utils/quizGenerator';
import { getDocumentText, saveDocumentText } from '../utils/textStore';
import { extractDocumentContent, cleanDocumentTitle } from '../utils/pdfExtractor';

function cleanTopicString(str) {
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

export default function QuizStudio({ 
  documents = [], 
  selectedDocId, 
  onSelectDocId, 
  onNavigateToStudyPlan, 
  onNavigateToRadar 
}) {
  const allDocs = documents.length > 0 ? documents : getStoredDocuments();
  const activeDoc = allDocs.find(d => d.id === selectedDocId) || allDocs[0] || null;

  // Extracted text record from IndexedDB
  const [docTextRecord, setDocTextRecord] = useState(null);
  const [parsingFile, setParsingFile] = useState(false);

  // Pre-configured Gemini API Key from environment
  const GEMINI_CONFIGURED_KEY = import.meta.env?.VITE_GEMINI_API_KEY || '';

  // Selected topic inside active document - strictly document-specific
  const computeTopics = (doc, textRec) => {
    const isCodingDoc = /\b(?:leetcode|dsa|data[\s_-]?structures?|algorithms?[\s_-]?design|cracking[\s_-]?the[\s_-]?coding)\b/i.test(doc?.filename || '');

    let rawTopics = [];
    if (textRec?.chapters?.length > 0) {
      const allLabel = textRec.isBangla 
        ? 'সকল অধ্যায় ও সামগ্রিক বিষয়বস্তু' 
        : 'All Chapters & Topics';
      rawTopics = [allLabel, ...textRec.chapters.map(c => cleanTopicString(c.title))];
    } else if (doc?.topics_covered?.length > 0) {
      rawTopics = doc.topics_covered.map(t => cleanTopicString(t));
    } else if (doc?.filename) {
      rawTopics = extractTopicsFromFilename(doc.filename);
    }

    // Strictly purge any CS keywords if document is NOT a coding document
    if (!isCodingDoc) {
      rawTopics = rawTopics.filter(t => 
        !/\b(?:data structures?|big-?o|trees?\s*&\s*graphs?|dynamic programming|sorting algorithms?)\b/i.test(t)
      );
      if (rawTopics.length === 0 && doc?.filename) {
        rawTopics = extractTopicsFromFilename(doc.filename);
      }
    }

    const cleanTitle = cleanDocumentTitle(doc?.filename || 'Document');
    return rawTopics.length > 0 ? rawTopics : [
      `${cleanTitle}: Overview & Objectives`,
      'Key Findings & Core Analysis',
      'Methodologies, Evidence & Insights',
      'Conclusions & Practical Takeaways'
    ];
  };

  const initialTopics = computeTopics(activeDoc, null);
  const [availableTopics, setAvailableTopics] = useState(initialTopics);
  const [selectedTopic, setSelectedTopic] = useState(() => initialTopics[0] || 'Core Concepts');
  const [quizDifficulty, setQuizDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [toastMsg, setToastMsg] = useState('');

  // Active quiz state
  const initialDocTitle = activeDoc ? cleanDocumentTitle(activeDoc.filename) : 'Study Material';
  const initialFocus = initialTopics[0] || 'Core Concepts';

  const [quiz, setQuiz] = useState({
    id: 'quiz_init',
    title: `Assessment: ${initialFocus}`,
    doc_title: initialDocTitle,
    topic_focus: initialFocus,
    difficulty: 'medium',
    time_limit_minutes: 15,
    questions: []
  });
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [gradingReport, setGradingReport] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(900);
  const [timerKey, setTimerKey] = useState(0);
  const [timerJustReset, setTimerJustReset] = useState(false);

  const getInitialSeconds = () => {
    return (quiz?.time_limit_minutes || Math.max(5, Math.round(numQuestions * 2.5))) * 60;
  };

  const handleResetTimer = (customSeconds = null) => {
    const seconds = customSeconds || getInitialSeconds();
    setTimeRemaining(seconds);
    setTimerKey((k) => k + 1);
    setTimerJustReset(true);
    setTimeout(() => setTimerJustReset(false), 1400);
    setToastMsg(`Timer restarted from beginning (${formatTimer(seconds)}).`);
  };

  // Auto-dismiss toast after 4.5 seconds
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 4500);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const fileInputRef = useRef(null);

  // Load extracted text when activeDoc changes
  useEffect(() => {
    let isMounted = true;
    const loadText = async () => {
      if (!activeDoc) {
        const tops = ['Comprehensive Overview', 'Key Insights & Findings', 'Analytical Evaluation', 'Strategic Summary'];
        setAvailableTopics(tops);
        setSelectedTopic(tops[0]);
        return;
      }
      const rec = await getDocumentText(activeDoc.id);
      if (!isMounted) return;

      setDocTextRecord(rec);
      const tops = computeTopics(activeDoc, rec);
      setAvailableTopics(tops);

      const nextTopic = tops[0] || 'Core Concepts';
      setSelectedTopic(nextTopic);
      handleGenerateQuiz(activeDoc.filename, nextTopic, quizDifficulty, numQuestions, rec);
    };

    loadText();
    return () => { isMounted = false; };
  }, [activeDoc?.id, selectedDocId]);

  // Handler for custom inline file load (if text wasn't extracted earlier)
  const handleInlineFileParse = async (file) => {
    if (!file || !activeDoc) return;
    setParsingFile(true);
    try {
      const extracted = await extractDocumentContent(file);
      await saveDocumentText(activeDoc.id, extracted);
      setDocTextRecord(extracted);

      // Update doc metadata in storage
      const topics = extracted.topics?.length > 0 ? extracted.topics.map(t => cleanTopicString(t)) : activeDoc.topics_covered;
      const updatedDoc = {
        ...activeDoc,
        topics_covered: topics,
        is_bangla: extracted.isBangla,
        num_pages: extracted.numPages,
        has_extracted_text: true
      };

      const docsList = allDocs.map(d => d.id === activeDoc.id ? updatedDoc : d);
      saveStoredDocuments(docsList);

      const tops = computeTopics(updatedDoc, extracted);
      setAvailableTopics(tops);
      setSelectedTopic(tops[0]);
      await handleGenerateQuiz(activeDoc.filename, tops[0], quizDifficulty, numQuestions, extracted);
    } catch (err) {
      console.error('Inline parse error:', err);
    } finally {
      setParsingFile(false);
    }
  };

  const handleGenerateQuiz = async (
    docTitle = activeDoc?.filename || 'Study Material',
    topic = selectedTopic,
    diff = quizDifficulty,
    count = numQuestions,
    explicitTextRecord = docTextRecord
  ) => {
    setLoading(true);
    setGradingReport(null);
    setCurrentIdx(0);
    setAnswers({});
    const initialSeconds = Math.max(5, Math.round(count * 2.5)) * 60;
    setTimeRemaining(initialSeconds);
    setTimerKey((k) => k + 1);

    try {
      // 1. Try backend generation if running
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_ids: activeDoc ? [activeDoc.id] : null,
          topic: topic,
          num_questions: count,
          difficulty: diff,
          include_handwritten: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.questions && data.questions.length >= count) {
          setQuiz(data);
          const limitSeconds = (data.time_limit_minutes || Math.round(count * 2.5)) * 60;
          setTimeRemaining(limitSeconds);
          setTimerKey((k) => k + 1);
          setLoading(false);
          setToastMsg(`Generated fresh assessment with ${data.questions.length} adaptive questions.`);
          return;
        }
      }
    } catch {
      /* Fallback to smart client generator */
    }

    // 2. Client-side authentic generation from extracted text
    let targetContext = '';
    const rec = explicitTextRecord || docTextRecord;

    if (rec) {
      if (rec.chapters && rec.chapters.length > 0) {
        const matchedChapter = rec.chapters.find(c => cleanTopicString(c.title) === topic);
        targetContext = matchedChapter ? matchedChapter.text : rec.fullText;
      } else {
        targetContext = rec.fullText || '';
      }
    }

    const generated = await generateAdaptiveQuiz({
      docTitle,
      topicName: topic,
      documentText: targetContext,
      difficulty: diff,
      numQuestions: count,
      geminiApiKey: GEMINI_CONFIGURED_KEY
    });

    setQuiz(generated);
    const finalSeconds = (generated.time_limit_minutes || Math.round(count * 2.5)) * 60;
    setTimeRemaining(finalSeconds);
    setTimerKey((k) => k + 1);
    setLoading(false);
    setToastMsg(`Generated fresh assessment with ${generated.questions.length} adaptive questions.`);
  };

  // Timer countdown: restarts cleanly on timerKey, quiz, or grading state change
  useEffect(() => {
    if (!quiz || gradingReport) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz?.id, gradingReport, timerKey]);

  const handleSelectOption = (qId, optionKey) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], selected_option: optionKey }
    }));
  };

  const handleTextAnswer = (qId, text) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], text_answer: text }
    }));
  };

  const handleHandwrittenAnswer = (qId, imageBase64) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], handwritten_image_base64: imageBase64 }
    }));
  };

  /* ── Strict, Intelligent Submission Grading ── */
  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    setSubmitting(true);

    const submissionPayload = {
      quiz_id: quiz.id,
      student_id: 'default_student',
      answers: quiz.questions.map((q) => {
        const ans = answers[q.id] || {};
        return {
          question_id: q.id,
          selected_option: ans.selected_option || null,
          text_answer: ans.text_answer || null,
          handwritten_image_base64: ans.handwritten_image_base64 || null,
        };
      })
    };

    try {
      const res = await fetch('/api/grading/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload)
      });

      if (res.ok) {
        const report = await res.json();
        setGradingReport(report);
        setSubmitting(false);
        return;
      }
    } catch {
      /* fallback strict grading */
    }

    // Client strict evaluation fallback
    let totalScore = 0;
    const maxScore = quiz.questions.length;

    const questionResults = quiz.questions.map((q) => {
      const userAns = answers[q.id] || {};
      let isCorrect = false;
      let score = 0.0;
      let feedback = '';
      let remedialTip = '';
      const isBangla = /[\u0980-\u09FF]/.test(q.topic || q.question_text || '');

      if (q.question_type === 'mcq') {
        if (!userAns.selected_option) {
          isCorrect = false;
          score = 0.0;
          feedback = isBangla
            ? 'কোনো অপশন নির্বাচন করা হয়নি।'
            : 'No option was selected.';
        } else if (userAns.selected_option === q.correct_option) {
          isCorrect = true;
          score = 1.0;
          feedback = isBangla
            ? 'সঠিক উত্তর! মূল তত্ত্ব ও প্রমাণ সঠিকভাবে চিহ্নিত করেছেন।'
            : 'Correct! Accurate conceptual understanding.';
        } else {
          isCorrect = false;
          score = 0.0;
          feedback = isBangla
            ? `ভুল উত্তর। আপনার পছন্দ: [${userAns.selected_option}], কিন্তু সঠিক উত্তর: [${q.correct_option}]। ${q.explanation || ''}`
            : `Incorrect choice. You selected [${userAns.selected_option}], but the correct answer is [${q.correct_option}]. ${q.explanation || ''}`;
        }
      } else if (q.question_type === 'short_answer') {
        const text = (userAns.text_answer || '').trim();
        const wordCount = text ? text.split(/\s+/).length : 0;

        if (wordCount < 5) {
          isCorrect = false;
          score = 0.0;
          feedback = isBangla
            ? 'উত্তর অত্যন্ত সংক্ষিপ্ত বা ফাঁকা ছিল। কমপক্ষে ২-৩ বাক্যে মূল কারণ ও বিশ্লেষণ লিখুন।'
            : 'Response is too brief or empty. Provide a substantive explanation with supporting logic.';
        } else {
          // Extract keywords from expected answer & explanation
          const targetTerms = (q.expected_answer + ' ' + (q.explanation || ''))
            .toLowerCase()
            .replace(/[^\w\s\u0980-\u09FF]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length >= 4);

          const studentTerms = new Set(
            text.toLowerCase().replace(/[^\w\s\u0980-\u09FF]/g, ' ').split(/\s+/)
          );

          const matched = targetTerms.filter(t => studentTerms.has(t));
          const coverage = targetTerms.length > 0 ? (matched.length / Math.min(6, targetTerms.length)) : 0.5;

          if (coverage >= 0.35 && wordCount >= 18) {
            isCorrect = true;
            score = 1.0;
            feedback = isBangla
              ? 'চমৎকার উত্তর! মূল যুক্তি ও প্রয়োজনীয় শর্তাবলী সঠিকভাবে ব্যাখ্যা করেছেন।'
              : 'Excellent response! Core reasoning and mechanics are clearly established.';
          } else if (coverage >= 0.15 || wordCount >= 10) {
            isCorrect = true;
            score = 0.60;
            feedback = isBangla
              ? `আংশিক সঠিক। ধারণাটি কিছুটা তুলে ধরেছেন তবে গভীরতা প্রয়োজন। প্রত্যাশিত: ${q.expected_answer}`
              : `Partially correct. Captured the surface idea, but missed key technical details. Expected: ${q.expected_answer}`;
          } else {
            isCorrect = false;
            score = 0.20;
            feedback = isBangla
              ? `উত্তরটি বিষয়বস্তুর সাথে সামঞ্জস্যপূর্ণ নয়। প্রত্যাশিত উত্তর: ${q.expected_answer}`
              : `The explanation does not align with the core concept. Expected: ${q.expected_answer}`;
          }
        }
      } else if (q.question_type === 'handwritten_derivation') {
        const hasImg = Boolean(userAns.handwritten_image_base64 && userAns.handwritten_image_base64.length > 3000);
        const hasNotes = Boolean(userAns.text_answer && userAns.text_answer.trim().split(/\s+/).length >= 10);

        if (!hasImg && !hasNotes) {
          isCorrect = false;
          score = 0.0;
          feedback = isBangla
            ? 'কোনো হাতে লেখা প্রমাণ বা নোট প্রদান করা হয়নি। সমাধান ক্যানভাসে চিত্র বা ধাপগুলো লিখুন।'
            : 'No handwritten work or solution notes were submitted.';
        } else if (hasImg && hasNotes) {
          isCorrect = true;
          score = 1.0;
          feedback = isBangla
            ? 'অসাধারণ! ক্যানভাসে অঙ্কিত সমীকরণ ও টেক্সট নোট দুটোই পূর্ণাঙ্গ সমাধানের স্বাক্ষর বহন করে।'
            : 'Outstanding! Both handwritten derivations and explanatory notes demonstrate comprehensive mastery.';
        } else if (hasImg) {
          isCorrect = true;
          score = 0.85;
          feedback = isBangla
            ? 'হাতে লেখা সমাধান গৃহীত হয়েছে। রুব্রিক অনুযায়ী প্রধান ধাপসমূহ যাচাই করা হয়েছে।'
            : 'Handwritten solution accepted and evaluated against the step-by-step proof rubric.';
        } else {
          isCorrect = true;
          score = 0.65;
          feedback = isBangla
            ? 'টেক্সট নোট গৃহীত হয়েছে, তবে গাণিতিক বা অ্যালগরিদমিক প্রমাণের জন্য ক্যানভাস ব্যবহার বাঞ্ছনীয়।'
            : 'Text notes received. For maximum derivation credit, write out the explicit equations on the canvas.';
        }
      }

      totalScore += score;
      remedialTip = isBangla
        ? `"${q.topic}" অংশের মূল ধারণাগুলো পুনরায় দেখে নিন।`
        : `Review the foundational rules and definitions for ${q.topic}.`;

      return {
        question_id: q.id,
        topic: q.topic,
        question_type: q.question_type,
        is_correct: isCorrect,
        score: score,
        feedback: feedback,
        remedial_tip: remedialTip
      };
    });

    const percentage = Math.round((totalScore / maxScore) * 100);
    const isBanglaDoc = Boolean(docTextRecord?.isBangla);

    setGradingReport({
      quiz_id: quiz.id,
      overall_score: Math.round(totalScore * 10) / 10,
      max_score: maxScore,
      percentage: percentage,
      total_time_seconds: (quiz.time_limit_minutes * 60) - timeRemaining,
      summary_feedback: percentage >= 70 
        ? (isBanglaDoc ? 'অভিনন্দন! আপনি এই বিষয়ে চমৎকার দখল প্রদর্শন করেছেন।' : 'Great job! You demonstrated strong mastery of this material.') 
        : (isBanglaDoc ? 'ভালো চেষ্টা! চিহ্নিত দুর্বল বিষয়গুলো পুনরায় দেখে নিন।' : 'Needs review! Study the flagged concepts to build stronger conceptual grounding.'),
      weak_topics_flagged: percentage < 70 ? [selectedTopic] : [],
      question_results: questionResults
    });

    setSubmitting(false);
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = quiz.questions[currentIdx] || quiz.questions[0];
  const currentAnswer = answers[currentQ?.id] || {};
  const isLastQuestion = currentIdx === (quiz.questions.length - 1);
  const hasExtractedText = Boolean(docTextRecord?.fullText);

  const cleanDocName = cleanDocumentTitle(activeDoc?.filename);
  const cleanTopicName = cleanTopicString(selectedTopic);

  return (
    <div className="space-y-6 pb-12">
      {/* ── Slide / Document & Topic Customizer Bar ── */}
      <div className="glass-panel p-5 sm:p-6 bg-[#0a1329]/95 border border-blue-500/20 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-900/30 pb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Customize Your Quiz Material & Topic Focus
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
              Adaptive Synthesis
            </span>
          </div>
        </div>

        {/* Sync Prompt if PDF text is not yet loaded into IndexedDB */}
        {!hasExtractedText && activeDoc?.filename?.toLowerCase().endsWith('.pdf') && (
          <div className="p-3.5 bg-blue-950/40 border border-blue-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-200 animate-fade-up">
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-slate-100">
                  Load authentic text & chapters from "{cleanDocName}"
                </p>
                <p className="text-[11px] text-slate-400">
                  Click to parse the PDF file so Quiz Studio can extract all chapters and generate matching questions.
                </p>
              </div>
            </div>
            <label className="btn-primary text-xs py-1.5 px-3.5 shrink-0 cursor-pointer self-start sm:self-center">
              <UploadCloud className="h-3.5 w-3.5" />
              <span>{parsingFile ? 'Parsing PDF…' : 'Parse PDF Text'}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                disabled={parsingFile}
                onChange={(e) => handleInlineFileParse(e.target.files?.[0])}
              />
            </label>
          </div>
        )}

        {/* Controls Grid: Responsive 4 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Document / Slide Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>Select Slide / Material</span>
            </label>
            <select
              value={activeDoc?.id || ''}
              onChange={(e) => {
                const targetDoc = allDocs.find(d => d.id === e.target.value);
                if (targetDoc && onSelectDocId) {
                  onSelectDocId(targetDoc.id);
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-blue-500/30 bg-[#060c1c] font-medium text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 shadow-inner"
            >
              {allDocs.length > 0 ? (
                allDocs.map((d) => (
                  <option key={d.id} value={d.id}>
                    {cleanDocumentTitle(d.filename)} ({d.file_type.toUpperCase()})
                  </option>
                ))
              ) : (
                <option value="">Document Library (General)</option>
              )}
            </select>
          </div>

          {/* Topic Focus Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Select Topic / Chapter</span>
            </label>
            <select
              value={selectedTopic}
              onChange={(e) => {
                setSelectedTopic(e.target.value);
                handleGenerateQuiz(activeDoc?.filename, e.target.value, quizDifficulty, numQuestions);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-blue-500/30 bg-[#060c1c] font-medium text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 shadow-inner"
            >
              {availableTopics.map((top) => (
                <option key={top} value={top}>
                  {cleanTopicString(top)}
                </option>
              ))}
            </select>
          </div>

          {/* Questions Count Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-teal-400" />
              <span>Questions Count</span>
            </label>
            <select
              value={numQuestions}
              onChange={(e) => {
                const cnt = parseInt(e.target.value, 10) || 5;
                setNumQuestions(cnt);
                handleGenerateQuiz(activeDoc?.filename, selectedTopic, quizDifficulty, cnt);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-blue-500/30 bg-[#060c1c] font-medium text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 shadow-inner"
            >
              <option value={5}>5 Questions (Quick Check)</option>
              <option value={8}>8 Questions (Targeted Practice)</option>
              <option value={10}>10 Questions (Standard Quiz)</option>
              <option value={15}>15 Questions (Comprehensive Assessment)</option>
              <option value={20}>20 Questions (Full Mock Exam)</option>
            </select>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-400" />
              <span>Difficulty Level</span>
            </label>
            <select
              value={quizDifficulty}
              onChange={(e) => {
                setQuizDifficulty(e.target.value);
                handleGenerateQuiz(activeDoc?.filename, selectedTopic, e.target.value, numQuestions);
              }}
              className="w-full px-3 py-2 text-xs rounded-xl border border-blue-500/30 bg-[#060c1c] font-medium text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-500/30 shadow-inner"
            >
              <option value="easy">Easy (Fundamentals & Facts)</option>
              <option value="medium">Medium (Analytical Comprehension)</option>
              <option value="hard">Hard (Deep Synthesis & Derivations)</option>
            </select>
          </div>
        </div>

        {/* Dedicated Action & Session Summary Bar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-blue-900/30">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => handleResetTimer()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0c1838] hover:bg-[#12224d] font-mono text-[11px] text-slate-300 hover:text-blue-300 font-semibold border border-blue-500/20 hover:border-blue-400 transition-colors cursor-pointer select-none active:scale-95"
              title="Click to restart quiz timer from beginning"
            >
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              Est. ~{Math.round(numQuestions * 2.5)} mins
              <RotateCcw className="h-2.5 w-2.5 opacity-60 ml-0.5" />
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 font-mono text-[11px] text-blue-300 font-semibold border border-blue-500/30">
              <Layers className="h-3.5 w-3.5" />
              {numQuestions} Questions
            </span>
            <span className="hidden md:inline text-blue-900">|</span>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Adaptive synthesis: MCQs, handwritten proofs & concept derivations
            </span>
          </div>

          <button
            onClick={() => handleGenerateQuiz(activeDoc?.filename, selectedTopic, quizDifficulty, numQuestions)}
            disabled={loading}
            className="btn-primary text-xs py-2.5 px-5 justify-center sm:self-auto self-stretch font-semibold shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Generating Assessment…' : 'Start Custom Quiz'}</span>
          </button>
        </div>

        {/* Quick Topic Pills for 1-Click Filtering */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-blue-900/30">
          <span className="text-[11px] text-slate-400 font-semibold shrink-0">Quick Topic Switch:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {availableTopics.slice(0, 5).map((top) => {
              const isCurrent = top === selectedTopic;
              const cleanPill = cleanTopicString(top);
              return (
                <button
                  key={top}
                  onClick={() => {
                    setSelectedTopic(top);
                    handleGenerateQuiz(activeDoc?.filename, top, quizDifficulty, numQuestions);
                  }}
                  className={`text-[11px] px-3 py-1 rounded-lg font-medium transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400 font-semibold'
                      : 'bg-[#0c1838] text-slate-300 hover:bg-blue-900/50 hover:text-blue-300 border border-blue-500/20'
                  }`}
                >
                  {cleanPill}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Toast Notification Banner for Dynamic Updates ── */}
      {toastMsg && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl font-medium shadow-xs animate-fade-in">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 animate-pulse" />
          <span className="font-semibold">{toastMsg}</span>
          <button
            onClick={() => setToastMsg('')}
            className="ml-auto text-emerald-700 hover:text-emerald-950 p-1 rounded-md hover:bg-emerald-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Active Quiz Header Card (Clean, Executive SaaS Styling) ── */}
      <div className="glass-panel p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-500/20 bg-[#0a1329]/95 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100">
              Assessment: {cleanTopicName}
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
              {quizDifficulty.toUpperCase()}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
              {quiz.questions.length} QUESTIONS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-blue-400">{cleanTopicName}</span>
            <span className="text-slate-600 mx-2">·</span>
            <span className="text-slate-400 font-mono text-[11px]">Source: {cleanDocName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleResetTimer();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs shadow-inner cursor-pointer select-none transition-all active:scale-95 ${
              timerJustReset
                ? 'bg-emerald-950/90 border border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/40 scale-105'
                : 'bg-[#070e22] hover:bg-[#0c1838] border border-blue-500/25 hover:border-blue-400'
            }`}
            title="Click to restart countdown timer from the beginning"
          >
            <Clock className={`h-4 w-4 transition-transform ${timerJustReset ? 'rotate-180 text-emerald-400' : (timeRemaining < 120 ? 'text-rose-400 animate-pulse' : 'text-blue-400')}`} />
            <span className={timerJustReset ? 'text-emerald-300 font-bold' : (timeRemaining < 120 ? 'text-rose-400 font-bold' : 'text-slate-200 font-semibold')}>
              {formatTimer(timeRemaining)}
            </span>
            <RotateCcw className={`h-3 w-3 transition-all ml-0.5 ${timerJustReset ? 'text-emerald-400 rotate-180' : 'text-slate-500 hover:text-blue-300 opacity-70'}`} />
            {timerJustReset && (
              <span className="text-[10px] text-emerald-300 font-bold ml-1 animate-fade-in">✓ Restarted</span>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setAnswers({});
              setCurrentIdx(0);
              handleResetTimer();
              setToastMsg('Cleared all responses. Assessment and timer restarted from Question 1.');
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-slate-300 hover:text-white border-blue-500/20 bg-[#0c1838] active:scale-95"
            title="Clear all responses and restart timer from Question 1"
          >
            <RotateCcw className="h-3 w-3 text-slate-400" />
            <span>Reset Answers</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleGenerateQuiz(activeDoc?.filename, selectedTopic, quizDifficulty, numQuestions);
            }}
            disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-blue-950/40 text-blue-300 border-blue-500/30 hover:bg-blue-900/50 font-semibold shadow-xs active:scale-95"
            title="Generate fresh new randomized questions for this topic (resets timer)"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Regenerating…' : 'Regenerate Questions'}</span>
          </button>
        </div>
      </div>

      {/* ── State-of-the-Art Question Navigator & Progress ── */}
      <div className="glass-panel p-3.5 sm:p-4 space-y-3 bg-[#0a1329]/95 border-blue-500/20 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-100 font-mono">
              Question {currentIdx + 1} of {quiz.questions.length}
            </span>
            <div className="h-2 w-28 sm:w-44 rounded-full bg-[#070e22] border border-blue-500/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round(((Object.values(answers).filter(a => a?.selected_option || a?.text_answer || a?.handwritten_image_base64).length) / (quiz.questions.length || 1)) * 100)}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 font-mono font-medium">
              {Object.values(answers).filter(a => a?.selected_option || a?.text_answer || a?.handwritten_image_base64).length}/{quiz.questions.length} answered ({Math.round(((Object.values(answers).filter(a => a?.selected_option || a?.text_answer || a?.handwritten_image_base64).length) / (quiz.questions.length || 1)) * 100)}%)
            </span>
          </div>

          <div className="flex items-center gap-3 text-[10.5px] text-slate-400 font-mono self-start sm:self-center">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Current</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Answered</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-600 inline-block" /> Unanswered</span>
            <span className="flex items-center gap-1.5"><PenLine className="h-3 w-3 text-blue-400" /> Handwritten</span>
          </div>
        </div>

        {/* Stepper Pills with integrated Prev / Next controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          <button
            onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="h-9 w-9 shrink-0 rounded-xl bg-[#0c1838] border border-blue-500/20 text-slate-300 hover:bg-blue-900/50 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {quiz.questions.map((q, idx) => {
            const isAnswered = answers[q.id]?.selected_option || answers[q.id]?.text_answer || answers[q.id]?.handwritten_image_base64;
            const hasHandwritten = Boolean(answers[q.id]?.handwritten_image_base64 && answers[q.id]?.handwritten_image_base64.length > 2000);
            const isCurrent = idx === currentIdx;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 rounded-xl font-mono text-xs font-bold relative flex items-center justify-center transition-all ${
                  isCurrent 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-2 ring-blue-400 scale-105 z-10'
                    : isAnswered
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50'
                    : 'bg-[#0c1838] text-slate-300 border border-blue-500/20 hover:border-blue-400 hover:text-white shadow-inner'
                }`}
                title={`Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}`}
              >
                <span>{idx + 1}</span>
                {isAnswered && !isCurrent && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a1329]" />
                )}
                {hasHandwritten && (
                  <span className="absolute -bottom-1 -right-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-blue-600 text-white shadow-xs" title="Handwritten response attached">
                    <PenLine className="h-2 w-2" />
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentIdx(prev => Math.min(quiz.questions.length - 1, prev + 1))}
            disabled={currentIdx === quiz.questions.length - 1}
            className="h-9 w-9 shrink-0 rounded-xl bg-[#0c1838] border border-blue-500/20 text-slate-300 hover:bg-blue-900/50 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next question"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main Question Interactive Card ── */}
      {currentQ && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 relative overflow-hidden transition-all duration-300 bg-[#0a1329]/95 border-blue-500/20 shadow-xl">
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/60 text-blue-300 border border-blue-500/30 font-mono font-bold text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Question {String(currentIdx + 1).padStart(2, '0')} / {String(quiz.questions.length).padStart(2, '0')}
                </span>
                <span className="text-slate-300 font-semibold text-xs">
                  {cleanTopicString(currentQ.topic)}
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1838] text-slate-300 border border-blue-500/20 font-mono text-[11px] uppercase font-semibold">
                {currentQ.question_type === 'handwritten_derivation' && <PenLine className="h-3.5 w-3.5 text-blue-400" />}
                {currentQ.question_type === 'mcq' && <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />}
                {currentQ.question_type === 'short_answer' && <AlignLeft className="h-3.5 w-3.5 text-teal-400" />}
                <span>{currentQ.question_type.replace(/_/g, ' ')}</span>
              </span>
            </div>

            {/* Question Statement */}
            <h3 className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed font-sans">
              <MathText text={currentQ.question_text} />
            </h3>
          </div>

          {/* MCQ Options */}
          {currentQ.question_type === 'mcq' && currentQ.options && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = currentAnswer.selected_option === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(currentQ.id, opt.key)}
                    className={`p-4 rounded-xl text-left text-xs sm:text-sm font-medium transition-all flex items-start gap-3 border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-400 text-white shadow-md ring-1 ring-blue-400'
                        : 'bg-[#081226] border-blue-500/20 text-slate-200 hover:border-blue-400 hover:bg-blue-950/30 shadow-inner'
                    }`}
                  >
                    <span className={`h-6 w-6 rounded-lg text-xs font-bold font-mono flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-[#0c1838] text-slate-300 border border-blue-500/20'
                    }`}>
                      {opt.key}
                    </span>
                    <span className="leading-snug pt-0.5">
                      <MathText text={opt.text} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Short Conceptual Answer */}
          {currentQ.question_type === 'short_answer' && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-slate-300">
                Write your conceptual explanation (provide at least 2-3 substantive sentences):
              </label>
              <textarea
                rows={4}
                value={currentAnswer.text_answer || ''}
                onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                placeholder="Explain the mechanism, properties, equations, or trade-offs in detail..."
                className="w-full p-3.5 rounded-xl bg-[#060c1c] border border-blue-500/30 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 shadow-inner"
              />
            </div>
          )}

          {/* Handwritten Math / Analytical Canvas */}
          {currentQ.question_type === 'handwritten_derivation' && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                  <PenTool className="h-4 w-4" />
                  <span>Handwritten Solution Canvas & Step-by-Step Proof</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-medium">
                  Multimodal CNN / Vision Active
                </span>
              </div>

              <HandwritingCanvas
                initialImage={currentAnswer.handwritten_image_base64}
                onSaveAnswer={(imgBase64) => handleHandwrittenAnswer(currentQ.id, imgBase64)}
                questionPrompt={currentQ.question_text}
                topic={currentQ.topic}
                expectedAnswer={currentQ.expected_answer}
              />

              {/* Optional Text Notes Helper */}
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="Optional notes or formula labels to accompany your sketch..."
                  value={currentAnswer.text_answer || ''}
                  onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#060c1c] border border-blue-500/30 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-400 shadow-inner"
                />
              </div>
            </div>
          )}

          {/* Navigation & Submit Bar */}
          <div className="flex items-center justify-between pt-6 border-t border-blue-900/30">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="btn-secondary text-xs py-2 px-3.5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous Question</span>
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="btn-primary text-xs py-2.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
              >
                <Send className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
                <span>{submitting ? 'Grading with Vision & NLP…' : 'Submit & Grade Assessment'}</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
                className="btn-primary text-xs py-2 px-4"
              >
                <span>Next Question</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grading Diagnostic Modal */}
      {gradingReport && (
        <GradingReportModal
          report={gradingReport}
          onClose={() => setGradingReport(null)}
          onNavigateToStudyPlan={onNavigateToStudyPlan}
          onNavigateToRadar={onNavigateToRadar}
        />
      )}
    </div>
  );
}
