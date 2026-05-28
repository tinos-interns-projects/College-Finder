# Course Fee Searcher with AI Chatbot

## Overview

Course Fee Searcher is a full-stack web application designed to help students search, compare, and explore educational courses and college fee structures through dynamic filtering and intelligent search functionality.

The platform provides a centralized system where users can filter colleges and courses based on:

* State
* Location
* Program Type
* Course/Specialization
* Fee Structure

An integrated AI chatbot assists users by answering queries related to colleges, programs, and fees.



## Features

* Dynamic multi-filter course search
* State → Location dependent dropdowns
* Program → Course/Specialization filtering
* Fee sorting (Low to High / High to Low)
* Real-time API-based search results
* AI chatbot assistance
* Responsive frontend UI
* Full-stack React + Django architecture
* Cloud deployment support



## Tech Stack

### Frontend

* React.js
* Tailwind CSS
* JavaScript
* Vite
* React Icons

### Backend

* Django
* Python
* REST API Integration

### Database / Dataset

* CSV-based structured dataset
* SQLite 


## System Workflow

1. User accesses the web application
2. Frontend loads available filter data from backend APIs
3. User applies filters or search queries
4. Frontend sends API requests to Django backend
5. Backend filters dataset dynamically
6. Matching college/course results are returned
7. React frontend renders results in real-time
8. Chatbot handles user queries interactively



## Project Structure

```bash
Course-Fee-Searcher/
│
├── frontend/          # React frontend
├── backend/           # Django backend
│
├── README.md
```



## Key Functionalities

### Dynamic Filtering

* State-based location filtering
* Program-based specialization filtering
* Real-time dataset filtering

### Search System

* Keyword-based search functionality
* Course and college matching

### Fee Sorting

* Ascending order
* Descending order

### AI Chatbot

* Handles course and fee-related queries
* Backend-driven NLP response handling



## Dataset Information

The dataset was collected from:

* College websites
* Admission brochures
* Public fee structure documents

### Preprocessing Steps

* Removed duplicate records
* Handled missing values
* Standardized column formatting
* Structured data into searchable fields


## Deployment

The project is fully deployed online.

### Live Links

- Frontend: [Live URL](https://college-finder-olive-seven.vercel.app/)
- Backend API: [Render Backend](https://college-finder-9nuh.onrender.com)



## Challenges Faced

* React + Django integration
* Dynamic dependent dropdown handling
* Dataset inconsistencies
* API communication management
* Maintaining stable filtering behavior



## Architectural Evolution

### Initial Chatbot Approach

The chatbot initially used:

* TF-IDF Vectorization
* Logistic Regression intent classification

### Optimization

The architecture was later upgraded to an external API-driven NLP solution to:

* Improve contextual understanding
* Reduce response errors
* Simplify backend maintenance



## Future Improvements

* Add authentication system
* Personalized dashboards
* College comparison system
* Recommendation engine
* Real-time admission APIs
* Mobile application support
* Expanded college database



## Installation & Setup

### Clone Repository

```bash
git clone https://github.com/tinos-interns-projects/College-Finder.git
```



### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```



### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python manage.py runserver
```



## Author

Developed as part of an internship project focused on improving educational accessibility and course discovery through modern web technologies.


