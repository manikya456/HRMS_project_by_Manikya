import hashlib

from rest_framework import decorators, permissions, response, viewsets
from django.shortcuts import get_object_or_404

from accounts.permissions import IsAdminOrHR
from core.services import extract_pdf_text, transcribe_audio
from .models import BulkResumeUpload, Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation, ResumeMatch, StoredResume
from .serializers import (
    BulkResumeUploadSerializer,
    CandidateSerializer,
    ChatConversationSerializer,
    InterviewSessionSerializer,
    JobOpeningSerializer,
    ResumeEvaluationSerializer,
    ResumeMatchSerializer,
    StoredResumeSerializer,
)
from .services import chatbot_response, evaluate_candidate_resume, evaluate_resume_against_job, interview_questions


def _file_hash(file_obj):
    digest = hashlib.sha256()
    try:
        file_obj.seek(0)
    except Exception:
        pass
    for chunk in file_obj.chunks():
        digest.update(chunk)
    try:
        file_obj.seek(0)
    except Exception:
        pass
    return digest.hexdigest()


def _sync_match(job_opening, resume):
    score, extracted, matched, missing, recommendation, analysis, status_label = evaluate_resume_against_job(
        resume.extracted_text or extract_pdf_text(resume.uploaded_file),
        job_opening.title,
        job_opening.jd_text or job_opening.description,
        job_opening.required_skills,
        job_opening.extracted_skills,
    )
    return ResumeMatch.objects.update_or_create(
        job_opening=job_opening,
        stored_resume=resume,
        defaults={
            "match_percentage": score,
            "recommendation": recommendation,
            "status": status_label,
            "analysis": analysis,
            "matched_skills": matched,
            "missing_skills": missing,
        },
    )


def _ensure_match(job_opening, resume):
    if ResumeMatch.objects.filter(job_opening=job_opening, stored_resume=resume).exists():
        return None
    return _sync_match(job_opening, resume)


def _sync_matches_for_job(job_opening):
    for resume in StoredResume.objects.all().order_by("-created_at"):
        _sync_match(job_opening, resume)


def _sync_matches_for_resume(resume):
    for job_opening in JobOpening.objects.all().order_by("-created_at"):
        _sync_match(job_opening, resume)


def _ensure_matches_for_job(job_opening):
    for resume in StoredResume.objects.all().order_by("-created_at"):
        _ensure_match(job_opening, resume)


class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all().order_by("-created_at")
    serializer_class = JobOpeningSerializer
    permission_classes = [IsAdminOrHR]

    def perform_create(self, serializer):
        job_opening = serializer.save()
        _sync_matches_for_job(job_opening)

    def perform_update(self, serializer):
        job_opening = serializer.save()
        _sync_matches_for_job(job_opening)


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.select_related("applied_position").all().order_by("-created_at")
    serializer_class = CandidateSerializer

    def create(self, request, *args, **kwargs):
        response_obj = super().create(request, *args, **kwargs)
        candidate = Candidate.objects.select_related("applied_position").get(pk=response_obj.data["id"])
        score, extracted, matched, missing, recommendation, summary, status_label = evaluate_candidate_resume(candidate)
        evaluation, _ = ResumeEvaluation.objects.update_or_create(
            candidate=candidate,
            defaults={
                "skill_match_percentage": score,
                "matched_skills": matched,
                "extracted_skills": extracted,
                "missing_skills": missing,
                "recommendation": recommendation,
                "status": status_label,
                "ai_summary": summary,
            },
        )
        response_obj.data = CandidateSerializer(candidate).data
        response_obj.data["evaluation"] = ResumeEvaluationSerializer(evaluation).data
        return response_obj


class ResumeEvaluationViewSet(viewsets.ModelViewSet):
    queryset = ResumeEvaluation.objects.select_related("candidate").all().order_by("-created_at")
    serializer_class = ResumeEvaluationSerializer

    @decorators.action(detail=False, methods=["post"])
    def evaluate(self, request):
        candidate = Candidate.objects.select_related("applied_position").get(pk=request.data["candidate_id"])
        score, extracted, matched, missing, recommendation, summary, status_label = evaluate_candidate_resume(candidate)
        evaluation, _ = ResumeEvaluation.objects.update_or_create(
            candidate=candidate,
            defaults={
                "skill_match_percentage": score,
                "matched_skills": matched,
                "extracted_skills": extracted,
                "missing_skills": missing,
                "recommendation": recommendation,
                "status": status_label,
                "ai_summary": summary,
            },
        )
        return response.Response(self.get_serializer(evaluation).data)


class BulkResumeUploadViewSet(viewsets.ModelViewSet):
    queryset = BulkResumeUpload.objects.select_related("job_opening").all().order_by("-created_at")
    serializer_class = BulkResumeUploadSerializer
    permission_classes = [IsAdminOrHR]
    filterset_fields = ["job_opening", "status"]

    def get_queryset(self):
        queryset = super().get_queryset()
        job_opening = self.request.query_params.get("job_opening")
        if job_opening:
            queryset = queryset.filter(job_opening_id=job_opening)
        return queryset

    @decorators.action(detail=False, methods=["post"])
    def upload(self, request):
        job_opening = get_object_or_404(JobOpening, pk=request.data.get("job_opening"))
        files = request.FILES.getlist("resumes")
        if not files:
            single = request.FILES.get("resume")
            if single:
                files = [single]
        if not files:
            return response.Response({"detail": "No resumes were uploaded."}, status=400)

        created = []
        for uploaded_file in files:
            resume_text = extract_pdf_text(uploaded_file)
            score, extracted, matched, missing, recommendation, analysis, status_label = evaluate_resume_against_job(
                resume_text,
                job_opening.title,
                job_opening.jd_text or job_opening.description,
                job_opening.required_skills,
                job_opening.extracted_skills,
            )
            record = BulkResumeUpload.objects.create(
                job_opening=job_opening,
                uploaded_file=uploaded_file,
                file_name=getattr(uploaded_file, "name", "resume.pdf"),
                extracted_text=resume_text,
                extracted_skills=extracted,
                matched_skills=matched,
                missing_skills=missing,
                match_percentage=score,
                recommendation=recommendation,
                status=status_label,
                ai_analysis=analysis,
            )
            created.append(record)

        return response.Response(self.get_serializer(created, many=True).data, status=201)


