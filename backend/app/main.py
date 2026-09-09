import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure backend root is always in Python module search path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.routes_documents import router as doc_router, load_sample_materials
from app.api.routes_quiz import router as quiz_router
from app.api.routes_grading import router as grading_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_study_plan import router as study_plan_router
from app.api.routes_tutor import router as tutor_router
from app.api.routes_mlops import router as mlops_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load sample materials into RAG store
    print(f"[{settings.PROJECT_NAME}] Starting up...")
    try:
        await load_sample_materials()
        print(f"[{settings.PROJECT_NAME}] Sample materials loaded successfully.")
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] Note: Sample materials auto-load notice: {e}")
    yield
    print(f"[{settings.PROJECT_NAME}] Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="End-to-End AI Tutoring Platform with RAG, Vision Grading, Knowledge Tracing & MLflow",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount models / static artifacts if present
if settings.MODELS_DIR.exists():
    app.mount("/static/models", StaticFiles(directory=str(settings.MODELS_DIR)), name="models")

# Include Routers
app.include_router(doc_router, prefix=settings.API_V1_PREFIX)
app.include_router(quiz_router, prefix=settings.API_V1_PREFIX)
app.include_router(grading_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(study_plan_router, prefix=settings.API_V1_PREFIX)
app.include_router(tutor_router, prefix=settings.API_V1_PREFIX)
app.include_router(mlops_router, prefix=settings.API_V1_PREFIX)

@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "AI Tutor Platform — Backend API",
        "frontend_ui": "http://localhost:5173",
        "api_docs": "http://127.0.0.1:8000/docs",
        "health": "http://127.0.0.1:8000/health"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
