# 🤖 Task 2: FAQ Chatbot / Intelligent FAQ Engine

An intelligent FAQ Chatbot and FAQ Engine designed for **University Admissions**, featuring NLP query processing, TF-IDF vectorization, cosine similarity semantic matching, category filtering, interactive CLI chat, and a responsive web interface.

---

## ✨ Features

- **NLP Preprocessing & TF-IDF Matching**: Tokenization, lemmatization/stemming (NLTK), stop-word filtering, TF-IDF vectorization, and Cosine Similarity scoring.
- **Interactive Web Interface**: Responsive Flask UI with real-time quick topic pills, typing indicators, suggested questions, and search filtering.
- **Interactive CLI Chat (`cli_chat.py`)**: Terminal-based chat interface supporting instant answers, confidence scores, and topic browsing.
- **JSON Knowledge Base (`data/faqs.json`)**: Pre-populated database covering admissions, scholarships, campus housing, tuition fees, application deadlines, and visa guidance.
- **Automated Test Suite (`test_faq_engine.py`)**: Comprehensive unit tests validating answer accuracy, fallback handling, and topic retrieval.

---

## 🛠️ How to Run

1. **Navigate to `task2` folder**:
   ```bash
   cd task2
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Option A: Run the Flask Web Application**:
   ```bash
   python app.py
   ```
   Open `http://127.0.0.1:5000/` in your browser.

4. **Option B: Run the CLI Chatbot**:
   ```bash
   python cli_chat.py
   ```

5. **Option C: Run Unit Tests**:
   ```bash
   python test_faq_engine.py
   ```
