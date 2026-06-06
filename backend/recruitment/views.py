from rest_framework import decorators, permissions, response, viewsets

from accounts.permissions import IsAdminOrHR
from core.services import transcribe_audio
from .models import Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation
from .serializers import (
    CandidateSerializer,
    ChatConversationSerializer,
    InterviewSessionSerializer,
    JobOpeningSerializer,
    ResumeEvaluationSerializer,
)
from .services import chatbot_response, evaluate_candidate_resume, interview_questions


class JobOpeningViewSet(viewsets.ModelViewSet):
    queryset = JobOpening.objects.all().order_by("-created_at")
    serializer_class = JobOpeningSerializer
    permission_classes = [IsAdminOrHR]


class CandidateViewSet(viewsets.ModelViewSet):
    queryset = Candidate.objects.select_related("applied_position").all().order_by("-created_at")
    serializer_class = CandidateSerializer

    def create(self, request, *args, **kwargs):
        response_obj = super().create(request, *args, **kwargs)
        candidate = Candidate.objects.select_related("applied_position").get(pk=response_obj.data["id"])
        score, extracted, missing, recommendation, summary = evaluate_candidate_resume(candidate)
        evaluation, _ = ResumeEvaluation.objects.update_or_create(
            candidate=candidate,
            defaults={
                "skill_match_percentage": score,
                "extracted_skills": extracted,
                "missing_skills": missing,
                "recommendation": recommendation,
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
        score, extracted, missing, recommendation, summary = evaluate_candidate_resume(candidate)
        evaluation, _ = ResumeEvaluation.objects.update_or_create(
            candidate=candidate,
            defaults={
                "skill_match_percentage": score,
                "extracted_skills": extracted,
                "missing_skills": missing,
                "recommendation": recommendation,
                "ai_summary": summary,
            },
        )
        return response.Response(self.get_serializer(evaluation).data)


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
