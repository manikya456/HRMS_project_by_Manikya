import hashlib
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from django.conf import settings
from django.db.models import Count

from recruitment.models import JobOpening
from .models import Attendance, Employee, LeaveRequest, Payroll, Performance

try:
    import chromadb
    from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
except Exception:  # pragma: no cover
    chromadb = None
    DefaultEmbeddingFunction = None


CHROMA_DIR = Path(settings.BASE_DIR) / ".chromadb"


def _collection_name_for_user(user_id):
    return f"hr_assistant_user_{user_id}"


def _normalize_name(value):
    return re.sub(r"[^a-zA-Z0-9_-]", "_", value)


def _azure_openai_chat(messages):
    endpoint = getattr(settings, "OPENAI_ENDPOINT", "").rstrip("/")
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    api_version = getattr(settings, "OPENAI_API_VERSION", "2024-10-21")
    model = getattr(settings, "OPENAI_MODEL", "")

    if not endpoint or not api_key or not model:
        return ""

    url = f"{endpoint}/openai/deployments/{urllib.parse.quote(model)}/chat/completions?api-version={urllib.parse.quote(api_version)}"
    payload = {
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 700,
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


def _azure_openai_embeddings(texts):
    endpoint = getattr(settings, "OPENAI_ENDPOINT", "").rstrip("/")
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    api_version = getattr(settings, "OPENAI_API_VERSION", "2024-10-21")
    model = getattr(settings, "OPENAI_EMBEDDING_MODEL", "")

    if not endpoint or not api_key or not model or not texts:
        return []

    url = f"{endpoint}/openai/deployments/{urllib.parse.quote(model)}/embeddings?api-version={urllib.parse.quote(api_version)}"
    payload = {"input": texts}
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response_data = json.loads(response.read().decode("utf-8"))
            data = response_data.get("data", [])
            ordered = sorted(data, key=lambda item: item.get("index", 0))
            return [item.get("embedding", []) for item in ordered]
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError, ValueError):
        return []


def _build_general_hr_documents():
    return [
        {
            "title": "HR Platform Help",
            "text": (
                "AI-HRMS supports employee records, attendance, leave requests, payroll, performance, "
                "recruitment, resume screening, AI interviews, and analytics. Employees can ask about their "
                "own records. HR and managers can review broader operational information based on their access."
            ),
            "metadata": {"scope": "general", "doc_type": "guide"},
        },
        {
            "title": "Leave Guidance",
            "text": (
                "Leave requests include leave type, start date, end date, reason, status, and AI suggestion. "
                "HR users can approve or reject leave. Employees can review their own leave history and status."
            ),
            "metadata": {"scope": "general", "doc_type": "leave_help"},
        },
        {
            "title": "Payroll Guidance",
            "text": (
                "Payroll records contain month, basic salary, allowances, deductions, tax, and net salary. "
                "Payroll access is typically managed by HR, admin, and senior managers. Employees should only "
                "ask about their own payroll details."
            ),
            "metadata": {"scope": "general", "doc_type": "payroll_help"},
        },
        {
            "title": "Attendance Guidance",
            "text": (
                "Attendance records track daily check-in, check-out, working hours, and attendance status such as "
                "PRESENT, ABSENT, LATE, or HALF_DAY."
            ),
            "metadata": {"scope": "general", "doc_type": "attendance_help"},
        },
    ]


def _build_user_documents(user):
    documents = _build_general_hr_documents()

    if getattr(user, "employee_profile", None):
        employee = user.employee_profile
        documents.append(
            {
                "title": "Employee Profile",
                "text": (
                    f"Employee profile for {employee.full_name}. Employee ID: {employee.employee_id}. "
                    f"Department: {employee.department}. Designation: {employee.designation}. "
                    f"Status: {employee.status}. Joining date: {employee.joining_date}. "
                    f"Phone: {employee.phone or 'Not available'}. Address: {employee.address or 'Not available'}. "
                    f"Salary: {employee.salary}."
                ),
                "metadata": {"scope": "personal", "doc_type": "employee_profile"},
            }
        )

        attendance_records = Attendance.objects.filter(employee=employee).order_by("-date")[:10]
        if attendance_records:
            attendance_lines = [
                f"{record.date}: {record.status}, hours {record.working_hours}"
                for record in attendance_records
            ]
            documents.append(
                {
                    "title": "Recent Attendance",
                    "text": f"Recent attendance for {employee.full_name}: " + " | ".join(attendance_lines),
                    "metadata": {"scope": "personal", "doc_type": "attendance"},
                }
            )

        leave_records = LeaveRequest.objects.filter(employee=employee).order_by("-created_at")[:10]
        if leave_records:
            leave_lines = [
                f"{leave.leave_type} from {leave.start_date} to {leave.end_date}: {leave.status}"
                for leave in leave_records
            ]
            documents.append(
                {
                    "title": "Leave History",
                    "text": f"Recent leave history for {employee.full_name}: " + " | ".join(leave_lines),
                    "metadata": {"scope": "personal", "doc_type": "leave"},
                }
            )

        payroll_records = Payroll.objects.filter(employee=employee).order_by("-generated_at")[:6]
        if payroll_records:
            payroll_lines = [
                f"{payroll.month}: basic {payroll.basic_salary}, allowances {payroll.allowances}, deductions {payroll.deductions}, tax {payroll.tax}, net {payroll.net_salary}"
                for payroll in payroll_records
            ]
            documents.append(
                {
                    "title": "Payroll History",
                    "text": f"Recent payroll history for {employee.full_name}: " + " | ".join(payroll_lines),
                    "metadata": {"scope": "personal", "doc_type": "payroll"},
                }
            )

        performance_records = Performance.objects.filter(employee=employee).order_by("-created_at")[:5]
        if performance_records:
            performance_lines = [
                f"{record.review_period}: final score {record.final_score}, manager rating {record.manager_rating}, feedback {record.ai_feedback or 'No feedback'}"
                for record in performance_records
            ]
            documents.append(
                {
                    "title": "Performance History",
                    "text": f"Recent performance data for {employee.full_name}: " + " | ".join(performance_lines),
                    "metadata": {"scope": "personal", "doc_type": "performance"},
                }
            )

    if user.role in {"ADMIN", "SENIOR_MANAGER", "HR_RECRUITER"}:
        department_summary = Employee.objects.values("department").annotate(total=Count("id")).order_by("department")
        if department_summary:
            department_lines = [f"{item['department']}: {item['total']} employees" for item in department_summary]
            documents.append(
                {
                    "title": "Department Summary",
                    "text": "Department headcount summary: " + " | ".join(department_lines),
                    "metadata": {"scope": "management", "doc_type": "org_summary"},
                }
            )

        pending_leaves = LeaveRequest.objects.filter(status=LeaveRequest.LeaveStatus.PENDING).count()
        open_positions = JobOpening.objects.filter(is_active=True).count()
        documents.append(
            {
                "title": "HR Operations Snapshot",
                "text": (
                    f"Current HR operations snapshot. Pending leave requests: {pending_leaves}. "
                    f"Open job positions: {open_positions}. Total employees: {Employee.objects.count()}."
                ),
                "metadata": {"scope": "management", "doc_type": "ops_snapshot"},
            }
        )

    if getattr(user, "candidate_profile", None):
        candidate = user.candidate_profile
        applied_title = getattr(getattr(candidate, "applied_position", None), "title", "Not assigned")
        documents.append(
            {
                "title": "Candidate Profile",
                "text": (
                    f"Candidate profile for {candidate.name}. Email: {candidate.email or 'Not available'}. "
                    f"Phone: {candidate.phone or 'Not available'}. Applied position: {applied_title}."
                ),
                "metadata": {"scope": "personal", "doc_type": "candidate_profile"},
            }
        )

    return documents


