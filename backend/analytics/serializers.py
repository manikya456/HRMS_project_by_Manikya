from rest_framework import serializers


class MetricsSerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    open_positions = serializers.IntegerField()
    candidates = serializers.IntegerField()
    interviews = serializers.IntegerField()
    payroll_cost = serializers.DecimalField(max_digits=12, decimal_places=2)
    present_today = serializers.IntegerField()
    absent_today = serializers.IntegerField()
    average_attendance = serializers.DecimalField(max_digits=5, decimal_places=2)
    department_distribution = serializers.ListField()
    monthly_attendance = serializers.ListField()
    performance_trends = serializers.ListField()
    attrition_risk = serializers.DictField()
    department_health = serializers.DictField()
    sentiment = serializers.DictField()
    company_summary = serializers.CharField()
