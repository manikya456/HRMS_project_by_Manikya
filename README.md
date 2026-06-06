# AI-HRMS: Intelligent Human Resource Management Platform

AI-HRMS is a production-style Human Resource Management System with:

- Django REST backend
- React 19 + TypeScript frontend
- JWT authentication
- role-based access control
- AI resume screening
- Ollama/Llama 3 chatbot support
- AI voice interview workflow
- payroll, attendance, leave, performance, and analytics modules

## Project Structure

- `backend/` - Django REST API, PostgreSQL models, AI services, seed command
- `frontend/` - React dashboard UI with Tailwind, Recharts, and route-based RBAC

## Roles

- `ADMIN`
- `SENIOR_MANAGER`
- `HR_RECRUITER`
- `EMPLOYEE`
- `CANDIDATE`

## Backend Setup

1. Create a PostgreSQL database named `ai_hrms`.
2. Copy `backend/.env.example` to `backend/.env` and update values if needed.
3. Install dependencies:

```bash
cd backend
pip install -r requirements.txt
```

4. Run migrations:

```bash
python manage.py migrate
```

5. Seed demo data:

```bash
python manage.py seed_demo_data
```

6. Start the backend:

```bash
python manage.py runserver
```

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Copy `frontend/.env.example` to `frontend/.env`.
3. Start the UI:

```bash
npm run dev
```

## Optional Local Stack

If you want PostgreSQL and Ollama managed for you:

```bash
docker compose up -d postgres ollama
```

## API Highlights

- `POST /api/auth/register/`
- `POST /api/auth/token/`
- `GET /api/auth/me/`
- `GET /api/core/employees/`
- `POST /api/core/attendance/check_in/`
- `POST /api/core/leave/{id}/approve/`
- `POST /api/recruitment/evaluations/evaluate/`
- `POST /api/recruitment/chat/ask/`
- `POST /api/recruitment/interviews/start/`
- `GET /api/analytics/metrics/`

## AI Features

- Resume PDF text extraction and skill matching
- Recruiter chatbot scaffold using Ollama Llama 3
- AI voice interview session structure
- AI feedback generation for leave, performance, and company insights

## Notes

- Some frontend pages are currently polished shells wired for the API and can be expanded with live forms and tables.
- The backend AI paths gracefully fall back when Ollama, Whisper, or spaCy are unavailable locally.
