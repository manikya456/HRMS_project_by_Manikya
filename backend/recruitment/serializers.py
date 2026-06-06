from rest_framework import serializers

from .models import Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation


class JobOpeningSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobOpening
        fields = "__all__"


class CandidateSerializer(serializers.ModelSerializer):
    evaluation = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Candidate
        fields = "__all__"

    def get_evaluation(self, obj):
        evaluation = getattr(obj, "evaluation", None)
        if not evaluation:
            return None
        return ResumeEvaluationSerializer(evaluation).data


class ResumeEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeEvaluation
        fields = "__all__"
        read_only_fields = ("skill_match_percentage", "extracted_skills", "missing_skills", "recommendation", "ai_summary")


class ChatConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatConversation
        fields = "__all__"


class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = "__all__"
