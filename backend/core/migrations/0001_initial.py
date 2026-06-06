from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Employee",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("employee_id", models.CharField(max_length=50, unique=True)),
                ("full_name", models.CharField(max_length=200)),
                ("department", models.CharField(max_length=120)),
                ("designation", models.CharField(max_length=120)),
                ("salary", models.DecimalField(decimal_places=2, max_digits=12)),
                ("joining_date", models.DateField()),
                ("status", models.CharField(choices=[("ACTIVE", "Active"), ("ONBOARDING", "Onboarding"), ("INACTIVE", "Inactive")], default="ACTIVE", max_length=20)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("address", models.TextField(blank=True)),
                ("documents", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("manager", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="team_members", to="core.employee")),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="employee_profile", to="accounts.user")),
            ],
        ),
        migrations.CreateModel(
            name="Attendance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField(default=django.utils.timezone.now)),
                ("check_in", models.DateTimeField(blank=True, null=True)),
                ("check_out", models.DateTimeField(blank=True, null=True)),
                ("working_hours", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("status", models.CharField(choices=[("PRESENT", "Present"), ("ABSENT", "Absent"), ("LATE", "Late"), ("HALF_DAY", "Half Day")], default="ABSENT", max_length=20)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to="core.employee")),
            ],
            options={"unique_together": {("employee", "date")}},
        ),
        migrations.CreateModel(
            name="LeaveRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("leave_type", models.CharField(max_length=50)),
                ("start_date", models.DateField()),
                ("end_date", models.DateField()),
                ("reason", models.TextField()),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")], default="PENDING", max_length=20)),
                ("ai_suggestion", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="leave_requests", to="core.employee")),
            ],
        ),
        migrations.CreateModel(
            name="Payroll",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("month", models.CharField(max_length=20)),
                ("basic_salary", models.DecimalField(decimal_places=2, max_digits=12)),
                ("allowances", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("deductions", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("tax", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("net_salary", models.DecimalField(decimal_places=2, max_digits=12)),
                ("payslip_pdf", models.FileField(blank=True, null=True, upload_to="payslips/")),
                ("generated_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="payrolls", to="core.employee")),
            ],
        ),
        migrations.CreateModel(
            name="Performance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("attendance_score", models.PositiveIntegerField(default=0)),
                ("task_score", models.PositiveIntegerField(default=0)),
                ("manager_rating", models.PositiveIntegerField(default=0)),
                ("final_score", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("ai_feedback", models.TextField(blank=True)),
                ("review_period", models.CharField(default="Monthly", max_length=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="performance_records", to="core.employee")),
            ],
        ),
        migrations.CreateModel(
            name="EmployeeDocument",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=120)),
                ("file", models.FileField(upload_to="employee-documents/")),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="documents_uploads", to="core.employee")),
            ],
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("message", models.TextField()),
                ("is_read", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="notifications", to="accounts.user")),
            ],
        ),
        migrations.CreateModel(
            name="ActivityLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=120)),
                ("entity_type", models.CharField(max_length=120)),
                ("entity_id", models.CharField(blank=True, max_length=120)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="accounts.user")),
            ],
        ),
    ]
