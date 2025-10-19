import os
import json
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("Missing GEMINI_API_KEY")

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    api_key=GEMINI_API_KEY,
    temperature=0.7
)

# In-memory store for hidden analyses and conversations
ANALYSIS_LOG = []

# Global candidate exit phrases for use in reporting and runtime checks
CANDIDATE_EXIT_PHRASES = [
    "exit", "quit", "bye", "goodbye", "give up", "i give up", "can't solve", "cannot solve",
    "stuck", "don't know", "do not know", "not sure", "stop", "end interview"
]

def _synthesize_report(session: dict) -> dict:
    """Build a concise report from the hidden analysis and conversation transcript."""
    analysis = session.get("analysis", {})
    classification = (analysis.get("classification", "unclear") or "unclear").strip()
    approach = (analysis.get("approach_summary", "") or "").strip()
    time_c = (analysis.get("time_complexity", "") or "").strip()
    space_c = (analysis.get("space_complexity", "") or "").strip()
    improvements = analysis.get("potential_improvements", []) or []
    edge_cases = analysis.get("edge_cases", []) or []
    exchanges = session.get("exchanges", []) or []
    ended_by = session.get("ended_by")
    pseudocode = (session.get("pseudocode", "") or "").strip()

    strengths = []
    weaknesses = []

    if approach:
        strengths.append("Clear high-level approach described")
    else:
        weaknesses.append("No clear approach provided")
    if classification == "optimized":
        strengths.append("Chose an optimized approach for the problem class")
    elif classification == "brute-force":
        weaknesses.append("Relied on brute-force; missed optimization opportunities")
    elif classification == "unclear":
        weaknesses.append("Overall approach is unclear")
    if time_c.startswith("O(") or "O(" in time_c:
        strengths.append("Reasonable time complexity discussion")
    else:
        weaknesses.append("Missing or unclear time complexity")
    if not space_c or "O(" not in space_c:
        weaknesses.append("Missing or unclear space complexity")
    if not edge_cases:
        weaknesses.append("Edge cases not fully considered")

    # Simple heuristic for hire recommendation
    exchanges_count = len(exchanges)
    gave_up = (ended_by == "candidate") or any(
        isinstance(x.get("candidate"), str) and any(p in x["candidate"].lower() for p in CANDIDATE_EXIT_PHRASES)
        for x in exchanges
    )
    trivial_pseudo = len(pseudocode) < 10  # essentially empty/near-empty

    # Stricter hire heuristic
    if gave_up or trivial_pseudo or (classification == "unclear" and not approach):
        hire = "no"
    else:
        if classification == "optimized" and ("Reasonable time complexity discussion" in strengths) and len(weaknesses) <= 1:
            hire = "yes"
        elif classification in ("optimized", "unclear") and strengths:
            hire = "maybe"
        else:
            hire = "no"

    return {
        "role": session.get("role"),
        "difficulty": session.get("difficulty"),
        "question_title": session.get("question", {}).get("question_title"),
        "time_complexity": time_c,
        "space_complexity": space_c,
        "classification": classification,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "suggested_improvements": improvements,
        "noted_edge_cases": edge_cases,
        "hire_recommendation": hire,
        "exchanges_count": exchanges_count
    }

