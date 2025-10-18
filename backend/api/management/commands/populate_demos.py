from django.core.management.base import BaseCommand
from api.models import Demo

class Command(BaseCommand):
    help = 'Populate the database with sample demo sessions'

    def handle(self, *args, **options):
        demos_data = [
            {
                'title': 'Software Engineer Interview',
                'description': 'A comprehensive interview session for software engineering positions, covering both technical and behavioral questions.'
            },
            {
                'title': 'Product Manager Interview',
                'description': 'Interview session focused on product management skills, strategy, and leadership capabilities.'
            },
            {
                'title': 'Data Scientist Interview',
                'description': 'Technical interview session covering machine learning, statistics, and data analysis skills.'
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

        for demo_data in demos_data:
            demo, created = Demo.objects.get_or_create(
                title=demo_data['title'],
                defaults={'description': demo_data['description']}
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'Created demo: {demo.title}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'Demo already exists: {demo.title}')
                )

        self.stdout.write(
            self.style.SUCCESS('Successfully populated demo sessions!')
        )
