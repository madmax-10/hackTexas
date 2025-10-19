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
    
    # New fields for turn-by-turn interview
    resume_text = models.TextField(blank=True, help_text="Extracted resume text")
    role = models.CharField(max_length=200, blank=True, help_text="Target job role")
    service_state = models.JSONField(default=dict, help_text="InterviewLLMService state")
    current_question_number = models.IntegerField(default=0, help_text="Current question index")
    total_questions = models.IntegerField(default=5, help_text="Total number of questions")
    
    # DSA interview fields
    dsa_question = models.JSONField(default=dict, help_text="DSA question from ask_ques_get_ans")
    dsa_pseudocode = models.TextField(blank=True, help_text="User's pseudocode submission")
    dsa_session_idx = models.IntegerField(default=-1, help_text="Index in ANALYSIS_LOG")
    dsa_report = models.JSONField(default=dict, help_text="DSA interview report")
    behavioral_report = models.JSONField(default=dict, help_text="Behavioral interview report (first 5 questions)")
    
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
    
    def update_service_state(self, state_dict):
        """Update the InterviewLLMService state"""
        self.service_state = state_dict
        self.save()
    
    def increment_question_number(self):
        """Increment current question number"""
        self.current_question_number += 1
        self.save()

class InterviewReport(models.Model):
    """Stores completed interview reports for recruiter dashboard"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(InterviewSession, on_delete=models.CASCADE, related_name='reports')
    
    # Candidate Information
    candidate_name = models.CharField(max_length=200, default='Anonymous Candidate')
    candidate_email = models.EmailField(default='candidate@example.com')
    position = models.CharField(max_length=200, default='Software Engineer')
    
    # Interview Results
    overall_score = models.IntegerField(default=0, help_text="Overall interview score (0-100)")
    overall_rating = models.CharField(max_length=50, default='Average', help_text="Excellent/Good/Average/Below Average")
    # Recruiter decision
    decision = models.CharField(max_length=20, default='Pending', help_text="Pending/Accepted/Declined")
    
    # Report Data
    strengths = models.JSONField(default=list, help_text="List of candidate strengths")
    areas_for_improvement = models.JSONField(default=list, help_text="List of areas for improvement")
    report_data = models.JSONField(default=dict, help_text="Complete interview report data")
    
    # Metadata
    interview_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report for {self.candidate_name} - {self.position} ({self.overall_rating})"
    
    @property
    def score_color(self):
        """Return color based on score"""
        if self.overall_score >= 90:
            return '#10b981'  # Green
        elif self.overall_score >= 80:
            return '#d4af37'  # Gold
        elif self.overall_score >= 70:
            return '#f59e0b'  # Orange
        else:
            return '#ef4444'  # Red
    
    @property
    def rating_color(self):
        """Return color based on rating"""
        rating_colors = {
            'Excellent': '#10b981',
            'Good': '#d4af37',
            'Average': '#f59e0b',
            'Below Average': '#ef4444'
        }
        return rating_colors.get(self.overall_rating, '#6b7280')

    @property
    def decision_color(self):
        """Return color based on recruiter decision"""
        decision_colors = {
            'Accepted': '#10b981',
            'Declined': '#ef4444',
            'Pending': '#9ca3af'
        }
        return decision_colors.get(self.decision, '#9ca3af')
