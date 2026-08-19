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
    """Deterministic, high-quality domain quiz generator covering deep learning and algorithms."""
    questions = []
    
    # 1. Backpropagation / Calculus Derivation Question (Handwritten format)
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
        
    # 2. Activation Functions (MCQ)
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
    
    # 3. Convolutional Layer Calculation (Handwritten / Math)
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.HANDWRITTEN_DERIVATION,
        topic="Convolutional Neural Networks",
        difficulty=request.difficulty,
        question_text="Given an input image of size $32 \\times 32$, a filter/kernel of size $5 \\times 5$, padding $P = 2$, and stride $S = 1$, calculate the output spatial dimension $O$. Show your formula and calculation.",
        expected_answer="Formula: O = ((W - K + 2P) / S) + 1. Calculation: O = ((32 - 5 + 2*2) / 1) + 1 = ((32 - 5 + 4) / 1) + 1 = 31 + 1 = 32. Output dimension is 32x32.",
        explanation="The formula O = ((W - K + 2P)/S) + 1 gives exactly 32, preserving the spatial dimensions because 'same' padding (P = (K-1)/2 = 2) was applied.",
        rubric=[
            RubricItem(criterion="Formula Recall", points=0.30, description="Correctly states O = (W - K + 2P)/S + 1"),
            RubricItem(criterion="Substitution of Values", points=0.40, description="Substitutes W=32, K=5, P=2, S=1 accurately"),
            RubricItem(criterion="Final Correct Dimension", points=0.30, description="Arrives at 32x32")
        ],
        source_chunks=[]
    ))
    
    # 4. Optimizers & Adam (Short Answer)
    questions.append(QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.SHORT_ANSWER,
        topic="Loss Functions & Optimization",
        difficulty=request.difficulty,
        question_text="How does the Adam optimizer combine the principles of Momentum and RMSprop?",
        expected_answer="Adam combines Momentum by computing an exponentially decaying average of past gradients (first moment, estimating mean) with RMSprop by computing an exponentially decaying average of past squared gradients (second moment, estimating uncentered variance), along with bias correction terms.",
        explanation="Adam tracks both the directional velocity (first moment) and the per-parameter scale (second moment) to achieve adaptive learning rates.",
        rubric=[
            RubricItem(criterion="Momentum Explanation", points=0.5, description="Mentions first moment / exponentially weighted moving average of gradients"),
            RubricItem(criterion="RMSprop Explanation", points=0.5, description="Mentions second moment / squared gradients for adaptive scaling")
        ],
        source_chunks=[]
    ))
    
    # 5. Regularization (MCQ)
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
        explanation="During training, activations are randomly masked with probability p. At test time, the full network is used with weights scaled by (1-p) (or inverted dropout applied during training) to approximate an ensemble average.",
        source_chunks=[]
    ))
    
    # Slice to desired num_questions
    return questions[:request.num_questions]

def create_quiz(request: QuizGenerationRequest) -> Quiz:
    # 1. Retrieve relevant chunks
    chunks = []
    if request.topics:
        for topic in request.topics:
            chunks.extend(vector_store.query(topic, top_k=2, doc_ids=request.doc_ids))
    elif request.doc_ids:
        chunks = vector_store.query("deep learning neural networks algorithms", top_k=6, doc_ids=request.doc_ids)
    else:
        chunks = vector_store.query("neural networks machine learning algorithms", top_k=6)
        
    context_text = "\n\n".join([c.content for c in chunks])
    
    # 2. Try LLM generation first, then fall back to heuristic generator
    generated_questions = generate_quiz_with_llm(context_text, request)
    if not generated_questions:
        generated_questions = generate_heuristic_quiz(context_text, request)
        
    topics_list = list(set([q.topic for q in generated_questions]))
    quiz_id = f"quiz_{uuid.uuid4().hex[:8]}"
    
    return Quiz(
        id=quiz_id,
        title=f"Adaptive AI Assessment: {topics_list[0] if topics_list else 'Core Concepts'}",
        created_at=datetime.now(timezone.utc),
        doc_ids=request.doc_ids or [],
        topics=topics_list,
        questions=generated_questions,
        time_limit_minutes=max(5, len(generated_questions) * 3)
    )
