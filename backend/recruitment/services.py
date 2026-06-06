import json

from .models import JobOpening
from core.services import extract_pdf_text, evaluate_resume, generate_ai_text


def _parse_json_response(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        return json.loads(cleaned)
    except Exception:
        return None


def evaluate_candidate_resume(candidate):
    text = extract_pdf_text(candidate.resume)
    job = candidate.applied_position.description if candidate.applied_position else ""
    role_title = candidate.applied_position.title if candidate.applied_position else "the role"
    prompt = f"""
You are an expert recruitment screener.
Evaluate the resume against the job description and return ONLY valid JSON with keys:
match_score (integer 0-100),
extracted_skills (array of strings),
missing_skills (array of strings),
recommendation (string),
summary (string).

Job Title: {role_title}
Job Description: {job}
Resume Text: {text[:6000]}
"""
    ai_response = generate_ai_text(prompt, "")
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        try:
            score = int(parsed.get("match_score", 0))
            extracted = list(parsed.get("extracted_skills", []))
            missing = list(parsed.get("missing_skills", []))
            recommendation = str(parsed.get("recommendation", "Consider for Interview"))
            summary = str(parsed.get("summary", ""))
            return score, extracted, missing, recommendation, summary
        except Exception:
            pass

    score, extracted, missing, recommendation = evaluate_resume(text, job)
    summary = generate_ai_text(
        f"Summarize this candidate for {role_title}. Resume: {text[:6000]}",
        f"Candidate aligns with {score}% of the job requirements.",
    )
    return score, extracted, missing, recommendation, summary


def chatbot_response(message, context):
    return generate_ai_text(
        f"You are a recruiter assistant. Context: {context}\nQuestion: {message}",
        "The role requires Python, Django, and strong communication skills. Salary and process will be shared after screening.",
    )


def interview_questions(candidate):
    position = candidate.applied_position
    base = [
        "Tell me about yourself and the most relevant project you've shipped.",
        "Explain a technical challenge you solved and the trade-offs you made.",
        "How do you collaborate across teams when requirements change?",
    ]
    if position and position.required_skills:
        base.insert(1, f"How have you used {position.required_skills.split(',')[0]} in production?")
    return base
