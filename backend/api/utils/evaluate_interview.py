import json
import re
from google import genai
from google.genai import types

def parse_evaluation_result(json_string):
    """
    Parses the JSON result from the LLM evaluation.
    
    Handles cases where the response might be wrapped in markdown code blocks
    or contain extra text before/after the JSON.
    
    Args:
        json_string (str): The raw JSON string response from the LLM
        
    Returns:
        dict: Parsed JSON as a Python dictionary
        
    Raises:
        ValueError: If the JSON cannot be parsed or is invalid
        KeyError: If required fields are missing from the parsed JSON
    """
    if not json_string or not isinstance(json_string, str):
        raise ValueError("Invalid input: json_string must be a non-empty string")
    
    # Remove markdown code blocks if present (e.g., ```json ... ```)
    json_string = re.sub(r'```json\s*', '', json_string)
    json_string = re.sub(r'```\s*$', '', json_string)
    json_string = json_string.strip()
    
    # Try to extract JSON if there's extra text around it
    # Look for the first { and last } to extract the JSON object
    first_brace = json_string.find('{')
    last_brace = json_string.rfind('}')
    
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_string = json_string[first_brace:last_brace + 1]
    
    try:
        parsed_data = json.loads(json_string)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON: {str(e)}\nReceived text: {json_string[:200]}...")
    
    # Validate required fields
    required_fields = [ 'evaluation_metrics', 'hiring_recommendation', 'red_flags']
    missing_fields = [field for field in required_fields if field not in parsed_data]
    
    if missing_fields:
        raise KeyError(f"Missing required fields in parsed JSON: {', '.join(missing_fields)}")
    
    # Validate evaluation_metrics structure
    if not isinstance(parsed_data['evaluation_metrics'], list):
        raise ValueError("evaluation_metrics must be a list")
    
    # Validate each metric has required fields
    required_metric_fields = ['metric', 'score', 'feedback', 'evidence']
    for i, metric in enumerate(parsed_data['evaluation_metrics']):
        missing_metric_fields = [field for field in required_metric_fields if field not in metric]
        if missing_metric_fields:
            raise KeyError(f"Metric at index {i} missing required fields: {', '.join(missing_metric_fields)}")
    
    # Validate hiring_recommendation
    valid_recommendations = ['Strong Hire', 'Hire', 'No Hire']
    if parsed_data['hiring_recommendation'] not in valid_recommendations:
        # Allow it but log a warning (in case LLM uses slightly different wording)
        pass
    
    # Validate red_flags is a list
    if not isinstance(parsed_data['red_flags'], list):
        raise ValueError("red_flags must be a list")
    
    return parsed_data



def evaluate_candidate(jd_text, resume_text, transcript_text):
    """
    Evaluates a candidate by cross-referencing their Resume, Transcript, 
    and Job Description using 6 specific metrics.
    """
    
    SYSTEM_PROMPT = """
    You are a Principal Technical Recruiter. Analyze the JD, Resume, and Transcript provided.
    You must output ONLY a valid JSON object. Do not include markdown formatting or prose outside the JSON.

    ### SCHEMA REQUIREMENTS:
    1. Technical Depth (0-10)
    2. JD Alignment (0-10)
    3. Claim Verification (0-10)
    4. Problem-Solving Structure (0-10)
    5. Learning Agility (0-10)
    6. Communication & Professionalism (0-10)

    ### JSON STRUCTURE EXAMPLE:
    {
      "evaluation_metrics": [
        {
          "metric": "Technical Depth",
          "score": 7,
          "feedback": "Demonstrated understanding of backend state, but struggled with architectural trade-offs.",
          "evidence": "Candidate stated: 'I used a proxy server' but could not explain the underlying security implications."
        }
      ],
      "hiring_recommendation": "Strong Hire / Hire / No Hire",
      "red_flags": ["List of specific concerns found"]
    }

    ### RULES:
    - Evidence must be direct quotes from the transcript.
    - If a resume claim is not supported by the transcript, the 'Claim Verification' score must be low.
    - If the transcript shows a lack of depth (e.g., short, one-sentence technical answers), penalize 'Technical Depth'.
    """

    USER_CONTENT = f"""
    ### JOB DESCRIPTION:
    {jd_text}

    ### RESUME:
    {resume_text}

    ### INTERVIEW TRANSCRIPT:
    {transcript_text}
    """
    
    client = genai.Client()
    
    try:
        response = client.models.generate_content(
            model="gemini-flash-latest",
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.2 # Low temperature for consistent, objective analysis
            ),
            contents=[types.Part.from_text(text=USER_CONTENT)]
        )
        return parse_evaluation_result(response.text)
    except Exception as e:
        return f"Error during evaluation: {str(e)}"