class StoredResumeViewSet(viewsets.ModelViewSet):
    queryset = StoredResume.objects.all().order_by("-created_at")
    serializer_class = StoredResumeSerializer
    permission_classes = [IsAdminOrHR]

    @decorators.action(detail=False, methods=["post"])
    def upload(self, request):
        files = request.FILES.getlist("resumes")
        if not files:
            single = request.FILES.get("resume")
            if single:
                files = [single]
        if not files:
            return response.Response({"detail": "No resumes were uploaded."}, status=400)

        created = []
        for uploaded_file in files:
            digest = _file_hash(uploaded_file)
            existing = StoredResume.objects.filter(file_hash=digest).first()
            if existing:
                created.append(existing)
                continue
            resume_text = extract_pdf_text(uploaded_file)
            record = StoredResume.objects.create(
                uploaded_file=uploaded_file,
                file_name=getattr(uploaded_file, "name", "resume.pdf"),
                file_hash=digest,
                extracted_text=resume_text,
            )
            _sync_matches_for_resume(record)
            created.append(record)

        return response.Response(self.get_serializer(created, many=True).data, status=201)


class ResumeMatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ResumeMatch.objects.select_related("job_opening", "stored_resume").all().order_by("-match_percentage", "-created_at")
    serializer_class = ResumeMatchSerializer
    permission_classes = [IsAdminOrHR]

    def get_queryset(self):
        queryset = super().get_queryset()
        job_opening = self.request.query_params.get("job_opening")
        if job_opening:
            job = get_object_or_404(JobOpening, pk=job_opening)
            _ensure_matches_for_job(job)
            queryset = queryset.filter(job_opening_id=job_opening)
        return queryset


class ChatConversationViewSet(viewsets.ModelViewSet):
    queryset = ChatConversation.objects.select_related("candidate").all().order_by("created_at")
    serializer_class = ChatConversationSerializer

    @decorators.action(detail=False, methods=["post"])
    def ask(self, request):
        candidate_id = request.data.get("candidate_id")
        message = request.data.get("message", "")
        candidate = Candidate.objects.get(pk=candidate_id)
        ChatConversation.objects.create(candidate=candidate, role="user", message=message)
        context = "\n".join(
            candidate.chat_conversations.order_by("-created_at").values_list("message", flat=True)[:10]
        )
        answer = chatbot_response(message, context)
        ChatConversation.objects.create(candidate=candidate, role="assistant", message=answer)
        return response.Response(
            {
                "reply": answer,
                "conversation": ChatConversationSerializer(
                    candidate.chat_conversations.order_by("created_at"), many=True
                ).data,
            }
        )


class InterviewSessionViewSet(viewsets.ModelViewSet):
    queryset = InterviewSession.objects.select_related("candidate").all().order_by("-created_at")
    serializer_class = InterviewSessionSerializer

    @decorators.action(detail=False, methods=["post"])
    def start(self, request):
        candidate = Candidate.objects.get(pk=request.data["candidate_id"])
        questions = interview_questions(candidate)
        session = InterviewSession.objects.create(candidate=candidate, questions=questions)
        return response.Response(self.get_serializer(session).data)

    @decorators.action(detail=True, methods=["post"])
    def submit_answer(self, request, pk=None):
        session = self.get_object()
        answer = request.data.get("answer", "")
        session.answers = (session.answers or []) + [answer]
        session.transcript = (session.transcript or "") + f"\nA: {answer}"
        session.score = min(100, session.score + 10)
        session.communication_score = min(100, session.communication_score + 10)
        session.technical_score = min(100, session.technical_score + 8)
        session.confidence_score = min(100, session.confidence_score + 7)
        session.recommendation = "Proceed to next round" if session.score >= 60 else "Needs more evaluation"
        session.save()
        return response.Response(self.get_serializer(session).data)

    @decorators.action(detail=True, methods=["get"])
    def next_question(self, request, pk=None):
        session = self.get_object()
        asked = len(session.answers or [])
        questions = session.questions or []
        if asked < len(questions):
            return response.Response({"question": questions[asked]})
        return response.Response({"question": "Thank you. This concludes the interview."})

    @decorators.action(detail=True, methods=["post"])
    def transcribe(self, request, pk=None):
        session = self.get_object()
        audio_file = request.FILES.get("audio")
        transcript = transcribe_audio(audio_file) if audio_file else "No audio provided."
        session.transcript = (session.transcript or "") + f"\n{transcript}"
        session.answers = (session.answers or []) + [transcript]
        session.score = min(100, session.score + 12)
        session.communication_score = min(100, session.communication_score + 12)
        session.save(update_fields=["transcript", "answers", "score", "communication_score"])
        return response.Response({"transcript": transcript, "session": self.get_serializer(session).data})
