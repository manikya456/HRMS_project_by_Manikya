from django.utils import timezone
from rest_framework import decorators, permissions, response, status, viewsets
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter

from accounts.permissions import CanManageEmployees, CanViewEmployeeManagement, IsAdminOrHR, IsAdminOnly
from .models import ActivityLog, Attendance, Employee, EmployeeDocument, LeaveRequest, Notification, Payroll, Performance
from .hr_chat import answer_hr_question
from .serializers import (
    ActivityLogSerializer,
    AttendanceSerializer,
    EmployeeDocumentSerializer,
    EmployeeSerializer,
    LeaveRequestSerializer,
    NotificationSerializer,
    PayrollSerializer,
    PerformanceSerializer,
)
from .services import calculate_working_hours


class HRChatAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payload = answer_hr_question(
            request.user,
            request.data.get("message", ""),
            history=request.data.get("history", []),
        )
        return response.Response(payload)


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related("user", "manager").all().order_by("-created_at")
    serializer_class = EmployeeSerializer
    filter_backends = [SearchFilter]
    search_fields = ["employee_id", "full_name", "department", "designation"]
    permission_classes = [CanViewEmployeeManagement]

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [CanManageEmployees()]
        return super().get_permissions()

    def perform_create(self, serializer):
        obj = serializer.save()
        ActivityLog.objects.create(actor=self.request.user, action="CREATE", entity_type="Employee", entity_id=str(obj.id))


class EmployeeDocumentViewSet(viewsets.ModelViewSet):
    queryset = EmployeeDocument.objects.select_related("employee").all().order_by("-uploaded_at")
    serializer_class = EmployeeDocumentSerializer
    permission_classes = [IsAdminOrHR]


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("employee").all().order_by("-date")
    serializer_class = AttendanceSerializer
    filterset_fields = ["employee", "date", "status"]
    permission_classes = [IsAdminOrHR]

    @decorators.action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def check_in(self, request):
        employee = request.user.employee_profile
        attendance, _ = Attendance.objects.get_or_create(employee=employee, date=timezone.localdate())
        attendance.check_in = timezone.now()
        attendance.status = "PRESENT"
        attendance.save()
        return response.Response(self.get_serializer(attendance).data)

    @decorators.action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def check_out(self, request):
        employee = request.user.employee_profile
        attendance, _ = Attendance.objects.get_or_create(employee=employee, date=timezone.localdate())
        attendance.check_out = timezone.now()
        attendance.working_hours = calculate_working_hours(attendance.check_in, attendance.check_out)
        attendance.save()
        return response.Response(self.get_serializer(attendance).data)

    @decorators.action(detail=False, methods=["get"])
    def monthly_report(self, request):
        month = request.query_params.get("month")
        records = self.get_queryset()
        if month:
            records = records.filter(date__month=month)
        return response.Response(self.get_serializer(records, many=True).data)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related("employee").all().order_by("-created_at")
    serializer_class = LeaveRequestSerializer
    filterset_fields = ["employee", "status", "leave_type"]

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsAdminOrHR])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.LeaveStatus.APPROVED
        leave.save(update_fields=["status"])
        return response.Response(self.get_serializer(leave).data)

    @decorators.action(detail=True, methods=["post"], permission_classes=[IsAdminOrHR])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.LeaveStatus.REJECTED
        leave.save(update_fields=["status"])
        return response.Response(self.get_serializer(leave).data)


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related("employee").all().order_by("-generated_at")
    serializer_class = PayrollSerializer
    filterset_fields = ["employee", "month"]
    permission_classes = [IsAdminOrHR]

    @decorators.action(detail=True, methods=["get"])
    def payslip(self, request, pk=None):
        payroll = self.get_object()
        if payroll.payslip_pdf:
            return response.Response({"url": payroll.payslip_pdf.url})
        return response.Response({"detail": "Payslip not generated."}, status=status.HTTP_404_NOT_FOUND)


class PerformanceViewSet(viewsets.ModelViewSet):
    queryset = Performance.objects.select_related("employee").all().order_by("-created_at")
    serializer_class = PerformanceSerializer
    filterset_fields = ["employee", "review_period"]
    permission_classes = [IsAdminOrHR]


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all().order_by("-created_at")
    serializer_class = NotificationSerializer


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all().order_by("-created_at")
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdminOnly]
