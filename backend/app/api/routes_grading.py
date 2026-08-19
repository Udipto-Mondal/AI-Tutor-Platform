"""
Multi-Modal Grading & Handwritten Answer Evaluation API Routes.
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    QuizSubmissionRequest, QuizGradeReport, QuestionGradeResult, QuestionType, UserQuestionAnswer
)
from app.services.vision.ocr_grader import grade_handwritten_submission, grade_mcq_or_short_answer
from app.services.ml.knowledge_tracing import knowledge_tracer
from app.db.storage import storage

router = APIRouter(prefix="/grading", tags=["Grading & Vision Evaluation"])

class DirectHandwrittenGradeRequest(BaseModel):
    image_base64: str
    question_text: str
    topic: str = "Backpropagation & Gradients"
    expected_answer: str = "dL/dw_ij = (dL/dz_j) * (dz_j/dw_ij) = delta_j * a_i^(l-1)"
    fallback_text: Optional[str] = None

@router.post("/submit", response_model=QuizGradeReport)
async def submit_and_grade_quiz(submission: QuizSubmissionRequest):
    quiz = storage.get_quiz(submission.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail=f"Quiz {submission.quiz_id} not found")
        
    question_map = {q.id: q for q in quiz.questions}
    results: List[QuestionGradeResult] = []
    total_earned = 0.0
    max_possible = float(len(quiz.questions))
    total_time = 0.0
    weak_topics = []
    
    for ans in submission.answers:
        q = question_map.get(ans.question_id)
        if not q:
            continue
            
        total_time += ans.response_time_seconds
        
        if q.question_type == QuestionType.HANDWRITTEN_DERIVATION:
            if ans.handwritten_image_base64:
                res = grade_handwritten_submission(
                    image_base64=ans.handwritten_image_base64,
                    question=q,
                    fallback_text=ans.text_answer
                )
            else:
                res = grade_mcq_or_short_answer(q, ans.selected_option, ans.text_answer)
        else:
            res = grade_mcq_or_short_answer(q, ans.selected_option, ans.text_answer)
            
        results.append(res)
        total_earned += res.score
        if not res.is_correct or res.score < 0.6:
            weak_topics.append(q.topic)
            
    pct = round((total_earned / max_possible * 100.0) if max_possible > 0 else 0.0, 1)
    
    report = QuizGradeReport(
        submission_id=f"sub_{uuid.uuid4().hex[:8]}",
        quiz_id=submission.quiz_id,
        student_id=submission.student_id,
        graded_at=datetime.now(timezone.utc),
        overall_score=round(total_earned, 2),
        max_score=max_possible,
        percentage=pct,
        total_time_seconds=round(total_time, 1),
        question_results=results,
        weak_topics_flagged=list(set(weak_topics)),
        summary_feedback=f"Scored {total_earned:.1f}/{max_possible:.0f} ({pct}%). " + 
                         (f"Strong performance across concepts!" if pct >= 80 else f"Focus revision on flagged concepts: {', '.join(set(weak_topics))}.")
    )
    
    # Save submission report and update knowledge tracking model
    storage.save_submission(report)
    current_profile = storage.get_student_mastery(submission.student_id)
    knowledge_tracer.evaluate_submission_and_update_profile(report, current_profile)
    
    return report

@router.post("/grade-handwritten-direct", response_model=QuestionGradeResult)
async def grade_handwritten_direct(req: DirectHandwrittenGradeRequest):
    """Direct testing endpoint for handwriting canvas / photo upload."""
    from app.models.schemas import QuizQuestion, RubricItem, DifficultyLevel
    dummy_q = QuizQuestion(
        id=f"q_{uuid.uuid4().hex[:6]}",
        question_type=QuestionType.HANDWRITTEN_DERIVATION,
        topic=req.topic,
        difficulty=DifficultyLevel.MEDIUM,
        question_text=req.question_text,
        expected_answer=req.expected_answer,
        explanation="Step-by-step derivation check.",
        rubric=[
            RubricItem(criterion="Mathematical Formulation", points=0.4, description="Correct equations"),
            RubricItem(criterion="Step Accuracy", points=0.3, description="Correct substitutions"),
            RubricItem(criterion="Final Expression", points=0.3, description="Correct conclusion")
        ]
    )
    return grade_handwritten_submission(req.image_base64, dummy_q, req.fallback_text)
