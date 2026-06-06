from django.contrib import admin

from .models import ActivityLog, Attendance, Employee, EmployeeDocument, LeaveRequest, Notification, Payroll, Performance

admin.site.register([Employee, Attendance, LeaveRequest, Payroll, Performance, EmployeeDocument, Notification, ActivityLog])
