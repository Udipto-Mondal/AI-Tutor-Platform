"""
Socratic Interactive AI Tutor API Routes.
"""

from fastapi import APIRouter
from app.models.schemas import SocraticTutorRequest, SocraticTutorResponse
from app.services.agent.socratic_tutor import run_socratic_tutor

router = APIRouter(prefix="/tutor", tags=["Socratic AI Tutor Agent"])

@router.post("/chat", response_model=SocraticTutorResponse)
async def chat_with_tutor(request: SocraticTutorRequest):
    return run_socratic_tutor(request)
