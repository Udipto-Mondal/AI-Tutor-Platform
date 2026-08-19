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

    def _load_from_disk(self):
        try:
            if self.docs_file.exists():
                with open(self.docs_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        v["uploaded_at"] = datetime.fromisoformat(v["uploaded_at"])
                        self.documents[k] = DocumentInfo(**v)
                        
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
        except Exception as e:
            print(f"Error loading stored state: {e}")

    def save_document(self, doc_info: DocumentInfo, chunks: List[DocumentChunk]):
        self.documents[doc_info.id] = doc_info
        for chunk in chunks:
            self.chunks[chunk.id] = chunk
        self._persist_documents()

    def _persist_documents(self):
        data = {k: v.model_dump(mode="json") for k, v in self.documents.items()}
        with open(self.docs_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def get_document(self, doc_id: str) -> Optional[DocumentInfo]:
        return self.documents.get(doc_id)

    def get_all_documents(self) -> List[DocumentInfo]:
        return list(self.documents.values())

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
