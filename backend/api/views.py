from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.http import HttpResponse
import google.generativeai as genai
import requests
import json
import os
import base64
import tempfile
from PyPDF2 import PdfReader
from pdf2image import convert_from_path
from io import BytesIO
from .models import Demo, InterviewSession, InterviewReport
from .serializers import (
    DemoSerializer, 
    InterviewSessionSerializer, 
    ResumeUploadSerializer,
    AnalysisRequestSerializer,
    NextQuestionSerializer,
    DSAQuestionRequestSerializer,
    PseudocodeSubmitSerializer,
    PseudocodeReplySerializer,
    InterviewReportSerializer,
    ReportCreateSerializer,
    ReportDecisionSerializer
)
from .email_service import email_service

# Import InterviewLLMService from text_interview module
import sys
from pathlib import Path
backend_path = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_path))
from text_interview import InterviewLLMService

# Import DSA functions from ask_ques_get_ans module
from ask_ques_get_ans import (
    get_dsa_question,
    analyze_pseudocode_initial,
    continue_pseudocode_analysis,
    final_report as dsa_final_report
)

# Configure Gemini API
genai.configure(api_key=settings.GEMINI_API_KEY)

@api_view(['GET'])
def demo_list(request):
    """GET /api/demos/ - List available demo sessions"""
    demos = Demo.objects.all()
    serializer = DemoSerializer(demos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def upload_resume(request):
    """POST /api/upload-resume/ - Upload resume and initialize turn-by-turn interview"""
    serializer = ResumeUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the demo
        demo = get_object_or_404(Demo, id=serializer.validated_data['demo_id'])
        
        # Create new interview session
        session = InterviewSession.objects.create(
            demo=demo,
            role=demo.title,  # Use demo title as the role
            total_questions=5
        )
        
        # Process resume to extract text
        resume_file = serializer.validated_data['resume_image']
        
        # Determine file type
        is_pdf = resume_file.content_type == 'application/pdf'
        
        # Save the file temporarily
        file_extension = '.pdf' if is_pdf else '.jpg'
        file_path = os.path.join(settings.MEDIA_ROOT, 'temp', f'resume_{session.id}{file_extension}')
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'wb') as f:
            for chunk in resume_file.chunks():
                f.write(chunk)
        
        # Extract resume text based on file type
        if is_pdf:
            resume_text = extract_text_from_pdf(file_path)
        else:
            resume_text = extract_text_from_image(file_path)
        
        # Clean up temporary file
        os.remove(file_path)
        
        # Store resume text
        session.resume_text = resume_text
        session.save()
        
        # Initialize InterviewLLMService
        service = InterviewLLMService(total_questions=session.total_questions)
        service.initialize_interview(resume_text, session.role)
        
        # Generate first question
        first_question_data = service.generate_first_question()
        
        # Save service state
        session.update_service_state(service.to_dict())
        session.current_question_number = 1
        session.save()
        
        return Response({
            'session_id': str(session.id),
            'role': session.role,
            'total_questions': session.total_questions,
            'current_question_number': session.current_question_number,
            'question': first_question_data['question'],
            'question_type': first_question_data['type'],
            'difficulty': first_question_data['difficulty']
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to process resume: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def text_to_speech(request):
    """POST /api/text-to-speech/ - Convert text to speech using Eleven Labs"""
    try:
        text = request.data.get('text')
        
        if not text:
            return Response(
                {'error': 'text is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if Eleven Labs API key is configured
        if not settings.ELEVEN_LABS_API_KEY:
            return Response(
                {'error': 'Eleven Labs API key not configured'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Generate audio using Eleven Labs
        audio_content = generate_elevenlabs_audio(text)
        
        if audio_content:
            # Return audio file directly
            response = HttpResponse(audio_content, content_type='audio/mpeg')
            response['Content-Disposition'] = 'inline; filename="question.mp3"'
            return response
        else:
            return Response(
                {'error': 'Failed to generate audio'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {'error': f'Failed to generate speech: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def submit_answer_and_get_next(request):
    """POST /api/submit-answer-and-get-next/ - Submit answer and get next question with evaluation"""
    serializer = NextQuestionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        user_answer = serializer.validated_data['answer']
        
        # Load service from state
        service = InterviewLLMService.from_dict(session.service_state)
        
        # Check if this is the last question
        is_last_question = session.current_question_number >= session.total_questions
        
        # Evaluate answer and optionally get next question
        result = service.evaluate_and_get_next_question(user_answer, generate_next=not is_last_question)
        
        # Save updated service state
        session.update_service_state(service.to_dict())
        
        # Increment question number if not last
        if not is_last_question:
            session.increment_question_number()
        
        response_data = {
            'session_id': str(session.id),
            'evaluation': result['evaluation'],
            'coach_tip': result.get('coach_tip', ''),
            'is_last_question': is_last_question,
            'current_question_number': session.current_question_number
        }
        
        # Add next question if not last
        if not is_last_question and 'next_question' in result:
            response_data['next_question'] = {
                'question': result['next_question']['question'],
                'type': result['next_question']['type'],
                'difficulty': result['next_question']['difficulty']
            }
        
        return Response(response_data, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to process answer: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def get_final_feedback(request):
    """POST /api/get-final-feedback/ - Get comprehensive final feedback after all questions"""
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        
        # Load service from state
        service = InterviewLLMService.from_dict(session.service_state)
        
        # Generate comprehensive final feedback with improved prompts
        feedback = generate_enhanced_final_feedback(service, session)
        
        # Save feedback as report
        session.add_report(feedback)
        
        return Response({
            'session_id': str(session.id),
            'feedback': feedback
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to generate feedback: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def generate_enhanced_final_feedback(service, session):
    """Generate comprehensive final feedback with improved system prompts and JSON formatting"""
    try:
        # Create a detailed transcript with all interview data
        transcript_parts = []
        for i, item in enumerate(service.chat_history):
            question_info = f"Question {i+1} ({item.get('type', 'General')}, {item.get('difficulty', 'Medium')}):"
            question_text = item.get('question', 'N/A')
            answer_text = item.get('answer', 'N/A')
            evaluation = item.get('evaluation', {})
            score = evaluation.get('score', 'N/A') if evaluation else 'N/A'
            feedback = evaluation.get('feedback', 'N/A') if evaluation else 'N/A'
            
            transcript_parts.append(f"""
{question_info}
{question_text}

Answer:
{answer_text}

Score: {score}
Feedback: {feedback}
---""")
        
        transcript = "\n".join(transcript_parts)
        
        # Enhanced system prompt for better JSON formatting
        system_prompt = """You are an expert senior hiring manager and technical interviewer with 15+ years of experience. 
You specialize in conducting comprehensive candidate evaluations and providing detailed, actionable feedback.

Your task is to analyze the complete interview transcript and provide a thorough, professional assessment in a specific JSON format.

IMPORTANT: You MUST respond ONLY with valid JSON. Do not include any text before or after the JSON. 
The JSON must be properly formatted and complete.

Guidelines for scoring:
- Overall Score: 0-10 (0-3: Poor, 4-6: Fair, 7-8: Good, 9-10: Excellent)
- Individual scores: 0-10 for each category
- Be specific and constructive in all feedback
- Focus on actionable insights
- Consider the role requirements and resume background
- Provide balanced assessment highlighting both strengths and areas for improvement"""

        # Enhanced human prompt with better structure
        human_prompt = f"""Based on the complete interview below, provide a comprehensive performance analysis.

CANDIDATE INFORMATION:
Role: {service.role}
Resume Background: {service.resume_text[:500]}...

COMPLETE INTERVIEW TRANSCRIPT:
{transcript}

Please analyze this interview and provide your assessment in the following EXACT JSON format:

{{
  "overall_score": 8,
  "overall_assessment": "The candidate demonstrates strong technical knowledge and clear communication skills. They show good problem-solving abilities and provide detailed, structured answers. However, there are some areas where they could be more specific with examples.",
  "strengths": [
    "Strong technical foundation in relevant areas",
    "Clear and structured communication style",
    "Good problem-solving approach",
    "Demonstrates relevant experience"
  ],
  "areas_for_improvement": [
    "Could provide more specific examples from past projects",
    "Should elaborate more on technical implementation details",
    "Could demonstrate more leadership experience"
  ],
  "technical_proficiency": {{
    "score": 8,
    "comment": "Shows solid understanding of core concepts and can explain technical topics clearly. Demonstrates good knowledge of relevant technologies and frameworks."
  }},
  "communication_skills": {{
    "score": 7,
    "comment": "Communicates ideas clearly and structures responses well. Could improve by providing more specific examples and being more concise in some areas."
  }},
  "problem_solving": {{
    "score": 8,
    "comment": "Shows good analytical thinking and approaches problems systematically. Demonstrates ability to break down complex problems into manageable parts."
  }},
  "key_focus_areas": [
    "Technical depth and specific examples",
    "Leadership and team collaboration",
    "Project management experience"
  ],
  "recommendation": "Hire"
}}

Remember: Respond ONLY with the JSON object above, no additional text."""

        # Use Gemini directly for better control
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Create the full prompt
        full_prompt = f"{system_prompt}\n\n{human_prompt}"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        # Parse and validate JSON response
        feedback_text = response.text.strip()
        
        # Clean up the response to extract JSON
        if feedback_text.startswith("```json"):
            feedback_text = feedback_text.replace("```json", "").replace("```", "").strip()
        elif feedback_text.startswith("```"):
            feedback_text = feedback_text.replace("```", "").strip()
        
        # Try to parse JSON
        try:
            feedback_data = json.loads(feedback_text)
            
            # Validate required fields
            required_fields = [
                'overall_score', 'overall_assessment', 'strengths', 
                'areas_for_improvement', 'technical_proficiency', 
                'communication_skills', 'problem_solving', 'key_focus_areas', 'recommendation'
            ]
            
            for field in required_fields:
                if field not in feedback_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Ensure scores are within valid range
            for score_field in ['overall_score', 'technical_proficiency', 'communication_skills', 'problem_solving']:
                if score_field in feedback_data:
                    if isinstance(feedback_data[score_field], dict):
                        if 'score' in feedback_data[score_field]:
                            feedback_data[score_field]['score'] = max(0, min(10, feedback_data[score_field]['score']))
                    else:
                        feedback_data[score_field] = max(0, min(10, feedback_data[score_field]))
            
            return feedback_data
            
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Raw response: {feedback_text}")
            
            # Fallback: create a basic structure
            return create_fallback_feedback(service)
            
    except Exception as e:
        print(f"Error in generate_enhanced_final_feedback: {e}")
        return create_fallback_feedback(service)

def create_fallback_feedback(service):
    """Create a fallback feedback structure if AI generation fails"""
    try:
        # Calculate basic scores from chat history
        total_questions = len(service.chat_history)
        if total_questions == 0:
            return {
                "overall_score": 0,
                "overall_assessment": "No interview data available for analysis.",
                "strengths": [],
                "areas_for_improvement": ["Complete the interview to receive feedback"],
                "technical_proficiency": {"score": 0, "comment": "No data available"},
                "communication_skills": {"score": 0, "comment": "No data available"},
                "problem_solving": {"score": 0, "comment": "No data available"},
                "key_focus_areas": ["Complete the interview process"],
                "recommendation": "No Hire"
            }
        
        # Calculate average scores from evaluations
        scores = []
        for item in service.chat_history:
            evaluation = item.get('evaluation', {})
            if evaluation and 'score' in evaluation:
                scores.append(evaluation['score'])
        
        avg_score = sum(scores) / len(scores) if scores else 5
        
        return {
            "overall_score": round(avg_score, 1),
            "overall_assessment": f"Based on {total_questions} questions, the candidate shows potential but needs further evaluation.",
            "strengths": ["Participated in the interview process"],
            "areas_for_improvement": ["Provide more detailed answers", "Give specific examples"],
            "technical_proficiency": {"score": round(avg_score, 1), "comment": "Basic technical understanding demonstrated"},
            "communication_skills": {"score": round(avg_score, 1), "comment": "Clear communication with room for improvement"},
            "problem_solving": {"score": round(avg_score, 1), "comment": "Shows problem-solving approach"},
            "key_focus_areas": ["Technical depth", "Specific examples", "Leadership experience"],
            "recommendation": "Maybe" if avg_score >= 6 else "No Hire"
        }
        
    except Exception as e:
        print(f"Error creating fallback feedback: {e}")
        return {
            "overall_score": 0,
            "overall_assessment": "Unable to generate feedback due to technical issues.",
            "strengths": [],
            "areas_for_improvement": ["Technical system error occurred"],
            "technical_proficiency": {"score": 0, "comment": "System error"},
            "communication_skills": {"score": 0, "comment": "System error"},
            "problem_solving": {"score": 0, "comment": "System error"},
            "key_focus_areas": [],
            "recommendation": "No Hire"
        }


def extract_text_from_pdf(pdf_path):
    """Extract text from PDF resume"""
    try:
        pdf_reader = PdfReader(pdf_path)
        resume_text = ""
        
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
        
        # If text extraction failed, try converting PDF to images
        if not resume_text.strip():
            resume_text = extract_text_from_pdf_via_image(pdf_path)
        
        return resume_text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return "Resume content could not be extracted"

def extract_text_from_pdf_via_image(pdf_path):
    """Extract text from PDF by converting to image and using Gemini Vision"""
    try:
        images = convert_from_path(pdf_path, first_page=1, last_page=1)
        if images:
            temp_image_path = pdf_path.replace('.pdf', '_page1.jpg')
            images[0].save(temp_image_path, 'JPEG')
            text = extract_text_from_image(temp_image_path)
            os.remove(temp_image_path)
            return text
        return "Resume content could not be extracted"
    except Exception as e:
        print(f"Error extracting text from PDF via image: {e}")
        return "Resume content could not be extracted"

def extract_text_from_image(image_path):
    """Extract text from image using Gemini Vision"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        Extract and return ALL text content from this resume image.
        Include: name, contact information, skills, experience, education, projects, etc.
        Return the text in a clear, structured format.
        """
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
        
        return response.text.strip()
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return "Resume content could not be extracted"

def generate_questions_from_pdf(pdf_path):
    """Generate interview questions from PDF resume using Gemini"""
    try:
        # Extract text from PDF
        pdf_reader = PdfReader(pdf_path)
        resume_text = ""
        
        for page in pdf_reader.pages:
            resume_text += page.extract_text() + "\n"
        
        # If text extraction failed, try converting PDF to images
        if not resume_text.strip():
            # Convert first page to image and use vision API
            images = convert_from_path(pdf_path, first_page=1, last_page=1)
            if images:
                # Save first page as image and use vision API
                temp_image_path = pdf_path.replace('.pdf', '_page1.jpg')
                images[0].save(temp_image_path, 'JPEG')
                questions = generate_questions_from_resume(temp_image_path)
                os.remove(temp_image_path)
                return questions
        
        # Use Gemini with extracted text
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Analyze this resume and generate 5 interview questions:
        - 3 behavioral questions (about leadership, teamwork, problem-solving)
        - 2 technical questions (related to the person's skills and experience)
        
        Resume content:
        {resume_text}
        
        Return the questions as a JSON array of strings.
        Focus on the person's experience, skills, and background shown in the resume.
        """
        
        response = model.generate_content(prompt)
        
        # Parse the response to extract questions
        questions_text = response.text.strip()
        
        # Try to extract JSON array from the response
        if questions_text.startswith('[') and questions_text.endswith(']'):
            questions = json.loads(questions_text)
        else:
            # Fallback: split by lines and clean up
            questions = [q.strip('- ').strip() for q in questions_text.split('\n') if q.strip()]
            questions = [q for q in questions if q and not q.startswith('[') and not q.startswith('{')]
        
        # Ensure we have exactly 5 questions
        if len(questions) < 5:
            questions.extend([
                "Tell me about a challenging project you worked on.",
                "How do you handle tight deadlines?",
                "Describe a time you had to learn something new quickly.",
                "What's your approach to debugging complex issues?",
                "How do you stay updated with new technologies?"
            ][:5-len(questions)])
        
        return questions[:5]
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        # Fallback questions if PDF processing fails
        return [
            "Tell me about yourself and your background.",
            "Describe a challenging project you worked on.",
            "How do you handle working in a team?",
            "What's your experience with [relevant technology]?",
            "How do you approach problem-solving?"
        ]

def generate_questions_from_resume(image_path):
    """Generate interview questions from resume using Gemini Vision"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = """
        Analyze this resume and generate 5 interview questions:
        - 3 behavioral questions (about leadership, teamwork, problem-solving)
        - 2 technical questions (related to the person's skills and experience)
        
        Return the questions as a JSON array of strings.
        Focus on the person's experience, skills, and background shown in the resume.
        """
        
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
        
        # Parse the response to extract questions
        questions_text = response.text.strip()
        
        # Try to extract JSON array from the response
        if questions_text.startswith('[') and questions_text.endswith(']'):
            questions = json.loads(questions_text)
        else:
            # Fallback: split by lines and clean up
            questions = [q.strip('- ').strip() for q in questions_text.split('\n') if q.strip()]
            questions = [q for q in questions if q and not q.startswith('[') and not q.startswith('{')]
        
        # Ensure we have exactly 5 questions
        if len(questions) < 5:
            questions.extend([
                "Tell me about a challenging project you worked on.",
                "How do you handle tight deadlines?",
                "Describe a time you had to learn something new quickly.",
                "What's your approach to debugging complex issues?",
                "How do you stay updated with new technologies?"
            ][:5-len(questions)])
        
        return questions[:5]
        
    except Exception as e:
        # Fallback questions if Gemini fails
        return [
            "Tell me about yourself and your background.",
            "Describe a challenging project you worked on.",
            "How do you handle working in a team?",
            "What's your experience with [relevant technology]?",
            "How do you approach problem-solving?"
        ]


def generate_elevenlabs_audio(text):
    """Generate audio using Eleven Labs API"""
    try:
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVEN_LABS_VOICE_ID}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": settings.ELEVEN_LABS_API_KEY
        }
        
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code == 200:
            return response.content
        else:
            print(f"Eleven Labs API error: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error generating Eleven Labs audio: {e}")
        return None


# ==================== DSA Interview Endpoints ====================

@api_view(['POST'])
def generate_behavioral_report(request):
    """POST /api/generate-behavioral-report/ - Generate report for first 5 behavioral questions"""
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        
        # Load service from state
        service = InterviewLLMService.from_dict(session.service_state)
        
        # Generate behavioral feedback
        feedback = generate_enhanced_final_feedback(service, session)
        
        # Save feedback as behavioral report
        session.behavioral_report = feedback
        session.save()
        
        return Response({
            'session_id': str(session.id),
            'behavioral_report': feedback,
            'message': 'Behavioral report generated successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to generate behavioral report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def get_dsa_question_endpoint(request):
    """POST /api/get-dsa-question/ - Get a DSA question for coding interview"""
    serializer = DSAQuestionRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        role = serializer.validated_data.get('role', session.role or 'general')
        difficulty = serializer.validated_data.get('difficulty', 'medium')
        
        # Generate DSA question
        question = get_dsa_question(role=role, difficulty=difficulty)
        
        # Save question to session
        session.dsa_question = question
        session.save()
        
        return Response({
            'session_id': str(session.id),
            'question': question
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to get DSA question: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def submit_pseudocode(request):
    """POST /api/submit-pseudocode/ - Submit pseudocode and start analysis conversation"""
    serializer = PseudocodeSubmitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        pseudocode = serializer.validated_data['pseudocode']
        
        # Save pseudocode to session
        session.dsa_pseudocode = pseudocode
        
        # Start analysis
        question = session.dsa_question
        role = session.role or 'general'
        difficulty = question.get('difficulty', 'medium')
        
        result = analyze_pseudocode_initial(pseudocode, question, role=role, difficulty=difficulty)
        
        # Save session index
        session.dsa_session_idx = result['session_idx']
        session.save()
        
        return Response({
            'session_id': str(session.id),
            'interviewer_question': result['interviewer_question'],
            'is_closing': result['is_closing']
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to submit pseudocode: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def continue_pseudocode_conversation(request):
    """POST /api/continue-pseudocode/ - Continue pseudocode analysis conversation"""
    serializer = PseudocodeReplySerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        reply = serializer.validated_data['reply']
        
        if session.dsa_session_idx < 0:
            return Response(
                {'error': 'No active DSA session found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Continue conversation
        result = continue_pseudocode_analysis(session.dsa_session_idx, reply)
        
        return Response({
            'session_id': str(session.id),
            'interviewer_question': result['interviewer_question'],
            'is_closing': result['is_closing'],
            'ended_by': result.get('ended_by')
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to continue conversation: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def get_combined_final_report(request):
    """POST /api/get-combined-report/ - Get combined report (behavioral + DSA)"""
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        
        # Generate DSA report
        if session.dsa_session_idx >= 0:
            dsa_report = dsa_final_report(session.dsa_session_idx, return_dict=True)
            session.dsa_report = dsa_report
        else:
            dsa_report = {}
        
        # Get behavioral report (should already be generated)
        behavioral_report = session.behavioral_report or {}
        
        # Combine reports
        combined_report = {
            'behavioral_interview': behavioral_report,
            'dsa_interview': dsa_report,
            'overall_recommendation': determine_overall_recommendation(behavioral_report, dsa_report)
        }
        
        # Save combined report
        session.report = combined_report
        session.save()
        
        return Response({
            'session_id': str(session.id),
            'report': combined_report
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response(
            {'error': f'Failed to generate combined report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def determine_overall_recommendation(behavioral_report, dsa_report):
    """Determine overall hire recommendation based on both reports"""
    # Get behavioral recommendation
    behavioral_rec = behavioral_report.get('recommendation', 'No Hire')
    behavioral_score = behavioral_report.get('overall_score', 0)
    
    # Get DSA recommendation
    dsa_rec = dsa_report.get('hire_recommendation', 'no')
    
    # Convert DSA recommendation to match behavioral format
    dsa_rec_normalized = 'Hire' if dsa_rec == 'yes' else ('Maybe' if dsa_rec == 'maybe' else 'No Hire')
    
    # Combine recommendations
    if behavioral_rec == 'Hire' and dsa_rec_normalized == 'Hire':
        return 'Strong Hire'
    elif behavioral_rec == 'Hire' or dsa_rec_normalized == 'Hire':
        if behavioral_rec == 'No Hire' or dsa_rec_normalized == 'No Hire':
            return 'Maybe'
        return 'Hire'
    elif behavioral_rec == 'Maybe' and dsa_rec_normalized == 'Maybe':
        return 'Maybe'
    elif behavioral_rec == 'Maybe' or dsa_rec_normalized == 'Maybe':
        return 'Maybe'
    else:
        return 'No Hire'


# Report API Endpoints
@api_view(['GET'])
def get_all_reports(request):
    """Get all interview reports for recruiter dashboard"""
    try:
        reports = InterviewReport.objects.all()
        serializer = InterviewReportSerializer(reports, many=True)
        return Response({
            'success': True,
            'reports': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_report_by_id(request, report_id):
    """Get a specific report by ID"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        serializer = InterviewReportSerializer(report)
        return Response({
            'success': True,
            'report': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def create_report(request):
    """Create a new interview report"""
    try:
        serializer = ReportCreateSerializer(data=request.data)
        if serializer.is_valid():
            # Get the session
            session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
            
            # Extract report data
            report_data = serializer.validated_data['report_data']
            
            # Calculate overall score and rating
            overall_score = report_data.get('overall_score', 0)
            if overall_score >= 90:
                overall_rating = 'Excellent'
            elif overall_score >= 80:
                overall_rating = 'Good'
            elif overall_score >= 70:
                overall_rating = 'Average'
            else:
                overall_rating = 'Below Average'
            
            # Extract strengths and areas for improvement
            strengths = report_data.get('strengths', [])
            areas_for_improvement = report_data.get('areas_for_improvement', [])
            
            # Create the report
            report = InterviewReport.objects.create(
                session=session,
                candidate_name=serializer.validated_data['candidate_name'],
                candidate_email=serializer.validated_data['candidate_email'],
                position=serializer.validated_data['position'],
                overall_score=overall_score,
                overall_rating=overall_rating,
                strengths=strengths,
                areas_for_improvement=areas_for_improvement,
                report_data=report_data
            )
            
            response_serializer = InterviewReportSerializer(report)
            return Response({
                'success': True,
                'report': response_serializer.data
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def get_dashboard_statistics(request):
    """Get statistics for recruiter dashboard"""
    try:
        reports = InterviewReport.objects.all()
        
        total_interviews = reports.count()
        
        if total_interviews > 0:
            average_score = round(sum(r.overall_score for r in reports) / total_interviews)
            excellent_candidates = reports.filter(overall_rating='Excellent').count()
            good_candidates = reports.filter(overall_rating='Good').count()
            average_candidates = reports.filter(overall_rating='Average').count()
        else:
            average_score = 0
            excellent_candidates = 0
            good_candidates = 0
            average_candidates = 0
        
        return Response({
            'success': True,
            'statistics': {
                'total_interviews': total_interviews,
                'average_score': average_score,
                'excellent_candidates': excellent_candidates,
                'good_candidates': good_candidates,
                'average_candidates': average_candidates
            }
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
def delete_report(request, report_id):
    """Delete a report by ID"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        report.delete()
        return Response({
            'success': True,
            'message': 'Report deleted successfully'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
def update_report_decision(request, report_id):
    """Update recruiter decision for a report (Pending/Accepted/Declined)"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        serializer = ReportDecisionSerializer(data=request.data)
        if serializer.is_valid():
            decision = serializer.validated_data['decision']
            report.decision = decision
            report.save(update_fields=['decision', 'updated_at'])
            
            # Send email if decision is "Accepted"
            email_sent = False
            email_message = ""
            if decision == 'Accepted':
                try:
                    success, message = email_service.send_email(
                        candidate_name=report.candidate_name,
                        candidate_email=report.candidate_email,
                        position=report.position,
                        report_data=report.report_data
                    )
                    email_sent = success
                    email_message = message
                    if success:
                        print(f"✅ Email sent to {report.candidate_email}")
                    else:
                        print(f"❌ Failed to send email: {message}")
                except Exception as e:
                    print(f"❌ Email service error: {str(e)}")
                    email_message = f"Email service error: {str(e)}"
            
            return Response({
                'success': True,
                'report': InterviewReportSerializer(report).data,
                'email_sent': email_sent,
                'email_message': email_message
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

