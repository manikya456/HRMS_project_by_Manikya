from decimal import Decimal

from django.db.models import Count, Avg, Sum
from django.utils import timezone
from rest_framework import permissions, response, views

from core.models import Attendance, Employee, Payroll, Performance
from recruitment.models import Candidate, InterviewSession, JobOpening
from core.services import generate_ai_text
from .serializers import MetricsSerializer


class MetricsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        total_employees = Employee.objects.count()
        open_positions = JobOpening.objects.filter(is_active=True).count()
        candidates = Candidate.objects.count()
        interviews = InterviewSession.objects.count()
        payroll_cost = Payroll.objects.aggregate(total=Sum("net_salary"))["total"] or Decimal("0.00")
        today_attendance = Attendance.objects.filter(date=today)
        present_today = today_attendance.filter(status="PRESENT").count()
        absent_today = today_attendance.filter(status="ABSENT").count()
        average_attendance = today_attendance.aggregate(avg=Avg("working_hours"))["avg"] or Decimal("0.00")
        department_distribution = list(
            Employee.objects.values("department").annotate(value=Count("id")).order_by("-value")
        )
        monthly_attendance = list(
            Attendance.objects.values("date").annotate(value=Count("id")).order_by("date")[:12]
        )
        performance_trends = list(
            Performance.objects.values("review_period").annotate(value=Avg("final_score")).order_by("review_period")
        )
        attrition_risk = {
            "level": "High" if total_employees and present_today / max(total_employees, 1) < 0.6 else "Medium",
            "probability": 78 if total_employees else 0,
        }
        department_health = {"score": 84, "label": "Healthy"}
        sentiment = {"score": 71, "label": "Positive"}
        company_summary = generate_ai_text(
            "Provide a concise company performance summary based on HR metrics.",
            "Company performance remains stable with healthy recruitment and attendance signals.",
        )
        payload = {
            "total_employees": total_employees,
            "open_positions": open_positions,
            "candidates": candidates,
            "interviews": interviews,
            "payroll_cost": payroll_cost,
            "present_today": present_today,
            "absent_today": absent_today,
            "average_attendance": average_attendance,
            "department_distribution": department_distribution,
            "monthly_attendance": monthly_attendance,
            "performance_trends": performance_trends,
            "attrition_risk": attrition_risk,
            "department_health": department_health,
            "sentiment": sentiment,
            "company_summary": company_summary,
        }
        return response.Response(MetricsSerializer(payload).data)
