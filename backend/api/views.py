from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.http import HttpResponse
import json
import logging
import traceback
import uuid
import datetime
import base64
from google import genai
from rest_framework.views import APIView

from .models import JobDescription, InterviewReport
from .serializers import (
    JobDescriptionSerializer, 
    InterviewReportSerializer,
    ReportDecisionSerializer
)

# Import utilities
from .utils.behavioral_interview import InterviewLLMService
from .utils.dsa_interview import (
    analyze_pseudocode_initial,
    continue_pseudocode_analysis,
    final_report as dsa_final_report
)
from .utils.get_transcript import run_evaluation_stage
from .utils.resume import (
    ResumeParser)
from .utils.audio import generate_elevenlabs_audio
from .utils.scoring import (
    score_to_rating,
    calculate_overall_score,
    determine_overall_recommendation
)
from .utils.feedback import generate_enhanced_final_feedback
from .utils.email_service import email_service
from .utils.evaluate_interview import evaluate_candidate

logger = logging.getLogger(__name__)

# ==================== Helper Functions ====================

def validate_serializer(serializer):
    """Validate serializer and return error response if invalid"""
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return None

def error_response(message, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, log_error=True):
    """Create standardized error response"""
    if log_error:
        logger.error(f"{message}: {traceback.format_exc()}")
    return Response({'error': message}, status=status_code)

def success_response(data, status_code=status.HTTP_200_OK):
    """Create standardized success response"""
    return Response(data, status=status_code)

def get_report(report_id):
    """Get interview report by ID"""
    return get_object_or_404(InterviewReport, id=report_id)

def validate_uuid(value, field_name='report_id'):
    """Validate UUID format"""
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError):
        raise ValueError(f'Invalid {field_name} format')

def get_required_field(data, field_name, field_type=str):
    """Get required field from request data with type validation"""
    value = data.get(field_name)
    if value is None:
        raise ValueError(f'{field_name} is required')
    if field_type == int:
        try:
            return int(value)
        except (ValueError, TypeError):
            raise ValueError(f'{field_name} must be an integer')
    return field_type(value)

def get_optional_field(data, field_name, default=None, field_type=str):
    """Get optional field from request data with type validation"""
    value = data.get(field_name, default)
    if value is None:
        return default
    if field_type == int:
        try:
            return int(value) if value else default
        except (ValueError, TypeError):
            return default
    return field_type(value) if value else default

