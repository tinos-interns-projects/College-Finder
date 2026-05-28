
from django.urls import path
from .views import search_courses, chatbot_reply, dropdown_options

urlpatterns = [
    path('api/search/', search_courses),
    path('api/chat/', chatbot_reply),
    path('api/dropdowns/', dropdown_options),# <-- Add this line!
]