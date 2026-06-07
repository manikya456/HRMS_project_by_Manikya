from decimal import Decimal
from datetime import timedelta

from django.db.models import Count, Avg, Sum
from django.utils import timezone
from rest_framework import permissions, response, views

from core.models import Attendance, Employee, Payroll, Performance
from recruitment.models import Candidate, InterviewSession, JobOpening
from core.services import generate_ai_text
from .serializers import MetricsSerializer


class MetricsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @staticmethod
    def _shift_month(month_start, months_back):
        month_index = month_start.month - 1 - months_back
        year = month_start.year + month_index // 12
        month = month_index % 12 + 1
        return month_start.replace(year=year, month=month)

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
        attendance_trend = []
        for day_offset in range(6, -1, -1):
            day = today - timedelta(days=day_offset)
            day_records = Attendance.objects.filter(date=day)
            total_records = day_records.count()
            present_count = day_records.filter(status="PRESENT").count()
            attendance_rate = round((present_count / total_records) * 100, 2) if total_records else 0
            attendance_trend.append(
                {
                    "name": day.strftime("%a"),
                    "value": attendance_rate,
                    "present": present_count,
                    "total": total_records,
                    "date": day.isoformat(),
                }
            )

        payroll_trend = []
        month_start = today.replace(day=1)
        for month_offset in range(5, -1, -1):
            month_date = self._shift_month(month_start, month_offset)
            month_label = month_date.strftime("%b %Y")
            payroll_total = (
                Payroll.objects.filter(month=month_label).aggregate(total=Sum("net_salary"))["total"]
                or Decimal("0.00")
            )
            payroll_trend.append(
                {
                    "name": month_date.strftime("%b"),
                    "month": month_label,
                    "payroll": float(payroll_total),
                }
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
            "attendance_trend": attendance_trend,
            "payroll_trend": payroll_trend,
            "performance_trends": performance_trends,
            "attrition_risk": attrition_risk,
            "department_health": department_health,
            "sentiment": sentiment,
            "company_summary": company_summary,
        }
        return response.Response(MetricsSerializer(payload).data)
