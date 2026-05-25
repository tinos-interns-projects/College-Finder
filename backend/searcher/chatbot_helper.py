import os
import json
import pickle
import random
import nltk
from nltk.stem import PorterStemmer
from searcher.models import CollegeCourse

stemmer = PorterStemmer()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(BASE_DIR, 'chatbot_model.pkl'), 'rb') as f:
    model = pickle.load(f)

with open(os.path.join(BASE_DIR, 'vectorizer.pkl'), 'rb') as f:
    vectorizer = pickle.load(f)

with open(os.path.join(BASE_DIR, 'intents.json'), 'r') as f:
    intents_data = json.load(f)

def clean_and_predict(user_sentence, memory=None):
    """
    Processes the user's sentence and checks against session memory
    to provide persistent, context-aware database filtering.
    """
    if memory is None:
        memory = {}

    # 1. Preprocess and Predict Intent
    words = nltk.word_tokenize(user_sentence.lower())
    stemmed_words = [stemmer.stem(w) for w in words]
    processed_sentence = " ".join(stemmed_words)

    transformed_text = vectorizer.transform([processed_sentence])
    predicted_tag = model.predict(transformed_text)[0]

    # 2. Extract Keywords from Current Message
    locations = ["ernakulam", "bengaluru", "kanakapura", "karnataka", "kerala"]
    programs = ["btech", "b.tech", "mtech", "mba", "bba", "bca", "nursing"]

    current_location = None
    current_program = None

    for word in words:
        if word in locations:
            current_location = word
        if word in programs:
            current_program = word

    # 3. Contextual Memory Lookup: Update or Retain Filters
    if current_location:
        memory['last_location'] = current_location
    if current_program:
        memory['last_program'] = current_program

    # Check if this is a follow-up query relying on memory
    # (e.g. user just said "what about btech" after searching for a location)
    is_follow_up_search = (predicted_tag == "course_search" or 
                           ('last_location' in memory and (current_location or current_program)))

    # 4. Handle Search Queries Natively
    if is_follow_up_search:
        queryset = CollegeCourse.objects.all()
        detected_filters = []

        # Use updated memory variables for the query
        saved_location = memory.get('last_location')
        saved_program = memory.get('last_program')

        if saved_location:
            queryset = queryset.filter(location__icontains=saved_location) | queryset.filter(state__icontains=saved_location)
            detected_filters.append(f"in {saved_location.title()}")
        
        if saved_program:
            if saved_program == "btech":
                queryset = queryset.filter(program_level__icontains="B.Tech")
            else:
                queryset = queryset.filter(program_level__icontains=saved_program)
            detected_filters.append(f"for {saved_program.upper()}")

        results = queryset[:3]
        
        if results.exists():
            filter_phrase = " " + " and ".join(detected_filters) if detected_filters else ""
            reply = f"Based on our chat history, I found these matching options{filter_phrase}:\n\n"
            for course in results:
                reply += f"📍 *{course.college}* ({course.location})\n"
                reply += f"   • Course: {course.course_name} ({course.program_level})\n"
                reply += f"   • Fee: INR {course.total_fee:,}\n\n"
            return reply.strip(), memory
        else:
            return f"I remembered you're looking for options{filter_phrase}, but I couldn't find matches in our current database records.", memory

    # 5. Fallback to Static Intents
    for intent in intents_data['intents']:
        if intent['tag'] == predicted_tag:
            return random.choice(intent['responses']), memory
            
    return "I'm not entirely sure how to answer that. Could you try rephrasing?", memory