from django.urls import path
from . import views

urlpatterns = [
    path('job-descriptions/', views.job_description_list, name='job_description_list'),
    path('demos/', views.job_description_list, name='demos_list'),  # Alias for backward compatibility
    path('upload-resume/', views.upload_resume, name='upload_resume'),
    path('get-ephemeral-token/', views.GetEphemeralTokenView.as_view(), name='get_ephemeral_token'),
        
    # DSA interview endpoints
    path('generate-behavioral-report/', views.generate_behavioral_report, name='generate_behavioral_report'),
    # path('get-dsa-question/', views.get_dsa_question_endpoint, name='get_dsa_question'),
    path('submit-pseudocode/', views.submit_pseudocode, name='submit_pseudocode'),
    path('continue-pseudocode/', views.continue_pseudocode_conversation, name='continue_pseudocode'),
    path('get-combined-report/', views.get_combined_final_report, name='get_combined_report'),
    
    # Report endpoints
    path('reports/', views.get_all_reports, name='get_all_reports'),
    path('reports/<uuid:report_id>/', views.get_report_by_id, name='get_report_by_id'),
    path('reports/statistics/', views.get_dashboard_statistics, name='get_dashboard_statistics'),
    path('reports/<uuid:report_id>/delete/', views.delete_report, name='delete_report'),
    path('reports/<uuid:report_id>/decision/', views.update_report_decision, name='update_report_decision'),
]
