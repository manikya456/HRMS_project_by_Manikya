from django.contrib import admin

from .models import Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation

admin.site.register([JobOpening, Candidate, ResumeEvaluation, ChatConversation, InterviewSession])
