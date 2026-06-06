from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "ADMIN")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, username, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        SENIOR_MANAGER = "SENIOR_MANAGER", "Senior Manager"
        HR_RECRUITER = "HR_RECRUITER", "HR Recruiter"
        EMPLOYEE = "EMPLOYEE", "Employee"
        CANDIDATE = "CANDIDATE", "Candidate"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.EMPLOYEE)
    profile_photo = models.ImageField(upload_to="profiles/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"
