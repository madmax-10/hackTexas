from django.urls import path
from . import views

urlpatterns = [
    path('demos/', views.demo_list, name='demo_list'),
    path('upload-resume/', views.upload_resume, name='upload_resume'),
    path('text-to-speech/', views.text_to_speech, name='text_to_speech'),
    
    # Turn-by-turn interview endpoints
    path('submit-answer-and-get-next/', views.submit_answer_and_get_next, name='submit_answer_and_get_next'),
    path('get-final-feedback/', views.get_final_feedback, name='get_final_feedback'),
    
    # DSA interview endpoints
    path('generate-behavioral-report/', views.generate_behavioral_report, name='generate_behavioral_report'),
    path('get-dsa-question/', views.get_dsa_question_endpoint, name='get_dsa_question'),
    path('submit-pseudocode/', views.submit_pseudocode, name='submit_pseudocode'),
    path('continue-pseudocode/', views.continue_pseudocode_conversation, name='continue_pseudocode'),
    path('get-combined-report/', views.get_combined_final_report, name='get_combined_report'),
    
    # Report endpoints
    path('reports/', views.get_all_reports, name='get_all_reports'),
    path('reports/<uuid:report_id>/', views.get_report_by_id, name='get_report_by_id'),
    path('reports/create/', views.create_report, name='create_report'),
    path('reports/statistics/', views.get_dashboard_statistics, name='get_dashboard_statistics'),
    path('reports/<uuid:report_id>/delete/', views.delete_report, name='delete_report'),
    path('reports/<uuid:report_id>/decision/', views.update_report_decision, name='update_report_decision'),
]
