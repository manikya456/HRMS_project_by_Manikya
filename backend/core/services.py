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
    from decimal import Decimal

    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    def amount(value):
        return Decimal(str(value or 0))

    def money(value):
        return f"INR {amount(value):,.2f}"

    def safe_filename(value):
        return "".join(char if char.isalnum() or char in "-_" else "-" for char in str(value))

    employee = payroll.employee
    basic_salary = amount(payroll.basic_salary)
    allowances = amount(payroll.allowances)
    deductions = amount(payroll.deductions)
    tax = amount(payroll.tax)
    gross_pay = basic_salary + allowances
    total_deductions = deductions + tax
    net_salary = amount(payroll.net_salary)

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4, pageCompression=1)
    width, height = A4
    margin = 18 * mm
    navy = colors.HexColor("#0f172a")
    sky = colors.HexColor("#0ea5e9")
    emerald = colors.HexColor("#059669")
    slate = colors.HexColor("#475569")
    light_slate = colors.HexColor("#f8fafc")
    border = colors.HexColor("#dbe4ee")

    pdf.setTitle(f"AI-HRMS Payslip - {employee.employee_id} - {payroll.month}")
    pdf.setFillColor(light_slate)
    pdf.rect(0, 0, width, height, stroke=0, fill=1)

    pdf.setFillColor(navy)
    pdf.rect(0, height - 112, width, 112, stroke=0, fill=1)
    pdf.setFillColor(sky)
    pdf.roundRect(margin, height - 77, 36, 36, 8, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawCentredString(margin + 18, height - 65, "HR")
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(margin + 52, height - 54, "AI-HRMS")
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#cbd5e1"))
    pdf.drawString(margin + 52, height - 72, "Human Resource Management System")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.setFillColor(colors.white)
    pdf.drawRightString(width - margin, height - 52, "Salary Payslip")
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(colors.HexColor("#cbd5e1"))
    pdf.drawRightString(width - margin, height - 70, f"Pay Period: {payroll.month}")
    pdf.drawRightString(width - margin, height - 86, f"Generated: {timezone.localdate().isoformat()}")

    y = height - 145
    pdf.setFillColor(colors.white)
    pdf.roundRect(margin, y - 80, width - (2 * margin), 94, 8, stroke=0, fill=1)
    pdf.setStrokeColor(border)
    pdf.roundRect(margin, y - 80, width - (2 * margin), 94, 8, stroke=1, fill=0)

    pdf.setFillColor(navy)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(margin + 18, y - 12, employee.full_name)
    pdf.setFillColor(slate)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(margin + 18, y - 31, f"Employee ID: {employee.employee_id}")
    pdf.drawString(margin + 18, y - 49, f"Department: {employee.department}")
    pdf.drawString(margin + 18, y - 67, f"Designation: {employee.designation}")

    pdf.setFillColor(emerald)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawRightString(width - margin - 18, y - 12, "NET PAY")
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawRightString(width - margin - 18, y - 40, money(net_salary))
    pdf.setFillColor(slate)
    pdf.setFont("Helvetica", 9)
    pdf.drawRightString(width - margin - 18, y - 59, "Amount payable for this period")

    table_top = y - 120
    table_left = margin
    table_width = width - (2 * margin)
    row_height = 30
    col_width = table_width / 4

    pdf.setFillColor(navy)
    pdf.roundRect(table_left, table_top, table_width, row_height, 6, stroke=0, fill=1)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(table_left + 14, table_top + 10, "Earnings")
    pdf.drawString(table_left + (2 * col_width) + 14, table_top + 10, "Deductions")

    rows = [
        ("Basic Salary", money(basic_salary), "Deductions", money(deductions)),
        ("Allowances", money(allowances), "Tax", money(tax)),
        ("Gross Pay", money(gross_pay), "Total Deductions", money(total_deductions)),
    ]

    pdf.setFont("Helvetica", 10)
    for index, (earning_label, earning_value, deduction_label, deduction_value) in enumerate(rows):
        row_y = table_top - ((index + 1) * row_height)
        pdf.setFillColor(colors.white if index % 2 == 0 else colors.HexColor("#f1f5f9"))
        pdf.rect(table_left, row_y, table_width, row_height, stroke=0, fill=1)
        pdf.setStrokeColor(border)
        pdf.line(table_left, row_y, table_left + table_width, row_y)
        pdf.line(table_left + (2 * col_width), row_y, table_left + (2 * col_width), row_y + row_height)
        pdf.setFillColor(slate)
        pdf.drawString(table_left + 14, row_y + 10, earning_label)
        pdf.drawString(table_left + (2 * col_width) + 14, row_y + 10, deduction_label)
        pdf.setFillColor(navy)
        pdf.drawRightString(table_left + (2 * col_width) - 14, row_y + 10, earning_value)
        pdf.drawRightString(table_left + table_width - 14, row_y + 10, deduction_value)

    summary_y = table_top - (4 * row_height) - 20
    pdf.setFillColor(colors.HexColor("#ecfdf5"))
    pdf.roundRect(margin, summary_y - 48, table_width, 62, 8, stroke=0, fill=1)
    pdf.setStrokeColor(colors.HexColor("#a7f3d0"))
    pdf.roundRect(margin, summary_y - 48, table_width, 62, 8, stroke=1, fill=0)
    pdf.setFillColor(emerald)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(margin + 18, summary_y - 10, "Net Salary Payable")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawRightString(width - margin - 18, summary_y - 14, money(net_salary))
    pdf.setFillColor(slate)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(margin + 18, summary_y - 31, "This is a system-generated payslip and does not require a physical signature.")

    footer_y = 60
    pdf.setStrokeColor(border)
    pdf.line(margin, footer_y + 28, width - margin, footer_y + 28)
    pdf.setFillColor(slate)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(margin, footer_y + 10, "AI-HRMS Payroll")
    pdf.drawRightString(width - margin, footer_y + 10, "Confidential employee compensation document")
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    filename = f"payslip-{safe_filename(employee.employee_id)}-{safe_filename(payroll.month)}.pdf"
    return ContentFile(buffer.read(), name=filename)


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
    if whisper is None or audio_file is None:
        return ""
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
        return ""
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
