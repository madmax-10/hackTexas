from django.contrib import admin
from .models import Demo, InterviewSession

@admin.register(Demo)
class DemoAdmin(admin.ModelAdmin):
    list_display = ['title', 'description', 'created_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description']

@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'demo', 'created_at', 'has_questions', 'has_answers', 'has_report']
    list_filter = ['demo', 'created_at']
    search_fields = ['demo__title']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    def has_questions(self, obj):
        return bool(obj.questions)
    has_questions.boolean = True
    has_questions.short_description = 'Has Questions'
    
    def has_answers(self, obj):
        return bool(obj.answers)
    has_answers.boolean = True
    has_answers.short_description = 'Has Answers'
    
    def has_report(self, obj):
        return bool(obj.report)
    has_report.boolean = True
    has_report.short_description = 'Has Report'
