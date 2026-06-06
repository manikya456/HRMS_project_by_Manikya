from rest_framework.permissions import BasePermission


class IsAdminHRManager(BasePermission):
    allowed_roles = {"ADMIN", "HR_RECRUITER", "SENIOR_MANAGER"}

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, "role", None) in self.allowed_roles)


class IsEmployeeSelfOrStaff(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False
        return user.is_staff or getattr(obj, "user_id", None) == user.id or getattr(user, "role", None) in {"ADMIN", "HR_RECRUITER", "SENIOR_MANAGER"}

