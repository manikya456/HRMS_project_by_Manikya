# AI-HRMS

AI-HRMS is a role-based Human Resource Management System designed to manage core HR operations in one platform. It combines standard HR workflows such as employee management, attendance, leave, payroll, performance, recruitment, and analytics with AI-assisted features such as resume screening, AI interview flow, and an HR support chatbot.

The system is built for multiple user roles including admin, HR recruiter, senior manager, and employee, where access and actions are controlled based on responsibility. The goal of the project is to provide a practical HRMS experience with both operational features and modern AI support.

## Project Overview

This project includes:

- employee management
- attendance tracking
- leave request and approval workflows
- payroll management
- performance monitoring
- recruitment workflows
- resume screening
- AI interview experience
- analytics dashboard
- HR chatbot support

## Tech Stack

### Backend

- Django
- Django REST Framework
- PostgreSQL
- JWT authentication

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Recharts

### AI and Retrieval

- OpenAI / Azure OpenAI for answer generation
- ChromaDB for lightweight retrieval
- local embedding fallback through Chroma
- Whisper support for transcription
- browser speech recognition fallback
- Ollama support for selected local AI flows

## AI Features

### Resume Screening

- extracts resume text
- compares resumes against job descriptions
- identifies relevant and missing skills
- generates AI-assisted candidate fit evaluation

### AI Interview

- sequential question-by-question interview flow
- voice-first interaction
- browser-based speech recognition fallback
- automated answer review and scoring
- final interview summary and recommendation

### HR Chatbot

- available across the application for signed-in users
- retrieval-backed answers using ChromaDB
- user-aware responses based on role and HRMS data
- OpenAI-powered final response generation

## User Roles

- `ADMIN`
- `SENIOR_MANAGER`
- `HR_RECRUITER`
- `EMPLOYEE`
- `CANDIDATE`

## Main Modules

- Dashboard
- Employees
- Attendance
- Leave Management
- Payroll
- Performance
- Recruitment
- Resume Screening
- AI Interview
- Analytics
- HR Chatbot

## Project Structure

```text
backend/   Django REST API, business logic, AI services
frontend/  React application and UI
docker-compose.yml  Optional local PostgreSQL and Ollama stack
```

## Getting Started

### Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver
```

Backend API runs at:

```text
http://127.0.0.1:8000/api
```

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Frontend runs at:

```text
http://127.0.0.1:5173
```

## Environment Configuration

Backend configuration is managed through `backend/.env`.

Common settings include:

- database connection
- Django secret key and debug mode
- CORS origins
- OpenAI / Azure OpenAI configuration
- Ollama host and model

Frontend configuration is managed through `frontend/.env`, including the backend API base URL.

## Optional Docker Services

This repository includes `docker-compose.yml` for optional local infrastructure.

```bash
docker compose up -d postgres ollama
```

This is useful when you want:

- PostgreSQL running locally through Docker
- Ollama available for local AI-assisted workflows

## API Overview

Representative endpoints:

- `POST /api/auth/token/`
- `GET /api/auth/me/`
- `GET /api/core/employees/`
- `GET /api/core/attendance/`
- `GET /api/core/leave/`
- `GET /api/core/payroll/`
- `POST /api/core/hr-chat/`
- `POST /api/recruitment/interviews/start/`
- `POST /api/recruitment/interviews/{id}/transcribe/`
- `GET /api/analytics/metrics/`

## Notes

- Some AI-backed features depend on local or cloud model availability.
- Backend audio transcription may require `ffmpeg` when decoding recorded audio server-side.
- The retrieval flow can run with local Chroma embeddings when an OpenAI embedding deployment is not configured.
