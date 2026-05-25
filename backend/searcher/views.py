import json
import os
from rest_framework.decorators import api_view
from rest_framework.response import Response
from google import genai
from google.genai import types
from .models import CollegeCourse
from .serializers import CollegeCourseSerializer

<<<<<<< HEAD

=======
# Initialize the Gemini client safely
# 🚀 REPLACE "your-free-gemini-key-here" with your real key string from AI Studio!
>>>>>>> 71dc21094fa81c5aab49a7c4ca410d4bdbe2e3b6
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "API_KEY")
client = genai.Client(api_key=GEMINI_KEY)


# --- 1. MAIN GRID FILTER VIEW ---
@api_view(['GET'])
def search_courses(request):
    queryset = CollegeCourse.objects.all()

    state = request.GET.get('state')
    program_level = request.GET.get('program_level')
    max_fee = request.GET.get('max_fee')
    search = request.GET.get('search')

    if state:
        queryset = queryset.filter(state__icontains=state)
    if program_level:
        queryset = queryset.filter(program_level__icontains=program_level)
    if max_fee:
        queryset = queryset.filter(total_fee__lte=max_fee)
    if search:
        queryset = queryset.filter(course_name__icontains=search)

    serializer = CollegeCourseSerializer(queryset, many=True)
    return Response(serializer.data)


# --- 2. FREE LLM POWERED DYNAMIC CHATBOT VIEW ---
@api_view(['POST'])
def chatbot_reply(request):
    user_message = request.data.get('message', '').strip()
    
    if not user_message:
        return Response({"reply": "Please say something! I'm listening."})

    system_instruction = (
        "You are an expert data extraction assistant for an Indian educational database. "
        "Analyze the user's message and extract parameters for filtering a database. "
        "You must return ONLY a raw JSON object containing these keys: 'state', 'location', 'program_level', 'course_name'. "
        "Rules:\n"
        "1. Standardize well-known typo variations (e.g., 'Banglore' or 'Bangalore' must become 'Bengaluru').\n"
        "2. If the user asks for 'GNM', you must output 'General Nursing & Midwifery' as the 'course_name' to match the database records.\n"
        "3. Recognize short abbreviations for programs (e.g., 'Btech' -> 'B.Tech').\n"
        "4. Set values to null if they are not explicitly mentioned or implied by the user.\n"
        "5. Do not include markdown formatting. Output pure raw JSON text matching the schema."
    )

    try:
        # Call Gemini with a forced structured JSON object format response configuration
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=f"User query: '{user_message}'",
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                temperature=0.0,
            ),
        )
        
        # Load the extracted parameters cleanly from Gemini text response
        extracted_data = json.loads(response.text)
        
        matched_state = extracted_data.get('state')
        matched_location = extracted_data.get('location')
        matched_program = extracted_data.get('program_level')
        matched_course = extracted_data.get('course_name')

    except Exception as e:
        print("====== GEMINI CRASH ERROR LOG ======")
        import traceback
        traceback.print_exc()
        print("====================================")
        return Response({"reply": "I'm having a bit of trouble reading your request right now. Could you try asking more simply?"})

    if matched_state or matched_location or matched_course or matched_program:
        from django.db.models import Q 
        queryset = CollegeCourse.objects.all()
        
        if matched_state:
            queryset = queryset.filter(state__icontains=matched_state)
            
        if matched_location:
            
            if matched_location.lower() in ['bengaluru', 'bangalore', 'banglore']:
                queryset = queryset.filter(
                    Q(location__icontains='Bengaluru') | 
                    Q(location__icontains='Bangalore') | 
                    Q(location__icontains='Banglore')
                )
            # Catch other common historical Indian city name variations
            elif matched_location.lower() in ['kochi', 'cochin']:
                queryset = queryset.filter(Q(location__icontains='Kochi') | Q(location__icontains='Cochin'))
            elif matched_location.lower() in ['mumbai', 'bombay']:
                queryset = queryset.filter(Q(location__icontains='Mumbai') | Q(location__icontains='Bombay'))
            elif matched_location.lower() in ['chennai', 'madras']:
                queryset = queryset.filter(Q(location__icontains='Chennai') | Q(location__icontains='Madras'))
            else:
                queryset = queryset.filter(location__icontains=matched_location)
            
        if matched_program:
            queryset = queryset.filter(program_level__icontains=matched_program)

        if matched_course:
            queryset = queryset.filter(course_name__icontains=matched_course)
        
        results = queryset[:3]
        
        #  FALLBACK FILTER: If the strict combined search returns nothing, look for just the course!
        if not results and matched_course:
            print(f"Strict search failed for {matched_course} in {matched_location}. Falling back to general course search...")
            results = CollegeCourse.objects.filter(course_name__icontains=matched_course)[:3]
        
        if results:
            reply_string = "Here are the best matching options found directly in our system records:\n\n"
            for course_obj in results:
                fee_display = f"INR {course_obj.total_fee:,}" if course_obj.total_fee else "Contact College"
                reply_string += f"📍 *{course_obj.college}* ({course_obj.location}, {course_obj.state})\n"
                reply_string += f"• Course: {course_obj.course_name} ({course_obj.program_level})\n"
                reply_string += f"• Fee: {fee_display}\n\n"
            return Response({"reply": reply_string})
        else:
            loc_text = f" in {matched_location or matched_state}" if (matched_location or matched_state) else ""
            course_text = f" offering {matched_course or matched_program}" if (matched_course or matched_program) else ""
            return Response({
                "reply": f"I found the keywords for your request, but we don't have any colleges{loc_text}{course_text} listed inside our records right now."
            })