def _persist_session(session: dict, report: dict, path: str = "session_logs.jsonl") -> None:
    try:
        record = {
            "session": session,
            "report": report,
        }
        with open(path, "a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    except Exception:
        # Non-fatal: persistence shouldn't crash the interview
        pass

def final_report(session_index: int = -1, return_dict: bool = False):
    """Generate, display, and persist the final report for the given session index.

    Args:
        session_index: Index into ANALYSIS_LOG; defaults to last session.
        return_dict: If True, return the report dict instead of printing it.
        
    Returns:
        dict if return_dict is True, otherwise None
    """
    if not ANALYSIS_LOG:
        if return_dict:
            return {"error": "No session found to report."}
        print("\nNo session found to report.")
        return
    if session_index < 0 or session_index >= len(ANALYSIS_LOG):
        session_index = len(ANALYSIS_LOG) - 1
    session = ANALYSIS_LOG[session_index]
    report = _synthesize_report(session)

    if return_dict:
        # Return the report for API usage
        return report

    # Pretty print the report for the user
    print("\n--- Candidate Report ---")
    print(f"Role: {report['role']} | Difficulty: {report['difficulty']}")
    print(f"Question: {report.get('question_title', '')}")
    print(f"Time Complexity: {report['time_complexity']} | Space Complexity: {report['space_complexity']}")
    print(f"Classification: {report['classification']}")
    print(f"Strengths: {', '.join(report['strengths']) or 'N/A'}")
    print(f"Weaknesses: {', '.join(report['weaknesses']) or 'N/A'}")
    if report["suggested_improvements"]:
        print("Suggested Improvements:")
        for s in report["suggested_improvements"]:
            print(f"- {s}")
    if report["noted_edge_cases"]:
        print("Noted Edge Cases:")
        for e in report["noted_edge_cases"]:
            print(f"- {e}")
    print(f"Exchanges: {report['exchanges_count']}")
    print(f"Hire? Recommendation: {report['hire_recommendation'].upper()}")

    # Persist session + report to disk
    _persist_session(session, report)


def get_dsa_question(role: str = "general", difficulty: str = "medium") -> dict:
    """
    API-friendly wrapper for generate_dsa_question.
    Generates a DSA question and returns it.
    """
    return generate_dsa_question(role=role, difficulty=difficulty)

def _safe_json(text: str):
    t = text.strip()
    if t.startswith("```"):
        parts = t.split("```")
        if len(parts) >= 3:
            t = parts[1]
        else:
            t = t.strip("`")
    try:
        return json.loads(t)
    except:
        start = t.find("{")
        end = t.rfind("}")
        if start != -1 and end != -1:
            return json.loads(t[start:end+1])
        raise

# ---- Role-based topic hints ----
ROLE_HINTS = {
    "backend": "Focus on algorithms related to strings, hashing, queues, optimization, and scalability.",
    "frontend": "Focus on string manipulation, simulation, parsing, and user interaction type problems.",
    "data": "Focus on problems involving sorting, aggregation, graph traversal, and large-scale data handling.",
    "ml": "Focus on matrix manipulation, graph algorithms, optimization, and dynamic programming.",
    "mobile": "Focus on algorithmic problems suitable for app development such as search, caching, and offline storage efficiency.",
    "general": "Focus on common DSA patterns like arrays, recursion, graphs, and dynamic programming."
}

def generate_dsa_question(role: str = "general", difficulty: str = "easy"):
    """
    Generates a DSA question suitable for a specific role.
    Returns a JSON dict with structure:
    {
      "question_title": "...",
      "problem_statement": "...",
      "difficulty": "...",
      "expected_topics": ["array", "hashmap"],
      "example_input_output": { "input": "...", "output": "..." }
    }
    """
    role = role.lower()
    role_hint = ROLE_HINTS.get(role, ROLE_HINTS["general"])

    prompt = f"""
You are an expert technical interviewer designing algorithm design questions for technical interviews.

Create ONE algorithm design problem where the candidate must describe their approach and provide pseudocode.

IMPORTANT GUIDELINES:
- Present a clear problem that requires designing an algorithm to solve it
- Focus on WHAT needs to be solved, not HOW to implement it in any specific language
- The candidate should explain their algorithmic approach and write pseudocode (not actual code)
- Ask for step-by-step logic: what data structures to use, the algorithm steps, and complexity analysis
- Include concrete examples with input/output to clarify the problem
- Specify constraints (input size, value ranges, time/space requirements)
- The problem should test algorithmic thinking, not syntax knowledge
- End the problem statement with: "Describe your algorithm and provide pseudocode to solve this problem."

Role: {role}
Difficulty: {difficulty}
Guidelines: {role_hint}

Return ONLY valid JSON in this exact format
:
{{
  "question_title": "string",
  "problem_statement": "string (the problem description ending with request for algorithm and pseudocode)",
  "difficulty": "easy|medium|hard",
  "expected_topics": ["topic1", "topic2"],
  "example_input_output": {{
    "input": "string",
    "output": "string"
  }}
}}
    """

    messages = [
        ("system", "You are a strict DSA question generator that outputs ONLY JSON."),
        ("human", prompt)
    ]

    resp = llm.invoke(messages)
    return _safe_json(resp.content)



def analyze_pseudocode_initial(pseudocode: str, question: dict, role: str = "general", difficulty: str = "medium") -> dict:
    """
    Initialize pseudocode analysis session and get first interviewer question.
    Returns dict with session data and first interviewer question.
    """
    question_json = json.dumps(question, ensure_ascii=False)
    problem_statement = question.get("problem_statement", "")

    # Create a hidden backend analysis (not shown to the user)
    hidden_prompt = f"""
You are analyzing a candidate's pseudocode for the following problem. Produce STRICT JSON only.

Question JSON:
{question_json}

Problem Statement:
{problem_statement}

Candidate Pseudocode:
{pseudocode}

Return ONLY valid JSON with keys:
{{
  "approach_summary": "string",
  "time_complexity": "string",
  "space_complexity": "string",
  "classification": "brute-force|optimized|unclear",
  "potential_improvements": ["string", "string"],
  "edge_cases": ["string", "string"]
}}
"""

    hidden_messages = [
        ("system", "You are a precise algorithm evaluator. Output only valid JSON."),
        ("human", hidden_prompt),
    ]
    try:
        hidden_resp = llm.invoke(hidden_messages)
        hidden_analysis = _safe_json(getattr(hidden_resp, "content", str(hidden_resp)))
    except Exception:
        hidden_analysis = {
            "approach_summary": "",
            "time_complexity": "",
            "space_complexity": "",
            "classification": "unclear",
            "potential_improvements": [],
            "edge_cases": []
        }

    # Initialize session log in memory
    session_log = {
        "role": role,
        "difficulty": difficulty,
        "question": question,
        "pseudocode": pseudocode,
        "analysis": hidden_analysis,
        "exchanges": [],  # [{"interviewer": str, "candidate": str}]
        "ended_by": None,
        "messages": []  # LLM conversation history
    }
    session_idx = len(ANALYSIS_LOG)
    ANALYSIS_LOG.append(session_log)

    # Interviewer asks follow-ups
    interviewer_prompt = f"""
You are a DSA interviewer evaluating a candidate's pseudocode for the following problem.

Full Question (from generator, JSON):
{question_json}

Problem Statement (reference):
{problem_statement}

Candidate's Pseudocode:
{pseudocode}

Your tasks:
1) First turn (no candidate reply yet): Ask ONE concise follow-up question. Do NOT reveal any analysis.
2) Subsequent turns (after the candidate replies): Start with a brief, specific acknowledgment reflecting their last answer (1-2 short sentences), THEN ask exactly ONE follow-up question that ties directly to their response. Do NOT reveal any hidden analysis.
3) Continue until you feel the candidate has fully addressed concerns, then end with a supportive closing statement.
Output constraints: On each turn, output ONLY one compact message that is either (a) acknowledgment + one follow-up question, or (b) a closing statement. No extra commentary, no analysis.
"""

    messages = [
        ("system", "You are a senior technical interviewer focusing on algorithms and data structures."),
        ("human", interviewer_prompt),
    ]

    # Get first question
    resp = llm.invoke(messages)
    response = getattr(resp, "content", str(resp)).strip()
    
    # Save messages to session
    session_log["messages"] = [
        {"role": "system", "content": "You are a senior technical interviewer focusing on algorithms and data structures."},
        {"role": "human", "content": interviewer_prompt},
        {"role": "assistant", "content": response}
    ]
    
    # Log interviewer question
    session_log["exchanges"].append({"interviewer": response})
    
    return {
        "session_idx": session_idx,
        "interviewer_question": response,
        "is_closing": _is_interviewer_closing(response)
    }


def continue_pseudocode_analysis(session_idx: int, candidate_reply: str) -> dict:
    """
    Continue pseudocode analysis conversation with candidate reply.
    Returns dict with next interviewer question or closing status.
    """
    if session_idx < 0 or session_idx >= len(ANALYSIS_LOG):
        raise ValueError("Invalid session index")
    
    session_log = ANALYSIS_LOG[session_idx]
    
    # Check if candidate wants to give up or says they can solve it
    candidate_reply_lower = candidate_reply.strip().lower()
    
    # Candidate exit phrases (give up)
    candidate_exit_phrases = [
        "exit", "quit", "bye", "goodbye", "give up", "i give up", "can't solve", "cannot solve",
        "stuck", "don't know", "do not know", "not sure", "stop", "end interview"
    ]
    
    # Candidate confidence phrases (I can solve it now)
    candidate_confidence_phrases = [
        "yeah now i can", "i can solve", "i can do it", "i got it", "i understand now",
        "clear now", "makes sense now", "i can solve it now"
    ]
    
    # Candidate completion phrases (I am done)
    candidate_completion_phrases = [
        "i am done", "i'm done", "done", "completed", "that's it", "that is it",
        "finished", "i'm finished", "i am finished", "all done", "i'm all done"
    ]
    
    if any(p in candidate_reply_lower for p in candidate_exit_phrases):
        closing = "Understood. We'll wrap up here. Thank you for your time and effort today."
        session_log["exchanges"][-1]["candidate"] = candidate_reply
        session_log["exchanges"].append({"interviewer": closing})
        session_log["ended_by"] = "candidate_giveup"
        return {
            "interviewer_question": closing,
            "is_closing": True,
            "ended_by": "candidate_giveup"
        }
    
    if any(p in candidate_reply_lower for p in candidate_confidence_phrases):
        closing = "Great! I'm glad things are clearer now. Thank you for working through this with me."
        session_log["exchanges"][-1]["candidate"] = candidate_reply
        session_log["exchanges"].append({"interviewer": closing})
        session_log["ended_by"] = "candidate_confident"
        return {
            "interviewer_question": closing,
            "is_closing": True,
            "ended_by": "candidate_confident"
        }
    
    if any(p in candidate_reply_lower for p in candidate_completion_phrases):
        closing = "Excellent! Thank you for completing the pseudocode analysis. We'll wrap up here."
        session_log["exchanges"][-1]["candidate"] = candidate_reply
        session_log["exchanges"].append({"interviewer": closing})
        session_log["ended_by"] = "candidate_completed"
        return {
            "interviewer_question": closing,
            "is_closing": True,
            "ended_by": "candidate_completed"
        }
    
    # Update conversation with candidate reply
    session_log["messages"].append({"role": "human", "content": candidate_reply})
    session_log["exchanges"][-1]["candidate"] = candidate_reply
    
    # Get next interviewer response
    # Reconstruct messages for LLM
    messages = []
    for msg in session_log["messages"]:
        if msg["role"] == "system":
            messages.append(("system", msg["content"]))
        elif msg["role"] == "human":
            messages.append(("human", msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(("assistant", msg["content"]))
    
    resp = llm.invoke(messages)
    response = getattr(resp, "content", str(resp)).strip()
    
    # Save response
    session_log["messages"].append({"role": "assistant", "content": response})
    session_log["exchanges"].append({"interviewer": response})
    
    # Check if interviewer is closing
    is_closing = _is_interviewer_closing(response)
    if is_closing:
        session_log["ended_by"] = "interviewer"
    
    return {
        "interviewer_question": response,
        "is_closing": is_closing,
        "ended_by": session_log.get("ended_by")
    }


def _is_interviewer_closing(response: str) -> bool:
    """Check if interviewer response contains closing phrases"""
    interviewer_close_phrases = [
        "good job", "well done", "thank you", "excellent work", "that's all", "great work",
        "this concludes", "we're done", "no further questions", "end of interview", "goodbye", "bye"
    ]
    return any(phrase in response.lower() for phrase in interviewer_close_phrases)


def analyze_pseudocode(pseudocode: str, role: str = "general", difficulty: str = "medium") -> int:
    """
    Analyze a user's pseudocode in the context of a freshly generated algorithm design question.
    The evaluation is conversational (interviewer-style) and will:
    - Identify brute-force vs optimized
    - Estimate time and space complexity
    - Ask if further optimization is possible
    
    NOTE: This is the legacy CLI version. Use analyze_pseudocode_initial and continue_pseudocode_analysis for API.
    """

    # Get a question for context so the evaluation is grounded
    question = generate_dsa_question(role=role, difficulty=difficulty)
    question_json = json.dumps(question, ensure_ascii=False)
    problem_statement = question.get("problem_statement", "")

    # Create a hidden backend analysis (not shown to the user)
    hidden_prompt = f"""
You are analyzing a candidate's pseudocode for the following problem. Produce STRICT JSON only.

Question JSON:
{question_json}

Problem Statement:
{problem_statement}

Candidate Pseudocode:
{pseudocode}

Return ONLY valid JSON with keys:
{{
  "approach_summary": "string",
  "time_complexity": "string",
  "space_complexity": "string",
  "classification": "brute-force|optimized|unclear",
  "potential_improvements": ["string", "string"],
  "edge_cases": ["string", "string"]
}}
"""

    hidden_messages = [
        ("system", "You are a precise algorithm evaluator. Output only valid JSON."),
        ("human", hidden_prompt),
    ]
    try:
        hidden_resp = llm.invoke(hidden_messages)
        hidden_analysis = _safe_json(getattr(hidden_resp, "content", str(hidden_resp)))
    except Exception:
        hidden_analysis = {
            "approach_summary": "",
            "time_complexity": "",
            "space_complexity": "",
            "classification": "unclear",
            "potential_improvements": [],
            "edge_cases": []
        }

    # Initialize session log in memory
    session_log = {
        "role": role,
        "difficulty": difficulty,
        "question": question,
        "pseudocode": pseudocode,
        "analysis": hidden_analysis,
        "exchanges": [],  # [{"interviewer": str, "candidate": str}]
        "ended_by": None
    }
    ANALYSIS_LOG.append(session_log)

    # Interviewer asks follow-ups; after candidate replies, first acknowledge their response, then ask the next question
    interviewer_prompt = f"""
You are a DSA interviewer evaluating a candidate's pseudocode for the following problem.

Full Question (from generator, JSON):
{question_json}

Problem Statement (reference):
{problem_statement}

Candidate's Pseudocode:
{pseudocode}

Your tasks:
1) First turn (no candidate reply yet): Ask ONE concise follow-up question. Do NOT reveal any analysis.
2) Subsequent turns (after the candidate replies): Start with a brief, specific acknowledgment reflecting their last answer (1-2 short sentences), THEN ask exactly ONE follow-up question that ties directly to their response. Do NOT reveal any hidden analysis.
3) Continue until you feel the candidate has fully addressed concerns, then end with a supportive closing statement.
Output constraints: On each turn, output ONLY one compact message that is either (a) acknowledgment + one follow-up question, or (b) a closing statement. No extra commentary, no analysis.
"""

    messages = [
        ("system", "You are a senior technical interviewer focusing on algorithms and data structures."),
        ("human", interviewer_prompt),
    ]

    # Closing signals from interviewer or candidate
    interviewer_close_phrases = [
        "good job", "well done", "thank you", "excellent work", "that's all", "great work",
        "this concludes", "we're done", "no further questions", "end of interview", "goodbye", "bye"
    ]
    candidate_exit_phrases = [
        "exit", "quit", "bye", "goodbye", "give up", "i give up", "can't solve", "cannot solve",
        "stuck", "don't know", "do not know", "not sure", "stop", "end interview"
    ]

    while True:
        resp = llm.invoke(messages)
        response = getattr(resp, "content", str(resp)).strip()
        print("\nInterviewer: " + response)

        # Log interviewer question/closing (candidate reply may be empty on last turn)
        session_log["exchanges"].append({"interviewer": response})

        if any(phrase in response.lower() for phrase in interviewer_close_phrases):
            # Conversation finished by interviewer
            session_log["ended_by"] = "interviewer"
            return len(ANALYSIS_LOG) - 1
        candidate_reply = input("Your answer: ")
        # Early exit if candidate signals to stop
        if any(p in candidate_reply.strip().lower() for p in candidate_exit_phrases):
            closing = "Understood. We'll wrap up here. Thank you for your time and effort today."
            print("\nInterviewer: " + closing)
            session_log["exchanges"].append({"interviewer": closing, "candidate": candidate_reply})
            session_log["ended_by"] = "candidate"
            return len(ANALYSIS_LOG) - 1
        # Update conversation context and log candidate reply
        messages.append(("assistant", response))
        messages.append(("human", candidate_reply))
        session_log["exchanges"][-1]["candidate"] = candidate_reply
    return len(ANALYSIS_LOG) - 1







# ---------------- Example Usage ----------------
if __name__ == "__main__":

    # Prompt for role and difficulty (optional, with defaults)
    role = input("Enter the interview role (default: general): ").strip() or "general"
    difficulty = input("Enter difficulty (easy/medium/hard, default: medium): ").strip() or "medium"

    # Generate and display the question
    question = generate_dsa_question(role=role, difficulty=difficulty)
    print("\n--- DSA Interview Question ---\n")
    print(question["problem_statement"])
    print("\nExample Input/Output:")
    print(f"Input: {question['example_input_output']['input']}")
    print(f"Output: {question['example_input_output']['output']}")

    print("\nPlease enter your pseudocode for the above problem. End your input with an empty line:")
    # Read multiline pseudocode from user
    lines = []
    while True:
        line = input()
        if line.strip() == "":
            break
        lines.append(line)
    pseudocode = "\n".join(lines)

    print("\n--- Interviewer ---\n")
    session_idx = analyze_pseudocode(pseudocode, role=role, difficulty=difficulty)
    # After conversation ends, show final report
    final_report(session_idx)


