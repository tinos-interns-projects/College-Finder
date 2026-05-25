
from django.urls import path
from .views import search_courses, chatbot_reply

urlpatterns = [
    path('api/search/', search_courses),
    path('api/chat/', chatbot_reply),  # <-- Add this line!
]