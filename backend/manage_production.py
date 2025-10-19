#!/usr/bin/env python
"""
Production management script for Django deployment.
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ai_interview_coach.settings")
    os.environ.setdefault("DJANGO_ENV", "production")
    
    django.setup()
    execute_from_command_line(sys.argv)
