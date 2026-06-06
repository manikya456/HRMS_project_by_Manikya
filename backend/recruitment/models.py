from django.conf import settings
from django.db import models


class JobOpening(models.Model):
    title = models.CharField(max_length=200)
    department = models.CharField(max_length=120)
    description = models.TextField()
    required_skills = models.TextField()
    experience_required = models.CharField(max_length=120)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Candidate(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    resume = models.FileField(upload_to="resumes/")
    applied_position = models.ForeignKey(JobOpening, on_delete=models.SET_NULL, null=True, related_name="candidates")
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="candidate_profile")


class ResumeEvaluation(models.Model):
    candidate = models.OneToOneField(Candidate, on_delete=models.CASCADE, related_name="evaluation")
    skill_match_percentage = models.PositiveIntegerField(default=0)
    extracted_skills = models.JSONField(default=list)
    missing_skills = models.JSONField(default=list)
    recommendation = models.CharField(max_length=120)
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class ChatConversation(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="chat_conversations")
    role = models.CharField(max_length=20, choices=[("user", "User"), ("assistant", "Assistant")])
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class InterviewSession(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name="interview_sessions")
    score = models.PositiveIntegerField(default=0)
    transcript = models.TextField(blank=True)
    recommendation = models.CharField(max_length=120, blank=True)
    communication_score = models.PositiveIntegerField(default=0)
    technical_score = models.PositiveIntegerField(default=0)
    confidence_score = models.PositiveIntegerField(default=0)
    questions = models.JSONField(default=list, blank=True)
    answers = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

