from django.db import models
import uuid

# ==================== Constants ====================
# Color constants
COLOR_GREEN = '#10b981'
COLOR_GOLD = '#d4af37'
COLOR_ORANGE = '#f59e0b'
COLOR_RED = '#ef4444'
COLOR_GRAY = '#9ca3af'
COLOR_GRAY_DARK = '#6b7280'

# Score thresholds
SCORE_EXCELLENT = 90
SCORE_GOOD = 80
SCORE_AVERAGE = 70

# Rating values
RATING_EXCELLENT = 'Excellent'
RATING_GOOD = 'Good'
RATING_AVERAGE = 'Average'
RATING_BELOW_AVERAGE = 'Below Average'

# Decision values
DECISION_PENDING = 'Pending'
DECISION_ACCEPTED = 'Accepted'
DECISION_DECLINED = 'Declined'

# Default values
DEFAULT_CANDIDATE_NAME = 'Anonymous Candidate'
DEFAULT_CANDIDATE_EMAIL = 'ashkalbhattaarkar@gmail.com'
DEFAULT_POSITION = 'Software Engineer'
DEFAULT_DSA_SESSION_IDX = -1

# ==================== Models ====================

class JobDescription(models.Model):
    """Job descriptions available for interviews"""
    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title

class InterviewReport(models.Model):
    """Stores interview reports linked to job descriptions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Job-related
    job_description = models.ForeignKey(JobDescription, on_delete=models.CASCADE, related_name='reports', null=True, blank=True)
    
    # Candidate Information
    candidate_name = models.CharField(max_length=200, default=DEFAULT_CANDIDATE_NAME)
    candidate_email = models.EmailField(default=DEFAULT_CANDIDATE_EMAIL)
    position = models.CharField(max_length=200, default=DEFAULT_POSITION)
    resume_text = models.TextField(blank=True, help_text="Extracted resume text")
    
    # Interview Report
    overall_score = models.IntegerField(default=0, help_text="Overall interview score (0-100)")
    overall_rating = models.CharField(max_length=50, default=RATING_AVERAGE, help_text="Excellent/Good/Average/Below Average")
    decision = models.CharField(max_length=20, default=DECISION_PENDING, help_text="Pending/Accepted/Declined")
    strengths = models.JSONField(default=list, help_text="List of candidate strengths")
    areas_for_improvement = models.JSONField(default=list, help_text="List of areas for improvement")
    report_data = models.JSONField(default=dict, help_text="Complete interview report data")
    behavioral_report = models.JSONField(default=dict, help_text="Behavioral interview report (first 5 questions)")
    
    # Conversation
    conversation = models.JSONField(default=list, help_text="Complete interview conversation (questions and answers)")
    
    # DSA
    dsa_question = models.JSONField(default=dict, help_text="DSA question from ask_ques_get_ans")
    dsa_pseudocode = models.TextField(blank=True, help_text="User's pseudocode submission")
    dsa_session_idx = models.IntegerField(default=DEFAULT_DSA_SESSION_IDX, help_text="Index in ANALYSIS_LOG")
    dsa_report = models.JSONField(default=dict, help_text="DSA interview report")
    
    # Metadata
    interview_date = models.DateField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report for {self.candidate_name} - {self.position} ({self.overall_rating})"
    
    def _update_field(self, field_name, value):
        """Helper method to update a field and save"""
        setattr(self, field_name, value)
        self.save()
    
    def update_conversation(self, conversation_data):
        """Update the interview conversation"""
        self._update_field('conversation', conversation_data)
    
    def add_report(self, report_data):
        """Add AI analysis report to the report"""
        self._update_field('report_data', report_data)
    
    @property
    def score_color(self):
        """Return color based on score"""
        if self.overall_score >= SCORE_EXCELLENT:
            return COLOR_GREEN
        elif self.overall_score >= SCORE_GOOD:
            return COLOR_GOLD
        elif self.overall_score >= SCORE_AVERAGE:
            return COLOR_ORANGE
        return COLOR_RED
    
    @property
    def rating_color(self):
        """Return color based on rating"""
        rating_colors = {
            RATING_EXCELLENT: COLOR_GREEN,
            RATING_GOOD: COLOR_GOLD,
            RATING_AVERAGE: COLOR_ORANGE,
            RATING_BELOW_AVERAGE: COLOR_RED
        }
        return rating_colors.get(self.overall_rating, COLOR_GRAY_DARK)

    @property
    def decision_color(self):
        """Return color based on recruiter decision"""
        decision_colors = {
            DECISION_ACCEPTED: COLOR_GREEN,
            DECISION_DECLINED: COLOR_RED,
            DECISION_PENDING: COLOR_GRAY
        }
        return decision_colors.get(self.decision, COLOR_GRAY)
