from rest_framework.routers import DefaultRouter
from django.urls import path, include

from .views import (
    ActivityLogViewSet,
    AttendanceViewSet,
    EmployeeDocumentViewSet,
    EmployeeViewSet,
    HRChatAPIView,
    LeaveRequestViewSet,
    NotificationViewSet,
    PayrollViewSet,
    PerformanceViewSet,
)

router = DefaultRouter()
router.register("employees", EmployeeViewSet, basename="employees")
router.register("employee-documents", EmployeeDocumentViewSet, basename="employee-documents")
router.register("attendance", AttendanceViewSet, basename="attendance")
router.register("leave", LeaveRequestViewSet, basename="leave")
router.register("payroll", PayrollViewSet, basename="payroll")
router.register("performance", PerformanceViewSet, basename="performance")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("audit-logs", ActivityLogViewSet, basename="audit-logs")

urlpatterns = [
    path("hr-chat/", HRChatAPIView.as_view(), name="hr-chat"),
    path("", include(router.urls)),
]
