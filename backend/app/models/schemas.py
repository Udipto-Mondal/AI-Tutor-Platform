from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class QuestionType(str, Enum):
    MCQ = "mcq"
    SHORT_ANSWER = "short_answer"
    HANDWRITTEN_DERIVATION = "handwritten_derivation"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

# --- Document & Ingestion Models ---
class DocumentChunk(BaseModel):
    id: str
    doc_id: str
    doc_name: str
    chunk_index: int
    content: str
    metadata: Dict[str, Any] = {}

class DocumentInfo(BaseModel):
    id: str
    filename: str
    filepath: str
    file_type: str
    size_bytes: int
    uploaded_at: datetime
    num_chunks: int
    topics_covered: List[str] = []

class IngestionResponse(BaseModel):
    success: bool
    document: DocumentInfo
    message: str

# --- Quiz Generation Models ---
class QuestionOption(BaseModel):
    key: str  # A, B, C, D
    text: str

class RubricItem(BaseModel):
    criterion: str
    points: float
    description: str

class QuizQuestion(BaseModel):
    id: str
    question_type: QuestionType
    topic: str
    difficulty: DifficultyLevel
    question_text: str
    options: Optional[List[QuestionOption]] = None  # For MCQ
    correct_option: Optional[str] = None  # For MCQ
    expected_answer: str
    explanation: str
    rubric: Optional[List[RubricItem]] = None  # For Short answer & Handwritten
    source_chunks: List[str] = []

class Quiz(BaseModel):
    id: str
    title: str
    created_at: datetime
    doc_ids: List[str]
    topics: List[str]
    questions: List[QuizQuestion]
    time_limit_minutes: int = 15

class QuizGenerationRequest(BaseModel):
    doc_ids: Optional[List[str]] = None
    topics: Optional[List[str]] = None
    num_questions: int = 5
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    include_handwritten: bool = True

# --- Submission & Grading Models ---
class UserQuestionAnswer(BaseModel):
    question_id: str
    selected_option: Optional[str] = None
    text_answer: Optional[str] = None
    handwritten_image_base64: Optional[str] = None
    response_time_seconds: float = 30.0

class QuizSubmissionRequest(BaseModel):
    quiz_id: str
    student_id: str = "default_student"
    answers: List[UserQuestionAnswer]

class QuestionGradeResult(BaseModel):
    question_id: str
    question_type: QuestionType
    topic: str
    is_correct: bool
    score: float  # 0.0 to 1.0 (or normalized)
    max_score: float = 1.0
    extracted_text: Optional[str] = None  # OCR transcription if handwritten
    feedback: str
    rubric_breakdown: Optional[List[Dict[str, Any]]] = None
    misconceptions_detected: List[str] = []
    remedial_tip: Optional[str] = None

class QuizGradeReport(BaseModel):
    submission_id: str
    quiz_id: str
    student_id: str
    graded_at: datetime
    overall_score: float
    max_score: float
    percentage: float
    total_time_seconds: float
    question_results: List[QuestionGradeResult]
    weak_topics_flagged: List[str] = []
    summary_feedback: str

# --- Knowledge Tracing & Analytics Models ---
class TopicMasteryRecord(BaseModel):
    topic: str
    mastery_score: float  # 0.0 to 1.0
    attempts_count: int
    correct_count: int
    predicted_weak_risk: float  # probability of failure
    status: str  # "Mastered", "In Progress", "Needs Review"
    last_reviewed: Optional[datetime] = None

class StudentMasteryReport(BaseModel):
    student_id: str
    overall_proficiency: float
    topic_breakdown: List[TopicMasteryRecord]
    weak_topics: List[str]
    recommended_focus: str
    learning_velocity: float

# --- Study Plan & Remediation Models ---
class Flashcard(BaseModel):
    id: str
    topic: str
    front_prompt: str
    back_solution: str
    difficulty: str

class StudyTask(BaseModel):
    id: str
    day_number: int
    topic: str
    task_type: str  # "concept_review", "handwritten_practice", "quiz"
    title: str
    description: str
    duration_minutes: int
    completed: bool = False

class PersonalizedStudyPlan(BaseModel):
    plan_id: str
    student_id: str
    generated_at: datetime
    weak_topics: List[str]
    daily_schedule: List[StudyTask]
    recommended_flashcards: List[Flashcard]
    encouragement_note: str

# --- Socratic Tutor Models ---
class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str
    timestamp: Optional[datetime] = None

class SocraticTutorRequest(BaseModel):
    student_id: str = "default_student"
    message: str
    current_topic: Optional[str] = None
    context_chunks: Optional[List[str]] = None
    chat_history: List[ChatMessage] = []

class SocraticTutorResponse(BaseModel):
    reply: str
    hints_provided: List[str] = []
    citations: List[str] = []
    follow_up_question: Optional[str] = None
