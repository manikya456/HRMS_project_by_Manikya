import json
import re
import urllib.error
import urllib.parse
import urllib.request

from core.services import extract_pdf_text, extract_skills, generate_ai_text


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


def _normalize_skill_list(values):
    normalized = []
    seen = set()
    for value in values or []:
        skill = str(value).strip()
        if not skill:
            continue
        key = skill.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(skill)
    return normalized


def _split_manual_skills(text):
    if not text:
        return []
    return _normalize_skill_list(
        part for part in re.split(r"[,\n;/|]+", text) if part.strip()
    )


def _azure_openai_chat(prompt):
    from django.conf import settings

    endpoint = getattr(settings, "OPENAI_ENDPOINT", "").rstrip("/")
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    api_version = getattr(settings, "OPENAI_API_VERSION", "2024-10-21")
    model = getattr(settings, "OPENAI_MODEL", "")

    if not endpoint or not api_key or not model:
        return ""

    url = f"{endpoint}/openai/deployments/{urllib.parse.quote(model)}/chat/completions?api-version={urllib.parse.quote(api_version)}"
    payload = {
        "messages": [
            {"role": "system", "content": "You are an expert HR screener. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 900,
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response_data = json.loads(response.read().decode("utf-8"))
            choices = response_data.get("choices", [])
            if not choices:
                return ""
            return str(choices[0].get("message", {}).get("content", "")).strip()
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError, ValueError):
        return ""


def extract_job_skills_from_text(text):
    prompt = f"""
Extract the key job skills from the JD text below.
Return only valid JSON with this schema:
{{"skills": ["skill 1", "skill 2"]}}
Keep the list concise and deduplicated.

JD Text:
{text[:6000]}
"""
    ai_response = _azure_openai_chat(prompt)
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        skills = parsed.get("skills", [])
        if isinstance(skills, list):
            return _normalize_skill_list(skills)

    skills = _normalize_skill_list(extract_skills(text))
    if not skills:
        skills = _split_manual_skills(text)
    return skills


def _recommendation_and_status(score):
    if score >= 80:
        return "Shortlisted", "Shortlisted"
    if score >= 55:
        return "Review Further", "Review"
    return "Rejected", "Rejected"


def _local_match(candidate_text, job_text, required_skills_text, job_skills):
    candidate_skills = set(extract_skills(candidate_text))
    candidate_skills.update(_split_manual_skills(candidate_text))
    job_skills_set = set(job_skills)
    job_skills_set.update(extract_skills(job_text))
    job_skills_set.update(_split_manual_skills(required_skills_text))
    job_skills_set = {skill for skill in job_skills_set if skill}

    extracted = sorted(candidate_skills)
    matched = sorted(candidate_skills.intersection(job_skills_set))
    missing = sorted(job_skills_set - candidate_skills)
    score = int((len(matched) / max(len(job_skills_set), 1)) * 100)
    recommendation, status = _recommendation_and_status(score)
    return score, extracted, matched, missing, recommendation, status


def evaluate_resume_against_job(candidate_text, job_title, job_text, required_skills, job_skills):
    prompt = f"""
You are screening a candidate resume against a job opening.
Compare the resume with the JD text and skills below and return ONLY valid JSON with keys:
match_score (integer 0-100),
extracted_skills (array of strings),
matched_skills (array of strings),
missing_skills (array of strings),
recommendation (string),
analysis (string),
status (one of: Shortlisted, Review, Rejected).

Job Title: {job_title}
JD Text: {job_text}
Manual Required Skills: {required_skills}
Stored JD Skills: {", ".join(job_skills or [])}
Resume Text: {candidate_text[:7000]}
"""
    ai_response = _azure_openai_chat(prompt)
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        try:
            score = int(parsed.get("match_score", 0))
            extracted = _normalize_skill_list(parsed.get("extracted_skills", []))
            matched = _normalize_skill_list(parsed.get("matched_skills", []))
            missing = _normalize_skill_list(parsed.get("missing_skills", []))
            recommendation = str(parsed.get("recommendation", "Review Further"))
            analysis = str(parsed.get("analysis", ""))
            status = str(parsed.get("status", "")) or _recommendation_and_status(score)[1]
            return score, extracted, matched, missing, recommendation, analysis, status
        except Exception:
            pass

    score, extracted, matched, missing, recommendation, status = _local_match(
        candidate_text,
        job_text,
        required_skills,
        job_skills,
    )
    analysis = generate_ai_text(
        f"Summarize the candidate fit for {job_title}. Resume: {candidate_text[:6000]}",
        f"Candidate aligns with approximately {score}% of the job requirements.",
    )
    return score, extracted, matched, missing, recommendation, analysis, status


def evaluate_candidate_resume(candidate):
    text = extract_pdf_text(candidate.resume)
    position = candidate.applied_position
    job_text = position.jd_text if position else ""
    description = position.description if position else ""
    required_skills = position.required_skills if position else ""
    job_skills = position.extracted_skills if position else []
    role_title = position.title if position else "the role"
    return evaluate_resume_against_job(
        text,
        role_title,
        job_text or description,
        required_skills,
        job_skills,
    )


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
