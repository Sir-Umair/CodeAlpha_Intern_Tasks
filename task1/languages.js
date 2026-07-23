/**
 * Supported languages and their ISO 639-1 language codes.
 * Used for populating the select dropdowns in the translation tool.
 */
window.SUPPORTED_LANGUAGES = {
  "auto": "Auto Detect",
  "en": "English",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
  "it": "Italian",
  "pt": "Portuguese",
  "ru": "Russian",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  "ja": "Japanese",
  "ko": "Korean",
  "ar": "Arabic",
  "hi": "Hindi",
  "bn": "Bengali",
  "pa": "Punjabi",
  "ur": "Urdu",
  "nl": "Dutch",
  "tr": "Turkish",
  "pl": "Polish",
  "sv": "Swedish",
  "no": "Norwegian",
  "da": "Danish",
  "fi": "Finnish",
  "vi": "Vietnamese",
  "th": "Thai",
  "id": "Indonesian",
  "ms": "Malay",
  "he": "Hebrew",
  "el": "Greek",
  "cs": "Czech",
  "ro": "Romanian",
  "hu": "Hungarian",
  "uk": "Ukrainian",
  "fa": "Persian",
  "sw": "Swahili",
  "ta": "Tamil",
  "te": "Telugu"
};

// Expose list to be used in module context if loaded as module, otherwise global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SUPPORTED_LANGUAGES };
}
