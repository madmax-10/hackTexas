# 🧠 AI Interview Coach - Backend

A Django REST API backend for an AI-powered interview coaching application that generates personalized interview questions from resumes and provides AI analysis of user responses.

## 🚀 Features

- **Demo Session Management**: List available interview demo sessions
- **Resume Analysis**: Upload resume images and get AI-generated questions using Gemini Vision
- **Answer Submission**: Submit text responses to interview questions
- **AI Analysis**: Get detailed feedback and scoring on interview performance
- **Session Tracking**: Track interview sessions with unique UUIDs

## 🛠 Tech Stack

- **Backend**: Django 5.2.7 + Django REST Framework
- **AI**: Google Gemini 2.5 Vision & Text APIs
- **Database**: SQLite (for MVP)
- **Image Processing**: Pillow
- **Environment**: python-decouple

## 📋 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/demos/` | List available demo sessions |
| POST | `/api/upload-resume/` | Upload resume → get AI-generated questions |
| POST | `/api/submit-answers/` | Submit user answers |
| POST | `/api/analyze/` | Generate AI feedback report |

## 🚀 Quick Start

### 1. Setup Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# Copy the example file
cp env_example.txt .env
```

Edit `.env` with your configuration:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key-here
```

**Get your Gemini API key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to get your free API key.

### 3. Database Setup

```bash
# Run migrations
python manage.py migrate

# Populate sample demo sessions
python manage.py populate_demos
```

### 4. Create Superuser (Optional)

```bash
python manage.py createsuperuser
```

### 5. Run Development Server

```bash
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`

## 📖 API Usage Examples

### 1. Get Available Demo Sessions

```bash
curl http://localhost:8000/api/demos/
```

### 2. Upload Resume and Get Questions

```bash
curl -X POST http://localhost:8000/api/upload-resume/ \
  -F "resume_image=@/path/to/resume.jpg" \
  -F "demo_id=1"
```

Response:
```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "questions": [
    "Tell me about a challenging project you worked on.",
    "How do you handle working in a team?",
    "Describe a time you had to learn something new quickly.",
    "What's your experience with Python and Django?",
    "How do you approach debugging complex issues?"
  ]
}
```

### 3. Submit Answers

```bash
curl -X POST http://localhost:8000/api/submit-answers/ \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "123e4567-e89b-12d3-a456-426614174000",
    "answers": [
      {"answer": "I worked on a complex e-commerce platform..."},
      {"answer": "I believe in clear communication and..."},
      {"answer": "When I needed to learn React..."},
      {"answer": "I have 3 years of experience with Python..."},
      {"answer": "I start by reproducing the issue..."}
    ]
  }'
```

### 4. Get Analysis Report

```bash
curl -X POST http://localhost:8000/api/analyze/ \
  -H "Content-Type: application/json" \
  -d '{"session_id": "123e4567-e89b-12d3-a456-426614174000"}'
```

Response:
```json
{
  "session_id": "123e4567-e89b-12d3-a456-426614174000",
  "results": [
    {
      "question": "Tell me about a challenging project you worked on.",
      "verbal_score": 8,
      "feedback": "Good use of STAR method and specific examples."
    },
    {
      "question": "What's your experience with Python and Django?",
      "verbal_score": 7,
      "design_score": 6,
      "feedback": "Good technical knowledge, but could provide more specific examples."
    }
  ]
}
```

## 🗄 Database Models

### Demo
- `id`: Primary key
- `title`: Demo session title
- `description`: Demo session description
- `created_at`: Creation timestamp

### InterviewSession
- `id`: UUID primary key
- `demo`: Foreign key to Demo
- `questions`: JSON field storing generated questions
- `answers`: JSON field storing user answers
- `report`: JSON field storing AI analysis
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp

## 🔧 Admin Interface

Access the Django admin at `http://localhost:8000/admin/` to:
- Manage demo sessions
- View interview sessions
- Monitor session progress
- Access detailed session data

## 🚨 Error Handling

The API includes comprehensive error handling:
- Input validation with detailed error messages
- Fallback questions if Gemini API fails
- Graceful degradation for analysis failures
- Proper HTTP status codes

## 🔒 Security Notes

- Set `DEBUG=False` in production
- Use environment variables for sensitive data
- Implement proper authentication for production use
- Add rate limiting for API endpoints

## 📝 Next Steps

1. **Frontend Integration**: Connect with React frontend
2. **Authentication**: Add user authentication system
3. **File Storage**: Implement cloud storage for resume images
4. **Caching**: Add Redis for better performance
5. **Monitoring**: Add logging and monitoring
6. **Testing**: Add comprehensive test suite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
