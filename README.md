### AI Interview Coach – Monorepo

An end-to-end interview practice platform. The backend (Django + DRF) powers resume-driven interview flows, DSA conversations, text-to-speech, and a recruiter reporting API. The frontend (React + Vite + Tailwind) provides a polished multi-page UI to run interviews and view reports.

---

## Monorepo Structure

- `backend/` – Django 5 + DRF API
  - `ai_interview_coach/` – project settings, URLs, ASGI/WSGI
  - `api/` – app with models, serializers, views, URLs, management commands
  - `media/` – temp storage for uploaded files
  - `requirements.txt` – Python dependencies
- `frontend/` – React 19 + Vite + Tailwind
  - `src/pages/` – `LandingPage`, `ResumeUpload`, `InterviewPage`, `ReportPage`, `RecruiterDashboard`, `loginpage`
  - `src/services/` – API clients
  - `public/` – static assets

---

## Tech Stack

- **Backend**: Django 5.2, Django REST Framework, CORS Headers
- **AI**: Google Gemini (Text & Vision), pdf2image, PyPDF2
- **TTS**: ElevenLabs HTTP API
- **DB**: SQLite (dev) or PostgreSQL via `dj-database-url` (prod)
- **Frontend**: React 19, Vite, Tailwind CSS

---

## Prerequisites

- Python 3.10+
- Node.js 18+ (or newer)
- Optional: PostgreSQL (for production)

---

## Quick Start (Both Apps)

1) Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Migrate DB and seed demo data
python manage.py migrate
python manage.py populate_demos

# Start API
python manage.py runserver  # http://localhost:8000
```

2) Frontend

```bash
cd frontend
npm install
npm run dev  # http://localhost:5173
```

---

## Environment Variables

Backend reads from `.env` (loaded via `dotenv` and `decouple`). Copy template and set keys:

```bash
cd backend
cp env_example.txt .env
```

Required/optional keys:
- `SECRET_KEY` – Django secret (autofalls back to a dev key)
- `DJANGO_ENV` – set to `production` to switch DB config to `DATABASE_URL`
- `DATABASE_URL` – e.g. `postgresql://user:pass@host:5432/dbname`
- `GEMINI_API_KEY` – Google Generative AI key
- `ELEVEN_LABS_API_KEY` – ElevenLabs API key
- `ELEVEN_LABS_VOICE_ID` – optional, defaults to Rachel

Recruiter email/invite variables (for accept-to-invite):
- `SENDER_EMAIL` – Gmail address to send from
- `SENDER_PASS` – App Password for the Gmail account
- `RECRUITER_NAME` – Display name in the email (optional)
- `MEETING_LINK` – Link included in email (e.g., Google Meet or Calendly)

Frontend configuration: API base URL is typically `http://localhost:8000` and used in `src/services/api.js`.

---

## Backend API

Base URL: `http://localhost:8000/api/`

- Demos
  - `GET /demos/`
- Resume/Interview (turn-by-turn)
  - `POST /upload-resume/`
  - `POST /submit-answer-and-get-next/`
  - `POST /get-final-feedback/`
- DSA Interview
  - `POST /get-dsa-question/`
  - `POST /submit-pseudocode/`
  - `POST /continue-pseudocode/`
  - `POST /get-combined-report/`
- Text-to-Speech
  - `POST /text-to-speech/`
- Reports (Recruiter)
  - `GET /reports/`
  - `GET /reports/{report_id}/`
  - `POST /reports/create/`
  - `GET /reports/statistics/`
  - `DELETE /reports/{report_id}/delete/`
  - `PATCH /reports/{report_id}/decision/`

Content types: JSON for request/response (file uploads for resume image/PDF are multipart).

---

## MVP Specification (Implemented)

### Overview

Web-based mock interview platform where users upload a resume image, receive custom questions, type answers, and get a personalized analysis report using Gemini. Design questions use a text area (no whiteboard).

### Feature 1: Landing Page (Demo Selection)

- UI: Minimal landing page listing demos with title, description, and a Start button.
- Backend:
  - Model: `Demo(title, description)`
  - Endpoint: `GET /api/demos/` → returns all demos
- Flow: `/` → fetch demos → on click go to `/upload?demo_id=<id>`

### Feature 2: Resume Upload

