from google import genai
from google.genai import types

def get_safe_transcript(response):
    """
    Safely extracts the transcript text or returns the failure reason.
    """
    # Check if the response was blocked by safety filters
    if not response.candidates or response.candidates[0].finish_reason == 'SAFETY':
        return "Transcription blocked: Safety filters triggered."
    
    # Check if the model stopped for reasons other than completion
    if response.candidates[0].finish_reason == 'RECITATION':
        return "Transcription blocked: Potential copyright recitation detected."

    try:
        return response.text
    except Exception as e:
        return f"Extraction failed: {str(e)}"

def run_evaluation_stage(audio_bytes, job_description):
    client = genai.Client()

    # Refined instructions for verbatim accuracy
    system_instruction = (
        "You are an expert transcriber for job interviews. "
        "There are two speakers in this audio:\n"
        "1. **Interviewer**: Often an AI voice, asks questions, sets the context, acts as a recruiter.\n"
        "2. **Candidate**: The human applicant answering the questions.\n\n"
        "Your goal is to transcribe the audio verbatim and correctly identify who is speaking based on context and voice."
    )

    # --- UPDATED PROMPT: Request specific labels instead of generic 'SPEAKER' ---
    user_prompt = f"""
    ### CONTEXT (Job Description)
    {job_description}

    ### TASK
    Transcribe the audio verbatim. 
    Identify the speaker as either '**Interviewer**' or '**Candidate**'.
    
    Format:
    [MM:SS] **Interviewer:** [Text]
    [MM:SS] **Candidate:** [Text]
    """

    response = client.models.generate_content(
        model="gemini-flash-latest",
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.0
        ),
        contents=[types.Part.from_bytes(
                data=audio_bytes,
                mime_type="audio/webm"
            ),
            types.Part.from_text(text=user_prompt)
        ]
    )

    return get_safe_transcript(response)