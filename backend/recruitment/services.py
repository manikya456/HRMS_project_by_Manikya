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


def generate_role_questions(role):
    role_name = (role or "general").strip()
    prompt = f"""
Create exactly 3 concise interview questions for the role below.
Return only valid JSON with this schema:
{{"questions": ["question 1", "question 2", "question 3"]}}

Role: {role_name}
"""
    ai_response = _azure_openai_chat(prompt)
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        questions = parsed.get("questions", [])
        if isinstance(questions, list):
            normalized = _normalize_skill_list(questions)
            if len(normalized) >= 3:
                return normalized[:3]

    fallback = {
        "python developer": [
            "Tell me about a Python project you delivered end to end.",
            "How do you structure maintainable backend code in Python?",
            "How do you debug performance issues in a Python service?",
        ],
        "backend developer": [
            "Describe a backend system you built and the trade-offs involved.",
            "How do you design reliable APIs for production use?",
            "How do you handle database performance and scaling issues?",
        ],
        "full stack developer": [
            "Tell me about a full stack feature you shipped recently.",
            "How do you keep frontend and backend contracts aligned?",
            "How do you balance speed of delivery with code quality?",
        ],
    }
    key = role_name.lower()
    for match_key, questions in fallback.items():
        if match_key in key:
            return questions
    return [
        f"What interests you most about the {role_name} role?",
        f"Describe a project that makes you a strong fit for the {role_name} role.",
        f"How do you handle pressure and changing requirements in a {role_name} job?",
    ]


def evaluate_interview_answer(role, question, transcript, prior_context=""):
    prompt = f"""
You are evaluating one interview answer for the role below.
Return only valid JSON with this schema:
{{"score": 0-100, "feedback": "short feedback", "strengths": ["..."], "gaps": ["..."], "recommendation": "short recommendation"}}

Role: {role}
Question: {question}
Prior context: {prior_context}
Answer transcript: {transcript}
"""
    ai_response = _azure_openai_chat(prompt)
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        try:
            score = max(0, min(100, int(parsed.get("score", 0))))
            feedback = str(parsed.get("feedback", "")).strip()
            strengths = _normalize_skill_list(parsed.get("strengths", []))
            gaps = _normalize_skill_list(parsed.get("gaps", []))
            recommendation = str(parsed.get("recommendation", "")).strip() or (
                "Strong candidate" if score >= 80 else "Consider next round" if score >= 55 else "Needs improvement"
            )
            return score, feedback, strengths, gaps, recommendation
        except Exception:
            pass

    answer_text = (transcript or "").strip()
    word_count = len(answer_text.split())
    score = 85 if word_count > 80 else 65 if word_count > 35 else 40 if word_count > 10 else 20
    feedback = (
        "Clear and detailed answer with good role awareness."
        if score >= 80
        else "Answer is acceptable, but could be more specific and structured."
        if score >= 55
        else "Answer is brief and needs more concrete examples."
    )
    strengths = ["Communication"] if score >= 55 else []
    gaps = ["Depth", "Specific examples"] if score < 80 else []
    recommendation = "Strong candidate" if score >= 80 else "Consider next round" if score >= 55 else "Needs improvement"
    return score, feedback, strengths, gaps, recommendation


def summarize_interview(role, questions, reviews, overall_score):
    prompt = f"""
Summarize the interview outcome for the role below.
Return only valid JSON with this schema:
{{"final_review": "paragraph", "final_recommendation": "short recommendation"}}

Role: {role}
Questions: {questions}
Reviews: {reviews}
Overall score: {overall_score}
"""
    ai_response = _azure_openai_chat(prompt)
    parsed = _parse_json_response(ai_response) if ai_response else None
    if parsed and isinstance(parsed, dict):
        final_review = str(parsed.get("final_review", "")).strip()
        final_recommendation = str(parsed.get("final_recommendation", "")).strip()
        if final_review and final_recommendation:
            return final_review, final_recommendation

    final_recommendation = "Proceed to next round" if overall_score >= 70 else "Hold for review" if overall_score >= 50 else "Not recommended"
    final_review = (
        f"The candidate showed strong promise for the {role} role."
        if overall_score >= 70
        else f"The candidate is suitable for further review in the {role} role."
        if overall_score >= 50
        else f"The candidate needs more preparation for the {role} role."
    )
    return final_review, final_recommendation
