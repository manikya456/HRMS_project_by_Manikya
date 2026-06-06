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
            payload["employee_profile"] = {
                "id": employee_profile.id,
                "employee_id": employee_profile.employee_id,
                "full_name": employee_profile.full_name,
            }
        if candidate_profile:
            payload["candidate_profile"] = {
                "id": candidate_profile.id,
                "name": candidate_profile.name,
            }
        return Response(payload)


class CustomTokenObtainPairView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]