- UI: Upload resume image (png/jpg) → spinner → redirect to interview
- Backend:
  - Endpoint: `POST /api/upload-resume/`
  - Accepts multipart image/PDF, extracts text (PyPDF2/pdf2image/Gemini Vision), initializes an interview session, and generates the first question
- Frontend: Stores `session_id`, role, current question, progresses to `/interview`

### Feature 3: Unified Interview Page

- UI: Shows current question; text area for answer (behavioral and technical). Next advances to the next question.
- Backend:
  - Endpoint: `POST /api/submit-answer-and-get-next/` → evaluates answer, returns next question until final
  - Endpoint: `POST /api/get-final-feedback/` → returns comprehensive JSON feedback

### Feature 4: Unified Analysis Report

- Backend: `POST /api/get-combined-report/` combines behavioral and DSA reports when applicable
- Frontend: `/report` shows per-question feedback, overall assessment/scores

### Summary of Core Endpoints (MVP)

Method | Endpoint | Description
--- | --- | ---
GET | `/api/demos/` | List available demos
POST | `/api/upload-resume/` | Upload resume image/PDF and start session
POST | `/api/submit-answer-and-get-next/` | Submit answer and get next question
POST | `/api/get-final-feedback/` | Get final AI feedback after questions
POST | `/api/get-combined-report/` | Combined behavioral + DSA report (if DSA used)

---

## Recruiter Mode

Recruiters can browse reports, view candidate details, and accept candidates. On Accept, the system drafts and sends an interview invite email with a meeting link.

### UI (Frontend)

- Page: `RecruiterDashboard.jsx`
- Features:
  - List reports with filters and summary stats
  - View detailed report
  - Accept/Decline with a single click

### Backend Endpoints

- `GET /api/reports/` – list all reports
- `GET /api/reports/{report_id}/` – report details
- `POST /api/reports/create/` – create report (typically from interview flow)
- `GET /api/reports/statistics/` – dashboard KPIs
- `DELETE /api/reports/{report_id}/delete/` – remove report
- `PATCH /api/reports/{report_id}/decision/` – update decision; if `Accepted`, triggers email invite

### Email Invite Flow

- Service: `backend/api/email_service.py`
- Drafts a personalized email via Gemini and sends via Gmail SMTP
- Requires env vars: `SENDER_EMAIL`, `SENDER_PASS`, `RECRUITER_NAME`, `MEETING_LINK`
- Meeting link can be a Google Meet, Calendly, or other scheduler link

Example decision payload:

```json
{ "decision": "Accepted" }
```

Successful accept may return:

```json
{
  "success": true,
  "report": { /* ... report data ... */ },
  "email_sent": true,
  "email_message": "Email sent successfully to candidate@example.com"
}
```

Notes:
- Use a Gmail App Password for `SENDER_PASS`.
- Ensure `GEMINI_API_KEY` is set for drafting emails.

---

## Frontend Overview

Pages (`src/pages/`):
- `LandingPage.jsx` – entry point with demo options
- `ResumeUpload.jsx` – upload resume and start interview
- `InterviewPage.jsx` – question flow with feedback
- `ReportPage.jsx` – final report view
- `RecruiterDashboard.jsx` – list and manage reports
- `loginpage.jsx` – basic login UI (if used)

Run commands:
```bash
npm run dev      # local dev
npm run build    # production build (outputs to dist/)
```

---

## Frontend Details

### Setup & Scripts

```bash
cd frontend
npm install

# Development
npm run dev

# Lint
npm run lint

# Production build
npm run build

# Preview production build locally
npm run preview
```

### Environment (Frontend)

If you need a configurable API base URL, create `frontend/.env` and use a Vite var such as:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Then in code (see `src/services/api.js`) read it via `import.meta.env.VITE_API_BASE_URL`.

### Routing (React Router)

The application uses React Router. Typical routes map to:
- `/` → `LandingPage.jsx`
- `/upload` → `ResumeUpload.jsx`
- `/interview` → `InterviewPage.jsx`
- `/report/:id?` → `ReportPage.jsx`
- `/recruiter` → `RecruiterDashboard.jsx`

Check `src/main.jsx` and `src/App.jsx` for the exact route configuration.

### API Services

