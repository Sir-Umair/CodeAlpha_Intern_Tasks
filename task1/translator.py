"""
Translation and Text-to-Speech Engine Module in Python.
Uses requests to interact with Google GTXL and MyMemory APIs,
and gTTS for voice audio generation.
"""

import time
import requests
import io
from gtts import gTTS
from languages import SUPPORTED_LANGUAGES, LOCALE_MAP

GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single"
MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get"

def translate_google(text: str, source: str = "auto", target: str = "en") -> dict:
    """Translates text using Google's client endpoint."""
    params = {
        "client": "gtx",
        "sl": source if source else "auto",
        "tl": target if target else "en",
        "dt": "t",
        "q": text
    }
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    start_time = time.time()
    response = requests.get(GOOGLE_ENDPOINT, params=params, headers=headers, timeout=10)
    response.raise_for_status()
    duration_ms = round((time.time() - start_time) * 1000)

    data = response.json()
    
    # Process output
    translated_pieces = []
    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
        for item in data[0]:
            if isinstance(item, list) and len(item) > 0 and item[0]:
                translated_pieces.append(item[0])
    
    translated_text = "".join(translated_pieces) if translated_pieces else text
    detected_lang = source

    if source == "auto" and len(data) > 2 and isinstance(data[2], str):
        detected_lang = data[2]

    return {
        "success": True,
        "translatedText": translated_text,
        "sourceLang": detected_lang,
        "targetLang": target,
        "engine": "Google Translate (Python)",
        "durationMs": duration_ms
    }

def translate_mymemory(text: str, source: str = "auto", target: str = "en") -> dict:
    """Translates text using MyMemory Translation API."""
    lang_src = source if source != "auto" else "autodetect"
    langpair = f"{lang_src}|{target}"
    
    params = {
        "q": text,
        "langpair": langpair
    }

    start_time = time.time()
    response = requests.get(MYMEMORY_ENDPOINT, params=params, timeout=10)
    response.raise_for_status()
    duration_ms = round((time.time() - start_time) * 1000)

    data = response.json()
    responseData = data.get("responseData", {})
    translated_text = responseData.get("translatedText", text)
    
    # Check for quota exceeded message
    if "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS" in translated_text.upper():
        raise Exception("MyMemory translation quota exceeded.")

    detected_lang = responseData.get("detectedLanguage", source)
    if not detected_lang or detected_lang == "autodetect":
        detected_lang = source

    return {
        "success": True,
        "translatedText": translated_text,
        "sourceLang": detected_lang,
        "targetLang": target,
        "engine": "MyMemory API (Python)",
        "durationMs": duration_ms
    }

def translate_text(text: str, source: str = "auto", target: str = "en", engine: str = "google") -> dict:
    """Primary translation entry point with fallback capabilities."""
    text = text.strip()
    if not text:
        return {
            "success": True,
            "translatedText": "",
            "sourceLang": source,
            "targetLang": target,
            "engine": engine,
            "durationMs": 0
        }

    # Primary engine execution
    primary_func = translate_google if engine == "google" else translate_mymemory
    fallback_func = translate_mymemory if engine == "google" else translate_google

    try:
        return primary_func(text, source, target)
    except Exception as primary_err:
        print(f"[Python Translator Warning] Primary engine '{engine}' failed: {primary_err}. Trying fallback...")
        try:
            res = fallback_func(text, source, target)
            res["engine"] += " (Fallback)"
            return res
        except Exception as fallback_err:
            print(f"[Python Translator Error] Fallback engine failed: {fallback_err}")
            return {
                "success": False,
                "error": f"Translation failed: {str(primary_err)}",
                "translatedText": "",
                "sourceLang": source,
                "targetLang": target
            }

def generate_tts_stream(text: str, lang: str = "en") -> io.BytesIO:
    """Generates MP3 audio stream for given text and language using gTTS in Python."""
    # Convert lang code to gTTS supported language code (e.g., 'ur' or 'zh-CN')
    clean_lang = lang.split("-")[0] if "-" in lang and lang not in ["zh-CN", "zh-TW"] else lang
    
    # Fallback to English if lang is auto
    if clean_lang == "auto" or clean_lang not in SUPPORTED_LANGUAGES:
        clean_lang = "en"

    tts = gTTS(text=text, lang=clean_lang, slow=False)
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    fp.seek(0)
    return fp
