from rest_framework import serializers
from .models import Demo, InterviewSession

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
    resume_image = serializers.ImageField()
    demo_id = serializers.IntegerField()

class AnswerSubmissionSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    answers = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )

class AnalysisRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
