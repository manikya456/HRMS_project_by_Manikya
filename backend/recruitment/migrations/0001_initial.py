from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("accounts", "0001_initial"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="JobOpening",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=200)),
                ("department", models.CharField(max_length=120)),
                ("description", models.TextField()),
                ("required_skills", models.TextField()),
                ("experience_required", models.CharField(max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name="Candidate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=200)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("resume", models.FileField(upload_to="resumes/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("applied_position", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidates", to="recruitment.jobopening")),
                ("user", models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="candidate_profile", to="accounts.user")),
            ],
        ),
        migrations.CreateModel(
            name="ResumeEvaluation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("skill_match_percentage", models.PositiveIntegerField(default=0)),
                ("extracted_skills", models.JSONField(default=list)),
                ("missing_skills", models.JSONField(default=list)),
                ("recommendation", models.CharField(max_length=120)),
                ("ai_summary", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("candidate", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="evaluation", to="recruitment.candidate")),
            ],
        ),
        migrations.CreateModel(
            name="ChatConversation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("user", "User"), ("assistant", "Assistant")], max_length=20)),
                ("message", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_conversations", to="recruitment.candidate")),
            ],
        ),
        migrations.CreateModel(
            name="InterviewSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("score", models.PositiveIntegerField(default=0)),
                ("transcript", models.TextField(blank=True)),
                ("recommendation", models.CharField(blank=True, max_length=120)),
                ("communication_score", models.PositiveIntegerField(default=0)),
                ("technical_score", models.PositiveIntegerField(default=0)),
                ("confidence_score", models.PositiveIntegerField(default=0)),
                ("questions", models.JSONField(blank=True, default=list)),
                ("answers", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("candidate", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interview_sessions", to="recruitment.candidate")),
            ],
        ),
    ]
