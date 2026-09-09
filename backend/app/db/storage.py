"""
Persistence and Data Access Layer for AI Tutor Platform.
Maintains in-memory records and persists state to local JSON/SQLite files.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.models.schemas import (
    DocumentInfo, DocumentChunk, Quiz, QuizGradeReport,
    TopicMasteryRecord, StudentMasteryReport, PersonalizedStudyPlan
)

class DataStorage:
    def __init__(self):
        self.storage_dir = settings.DATA_DIR / "store"
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        self.docs_file = self.storage_dir / "documents.json"
        self.chunks_file = self.storage_dir / "chunks.json"
        self.quizzes_file = self.storage_dir / "quizzes.json"
        self.submissions_file = self.storage_dir / "submissions.json"
        self.mastery_file = self.storage_dir / "mastery.json"
        self.study_plans_file = self.storage_dir / "study_plans.json"
        
        self.documents: Dict[str, DocumentInfo] = {}
        self.chunks: Dict[str, DocumentChunk] = {}
        self.quizzes: Dict[str, Quiz] = {}
        self.submissions: Dict[str, QuizGradeReport] = {}
        self.student_mastery: Dict[str, Dict[str, TopicMasteryRecord]] = {}
        self.study_plans: Dict[str, PersonalizedStudyPlan] = {}
        
        self._load_from_disk()
        self._seed_default_quiz_if_needed()

    def _load_from_disk(self):
        try:
            if self.docs_file.exists():
                with open(self.docs_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        v["uploaded_at"] = datetime.fromisoformat(v["uploaded_at"])
                        self.documents[k] = DocumentInfo(**v)
                        
            if self.chunks_file.exists():
                with open(self.chunks_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self.chunks[k] = DocumentChunk(**v)

            if self.quizzes_file.exists():
                with open(self.quizzes_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        v["created_at"] = datetime.fromisoformat(v["created_at"])
                        self.quizzes[k] = Quiz(**v)
                        
            if self.submissions_file.exists():
                with open(self.submissions_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        v["graded_at"] = datetime.fromisoformat(v["graded_at"])
                        self.submissions[k] = QuizGradeReport(**v)

            if self.mastery_file.exists():
                with open(self.mastery_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for s_id, topics in data.items():
                        self.student_mastery[s_id] = {}
                        for t_name, rec in topics.items():
                            rec["last_reviewed"] = datetime.fromisoformat(rec["last_reviewed"])
                            self.student_mastery[s_id][t_name] = TopicMasteryRecord(**rec)

            if self.study_plans_file.exists():
                with open(self.study_plans_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for s_id, plan in data.items():
                        plan["generated_at"] = datetime.fromisoformat(plan["generated_at"])
                        self.study_plans[s_id] = PersonalizedStudyPlan(**plan)
        except Exception as e:
            print(f"Error loading stored state: {e}")

    def _seed_default_quiz_if_needed(self):
        """Ensure quiz_demo_01 is always registered for immediate frontend test taking & grading."""
        if "quiz_demo_01" in self.quizzes:
            return
            
        from app.models.schemas import QuizQuestion, QuestionOption, RubricItem, QuestionType, DifficultyLevel
        demo_quiz = Quiz(
            id="quiz_demo_01",
            title="Adaptive AI Assessment: Deep Learning & Neural Networks",
            created_at=datetime.now(timezone.utc),
            doc_ids=[],
            topics=["Backpropagation & Gradients", "Activation Functions", "Convolutional Neural Networks", "Loss Functions & Optimization"],
            time_limit_minutes=15,
            questions=[
                QuizQuestion(
                    id="q_01",
                    question_type=QuestionType.HANDWRITTEN_DERIVATION,
                    topic="Backpropagation & Gradients",
                    difficulty=DifficultyLevel.MEDIUM,
                    question_text="Derive the gradient of the loss L with respect to weight w_ij^(l) in layer l using the calculus chain rule. Write down the step-by-step equations for delta_j^(l) and the weight update.",
                    expected_answer="Step 1: dL/dw_ij^(l) = (dL/dz_j^(l)) * (dz_j^(l)/dw_ij^(l)). Step 2: dz_j/dw_ij = a_i^(l-1). Step 3: Let delta_j = dL/dz_j. Then dL/dw_ij = delta_j * a_i^(l-1).",
                    explanation="The chain rule decomposes the loss derivative into the error term delta multiplied by the previous layer activation.",
                    rubric=[
                        RubricItem(criterion="Application of Chain Rule", points=0.35, description="Correctly states dL/dw = (dL/dz) * (dz/dw)"),
                        RubricItem(criterion="Identification of dz/dw = a^(l-1)", points=0.35, description="Correctly computes partial derivative with respect to weight"),
                        RubricItem(criterion="Final Error Propagation Formula", points=0.30, description="Accurately defines delta term and final gradient product")
                    ],
                    source_chunks=[]
                ),
                QuizQuestion(
                    id="q_02",
                    question_type=QuestionType.MCQ,
                    topic="Activation Functions",
                    difficulty=DifficultyLevel.MEDIUM,
                    question_text="Which activation function is most susceptible to the 'Vanishing Gradient' problem when neuron activations become very large in magnitude?",
                    options=[
                        QuestionOption(key="A", text="ReLU (Rectified Linear Unit)"),
                        QuestionOption(key="B", text="Sigmoid / Logistic"),
                        QuestionOption(key="C", text="Leaky ReLU"),
                        QuestionOption(key="D", text="Linear Activation")
                    ],
                    correct_option="B",
                    expected_answer="B: Sigmoid / Logistic",
                    explanation="The derivative of Sigmoid is sigma(z)*(1 - sigma(z)), which approaches 0 for large magnitude values of z.",
                    rubric=None,
                    source_chunks=[]
                ),
                QuizQuestion(
                    id="q_03",
                    question_type=QuestionType.HANDWRITTEN_DERIVATION,
                    topic="Convolutional Neural Networks",
                    difficulty=DifficultyLevel.MEDIUM,
                    question_text="Given an input image of size 32x32, a filter/kernel of size 5x5, padding P = 2, and stride S = 1, calculate the output spatial dimension O. Show your formula and calculation.",
                    expected_answer="Formula: O = ((W - K + 2P)/S) + 1 = ((32 - 5 + 4)/1) + 1 = 32. Output dimension is 32x32.",
                    explanation="Same padding (P = 2 for 5x5 kernel) preserves spatial dimensions.",
                    rubric=[
                        RubricItem(criterion="Formula Recall", points=0.30, description="States O = (W - K + 2P)/S + 1"),
                        RubricItem(criterion="Substitution of Values", points=0.40, description="Substitutes 32, 5, 2, 1 accurately"),
                        RubricItem(criterion="Final Dimension", points=0.30, description="Arrives at 32x32")
                    ],
                    source_chunks=[]
                ),
                QuizQuestion(
                    id="q_04",
                    question_type=QuestionType.SHORT_ANSWER,
                    topic="Loss Functions & Optimization",
                    difficulty=DifficultyLevel.MEDIUM,
                    question_text="How does the Adam optimizer combine the principles of Momentum and RMSprop?",
                    expected_answer="Adam combines Momentum by computing an exponentially decaying average of past gradients (first moment) with RMSprop by computing an exponentially decaying average of squared gradients (second moment).",
                    explanation="Adam tracks directional velocity (first moment) and per-parameter scale (second moment) for adaptive learning rates.",
                    rubric=None,
                    source_chunks=[]
                )
            ]
        )
        self.save_quiz(demo_quiz)

    def save_document(self, doc_info: DocumentInfo, chunks: List[DocumentChunk]):
        self.documents[doc_info.id] = doc_info
        for chunk in chunks:
            self.chunks[chunk.id] = chunk
        self._persist_documents()
        self._persist_chunks()

    def _persist_documents(self):
        data = {k: v.model_dump(mode="json") for k, v in self.documents.items()}
        with open(self.docs_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def _persist_chunks(self):
        data = {k: v.model_dump(mode="json") for k, v in self.chunks.items()}
        with open(self.chunks_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_document(self, doc_id: str) -> Optional[DocumentInfo]:
        return self.documents.get(doc_id)

    def get_all_documents(self) -> List[DocumentInfo]:
        return list(self.documents.values())

    def get_document_chunks(self, doc_id: str) -> List[DocumentChunk]:
        chunks = [c for c in self.chunks.values() if c.doc_id == doc_id]
        return sorted(chunks, key=lambda x: x.chunk_index)

    def delete_document(self, doc_id: str) -> bool:
        """Remove a document and all its chunks from storage."""
        if doc_id not in self.documents:
            return False
        # Remove document record
        del self.documents[doc_id]
        # Remove all associated chunks
        chunk_ids_to_delete = [cid for cid, c in self.chunks.items() if c.doc_id == doc_id]
        for cid in chunk_ids_to_delete:
            del self.chunks[cid]
        # Persist changes
        self._persist_documents()
        self._persist_chunks()
        return True

    def save_quiz(self, quiz: Quiz):
        self.quizzes[quiz.id] = quiz
        data = {k: v.model_dump(mode="json") for k, v in self.quizzes.items()}
        with open(self.quizzes_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_quiz(self, quiz_id: str) -> Optional[Quiz]:
        return self.quizzes.get(quiz_id)

    def save_submission(self, report: QuizGradeReport):
        self.submissions[report.submission_id] = report
        data = {k: v.model_dump(mode="json") for k, v in self.submissions.items()}
        with open(self.submissions_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            
        # Update student topic mastery stats
        self._update_mastery_from_submission(report)

    def _update_mastery_from_submission(self, report: QuizGradeReport):
        student_id = report.student_id
        if student_id not in self.student_mastery:
            self.student_mastery[student_id] = {}
            
        for q_res in report.question_results:
            topic = q_res.topic
            if topic not in self.student_mastery[student_id]:
                self.student_mastery[student_id][topic] = TopicMasteryRecord(
                    topic=topic,
                    mastery_score=0.5,
                    attempts_count=0,
                    correct_count=0,
                    predicted_weak_risk=0.5,
                    status="In Progress",
                    last_reviewed=datetime.now(timezone.utc)
                )
                
            rec = self.student_mastery[student_id][topic]
            rec.attempts_count += 1
            if q_res.is_correct or q_res.score >= 0.7:
                rec.correct_count += 1
                rec.mastery_score = min(1.0, rec.mastery_score * 0.7 + (q_res.score) * 0.3)
            else:
                rec.mastery_score = max(0.05, rec.mastery_score * 0.7 + (q_res.score) * 0.3)
                
            rec.last_reviewed = datetime.now(timezone.utc)
            rec.predicted_weak_risk = round(1.0 - rec.mastery_score, 3)
            
            if rec.mastery_score >= 0.8:
                rec.status = "Mastered"
            elif rec.mastery_score >= 0.5:
                rec.status = "In Progress"
            else:
                rec.status = "Needs Remediation"
        self._persist_mastery()

    def _persist_mastery(self):
        data = {}
        for s_id, topics in self.student_mastery.items():
            data[s_id] = {t_name: rec.model_dump(mode="json") for t_name, rec in topics.items()}
        with open(self.mastery_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_student_mastery(self, student_id: str = "default_student") -> StudentMasteryReport:
        records = list(self.student_mastery.get(student_id, {}).values())
        
        # If student has no attempts yet, generate default baselines from loaded topics
        if not records:
            default_topics = [
                "Neural Network Architecture", "Backpropagation & Gradients",
                "Activation Functions", "Loss Functions & Optimization",
                "Convolutional Neural Networks", "Regularization & Dropout"
            ]
            for t in default_topics:
                records.append(TopicMasteryRecord(
                    topic=t,
                    mastery_score=0.65,
                    attempts_count=3,
                    correct_count=2,
                    predicted_weak_risk=0.35,
                    status="In Progress",
                    last_reviewed=datetime.now(timezone.utc)
                ))
                
        avg_score = sum(r.mastery_score for r in records) / len(records) if records else 0.5
        weak_topics = [r.topic for r in records if r.status == "Needs Remediation" or r.mastery_score < 0.6]
        
        return StudentMasteryReport(
            student_id=student_id,
            overall_proficiency=round(avg_score, 2),
            topic_breakdown=records,
            weak_topics=weak_topics,
            recommended_focus=weak_topics[0] if weak_topics else (records[0].topic if records else "General Review"),
            learning_velocity=1.2
        )

    def save_study_plan(self, plan: PersonalizedStudyPlan):
        self.study_plans[plan.student_id] = plan
        data = {k: v.model_dump(mode="json") for k, v in self.study_plans.items()}
        with open(self.study_plans_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_study_plan(self, student_id: str = "default_student") -> Optional[PersonalizedStudyPlan]:
        return self.study_plans.get(student_id)

storage = DataStorage()
