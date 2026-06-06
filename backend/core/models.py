from django.conf import settings
from django.db import models
from django.utils import timezone


class Employee(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ONBOARDING = "ONBOARDING", "Onboarding"
        INACTIVE = "INACTIVE", "Inactive"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee_profile")
    employee_id = models.CharField(max_length=50, unique=True)
    full_name = models.CharField(max_length=200)
    department = models.CharField(max_length=120)
    designation = models.CharField(max_length=120)
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    joining_date = models.DateField()
    manager = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="team_members")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    documents = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_id} - {self.full_name}"


class Attendance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="attendance_records")
    date = models.DateField(default=timezone.now)
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    working_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=[("PRESENT", "Present"), ("ABSENT", "Absent"), ("LATE", "Late"), ("HALF_DAY", "Half Day")],
        default="ABSENT",
    )

    class Meta:
        unique_together = ("employee", "date")


class LeaveRequest(models.Model):
    class LeaveStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=50)
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    ai_suggestion = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Payroll(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="payrolls")
    month = models.CharField(max_length=20)
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2)
    payslip_pdf = models.FileField(upload_to="payslips/", blank=True, null=True)
    generated_at = models.DateTimeField(auto_now_add=True)


class Performance(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="performance_records")
    attendance_score = models.PositiveIntegerField(default=0)
    task_score = models.PositiveIntegerField(default=0)
    manager_rating = models.PositiveIntegerField(default=0)
    final_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    ai_feedback = models.TextField(blank=True)
    review_period = models.CharField(max_length=50, default="Monthly")
    created_at = models.DateTimeField(auto_now_add=True)


class EmployeeDocument(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name="documents_uploads")
    title = models.CharField(max_length=120)
    file = models.FileField(upload_to="employee-documents/")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class ActivityLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=120)
    entity_type = models.CharField(max_length=120)
    entity_id = models.CharField(max_length=120, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
