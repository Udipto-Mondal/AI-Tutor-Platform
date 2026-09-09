"""
Quiz Generation Agent.
Synthesizes adaptive quizzes from retrieved knowledge chunks.
Supports MCQs, Short Answers, and Handwritten Derivation questions with step-by-step rubrics.
"""

import os
import re
import json
import uuid
from typing import List, Optional
from datetime import datetime, timezone

from app.models.schemas import (
    Quiz, QuizQuestion, QuestionOption, RubricItem,
    QuestionType, DifficultyLevel, QuizGenerationRequest
)
from app.services.rag.vector_store import vector_store
from app.core.config import settings

def generate_quiz_with_llm(context_text: str, request: QuizGenerationRequest) -> Optional[List[QuizQuestion]]:
    if not settings.GEMINI_API_KEY:
        return None
        
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""You are an expert AI Tutor. Based on the following study materials, create an adaptive quiz with {request.num_questions} questions.
Difficulty level: {request.difficulty.value}
Include handwritten derivation/math problem: {request.include_handwritten}

Context Material:
{context_text[:4000]}

Format output strictly as a JSON array of question objects with this schema:
[
  {{
    "question_type": "mcq" | "short_answer" | "handwritten_derivation",
    "topic": "string",
    "difficulty": "{request.difficulty.value}",
    "question_text": "clear problem statement",
    "options": [{{"key": "A", "text": "... "}}, {{"key": "B", "text": "..."}}, ...],  // only if mcq
    "correct_option": "A", // only if mcq
    "expected_answer": "complete model solution",
    "explanation": "why this is the right answer",
    "rubric": [
      {{"criterion": "Step 1 accuracy", "points": 0.4, "description": "..."}},
      {{"criterion": "Formula application", "points": 0.4, "description": "..."}},
      {{"criterion": "Final result", "points": 0.2, "description": "..."}}
    ]
  }}
]
Output ONLY valid JSON without markdown formatting.
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean potential markdown fences
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        
        raw_items = json.loads(text)
        questions = []
        for item in raw_items:
            q_id = f"q_{uuid.uuid4().hex[:6]}"
            q_type = QuestionType(item.get("question_type", "mcq"))
            options = [QuestionOption(**opt) for opt in item.get("options", [])] if item.get("options") else None
            rubric = [RubricItem(**r) for r in item.get("rubric", [])] if item.get("rubric") else None
            
            questions.append(QuizQuestion(
                id=q_id,
                question_type=q_type,
                topic=item.get("topic", "General"),
                difficulty=request.difficulty,
                question_text=item.get("question_text", ""),
                options=options,
                correct_option=item.get("correct_option"),
                expected_answer=item.get("expected_answer", ""),
                explanation=item.get("explanation", ""),
                rubric=rubric,
                source_chunks=[]
            ))
        return questions
    except Exception as e:
        print(f"[QuizAgent] LLM generation error: {e}, falling back to template agent.")
        return None

def generate_heuristic_quiz(context_text: str, request: QuizGenerationRequest) -> List[QuizQuestion]:
    """Content-aware quiz generator: builds questions from the actual document context text.
    Falls back to generic Deep Learning questions only if no meaningful context was retrieved."""
    
    # --- If we have real document context, generate document-specific questions ---
    if context_text and len(context_text.strip()) > 200:
        return _generate_from_context(context_text, request)
    
    # --- Generic fallback (no doc uploaded / no chunks in vector store) ---
    return _generate_default_dl_quiz(request)


def _extract_sentences(text: str) -> List[str]:
    """Split text into clean sentences, supporting both Latin and Bengali scripts."""
    # Split on sentence-ending punctuation or Bengali danda (।) or newline
    raw = re.split(r'(?<=[।.!?])\s+|\n', text)
    sentences = []
    for s in raw:
        s = s.strip()
        if len(s.split()) >= 6:   # at least 6 words to be a meaningful sentence
            sentences.append(s)
    return sentences


