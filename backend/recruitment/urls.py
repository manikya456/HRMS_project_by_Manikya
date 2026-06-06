from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BulkResumeUploadViewSet,
    CandidateViewSet,
    ChatConversationViewSet,
    InterviewSessionViewSet,
    JobOpeningViewSet,
    ResumeMatchViewSet,
    ResumeEvaluationViewSet,
    StoredResumeViewSet,
)

router = DefaultRouter()
router.register("jobs", JobOpeningViewSet, basename="jobs")
router.register("candidates", CandidateViewSet, basename="candidates")
router.register("evaluations", ResumeEvaluationViewSet, basename="evaluations")
router.register("bulk-resumes", BulkResumeUploadViewSet, basename="bulk-resumes")
router.register("stored-resumes", StoredResumeViewSet, basename="stored-resumes")
router.register("resume-matches", ResumeMatchViewSet, basename="resume-matches")
router.register("chat", ChatConversationViewSet, basename="chat")
router.register("interviews", InterviewSessionViewSet, basename="interviews")

urlpatterns = [path("", include(router.urls))]
