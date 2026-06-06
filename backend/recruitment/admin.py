from django.contrib import admin

from .models import BulkResumeUpload, Candidate, ChatConversation, InterviewSession, JobOpening, ResumeEvaluation, ResumeMatch, StoredResume

admin.site.register([JobOpening, Candidate, ResumeEvaluation, BulkResumeUpload, StoredResume, ResumeMatch, ChatConversation, InterviewSession])
