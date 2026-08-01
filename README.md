# CodeAlpha Internship Tasks

This repository contains internship tasks completed for **CodeAlpha**.

---

## 🐍 Task 1: Language Translation Tool (`/task1`)

A modern, high-performance multilingual translation web application powered by a **Python Flask** backend core.

### ✨ Features
- **Python Flask Backend (`app.py`)**: Handles translation request routing, error catching, fallback engine switching, text-to-speech stream generation, and JSON persistence.
- **35+ Supported Languages (`languages.py`)**: Includes full support for Urdu (`ur`), Punjabi (`pa`), English, Spanish, French, German, Hindi, Arabic, Japanese, Korean, Chinese, and 25+ more.
- **Dual Python Translation Engines (`translator.py`)**: Uses Python `requests` to route translations through **Google Translate API** and **MyMemory Translation API** with intelligent failover.
- **Python Voice TTS (`gTTS`)**: Generates crystal-clear MP3 speech audio directly on the Python server and streams it back to the client.
- **Speech-to-Text Dictation**: Uses BCP-47 locale maps (`ur-PK`, `pa-IN`, `en-US`) for accurate voice-to-text recognition.
- **Persistent History & Favorites**: Saved server-side to `history.json` and `favorites.json` using Python file management.
- **Claude Console 3D Theme**: Warm charcoal dark and paper light modes with 3D ticker cards, slide-out drawer, and toast notifications.

---

## 🤖 Task 2: FAQ Chatbot / Intelligent FAQ Engine (`/task2`)

An intelligent FAQ Chatbot and FAQ Engine for **University Admissions**, featuring NLP processing, TF-IDF vectorization, and cosine similarity matching.

### ✨ Features
- **NLP Preprocessing & TF-IDF Matching**: Uses tokenization, NLTK lemmatization, TF-IDF vectorization, and Cosine Similarity for accurate answer retrieval.
- **Interactive Flask Web UI (`app.py`)**: Real-time chat interface with topic pills, animated typing status, and responsive layout.
- **CLI Chatbot (`cli_chat.py`)**: Terminal interface for quick queries, confidence scoring, and topic listings.
- **JSON Knowledge Base (`data/faqs.json`)**: Pre-populated database with topics on Admissions, Financial Aid, Housing, Tuition, Deadlines, and Visas.
- **Unit Test Suite (`test_faq_engine.py`)**: Full coverage tests verifying response precision and engine reliability.

---

## 🛠️ How to Run

### Task 1: Language Translation Tool
```bash
cd task1
pip install flask requests python-dotenv gTTS
python app.py
```
Open `http://127.0.0.1:5000/`.

### Task 2: FAQ Chatbot
```bash
cd task2
pip install -r requirements.txt
python app.py
```
Open `http://127.0.0.1:5000/`.
