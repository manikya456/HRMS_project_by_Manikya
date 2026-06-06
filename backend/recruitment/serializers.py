from rest_framework import serializers

from .models import BulkResumeUpload, Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation, ResumeMatch, StoredResume
from .services import extract_job_skills_from_text


class JobOpeningSerializer(serializers.ModelSerializer):
    extracted_skills = serializers.ListField(child=serializers.CharField(), read_only=True)

    class Meta:
        model = JobOpening
        fields = "__all__"

    def validate(self, attrs):
        jd_text = attrs.get("jd_text") or getattr(self.instance, "jd_text", "")
        required_skills = attrs.get("required_skills") or getattr(self.instance, "required_skills", "")
        jd_file = attrs.get("jd_file")

        if jd_file:
            from core.services import extract_pdf_text

            extracted_text = extract_pdf_text(jd_file)
            if extracted_text:
                attrs["jd_text"] = extracted_text
                jd_text = extracted_text

        extracted_skills = extract_job_skills_from_text("\n".join(filter(None, [jd_text, required_skills])))
        attrs["extracted_skills"] = extracted_skills
        return attrs


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
        read_only_fields = (
            "skill_match_percentage",
            "matched_skills",
            "extracted_skills",
            "missing_skills",
            "recommendation",
            "status",
            "ai_summary",
        )


class BulkResumeUploadSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source="job_opening.title", read_only=True)
    job_department = serializers.CharField(source="job_opening.department", read_only=True)

    class Meta:
        model = BulkResumeUpload
        fields = "__all__"
        read_only_fields = (
            "file_name",
            "extracted_text",
            "extracted_skills",
            "matched_skills",
            "missing_skills",
            "match_percentage",
            "recommendation",
            "status",
            "ai_analysis",
        )


class StoredResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoredResume
        fields = "__all__"
        read_only_fields = ("file_name", "file_hash", "extracted_text")


class ResumeMatchSerializer(serializers.ModelSerializer):
    file_name = serializers.CharField(source="stored_resume.file_name", read_only=True)
    uploaded_file = serializers.CharField(source="stored_resume.uploaded_file.url", read_only=True)
    job_title = serializers.CharField(source="job_opening.title", read_only=True)
    job_department = serializers.CharField(source="job_opening.department", read_only=True)

    class Meta:
        model = ResumeMatch
        fields = "__all__"


class ChatConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatConversation
        fields = "__all__"


class InterviewSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSession
        fields = "__all__"
