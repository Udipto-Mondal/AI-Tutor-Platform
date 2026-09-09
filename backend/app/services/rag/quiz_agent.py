"""
Quiz Generation Agent.
Synthesizes adaptive quizzes from retrieved knowledge chunks.
Supports MCQs, Short Answers, and Handwritten Derivation questions with step-by-step rubrics.
"""

import os
import re
import json
import uuid
import random
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
    """Build quiz questions directly from the retrieved document text with dynamic sampling for any count."""
    questions: List[QuizQuestion] = []
    
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n|---\s*Page\s*\d+\s*---', context_text) if p.strip() and len(p.strip().split()) > 6]
    if not paragraphs:
        paragraphs = [context_text.strip()]
        
    sentences = _extract_sentences(context_text)
    if not sentences:
        sentences = [p[:120] for p in paragraphs if p]

    is_bangla = any(ord(c) > 0x0980 and ord(c) < 0x09FF for c in context_text[:1000])
    topic_label = _get_topic_from_chunk(paragraphs[0] if paragraphs else context_text)

    def _make_mcq_options(correct_text: str, distractors: List[str]):
        keys = ["A", "B", "C", "D"]
        all_texts = [correct_text] + distractors[:3]
        while len(all_texts) < 4:
            all_texts.append("None of the above" if not is_bangla else "উপরের কোনোটিই নয়")
        random.shuffle(all_texts)
        correct_key = keys[all_texts.index(correct_text)]
        options = [QuestionOption(key=keys[i], text=all_texts[i][:120]) for i in range(4)]
        return options, correct_key

    shuffled_sentences = list(sentences)
    random.shuffle(shuffled_sentences)
    shuffled_paragraphs = list(paragraphs)
    random.shuffle(shuffled_paragraphs)

    needed = max(1, request.num_questions)
    idx = 0
    
    while len(questions) < needed:
        q_num = len(questions) + 1
        q_id = f"q_{uuid.uuid4().hex[:6]}"
        pattern = q_num % 4
        
        if pattern == 1:
            curr_para = shuffled_paragraphs[idx % len(shuffled_paragraphs)][:450]
            curr_topic = _get_topic_from_chunk(curr_para, topic_label)
            q_text = (
                f"নিচের অংশটি মনোযোগ দিয়ে পড়ুন এবং এর মূল ধারণা ও প্রতিপাদ্য বিষয় সংক্ষেপে নিজের ভাষায় লিখুন:\n\n\"{curr_para[:260]}...\""
                if is_bangla else
                f"Carefully review this excerpt and synthesize its core technical insight in your own words:\n\n\"{curr_para[:260]}...\""
            )
            questions.append(QuizQuestion(
                id=q_id,
                question_type=QuestionType.SHORT_ANSWER,
                topic=curr_topic,
                difficulty=request.difficulty,
                question_text=q_text,
                expected_answer="Synthesize the primary thesis, key parameters, and practical takeaways from the provided text excerpt.",
                explanation="Synthesizing main points tests comprehensive reading comprehension and analytical retention.",
                rubric=[
                    RubricItem(criterion="Core Idea Extraction", points=0.50, description="Correctly identifies the primary insight"),
                    RubricItem(criterion="Analytical Clarity", points=0.30, description="Coherent and precise explanation"),
                    RubricItem(criterion="Domain Accuracy", points=0.20, description="Faithful to the source document context")
                ],
                source_chunks=[]
            ))
            
        elif pattern == 2:
            curr_sent = shuffled_sentences[idx % len(shuffled_sentences)]
            curr_topic = _get_topic_from_chunk(curr_sent, topic_label)
            other_sents = [s for s in sentences if s != curr_sent]
            if other_sents:
                random.shuffle(other_sents)
                distractors = [s[:90] for s in other_sents[:3]]
            else:
                distractors = [
                    "This assertion is contradicted by foundational empirical results." if not is_bangla else "উক্ত বক্তব্যটি পরীক্ষিত সত্যের পরিপন্থী।",
                    "Requires unbounded memory scaling under extreme throughput." if not is_bangla else "অতিরিক্ত চাপ থাকলে মেমোরি নিয়ন্ত্রণহীন হয়ে পড়ে।",
                    "Only applicable in legacy single-threaded architectures." if not is_bangla else "শুধুমাত্র পূর্বতন একক-থ্রেডেড আর্কিটেকচারে প্রযোজ্য।"
                ]
            
            opts, correct_k = _make_mcq_options(curr_sent[:110], distractors)
            q_text = (
                f"আপলোড করা ডকুমেন্টের তথ্যানুযায়ী, নিচের কোন উক্তিটি সরাসরি সঠিক ও প্রমাণিত?"
                if is_bangla else
                f"Based on the provided document content, which of the following statements is directly confirmed?"
            )
            questions.append(QuizQuestion(
                id=q_id,
                question_type=QuestionType.MCQ,
                topic=curr_topic,
                difficulty=request.difficulty,
                question_text=q_text,
                options=opts,
                correct_option=correct_k,
                expected_answer=f"{correct_k}: {curr_sent[:110]}",
                explanation=f"Directly verified in document excerpt: '{curr_sent[:120]}'",
                source_chunks=[]
            ))
            
        elif pattern == 3 and request.include_handwritten:
            curr_para = shuffled_paragraphs[(idx + 1) % len(shuffled_paragraphs)][:450]
            curr_topic = _get_topic_from_chunk(curr_para, topic_label)
            q_text = (
                f"নিচের অনুচ্ছেদটির গাণিতিক যুক্তি বা ধারণাগত ভিত্তি বিশ্লেষণ করে আপনার সমাধানের প্রতিটি ধাপ পরিষ্কারভাবে হাতে লিখুন:\n\n\"{curr_para[:240]}...\""
                if is_bangla else
                f"Deconstruct the underlying logic, invariants, or mathematical formulation in this passage. Write your step-by-step derivation/analysis by hand:\n\n\"{curr_para[:240]}...\""
            )
            questions.append(QuizQuestion(
                id=q_id,
                question_type=QuestionType.HANDWRITTEN_DERIVATION,
                topic=curr_topic,
                difficulty=request.difficulty,
                question_text=q_text,
                expected_answer="Show detailed step-by-step mathematical derivation, intermediate relations, and structural reasoning.",
                explanation="Handwritten step-by-step derivations verify deep procedural understanding and symbolic formulation.",
                rubric=[
                    RubricItem(criterion="Mathematical/Logical Premise", points=0.40, description="Correctly states initial conditions and formulas"),
                    RubricItem(criterion="Step-by-Step Derivation", points=0.35, description="Clear, unbroken sequence of deductive transitions"),
                    RubricItem(criterion="Final Synthesis & Legibility", points=0.25, description="Legible handwritten notation with correct concluding result")
                ],
                source_chunks=[]
            ))
            
        else:
            curr_sent = shuffled_sentences[(idx + 2) % len(shuffled_sentences)]
            curr_topic = _get_topic_from_chunk(curr_sent, topic_label)
            
            if q_num % 2 == 0:
                distractors = [
                    "Decreases asymptotic runtime at the expense of exponential memory" if not is_bangla else "মেমোরি বাড়িয়ে দিয়ে রানটাইম কমায়",
                    "Guarantees deterministic constant-time bounds across arbitrary data distributions" if not is_bangla else "সব ধরণের ডেটাতে ও(১) সময় নিশ্চিত করে",
                    "Introduces recursive lock contention in asynchronous distributed environments" if not is_bangla else "ডিস্ট্রিবিউটেড সিস্টেমে লক সমস্যার সৃষ্টি করে"
                ]
                opts, correct_k = _make_mcq_options(curr_sent[:110], distractors)
                q_text = (
                    f"ডকুমেন্টের প্রেক্ষাপটে নিচের কোন পর্যবেক্ষণটি বিশেষভাবে তাৎপর্যপূর্ণ?"
                    if is_bangla else
                    f"In the context of the study material, which of the following evaluations holds true?"
                )
                questions.append(QuizQuestion(
                    id=q_id,
                    question_type=QuestionType.MCQ,
                    topic=curr_topic,
                    difficulty=request.difficulty,
                    question_text=q_text,
                    options=opts,
                    correct_option=correct_k,
                    expected_answer=f"{correct_k}: {curr_sent[:110]}",
                    explanation=f"Established in the source material: '{curr_sent[:120]}'",
                    source_chunks=[]
                ))
            else:
                q_text = (
                    f"ডকুমেন্টে আলোচিত \"{curr_sent[:90]}\" উক্তিটির মূল গুরুত্ব ও বাস্তব প্রয়োগ কী? সংক্ষেপে ব্যাখ্যা করুন।"
                    if is_bangla else
                    f"Explain the technical significance and practical implication of this statement from the material:\n\"{curr_sent[:120]}\""
                )
                questions.append(QuizQuestion(
                    id=q_id,
                    question_type=QuestionType.SHORT_ANSWER,
                    topic=curr_topic,
                    difficulty=request.difficulty,
                    question_text=q_text,
                    expected_answer="Explain the conceptual role, boundary conditions, and design trade-offs referenced in the statement.",
                    explanation="Evaluates ability to contextualize granular statements within high-level system design.",
                    rubric=[
                        RubricItem(criterion="Context Understanding", points=0.50, description="Correctly places statement in context"),
                        RubricItem(criterion="Significance & Trade-offs", points=0.50, description="Articulates practical implications clearly")
                    ],
                    source_chunks=[]
                ))
                
        idx += 1
        
    return questions[:needed]


