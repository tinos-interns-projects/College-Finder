import json
import pickle
import numpy as np
import nltk
from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Download essential text processing pieces
nltk.download('punkt')

stemmer = PorterStemmer()

# 1. Load Intents Data
with open('intents.json', 'r') as f:
    intents_data = json.load(f)

X = []  # To store the input text patterns
y = []  # To store the corresponding target tags

for intent in intents_data['intents']:
    for pattern in intent['patterns']:
        # Tokenize words cleanly
        words = nltk.word_tokenize(pattern.lower())
        # Stem words to reduce duplication (e.g., "charges", "charging" -> "charg")
        stemmed_words = [stemmer.stem(w) for w in words]
        
        X.append(" ".join(stemmed_words))
        y.append(intent['tag'])

# 2. Text Vectorization (TF-IDF)
vectorizer = TfidfVectorizer()
X_transformed = vectorizer.fit_transform(X)

# 3. Train the Classifier
model = LogisticRegression(max_iter=1000)
model.fit(X_transformed, y)

# 4. Save the trained components so Django can read them instantly
with open('chatbot_model.pkl', 'wb') as f:
    pickle.dump(model, f)

with open('vectorizer.pkl', 'wb') as f:
    pickle.dump(vectorizer, f)

print("🎯 Chatbot ML Model trained and saved successfully!")