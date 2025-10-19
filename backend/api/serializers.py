from rest_framework import serializers
from .models import Demo, InterviewSession, InterviewReport

class DemoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Demo
        fields = ['id', 'title', 'description', 'created_at']

class InterviewSessionSerializer(serializers.ModelSerializer):
    demo_title = serializers.CharField(source='demo.title', read_only=True)
    
    class Meta:
        model = InterviewSession
        fields = ['id', 'demo', 'demo_title', 'questions', 'answers', 'report', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ResumeUploadSerializer(serializers.Serializer):
    resume_image = serializers.FileField()  # Changed to FileField to accept both images and PDFs
    demo_id = serializers.IntegerField()
    
    def validate_resume_image(self, value):
        """Validate that the file is either an image or PDF"""
        allowed_types = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
        
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                'Invalid file type. Only JPG, PNG, and PDF files are allowed.'
            )
        
        # Check file size (max 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                'File size must be less than 10MB.'
            )
        
        return value


class AnalysisRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()

class NextQuestionSerializer(serializers.Serializer):
    """Serializer for submitting answer and getting next question"""
    session_id = serializers.UUIDField()
    answer = serializers.CharField(allow_blank=True)


class DSAQuestionRequestSerializer(serializers.Serializer):
    """Serializer for requesting a DSA question"""
    session_id = serializers.UUIDField()
    role = serializers.CharField(default="general", required=False)
    difficulty = serializers.CharField(default="medium", required=False)


class PseudocodeSubmitSerializer(serializers.Serializer):
    """Serializer for submitting pseudocode"""
    session_id = serializers.UUIDField()
    pseudocode = serializers.CharField()


class PseudocodeReplySerializer(serializers.Serializer):
    """Serializer for replying in pseudocode conversation"""
    session_id = serializers.UUIDField()
    reply = serializers.CharField()


class InterviewReportSerializer(serializers.ModelSerializer):
    """Serializer for interview reports"""
    score_color = serializers.ReadOnlyField()
    rating_color = serializers.ReadOnlyField()
    decision_color = serializers.ReadOnlyField()
    
    class Meta:
        model = InterviewReport
        fields = [
            'id', 'session', 'candidate_name', 'candidate_email', 'position',
            'overall_score', 'overall_rating', 'decision', 'strengths', 'areas_for_improvement',
            'report_data', 'interview_date', 'created_at', 'updated_at',
            'score_color', 'rating_color', 'decision_color'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'interview_date']


class ReportCreateSerializer(serializers.Serializer):
    """Serializer for creating a new report"""
    session_id = serializers.UUIDField()
    candidate_name = serializers.CharField(max_length=200, default='Anonymous Candidate')
    candidate_email = serializers.EmailField(default='candidate@example.com')
    position = serializers.CharField(max_length=200, default='Software Engineer')
    report_data = serializers.JSONField()


class ReportDecisionSerializer(serializers.Serializer):
    """Serializer for updating recruiter decision"""
    decision = serializers.ChoiceField(choices=['Pending', 'Accepted', 'Declined'])