def _build_collection(user):
    if chromadb is None:
        return None, []

    documents = _build_user_documents(user)
    if not documents:
        return None, []

    CHROMA_DIR.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    collection_name = _normalize_name(_collection_name_for_user(user.id))
    use_openai_embeddings = bool(getattr(settings, "OPENAI_EMBEDDING_MODEL", ""))
    embedding_function = None if use_openai_embeddings else (DefaultEmbeddingFunction() if DefaultEmbeddingFunction else None)
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={"owner_id": str(user.id)},
        embedding_function=embedding_function,
    )

    ids = []
    metadatas = []
    texts = []
    for index, document in enumerate(documents):
        doc_id = hashlib.sha1(f"{user.id}:{document['title']}:{index}".encode("utf-8")).hexdigest()
        ids.append(doc_id)
        metadatas.append({"title": document["title"], **document["metadata"]})
        texts.append(document["text"])

    if use_openai_embeddings:
        embeddings = _azure_openai_embeddings(texts)
        if len(embeddings) != len(documents):
            return None, []
        collection.upsert(ids=ids, documents=texts, embeddings=embeddings, metadatas=metadatas)
    else:
        collection.upsert(ids=ids, documents=texts, metadatas=metadatas)
    return collection, documents


def answer_hr_question(user, message, history=None):
    history = history or []
    cleaned_message = str(message or "").strip()
    if not cleaned_message:
        return {
            "answer": "Please enter a question for the HR assistant.",
            "sources": [],
        }

    collection, _documents = _build_collection(user)
    if collection is None:
        return {
            "answer": (
                "HR chatbot setup is incomplete. Configure ChromaDB or the local embedding runtime "
                "before using RAG answers."
            ),
            "sources": [],
        }

    use_openai_embeddings = bool(getattr(settings, "OPENAI_EMBEDDING_MODEL", ""))
    if use_openai_embeddings:
        query_embedding = _azure_openai_embeddings([cleaned_message])
        if not query_embedding:
            return {
                "answer": (
                    "Embedding generation is not available right now. Verify OPENAI_EMBEDDING_MODEL and your "
                    "OpenAI/Azure OpenAI settings."
                ),
                "sources": [],
            }
        results = collection.query(query_embeddings=query_embedding, n_results=4)
    else:
        results = collection.query(query_texts=[cleaned_message], n_results=4)
    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]

    context_blocks = []
    sources = []
    for index, (document, metadata) in enumerate(zip(documents, metadatas), start=1):
        title = metadata.get("title", f"Source {index}") if isinstance(metadata, dict) else f"Source {index}"
        context_blocks.append(f"[{index}] {title}\n{document}")
        sources.append(title)

    history_text = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}"
        for item in history[-6:]
        if isinstance(item, dict)
    )
    user_name = user.get_full_name() or user.username or user.email

    prompt_messages = [
        {
            "role": "system",
            "content": (
                "You are an HR chatbot for AI-HRMS. Answer only HR-related questions and user-specific questions "
                "that are supported by the retrieved context. If the answer is not in the context, say that you do "
                "not have enough HRMS context yet. Keep answers concise and practical."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Signed-in user: {user_name} ({user.role}).\n"
                f"Recent chat history:\n{history_text or 'No previous history.'}\n\n"
                f"Retrieved HR context:\n{chr(10).join(context_blocks) or 'No context retrieved.'}\n\n"
                f"Question: {cleaned_message}"
            ),
        },
    ]
    answer = _azure_openai_chat(prompt_messages)
    if not answer:
        answer = (
            "I could not reach the language model right now. The retrieval layer is ready, but the OpenAI/Azure OpenAI "
            "chat response is unavailable."
        )

    return {
        "answer": answer,
        "sources": sources,
    }
