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
    num_chunks: 5,
    topics_covered: ['Neural Networks', 'Backpropagation', 'Activation Functions', 'Gradient Descent'],
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
    return DEFAULT_DOCS;
  } catch (e) {
    console.warn('Storage read fallback:', e);
    return DEFAULT_DOCS;
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

  // Split by common separators
  const words = cleanName.split(/\s+/);
  if (words.length <= 2) {
    return [cleanName, 'Overview', 'Core Analysis'];
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
