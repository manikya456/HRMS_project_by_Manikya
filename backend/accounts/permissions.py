from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in self.allowed_roles)


class IsAdminOrHR(HasRole):
    allowed_roles = ("ADMIN", "HR_RECRUITER", "SENIOR_MANAGER")


class IsAdminOnly(HasRole):
    allowed_roles = ("ADMIN",)

