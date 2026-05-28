import json
import os

from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from google import genai
from google.genai import types

from .models import CollegeCourse
from .serializers import CollegeCourseSerializer


GEMINI_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_KEY:
    raise ValueError("Missing GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_KEY)


def _clean_distinct_values(qs, field_name):
    return list(
        qs.exclude(**{f"{field_name}__isnull": True})
          .exclude(**{f"{field_name}__exact": ""})
          .values_list(field_name, flat=True)
          .distinct()
          .order_by(field_name)
    )


@api_view(["GET"])
def search_courses(request):
    queryset = CollegeCourse.objects.all()

    state = (request.GET.get("state") or "").strip()
    location = (request.GET.get("location") or "").strip()
    program_level = (request.GET.get("program_level") or "").strip()
    course_name = (request.GET.get("course_name") or "").strip()
    search = (request.GET.get("search") or "").strip()
    max_fee = (request.GET.get("max_fee") or "").strip()

    if state:
        queryset = queryset.filter(state__icontains=state)

    if location:
        queryset = queryset.filter(location__icontains=location)

    if program_level:
        queryset = queryset.filter(program_level__icontains=program_level)

    if course_name:
        queryset = queryset.filter(course_name__icontains=course_name)

    if search:
        queryset = queryset.filter(
            Q(course_name__icontains=search) |
            Q(college__icontains=search) |
            Q(location__icontains=search) |
            Q(state__icontains=search)
        )

    if max_fee:
        try:
            queryset = queryset.filter(total_fee__lte=int(max_fee.replace(",", "")))
        except ValueError:
            return Response(
                {"detail": "max_fee must be a valid number"},
                status=status.HTTP_400_BAD_REQUEST
            )

    queryset = queryset.order_by("college", "course_name")[:500]
    serializer = CollegeCourseSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def chatbot_reply(request):
    user_message = (request.data.get("message") or "").strip()

    if not user_message:
        return Response({"reply": "Please say something. I am listening."})

    greetings = {"hi", "hello", "hey", "yo", "greetings", "help"}
    if user_message.lower() in greetings:
        return Response({
            "reply": "Hello! I can help you search the database. Try something like: 'Show me GNM courses in Kerala' or 'B.Tech colleges in Bengaluru'."
        })

    system_instruction = (
        "You are an expert data extraction assistant for an Indian educational database. "
        "Extract filter values from the user's message and return ONLY raw JSON. "
        "Use exactly these keys: state, location, program_level, course_name. "
        "Rules:\n"
        "1. Standardize common typos. Example: 'Banglore' or 'Bangalore' -> 'Bengaluru'.\n"
        "2. If the user asks for 'GNM', output 'General Nursing & Midwifery' as course_name.\n"
        "3. Recognize short program abbreviations like 'Btech' -> 'B.Tech'.\n"
        "4. Use null for anything not clearly present.\n"
        "5. Do not add markdown or any explanation. Return only valid JSON."
    )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=f"User query: {user_message}",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )

        extracted_data = json.loads(response.text or "{}")
        matched_state = extracted_data.get("state")
        matched_location = extracted_data.get("location")
        matched_program = extracted_data.get("program_level")
        matched_course = extracted_data.get("course_name")

    except Exception:
        return Response({
            "reply": "I am having trouble reading that request right now. Try a simpler phrasing."
        }, status=status.HTTP_200_OK)

    queryset = CollegeCourse.objects.all()

    if matched_state:
        queryset = queryset.filter(state__icontains=matched_state)

    if matched_location:
        queryset = queryset.filter(location__icontains=matched_location)

    if matched_program:
        queryset = queryset.filter(program_level__icontains=matched_program)

    if matched_course:
        queryset = queryset.filter(course_name__icontains=matched_course)

    results = list(queryset.order_by("college", "course_name")[:3])

    if not results and matched_course:
        results = list(
            CollegeCourse.objects.filter(course_name__icontains=matched_course)
            .order_by("college", "course_name")[:3]
        )

    if results:
        reply_string = "Here are the best matching options I found:\n\n"
        for course_obj in results:
            fee_display = f"INR {course_obj.total_fee:,}" if course_obj.total_fee else "Contact College"
            reply_string += (
                f"{course_obj.college} ({course_obj.location}, {course_obj.state})\n"
                f"Course: {course_obj.course_name} ({course_obj.program_level})\n"
                f"Fee: {fee_display}\n\n"
            )
        return Response({"reply": reply_string})

    loc_text = f" in {matched_location or matched_state}" if (matched_location or matched_state) else ""
    course_text = f" offering {matched_course or matched_program}" if (matched_course or matched_program) else ""
    return Response({
        "reply": f"I found the keywords for your request, but no matching colleges were listed{loc_text}{course_text}."
    })


@api_view(["GET"])
def dropdown_options(request):
    base_qs = CollegeCourse.objects.all()

    state = (request.GET.get("state") or "").strip()
    program_level = (request.GET.get("program_level") or "").strip()

    # Narrow dependent dropdowns based on current selections.
    if state:
        base_qs = base_qs.filter(state__icontains=state)

    if program_level:
        base_qs = base_qs.filter(program_level__icontains=program_level)

    states = _clean_distinct_values(base_qs, "state")
    locations = _clean_distinct_values(base_qs, "location")
    programs = _clean_distinct_values(base_qs, "program_level")
    courses = _clean_distinct_values(base_qs, "course_name")

    return Response({
        "states": states,
        "locations": locations,
        "programs": programs,
        "courses": courses,
    })