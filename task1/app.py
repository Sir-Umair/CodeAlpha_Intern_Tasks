"""
AetherTranslate - Python Web Server (Flask)
Serves the web application, API translation endpoints, Python TTS audio,
and JSON file persistence for History & Favorites.
"""

import os
import json
import uuid
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from dotenv import load_dotenv

from languages import SUPPORTED_LANGUAGES, LOCALE_MAP
from translator import translate_text, generate_tts_stream

# Load environment variables from .env
load_dotenv()

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
HISTORY_FILE = os.path.join(APP_ROOT, "history.json")
FAVORITES_FILE = os.path.join(APP_ROOT, "favorites.json")

app = Flask(__name__, template_folder="templates", static_folder="static")

# Helper functions for persistent storage
def read_json_file(filepath):
    if not os.path.exists(filepath):
        return []
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def write_json_file(filepath, data):
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error writing to {filepath}: {e}")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory("static", filename)

@app.route("/api/languages", methods=["GET"])
def get_languages():
    return jsonify({
        "languages": SUPPORTED_LANGUAGES,
        "locales": LOCALE_MAP
    })

@app.route("/api/translate", methods=["POST"])
def handle_translation():
    data = request.get_json() or {}
    text = data.get("text", "")
    source = data.get("source", "auto")
    target = data.get("target", "en")
    engine = data.get("engine", "google")

    if not text.strip():
        return jsonify({
            "success": True,
            "translatedText": "",
            "sourceLang": source,
            "targetLang": target,
            "engine": engine,
            "durationMs": 0
        })

    result = translate_text(text, source=source, target=target, engine=engine)

    if result.get("success"):
        # Auto-append to python history.json
        history = read_json_file(HISTORY_FILE)
        item = {
            "id": str(uuid.uuid4()),
            "sourceText": text,
            "translatedText": result["translatedText"],
            "sourceLang": result.get("sourceLang", source),
            "targetLang": target,
            "engine": result.get("engine", engine),
            "timestamp": int(os.path.getmtime(HISTORY_FILE)) if os.path.exists(HISTORY_FILE) else 0,
            "isFavorite": False
        }
        # Avoid exact duplicate consecutively
        if not history or history[0].get("sourceText") != text or history[0].get("targetLang") != target:
            history.insert(0, item)
            write_json_file(HISTORY_FILE, history[:100]) # keep top 100

    return jsonify(result)

@app.route("/api/tts", methods=["GET", "POST"])
def handle_tts():
    if request.method == "POST":
        data = request.get_json() or {}
        text = data.get("text", "")
        lang = data.get("lang", "en")
    else:
        text = request.args.get("text", "")
        lang = request.args.get("lang", "en")

    if not text.strip():
        return jsonify({"error": "No text provided"}), 400

    try:
        audio_fp = generate_tts_stream(text, lang=lang)
        return send_file(
            audio_fp,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    except Exception as e:
        print(f"TTS Error in Python: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/history", methods=["GET", "DELETE"])
def handle_history():
    if request.method == "GET":
        return jsonify(read_json_file(HISTORY_FILE))
    elif request.method == "DELETE":
        write_json_file(HISTORY_FILE, [])
        return jsonify({"success": True, "message": "History cleared"})

@app.route("/api/favorites", methods=["GET", "POST", "DELETE"])
def handle_favorites():
    if request.method == "GET":
        return jsonify(read_json_file(FAVORITES_FILE))
    elif request.method == "POST":
        data = request.get_json() or {}
        favorites = read_json_file(FAVORITES_FILE)
        
        # Toggle or add
        item_id = data.get("id") or str(uuid.uuid4())
        existing = [f for f in favorites if f.get("sourceText") == data.get("sourceText") and f.get("targetLang") == data.get("targetLang")]
        
        if existing:
            favorites = [f for f in favorites if f not in existing]
            is_fav = False
        else:
            fav_item = {
                "id": item_id,
                "sourceText": data.get("sourceText"),
                "translatedText": data.get("translatedText"),
                "sourceLang": data.get("sourceLang"),
                "targetLang": data.get("targetLang"),
                "isFavorite": True
            }
            favorites.insert(0, fav_item)
            is_fav = True
            
        write_json_file(FAVORITES_FILE, favorites)
        return jsonify({"success": True, "isFavorite": is_fav})
    elif request.method == "DELETE":
        write_json_file(FAVORITES_FILE, [])
        return jsonify({"success": True, "message": "Favorites cleared"})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    print(f"Starting AetherTranslate Python Flask Server on http://127.0.0.1:{port}")
    app.run(host="127.0.0.1", port=port, debug=True)
