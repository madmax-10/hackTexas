# Production Deployment Guide

## Prerequisites

- Python 3.10+
- PostgreSQL database
- Redis (for caching)
- Domain name with SSL certificate

## Environment Variables

Copy `env_production_example.txt` to `.env` and configure:

```bash
cp env_production_example.txt .env
```

Required variables:
- `SECRET_KEY`: Generate with `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- `DATABASE_URL`: PostgreSQL connection string
- `ALLOWED_HOSTS`: Your domain names
- `CORS_ALLOWED_ORIGINS`: Your frontend domain
- API keys for Gemini and ElevenLabs

## Deployment Steps

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Database Setup

```bash
# Create database
createdb ai_interview_coach

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser
```

### 3. Static Files

```bash
python manage.py collectstatic --noinput
```

### 4. Start Server

```bash
# Using gunicorn (recommended)
gunicorn ai_interview_coach.wsgi:application --bind 0.0.0.0:8000 --workers 3

# Or using the deployment script
./deploy.sh
```

## Platform-Specific Deployment

### Heroku

1. Install Heroku CLI
2. Create Heroku app: `heroku create your-app-name`
3. Add PostgreSQL: `heroku addons:create heroku-postgresql:hobby-dev`
4. Add Redis: `heroku addons:create heroku-redis:hobby-dev`
5. Set environment variables: `heroku config:set DJANGO_ENV=production`
6. Deploy: `git push heroku main`

### Render

1. Connect your GitHub repository
2. Set build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
3. Set start command: `gunicorn ai_interview_coach.wsgi:application`
4. Add environment variables in Render dashboard

### DigitalOcean App Platform

1. Connect GitHub repository
2. Set environment variables
3. Configure build and run commands
4. Deploy

## Security Checklist

- [ ] Set `DEBUG=False`
- [ ] Use strong `SECRET_KEY`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS (`SECURE_SSL_REDIRECT=True`)
- [ ] Set secure cookie settings
- [ ] Configure CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable database connection pooling
- [ ] Set up logging
- [ ] Configure file upload limits

## Monitoring

- Set up application monitoring (Sentry, etc.)
- Configure log aggregation
- Monitor database performance
- Set up health checks

## Backup Strategy

- Database backups (automated)
- Static files backup
- Environment variables backup
- Regular security updates
