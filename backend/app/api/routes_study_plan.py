"""
Personalized Adaptive Study Plan API Routes.
"""

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from app.models.schemas import PersonalizedStudyPlan
from app.services.ml.study_plan import build_personalized_study_plan
from app.db.storage import storage

router = APIRouter(prefix="/study-plan", tags=["Adaptive Study Plan"])

class ToggleTaskRequest(BaseModel):
    student_id: str
    task_id: str
    completed: bool

@router.post("/generate", response_model=PersonalizedStudyPlan)
async def generate_study_plan(student_id: str = "default_student"):
    profile = storage.get_student_mastery(student_id)
    plan = build_personalized_study_plan(profile)
    storage.save_study_plan(plan)
    return plan

@router.get("/{student_id}", response_model=PersonalizedStudyPlan)
async def get_study_plan(student_id: str = "default_student"):
    plan = storage.get_study_plan(student_id)
    if not plan:
        # Auto-generate if not yet created
        profile = storage.get_student_mastery(student_id)
        plan = build_personalized_study_plan(profile)
        storage.save_study_plan(plan)
    return plan

@router.post("/task/toggle")
async def toggle_task_completion(req: ToggleTaskRequest):
    plan = storage.get_study_plan(req.student_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    for task in plan.daily_schedule:
        if task.id == req.task_id:
            task.completed = req.completed
            storage.save_study_plan(plan)
            return {"success": True, "task_id": req.task_id, "completed": req.completed}
    raise HTTPException(status_code=404, detail="Task not found in plan")