def _generate_default_dl_quiz(request: QuizGenerationRequest) -> List[QuizQuestion]:
    """Rich, diverse CS & Deep Learning quiz pool supporting 5, 10, 15, 20+ questions with dynamic randomization."""
    raw_pool = [
        # 1. Backprop Derivation
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Backpropagation & Gradients",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Derive the gradient of the loss $\\mathcal{L}$ with respect to the weight $w_{ij}^{(l)}$ in layer $l$ using the chain rule. Write down the step-by-step equations for $\\frac{\\partial \\mathcal{L}}{\\partial z_j^{(l)}}$ and the weight update.",
            expected_answer="Step 1: By chain rule, dL/dw_ij^(l) = (dL/dz_j^(l)) * (dz_j^(l)/dw_ij^(l)). Step 2: Since z_j^(l) = sum(w_jk a_k) + b, dz_j/dw_ij = a_i^(l-1). Step 3: Let error term delta_j^(l) = dL/dz_j^(l). Then dL/dw_ij = delta_j^(l) * a_i^(l-1).",
            explanation="The chain rule decomposes the loss derivative into the error term delta of the current neuron multiplied by the activation output of the previous layer.",
            rubric=[
                RubricItem(criterion="Application of Chain Rule", points=0.35, description="Correctly states dL/dw = (dL/dz) * (dz/dw)"),
                RubricItem(criterion="Identification of dz/dw = a^(l-1)", points=0.35, description="Correctly computes partial derivative with respect to weight"),
                RubricItem(criterion="Final Error Propagation Formula", points=0.30, description="Accurately defines delta term and final gradient product")
            ],
            source_chunks=[]
        ),
        # 2. Vanishing Gradient MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Activation Functions",
            difficulty=DifficultyLevel.EASY,
            question_text="Which activation function is most susceptible to the 'Vanishing Gradient' problem when neuron activations become very large in magnitude?",
            options=[
                QuestionOption(key="A", text="Sigmoid / Logistic"),
                QuestionOption(key="B", text="ReLU (Rectified Linear Unit)"),
                QuestionOption(key="C", text="Leaky ReLU"),
                QuestionOption(key="D", text="Linear Activation")
            ],
            correct_option="A",
            expected_answer="A: Sigmoid / Logistic",
            explanation="The derivative of the Sigmoid function is sigma(z)*(1 - sigma(z)), which approaches 0 for large positive or negative values of z, causing gradients to vanish during backpropagation.",
            source_chunks=[]
        ),
        # 3. CNN Dimension Calculation Derivation
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Convolutional Neural Networks",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Given an input image of size $32 \\times 32$, a filter/kernel of size $5 \\times 5$, padding $P = 2$, and stride $S = 1$, calculate the output spatial dimension $O$. Show your formula and calculation.",
            expected_answer="Formula: O = ((W - K + 2P) / S) + 1. Calculation: O = ((32 - 5 + 2*2) / 1) + 1 = 32. Output dimension is 32x32.",
            explanation="Same padding preserves spatial dimensions.",
            rubric=[
                RubricItem(criterion="Formula Recall", points=0.30, description="Correctly states O = (W - K + 2P)/S + 1"),
                RubricItem(criterion="Substitution of Values", points=0.40, description="Substitutes W=32, K=5, P=2, S=1 accurately"),
                RubricItem(criterion="Final Correct Dimension", points=0.30, description="Arrives at 32x32")
            ],
            source_chunks=[]
        ),
        # 4. Adam Optimizer Short Answer
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic="Loss Functions & Optimization",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="How does the Adam optimizer combine the principles of Momentum and RMSprop?",
            expected_answer="Adam combines Momentum (first moment: exponentially weighted avg of gradients) with RMSprop (second moment: exponentially weighted avg of squared gradients), plus bias correction.",
            explanation="Adam tracks directional velocity and per-parameter scale for adaptive learning rates.",
            rubric=[
                RubricItem(criterion="Momentum Explanation", points=0.5, description="Mentions first moment"),
                RubricItem(criterion="RMSprop Explanation", points=0.5, description="Mentions second moment")
            ],
            source_chunks=[]
        ),
        # 5. Dropout MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Regularization & Dropout",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="How does Dropout operate during the training phase versus the test/evaluation phase?",
            options=[
                QuestionOption(key="A", text="Neurons are randomly dropped during training; at test time all neurons are active and weights are scaled"),
                QuestionOption(key="B", text="Neurons are randomly dropped in both training and testing with rate p"),
                QuestionOption(key="C", text="Neurons are only dropped during test time to introduce stochastic ensemble behavior"),
                QuestionOption(key="D", text="Dropout only zeroes out the bias parameters during training")
            ],
            correct_option="A",
            expected_answer="A: Neurons are randomly dropped during training; at test time all neurons are active and weights are scaled",
            explanation="During training, activations are randomly masked with probability p. At test time, the full network is used with weights scaled by (1-p).",
            source_chunks=[]
        ),
        # 6. QuickSort Partitioning MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Data Structures & Big-O Complexity",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Under what conditions does standard QuickSort exhibit its worst-case runtime of O(n^2)?",
            options=[
                QuestionOption(key="A", text="When pivots consistently partition the array into 0 and n-1 subproblems (e.g. sorted array with first element as pivot)"),
                QuestionOption(key="B", text="When the recursion stack exceeds heap memory allocation limits"),
                QuestionOption(key="C", text="When all array elements are distinct prime numbers"),
                QuestionOption(key="D", text="When partitioning is executed concurrently across multiple threads")
            ],
            correct_option="A",
            expected_answer="A: When pivots consistently partition the array into 0 and n-1 subproblems",
            explanation="Highly unbalanced partitions create recursion trees of depth n with O(n) work per level, producing O(n^2) total operations.",
            source_chunks=[]
        ),
        # 7. Hash Table Collisions Short Answer
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic="Data Structures & Big-O Complexity",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Compare the memory and traversal characteristics of Separate Chaining versus Open Addressing (Linear Probing) in Hash Tables.",
            expected_answer="Chaining uses auxiliary linked lists or trees per bucket, avoiding primary clustering but incurring pointer overhead. Open addressing stores all entries within the contiguous array, improving cache locality but suffering from primary clustering when load factors are high.",
            explanation="Separate chaining trades pointer space for graceful degradation; open addressing optimizes cache efficiency at the cost of clustering risk.",
            rubric=[
                RubricItem(criterion="Separate Chaining Analysis", points=0.50, description="Explains auxiliary lists/pointers and lack of table overflow"),
                RubricItem(criterion="Open Addressing Analysis", points=0.50, description="Explains contiguous array storage, cache locality, and clustering")
            ],
            source_chunks=[]
        ),
        # 8. Master Theorem Derivation
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Algorithm Design & Edge Cases",
            difficulty=DifficultyLevel.HARD,
            question_text="Using the Master Theorem, derive the asymptotic runtime complexity of the recurrence relation: $T(n) = 2T(n/2) + O(n)$. Write down the values of $a, b, f(n)$, the critical exponent $\\log_b a$, and explain which case applies.",
            expected_answer="Parameters: a=2, b=2, f(n)=O(n). Critical exponent log_2(2) = 1. Since f(n) = Theta(n^1), this is Case 2: T(n) = Theta(n^(log_b a) * log n) = Theta(n log n).",
            explanation="Equal work across all log2(n) levels of the recursion tree yields Theta(n log n).",
            rubric=[
                RubricItem(criterion="Parameter Identification", points=0.35, description="Correctly states a=2, b=2, f(n)=O(n)"),
                RubricItem(criterion="Critical Exponent", points=0.35, description="Computes log_2(2) = 1 and compares with f(n)"),
                RubricItem(criterion="Case Conclusion", points=0.30, description="Concludes with Theta(n log n)")
            ],
            source_chunks=[]
        ),
        # 9. Softmax Invariance MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Activation Functions",
            difficulty=DifficultyLevel.HARD,
            question_text="Why is subtracting the maximum logit (c = max(z)) from all logits before computing Softmax mathematically invariant and numerically beneficial?",
            options=[
                QuestionOption(key="A", text="Softmax is shift-invariant (multiplying top & bottom by exp(-c)), and subtracting max(z) prevents floating-point overflow"),
                QuestionOption(key="B", text="It forces all probabilities to sum to 2.0 instead of 1.0 for higher precision"),
                QuestionOption(key="C", text="It inverts the matrix rank so the Hessian becomes strictly diagonal"),
                QuestionOption(key="D", text="It eliminates the need to compute derivatives during backpropagation")
            ],
            correct_option="A",
            expected_answer="A: Softmax is shift-invariant, and subtracting max(z) prevents floating-point overflow",
            explanation="exp(z_i - c) / sum(exp(z_j - c)) = (exp(z_i)/exp(c)) / (sum(exp(z_j))/exp(c)) = Softmax(z_i). The maximum exponent becomes exp(0) = 1, eliminating overflow.",
            source_chunks=[]
        ),
        # 10. Cross Entropy vs MSE MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Loss Functions & Optimization",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Why is Categorical Cross-Entropy preferred over Mean Squared Error (MSE) for multi-class classification networks with Softmax output?",
            options=[
                QuestionOption(key="A", text="Cross-Entropy gradient simplifies to (p_i - y_i), preventing vanishing gradients when predictions are confident but wrong"),
                QuestionOption(key="B", text="MSE requires calculating square roots which cannot be parallelized on GPUs"),
                QuestionOption(key="C", text="Cross-Entropy ensures the loss function is strictly non-convex for better exploration"),
                QuestionOption(key="D", text="MSE cannot accept one-hot encoded ground truth vectors")
            ],
            correct_option="A",
            expected_answer="A: Cross-Entropy gradient simplifies to (p_i - y_i), preventing vanishing gradients",
            explanation="Combining Softmax with Cross-Entropy cancels out the sigmoid/softmax derivative denominator, maintaining strong gradient signals even when predictions are far off.",
            source_chunks=[]
        ),
        # 11. Self-Attention Complexity MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Recurrent Neural Networks & Attention",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="What is the computational and memory time complexity of standard Scaled Dot-Product Attention with sequence length N and embedding dimension d?",
            options=[
                QuestionOption(key="A", text="O(N^2 * d) computation and O(N^2) memory for the attention matrix"),
                QuestionOption(key="B", text="O(N * d^2) computation and O(N) memory"),
                QuestionOption(key="C", text="O(N * log N * d) computation and O(d) memory"),
                QuestionOption(key="D", text="O(N^3 * d) computation and O(N * d) memory")
            ],
            correct_option="A",
            expected_answer="A: O(N^2 * d) computation and O(N^2) memory for the attention matrix",
            explanation="Computing Q * K^T requires multiplying (N x d) by (d x N), resulting in an (N x N) attention score matrix taking O(N^2) memory and O(N^2 * d) FLOPs.",
            source_chunks=[]
        ),
        # 12. Batch Normalization Short Answer
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic="Regularization & Dropout",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Explain how Batch Normalization transforms activations during training, and how running statistics (mean and variance) are used during test time.",
            expected_answer="During training, activations are zero-centered and scaled by mini-batch mean and variance, then shifted/scaled by learnable gamma and beta. Running exponential moving averages of mean and variance are tracked. During inference, these fixed population running statistics are applied to normalize each sample deterministically.",
            explanation="Batch Normalization stabilizes internal covariate shift during training and acts as a deterministic linear transform during inference.",
            rubric=[
                RubricItem(criterion="Training Normalization", points=0.50, description="Explains mini-batch mean, variance, and learnable gamma/beta parameters"),
                RubricItem(criterion="Inference Normalization", points=0.50, description="Explains usage of running moving averages for deterministic evaluation")
            ],
            source_chunks=[]
        ),
        # 13. Deadlock Conditions MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Computer Systems & Concurrency",
            difficulty=DifficultyLevel.MEDIUM,
            question_text="Which of the following is NOT one of Coffman's four necessary conditions for deadlock in concurrent systems?",
            options=[
                QuestionOption(key="A", text="Preemptive resource reclamation by the OS scheduler"),
                QuestionOption(key="B", text="Mutual Exclusion"),
                QuestionOption(key="C", text="Hold and Wait"),
                QuestionOption(key="D", text="Circular Wait")
            ],
            correct_option="A",
            expected_answer="A: Preemptive resource reclamation by the OS scheduler",
            explanation="The four Coffman conditions are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemption breaks deadlock!",
            source_chunks=[]
        ),
        # 14. Two Pointers Algorithm Short Answer
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic="Algorithm Design & Edge Cases",
            difficulty=DifficultyLevel.EASY,
            question_text="Describe how the Two-Pointer technique finds a pair of numbers with target sum T in a sorted array in O(n) time and O(1) space.",
            expected_answer="Initialize left pointer at index 0 and right pointer at index n-1. While left < right, calculate sum = arr[left] + arr[right]. If sum == T, return indices. If sum < T, increment left to increase total. If sum > T, decrement right to decrease total.",
            explanation="Monotonicity of sorted arrays allows two pointers to eliminate unviable pairs in linear time without additional memory.",
            rubric=[
                RubricItem(criterion="Pointer Setup & Loop Condition", points=0.40, description="Starts at opposing ends with left < right"),
                RubricItem(criterion="Directional Adjustments", points=0.60, description="Accurately increases left or decreases right based on comparison with T")
            ],
            source_chunks=[]
        ),
        # 15. B-Tree vs Binary Search Tree MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Database Systems & Transactions",
            difficulty=DifficultyLevel.HARD,
            question_text="Why do modern database storage engines (e.g. InnoDB, Postgres) utilize B+ Trees instead of balanced Binary Search Trees (like AVL or Red-Black trees) for on-disk indexing?",
            options=[
                QuestionOption(key="A", text="B+ Trees have massive fan-out (thousands of keys per node), keeping tree depth small (3-4 levels) to minimize disk I/O seeks"),
                QuestionOption(key="B", text="Binary search trees cannot store string-based primary keys"),
                QuestionOption(key="C", text="B+ Trees completely eliminate the need for ACID transaction write-ahead logs"),
                QuestionOption(key="D", text="Binary search trees require O(n^2) space on solid-state drives")
            ],
            correct_option="A",
            expected_answer="A: B+ Trees have massive fan-out, minimizing disk I/O seeks",
            explanation="Disk and block storage reads pages (4KB-16KB). High fan-out B+ trees fit hundreds of keys in a single disk page, keeping tree height extremely shallow (3-4 seeks for millions of records).",
            source_chunks=[]
        ),
        # 16. Skip Connections / ResNet Derivation
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Convolutional Neural Networks",
            difficulty=DifficultyLevel.HARD,
            question_text="In a Residual Network (ResNet), the layer mapping is formulated as $y = \\mathcal{F}(x, \\{W_i\\}) + x$. Differentiate the loss $\\mathcal{L}$ with respect to layer input $x$ using the chain rule, and explain why gradients flow unimpeded to early layers.",
            expected_answer="dL/dx = (dL/dy) * (d(F + x)/dx) = (dL/dy) * ((dF/dx) + 1) = (dL/dy)*(dF/dx) + (dL/dy). The '+ 1' term ensures that even if the weight pathway gradient (dF/dx) approaches zero, the gradient dL/dy propagates directly backward without decaying.",
            explanation="The residual identity shortcut provides a clean gradient highway that completely prevents vanishing gradients throughout very deep networks.",
            rubric=[
                RubricItem(criterion="Chain Rule Application", points=0.40, description="Differentiates F(x) + x with respect to x"),
                RubricItem(criterion="Additive Identity Term (+1)", points=0.35, description="Identifies that derivative includes +1 term"),
                RubricItem(criterion="Vanishing Gradient Resolution", points=0.25, description="Explains why error signal passes cleanly without multiplying by small weights")
            ],
            source_chunks=[]
        ),
        # 17. Learning Rate Decay MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Loss Functions & Optimization",
            difficulty=DifficultyLevel.EASY,
            question_text="What is the primary benefit of applying Cosine Annealing learning rate schedules compared to a static fixed learning rate?",
            options=[
                QuestionOption(key="A", text="Starts with high learning rate for rapid initial exploration, then smoothly decays to near zero to settle precisely into sharp or flat local minima"),
                QuestionOption(key="B", text="It converts non-convex loss surfaces into convex quadratic parabolas"),
                QuestionOption(key="C", text="It eliminates the need to compute gradients using backpropagation"),
                QuestionOption(key="D", text="It guarantees zero validation error on any dataset")
            ],
            correct_option="A",
            expected_answer="A: Starts with high learning rate for rapid initial exploration, then smoothly decays to near zero",
            explanation="Cosine annealing allows large exploratory updates early on and fine-grained convergence near training completion.",
            source_chunks=[]
        ),
        # 18. ACID Properties Short Answer
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.SHORT_ANSWER,
            topic="Database Systems & Transactions",
            difficulty=DifficultyLevel.EASY,
            question_text="Define the four ACID properties in database transaction management and give a brief 1-sentence explanation for each.",
            expected_answer="Atomicity: All operations in a transaction succeed or all roll back (all-or-nothing). Consistency: Database transitions between valid states preserving schema constraints. Isolation: Concurrent transactions execute without interfering with one another. Durability: Committed updates are permanently preserved on non-volatile storage even across crashes.",
            explanation="ACID guarantees reliable processing of database transactions under concurrency and hardware failure.",
            rubric=[
                RubricItem(criterion="Atomicity & Consistency", points=0.50, description="Defines all-or-nothing execution and invariant integrity"),
                RubricItem(criterion="Isolation & Durability", points=0.50, description="Defines concurrency isolation levels and crash persistence")
            ],
            source_chunks=[]
        ),
        # 19. He vs Xavier Initialization MCQ
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.MCQ,
            topic="Backpropagation & Gradients",
            difficulty=DifficultyLevel.HARD,
            question_text="Why is He (Kaiming) weight initialization (variance = 2 / n_in) preferred over Xavier/Glorot initialization (variance = 2 / (n_in + n_out)) when training networks with ReLU activations?",
            options=[
                QuestionOption(key="A", text="ReLU sets negative inputs to zero, nullifying half the neuron activations. He initialization doubles the variance (factor of 2) to maintain constant activation variance across layers"),
                QuestionOption(key="B", text="He initialization forces all initial weights to strictly positive integer values"),
                QuestionOption(key="C", text="Xavier initialization causes floating-point subnormal numbers under IEEE 754"),
                QuestionOption(key="D", text="He initialization computes inverse square roots at runtime using fast bit-shift approximations")
            ],
            correct_option="A",
            expected_answer="A: ReLU sets negative inputs to zero, so doubling variance maintains constant variance",
            explanation="Because ReLU zeroes out approximately 50% of activations, the variance of the output drops by half. Multiplying variance by 2 compensates for this reduction.",
            source_chunks=[]
        ),
        # 20. Dynamic Programming Knapsack Derivation
        QuizQuestion(
            id=f"q_{uuid.uuid4().hex[:6]}",
            question_type=QuestionType.HANDWRITTEN_DERIVATION,
            topic="Algorithm Design & Edge Cases",
            difficulty=DifficultyLevel.HARD,
            question_text="State the optimal substructure and write down the complete Dynamic Programming recurrence relation for the 0/1 Knapsack problem with weights $w_i$, values $v_i$, and capacity $W$. State time and space complexity.",
            expected_answer="DP[i][w] = max value using subset of first i items with capacity w. Recurrence: if w_i > w: DP[i][w] = DP[i-1][w]. Else: DP[i][w] = max(DP[i-1][w], DP[i-1][w - w_i] + v_i). Base case: DP[0][w] = 0, DP[i][0] = 0. Time complexity: O(N*W), Space complexity: O(W) with 1D rolling array optimization.",
            explanation="The decision to include or exclude item i gives the optimal substructure of 0/1 knapsack.",
            rubric=[
                RubricItem(criterion="Subproblem Definition", points=0.35, description="Defines DP state parameters clearly"),
                RubricItem(criterion="Recurrence Relation", points=0.40, description="Formulates max(exclude, include) transition correctly"),
                RubricItem(criterion="Complexity Analysis", points=0.25, description="States O(N*W) time and O(W) space")
            ],
            source_chunks=[]
        )
    ]

    # Filter by handwriting if requested
    if not request.include_handwritten:
        filtered = []
        for q in raw_pool:
            if q.question_type == QuestionType.HANDWRITTEN_DERIVATION:
                filtered.append(QuizQuestion(
                    id=q.id,
                    question_type=QuestionType.SHORT_ANSWER,
                    topic=q.topic,
                    difficulty=q.difficulty,
                    question_text=q.question_text,
                    expected_answer=q.expected_answer,
                    explanation=q.explanation,
                    rubric=q.rubric,
                    source_chunks=[]
                ))
            else:
                filtered.append(q)
        raw_pool = filtered

    # Randomly shuffle the pool so every call produces different question ordering and selections
    pool_copy = list(raw_pool)
    random.shuffle(pool_copy)

    # For MCQs, also randomly shuffle options so correct option is varied among A, B, C, D
    for q in pool_copy:
        if q.question_type == QuestionType.MCQ and q.options:
            correct_opt = next((o for o in q.options if o.key == q.correct_option), None)
            correct_text = correct_opt.text if correct_opt else q.options[0].text
            opts_texts = [o.text for o in q.options]
            random.shuffle(opts_texts)
            keys = ["A", "B", "C", "D"]
            new_options = [QuestionOption(key=keys[i], text=opts_texts[i]) for i in range(len(opts_texts))]
            new_correct_key = keys[opts_texts.index(correct_text)]
            q.options = new_options
            q.correct_option = new_correct_key
            q.expected_answer = f"{new_correct_key}: {correct_text}"

    # If requested more than available, cycle with unique IDs
    result = []
    needed = max(1, request.num_questions)
    while len(result) < needed:
        for q in pool_copy:
            if len(result) >= needed:
                break
            # Assign unique ID
            new_q = QuizQuestion(
                id=f"q_{uuid.uuid4().hex[:6]}",
                question_type=q.question_type,
                topic=q.topic,
                difficulty=q.difficulty,
                question_text=q.question_text,
                options=q.options,
                correct_option=q.correct_option,
                expected_answer=q.expected_answer,
                explanation=q.explanation,
                rubric=q.rubric,
                source_chunks=q.source_chunks
            )
            result.append(new_q)

    return result[:needed]

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
