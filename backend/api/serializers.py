from rest_framework import serializers
from .models import (
    JobDescription, 
    InterviewReport,
    DECISION_PENDING,
    DECISION_ACCEPTED,
    DECISION_DECLINED
)

# ==================== Constants ====================
ALLOWED_RESUME_TYPES = ['application/pdf']
MAX_RESUME_SIZE = 10 * 1024 * 1024  # 10MB
DECISION_CHOICES = [DECISION_PENDING, DECISION_ACCEPTED, DECISION_DECLINED]

# ==================== Model Serializers ====================

class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = ['id', 'title', 'description', 'created_at']

class InterviewReportSerializer(serializers.ModelSerializer):
    """Serializer for interview reports"""
    score_color = serializers.ReadOnlyField()
    rating_color = serializers.ReadOnlyField()
    decision_color = serializers.ReadOnlyField()
    job_description_title = serializers.CharField(source='job_description.title', read_only=True)
    
    class Meta:
        model = InterviewReport
        fields = [
            'id', 'job_description', 'job_description_title',
            'candidate_name', 'candidate_email', 'position', 'resume_text',
            'overall_score', 'overall_rating', 'decision', 'strengths', 'areas_for_improvement',
            'report_data', 'behavioral_report', 'conversation',
            'dsa_question', 'dsa_pseudocode', 'dsa_session_idx', 'dsa_report',
            'interview_date', 'created_at', 'updated_at',
            'score_color', 'rating_color', 'decision_color'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'interview_date']

# ==================== Request Serializers ====================

class ReportDecisionSerializer(serializers.Serializer):
    """Serializer for updating recruiter decision"""
    decision = serializers.ChoiceField(choices=DECISION_CHOICES)

