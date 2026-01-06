from django.contrib import admin
from .models import JobDescription, InterviewReport

@admin.register(JobDescription)
class JobDescriptionAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at']
    ordering = ['-created_at']

@admin.register(InterviewReport)
class InterviewReportAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'candidate_name', 'position', 'job_description', 
        'overall_score', 'overall_rating', 'decision', 'interview_date', 'created_at'
    ]
    list_filter = ['decision', 'overall_rating', 'job_description', 'interview_date', 'created_at']
    search_fields = ['candidate_name', 'candidate_email', 'position', 'job_description__title']
    readonly_fields = ['id', 'created_at', 'updated_at', 'interview_date']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Job Information', {
            'fields': ('job_description', 'position')
        }),
        ('Candidate Information', {
            'fields': ('candidate_name', 'candidate_email', 'resume_text')
        }),
        ('Interview Results', {
            'fields': ('overall_score', 'overall_rating', 'decision', 'strengths', 'areas_for_improvement')
        }),
        ('Interview Data', {
            'fields': ('conversation', 'behavioral_report', 'report_data'),
            'classes': ('collapse',)
        }),
        ('DSA Interview', {
            'fields': ('dsa_question', 'dsa_pseudocode', 'dsa_session_idx', 'dsa_report'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('id', 'interview_date', 'created_at', 'updated_at')
        }),
    )
