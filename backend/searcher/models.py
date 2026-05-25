
from django.db import models

class CollegeCourse(models.Model):
    college = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    state = models.CharField(max_length=100)
    program_level = models.CharField(max_length=50)  # e.g., B.Tech, M.Tech
    course_name = models.CharField(max_length=255)   # e.g., Aerospace Engineering
    total_fee = models.IntegerField(null=True, blank=True)              # Stored as an integer for easy mathematical filtering (e.g., < 300000)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.college} - {self.course_name}"