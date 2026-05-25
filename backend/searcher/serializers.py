from rest_framework import serializers
from .models import CollegeCourse

class CollegeCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollegeCourse
        fields = '__all__'