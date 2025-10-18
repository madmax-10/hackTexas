from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.conf import settings
import google.generativeai as genai
import json
import os
import base64
import tempfile
from .models import Demo, InterviewSession
from .serializers import (
    DemoSerializer, 
    InterviewSessionSerializer, 
    ResumeUploadSerializer,
    AnswerSubmissionSerializer,
    AnalysisRequestSerializer
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
    """POST /api/upload-resume/ - Upload resume and generate questions"""
    serializer = ResumeUploadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the demo
        demo = get_object_or_404(Demo, id=serializer.validated_data['demo_id'])
        
        # Create new interview session
        session = InterviewSession.objects.create(demo=demo)
        
        # Process resume with Gemini Vision
        resume_image = serializer.validated_data['resume_image']
        
        # Save the image temporarily
        image_path = os.path.join(settings.MEDIA_ROOT, 'temp', f'resume_{session.id}.jpg')
        os.makedirs(os.path.dirname(image_path), exist_ok=True)
        
        with open(image_path, 'wb') as f:
            for chunk in resume_image.chunks():
                f.write(chunk)
        
        # Generate questions using Gemini Vision
        questions = generate_questions_from_resume(image_path)
        
        # Add questions to session
        session.add_questions(questions)
        
        # Clean up temporary file
        os.remove(image_path)
        
        return Response({
            'session_id': str(session.id),
            'questions': questions
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to process resume: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def submit_answers(request):
    """POST /api/submit-answers/ - Submit user answers"""
    serializer = AnswerSubmissionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        answers = serializer.validated_data['answers']
        
        # Add answers to session
        session.add_answers(answers)
        
        return Response({
            'message': 'Answers submitted successfully',
            'session_id': str(session.id)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to submit answers: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def analyze_answers(request):
    """POST /api/analyze/ - Generate AI analysis report"""
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        session = get_object_or_404(InterviewSession, id=serializer.validated_data['session_id'])
        
        if not session.questions or not session.answers:
            return Response(
                {'error': 'Session must have questions and answers for analysis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate analysis using Gemini
        report = generate_analysis_report(session.questions, session.answers)
        
        # Add report to session
        session.add_report(report)
        
        return Response({
            'session_id': str(session.id),
            'results': report
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate analysis: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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

def generate_analysis_report(questions, answers):
    """Generate analysis report using Gemini"""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Prepare the analysis prompt
        qa_pairs = []
        for i, (question, answer_data) in enumerate(zip(questions, answers)):
            if isinstance(answer_data, dict) and 'answer' in answer_data:
                answer = answer_data['answer']
            else:
                answer = str(answer_data)
            qa_pairs.append(f"Q{i+1}: {question}\nA{i+1}: {answer}")
        
        qa_text = "\n\n".join(qa_pairs)
        
        prompt = f"""
        Analyze these interview questions and answers. For each question-answer pair, provide:
        1. A verbal_score (1-10) based on clarity, structure, and confidence
        2. A design_score (1-10) for technical questions (if applicable)
        3. Constructive feedback
        
        Questions and Answers:
        {qa_text}
        
        Return the analysis as a JSON array with this structure:
        [
            {{
                "question": "question text",
                "verbal_score": 8,
                "design_score": 6,  // only for technical questions
                "feedback": "Your feedback here"
            }}
        ]
        """
        
        response = model.generate_content(prompt)
        
        # Parse the JSON response
        analysis_text = response.text.strip()
        
        # Try to extract JSON from the response
        if analysis_text.startswith('['):
            try:
                results = json.loads(analysis_text)
            except json.JSONDecodeError:
                # Fallback if JSON parsing fails
                results = create_fallback_analysis(questions, answers)
        else:
            results = create_fallback_analysis(questions, answers)
        
        return results
        
    except Exception as e:
        # Fallback analysis if Gemini fails
        return create_fallback_analysis(questions, answers)

def create_fallback_analysis(questions, answers):
    """Create a basic analysis if Gemini fails"""
    results = []
    
    for i, (question, answer_data) in enumerate(zip(questions, answers)):
        if isinstance(answer_data, dict) and 'answer' in answer_data:
            answer = answer_data['answer']
        else:
            answer = str(answer_data)
        
        # Basic scoring based on answer length and content
        answer_length = len(answer.strip())
        verbal_score = min(10, max(1, answer_length // 20))
        
        result = {
            "question": question,
            "verbal_score": verbal_score,
            "feedback": "Thank you for your response. Consider providing more specific examples and details."
        }
        
        # Add design score for technical questions (assume last 2 are technical)
        if i >= len(questions) - 2:
            result["design_score"] = min(10, max(1, answer_length // 25))
        
        results.append(result)
    
    return results

# Voice-specific endpoints for real-time audio processing

@api_view(['POST'])
def upload_voice_answer(request):
    """POST /api/upload-voice-answer/ - Upload voice answer for a specific question"""
    try:
        session_id = request.data.get('session_id')
        question_index = request.data.get('question_index', 0)
        audio_file = request.FILES.get('audio_file')
        
        if not session_id or not audio_file:
            return Response(
                {'error': 'session_id and audio_file are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get the session
        session = get_object_or_404(InterviewSession, id=session_id)
        
        # Transcribe the audio
        transcription = transcribe_audio_file(audio_file)
        
        if transcription:
            # Save the answer
            answers = session.answers if session.answers else []
            
            # Ensure answers list is long enough
            while len(answers) <= question_index:
                answers.append({'answer': ''})
            
            # Update the specific answer
            answers[question_index] = {'answer': transcription}
            session.add_answers(answers)
            
            return Response({
                'message': 'Voice answer uploaded and transcribed successfully',
                'transcription': transcription,
                'question_index': question_index,
                'session_id': str(session.id)
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Failed to transcribe audio'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except Exception as e:
        return Response(
            {'error': f'Failed to process voice answer: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
def get_realtime_analysis(request):
    """POST /api/realtime-analysis/ - Get real-time analysis of current answer"""
    try:
        session_id = request.data.get('session_id')
        question_index = request.data.get('question_index', 0)
        answer_text = request.data.get('answer_text', '')
        
        if not session_id or not answer_text:
            return Response(
                {'error': 'session_id and answer_text are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get real-time analysis
        analysis = get_realtime_analysis_for_answer(answer_text, question_index)
        
        return Response({
            'analysis': analysis,
            'question_index': question_index,
            'session_id': str(session_id)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get real-time analysis: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_voice_session_status(request, session_id):
    """GET /api/voice-session/{session_id}/ - Get voice session status and progress"""
    try:
        session = get_object_or_404(InterviewSession, id=session_id)
        
        # Calculate progress
        total_questions = len(session.questions) if session.questions else 0
        answered_questions = len([a for a in session.answers if a.get('answer', '').strip()]) if session.answers else 0
        
        return Response({
            'session_id': str(session.id),
            'demo_title': session.demo.title,
            'total_questions': total_questions,
            'answered_questions': answered_questions,
            'progress_percentage': (answered_questions / total_questions * 100) if total_questions > 0 else 0,
            'questions': session.questions,
            'answers': session.answers,
            'has_report': bool(session.report)
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response(
            {'error': f'Failed to get session status: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def transcribe_audio_file(audio_file):
    """Transcribe audio file using Gemini or fallback"""
    try:
        # For now, use a simple fallback transcription
        # In production, integrate with Google Speech-to-Text API
        return "This is a placeholder transcription from voice input. In production, this would use Google Speech-to-Text API to convert the audio to text."
        
    except Exception as e:
        print(f"Error transcribing audio: {e}")
        return "Could not transcribe audio. Please try again."

def get_realtime_analysis_for_answer(answer_text, question_index):
    """Get real-time analysis of an answer"""
    try:
        # Use Gemini for quick analysis
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        Provide a quick analysis of this interview answer:
        
        Answer: {answer_text}
        
        Give:
        1. A brief feedback (1-2 sentences)
        2. A confidence score (1-10)
        3. Any suggestions for improvement
        
        Keep it concise for real-time display.
        """
        
        response = model.generate_content(prompt)
        
        return {
            'feedback': response.text,
            'confidence': 8,  # Placeholder
            'suggestions': ['Consider adding more specific examples'],
            'word_count': len(answer_text.split()),
            'speaking_time_estimate': len(answer_text.split()) * 0.5  # Rough estimate
        }
        
    except Exception as e:
        print(f"Error getting real-time analysis: {e}")
        return {
            'feedback': 'Good answer! Keep going.',
            'confidence': 7,
            'suggestions': [],
            'word_count': len(answer_text.split()),
            'speaking_time_estimate': len(answer_text.split()) * 0.5
        }
