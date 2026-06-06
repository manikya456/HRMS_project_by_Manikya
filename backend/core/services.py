from decimal import Decimal
from io import BytesIO
from pathlib import Path
import tempfile
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone

try:
    import ollama
except Exception:  # pragma: no cover
    ollama = None

try:
    import spacy
except Exception:  # pragma: no cover
    spacy = None

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover
    PdfReader = None

try:
    import pyttsx3
except Exception:  # pragma: no cover
    pyttsx3 = None

try:
    import whisper
except Exception:  # pragma: no cover
    whisper = None


def extract_pdf_text(file_obj):
    if PdfReader is None:
        return ""
    try:
        try:
            file_obj.seek(0)
        except Exception:
            pass
        reader = PdfReader(file_obj)
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
        try:
            file_obj.seek(0)
        except Exception:
            pass
        return text
    except Exception:
        return ""


def extract_skills(text):
    skill_bank = {
        "python", "django", "drf", "react", "typescript", "javascript", "aws", "docker",
        "kubernetes", "postgresql", "sql", "nlp", "spaCy", "whisper", "ollama", "fastapi",
    }
    words = {token.strip(".,:;()[]{}").lower() for token in text.split()}
    return sorted({skill for skill in skill_bank if skill.lower() in words or skill.lower() in text.lower()})


def generate_ai_text(prompt, fallback):
    if ollama is None:
        return fallback
    try:
        response = ollama.chat(
            host=getattr(settings, "OLLAMA_HOST", "http://localhost:11434"),
            model=getattr(settings, "OLLAMA_MODEL", "llama3"),
            messages=[
                {"role": "system", "content": "You are an expert HR assistant."},
                {"role": "user", "content": prompt},
            ],
        )
        return response["message"]["content"].strip()
    except Exception:
        return fallback


def calculate_leave_recommendation(employee):
    recent = employee.attendance_records.order_by("-date")[:14]
    if not recent:
        return "Approve Leave"
    present_ratio = sum(1 for record in recent if record.status == "PRESENT") / len(recent)
    return "Reject Leave" if present_ratio < 0.6 else "Approve Leave"


def generate_payroll_pdf(payroll):
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(40, 800, "AI-HRMS Payslip")
    pdf.setFont("Helvetica", 12)
    lines = [
        f"Employee: {payroll.employee.full_name}",
        f"Month: {payroll.month}",
        f"Basic Salary: {payroll.basic_salary}",
        f"Allowances: {payroll.allowances}",
        f"Deductions: {payroll.deductions}",
        f"Tax: {payroll.tax}",
        f"Net Salary: {payroll.net_salary}",
    ]
    y = 760
    for line in lines:
        pdf.drawString(40, y, line)
        y -= 24
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return ContentFile(buffer.read(), name=f"payslip-{payroll.employee.employee_id}-{payroll.month}.pdf")


def calculate_working_hours(check_in, check_out):
    if not check_in or not check_out:
        return Decimal("0.00")
    delta = check_out - check_in
    hours = delta.total_seconds() / 3600
    return Decimal(str(round(max(hours, 0), 2)))


def build_performance_feedback(employee):
    prompt = (
        f"Provide concise performance feedback for {employee.full_name} in {employee.department}. "
        "Include strengths, weaknesses, and improvement suggestions."
    )
    return generate_ai_text(
        prompt,
        "Strong ownership and reliable execution. Improve consistency in task throughput and communication cadence.",
    )


def transcribe_audio(audio_file):
    if whisper is None:
        return "Transcription unavailable locally."
    try:
        suffix = Path(getattr(audio_file, "name", "")).suffix or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            for chunk in audio_file.chunks():
                temp_file.write(chunk)
            temp_path = temp_file.name
        model = whisper.load_model("base")
        result = model.transcribe(temp_path)
        return result.get("text", "").strip()
    except Exception:
        return "Transcription failed. Please retry."
    finally:
        try:
            if "temp_path" in locals() and os.path.exists(temp_path):
                os.unlink(temp_path)
        except Exception:
            pass


def speak_text(text):
    if pyttsx3 is None:
        return False
    try:
        engine = pyttsx3.init()
        engine.say(text)
        engine.runAndWait()
        return True
    except Exception:
        return False


def evaluate_resume(candidate_text, job_description):
    candidate_skills = set(extract_skills(candidate_text))
    job_skills = set(extract_skills(job_description))
    if not job_skills:
        job_skills = set(job_description.lower().split())
    overlap = candidate_skills.intersection(job_skills)
    score = int((len(overlap) / max(len(job_skills), 1)) * 100)
    missing = sorted(job_skills - candidate_skills)
    recommendation = "Strong Candidate" if score >= 80 else "Consider for Interview" if score >= 55 else "Weak Match"
    return score, sorted(candidate_skills), missing, recommendation