- `src/services/api.js` – base Axios client and common helpers
- `src/services/reportApiService.js` – recruiter/report-related API wrappers

Ensure the base URL points to the backend API: `http://localhost:8000/api` during local development.

### Styling

- Tailwind CSS 4 is configured via `tailwind.config.js` and PostCSS.
- Global styles in `src/index.css` and `src/App.css`.

### Building for Production

```bash
cd frontend
npm run build
```

The compiled assets will be emitted to `frontend/dist/`. Serve the `dist/` directory with your static server (e.g., Nginx, Vercel, Netlify). If hosting the backend separately, configure CORS and ensure the frontend points to the correct API URL.

### Common Frontend Issues

- Blank page on start: ensure `npm run dev` shows the Vite server and open `http://localhost:5173`.
- CORS errors: confirm backend `CORS_ALLOWED_ORIGINS` includes the frontend origin (see `backend/ai_interview_coach/settings.py`).
- API 404/500: verify routes under `backend/api/urls.py` and that the API base path is `/api/`.

---

## Database & Data

- Default dev DB: SQLite at `backend/db.sqlite3`
- Seed demos: `python manage.py populate_demos`

For production, set `DJANGO_ENV=production` and provide `DATABASE_URL` (Postgres recommended).

---

## Troubleshooting

- CORS errors: ensure backend is running on `http://localhost:8000` and matches `CORS_ALLOWED_ORIGINS` in `backend/ai_interview_coach/settings.py`.
- DB errors: re-run `python manage.py migrate`, re-seed with `populate_demos`.
- Gemini/ElevenLabs: verify API keys in `.env`.
- Port in use: `lsof -i:8000` or `lsof -i:5173`, then kill the process.

---

## Scripts & Utilities

- Management command: `backend/api/management/commands/populate_demos.py`
- Sample data reports: `populate_sample_reports.py`
- DSA helpers: `backend/ask_ques_get_ans.py`
- TTS helpers: `backend/free_tts_handler.py`, `backend/send_email.py`, `backend/api/email_service.py`

---

## Production Notes

- Set `DEBUG=False`, configure `ALLOWED_HOSTS`
- Use Postgres via `DATABASE_URL`
- Serve static files via your web server; configure media storage appropriately

---

## Future Plans

### Proctor Mode with AI Recognition

#### Overview
Advanced proctoring system using computer vision and AI to monitor interview sessions in real-time, ensuring integrity and providing enhanced feedback.

#### Planned Features

**1. Real-time Video Proctoring**
- Live video feed during interviews
- Face detection and tracking
- Eye movement monitoring
- Multiple person detection (anti-cheating)
- Screen sharing detection

**2. AI-Powered Behavior Analysis**
- Attention span analysis
- Confidence level assessment
- Stress/anxiety detection
- Engagement metrics
- Professional demeanor evaluation

**3. Advanced Recognition Systems**
- Voice emotion analysis
- Facial expression recognition
- Body language assessment
- Micro-expression detection
- Real-time feedback on presentation skills

**4. Proctoring Dashboard**
- Live monitoring interface for recruiters
- Real-time alerts for suspicious behavior
- Session recordings with AI annotations
- Comprehensive proctoring reports
- Flagged incidents review system

#### Technical Implementation

**Backend Enhancements**
- WebSocket integration for real-time video streaming
- Computer vision APIs (OpenCV, MediaPipe)
- AI emotion analysis services
- Video storage and processing pipeline
- Real-time alert system

**Frontend Enhancements**
- Video capture and streaming components
- Real-time feedback overlays
- Proctoring dashboard UI
- Session recording interface
- Live monitoring controls

**AI Services Integration**
- Google Vision API for face detection
- Azure Cognitive Services for emotion analysis
- Custom ML models for behavior analysis
- Real-time processing pipelines

#### Security & Privacy
- End-to-end encryption for video streams
- GDPR-compliant data handling
- Secure video storage
- Privacy-preserving AI analysis
- User consent management

#### Expected Timeline
- **Phase 1**: Basic video proctoring (Q2 2024)
- **Phase 2**: AI behavior analysis (Q3 2024)
- **Phase 3**: Advanced recognition features (Q4 2024)
- **Phase 4**: Full proctoring dashboard (Q1 2025)

---

## License

Proprietary or project-specific; update this section as appropriate.


