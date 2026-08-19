"""
Learning Analytics & Student Knowledge Tracing API Routes.
"""

from fastapi import APIRouter
from app.models.schemas import StudentMasteryReport
from app.db.storage import storage

router = APIRouter(prefix="/analytics", tags=["Learning Analytics & Knowledge Tracing"])

@router.get("/mastery/{student_id}", response_model=StudentMasteryReport)
async def get_student_mastery_report(student_id: str = "default_student"):
    return storage.get_student_mastery(student_id)

@router.get("/weak-topics")
async def get_weak_topics(student_id: str = "default_student"):
    report = storage.get_student_mastery(student_id)
    return {
        "student_id": student_id,
        "weak_topics": report.weak_topics,
        "recommended_focus": report.recommended_focus,
        "proficiency": report.overall_proficiency
    }
