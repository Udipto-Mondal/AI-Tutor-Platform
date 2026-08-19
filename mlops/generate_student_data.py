"""
Synthetic Student Interaction Data Generator for Knowledge Tracing & Weak-Topic Prediction.
Generates realistic learning trajectories incorporating forgetting curves, difficulty scaling,
and multi-modal response signals (latency, handwritten accuracy, conceptual errors).
"""

import os
import json
import numpy as np
import pandas as pd

TOPICS = [
    "Neural Network Architecture",
    "Backpropagation & Gradients",
    "Activation Functions",
    "Loss Functions & Optimization",
    "Convolutional Neural Networks",
    "Regularization & Dropout",
    "Asymptotic Complexity (Big-O)",
    "Trees & Graph Traversal",
    "Dynamic Programming",
    "Matrix Calculus & Linear Algebra"
]

def generate_student_dataset(n_students: int = 500, attempts_per_student: int = 25, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    
    records = []
    
    for student_id in range(1, n_students + 1):
        # Inherent student ability latent factor: Normal(0, 1)
        student_ability = np.random.normal(0.0, 1.0)
        
        # Track student's topic mastery evolving over time
        topic_mastery = {topic: np.clip(0.5 + 0.2 * student_ability + np.random.normal(0, 0.15), 0.05, 0.95) for topic in TOPICS}
        topic_attempts = {topic: 0 for topic in TOPICS}
        topic_history = {topic: [] for topic in TOPICS}
        last_seen_day = {topic: 0 for topic in TOPICS}
        
        current_day = 1
        
        for attempt_idx in range(attempts_per_student):
            topic = np.random.choice(TOPICS)
            topic_attempts[topic] += 1
            
            # Forgetting curve effect: mastery decays if long time since last review
            days_since_last = current_day - last_seen_day[topic]
            decay_factor = np.exp(-0.05 * min(days_since_last, 30))
            effective_mastery = topic_mastery[topic] * decay_factor
            
            # Question difficulty: 1.0 (easy) to 5.0 (very hard)
            question_diff = np.random.choice([1.0, 2.0, 3.0, 4.0, 5.0], p=[0.15, 0.25, 0.30, 0.20, 0.10])
            
            # Probability of success based on logistic function (IRT: Item Response Theory)
            # P(correct) = 1 / (1 + exp(-(mastery - difficulty_scaled)))
            diff_scaled = (question_diff - 3.0) * 0.8
            prob_success = 1.0 / (1.0 + np.exp(-(effective_mastery * 4.0 - 2.0 - diff_scaled)))
            
            # Latency (seconds): harder questions or lower mastery take longer
            base_time = 45.0 + (question_diff * 15.0)
            latency = max(10.0, np.random.normal(base_time * (1.8 - effective_mastery), 15.0))
            
            # Outcome: is current attempt correct?
            is_correct = 1 if np.random.rand() < prob_success else 0
            
            # Handwritten answer score: high correlation with correctness + some noise
            if is_correct == 1:
                hw_score = np.clip(np.random.normal(0.88, 0.10), 0.6, 1.0)
            else:
                hw_score = np.clip(np.random.normal(0.35, 0.15), 0.0, 0.65)
                
            # History features before this attempt
            prior_attempts = topic_attempts[topic] - 1
            hist_scores = topic_history[topic]
            hist_accuracy = np.mean(hist_scores) if len(hist_scores) > 0 else 0.5
            
            # Consecutive errors streak
            consecutive_errs = 0
            for score in reversed(hist_scores):
                if score == 0:
                    consecutive_errs += 1
                else:
                    break
                    
            # Target label: Needs Remediation (Weak Topic)
            # Concept is considered weak / in need of remediation if effective mastery is low or recent fail rate is high
            needs_remediation = 1 if (effective_mastery < 0.45 or consecutive_errs >= 2 or (not is_correct and question_diff <= 3.0)) else 0
            
            records.append({
                "student_id": f"STU_{student_id:04d}",
                "attempt_id": f"ATT_{student_id:04d}_{attempt_idx+1:03d}",
                "topic": topic,
                "question_difficulty": float(question_diff),
                "prior_attempts_count": int(prior_attempts),
                "historical_accuracy": round(float(hist_accuracy), 4),
                "consecutive_errors": int(consecutive_errs),
                "days_since_last_review": int(days_since_last),
                "response_time_sec": round(float(latency), 2),
                "handwritten_score": round(float(hw_score), 4),
                "is_correct": int(is_correct),
                "needs_remediation": int(needs_remediation)
            })
            
            # Update history and learning curve
            topic_history[topic].append(is_correct)
            last_seen_day[topic] = current_day
            current_day += np.random.choice([0, 1, 2])
            
            # Learning gain: student learns slightly from each attempt
            learning_rate = 0.04 if is_correct else 0.015
            topic_mastery[topic] = np.clip(topic_mastery[topic] + learning_rate, 0.05, 0.98)
            
    df = pd.DataFrame(records)
    return df

def main():
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ml_data")
    os.makedirs(data_dir, exist_ok=True)
    
    print("Generating synthetic student interaction dataset...")
    df = generate_student_dataset(n_students=600, attempts_per_student=30, seed=42)
    
    train_size = int(len(df) * 0.8)
    train_df = df.iloc[:train_size]
    test_df = df.iloc[train_size:]
    
    train_path = os.path.join(data_dir, "student_interactions_train.csv")
    test_path = os.path.join(data_dir, "student_interactions_test.csv")
    full_path = os.path.join(data_dir, "student_interactions_full.csv")
    
    df.to_csv(full_path, index=False)
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)
    
    print(f"Generated {len(df)} total interaction records.")
    print(f"Train samples: {len(train_df)} -> {train_path}")
    print(f"Test samples:  {len(test_df)} -> {test_path}")
    print(f"Remediation rate: {df['needs_remediation'].mean():.2%}")
    print("Sample record:\n", df.head(2).to_dict(orient="records"))

if __name__ == "__main__":
    main()
