import os
import json
from typing import Dict, Any, List

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

# ==================== Constants ====================
DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_TEMPERATURE = 0.4
DEFAULT_TOTAL_QUESTIONS = 5
DEFAULT_HINT_FALLBACK = "Think aloud and outline your approach; consider key trade-offs relevant to the role."

# ==================== Helper Functions ====================

def _safe_json(text: str) -> Dict[str, Any]:
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        if len(parts) >= 3:
            t = parts[1]
        else:
            t = t.strip("`")
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        t = t.replace("\r", " ").replace("\n", " ").strip()
        start = t.find("{")
        end = t.rfind("}")
        if start != -1 and end != -1 and end > start:
            return json.loads(t[start:end+1])
        raise

# ==================== Interview Service ====================

class InterviewLLMService:
    def __init__(self, model: str = DEFAULT_MODEL, temperature: float = DEFAULT_TEMPERATURE, total_questions: int = DEFAULT_TOTAL_QUESTIONS):
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            api_key=GEMINI_API_KEY,
            temperature=temperature,
        )
        self.resume_text = None
        self.role = None
        self.chat_history: List[Dict[str, str]] = []
        self.total_questions = total_questions

    def initialize_interview(self, resume_text: str, role: str):
        """Initialize the interview with resume and role context"""
        self.resume_text = resume_text
        self.role = role
        self.chat_history = []
    
    def _build_history_string(self) -> str:
        """Build formatted history string from chat history."""
        return "\n".join([
            f"Q{i+1}: {item['question']}\nA{i+1}: {item.get('answer', 'N/A')}"
            for i, item in enumerate(self.chat_history)
        ])
    
    def _invoke_llm(self, prompt: ChatPromptTemplate, **kwargs) -> Dict[str, Any]:
        """Invoke LLM with prompt and return parsed JSON response."""
        messages = prompt.format_messages(**kwargs)
        resp = self.llm.invoke(messages)
        return _safe_json(resp.content)
    
    def _add_question_to_history(self, question_data: Dict[str, Any]):
        """Add question data to chat history."""
        self.chat_history.append({
            "question": question_data["question"],
            "type": question_data["type"],
            "difficulty": question_data["difficulty"]
        })
    
    def _update_last_answer(self, answer: str, evaluation: Dict[str, Any]):
        """Update the last question with answer and evaluation."""
        self.chat_history[-1]["answer"] = answer
        self.chat_history[-1]["evaluation"] = evaluation

    def generate_first_question(self) -> Dict[str, Any]:
        """Generate the first tailored interview question"""
        if not self.resume_text or not self.role:
            raise ValueError("Call initialize_interview() first")

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a senior interviewer crafting precise, tailored questions."),
            ("human", """Using the candidate profile and target role, generate ONE interview question optimized to start the interview.

Constraints:
- Make it relevant to the resume and role.
- Prefer a behavioral warm-up unless the resume shows very strong hands-on indicators, then a light technical warm-up is fine.
- Set difficulty as 'easy'|'medium'|'hard'.
Return ONLY valid JSON:
{{
  "question": "one clear question",
  "type": "behavioral|technical",
  "difficulty": "easy|medium|hard",
  "rationale": "why this question as opener"
}}

Role: {role}
Candidate Profile:
{profile}""")
        ])

        data = self._invoke_llm(prompt, role=self.role, profile=self.resume_text)
        self._add_question_to_history(data)
        return data

    # ------------- Interactive helpers -------------
    def detect_intent(self, user_text: str) -> str:
        """Detect user intent for the current turn.

        Returns one of: 'clarify' | 'hint' | 'answer'
        """
        t = (user_text or "").lower().strip()
        clarify_keywords = [
            "don't understand", "dont understand", "didn't understand", "didnt understand",
            "repeat", "say again", "rephrase", "rephrase it", "simplify", "simpler",
            "can you explain", "explain again", "not clear", "confused"
        ]
        hint_keywords = ["hint", "help", "nudge", "clue", "guide me", "guide"]

        if any(k in t for k in clarify_keywords):
            return "clarify"
        if any(k in t for k in hint_keywords):
            return "hint"
        return "answer"

    def rephrase_current_question_simple(self) -> str:
        """Rephrase the last question more simply without changing its intent."""
        if not self.chat_history:
            raise ValueError("No question to rephrase. Start the interview first.")
        last_q = self.chat_history[-1]["question"]

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful interviewer. You can rephrase questions more simply without giving away answers."),
            ("human", """Rewrite the following interview question in simpler, clearer terms for the same role.
Keep the same intent and difficulty, but use plain language and be concise (1 sentence).
Return ONLY JSON: {{ "rephrased_question": "..." }}

Question: {q}
Role: {role}
""")
        ])

        data = self._invoke_llm(prompt, q=last_q, role=self.role)
        return data.get("rephrased_question", last_q)

    def hint_for_current_question(self) -> str:
        """Provide a subtle, non-spoiler hint for the current question."""
        if not self.chat_history:
            raise ValueError("No question to hint for. Start the interview first.")
        last_q = self.chat_history[-1]["question"]

        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a coaching interviewer: offer subtle, guiding hints without revealing full answers."),
            ("human", """Given the role, resume, and the current question, provide 1 brief hint to guide the candidate.
Rules:
- Do NOT reveal the full answer
- Keep it short (max 1 sentence)
- Focus on guiding their thinking (e.g., what concepts to consider)
Return ONLY JSON: {{ "hint": "..." }}

Role: {role}
Resume: {resume}
Question: {q}
""")
        ])

        data = self._invoke_llm(prompt, role=self.role, resume=self.resume_text, q=last_q)
        return data.get("hint", DEFAULT_HINT_FALLBACK)

    def evaluate_and_get_next_question(self, user_answer: str, generate_next: bool = True) -> Dict[str, Any]:
        """Evaluate the latest answer and optionally generate the next adaptive question.

        Params:
        - user_answer: the candidate's answer for the last asked question
        - generate_next: when False, only evaluate and do NOT generate/append a next question (useful for final question)
        Returns:
        - dict with at least 'evaluation'; includes 'next_question' only when generate_next=True
        """
        if not self.chat_history:
            raise ValueError("No previous question found. Call generate_first_question() first")

        last_q = self.chat_history[-1]
        history_str = self._build_history_string()

        if generate_next:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a senior interviewer. Evaluate answers, adapt the next question, and be conversational and supportive without revealing full solutions."),
                ("human", """Context:
Role: {role}
Resume: {resume}

Previous Interview History:
{history}

Latest Question: {latest_q}
Latest Answer: {latest_a}

Task:
1) Briefly evaluate the latest answer (score 0-10, strengths, improvements, reason).
2) Generate ONE next question tailored to the role and resume.
3) Adapt difficulty:
   - score >= 8 → increase difficulty
   - score 5-7 → keep difficulty
   - score <= 4 → decrease difficulty

Also produce a brief coaching tip (one sentence) that helps the candidate improve next time, WITHOUT giving away full answers.

Return ONLY valid JSON:
{{
  "evaluation": {{
    "score": 7,
    "strengths": ["..."],
    "improvements": ["..."],
    "reason": "..."
  }},
    "coach_tip": "one sentence helpful but non-spoiler guidance",
  "next_question": {{
    "question": "one clear question",
    "type": "behavioral|technical",
    "difficulty": "easy|medium|hard",
    "rationale": "why this next"
  }}
}}""")
            ])

            result = self._invoke_llm(
                prompt,
                role=self.role,
                resume=self.resume_text,
                history=history_str,
                latest_q=last_q["question"],
                latest_a=user_answer,
            )

            self._update_last_answer(user_answer, result["evaluation"])
            self._add_question_to_history(result["next_question"])
            return result
        else:
            prompt = ChatPromptTemplate.from_messages([
                ("system", "You are a senior interviewer. Evaluate answers precisely and provide a brief coaching tip, without revealing full solutions."),
                ("human", """Context:
Role: {role}
Resume: {resume}

Previous Interview History:
{history}

Latest Question: {latest_q}
Latest Answer: {latest_a}

Task:
Evaluate the latest answer with a brief JSON:
{{
  "evaluation": {{
    "score": 7,
    "strengths": ["..."],
    "improvements": ["..."],
    "reason": "..."
    }},
    "coach_tip": "one sentence helpful but non-spoiler guidance"
}}""")
            ])

            result = self._invoke_llm(
                prompt,
                role=self.role,
                resume=self.resume_text,
                history=history_str,
                latest_q=last_q["question"],
                latest_a=user_answer,
            )

            self._update_last_answer(user_answer, result["evaluation"])
            return result

    # ------------- Web-friendly helpers -------------
    def get_current_question(self) -> Dict[str, Any]:
        """Return the latest question tuple for UI rendering."""
        if not self.chat_history:
            raise ValueError("No question available. Initialize and generate the first question first.")
        last = self.chat_history[-1]
        return {"question": last["question"], "type": last["type"], "difficulty": last["difficulty"]}

    def answer(self, user_answer: str) -> Dict[str, Any]:
        """Answer the current question and advance to the next one."""
        return self.evaluate_and_get_next_question(user_answer, generate_next=True)

    def feedback(self) -> Dict[str, Any]:
        return self.generate_final_feedback()

    def transcript(self) -> List[Dict[str, Any]]:
        return self.chat_history

    def to_dict(self) -> Dict[str, Any]:
        return {"role": self.role, "resume_text": self.resume_text, "chat_history": self.chat_history}

    @staticmethod
    def from_dict(state: Dict[str, Any], model: str = DEFAULT_MODEL, temperature: float = DEFAULT_TEMPERATURE) -> "InterviewLLMService":
        svc = InterviewLLMService(model=model, temperature=temperature)
        svc.role = state.get("role")
        svc.resume_text = state.get("resume_text")
        svc.chat_history = state.get("chat_history", [])
        return svc

    def generate_final_feedback(self) -> Dict[str, Any]:
        """Generate comprehensive feedback summary"""
        transcript = "\n\n".join([
            f"Question {i+1} ({item['type']}, {item['difficulty']}):\n{item['question']}\n\nAnswer:\n{item.get('answer', 'N/A')}\n\nScore: {item.get('evaluation', {}).get('score', 'N/A')}"
            for i, item in enumerate(self.chat_history)
        ])
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a senior hiring manager providing comprehensive interview feedback."),
            ("human", """Based on the complete interview below, provide a detailed performance summary.

Role: {role}
Resume: {resume}

Full Interview Transcript:
{transcript}

Provide a comprehensive analysis in JSON format:
{{
  "overall_score": (0-10),
  "overall_assessment": "2-3 sentence summary",
  "strengths": ["...", "...", "..."],
  "areas_for_improvement": ["...", "...", "..."],
  "technical_proficiency": {{"score": (0-10), "comment": "..."}},
  "communication_skills": {{"score": (0-10), "comment": "..."}},
  "problem_solving": {{"score": (0-10), "comment": "..."}},
    "key_focus_areas": ["...", "...", "..."],
    "recommendation": "Strong Hire|Hire|Maybe|No Hire"
}}""")
        ])
        
        return self._invoke_llm(prompt, role=self.role, resume=self.resume_text, transcript=transcript)



