from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import InterviewSession, InterviewReport, Demo
import uuid
import json
from datetime import datetime, timedelta

class Command(BaseCommand):
    help = 'Populate database with sample interview reports'

    def handle(self, *args, **options):
        # Create a demo if it doesn't exist
        demo, created = Demo.objects.get_or_create(
            title="Software Engineering Jobs",
            defaults={
                'description': 'Practice coding and system design questions for software engineering roles'
            }
        )
        
        # Sample report data based on generate_enhanced_final_feedback function
        sample_reports = [
            {
                'candidate_name': 'John Smith',
                'candidate_email': 'john.smith@email.com',
                'position': 'Senior Software Engineer',
                'overall_score': 85,
                'overall_rating': 'Good',
                'strengths': [
                    'Strong technical foundation in relevant areas',
                    'Clear and structured communication style',
                    'Good problem-solving approach',
                    'Demonstrates relevant experience'
                ],
                'areas_for_improvement': [
                    'Could provide more specific examples from past projects',
                    'Should elaborate more on technical implementation details',
                    'Could demonstrate more leadership experience'
                ],
                'report_data': {
                    'overall_score': 8.5,
                    'overall_assessment': 'The candidate demonstrates strong technical knowledge and clear communication skills. They show good problem-solving abilities and provide detailed, structured answers. However, there are some areas where they could be more specific with examples.',
                    'strengths': [
                        'Strong technical foundation in relevant areas',
                        'Clear and structured communication style',
                        'Good problem-solving approach',
                        'Demonstrates relevant experience'
                    ],
                    'areas_for_improvement': [
                        'Could provide more specific examples from past projects',
                        'Should elaborate more on technical implementation details',
                        'Could demonstrate more leadership experience'
                    ],
                    'technical_proficiency': {
                        'score': 8,
                        'comment': 'Shows solid understanding of core concepts and can explain technical topics clearly. Demonstrates good knowledge of relevant technologies and frameworks.'
                    },
                    'communication_skills': {
                        'score': 7,
                        'comment': 'Communicates ideas clearly and structures responses well. Could improve by providing more specific examples and being more concise in some areas.'
                    },
                    'problem_solving': {
                        'score': 8,
                        'comment': 'Shows good analytical thinking and approaches problems systematically. Demonstrates ability to break down complex problems into manageable parts.'
                    },
                    'key_focus_areas': [
                        'Technical depth and specific examples',
                        'Leadership and team collaboration',
                        'Project management experience'
                    ],
                    'recommendation': 'Hire'
                }
            },
            {
                'candidate_name': 'Sarah Johnson',
                'candidate_email': 'sarah.johnson@email.com',
                'position': 'Frontend Developer',
                'overall_score': 92,
                'overall_rating': 'Excellent',
                'strengths': [
                    'Exceptional technical skills in React and modern JavaScript',
                    'Outstanding communication and presentation abilities',
                    'Strong problem-solving and debugging skills',
                    'Excellent attention to detail and code quality'
                ],
                'areas_for_improvement': [
                    'Could benefit from more backend development experience',
                    'Should explore more advanced state management patterns'
                ],
                'report_data': {
                    'overall_score': 9.2,
                    'overall_assessment': 'Outstanding candidate with exceptional technical skills and communication abilities. Demonstrates deep understanding of frontend technologies and shows excellent problem-solving approach.',
                    'strengths': [
                        'Exceptional technical skills in React and modern JavaScript',
                        'Outstanding communication and presentation abilities',
                        'Strong problem-solving and debugging skills',
                        'Excellent attention to detail and code quality'
                    ],
                    'areas_for_improvement': [
                        'Could benefit from more backend development experience',
                        'Should explore more advanced state management patterns'
                    ],
                    'technical_proficiency': {
                        'score': 9,
                        'comment': 'Exceptional understanding of frontend technologies. Demonstrates mastery of React, JavaScript, and modern web development practices.'
                    },
                    'communication_skills': {
                        'score': 9,
                        'comment': 'Outstanding communication skills. Explains complex technical concepts clearly and engages well with the interviewer.'
                    },
                    'problem_solving': {
                        'score': 9,
                        'comment': 'Excellent problem-solving approach. Shows systematic thinking and can debug complex issues effectively.'
                    },
                    'key_focus_areas': [
                        'Backend development exposure',
                        'Advanced state management',
                        'System design knowledge'
                    ],
                    'recommendation': 'Strong Hire'
                }
            },
            {
                'candidate_name': 'Mike Chen',
                'candidate_email': 'mike.chen@email.com',
                'position': 'Full Stack Developer',
                'overall_score': 78,
                'overall_rating': 'Average',
                'strengths': [
                    'Solid understanding of both frontend and backend technologies',
                    'Good problem-solving approach',
                    'Shows willingness to learn and adapt',
                    'Demonstrates practical experience'
                ],
                'areas_for_improvement': [
                    'Needs to improve technical depth in specific areas',
                    'Could benefit from more system design knowledge',
                    'Should work on clearer communication of complex concepts',
                    'Needs more experience with scalable architecture'
                ],
                'report_data': {
                    'overall_score': 7.8,
                    'overall_assessment': 'Candidate shows solid foundation in full-stack development with good practical experience. However, lacks depth in some technical areas and could improve communication of complex concepts.',
                    'strengths': [
                        'Solid understanding of both frontend and backend technologies',
                        'Good problem-solving approach',
                        'Shows willingness to learn and adapt',
                        'Demonstrates practical experience'
                    ],
                    'areas_for_improvement': [
                        'Needs to improve technical depth in specific areas',
                        'Could benefit from more system design knowledge',
                        'Should work on clearer communication of complex concepts',
                        'Needs more experience with scalable architecture'
                    ],
                    'technical_proficiency': {
                        'score': 7,
                        'comment': 'Shows good understanding of full-stack technologies but lacks depth in some areas. Could benefit from more advanced technical knowledge.'
                    },
                    'communication_skills': {
                        'score': 6,
                        'comment': 'Communicates adequately but could improve in explaining complex technical concepts more clearly and concisely.'
                    },
                    'problem_solving': {
                        'score': 8,
                        'comment': 'Good problem-solving approach with systematic thinking. Shows ability to work through problems step by step.'
                    },
                    'key_focus_areas': [
                        'Technical depth and specialization',
                        'System design and architecture',
                        'Communication skills',
                        'Scalable development practices'
                    ],
                    'recommendation': 'Maybe'
                }
            },
            {
                'candidate_name': 'Emily Rodriguez',
                'candidate_email': 'emily.rodriguez@email.com',
                'position': 'Data Scientist',
                'overall_score': 88,
                'overall_rating': 'Good',
                'strengths': [
                    'Strong analytical and statistical skills',
                    'Excellent communication of data insights',
                    'Good understanding of machine learning concepts',
                    'Demonstrates practical experience with data analysis'
                ],
                'areas_for_improvement': [
                    'Could benefit from more experience with big data technologies',
                    'Should explore more advanced ML algorithms',
                    'Needs more experience with production ML systems'
                ],
                'report_data': {
                    'overall_score': 8.8,
                    'overall_assessment': 'Strong candidate with excellent analytical skills and good communication abilities. Shows solid understanding of data science concepts and practical experience.',
                    'strengths': [
                        'Strong analytical and statistical skills',
                        'Excellent communication of data insights',
                        'Good understanding of machine learning concepts',
                        'Demonstrates practical experience with data analysis'
                    ],
                    'areas_for_improvement': [
                        'Could benefit from more experience with big data technologies',
                        'Should explore more advanced ML algorithms',
                        'Needs more experience with production ML systems'
                    ],
                    'technical_proficiency': {
                        'score': 8,
                        'comment': 'Strong technical foundation in data science and statistics. Good understanding of ML concepts and practical applications.'
                    },
                    'communication_skills': {
                        'score': 9,
                        'comment': 'Excellent communication skills. Can explain complex data insights clearly and engage effectively with stakeholders.'
                    },
                    'problem_solving': {
                        'score': 8,
                        'comment': 'Good analytical thinking and problem-solving approach. Shows ability to work with complex datasets and derive meaningful insights.'
                    },
                    'key_focus_areas': [
                        'Big data technologies',
                        'Advanced ML algorithms',
                        'Production ML systems',
                        'Scalable data processing'
                    ],
                    'recommendation': 'Hire'
                }
            },
            {
                'candidate_name': 'David Kim',
                'candidate_email': 'david.kim@email.com',
                'position': 'DevOps Engineer',
                'overall_score': 65,
                'overall_rating': 'Below Average',
                'strengths': [
                    'Basic understanding of cloud platforms',
                    'Shows interest in automation and infrastructure',
                    'Good learning attitude',
                    'Some practical experience with containers'
                ],
                'areas_for_improvement': [
                    'Needs significant improvement in technical depth',
                    'Lacks experience with advanced DevOps practices',
                    'Should improve understanding of system architecture',
                    'Needs more hands-on experience with production systems'
                ],
                'report_data': {
                    'overall_score': 6.5,
                    'overall_assessment': 'Candidate shows basic understanding of DevOps concepts but lacks the technical depth and experience required for the role. Would benefit from more hands-on experience and technical training.',
                    'strengths': [
                        'Basic understanding of cloud platforms',
                        'Shows interest in automation and infrastructure',
                        'Good learning attitude',
                        'Some practical experience with containers'
                    ],
                    'areas_for_improvement': [
                        'Needs significant improvement in technical depth',
                        'Lacks experience with advanced DevOps practices',
                        'Should improve understanding of system architecture',
                        'Needs more hands-on experience with production systems'
                    ],
                    'technical_proficiency': {
                        'score': 5,
                        'comment': 'Basic understanding of DevOps concepts but lacks depth in technical areas. Needs significant improvement in technical skills.'
                    },
                    'communication_skills': {
                        'score': 7,
                        'comment': 'Adequate communication skills but could improve in explaining technical concepts more clearly.'
                    },
                    'problem_solving': {
                        'score': 6,
                        'comment': 'Shows basic problem-solving approach but lacks experience with complex infrastructure challenges.'
                    },
                    'key_focus_areas': [
                        'Technical depth and specialization',
                        'Advanced DevOps practices',
                        'System architecture understanding',
                        'Production system experience'
                    ],
                    'recommendation': 'No Hire'
                }
            }
        ]

        # Create sample interview sessions and reports
        for i, report_data in enumerate(sample_reports):
            # Create a sample interview session
            session = InterviewSession.objects.create(
                demo=demo,
                questions=[
                    "Tell me about yourself and your experience",
                    "Describe a challenging project you worked on",
                    "How do you approach debugging a complex issue?",
                    "Explain your experience with version control",
                    "What's your experience with testing?"
                ],
                answers=[
                    f"Sample answer {i+1} for question 1",
                    f"Sample answer {i+1} for question 2", 
                    f"Sample answer {i+1} for question 3",
                    f"Sample answer {i+1} for question 4",
                    f"Sample answer {i+1} for question 5"
                ],
                report=report_data['report_data'],
                resume_text=f"Sample resume text for {report_data['candidate_name']} with experience in software development...",
                role=report_data['position'],
                service_state={'current_question': 5, 'total_questions': 5},
                current_question_number=5,
                total_questions=5
            )

            # Create the interview report
            InterviewReport.objects.create(
                session=session,
                candidate_name=report_data['candidate_name'],
                candidate_email=report_data['candidate_email'],
                position=report_data['position'],
                overall_score=report_data['overall_score'],
                overall_rating=report_data['overall_rating'],
                strengths=report_data['strengths'],
                areas_for_improvement=report_data['areas_for_improvement'],
                report_data=report_data['report_data'],
                interview_date=timezone.now().date() - timedelta(days=i*2)
            )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {len(sample_reports)} sample interview reports')
        )
