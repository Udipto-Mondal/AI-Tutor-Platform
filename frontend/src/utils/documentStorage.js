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
  if (!filename) return ['General Concepts', 'Lecture Notes'];
  
  const cleanName = filename
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[_-]+/g, ' ')
    .trim();

  // If filename is in Bengali, provide natural Bengali topic pills
  if (/[\u0980-\u09FF]/.test(cleanName)) {
    return [
      cleanName,
      `মূল বক্তব্য ও চরিত্র বিশ্লেষণ (${cleanName})`,
      'গুরুত্বপূর্ণ উদ্ধৃতি ও প্রেক্ষাপট'
    ];
  }

  // Split by common separators
  const words = cleanName.split(/\s+/);
  if (words.length <= 2) {
    return [cleanName, 'Overview & Structure', 'Core Analysis'];
  }

  // Generate 3 nice distinct concept tags
  const chunks = [];
  for (let i = 0; i < words.length; i += 2) {
    const slice = words.slice(i, i + 2).join(' ');
    if (slice) {
      chunks.push(slice.charAt(0).toUpperCase() + slice.slice(1));
    }
  }

  return chunks.slice(0, 4);
}
