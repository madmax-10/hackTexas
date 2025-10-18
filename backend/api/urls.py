from django.urls import path
from . import views

urlpatterns = [
    # Original endpoints
    path('demos/', views.demo_list, name='demo_list'),
    path('upload-resume/', views.upload_resume, name='upload_resume'),
    path('submit-answers/', views.submit_answers, name='submit_answers'),
    path('analyze/', views.analyze_answers, name='analyze_answers'),
    
    # Voice-specific endpoints
    path('upload-voice-answer/', views.upload_voice_answer, name='upload_voice_answer'),
    path('realtime-analysis/', views.get_realtime_analysis, name='realtime_analysis'),
    path('voice-session/<uuid:session_id>/', views.get_voice_session_status, name='voice_session_status'),
]
