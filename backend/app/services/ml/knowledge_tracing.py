"""
Knowledge Tracing & Weak-Topic Prediction Service.
Performs real-time feature extraction and runs inference using the MLflow-trained model.
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from app.models.schemas import (
    QuizGradeReport, TopicMasteryRecord, StudentMasteryReport, QuestionGradeResult
)
from app.core.config import settings

class KnowledgeTracingService:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self._load_production_model()

    def _load_production_model(self):
        model_path = settings.MODELS_DIR / "production_weak_topic_model.joblib"
        meta_path = settings.MODELS_DIR / "model_metadata.json"
        
        if model_path.exists():
            try:
                self.model = joblib.load(model_path)
                print(f"[KnowledgeTracing] Loaded production model from {model_path}")
            except Exception as e:
                print(f"[KnowledgeTracing] Error loading joblib model: {e}")
                
        if meta_path.exists():
            try:
                with open(meta_path, "r") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                print(f"[KnowledgeTracing] Error loading metadata: {e}")

    def predict_weak_topic_risk(
        self,
        topic: str,
        difficulty: float = 3.0,
        prior_attempts: int = 1,
        hist_accuracy: float = 0.5,
        consecutive_errors: int = 0,
        days_since_last: int = 2,
        latency_sec: float = 45.0,
        handwritten_score: float = 0.5,
        is_correct: int = 1
    ) -> float:
        """Computes failure / weak topic probability (0.0 to 1.0) using trained model or heuristic fallback."""
        if self.model:
            try:
                input_df = pd.DataFrame([{
                    "topic": topic,
                    "question_difficulty": float(difficulty),
                    "prior_attempts_count": int(prior_attempts),
                    "historical_accuracy": float(hist_accuracy),
                    "consecutive_errors": int(consecutive_errors),
                    "days_since_last_review": int(days_since_last),
                    "response_time_sec": float(latency_sec),
                    "handwritten_score": float(handwritten_score),
                    "is_correct": int(is_correct)
                }])
                
                prob = self.model.predict_proba(input_df)[0, 1]
                return float(round(prob, 4))
            except Exception as e:
                print(f"[KnowledgeTracing] Model inference error: {e}")
                
        # Heuristic IRT + forgetting curve fallback
        risk = (1.0 - hist_accuracy) * 0.4 + (0.5 if is_correct == 0 else 0.0) + (0.1 * min(consecutive_errors, 3))
        return float(round(np.clip(risk, 0.05, 0.95), 4))

    def evaluate_submission_and_update_profile(
        self,
        report: QuizGradeReport,
        current_profile: StudentMasteryReport
    ) -> StudentMasteryReport:
        existing_topics_map = {r.topic: r for r in current_profile.topic_breakdown}
        updated_records = []
        weak_topics = []
        
        for q_res in report.question_results:
            topic = q_res.topic
            prior = existing_topics_map.get(topic)
            
            prior_attempts = prior.attempts_count if prior else 0
            prior_correct = prior.correct_count if prior else 0
            hist_acc = (prior_correct / prior_attempts) if prior_attempts > 0 else 0.5
            
            consec_err = 0 if q_res.is_correct else ((prior.attempts_count - prior.correct_count) if prior else 1)
            hw_score = q_res.score if q_res.question_type.value == "handwritten_derivation" else 0.8
            
            risk = self.predict_weak_topic_risk(
                topic=topic,
                difficulty=3.0,
                prior_attempts=prior_attempts + 1,
                hist_accuracy=hist_acc,
                consecutive_errors=consec_err,
                days_since_last=1,
                latency_sec=35.0,
                handwritten_score=hw_score,
                is_correct=1 if q_res.is_correct else 0
            )
            
            new_attempts = prior_attempts + 1
            new_correct = prior_correct + (1 if q_res.is_correct else 0)
            new_mastery = round(1.0 - risk, 3)
            
            if new_mastery >= 0.75:
                status = "Mastered"
            elif new_mastery >= 0.50:
                status = "In Progress"
            else:
                status = "Needs Remediation"
                weak_topics.append(topic)
                
            updated_records.append(TopicMasteryRecord(
                topic=topic,
                mastery_score=new_mastery,
                attempts_count=new_attempts,
                correct_count=new_correct,
                predicted_weak_risk=risk,
                status=status,
                last_reviewed=datetime.now(timezone.utc)
            ))
            
        # Add topics that were not part of this quiz
        for topic_name, rec in existing_topics_map.items():
            if not any(r.topic == topic_name for r in updated_records):
                updated_records.append(rec)
                if rec.status == "Needs Remediation":
                    weak_topics.append(rec.topic)
                    
        overall = sum(r.mastery_score for r in updated_records) / max(1, len(updated_records))
        
        return StudentMasteryReport(
            student_id=report.student_id,
            overall_proficiency=round(overall, 2),
            topic_breakdown=updated_records,
            weak_topics=list(set(weak_topics)),
            recommended_focus=weak_topics[0] if weak_topics else (updated_records[0].topic if updated_records else "General Review"),
            learning_velocity=1.25
        )

knowledge_tracer = KnowledgeTracingService()
