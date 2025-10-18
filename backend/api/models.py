from django.db import models
import uuid
import json

class Demo(models.Model):
    """Demo interview sessions available for users to select"""
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title

class InterviewSession(models.Model):
    """Stores interview session data including questions, answers, and analysis"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demo = models.ForeignKey(Demo, on_delete=models.CASCADE, related_name='sessions')
    questions = models.JSONField(default=list, help_text="List of generated questions")
    answers = models.JSONField(default=list, help_text="List of user answers")
    report = models.JSONField(default=dict, help_text="AI analysis report")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Session {self.id} - {self.demo.title}"
    
    def add_questions(self, questions_list):
        """Add generated questions to the session"""
        self.questions = questions_list
        self.save()
    
    def add_answers(self, answers_list):
        """Add user answers to the session"""
        self.answers = answers_list
        self.save()
    
    def add_report(self, report_data):
        """Add AI analysis report to the session"""
        self.report = report_data
        self.save()
