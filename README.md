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

## 🛠️ How to Run the Python Server

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sir-Umair/CodeAlpha_Intern_Tasks.git
   cd CodeAlpha_Intern_Tasks/task1
   ```

2. **Install Python dependencies**:
   ```bash
   pip install flask requests python-dotenv gTTS
   ```

3. **Start the Flask server**:
   ```bash
   python app.py
   ```

4. **Open in browser**:
   Navigate to `http://127.0.0.1:5000/`.
