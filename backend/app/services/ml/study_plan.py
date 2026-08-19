"""
Personalized Adaptive Study Plan & Remediation Generator.
Creates tailored 7-day learning schedules and revision flashcards for flagged weak topics.
"""

import uuid
from typing import List
from datetime import datetime, timezone

from app.models.schemas import (
    PersonalizedStudyPlan, StudyTask, Flashcard, StudentMasteryReport
)

def generate_flashcards_for_topic(topic: str) -> List[Flashcard]:
    topic_lower = topic.lower()
    
    if "backprop" in topic_lower or "gradient" in topic_lower:
        return [
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="What is the Chain Rule formula used to compute $\\frac{\\partial \\mathcal{L}}{\\partial w_{ij}}$?",
                back_solution="$\\frac{\\partial \\mathcal{L}}{\\partial w_{ij}} = \\frac{\\partial \\mathcal{L}}{\\partial z_j} \\cdot \\frac{\\partial z_j}{\\partial w_{ij}} = \\delta_j \\cdot a_i^{(l-1)}$",
                difficulty="Medium"
            ),
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="Define the error term $\\delta_j^{(l)}$ in backpropagation.",
                back_solution="$\\delta_j^{(l)} = \\frac{\\partial \\mathcal{L}}{\\partial z_j^{(l)}} = \\left(\\sum_k \\delta_k^{(l+1)} w_{jk}^{(l+1)}\\right) \\sigma'(z_j^{(l)})$",
                difficulty="Hard"
            )
        ]
    elif "convolution" in topic_lower or "cnn" in topic_lower:
        return [
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="What is the formula for the spatial output size $O$ of a convolutional layer?",
                back_solution="$O = \\left\\lfloor \\frac{W - K + 2P}{S} \\right\\rfloor + 1$, where $W$ is input size, $K$ is kernel size, $P$ is padding, and $S$ is stride.",
                difficulty="Medium"
            ),
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="Why do we use Max Pooling layers in CNNs?",
                back_solution="To reduce spatial dimensions (downsampling), extract translation-invariant dominant features, and decrease computational complexity.",
                difficulty="Easy"
            )
        ]
    elif "activation" in topic_lower:
        return [
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="Why does the Sigmoid activation suffer from the vanishing gradient problem?",
                back_solution="Because its derivative $\\sigma'(z) = \\sigma(z)(1-\\sigma(z))$ has a maximum value of 0.25, and approaches 0 as $|z| \\to \\infty$, causing backpropagated gradients to vanish in deep networks.",
                difficulty="Medium"
            ),
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="How does Leaky ReLU resolve the 'Dying ReLU' problem?",
                back_solution="By allowing a small, non-zero gradient $\\alpha z$ (with $\\alpha \\approx 0.01$) when $z < 0$, keeping the neuron active.",
                difficulty="Easy"
            )
        ]
    elif "optimization" in topic_lower or "loss" in topic_lower:
        return [
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt="What two mechanisms does the Adam optimizer combine?",
                back_solution="1. Momentum (exponential moving average of gradients, 1st moment)\n2. RMSprop (exponential moving average of squared gradients, 2nd moment) with bias correction.",
                difficulty="Hard"
            )
        ]
    else:
        return [
            Flashcard(
                id=f"fc_{uuid.uuid4().hex[:6]}",
                topic=topic,
                front_prompt=f"Key definition & theorem review for: {topic}",
                back_solution=f"Review foundational formulas, assumptions, and edge cases for {topic}.",
                difficulty="Medium"
            )
        ]

def build_personalized_study_plan(student_profile: StudentMasteryReport) -> PersonalizedStudyPlan:
    weak_topics = student_profile.weak_topics
    if not weak_topics:
        # If no weak topics, recommend the lowest mastery topics
        sorted_topics = sorted(student_profile.topic_breakdown, key=lambda x: x.mastery_score)
        weak_topics = [t.topic for t in sorted_topics[:2]] if sorted_topics else ["Backpropagation & Gradients"]
        
    tasks = []
    day = 1
    
    for topic in weak_topics:
        tasks.append(StudyTask(
            id=f"task_{uuid.uuid4().hex[:6]}",
            day_number=day,
            topic=topic,
            task_type="concept_review",
            title=f"Master Core Concept: {topic}",
            description=f"Read course notes on {topic}. Pay special attention to definitions, assumptions, and derivation steps.",
            duration_minutes=25,
            completed=False
        ))
        
        tasks.append(StudyTask(
            id=f"task_{uuid.uuid4().hex[:6]}",
            day_number=day + 1,
            topic=topic,
            task_type="handwritten_practice",
            title=f"Handwritten Derivation Practice: {topic}",
            description=f"Write out complete step-by-step mathematical proofs or architecture diagrams by hand on the canvas.",
            duration_minutes=20,
            completed=False
        ))
        
        tasks.append(StudyTask(
            id=f"task_{uuid.uuid4().hex[:6]}",
            day_number=day + 2,
            topic=topic,
            task_type="quiz",
            title=f"Targeted Retention Assessment: {topic}",
            description=f"Take a 5-question adaptive quiz to verify your mastery score improvement.",
            duration_minutes=15,
            completed=False
        ))
        day += 3
        if day > 7:
            break
            
    # Compile recommended flashcards
    flashcards = []
    for topic in weak_topics:
        flashcards.extend(generate_flashcards_for_topic(topic))
        
    plan = PersonalizedStudyPlan(
        plan_id=f"plan_{uuid.uuid4().hex[:8]}",
        student_id=student_profile.student_id,
        generated_at=datetime.now(timezone.utc),
        weak_topics=weak_topics,
        daily_schedule=tasks,
        recommended_flashcards=flashcards,
        encouragement_note=f"You are making steady progress! Focusing 20-30 minutes daily on {weak_topics[0]} will bring your mastery above 85%."
    )
    
    return plan