def _clean_text(text: str) -> str:
    """Strip LaTeX, markdown formatting, and special characters for clean display."""
    if not text:
        return text
    # Remove LaTeX block math: $$...$$
    text = re.sub(r'\$\$[^$]+\$\$', '', text)
    # Remove LaTeX inline math: $...$
    text = re.sub(r'\$[^$\n]+\$', '', text)
    # Remove markdown bold: **text**
    text = re.sub(r'\*{1,3}([^*]+)\*{1,3}', r'\1', text)
    # Remove markdown headings: ## Heading
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    # Remove markdown links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove backticks
    text = re.sub(r'`+([^`]+)`+', r'\1', text)
    # Collapse multiple spaces / dashes
    text = re.sub(r'[-_]{2,}', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()


def _get_topic_from_chunk(chunk_text: str, fallback: str = "Document Content") -> str:
    """Best-effort clean topic label from a text chunk."""
    first_line = chunk_text.strip().splitlines()[0][:80] if chunk_text.strip() else ""
    cleaned = _clean_text(first_line)
    if cleaned and len(cleaned.split()) <= 12 and len(cleaned) > 4:
        return cleaned
    return fallback


def _generate_from_context(context_text: str, request: QuizGenerationRequest) -> List[QuizQuestion]:
    """Build quiz questions directly from the retrieved document text."""
    questions: List[QuizQuestion] = []
    
    # Split context into paragraphs for variety
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n|---\s*Page\s*\d+\s*---', context_text) if p.strip() and len(p.strip().split()) > 10]
    
    topic_label = _get_topic_from_chunk(paragraphs[0] if paragraphs else context_text)
    sentences = _extract_sentences(context_text)
    
    # --- Q1: Short answer about the main content ---
    if paragraphs:
        intro_para = paragraphs[0][:600]
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic=topic_label,
            difficulty=request.difficulty,
            question_text=f"নিচের অনুচ্ছেদটি পড়ুন এবং মূল বিষয়বস্তু সংক্ষেপে বর্ণনা করুন:\n\n\"{intro_para[:300]}...\"" if any(ord(c) > 127 for c in intro_para) else f"Based on the uploaded material, summarize the key ideas presented in the following passage:\n\n\"{intro_para[:300]}...\"",
            expected_answer="Summarize the main ideas, key terms, and central argument of the passage in your own words.",
            explanation="Reading comprehension and summarization tests your understanding of the document's core message.",
            rubric=[
                RubricItem(criterion="Key Points Identified", points=0.50, description="Mentions 2-3 main ideas from the passage"),
                RubricItem(criterion="Accuracy", points=0.30, description="Correctly represents what the passage says"),
                RubricItem(criterion="Clarity", points=0.20, description="Answer is clearly written and coherent")
            ],
            source_chunks=[]
        ))
    
    # --- Q2: Comprehension MCQ from a sentence in the document ---
    if len(sentences) >= 3:
        pivot = sentences[min(2, len(sentences) - 1)]
        pivot_short = pivot[:120]
        # Distractor options derived from other sentences
        distractors = [s[:80] for s in sentences if s != pivot][:3]
        while len(distractors) < 3:
            distractors.append("None of the above")
        
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic=_get_topic_from_chunk(paragraphs[1] if len(paragraphs) > 1 else context_text, topic_label),
            difficulty=request.difficulty,
            question_text=f"নিচের কোনটি আপলোড করা ডকুমেন্টে সরাসরি উল্লেখ আছে?" if any(ord(c) > 127 for c in context_text[:200]) else f"Which of the following is directly stated in the uploaded document?",
            options=[
                QuestionOption(key="A", text=pivot_short),
                QuestionOption(key="B", text=distractors[0]),
                QuestionOption(key="C", text=distractors[1]),
                QuestionOption(key="D", text=distractors[2]),
            ],
            correct_option="A",
            expected_answer=f"A: {pivot_short}",
            explanation=f"This sentence appears directly in the document: '{pivot_short}'",
            source_chunks=[]
        ))
    
    # --- Q3: Handwritten / Long-form analysis ---
    if request.include_handwritten and len(paragraphs) >= 2:
        analysis_para = paragraphs[min(1, len(paragraphs) - 1)][:400]
        is_bangla = any(ord(c) > 0x0980 and ord(c) < 0x09FF for c in analysis_para)
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic=_get_topic_from_chunk(paragraphs[min(1, len(paragraphs)-1)], topic_label),
            difficulty=request.difficulty,
            question_text=(
                f"নিচের অংশটি পড়ুন এবং এর মূল ধারণা, যুক্তি ও প্রভাব নিজের ভাষায় হাতে লিখুন:\n\n\"{analysis_para[:250]}...\""
                if is_bangla else
                f"Read the following passage from the uploaded document and write a detailed analysis: key ideas, implications, and your critical assessment:\n\n\"{analysis_para[:250]}...\""
            ),
            expected_answer="A complete written analysis mentioning the key concepts, their relationships, and broader significance.",
            explanation="Deep analysis requires you to synthesize information from the document and express it in your own words.",
            rubric=[
                RubricItem(criterion="Concept Identification", points=0.40, description="Correctly identifies main concepts from the passage"),
                RubricItem(criterion="Analysis Depth", points=0.35, description="Provides meaningful interpretation beyond surface repetition"),
                RubricItem(criterion="Presentation", points=0.25, description="Legible handwriting and organized structure")
            ],
            source_chunks=[]
        ))
    
    # --- Q4: Short answer on a detail from the document ---
    if len(sentences) >= 5:
        detail_sent = sentences[min(4, len(sentences) - 1)]
        is_bangla = any(ord(c) > 0x0980 and ord(c) < 0x09FF for c in detail_sent)
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic=topic_label,
            difficulty=request.difficulty,
            question_text=(
                f"নিচের বাক্যটি কোন প্রসঙ্গে বলা হয়েছে এবং এর তাৎপর্য কী? ব্যাখ্যা করুন:\n\n\"{detail_sent[:200]}\""
                if is_bangla else
                f"Explain the context and significance of this passage from the document:\n\n\"{detail_sent[:200]}\""
            ),
            expected_answer="Explain what this sentence means within the broader context of the document.",
            explanation="Understanding contextual significance tests deeper reading comprehension.",
            rubric=[
                RubricItem(criterion="Context Understanding", points=0.50, description="Correctly places the quote in the document's narrative"),
                RubricItem(criterion="Significance Explained", points=0.50, description="Articulates why this point matters")
            ],
            source_chunks=[]
        ))
    
    # --- Q5: Document-wide synthesis MCQ ---
    if len(paragraphs) >= 3:
        last_para = paragraphs[-1][:200]
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic=topic_label,
            difficulty=request.difficulty,
            question_text=(
                "এই ডকুমেন্টের মূল উদ্দেশ্য বা বিষয়বস্তু কী?"
                if any(ord(c) > 127 for c in context_text[:200]) else
                "What is the primary purpose or central theme of the uploaded document?"
            ),
            options=[
                QuestionOption(key="A", text=f"{topic_label[:80]}"),
                QuestionOption(key="B", text="A technical manual for software installation"),
                QuestionOption(key="C", text="A financial or legal document"),
                QuestionOption(key="D", text="An unrelated academic paper")
            ],
            correct_option="A",
            expected_answer=f"A: {topic_label[:80]}",
            explanation=f"The document's main theme is '{topic_label}' as evidenced by its opening sections.",
            source_chunks=[]
        ))
    
    # Trim to requested count
    return questions[:request.num_questions] if questions else _generate_default_dl_quiz(request)[:request.num_questions]


