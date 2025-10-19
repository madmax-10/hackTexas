#!/bin/bash
# Production deployment script

echo "🚀 Starting production deployment..."

# Set production environment
export DJANGO_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Run database migrations
echo "🗄️ Running database migrations..."
python manage.py migrate

# Create superuser if needed (optional)
# python manage.py createsuperuser --noinput

# Create logs directory
mkdir -p logs

echo "✅ Production deployment completed!"
echo "🌐 Starting server with gunicorn..."

# Start the server
gunicorn ai_interview_coach.wsgi:application --bind 0.0.0.0:8000 --workers 3
