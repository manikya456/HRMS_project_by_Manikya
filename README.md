# AI-HRMS

AI-HRMS is a full-stack HR management system with a Django REST backend and a React + TypeScript frontend.

## Included modules

- employee management
- attendance
- leave management
- payroll
- performance
- recruitment
- resume screening
- AI interview
- analytics

## Tech stack

- backend: Django, Django REST Framework, PostgreSQL
- frontend: React 19, TypeScript, Vite, Tailwind CSS, Recharts
- auth: JWT
- AI integrations: Ollama, Whisper, browser speech recognition fallback

## Roles

- `ADMIN`
- `SENIOR_MANAGER`
- `HR_RECRUITER`
- `EMPLOYEE`
- `CANDIDATE`

## Project structure

- `backend/` - Django API, models, seed command, AI services
- `frontend/` - React dashboard UI
- `docker-compose.yml` - optional PostgreSQL + Ollama local stack

## Backend setup

1. Go to the backend folder:

```bash
cd backend
```

2. Create and activate a virtual environment if needed:

```powershell
python -m venv venv
venv\Scripts\activate
```

3. Install dependencies:

```powershell
pip install -r requirements.txt
```

4. Copy the env file:

```powershell
Copy-Item .env.example .env
```

5. Make sure PostgreSQL is running and the database matches the backend env:

- database: `hrms_db`
- user: `postgres`
- password: `1234`
- host: `localhost`
- port: `5432`

6. Run migrations:

```powershell
python manage.py migrate
```

7. Seed sample data:

```powershell
python manage.py seed_demo_data
```

8. Start the backend:

```powershell
python manage.py runserver
```

Backend API base URL:

```text
http://127.0.0.1:8000/api
```

## Frontend setup

1. Go to the frontend folder:

```bash
cd frontend
```

2. Install dependencies:

```powershell
npm install
```

3. Copy the env file:

```powershell
Copy-Item .env.example .env
```

4. Start the frontend:

```powershell
npm run dev
```

Frontend app URL:

```text
http://127.0.0.1:5173
```

## Optional Docker stack

`docker-compose.yml` is still useful, so it is kept.

Use it when you want Docker to provide:

- PostgreSQL
- Ollama

Start the optional stack:

```bash
docker compose up -d postgres ollama
```

If you use this, keep your backend `.env` aligned with:

- `POSTGRES_DB=hrms_db`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=1234`
- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `OLLAMA_HOST=http://localhost:11434`

## AI notes

- Resume screening and interview evaluation work without extra frontend setup.
- Browser-based speech recognition is used in the AI interview flow when supported.
- Backend audio transcription may require `ffmpeg` to be installed if recorded audio is being decoded server-side.
- Ollama is optional. If it is not running, the app falls back gracefully in supported places.

## Useful API routes

- `POST /api/auth/register/`
- `POST /api/auth/token/`
- `GET /api/auth/me/`
- `GET /api/core/employees/`
- `GET /api/core/attendance/`
- `GET /api/core/leave/`
- `GET /api/core/payroll/`
- `POST /api/recruitment/interviews/start/`
- `POST /api/recruitment/interviews/{id}/transcribe/`
- `GET /api/analytics/metrics/`

## Current usage notes

- The AI Interview UI is now voice-first and sequential.
- Dashboard attendance and payroll charts use live backend data with UI padding when the database is sparse.
- Sidebar label uses `AI Interview`.
