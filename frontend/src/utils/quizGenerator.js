/**
 * Smart Quiz Generator for AI Tutor Platform
 * Generates authentic, context-aware quizzes from uploaded documents (PDF, MD, TXT)
 * in both Bengali and English. Supports local heuristic semantic extraction
 * as well as optional Gemini Flash API integration.
 */

export const CS_TOPIC_BANKS = {
  'Backpropagation & Gradients': [
    {
      id: 'q_backprop_01',
      question_type: 'handwritten_derivation',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'Derive the gradient of the loss L with respect to weight w_ij^l in layer l using the calculus chain rule. Write down the step-by-step equations for delta_j^l and the weight update.',
      expected_answer: 'Step 1: dL/dw_ij^l = (dL/dz_j^l) * (dz_j^l/dw_ij^l). Step 2: delta_j^l = dL/dz_j^l. Step 3: dz_j^l/dw_ij^l = a_i^(l-1). Final: dL/dw_ij^l = delta_j^l * a_i^(l-1).',
      explanation: 'Backpropagation applies the calculus chain rule recursively backward from output layer to input layer.',
      rubric: [
        { criterion: 'Chain Rule Expansion', points: 0.40, description: 'Correctly decomposes dL/dw into delta_j and activation a_i' },
        { criterion: 'Error Term Formulation', points: 0.35, description: 'Accurately defines delta_j with respect to pre-activation z_j' },
        { criterion: 'Weight Update Formula', points: 0.25, description: 'Applies learning rate: w := w - eta * grad' }
      ]
    },
    {
      id: 'q_backprop_02',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'What causes the vanishing gradient problem during backpropagation through deep neural networks using Sigmoid activations?',
      options: [
        { key: 'A', text: 'Sigmoid derivative max is 0.25; chaining multiple layers drives gradients exponentially toward 0' },
        { key: 'B', text: 'Learning rate dynamically increases exponentially on each backward pass' },
        { key: 'C', text: 'Weights grow uncontrollably to infinity at each epoch' },
        { key: 'D', text: 'Activation outputs are strictly negative causing sign oscillation' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Sigmoid derivative max is 0.25; chaining multiple layers drives gradients exponentially toward 0',
      explanation: 'Because sigma\'(z) <= 0.25, multiplying derivatives over many layers leads to near-zero gradient updates in early layers.'
    },
    {
      id: 'q_backprop_03',
      question_type: 'short_answer',
      topic: 'Backpropagation & Gradients',
      difficulty: 'easy',
      question_text: 'Why do optimizers like Adam and SGD with Momentum converge faster than standard Vanilla Gradient Descent in narrow ravines?',
      expected_answer: 'Momentum accumulates velocity vectors in directions of persistent gradient reduction while canceling out high-frequency orthogonal oscillations.',
      explanation: 'Exponentially decaying moving averages dampen noisy fluctuations and accelerate progress toward the true minimum.'
    }
  ],
  'Activation Functions': [
    {
      id: 'q_act_01',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'easy',
      question_text: 'Which activation function is specifically designed to eliminate the "Dying ReLU" problem by preserving small negative slopes?',
      options: [
        { key: 'A', text: 'Leaky ReLU / PReLU with f(x) = max(alpha * x, x)' },
        { key: 'B', text: 'Standard Sigmoid bounded between 0 and 1' },
        { key: 'C', text: 'Softmax applied over K output classes' },
        { key: 'D', text: 'Step threshold activation function' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Leaky ReLU / PReLU with f(x) = max(alpha * x, x)',
      explanation: 'Leaky ReLU assigns a small positive slope alpha (e.g. 0.01) when x < 0, allowing gradients to flow even when neurons are inactive.'
    }
  ],
  'Big-O Complexity': [
    {
      id: 'q_dsa_01',
      question_type: 'mcq',
      topic: 'Big-O Complexity',
      difficulty: 'easy',
      question_text: 'What is the average-case and worst-case time complexity of standard QuickSort on an array of size n?',
      options: [
        { key: 'A', text: 'Average: O(n log n), Worst: O(n^2)' },
        { key: 'B', text: 'Average: O(n), Worst: O(n log n)' },
        { key: 'C', text: 'Average: O(n^2), Worst: O(n^3)' },
        { key: 'D', text: 'Average: O(1), Worst: O(n)' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Average: O(n log n), Worst: O(n^2)',
      explanation: 'QuickSort divides the array in half on average (O(n log n)), but worst-case partitioning yields unbalanced splits of size n-1 (O(n^2)).'
    }
  ]
};

/**
 * Main quiz generation entry point
 */
export async function generateAdaptiveQuiz({
  docTitle,
  topicName,
  documentText = '',
  difficulty = 'medium',
  numQuestions = 3,
  geminiApiKey = ''
}) {
  // If user selected a standard CS topic and no custom text is provided, use CS banks
  if (!documentText && CS_TOPIC_BANKS[topicName]) {
    const questions = CS_TOPIC_BANKS[topicName].slice(0, numQuestions);
    return {
      id: `quiz_${Date.now()}`,
      title: `Assessment: ${topicName}`,
      created_at: new Date().toISOString(),
      doc_title: docTitle,
      topic_focus: topicName,
      difficulty,
      time_limit_minutes: numQuestions * 3,
      questions
    };
  }

  // If Gemini API Key provided, attempt high-fidelity LLM generation
  if (geminiApiKey && geminiApiKey.trim().length > 15 && documentText.length > 50) {
    try {
      const llmQuestions = await generateWithGeminiAPI({
        apiKey: geminiApiKey.trim(),
        docTitle,
        topicName,
        contextText: documentText,
        difficulty,
        count: numQuestions
      });
      if (llmQuestions && llmQuestions.length > 0) {
        return {
          id: `quiz_${Date.now()}`,
          title: `Targeted Assessment: ${topicName}`,
          created_at: new Date().toISOString(),
          doc_title: docTitle,
          topic_focus: topicName,
          difficulty,
          time_limit_minutes: numQuestions * 3,
          questions: llmQuestions
        };
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to local semantic generator:', err);
    }
  }

  // Use robust, authentic local semantic question generator
  const generated = generateLocalContextualQuiz({
    docTitle,
    topicName,
    documentText,
    difficulty,
    count: numQuestions
  });

  return {
    id: `quiz_${Date.now()}`,
    title: `Targeted Assessment: ${topicName}`,
    created_at: new Date().toISOString(),
    doc_title: docTitle,
    topic_focus: topicName,
    difficulty,
    time_limit_minutes: numQuestions * 3,
    questions: generated
  };
}

/**
 * Generate questions directly from document sentences and paragraphs
 */
function generateLocalContextualQuiz({ docTitle, topicName, documentText, difficulty, count }) {
  const isBangla = /[\u0980-\u09FF]/.test(documentText || topicName || docTitle);
  const cleanContext = cleanRawText(documentText);

  // Extract meaningful sentences
  const sentences = extractCleanSentences(cleanContext, isBangla);
  // Extract meaningful paragraphs
  const paragraphs = extractCleanParagraphs(cleanContext, isBangla);

  const questions = [];

  // 1. Multiple Choice Question based on authentic sentence
  if (sentences.length >= 2) {
    const pivotIdx = Math.min(2, sentences.length - 1);
    const correctSentence = sentences[pivotIdx];
    
    // Pick distractors from other parts of the document
    const rawDistractors = sentences.filter((_, idx) => idx !== pivotIdx);
    const distractors = [
      rawDistractors[0] ? alterSentenceForDistractor(rawDistractors[0], isBangla) : (isBangla ? 'উক্ত বক্তব্যে এমন কোনো তথ্যের উল্লেখ নেই' : 'No such claim is made in the text'),
      rawDistractors[1] ? alterSentenceForDistractor(rawDistractors[1], isBangla) : (isBangla ? 'উপরে বর্ণিত তথ্যের সম্পূর্ণ বিপরীত অর্থ প্রকাশ করে' : 'Contradicts the stated thesis entirely'),
      rawDistractors[2] ? rawDistractors[2] : (isBangla ? 'সবগুলো বিকল্পই অসত্য' : 'None of the above are accurate')
    ];

    const options = [
      { key: 'A', text: truncateWords(correctSentence, 22) },
      { key: 'B', text: truncateWords(distractors[0], 22) },
      { key: 'C', text: truncateWords(distractors[1], 22) },
      { key: 'D', text: truncateWords(distractors[2], 22) }
    ];

    // Shuffle options so A isn't always correct
    const shuffled = shuffleWithCorrectKey(options, 'A');

    questions.push({
      id: `q_${Date.now()}_1`,
      question_type: 'mcq',
      topic: topicName,
      difficulty,
      question_text: isBangla
        ? `"${docTitle}" এর "${topicName}" প্রসঙ্গের আলোচনা অনুযায়ী, নিচের কোন তথ্যটি সঠিক?`
        : `According to the discussion in "${docTitle}" regarding "${topicName}", which of the following statements is directly confirmed?`,
      options: shuffled.options,
      correct_option: shuffled.correctKey,
      expected_answer: `${shuffled.correctKey}: ${truncateWords(correctSentence, 22)}`,
      explanation: isBangla
        ? `এই উক্তিটি সরাসরি ডকুমেন্টে উল্লেখিত রয়েছে: "${truncateWords(correctSentence, 30)}"`
        : `This point is directly established in the text: "${truncateWords(correctSentence, 30)}"`
    });
  }

  // 2. Short Answer Question based on a real paragraph
  if (paragraphs.length >= 1) {
    const targetPara = paragraphs[Math.min(1, paragraphs.length - 1)];
    const quoteSlice = truncateWords(targetPara, 45);

    questions.push({
      id: `q_${Date.now()}_2`,
      question_type: 'short_answer',
      topic: topicName,
      difficulty,
      question_text: isBangla
        ? `নিচের উদ্ধৃতাংশটি মনোযোগ সহকারে পড়ুন এবং এর মূল বক্তব্য বা প্রেক্ষাপট সংক্ষেপে নিজের ভাষায় লিখুন:\n\n> "${quoteSlice}"`
        : `Read the following passage carefully and synthesize the key idea and contextual significance in your own words:\n\n> "${quoteSlice}"`,
      expected_answer: isBangla
        ? `উদ্ধৃত অংশের মূল সারমর্ম, উদ্দেশ্য এবং প্রাসঙ্গিক ঘটনার বিশ্লেষণমূলক বিবরণ।`
        : `A clear, well-reasoned summary explaining the core message and implications of the excerpt.`,
      explanation: isBangla
        ? `ডকুমেন্টের মূল বক্তব্য সঠিক অনুধাবন ও নিজের ভাষায় উপস্থাপন দক্ষতা যাচাই করা হচ্ছে।`
        : `Synthesizing textual evidence demonstrates deep reading comprehension and analytical retention.`
    });
  }

  // 3. Handwritten Derivation / Analytical Problem
  if (paragraphs.length >= 2 || sentences.length >= 4) {
    const analysisPara = paragraphs[0] || sentences.slice(0, 3).join(' ');
    const passageSlice = truncateWords(analysisPara, 50);

    questions.push({
      id: `q_${Date.now()}_3`,
      question_type: 'handwritten_derivation',
      topic: topicName,
      difficulty,
      question_text: isBangla
        ? `নিচের নির্বাচিত অংশটি পর্যালোচনা করে এর অন্তর্নিহিত ভাবার্থ বা প্রধান যুক্তি বিশদভাবে খাতায় লিখে ছবি তুলুন বা সমাধান দিন:\n\n> "${passageSlice}"\n\n(কমপক্ষে ৩টি মূল দিক বা যুক্তি পয়েন্ট আকারে উপস্থাপন করুন)`
        : `Conduct a detailed structured analysis of the following passage from "${docTitle}". Write down your step-by-step reasoning on paper and submit your handwritten work:\n\n> "${passageSlice}"\n\n(Structure your response with at least 3 distinct analytical points)`,
      expected_answer: isBangla
        ? `উদ্ধৃত অংশের ৩টি প্রধান দিক চিহ্নিতকরণ ও যৌক্তিক বিশ্লেষণ।`
        : `Identification of 3 core analytical dimensions with coherent supporting reasoning.`,
      explanation: isBangla
        ? `খাতায় হাতে লিখে বিশ্লেষণ করলে জটিল ধারণাগুলো স্মৃতিতে দীর্ঘস্থায়ী হয়।`
        : `Handwritten conceptual synthesis bridges passive reading into verified active mastery.`,
      rubric: isBangla
        ? [
            { criterion: 'মূল ভাবার্থ বা বক্তব্যের সঠিক অনুধাবন', points: 0.40, description: 'উদ্ধৃতাংশের প্রধান প্রতিপাদ্য সঠিকভাবে চিহ্নিত করেছে কিনা' },
            { criterion: 'যুক্তিভিত্তিক বিশ্লেষণ ও বিস্তার', points: 0.35, description: 'বিষয়ের প্রাসঙ্গিক বিশ্লেষণ ও কারণ ব্যাখ্যা করেছে কিনা' },
            { criterion: 'উপস্থাপনের স্পষ্টতা ও লেখার পরিচ্ছন্নতা', points: 0.25, description: 'পরিচ্ছন্ন হাতের লেখা ও সুসংগঠিত বাক্যবিন্যাস' }
          ]
        : [
            { criterion: 'Identification of Core Thesis', points: 0.40, description: 'Accurately identifies the primary premise and arguments' },
            { criterion: 'Analytical Depth & Justification', points: 0.35, description: 'Provides grounded elaboration using evidence from the text' },
            { criterion: 'Structure & Legibility', points: 0.25, description: 'Clear handwritten presentation with logical sequencing' }
          ]
    });
  }

  // 4. Secondary MCQ if more questions requested
  if (count >= 4 && sentences.length >= 5) {
    const secondarySent = sentences[minIdx(4, sentences.length - 1)];
    const otherSent = sentences[minIdx(1, sentences.length - 1)];

    questions.push({
      id: `q_${Date.now()}_4`,
      question_type: 'mcq',
      topic: topicName,
      difficulty,
      question_text: isBangla
        ? `"${docTitle}"-এ বর্ণিত প্রেক্ষাপটে নিচের কোন বক্তব্যটির যৌক্তিক মিল রয়েছে?`
        : `Which of the following points aligns consistently with the arguments presented in "${docTitle}"?`,
      options: [
        { key: 'A', text: truncateWords(secondarySent, 20) },
        { key: 'B', text: isBangla ? 'আলোচ্য তথ্যের সম্পূর্ণ বিপরীত সিদ্ধান্ত' : 'A direct inversion of the described outcome' },
        { key: 'C', text: truncateWords(otherSent, 18) },
        { key: 'D', text: isBangla ? 'কোনোটিই প্রাসঙ্গিক নয়' : 'None of the above are relevant' }
      ],
      correct_option: 'A',
      expected_answer: `A: ${truncateWords(secondarySent, 20)}`,
      explanation: isBangla
        ? `উক্ত বক্তব্যটি সরাসরি মূল লেখার সাথে সামঞ্জস্যপূর্ণ।`
        : `This statement directly mirrors the author's argument in this section.`
    });
  }

  return questions.slice(0, count);
}

/**
 * Optional Direct Gemini Flash integration for custom AI generation
 */
async function generateWithGeminiAPI({ apiKey, docTitle, topicName, contextText, difficulty, count }) {
  const isBangla = /[\u0980-\u09FF]/.test(contextText || topicName || docTitle);
  const promptLang = isBangla ? 'Bengali (বাংলা)' : 'English';

  const systemPrompt = `You are an expert AI Examiner and Educational Assessor.
Task: Create a targeted ${count}-question quiz based STRICTLY on the provided study material.
Document Title: "${docTitle}"
Topic / Section: "${topicName}"
Difficulty: ${difficulty}
Language: You MUST generate ALL questions, options, answers, and rubrics strictly in ${promptLang}.

Material Excerpt:
${contextText.slice(0, 4000)}

Output Requirements:
Return a STRICT JSON array of question objects with this schema:
[
  {
    "question_type": "mcq" | "short_answer" | "handwritten_derivation",
    "topic": "${topicName}",
    "difficulty": "${difficulty}",
    "question_text": "question statement strictly in ${promptLang}",
    "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}], // only for mcq
    "correct_option": "A", // only for mcq
    "expected_answer": "complete model solution in ${promptLang}",
    "explanation": "explanation in ${promptLang}",
    "rubric": [ // only for handwritten_derivation
      {"criterion": "string", "points": 0.4, "description": "string"},
      {"criterion": "string", "points": 0.35, "description": "string"},
      {"criterion": "string", "points": 0.25, "description": "string"}
    ]
  }
]
Output ONLY the raw JSON array. No markdown fences.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemPrompt }] }]
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API returned status ${res.status}`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map((q, idx) => ({
      ...q,
      id: `q_gemini_${Date.now()}_${idx}`
    }));
  }
  return null;
}

/* ── Helpers ── */

function cleanRawText(text) {
  if (!text) return '';
  return text
    .replace(/--- Page \d+ ---/g, '')
    .replace(/www\.[a-z0-9.-]+\.[a-z]{2,}/gi, '')
    .replace(/[_-]{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCleanSentences(text, isBangla) {
  if (!text) return [];
  // Split on punctuation
  const delimiter = isBangla ? /(?<=[।!?\n])\s+/ : /(?<=[.!?\n])\s+/;
  const raw = text.split(delimiter);
  return raw
    .map(s => s.trim())
    .filter(s => {
      const words = s.split(/\s+/).length;
      return words >= 6 && words <= 45;
    });
}

function extractCleanParagraphs(text, isBangla) {
  if (!text) return [];
  const raw = text.split(/\n{2,}|\.\s{2,}|।\s{2,}/);
  return raw
    .map(p => p.trim())
    .filter(p => {
      const words = p.split(/\s+/).length;
      return words >= 15 && words <= 90;
    });
}

function truncateWords(str, count) {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length <= count) return str;
  return words.slice(0, count).join(' ') + '...';
}

function alterSentenceForDistractor(sentence, isBangla) {
  if (isBangla) {
    if (sentence.includes('ছিল')) return sentence.replace('ছিল', 'ছিল না');
    if (sentence.includes('করেন')) return sentence.replace('করেন', 'করেননি');
    return `পূর্ববর্তী মতামতের বিপরীতে: ${truncateWords(sentence, 15)}`;
  } else {
    if (sentence.includes('is ')) return sentence.replace('is ', 'is not ');
    if (sentence.includes('can ')) return sentence.replace('can ', 'cannot ');
    return `Contrary to the evidence: ${truncateWords(sentence, 15)}`;
  }
}

function shuffleWithCorrectKey(options, originalCorrectKey) {
  const original = options.find(o => o.key === originalCorrectKey)?.text || options[0].text;
  const keys = ['A', 'B', 'C', 'D'];
  const shuffledTexts = options.map(o => o.text).sort(() => Math.random() - 0.5);
  const newOptions = keys.map((k, i) => ({ key: k, text: shuffledTexts[i] }));
  const newCorrectKey = newOptions.find(o => o.text === original)?.key || 'A';
  return { options: newOptions, correctKey: newCorrectKey };
}

function minIdx(idx, max) {
  return Math.min(Math.max(0, idx), max);
}
