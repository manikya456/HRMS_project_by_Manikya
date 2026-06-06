from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (("HRMS", {"fields": ("role", "profile_photo", "created_at")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("HRMS", {"fields": ("email", "role", "profile_photo")}),)
    list_display = ("username", "email", "role", "is_staff", "is_active")
    search_fields = ("username", "email", "role")
