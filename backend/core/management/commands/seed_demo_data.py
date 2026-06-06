from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from accounts.models import User
from core.models import Attendance, Employee, LeaveRequest, Payroll, Performance
from recruitment.models import Candidate, JobOpening, InterviewSession


class Command(BaseCommand):
    help = "Seed the database with demo AI-HRMS records."

    def handle(self, *args, **options):
        admin, _ = User.objects.get_or_create(
            email="admin@aihrms.local",
            defaults={
                "username": "admin",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "System",
                "last_name": "Admin",
            },
        )
        admin.set_password("Admin@12345")
        admin.save()

        hr, _ = User.objects.get_or_create(
            email="hr@aihrms.local",
            defaults={"username": "hr.recruiter", "role": User.Role.HR_RECRUITER, "first_name": "Harper", "last_name": "Reed"},
        )
        hr.set_password("Hr@12345")
        hr.save()

        manager, _ = User.objects.get_or_create(
            email="manager@aihrms.local",
            defaults={"username": "manager", "role": User.Role.SENIOR_MANAGER, "first_name": "Maya", "last_name": "Singh"},
        )
        manager.set_password("Manager@12345")
        manager.save()

        employee_user, _ = User.objects.get_or_create(
            email="employee@aihrms.local",
            defaults={"username": "employee", "role": User.Role.EMPLOYEE, "first_name": "Evan", "last_name": "Stone"},
        )
        employee_user.set_password("Employee@12345")
        employee_user.save()

        employee, _ = Employee.objects.get_or_create(
            user=employee_user,
            defaults={
                "employee_id": "EMP-1001",
                "full_name": "Evan Stone",
                "department": "Engineering",
                "designation": "Software Engineer",
                "salary": 120000,
                "joining_date": timezone.now().date(),
                "status": Employee.Status.ACTIVE,
            },
        )

        JobOpening.objects.get_or_create(
            title="Senior Django Engineer",
            defaults={
                "department": "Engineering",
                "description": "Build APIs, dashboards, and AI workflows for the HR platform.",
                "required_skills": "Python, Django, PostgreSQL, React, Docker, AWS",
                "experience_required": "4+ years",
                "is_active": True,
            },
        )

        job = JobOpening.objects.first()
        candidate, _ = Candidate.objects.get_or_create(
            email="candidate@example.com",
            defaults={
                "name": "Aarav Patel",
                "phone": "+91 90000 00000",
                "resume": "resumes/sample.pdf",
                "applied_position": job,
            },
        )

        Attendance.objects.get_or_create(
            employee=employee,
            date=timezone.localdate(),
            defaults={
                "check_in": timezone.now(),
                "check_out": timezone.now(),
                "working_hours": 8,
                "status": "PRESENT",
            },
        )

        LeaveRequest.objects.get_or_create(
            employee=employee,
            leave_type="Casual Leave",
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            defaults={"reason": "Family commitment", "status": LeaveRequest.LeaveStatus.PENDING},
        )

        Payroll.objects.get_or_create(
            employee=employee,
            month=timezone.now().strftime("%B %Y"),
            defaults={
                "basic_salary": 100000,
                "allowances": 12000,
                "deductions": 6000,
                "tax": 12000,
                "net_salary": 94000,
            },
        )

        Performance.objects.get_or_create(
            employee=employee,
            review_period="Monthly",
            defaults={
                "attendance_score": 92,
                "task_score": 88,
                "manager_rating": 90,
                "final_score": 90,
                "ai_feedback": "Excellent reliability and strong delivery performance.",
            },
        )

        InterviewSession.objects.get_or_create(
            candidate=candidate,
            defaults={
                "score": 86,
                "transcript": "Sample interview transcript.",
                "recommendation": "Proceed to next round",
                "communication_score": 88,
                "technical_score": 90,
                "confidence_score": 84,
                "questions": [
                    "Tell me about yourself.",
                    "Describe a challenging project and how you handled it.",
                ],
                "answers": [
                    "I have worked on enterprise Django systems.",
                    "I led an internal analytics migration.",
                ],
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
