from django.core.management.base import BaseCommand
from api.models import JobDescription

class Command(BaseCommand):
    help = 'Populate the database with sample job descriptions'

    def handle(self, *args, **options):
        job_descriptions_data = [
            {
                'title': 'Software Engineering Jobs',
                'description': 'Practice coding and system design questions for software engineering roles'
            },
            {
                'title': 'Product Manager Jobs',
                'description': 'Behavioral and product strategy questions for PM positions'
            },
            {
                'title': 'Data Science Jobs',
                'description': 'Technical and analytical questions for data science roles'
            },
            {
                'title': 'UX Designer Interview',
                'description': 'Interview session for UX/UI design roles, focusing on design thinking and user research.'
            },
            {
                'title': 'DevOps Engineer Interview',
                'description': 'Technical interview session covering infrastructure, automation, and cloud technologies.'
            }
        ]

        for job_data in job_descriptions_data:
            job, created = JobDescription.objects.get_or_create(
                title=job_data['title'],
                defaults={'description': job_data['description']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created job description: {job.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Job description already exists: {job.title}')
                )

        self.stdout.write(
            self.style.SUCCESS('Successfully populated job descriptions!')
        )
