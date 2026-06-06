from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import ActivityLog, Attendance, Employee, EmployeeDocument, LeaveRequest, Notification, Payroll, Performance
from .services import calculate_leave_recommendation, calculate_working_hours, build_performance_feedback, generate_payroll_pdf

User = get_user_model()


class EmployeeSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True, required=False)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_username_display = serializers.CharField(source="user.username", read_only=True)
    user_role_display = serializers.CharField(source="user.role", read_only=True)
    user_first_name_display = serializers.CharField(source="user.first_name", read_only=True)
    user_last_name_display = serializers.CharField(source="user.last_name", read_only=True)
    user_username = serializers.CharField(write_only=True, required=False, allow_blank=False)
    user_email_input = serializers.EmailField(write_only=True, required=False)
    user_password = serializers.CharField(write_only=True, required=False, allow_blank=False)
    user_role = serializers.CharField(write_only=True, required=False)
    user_first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    user_last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "user",
            "user_email",
            "user_username_display",
            "user_role_display",
            "user_first_name_display",
            "user_last_name_display",
            "user_username",
            "user_email_input",
            "user_password",
            "user_role",
            "user_first_name",
            "user_last_name",
            "employee_id",
            "full_name",
            "department",
            "designation",
            "salary",
            "joining_date",
            "manager",
            "status",
            "phone",
            "address",
            "documents",
            "created_at",
        ]

    def validate(self, attrs):
        employee_id = attrs.get("employee_id")
        if employee_id:
            qs = Employee.objects.filter(employee_id=employee_id)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"employee_id": "This employee ID already exists."})

        user_username = attrs.get("user_username")
        user_email_input = attrs.get("user_email_input")
        if user_username:
            qs = User.objects.filter(username=user_username)
            if self.instance:
                qs = qs.exclude(pk=self.instance.user_id)
            if qs.exists():
                raise serializers.ValidationError({"user_username": "This username is already in use."})
        if user_email_input:
            qs = User.objects.filter(email=user_email_input)
            if self.instance:
                qs = qs.exclude(pk=self.instance.user_id)
            if qs.exists():
                raise serializers.ValidationError({"user_email_input": "This email is already in use."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user_payload = {
            "username": validated_data.pop("user_username", None),
            "email": validated_data.pop("user_email_input", None),
            "password": validated_data.pop("user_password", None),
            "role": validated_data.pop("user_role", "EMPLOYEE"),
            "first_name": validated_data.pop("user_first_name", ""),
            "last_name": validated_data.pop("user_last_name", ""),
        }
        user = validated_data.pop("user", None)
        if user is None and user_payload["username"] and user_payload["email"] and user_payload["password"]:
            user = User.objects.create_user(
                username=user_payload["username"],
                email=user_payload["email"],
                password=user_payload["password"],
                role=user_payload["role"],
                first_name=user_payload["first_name"],
                last_name=user_payload["last_name"],
            )
            validated_data["user"] = user
        elif user is not None:
            validated_data["user"] = user
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        user = instance.user
        for field, attr in [
            ("username", "user_username"),
            ("email", "user_email_input"),
            ("role", "user_role"),
            ("first_name", "user_first_name"),
            ("last_name", "user_last_name"),
        ]:
            value = validated_data.pop(attr, None)
            if value is not None:
                setattr(user, field, value)
        password = validated_data.pop("user_password", None)
        if password:
            user.set_password(password)
        user.save()
        return super().update(instance, validated_data)


class EmployeeDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeDocument
        fields = "__all__"


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = "__all__"
        read_only_fields = ("working_hours",)

    def validate(self, attrs):
        check_in = attrs.get("check_in", getattr(self.instance, "check_in", None))
        check_out = attrs.get("check_out", getattr(self.instance, "check_out", None))
        attrs["working_hours"] = calculate_working_hours(check_in, check_out)
        return attrs


class LeaveRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveRequest
        fields = "__all__"
        read_only_fields = ("ai_suggestion",)

    def create(self, validated_data):
        leave = super().create(validated_data)
        leave.ai_suggestion = calculate_leave_recommendation(leave.employee)
        leave.save(update_fields=["ai_suggestion"])
        return leave

    def update(self, instance, validated_data):
        leave = super().update(instance, validated_data)
        leave.ai_suggestion = calculate_leave_recommendation(leave.employee)
        leave.save(update_fields=["ai_suggestion"])
        return leave


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = "__all__"
        read_only_fields = ("net_salary", "payslip_pdf")

    def create(self, validated_data):
        payroll = self._save_with_calculation(validated_data)
        return payroll

    def update(self, instance, validated_data):
        return self._save_with_calculation(validated_data, instance=instance)

    def _save_with_calculation(self, validated_data, instance=None):
        basic = validated_data.get("basic_salary", getattr(instance, "basic_salary", 0))
        allowances = validated_data.get("allowances", getattr(instance, "allowances", 0))
        deductions = validated_data.get("deductions", getattr(instance, "deductions", 0))
        tax = validated_data.get("tax", getattr(instance, "tax", 0))
        validated_data["net_salary"] = basic + allowances - deductions - tax
        payroll = super().create(validated_data) if instance is None else super().update(instance, validated_data)
        pdf_file = generate_payroll_pdf(payroll)
        payroll.payslip_pdf.save(pdf_file.name, pdf_file, save=True)
        return payroll


class PerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Performance
        fields = "__all__"
        read_only_fields = ("final_score", "ai_feedback")

    def create(self, validated_data):
        performance = self._save_with_calculation(validated_data)
        return performance

    def update(self, instance, validated_data):
        return self._save_with_calculation(validated_data, instance=instance)

    def _save_with_calculation(self, validated_data, instance=None):
        attendance_score = validated_data.get("attendance_score", 0)
        task_score = validated_data.get("task_score", 0)
        manager_rating = validated_data.get("manager_rating", 0)
        validated_data["final_score"] = round(
            (attendance_score * 0.3 + task_score * 0.4 + manager_rating * 0.3), 2
        )
        performance = super().create(validated_data) if instance is None else super().update(instance, validated_data)
        performance.ai_feedback = build_performance_feedback(performance.employee)
        performance.save(update_fields=["ai_feedback"])
        return performance


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = "__all__"