def main():
    mock_resume_text = """
     ABHINAV | startbucks worker, once worked at mcdonalds . 
    Skills: Customer Service, Cash Handling, Teamwork, Time Management
    Highlights:
    - Delivered exceptional customer service in a fast-paced environment, consistently receiving positive feedback.
    - Demonstrated strong teamwork skills by collaborating effectively with colleagues to meet store goals.
    knows how to make coffeee . 
    """

    role = "Barista"

    # print("📝 Text-Based Interview")
    # print("="*60)


    service = InterviewLLMService(total_questions=5)
    service.initialize_interview(mock_resume_text, role)

    # Track types to ensure 5 different types (behavioral, technical, system design, etc.)
    asked_types = set()
    counted_questions = 0
    max_questions = 5
    question_number = 1

    # Generate the first question
    q = service.generate_first_question()
    asked_types.add(q["type"])
    print(f"\n🎯 Question {question_number} ({q['type']}):")
    print(q["question"])


    while counted_questions < max_questions:
        # print("� Text-Based Interview")
        # print("="*60)

        # Detect if user is trying to extend the question (not a real answer)
        extend_keywords = [
            "can you elaborate", "can you give more details", "can you expand", "can you provide more info", "can you clarify further", "can you explain more", "could you elaborate", "could you expand"
        ]
        is_extending = any(k in ans.lower() for k in extend_keywords)

        if intent == "clarify":
            print("\n🔄 Let me rephrase that question for you:")
            print(service.rephrase_current_question_simple())
            continue
        elif intent == "hint":
            print("\n💡 Here's a hint:")
            print(service.hint_for_current_question())
            continue
        elif is_extending:
            print("\n🔄 Sure, let me expand on the question:")
            continue

        # Evaluate the answer and generate the next question
        result = service.evaluate_and_get_next_question(ans, generate_next=True)
        print(f"\n📊 Score: {result['evaluation']['score']}/10")
        print(f"🤝 Coach tip: {result.get('coach_tip', '')}")

        # Any answer (valid or disvalid) counts, unless user was extending
        counted_questions += 1

        # If we've reached 5 counted questions, break
        if counted_questions >= max_questions:
            break

        # Ensure next question is of a different type if possible
        next_type = result["next_question"]["type"]
        if next_type in asked_types and len(asked_types) < 5:
            # Try to regenerate a different type (fallback: just use as is)
            print("(Trying to diversify question types...)")
        asked_types.add(next_type)

        question_number += 1
        print(f"\n🎯 Question {question_number} ({result['next_question']['type']}):")
        print(result["next_question"]["question"])

    print("\n" + "="*60)
    print("🎉 Interview Complete! Generating Feedback...")
    print("="*60)

    feedback = service.generate_final_feedback()
    
    print(f"\n🎯 Overall Score: {feedback['overall_score']}/10")
    print(f"\n📝 {feedback['overall_assessment']}")
    print(f"\n✅ Strengths: {', '.join(feedback['strengths'])}")
    print(f"\n⚠️ Improvements: {', '.join(feedback['areas_for_improvement'])}")
    print(f"\n🏆 Recommendation: {feedback['recommendation']}")

    # Include chat history as part of the feedback section
    print("\n� Transcript (Chat History)")
    print("-" * 60)
    shown = 0
    for i, item in enumerate(service.chat_history, start=1):
        # Skip placeholder questions that never received an answer
        if "answer" not in item:
            continue
        shown += 1
        q = item.get("question", "")
        a = item.get("answer", "N/A")
        score = item.get("evaluation", {}).get("score", "N/A")
        qtype = item.get("type", "?")
        diff = item.get("difficulty", "?")
        print(f"Q{shown} [{qtype}, {diff}]: {q}")
        print(f"A{shown}: {a}")
        print(f"Score: {score}\n")


if __name__ == "__main__":
    main()
