/**
 * Client-side Document Storage & Persistence Helper
 * Ensures documents uploaded by the user are immediately preserved in localStorage
 * and stay accessible across Knowledge Vault, Quiz Studio, and Socratic Tutor.
 */

export const DEFAULT_DOCS = [
  {
    id: 'doc_deep_learning',
    filename: 'deep_learning_neural_networks.md',
    file_type: 'md',
    size_bytes: 2840,
    uploaded_at: new Date(Date.now() - 86400000).toISOString(),
    num_chunks: 4,
    topics_covered: ['Neural Networks', 'Backpropagation & Gradients', 'Activation Functions', 'Gradient Descent'],
  },
  {
    id: 'doc_dsa',
    filename: 'data_structures_algorithms.md',
    file_type: 'md',
    size_bytes: 1420,
    uploaded_at: new Date(Date.now() - 43200000).toISOString(),
    num_chunks: 3,
    topics_covered: ['Big-O Complexity', 'Trees & Graphs', 'Dynamic Programming'],
  },
];

const STORAGE_KEY = 'ai_tutor_documents_vault_v1';
const DELETED_KEY = 'ai_tutor_deleted_filenames_v1';
const INITIALIZED_KEY = 'ai_tutor_vault_initialized_v2';

export function getDeletedFilenames() {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markDocumentDeleted(filename, id) {
  try {
    const deleted = getDeletedFilenames();
    if (filename) deleted.add(filename);
    if (id) deleted.add(id);
    localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
  } catch {
    // ignore
  }
}

export function unmarkDocumentDeleted(filename) {
  try {
    const deleted = getDeletedFilenames();
    if (filename && deleted.has(filename)) {
      deleted.delete(filename);
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted]));
    }
  } catch {
    // ignore
  }
}

export function isExplicitCodingDoc(filename) {
  return /\b(?:leetcode|dsa|data[\s_-]?structures?|algorithms?[\s_-]?design|cracking[\s_-]?the[\s_-]?coding)\b/i.test(filename || '');
}

export function getStoredDocuments() {
  try {
    const isInit = localStorage.getItem(INITIALIZED_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    const deleted = getDeletedFilenames();

    if (!isInit && !raw) {
      // First time ever visiting: seed default docs
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DOCS));
      localStorage.setItem(INITIALIZED_KEY, 'true');
      seedDefaultPreviews();
      return DEFAULT_DOCS;
    }

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any documents that the user explicitly deleted
      const active = parsed.filter(d => !deleted.has(d.filename) && !deleted.has(d.id));

      // Auto-heal stale topics for non-coding documents
      let needsSave = false;
      const healed = active.map(doc => {
        const isCoding = isExplicitCodingDoc(doc.filename);
        if (!isCoding && doc.topics_covered && doc.topics_covered.some(t => /\b(?:data structures?|big-?o|trees?\s*&\s*graphs?|dynamic programming)\b/i.test(t))) {
          needsSave = true;
          return {
            ...doc,
            topics_covered: extractTopicsFromFilename(doc.filename)
          };
        }
        return doc;
      });

      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(healed));
      }

      return healed;
    }
    return [];
  } catch (e) {
    console.warn('Storage read fallback:', e);
    return [];
  }
}

function seedDefaultPreviews() {
  try {
    localStorage.setItem('ai_tutor_doc_prev_doc_deep_learning', JSON.stringify({
      id: 'doc_deep_learning',
      sample: 'Deep Learning & Neural Networks: Comprehensive Study Notes. Fundamentals of ANNs, Forward Propagation, Backpropagation chain rule dL/dw = delta * a, Activation Functions.',
      topics: ['Neural Networks', 'Backpropagation & Gradients', 'Activation Functions', 'Gradient Descent'],
      isBangla: false
    }));
    localStorage.setItem('ai_tutor_doc_prev_doc_dsa', JSON.stringify({
      id: 'doc_dsa',
      sample: 'Data Structures and Algorithms Essential Guide. Asymptotic Complexity and Big-O Notation, Trees and Graphs, Binary Search Trees, BFS and DFS.',
      topics: ['Big-O Complexity', 'Trees & Graphs', 'Dynamic Programming'],
      isBangla: false
    }));
  } catch {
    // ignore
  }
}

export function saveStoredDocuments(docs) {
  try {
    if (Array.isArray(docs)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    }
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

export function extractTopicsFromFilename(filename) {
  if (!filename) return ['Core Concepts', 'Lecture Notes'];
  
  const cleanName = filename
    .replace(/\.[^/.]+$/, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(?:189|programming questions|solutions|edition|pdf|ebook|download|www\.[^\s]+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Study Notes';

  // If filename is in Bengali
  if (/[\u0980-\u09FF]/.test(cleanName)) {
    return [
      cleanName,
      'মূল বক্তব্য ও চরিত্র রূপায়ণ',
      'প্রধান ঘটনাপ্রবাহ ও সংলাপ বিশ্লেষণ',
      'উদ্ধৃতি ও প্রেক্ষাপট অনুধাবন'
    ];
  }

  // Detect explicit coding/DSA material
  if (/\b(?:leetcode|dsa|data[\s_-]?structures?|algorithms?[\s_-]?design|cracking[\s_-]?the[\s_-]?coding)\b/i.test(cleanName)) {
    return [
      'Data Structures & Asymptotic Analysis',
      'Algorithm Design & Edge Cases',
      'Problem Solving & Invariants',
      'System Architecture & Trade-offs'
    ];
  }

  // Document-specific contextual topics for general documents
  return [
    `${cleanName}: Overview & Objectives`,
    'Key Findings & Data Analysis',
    'Methodologies, Observations & Evidence',
    'Strategic Conclusions & Recommendations'
  ];
}
