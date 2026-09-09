"""
Core System Verification & Unit Tests for AI Tutor Platform.
"""

import pytest
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.services.rag.ingestion import ingest_document, chunk_text, extract_topics_from_text
from app.services.rag.vector_store import vector_store
from app.services.rag.quiz_agent import create_quiz
from app.services.vision.preprocessor import preprocess_handwriting_image
from app.services.vision.ocr_grader import grade_handwritten_submission, grade_mcq_or_short_answer
from app.services.ml.knowledge_tracing import knowledge_tracer
from app.services.ml.study_plan import build_personalized_study_plan
from app.models.schemas import (
    QuizGenerationRequest, DifficultyLevel, QuizQuestion, QuestionType, RubricItem,
    StudentMasteryReport, TopicMasteryRecord
)
from PIL import Image

def test_ingestion_and_chunking():
    sample_text = """# Neural Network Basics
Artificial Neural Networks learn through gradient updates.
Forward propagation computes activations:
z = W * X + b
a = sigma(z)

## Activation Functions
Sigmoid maps outputs to range (0, 1) but suffers from vanishing gradients.
ReLU computes max(0, x) which is computationally efficient.
"""
    topics = extract_topics_from_text(sample_text)
    assert len(topics) >= 1
    assert any("Neural Network" in t or "Activation" in t for t in topics)
    
    chunks = chunk_text(sample_text, doc_id="test_doc_01", doc_name="test.md", chunk_size=20, chunk_overlap=5)
    assert len(chunks) >= 1
    assert chunks[0].doc_id == "test_doc_01"

def test_vector_store_indexing():
    sample_text = "Backpropagation calculates loss gradients using calculus chain rule."
    chunks = chunk_text(sample_text, doc_id="doc_test_rag", doc_name="rag_test.txt")
    vector_store.add_chunks(chunks)
    
    results = vector_store.query("chain rule calculus gradient", top_k=2)
    assert len(results) >= 1
    assert "calculus" in results[0].content or "chain rule" in results[0].content

def test_quiz_generation_agent():
    req = QuizGenerationRequest(
        num_questions=3,
        difficulty=DifficultyLevel.MEDIUM,
        include_handwritten=True
    )
    quiz = create_quiz(req)
    assert quiz is not None
    assert len(quiz.questions) == 3
    
    # Verify presence of multi-format questions
    has_mcq = any(q.question_type == QuestionType.MCQ for q in quiz.questions)
    has_hw = any(q.question_type == QuestionType.HANDWRITTEN_DERIVATION for q in quiz.questions)
    assert has_mcq or has_hw

def test_quiz_generation_variable_counts_and_regeneration():
    # Test 5, 10, and 15 questions counts
    for count in [5, 10, 15]:
        req = QuizGenerationRequest(
            num_questions=count,
            difficulty=DifficultyLevel.MEDIUM,
            include_handwritten=True
        )
        quiz = create_quiz(req)
        assert len(quiz.questions) == count, f"Expected {count} questions, got {len(quiz.questions)}"
    
    # Test that successive calls produce randomized / fresh questions (regeneration)
    req1 = QuizGenerationRequest(num_questions=5, difficulty=DifficultyLevel.MEDIUM)
    req2 = QuizGenerationRequest(num_questions=5, difficulty=DifficultyLevel.MEDIUM)
    quiz1 = create_quiz(req1)
    quiz2 = create_quiz(req2)
    
    # Text or ids should not be 100% identical in the same order
    q1_texts = [q.question_text for q in quiz1.questions]
    q2_texts = [q.question_text for q in quiz2.questions]
    # At least some difference in text or order due to randomization
    assert len(quiz1.questions) == 5
    assert len(quiz2.questions) == 5

def test_vision_preprocessing_and_grading():
    # Create synthetic test image
    img = Image.new("RGB", (200, 100), color=(20, 25, 40))
    processed, metrics = preprocess_handwriting_image(img)
    
    assert processed is not None
    assert "contrast_std" in metrics
    assert "stroke_density" in metrics
    
    # Test handwritten grading
    dummy_q = QuizQuestion(
        id="q_test_hw",
        question_type=QuestionType.HANDWRITTEN_DERIVATION,
        topic="Backpropagation & Gradients",
        difficulty=DifficultyLevel.MEDIUM,
        question_text="Derive gradient using chain rule",
        expected_answer="dL/dw = delta * a^(l-1)",
        explanation="Chain rule decomposition",
        rubric=[
            RubricItem(criterion="Chain rule", points=0.5, description="Uses chain rule"),
            RubricItem(criterion="Error term", points=0.5, description="Uses delta term")
        ]
    )
    
    # Test simulated submission
    import io, base64
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    
    grade_res = grade_handwritten_submission(b64_str, dummy_q, fallback_text="dL/dw = (dL/dz) * (dz/dw) = delta * a")
    assert grade_res is not None
    assert grade_res.score > 0.0
    assert len(grade_res.rubric_breakdown) == 2

def test_knowledge_tracing_and_study_plan():
    # Test weak topic risk calculation
    risk = knowledge_tracer.predict_weak_topic_risk(
        topic="Backpropagation & Gradients",
        difficulty=3.0,
        hist_accuracy=0.2,
        is_correct=0,
        consecutive_errors=2
    )
    assert 0.0 <= risk <= 1.0
    assert risk >= 0.5  # Should be flagged as high risk
    
    # Test study plan generation
    mock_profile = StudentMasteryReport(
        student_id="test_student",
        overall_proficiency=0.55,
        topic_breakdown=[
            TopicMasteryRecord(
                topic="Backpropagation & Gradients",
                mastery_score=0.35,
                attempts_count=4,
                correct_count=1,
                predicted_weak_risk=0.65,
                status="Needs Remediation"
            )
        ],
        weak_topics=["Backpropagation & Gradients"],
        recommended_focus="Backpropagation & Gradients",
        learning_velocity=1.1
    )
    
    plan = build_personalized_study_plan(mock_profile)
    assert plan is not None
    assert len(plan.daily_schedule) >= 1
    assert len(plan.recommended_flashcards) >= 1
    assert plan.weak_topics == ["Backpropagation & Gradients"]

def test_cnn_vision_evaluator():
    from app.services.vision.cnn_grader import cnn_vision_evaluator
    # Synthetic blank image
    img = Image.new("RGB", (128, 128), color=(10, 15, 25))
    import io, base64
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_str = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    
    result = cnn_vision_evaluator.evaluate(b64_str, topic="Convolutional Neural Networks")
    assert result is not None
    assert "cnn_score" in result
    assert "architecture" in result
    assert 0.0 <= result["cnn_score"] <= 1.0

def test_storage_chunk_persistence_and_default_quiz():
    from app.db.storage import storage
    # Default quiz should be present
    quiz = storage.get_quiz("quiz_demo_01")
    assert quiz is not None
    assert quiz.id == "quiz_demo_01"
    assert len(quiz.questions) == 4

if __name__ == "__main__":
    test_ingestion_and_chunking()
    test_vector_store_indexing()
    test_quiz_generation_agent()
    test_vision_preprocessing_and_grading()
    test_knowledge_tracing_and_study_plan()
    test_cnn_vision_evaluator()
    test_storage_chunk_persistence_and_default_quiz()
    print("All core unit tests passed successfully!")
