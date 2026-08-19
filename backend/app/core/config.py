import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")
    
    PROJECT_NAME: str = "End-to-End AI Tutor Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Storage Paths
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = BASE_DIR / "data" / "uploads"
    SAMPLE_MATERIALS_DIR: Path = BASE_DIR / "data" / "sample_materials"
    MODELS_DIR: Path = BASE_DIR / "data" / "models"
    CHROMA_DIR: Path = BASE_DIR / "data" / "chroma_db"
    MLRUNS_DIR: Path = BASE_DIR / "mlruns"
    
    # LLM & AI Keys (Optional: fallbacks provided)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True

settings = Settings()

# Ensure critical directories exist
for path in [settings.DATA_DIR, settings.UPLOAD_DIR, settings.SAMPLE_MATERIALS_DIR, 
             settings.MODELS_DIR, settings.CHROMA_DIR, settings.MLRUNS_DIR]:
    path.mkdir(parents=True, exist_ok=True)
