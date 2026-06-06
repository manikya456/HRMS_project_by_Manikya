from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CandidateViewSet, ChatConversationViewSet, InterviewSessionViewSet, JobOpeningViewSet, ResumeEvaluationViewSet

router = DefaultRouter()
router.register("jobs", JobOpeningViewSet, basename="jobs")
router.register("candidates", CandidateViewSet, basename="candidates")
router.register("evaluations", ResumeEvaluationViewSet, basename="evaluations")
router.register("chat", ChatConversationViewSet, basename="chat")
router.register("interviews", InterviewSessionViewSet, basename="interviews")

urlpatterns = [path("", include(router.urls))]
