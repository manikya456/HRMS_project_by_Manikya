from django.contrib.auth import get_user_model
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


class MeView(APIView):
    def get(self, request):
        payload = UserSerializer(request.user).data
        employee_profile = getattr(request.user, "employee_profile", None)
        candidate_profile = getattr(request.user, "candidate_profile", None)
        if employee_profile:
            manager = employee_profile.manager
            payload["employee_profile"] = {
                "id": employee_profile.id,
                "employee_id": employee_profile.employee_id,
                "full_name": employee_profile.full_name,
                "department": employee_profile.department,
                "designation": employee_profile.designation,
                "status": employee_profile.status,
                "joining_date": employee_profile.joining_date,
                "phone": employee_profile.phone,
                "address": employee_profile.address,
                "salary": str(employee_profile.salary),
                "manager": {
                    "id": manager.id,
                    "employee_id": manager.employee_id,
                    "full_name": manager.full_name,
                } if manager else None,
            }
        if candidate_profile:
            payload["candidate_profile"] = {
                "id": candidate_profile.id,
                "name": candidate_profile.name,
                "email": candidate_profile.email,
                "phone": candidate_profile.phone,
                "applied_position": {
                    "id": candidate_profile.applied_position.id,
                    "title": candidate_profile.applied_position.title,
                } if candidate_profile.applied_position else None,
            }
        return Response(payload)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