def _generate_default_dl_quiz(request: QuizGenerationRequest) -> List[QuizQuestion]:
    """Generic Deep Learning quiz — only used when NO document context is available."""
    questions = []
    if request.include_handwritten:
        questions.append(QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Backpropagation & Gradients",
            difficulty=request.difficulty,
            question_text="Derive the gradient of the loss $\\mathcal{L}$ with respect to the weight $w_{ij}^{(l)}$ in layer $l$ using the chain rule. Write down the step-by-step equations for $\\frac{\\partial \\mathcal{L}}{\\partial z_j^{(l)}}$ and the weight update.",
            expected_answer="Step 1: By chain rule, dL/dw_ij^(l) = (dL/dz_j^(l)) * (dz_j^(l)/dw_ij^(l)). Step 2: Since z_j^(l) = sum(w_jk a_k) + b, dz_j/dw_ij = a_i^(l-1). Step 3: Let error term delta_j^(l) = dL/dz_j^(l). Then dL/dw_ij = delta_j^(l) * a_i^(l-1).",
            explanation="The chain rule decomposes the loss derivative into the error term delta of the current neuron multiplied by the activation output of the previous layer.",
            rubric=[
                RubricItem(criterion="Application of Chain Rule", points=0.35, description="Correctly states dL/dw = (dL/dz) * (dz/dw)"),
                RubricItem(criterion="Identification of dz/dw = a^(l-1)", points=0.35, description="Correctly computes partial derivative with respect to weight"),
                RubricItem(criterion="Final Error Propagation Formula", points=0.30, description="Accurately defines delta term and final gradient product")
            ],
            source_chunks=[]
        ))
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.MCQ,
        topic="Activation Functions",
        difficulty=request.difficulty,
        question_text="Which activation function is most susceptible to the 'Vanishing Gradient' problem when neuron activations become very large in magnitude?",
        options=[
            QuestionOption(key="A", text="ReLU (Rectified Linear Unit)"),
            QuestionOption(key="B", text="Sigmoid / Logistic"),
            QuestionOption(key="C", text="Leaky ReLU"),
            QuestionOption(key="D", text="Linear Activation")
        ],
        correct_option="B",
        expected_answer="B: Sigmoid / Logistic",
        explanation="The derivative of the Sigmoid function is sigma(z)*(1 - sigma(z)), which approaches 0 for large positive or negative values of z, causing gradients to vanish during backpropagation.",
        source_chunks=[]
    ))
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.HANDWRITTEN_DERIVATION,
        topic="Convolutional Neural Networks",
        difficulty=request.difficulty,
        question_text="Given an input image of size $32 \\times 32$, a filter/kernel of size $5 \\times 5$, padding $P = 2$, and stride $S = 1$, calculate the output spatial dimension $O$. Show your formula and calculation.",
        expected_answer="Formula: O = ((W - K + 2P) / S) + 1. Calculation: O = ((32 - 5 + 2*2) / 1) + 1 = 32. Output dimension is 32x32.",
        explanation="Same padding preserves spatial dimensions.",
        rubric=[
            RubricItem(criterion="Formula Recall", points=0.30, description="Correctly states O = (W - K + 2P)/S + 1"),
            RubricItem(criterion="Substitution of Values", points=0.40, description="Substitutes W=32, K=5, P=2, S=1 accurately"),
            RubricItem(criterion="Final Correct Dimension", points=0.30, description="Arrives at 32x32")
        ],
        source_chunks=[]
    ))
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.SHORT_ANSWER,
        topic="Loss Functions & Optimization",
        difficulty=request.difficulty,
        question_text="How does the Adam optimizer combine the principles of Momentum and RMSprop?",
        expected_answer="Adam combines Momentum (first moment: exponentially weighted avg of gradients) with RMSprop (second moment: exponentially weighted avg of squared gradients), plus bias correction.",
        explanation="Adam tracks directional velocity and per-parameter scale for adaptive learning rates.",
        rubric=[
            RubricItem(criterion="Momentum Explanation", points=0.5, description="Mentions first moment"),
            RubricItem(criterion="RMSprop Explanation", points=0.5, description="Mentions second moment")
        ],
        source_chunks=[]
    ))
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.MCQ,
        topic="Regularization & Dropout",
        difficulty=request.difficulty,
        question_text="How does Dropout operate during the training phase versus the test/evaluation phase?",
        options=[
            QuestionOption(key="A", text="Neurons are randomly dropped in both training and testing with rate p"),
            QuestionOption(key="B", text="Neurons are randomly dropped during training; at test time all neurons are active and weights are scaled"),
            QuestionOption(key="C", text="Neurons are only dropped during test time to introduce stochastic ensemble behavior"),
            QuestionOption(key="D", text="Dropout only zeroes out the bias parameters during training")
        ],
        correct_option="B",
        expected_answer="B: Neurons are randomly dropped during training; at test time all neurons are active and weights are scaled",
        explanation="During training, activations are randomly masked with probability p. At test time, the full network is used with weights scaled by (1-p).",
        source_chunks=[]
    ))
    return questions[:request.num_questions]

