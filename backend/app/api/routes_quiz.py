"""
Quiz Generation & Management API Routes.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import Quiz, QuizGenerationRequest
from app.services.rag.quiz_agent import create_quiz
from app.db.storage import storage

router = APIRouter(prefix="/quiz", tags=["Quiz Generation Agent"])

@router.post("/generate", response_model=Quiz)
async def generate_quiz(request: QuizGenerationRequest):
    try:
        quiz = create_quiz(request)
        storage.save_quiz(quiz)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

@router.get("/generate", response_model=Quiz)
async def generate_quiz_get(
    num_questions: int = 5,
    difficulty: str = "medium",
    include_handwritten: bool = True,
    doc_id: str = None
):
    from app.models.schemas import DifficultyLevel
    try:
        diff_enum = DifficultyLevel(difficulty.lower()) if difficulty.lower() in [d.value for d in DifficultyLevel] else DifficultyLevel.MEDIUM
    except Exception:
        diff_enum = DifficultyLevel.MEDIUM
        
    req = QuizGenerationRequest(
        doc_ids=[doc_id] if doc_id else None,
        num_questions=num_questions,
        difficulty=diff_enum,
        include_handwritten=include_handwritten
    )
    quiz = create_quiz(req)
    storage.save_quiz(quiz)
    return quiz

@router.get("/{quiz_id}", response_model=Quiz)
async def get_quiz(quiz_id: str):
    quiz = storage.get_quiz(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz
