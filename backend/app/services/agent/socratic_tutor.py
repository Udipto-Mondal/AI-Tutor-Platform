"""
Socratic Interactive AI Tutor Agent.
Guides students using step-by-step scaffolding, progressive hints, and grounded RAG citations.
"""

import os
import re
from typing import List, Optional
from app.models.schemas import SocraticTutorRequest, SocraticTutorResponse
from app.services.rag.vector_store import vector_store
from app.core.config import settings

def run_socratic_tutor(request: SocraticTutorRequest) -> SocraticTutorResponse:
    # 1. Retrieve RAG context chunks
    query_text = request.message
    if request.current_topic:
        query_text = f"{request.current_topic}: {request.message}"
        
    retrieved_chunks = vector_store.query(query_text, top_k=3)
    context_text = "\n\n".join([f"[{c.doc_name}]: {c.content}" for c in retrieved_chunks])
    citations = [f"{c.doc_name} (Chunk #{c.chunk_index})" for c in retrieved_chunks]
    
    # 2. Try LLM Socratic prompt if Gemini API key exists
    if settings.GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            history_text = "\n".join([f"{m.role}: {m.content}" for m in request.chat_history[-4:]])
            
            prompt = f"""You are 'Leo', an encouraging, expert Socratic AI Tutor.
Your goal is to guide the student to understand concepts on their own through inquiry, analogies, and step-by-step hints.
DO NOT just give away full final answers immediately unless the student has tried multiple times.

Grounding Knowledge from Student Notes:
{context_text}

Recent Conversation History:
{history_text}

Student's Latest Message:
"{request.message}"

Respond with:
1. An encouraging, conversational Socratic guidance.
2. A progressive hint to nudge them forward.
3. A reflective follow-up question.
"""
            response = model.generate_content(prompt)
            reply = response.text.strip()
            
            return SocraticTutorResponse(
                reply=reply,
                hints_provided=["Think about which mathematical operator links the outer and inner functions.", "Remember the chain rule: d(f(g(x)))/dx = f'(g(x)) * g'(x)"],
                citations=citations,
                follow_up_question="Can you try applying this step to the first derivative?"
            )
        except Exception as e:
            print(f"[SocraticTutor] Gemini call failed: {e}")

    # Heuristic Socratic responses based on intent detection
    msg_lower = request.message.lower()
    
    if "how" in msg_lower or "explain" in msg_lower or "what is" in msg_lower:
        reply = (
            f"Great question! Let's break down this concept step-by-step using your uploaded notes.\n\n"
            f"When we look at this problem, remember that complex algorithms and neural layers operate through sequential transformations. "
            f"First, consider what the input represents before any transformation is applied.\n\n"
            f"💡 **Key Concept Grounding:** {retrieved_chunks[0].content[:220]}..." if retrieved_chunks else
            "Let's look at the foundational definition first."
        )
        hints = [
            "Hint 1: Identify the main formula from your study notes.",
            "Hint 2: Break down the operation into forward pass and backward feedback."
        ]
        follow_up = "What do you think happens to the output when we increase the parameter values?"
    elif "hint" in msg_lower or "help" in msg_lower or "stuck" in msg_lower:
        reply = (
            "No problem at all—getting stuck is a natural part of mastering difficult topics! 🚀\n\n"
            "Let's take a small step: Recall how the Chain Rule works in calculus. If $y = f(u)$ and $u = g(x)$, then $\\frac{dy}{dx} = \\frac{dy}{du} \\cdot \\frac{du}{dx}$."
        )
        hints = [
            "Write down the intermediate variable $z = W^T X + b$",
            "Compute $\\frac{\\partial \\mathcal{L}}{\\partial z}$ first before differentiating with respect to $W$."
        ]
        follow_up = "Does the error term $\\delta$ depend on subsequent layers?"
    else:
        reply = (
            f"I see what you mean! You're on the right track exploring {request.current_topic or 'this concept'}.\n\n"
            f"Notice how this directly connects to the notes we indexed: *\"{retrieved_chunks[0].content[:180]}...\"*\n\n"
            f"How would you express this relationship in your own words?"
        )
        hints = ["Check the properties of the activation and loss function."]
        follow_up = "Would you like to try a quick 1-question practice check on this?"

    return SocraticTutorResponse(
        reply=reply,
        hints_provided=hints,
        citations=citations,
        follow_up_question=follow_up
    )
