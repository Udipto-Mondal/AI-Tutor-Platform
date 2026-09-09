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

export function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DOCS));
      seedDefaultPreviews();
      return DEFAULT_DOCS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure defaults exist if not already present
      const existingIds = new Set(parsed.map(d => d.id || d.filename));
      const merged = [...parsed];
      DEFAULT_DOCS.forEach(def => {
        if (!existingIds.has(def.id) && !existingIds.has(def.filename)) {
          merged.push(def);
        }
      });
      return merged;
    }
    seedDefaultPreviews();
    return DEFAULT_DOCS;
  } catch (e) {
    console.warn('Storage read fallback:', e);
    return DEFAULT_DOCS;
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

  // Detect coding
  if (/coding|program|interview|algo|data structure/i.test(cleanName)) {
    return [
      'Data Structures & Big-O Complexity',
      'Algorithm Design & Edge Cases',
      'Problem Solving & Invariants',
      'System Architecture & Scalability'
    ];
  }

  // Split clean name into short, meaningful topics
  const words = cleanName.split(/\s+/);
  if (words.length <= 2) {
    return [cleanName, 'Foundations & Architecture', 'Analytical Evaluation', 'Practical Applications'];
  }

  return [
    cleanName.slice(0, 30),
    'Core Concepts & Foundations',
    'Methodologies & Structural Analysis',
    'Practical Synthesis & Trade-offs'
  ];
}
