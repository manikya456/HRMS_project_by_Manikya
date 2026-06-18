import json
import random
import re
import uuid
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


def _normalize_question_list(values, limit):
    questions = []
    seen = set()
    for value in values or []:
        question = re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", str(value)).strip()
        if not question or len(question) < 12:
            continue
        key = question.lower()
        if key in seen:
            continue
        seen.add(key)
        questions.append(question)
        if len(questions) >= limit:
            break
    return questions


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


def _job_skill_list(position):
    if not position:
        return []

    skills = []
    extracted_skills = getattr(position, "extracted_skills", []) or []
    if isinstance(extracted_skills, list):
        skills.extend(extracted_skills)
    skills.extend(_split_manual_skills(getattr(position, "required_skills", "")))
    return _normalize_skill_list(skills)


def _fallback_interview_questions(role_name, department, skills, count, seed):
    readable_role = role_name or "this role"
    readable_department = department or "the hiring team"
    skill_focus = skills[:4] or ["the core tools required for this role"]
    rng = random.Random(seed)

    openings = [
        f"Tell me about a recent project that best shows you are ready for the {readable_role} role.",
        f"What makes your background a strong fit for the {readable_role} opening in {readable_department}?",
        f"Walk me through the experience that most closely matches this {readable_role} position.",
    ]
    question_pool = [
        f"How would you approach your first 30 days in the {readable_role} role?",
        f"Describe a difficult production or delivery problem you solved and how you measured success.",
        f"How do you handle unclear requirements when multiple stakeholders expect quick delivery?",
        f"Tell me about a time you received critical feedback and changed your work because of it.",
        f"How would you explain a complex technical decision to a non-technical manager?",
        f"What quality checks do you use before handing work to another team or releasing it?",
    ]

    for skill in skill_focus:
        question_pool.extend(
            [
                f"Describe a practical project where you used {skill}. What decisions did you make and why?",
                f"If a {skill}-based feature started failing in production, how would you investigate it?",
            ]
        )

    first_question = rng.choice(openings)
    rng.shuffle(question_pool)
    return _normalize_question_list([first_question, *question_pool], count)


def interview_questions(candidate):
    position = candidate.applied_position
    role_name = getattr(position, "title", "") or "general"
    return generate_role_questions(role_name, job_opening=position, candidate=candidate)


def generate_role_questions(role, job_opening=None, candidate=None, count=3):
    position = job_opening or getattr(candidate, "applied_position", None)
    role_name = (role or getattr(position, "title", "") or "general").strip()
    department = getattr(position, "department", "") if position else ""
    description = getattr(position, "description", "") if position else ""
    jd_text = getattr(position, "jd_text", "") if position else ""
    required_skills = getattr(position, "required_skills", "") if position else ""
    experience_required = getattr(position, "experience_required", "") if position else ""
    skills = _job_skill_list(position)
    candidate_name = getattr(candidate, "name", "") if candidate else ""
    session_seed = uuid.uuid4().hex[:12]
    prompt = f"""
You are conducting a professional AI voice screening interview.
Create exactly {count} fresh interview questions for the role below.

Rules:
- Make the questions specific to the role, department, skills, experience, and JD text.
- Generate a different set for this session. Use the freshness seed only to vary the questions.
- Include a balanced mix: role fit, technical/domain depth, scenario problem-solving, collaboration, and communication.
- Do not ask for salary history, protected-class information, personal family details, or confidential employer data.
- Keep each question concise enough to be read aloud by a voice assistant.
- Do not include answers, explanations, numbering, markdown, or extra text.

Return only valid JSON with this schema:
{{"questions": ["question 1", "question 2", "question 3"]}}

Role: {role_name}
Department: {department or "Not specified"}
Experience Required: {experience_required or "Not specified"}
Candidate Name: {candidate_name or "Not specified"}
Required Skills: {", ".join(skills) or required_skills or "Not specified"}
JD Text: {(jd_text or description)[:5000] or "Not specified"}
Freshness Seed: {session_seed}
"""

    fallback_questions = _fallback_interview_questions(
        role_name,
        department,
        skills,
        count,
        session_seed,
    )
    ai_responses = [
        _azure_openai_chat(prompt),
        generate_ai_text(prompt, ""),
    ]

    for ai_response in ai_responses:
        parsed = _parse_json_response(ai_response) if ai_response else None
        if isinstance(parsed, dict):
            raw_questions = parsed.get("questions", [])
        elif isinstance(parsed, list):
            raw_questions = parsed
        else:
            raw_questions = []

        normalized = _normalize_question_list(raw_questions, count)
        if normalized:
            combined = _normalize_question_list([*normalized, *fallback_questions], count)
            if len(combined) >= count:
                return combined

    return fallback_questions


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
