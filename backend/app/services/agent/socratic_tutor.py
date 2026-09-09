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
    
    if any(k in msg_lower for k in ["how", "explain", "what", "কী", "কি", "কীভাবে", "কেমন", "বল", "কার", "বই"]):
        reply = (
            f"Great question! Let's break down this concept step-by-step using your uploaded notes.\n\n"
            f"When we look at this, remember that ideas and structures operate through sequential steps. "
            f"First, consider what the core context represents.\n\n"
            + (f"💡 **Key Context Grounding (from your notes):**\n\"{retrieved_chunks[0].content[:240]}...\"\n\n" if retrieved_chunks else "")
            + "How would you connect this idea to your question?"
        )
        hints = [
            "Hint 1: Check the introductory sections from your uploaded material.",
            "Hint 2: Focus on the main characters, definitions, or equations."
        ]
        follow_up = "What do you think is the central message or outcome here?"
    elif any(k in msg_lower for k in ["hint", "help", "stuck", "সাহায্য", "বুঝিনি", "হিন্ট"]):
        reply = (
            "No problem at all—getting stuck is a natural part of mastering difficult topics! 🚀\n\n"
            + (f"Here is a key reference passage from your indexed document:\n> *\"{retrieved_chunks[0].content[:220]}...\"*\n\n" if retrieved_chunks else "")
            + "Take it step-by-step. What stands out to you in this section?"
        )
        hints = [
            "Look for key relationships and stated facts.",
            "Try summarizing the first main point before moving to the next."
        ]
        follow_up = "Does this hint help clarify the concept?"
    else:
        chunk_quote = f"*\"{retrieved_chunks[0].content[:180]}...\"*" if retrieved_chunks else "your indexed notes"
        reply = (
            f"I see what you mean! You're on the right track exploring {request.current_topic or 'this subject'}.\n\n"
            f"Notice how this connects to the material we indexed: {chunk_quote}\n\n"
            f"How would you express this relationship in your own words?"
        )
        hints = ["Look closely at the context and themes from your reading."]
        follow_up = "Would you like to try a quick practice question on this?"

    return SocraticTutorResponse(
        reply=reply,
        hints_provided=hints,
        citations=citations,
        follow_up_question=follow_up
    )