@api_view(['GET'])
def job_description_list(request):
    """GET /api/job-descriptions/ - List available job descriptions"""
    job_descriptions = JobDescription.objects.all()
    serializer = JobDescriptionSerializer(job_descriptions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def upload_resume(request):
    """POST /api/upload-resume/ - Upload resume and initialize turn-by-turn interview"""
    # Validate required fields
    if 'resume_image' not in request.FILES:
        return Response(
            {'error': 'resume_image is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if 'job_description_id' not in request.data:
        return Response(
            {'error': 'job_description_id is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    resume_file = request.FILES['resume_image']
    
    # --- SECURITY CHECK 1: File Size ---
    # Use 5MB limit as per the provided code pattern
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
    if resume_file.size > MAX_FILE_SIZE:
        return Response(
            {'error': 'File too large (Max 5MB)'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # --- SECURITY CHECK 2: Magic Bytes (PDF validation) ---
    # Read first 4 bytes to ensure it's actually a PDF (%PDF)
    header = resume_file.read(4)
    resume_file.seek(0)  # Reset cursor to start!
    if header != b'%PDF':
        return Response(
            {'error': 'Not a valid PDF file'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate job_description_id
    try:
        job_description_id = int(request.data['job_description_id'])
    except (ValueError, TypeError):
        return Response(
            {'error': 'job_description_id must be a valid integer'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        job_description = get_object_or_404(JobDescription, id=job_description_id)
        report = InterviewReport.objects.create(
            job_description=job_description,
            position=job_description.title,
            candidate_name='Anonymous Candidate'
        )
        
        # --- PARSING ---
        # Read file into memory (RAM) instead of saving to disk
        file_bytes = resume_file.read()
        
        # Use ResumeParser to extract text from bytes
        parser = ResumeParser()
        result = parser.extract(file_bytes=file_bytes)
        
        if "error" in result:
            return error_response(f'Failed to extract text from PDF: {result["error"]}', log_error=False)
        
        resume_text = result.get("text", "")
        if not resume_text.strip():
            return error_response('Resume content could not be extracted', log_error=False)
        
        report.resume_text = resume_text
        report.save()
        
        return success_response({
            'report_id': str(report.id),
            'resume_text': resume_text
        })
    except Exception as e:
        return error_response(f'Failed to upload resume: {str(e)}')

# ==================== DSA Interview Endpoints ====================

@api_view(['POST'])
def generate_behavioral_report(request):
    """POST /api/generate-behavioral-report/ - Generate report for first 5 behavioral questions"""
    try:
        report_id = validate_uuid(get_required_field(request.data, 'report_id'))
        report = get_report(report_id)
        
        # Handle optional audio file
        if 'audio' in request.FILES:
            audio_file = request.FILES.get('audio')
            audio_bytes = audio_file.read()
            transcript = run_evaluation_stage(audio_bytes, report.job_description.description)
            print(transcript)
            report.transcript = transcript
            evaluations = evaluate_candidate(report.job_description.description, report.resume_text, transcript)
            print(evaluations)
            report.save()
            
            return success_response({
                'report_id': str(report.id),
                'transcript': transcript,
                'evaluations': evaluations
            })
        else:
            return error_response('audio file is required', status.HTTP_400_BAD_REQUEST, log_error=False)
    except ValueError as e:
        return error_response(str(e), status.HTTP_400_BAD_REQUEST, log_error=False)
    except Exception as e:
        return error_response(f'Failed to generate behavioral report: {str(e)}')

            
            


@api_view(['POST'])
def submit_pseudocode(request):
    """POST /api/submit-pseudocode/ - Submit pseudocode and start analysis conversation"""
    try:
        report_id = validate_uuid(get_required_field(request.data, 'report_id'))
        report = get_report(report_id)
        pseudocode = get_required_field(request.data, 'pseudocode')
        report.dsa_pseudocode = pseudocode
        
        question = report.dsa_question
        role = report.position or 'general'
        difficulty = question.get('difficulty', 'medium') if question else 'medium'
        
        result = analyze_pseudocode_initial(pseudocode, question, role=role, difficulty=difficulty)
        report.dsa_session_idx = result['session_idx']
        report.save()
        
        return success_response({
            'report_id': str(report.id),
            'interviewer_question': result['interviewer_question'],
            'is_closing': result['is_closing']
        })
    except ValueError as e:
        return error_response(str(e), status.HTTP_400_BAD_REQUEST, log_error=False)
    except Exception as e:
        return error_response(f'Failed to submit pseudocode: {str(e)}')


@api_view(['POST'])
def continue_pseudocode_conversation(request):
    """POST /api/continue-pseudocode/ - Continue pseudocode analysis conversation"""
    try:
        report_id = validate_uuid(get_required_field(request.data, 'report_id'))
        report = get_report(report_id)
        reply = get_required_field(request.data, 'reply')
        
        if report.dsa_session_idx < 0:
            return error_response('No active DSA session found', status.HTTP_400_BAD_REQUEST, log_error=False)
        
        result = continue_pseudocode_analysis(report.dsa_session_idx, reply)
        return success_response({
            'report_id': str(report.id),
            'interviewer_question': result['interviewer_question'],
            'is_closing': result['is_closing'],
            'ended_by': result.get('ended_by')
        })
    except ValueError as e:
        return error_response(str(e), status.HTTP_400_BAD_REQUEST, log_error=False)
    except Exception as e:
        return error_response(f'Failed to continue conversation: {str(e)}')


@api_view(['POST'])
def get_combined_final_report(request):
    """POST /api/get-combined-report/ - Get combined report (behavioral + DSA)"""
    try:
        report_id = validate_uuid(get_required_field(request.data, 'report_id'))
        report = get_report(report_id)
        
        dsa_report = {}
        if report.dsa_session_idx >= 0:
            dsa_report = dsa_final_report(report.dsa_session_idx, return_dict=True)
            report.dsa_report = dsa_report
        
        behavioral_report = report.behavioral_report or {}
        combined_report = {
            'behavioral_interview': behavioral_report,
            'dsa_interview': dsa_report,
            'overall_recommendation': determine_overall_recommendation(behavioral_report, dsa_report)
        }
        
        # Update report with combined data
        behavioral_score = behavioral_report.get('overall_score', 0)
        dsa_score = dsa_report.get('overall_score', 0) if dsa_report else 0
        overall_score = calculate_overall_score(behavioral_score, dsa_score)
        
        report.overall_score = overall_score
        report.overall_rating = score_to_rating(overall_score)
        report.strengths = behavioral_report.get('strengths', [])
        report.areas_for_improvement = behavioral_report.get('areas_for_improvement', [])
        report.report_data = combined_report
        report.save()
        
        combined_report['report_id'] = str(report.id)
        
        return success_response({
            'report_id': str(report.id),
            'report': combined_report
        })
    except ValueError as e:
        return error_response(str(e), status.HTTP_400_BAD_REQUEST, log_error=False)
    except Exception as e:
        return error_response(f'Failed to generate combined report: {str(e)}')




# Report API Endpoints
@api_view(['GET'])
def get_all_reports(request):
    """Get all interview reports for recruiter dashboard"""
    try:
        reports = InterviewReport.objects.all()
        serializer = InterviewReportSerializer(reports, many=True)
        return success_response({
            'success': True,
            'reports': serializer.data
        })
    except Exception as e:
        return error_response(str(e))

@api_view(['GET'])
def get_report_by_id(request, report_id):
    """Get a specific report by ID"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        serializer = InterviewReportSerializer(report)
        return success_response({
            'success': True,
            'report': serializer.data
        })
    except Exception as e:
        return error_response(str(e))

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
            average_score = excellent_candidates = good_candidates = average_candidates = 0
        
        return success_response({
            'success': True,
            'statistics': {
                'total_interviews': total_interviews,
                'average_score': average_score,
                'excellent_candidates': excellent_candidates,
                'good_candidates': good_candidates,
                'average_candidates': average_candidates
            }
        })
    except Exception as e:
        return error_response(str(e))

@api_view(['DELETE'])
def delete_report(request, report_id):
    """Delete a report by ID"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        report.delete()
        return success_response({
            'success': True,
            'message': 'Report deleted successfully'
        })
    except Exception as e:
        return error_response(str(e))

@api_view(['PATCH'])
def update_report_decision(request, report_id):
    """Update recruiter decision for a report (Pending/Accepted/Declined)"""
    try:
        report = get_object_or_404(InterviewReport, id=report_id)
        serializer = ReportDecisionSerializer(data=request.data)
        error = validate_serializer(serializer)
        if error:
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        decision = serializer.validated_data['decision']
        report.decision = decision
        report.save(update_fields=['decision', 'updated_at'])
        
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
                logger.info(f"Email {'sent' if success else 'failed'} to {report.candidate_email}: {message}")
            except Exception as e:
                logger.error(f"Email service error: {str(e)}")
                email_message = f"Email service error: {str(e)}"
        
        return success_response({
            'success': True,
            'report': InterviewReportSerializer(report).data,
            'email_sent': email_sent,
            'email_message': email_message
        })
    except Exception as e:
        return error_response(str(e))


class GetEphemeralTokenView(APIView):
    def get(self, request):
        try:
            client = genai.Client(
                http_options={'api_version': 'v1alpha'}
            )

            # Create token with multiple uses for a conversation session
            # Set expiration time (e.g., 30 minutes from now)
            now = datetime.datetime.now(tz=datetime.timezone.utc)
            expire_time = now + datetime.timedelta(minutes=30)
            new_session_expire_time = now + datetime.timedelta(minutes=1)
            
            token = client.auth_tokens.create(
                config = {
                'uses': 1,  # Allow multiple uses for conversation
                'expire_time': expire_time.isoformat(),
                'new_session_expire_time': new_session_expire_time.isoformat(),
                'http_options': {'api_version': 'v1alpha'},
                }
            )
            
            return Response({"token": token.name})

        except Exception as e:
            return Response({"error": str(e)}, status=500)    