# Example Usage
if __name__ == "__main__":
    # Mock data for testing
    jd = "Seeking a Full-stack dev with React/Django experience. Must understand CSRF and API security."
    resume = """Yugesh Bhattarai  yugeshbhattarai18@gmail.com | (737)-373-0901 | LinkedIn: yugesh-bhattarai | GitHub: madmax-10 


EDUCATION Texas State University B.S. in Computer Science Concentrations: Artificial Intelligence and Machine Learning San Marcos, Texas Expected Graduation: Dec 2027 Related Coursework: Calculus, Machine Learning, Artificial Intelligence, Statistics & Applications, Data Structures & Algorithms, Objects & Design, Computer Organization & Programming, Object-Oriented Programming 





WORK EXPERIENCE Research Assistant - Texas State University 


Built an LLM-based chatbot that automated data collection, increasing user input speed by 40% 

Integrated 5+ REST API endpoints to stream live High-Performance Computing (HPC) data 

Designed 10+ dynamic dashboards that cut manual result interpretation time by 60% 

Collaborated in a 4-member team to model complex HPC system configurations 

PROJECTS Dev-Ripple (Solo Project) July 2025-Present 



A full-stack AI-powered webapp that generates full websites from text prompts 

Integrated React frontend with Django REST backend and WebContainers for real-time code editing and live preview 

Used OpenRouter AI APIs to convert user input into structured React or Node.js code with 90%+ success rate 

Budget Bucket June 2025, Nov 2024 


Developed an intelligent culinary procurement tool that optimizes grocery costs by cross-referencing recipe requirements with real-time e-commerce pricing 

Engineered a hybrid data pipeline using OpenAI (NLP) to decompose user-requested dishes into ingredient lists and Selenium to automate web scraping of Amazon 

Awarded Best Overall (1st Place) at Hackacat: Nano 2024 

Mock-Me 

Developed a dual-sided platform (Recruiter/Candidate) using Django and React 

Implementing Role-Based Access Control (RBAC) for secure workflow management 

Engineered an automated analysis pipeline using OpenAI API to parse interview transcripts and generate quantitative technical scoring 

Built an AI Pre-Screening module that automatically filters candidates based on custom recruiter-defined success thresholds 

Integrated Google Calendar API to enable one-click interview scheduling 

PUBLICATIONS Compass: A Unified Decision-Intelligence Framework for HPC Co-author Texas State University, San Marcos October, 2025 



Co-authored a novel decision-intelligence framework that integrates Generative AI and Active Learning to resolve competing performance trade-offs in HPC systems 

Established a standardized query taxonomy (Recommend, Reconfigure, and What-If) to translate user goals into system adjustments 

Validated model efficacy across billion-sample datasets, demonstrating scalability with less than 1% Mean Absolute Percentage Error (MAPE) 

TECHNICAL SKILLS 

Languages: Python, Javascript, C++, HTML/CSS 

Frameworks & Libraries: React, Next.js, Django, OpenCV, Selenium, Pandas, Node.js, Scikit-learn, Numpy 

Tools & Technologies: Git, REST APIs, WebContainers, Docker, GitHub, Jupyter Notebook, Linux/Unix Command Line 

Developer Methods: Software Development Life Cycle (SDLC), Agile Methodologies, Object-Oriented Programming, Requirements Analysis, Cost Estimation"""
    transcript = """[00:00] **Candidate:** Hello.
[00:03] **Interviewer:** Hello, Yugesh. Thanks for joining today. This is a 15-minute screening interview for the software engineering position. Could you please start by walking me through your resume?
[00:14] **Candidate:** Uh, I am Yugesh Pakhare, and currently a sophomore. I am majoring in Computer Science from Texas State University.
[00:26] **Interviewer:** That's great. I see you worked as a research assistant at Texas State University. Could you tell me more about the LLM-based chatbot you built?
[00:36] **Candidate:** I built a chatbot that lets the user enter his input for any kind of research research work. Yeah.
[00:48] **Interviewer:** That sounds interesting. How did you implement the LLM and what technologies did you use to achieve the 40% speed increase?
[00:59] **Candidate:** Basically, basically before the system was built, the input input process was like JSON based, just a JSON needs to be created. Now I have built a UI that lets the user chat and give the use give the inputs. And I used LLM to transfer to transform the user text into a stra in a into a structured text, and then I I parsed the text to give the input to the to the research backend. That's how.
[01:34] **Interviewer:** That's a clever approach to improving efficiency. I see you also developed Dev Ripple, a full-stack AI-powered web app. What challenges did you face integrating the React front-end with the Django REST back-end?
[01:49] **Candidate:** The main problem was the CSRF token issue.
[01:56] **Interviewer:** And how did you resolve that?
[01:58] **Candidate:** I used a proxy server for it.
[02:02] **Interviewer:** That's a standard solution. Can you tell me about a time you faced a significant technical challenge while working on a project?
[02:10] **Candidate:** That would be when I was working as a research assistant, I had to like learn about Google Agentic development kit, and yeah, it took me kind of like a week to master it.
[02:27] **Interviewer:** Learning new technologies can be challenging. What specific difficulties did you encounter with the Google Agentic development kit and how did you overcome them?
[02:38] **Candidate:** I had never used the Agentic kit at all, and I was new to this field, so like, yeah.
[02:46] **Interviewer:** I understand. What steps did you take to rapidly learn and apply it?
[02:51] **Candidate:** Basically, I used the build and learn approach. Like I built something with the agent using the kit, and on the process of building it, I learned the
[03:03] **Interviewer:** That's a very effective way to learn new tools. I think that covers my questions. Do you have any questions for me?
[03:10] **Candidate:** No.
[03:12] **Interviewer:** Thank you for your time, Yugesh. We will be in touch soon.
[03:20] **Candidate:** Is the interview complete?"""
    
    report_json_string = evaluate_candidate(jd, resume, transcript)
    print("Raw LLM Response:")
    print(report_json_string)
    print("\n" + "="*50 + "\n")
    
    try:
        parsed_report = parse_evaluation_result(report_json_string)
        print("Parsed JSON:")
        print(json.dumps(parsed_report, indent=2))
    except (ValueError, KeyError) as e:
        print(f"Error parsing JSON: {e}")