def create_quiz(request: QuizGenerationRequest) -> Quiz:
    # 1. Retrieve relevant chunks — prioritise the uploaded document's own chunks
    chunks = []
    if request.doc_ids:
        # First: pull directly from the specific document(s) with a broad query
        chunks = vector_store.query("main content topics overview", top_k=8, doc_ids=request.doc_ids)
        if not chunks:
            # Second attempt: hydrate vector store from persisted storage and retry
            vector_store.hydrate_from_storage()
            chunks = vector_store.query("main content topics overview", top_k=8, doc_ids=request.doc_ids)
        if not chunks:
            # Third: pull all chunks for that doc directly from storage
            try:
                from app.db.storage import storage as _storage
                for doc_id in request.doc_ids:
                    doc_chunks = _storage.get_document_chunks(doc_id)
                    chunks.extend(doc_chunks)
                    vector_store.add_chunks(doc_chunks)  # ensure indexed
            except Exception as e:
                print(f"[QuizAgent] Direct storage chunk fetch failed: {e}")
    elif request.topics:
        for topic in request.topics:
            chunks.extend(vector_store.query(topic, top_k=2))
    else:
        chunks = vector_store.query("neural networks machine learning algorithms", top_k=6)
        
    context_text = "\n\n".join([c.content for c in chunks])
    print(f"[QuizAgent] Retrieved {len(chunks)} chunks, context length={len(context_text)} chars, doc_ids={request.doc_ids}")
    
    # 2. Try LLM generation first, then fall back to content-aware heuristic generator
    generated_questions = generate_quiz_with_llm(context_text, request)
    if not generated_questions:
        generated_questions = generate_heuristic_quiz(context_text, request)
        
    # Clean all topic labels
    topics_list = list(set([_clean_text(q.topic) for q in generated_questions if q.topic]))
    quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
    
    # Build a meaningful title from the document filename (preferred) or a topic label
    if request.doc_ids and chunks:
        raw_name = getattr(chunks[0], 'doc_name', None) or topics_list[0] if topics_list else "Study Session"
        title_suffix = (raw_name
                        .replace('.pdf', '')
                        .replace('.md', '')
                        .replace('_', ' ')
                        .strip()
                        .title())
        # If the doc_name is empty/non-ASCII (e.g. Bengali), fall back to generic
        if not title_suffix or not title_suffix.isprintable() or len(title_suffix) < 2:
            title_suffix = "Uploaded Document"
    else:
        title_suffix = _clean_text(topics_list[0]) if topics_list else "Core Concepts"

    # Final safety clean on title
    title_suffix = _clean_text(title_suffix)[:60] or "Study Session"
    
    return Quiz(
        id=quiz_id,
        title=f"Quiz — {title_suffix}",
        created_at=datetime.now(timezone.utc),
        doc_ids=request.doc_ids or [],
        topics=topics_list,
        questions=generated_questions,
        time_limit_minutes=max(5, len(generated_questions) * 3)
    )
