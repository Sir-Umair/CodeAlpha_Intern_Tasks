/**
 * AetherTranslate - Core Application Logic
 * Implements client-side translation, speech utilities, history, and favorites.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- UI Elements ---
  const srcLangSelect = document.getElementById('src-lang-select');
  const targetLangSelect = document.getElementById('target-lang-select');
  const btnSwap = document.getElementById('btn-swap-languages');
  
  const srcTextarea = document.getElementById('src-textarea');
  const targetOutput = document.getElementById('target-output');
  const detectedLangBadge = document.getElementById('detected-lang-badge');
  const currentCharCount = document.getElementById('current-char-count');
  
  const btnSrcListen = document.getElementById('btn-src-listen');
  const btnSrcSpeak = document.getElementById('btn-src-speak');
  const btnSrcClear = document.getElementById('btn-src-clear');
  
  const btnTargetCopy = document.getElementById('btn-target-copy');
  const btnTargetSpeak = document.getElementById('btn-target-speak');
  const btnTargetFavorite = document.getElementById('btn-target-favorite');
  const btnTargetClear = document.getElementById('btn-target-clear');
  
  const translationSpeed = document.getElementById('translation-speed');
  const translationLoader = document.getElementById('translation-loader');
  
  // Theme & Settings
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetSettings = document.getElementById('btn-reset-settings');
  
  const ttsVoiceSelect = document.getElementById('tts-voice-select');
  const ttsRateSlider = document.getElementById('tts-rate');
  const ttsPitchSlider = document.getElementById('tts-pitch');
  const rateValueSpan = document.getElementById('rate-value');
  const pitchValueSpan = document.getElementById('pitch-value');
  const chkAutoTranslate = document.getElementById('setting-auto-translate');
  const engineSelect = document.getElementById('engine-select');

  // Sidebar Toggles & Backdrop Drawer elements
  const btnHistoryToggle = document.getElementById('btn-history-toggle');
  const btnFavoritesToggle = document.getElementById('btn-favorites-toggle');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const sidebarDrawer = document.getElementById('sidebar-drawer');
  
  // Sidebar Tabs & Panels
  const tabHistory = document.getElementById('tab-history');
  const tabFavorites = document.getElementById('tab-favorites');
  const panelHistory = document.getElementById('panel-history-list');
  const panelFavorites = document.getElementById('panel-favorites-list');
  
  const historyContainer = document.getElementById('history-items-container');
  const favoritesContainer = document.getElementById('favorites-items-container');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnClearFavorites = document.getElementById('btn-clear-favorites');
  
  const toastContainer = document.getElementById('toast-container');
  
  // --- App State ---
  let activeEngine = 'google'; // 'google' or 'mymemory'
  let autoTranslateEnabled = true;
  let translationTimeout = null;
  let currentTranslation = null; // Stores currently showing translation object
  let ttsSpeechRate = 1.0;
  let ttsSpeechPitch = 1.0;
  let selectedTtsVoiceName = '';
  
  // Speech Recognition (Speech-to-Text) Instance
  let recognition = null;
  let isListening = false;
  
  // --- Load Support Libraries ---
  // Ensure SUPPORTED_LANGUAGES global is defined (from languages.js)
  const languagesList = window.SUPPORTED_LANGUAGES || {
    "auto": "Auto Detect",
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "ur": "Urdu"
  };

  // --- Initializing Application ---
  initLanguages();
  initTheme();
  initSettings();
  initSpeechSynthesis();
  initSpeechRecognition();
  loadHistory();
  loadFavorites();
  initDrawer();

  // --- Functions ---

  /**
   * Populates language selector dropdowns
   */
  function initLanguages() {
    srcLangSelect.innerHTML = '';
    targetLangSelect.innerHTML = '';
    
    // Source dropdown has 'Auto Detect'
    for (const [code, name] of Object.entries(languagesList)) {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      
      if (code === 'en') option.selected = true; // default source
      srcLangSelect.appendChild(option);
    }
    
    // Target dropdown DOES NOT have 'Auto Detect'
    for (const [code, name] of Object.entries(languagesList)) {
      if (code === 'auto') continue;
      
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      
      if (code === 'es') option.selected = true; // default target
      targetLangSelect.appendChild(option);
    }
  }

  /**
   * Initializes themes (checks system settings and localStorage)
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('aether-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcons(savedTheme);
    
    btnThemeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('aether-theme', newTheme);
      updateThemeToggleIcons(newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info');
    });
  }

  function updateThemeToggleIcons(theme) {
    const moonIcon = btnThemeToggle.querySelector('.icon-moon');
    const sunIcon = btnThemeToggle.querySelector('.icon-sun');
    if (theme === 'dark') {
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    } else {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    }
  }

  /**
   * Load and apply user settings
   */
  function initSettings() {
    const savedAutoTranslate = localStorage.getItem('setting-auto-translate');
    if (savedAutoTranslate !== null) {
      autoTranslateEnabled = savedAutoTranslate === 'true';
      chkAutoTranslate.checked = autoTranslateEnabled;
    }
    
    const savedRate = localStorage.getItem('tts-rate');
    if (savedRate !== null) {
      ttsSpeechRate = parseFloat(savedRate);
      ttsRateSlider.value = ttsSpeechRate;
      rateValueSpan.textContent = `${ttsSpeechRate}x`;
    }
    
    const savedPitch = localStorage.getItem('tts-pitch');
    if (savedPitch !== null) {
      ttsSpeechPitch = parseFloat(savedPitch);
      ttsPitchSlider.value = ttsSpeechPitch;
      pitchValueSpan.textContent = ttsSpeechPitch;
    }

    selectedTtsVoiceName = localStorage.getItem('tts-voice-name') || '';

    // Load active engine
    const savedEngine = localStorage.getItem('aether-engine') || 'google';
    activeEngine = savedEngine;
    if (engineSelect) {
      engineSelect.value = activeEngine;
    }

    // Slider Listeners
    ttsRateSlider.addEventListener('input', (e) => {
      rateValueSpan.textContent = `${e.target.value}x`;
    });
    
    ttsPitchSlider.addEventListener('input', (e) => {
      pitchValueSpan.textContent = e.target.value;
    });

    // Toggle Modal
    btnSettingsToggle.addEventListener('click', () => {
      populateTtsVoiceSelect();
      if (engineSelect) {
        engineSelect.value = activeEngine;
      }
      settingsModal.style.display = 'flex';
    });

    btnCloseSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });

    btnSaveSettings.addEventListener('click', () => {
      autoTranslateEnabled = chkAutoTranslate.checked;
      ttsSpeechRate = parseFloat(ttsRateSlider.value);
      ttsSpeechPitch = parseFloat(ttsPitchSlider.value);
      selectedTtsVoiceName = ttsVoiceSelect.value;

      localStorage.setItem('setting-auto-translate', autoTranslateEnabled);
      localStorage.setItem('tts-rate', ttsSpeechRate);
      localStorage.setItem('tts-pitch', ttsSpeechPitch);
      localStorage.setItem('tts-voice-name', selectedTtsVoiceName);

      if (engineSelect) {
        activeEngine = engineSelect.value;
        localStorage.setItem('aether-engine', activeEngine);
      }

      settingsModal.style.display = 'none';
      showToast('Settings saved successfully', 'success');
      
      // Trigger translate if auto is enabled and text exists
      if (srcTextarea.value.trim().length > 0) {
        performTranslation();
      }
    });

    btnResetSettings.addEventListener('click', () => {
      chkAutoTranslate.checked = true;
      ttsRateSlider.value = 1.0;
      ttsPitchSlider.value = 1.0;
      rateValueSpan.textContent = "1.0x";
      pitchValueSpan.textContent = "1.0";
      
      if (engineSelect) {
        engineSelect.value = 'google';
      }

      // Attempt to pick first default voice
      if (ttsVoiceSelect.options.length > 0) {
        ttsVoiceSelect.selectedIndex = 0;
      }
      showToast('Settings reset to default', 'info');
    });

    // Close on overlay click
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
      }
    });
  }

  /**
   * Initializes Sidebar Drawer behaviors
   */
  function initDrawer() {
    const openDrawer = (tab) => {
      sidebarDrawer.classList.add('open');
      drawerBackdrop.classList.add('active');
      
      if (tab === 'history') {
        tabHistory.classList.add('active');
        tabFavorites.classList.remove('active');
        panelHistory.classList.add('active');
        panelFavorites.classList.remove('active');
        renderHistory();
      } else {
        tabFavorites.classList.add('active');
        tabHistory.classList.remove('active');
        panelFavorites.classList.add('active');
        panelHistory.classList.remove('active');
        renderFavorites();
      }
    };

    const closeDrawer = () => {
      sidebarDrawer.classList.remove('open');
      drawerBackdrop.classList.remove('active');
    };

    btnHistoryToggle.addEventListener('click', () => openDrawer('history'));
    btnFavoritesToggle.addEventListener('click', () => openDrawer('favorites'));
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);
  }

  /**
   * Initialize speech synthesis (Text-to-Speech)
   */
  function initSpeechSynthesis() {
    if (!('speechSynthesis' in window)) {
      btnSrcSpeak.style.display = 'none';
      btnTargetSpeak.style.display = 'none';
      return;
    }

    // Populate voices once loaded (Firefox/Chrome load asynchronously)
    window.speechSynthesis.onvoiceschanged = () => {
      populateTtsVoiceSelect();
    };
  }

  function populateTtsVoiceSelect() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    ttsVoiceSelect.innerHTML = '';
    
    if (voices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No voice syntheis engines found';
      ttsVoiceSelect.appendChild(option);
      return;
    }

    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.name === selectedTtsVoiceName) {
        option.selected = true;
      }
      ttsVoiceSelect.appendChild(option);
    });
  }

  /**
   * Helper to perform Speech synthesis
   */
  function speakText(text, langCode) {
    if (!('speechSynthesis' in window)) {
      showToast('Text-to-speech is not supported on this browser', 'error');
      return;
    }

    if (!text || text.trim().length === 0) {
      showToast('No text available to read', 'error');
      return;
    }

    // Cancel current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = ttsSpeechRate;
    utterance.pitch = ttsSpeechPitch;

    // Try to find selected voice from settings
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = voices.find(v => v.name === selectedTtsVoiceName);

    // Fallback: search for a voice matching the language code robustly
    if (!selectedVoice && langCode && langCode !== 'auto') {
      const lowerLang = langCode.toLowerCase().replace('_', '-');
      selectedVoice = voices.find(v => {
        const vLang = v.lang.toLowerCase().replace('_', '-');
        return vLang === lowerLang || vLang.startsWith(lowerLang + '-');
      });
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    // Play audio
    window.speechSynthesis.speak(utterance);
    showToast('Reading text aloud...', 'info');
  }

  /**
   * Initialize speech recognition (Speech-to-Text)
   */
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnSrcListen.setAttribute('title', 'Speech-to-Text (Not supported in this browser)');
      btnSrcListen.style.opacity = '0.4';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isListening = true;
      btnSrcListen.classList.add('listening');
      btnSrcListen.setAttribute('title', 'Listening... click to stop');
      showToast('Listening... Speak clearly', 'info');
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const currentVal = srcTextarea.value;
      
      // Append transcript to source textarea
      srcTextarea.value = currentVal ? (currentVal.trim() + ' ' + transcript) : transcript;
      updateCharCount();
      showToast('Speech recognized', 'success');
      
      if (autoTranslateEnabled) {
        performTranslation();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast('Microphone access denied. Enable permissions in settings.', 'error');
      } else {
        showToast(`Voice input error: ${event.error}`, 'error');
      }
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
    };

    btnSrcListen.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        // Configure language of voice recognizer
        const srcLang = srcLangSelect.value;
        const localeMap = {
          "en": "en-US",
          "es": "es-ES",
          "fr": "fr-FR",
          "de": "de-DE",
          "it": "it-IT",
          "pt": "pt-PT",
          "ru": "ru-RU",
          "zh-CN": "zh-CN",
          "zh-TW": "zh-TW",
          "ja": "ja-JP",
          "ko": "ko-KR",
          "ar": "ar-SA",
          "hi": "hi-IN",
          "bn": "bn-IN",
          "pa": "pa-IN",
          "ur": "ur-PK",
          "nl": "nl-NL",
          "tr": "tr-TR",
          "pl": "pl-PL",
          "sv": "sv-SE",
          "no": "no-NO",
          "da": "da-DK",
          "fi": "fi-FI",
          "vi": "vi-VN",
          "th": "th-TH",
          "id": "id-ID",
          "ms": "ms-MY",
          "he": "he-IL",
          "el": "el-GR",
          "cs": "cs-CZ",
          "ro": "ro-RO",
          "hu": "hu-HU",
          "uk": "uk-UA",
          "fa": "fa-IR",
          "sw": "sw-KE",
          "ta": "ta-IN",
          "te": "te-IN"
        };
        recognition.lang = srcLang === 'auto' ? 'en-US' : (localeMap[srcLang] || srcLang);
        
        try {
          recognition.start();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }

  function stopListening() {
    isListening = false;
    btnSrcListen.classList.remove('listening');
    btnSrcListen.setAttribute('title', 'Voice Input (Speech-to-Text)');
  }

  /**
   * Core translation trigger (Debounced)
   */
  function debouncedTranslate() {
    if (!autoTranslateEnabled) return;
    
    clearTimeout(translationTimeout);
    translationTimeout = setTimeout(() => {
      performTranslation();
    }, 600); // 600ms debounce delay
  }

  /**
   * Action trigger to translate
   */
  async function performTranslation() {
    const text = srcTextarea.value.trim();
    if (!text) {
      clearTranslationOutput();
      return;
    }

    const sourceLang = srcLangSelect.value;
    const targetLang = targetLangSelect.value;

    if (sourceLang === targetLang) {
      targetOutput.textContent = text;
      targetOutput.classList.remove('output-placeholder');
      translationSpeed.textContent = '0 ms (Local)';
      resetFavoriteButtonState(false);
      return;
    }

    showLoader(true);
    const startTime = performance.now();

    try {
      let result = null;
      if (activeEngine === 'google') {
        result = await translateWithGoogle(text, sourceLang, targetLang);
      } else {
        result = await translateWithMyMemory(text, sourceLang, targetLang);
      }

      const elapsed = Math.round(performance.now() - startTime);
      translationSpeed.textContent = `${elapsed} ms`;

      // Display results
      targetOutput.textContent = result.translatedText;
      targetOutput.classList.remove('output-placeholder');

      // Update Detected Language Badge if applicable
      if (sourceLang === 'auto' && result.detectedLangCode) {
        const detectedName = languagesList[result.detectedLangCode] || result.detectedLangCode.toUpperCase();
        detectedLangBadge.textContent = `Detected: ${detectedName}`;
        detectedLangBadge.style.display = 'inline-block';
      } else {
        detectedLangBadge.style.display = 'none';
      }

      // Save to App State
      currentTranslation = {
        srcText: text,
        targetText: result.translatedText,
        srcLang: sourceLang === 'auto' ? (result.detectedLangCode || 'en') : sourceLang,
        targetLang: targetLang,
        engine: activeEngine,
        timestamp: Date.now()
      };

      // Check if this current translation pair is already in favorites
      checkIsFavorite(currentTranslation);

      // Save to history (debounced or on successful translation completion)
      saveToHistory(currentTranslation);

    } catch (error) {
      console.error(error);
      targetOutput.textContent = 'Translation failed. Please check your internet connection and try again.';
      targetOutput.classList.add('output-placeholder');
      showToast('Translation error occurred', 'error');
      detectedLangBadge.style.display = 'none';
      currentTranslation = null;
      resetFavoriteButtonState(false);
    } finally {
      showLoader(false);
    }
  }

  function clearTranslationOutput() {
    targetOutput.textContent = 'Translation will appear here...';
    targetOutput.classList.add('output-placeholder');
    detectedLangBadge.style.display = 'none';
    translationSpeed.textContent = '-- ms';
    currentTranslation = null;
    resetFavoriteButtonState(false);
  }

  /**
   * API CALL: Unofficial Google Translate API (gtx client)
   */
  async function translateWithGoogle(text, source, target) {
    // google translation endpoint
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Google API returned status: ${response.status}`);
    }

    const data = await response.json();
    
    // Parse Google response structure:
    // data[0] contains array of sentences [[trans1, src1, ...], [trans2, src2, ...]]
    let translatedText = '';
    if (data && data[0]) {
      translatedText = data[0].map(sentence => sentence[0]).join('');
    } else {
      throw new Error('Invalid response structure from Google Translate');
    }

    // data[2] contains detected source language code
    const detectedLangCode = data[2] || null;

    return {
      translatedText,
      detectedLangCode
    };
  }

  /**
   * API CALL: Official MyMemory Translation API
   */
  async function translateWithMyMemory(text, source, target) {
    // If source is 'auto', MyMemory uses 'autodetect'
    const sourceParam = source === 'auto' ? 'autodetect' : source;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceParam}|${target}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`MyMemory API returned status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.responseData) {
      let translatedText = data.responseData.translatedText;
      
      // Clean up text if needed (MyMemory HTML decodes sometimes)
      const txtElem = document.createElement('textarea');
      txtElem.innerHTML = translatedText;
      translatedText = txtElem.value;

      // Extract detected language if available from MyMemory
      // MyMemory response returns language details in matches occasionally
      let detectedLangCode = null;
      if (data.matches && data.matches.length > 0) {
        // Matches find first element which is not translation memory, or just matches[0]
        const bestMatch = data.matches[0];
        if (bestMatch && bestMatch.segment) {
          // MyMemory does not return a direct detected lang code easily in basic response,
          // so we use target language detection or extract from match if metadata exists.
        }
      }

      // If MyMemory failed to match or returned placeholder, fallback or warn
      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'MyMemory query failed');
      }

      return {
        translatedText,
        detectedLangCode
      };
    } else {
      throw new Error('Invalid response structure from MyMemory Translate');
    }
  }

  // --- UI Helpers ---

  function showLoader(visible) {
    if (visible) {
      translationLoader.style.display = 'flex';
    } else {
      translationLoader.style.display = 'none';
    }
  }

  function updateCharCount() {
    const len = srcTextarea.value.length;
    currentCharCount.textContent = len;
  }

  function resetFavoriteButtonState(isFav) {
    const starEmpty = btnTargetFavorite.querySelector('.star-empty');
    const starFilled = btnTargetFavorite.querySelector('.star-filled');
    
    if (isFav) {
      starEmpty.style.display = 'none';
      starFilled.style.display = 'block';
      btnTargetFavorite.classList.add('active');
    } else {
      starEmpty.style.display = 'block';
      starFilled.style.display = 'none';
      btnTargetFavorite.classList.remove('active');
    }
  }

  /**
   * Generates a Toast Alert on screen
   */
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
      ${iconSvg}
      <span class="toast-msg">${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 3000);
  }

  // --- Local Storage Management (History & Favorites) ---

  function saveToHistory(translation) {
    if (!translation || !translation.srcText.trim()) return;

    let history = getHistoryFromStorage();
    
    // De-duplicate: Remove identical translation source/target details
    history = history.filter(item => 
      !(item.srcText.toLowerCase() === translation.srcText.toLowerCase() && 
        item.srcLang === translation.srcLang && 
        item.targetLang === translation.targetLang)
    );

    // Add to beginning of log
    history.unshift({
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      ...translation
    });

    // Limit to 30 items
    if (history.length > 30) {
      history.pop();
    }

    localStorage.setItem('aether-history', JSON.stringify(history));
    renderHistory();
  }

  function getHistoryFromStorage() {
    const raw = localStorage.getItem('aether-history');
    return raw ? JSON.parse(raw) : [];
  }

  function loadHistory() {
    renderHistory();
  }

  function renderHistory() {
    const history = getHistoryFromStorage();
    historyContainer.innerHTML = '';

    if (history.length === 0) {
      historyContainer.innerHTML = '<div class="empty-state font-mono">No translation history found.</div>';
      return;
    }

    history.forEach(item => {
      const card = document.createElement('div');
      card.className = 'log-card';
      
      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const srcName = item.srcLang.toUpperCase();
      const targetName = item.targetLang.toUpperCase();

      card.innerHTML = `
        <div class="log-card-header">
          <span class="log-langs font-mono">${srcName} &rarr; ${targetName}</span>
          <button class="log-delete-btn" data-id="${item.id}" title="Delete record">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="log-text-in">${escapeHTML(item.srcText)}</div>
        <div class="log-text-out">${escapeHTML(item.targetText)}</div>
      `;

      // Click event to restore item
      card.addEventListener('click', (e) => {
        if (e.target.closest('.log-delete-btn')) return; // ignore delete click
        restoreTranslationItem(item);
      });

      // Delete item
      card.querySelector('.log-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      });

      historyContainer.appendChild(card);
    });
  }

  function deleteHistoryItem(id) {
    let history = getHistoryFromStorage();
    history = history.filter(item => item.id !== id);
    localStorage.setItem('aether-history', JSON.stringify(history));
    renderHistory();
    showToast('Record deleted from history', 'info');
  }

  function restoreTranslationItem(item) {
    // Clear any pending debounced auto-translate timeout to prevent overwrite
    clearTimeout(translationTimeout);

    // Populate dropdowns
    srcLangSelect.value = item.srcLang;
    targetLangSelect.value = item.targetLang;
    
    // Set Text
    srcTextarea.value = item.srcText;
    updateCharCount();
    
    // Set translated result directly without calling API
    targetOutput.textContent = item.targetText;
    targetOutput.classList.remove('output-placeholder');
    detectedLangBadge.style.display = 'none';
    translationSpeed.textContent = 'Restored';
    
    currentTranslation = {
      srcText: item.srcText,
      targetText: item.targetText,
      srcLang: item.srcLang,
      targetLang: item.targetLang,
      engine: item.engine,
      timestamp: item.timestamp
    };

    checkIsFavorite(currentTranslation);
    showToast('Translation restored from history', 'success');
  }

  // --- Favorites Functions ---

  function toggleFavorite() {
    if (!currentTranslation) {
      showToast('No active translation to save', 'error');
      return;
    }

    let favorites = getFavoritesFromStorage();
    
    // Check if current is already in favorites
    const index = favorites.findIndex(item => 
      item.srcText.toLowerCase() === currentTranslation.srcText.toLowerCase() &&
      item.srcLang === currentTranslation.srcLang &&
      item.targetLang === currentTranslation.targetLang
    );

    if (index > -1) {
      // Remove from favorites
      favorites.splice(index, 1);
      localStorage.setItem('aether-favorites', JSON.stringify(favorites));
      resetFavoriteButtonState(false);
      showToast('Removed from Favorites', 'info');
    } else {
      // Add to favorites
      favorites.unshift({
        id: 'fav_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...currentTranslation,
        timestamp: Date.now()
      });
      localStorage.setItem('aether-favorites', JSON.stringify(favorites));
      resetFavoriteButtonState(true);
      showToast('Added to Starred Favorites', 'success');
    }

    renderFavorites();
  }

  function getFavoritesFromStorage() {
    const raw = localStorage.getItem('aether-favorites');
    return raw ? JSON.parse(raw) : [];
  }

  function loadFavorites() {
    renderFavorites();
  }

  function renderFavorites() {
    const favorites = getFavoritesFromStorage();
    favoritesContainer.innerHTML = '';

    if (favorites.length === 0) {
      favoritesContainer.innerHTML = '<div class="empty-state font-mono">No starred translations yet.</div>';
      return;
    }

    favorites.forEach(item => {
      const card = document.createElement('div');
      card.className = 'log-card';
      
      const srcName = item.srcLang.toUpperCase();
      const targetName = item.targetLang.toUpperCase();

      card.innerHTML = `
        <div class="log-card-header">
          <span class="log-langs font-mono" style="background-color: var(--accent-amber-soft); color: var(--accent-amber); border-color: rgba(217, 119, 6, 0.15);">${srcName} &rarr; ${targetName}</span>
          <button class="log-delete-btn" data-id="${item.id}" title="Remove Star">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-amber); width: 14px; height: 14px;">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="log-text-in">${escapeHTML(item.srcText)}</div>
        <div class="log-text-out">${escapeHTML(item.targetText)}</div>
      `;

      // Click to load
      card.addEventListener('click', (e) => {
        if (e.target.closest('.log-delete-btn')) return;
        restoreTranslationItem(item);
      });

      // Remove Star
      card.querySelector('.log-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFavoriteItem(item.id);
      });

      favoritesContainer.appendChild(card);
    });
  }

  function deleteFavoriteItem(id) {
    let favorites = getFavoritesFromStorage();
    const itemToDelete = favorites.find(item => item.id === id);
    
    favorites = favorites.filter(item => item.id !== id);
    localStorage.setItem('aether-favorites', JSON.stringify(favorites));
    renderFavorites();
    
    // Check if the currently displayed translation matches the deleted favorite
    if (currentTranslation && itemToDelete &&
        currentTranslation.srcText.toLowerCase() === itemToDelete.srcText.toLowerCase() &&
        currentTranslation.srcLang === itemToDelete.srcLang &&
        currentTranslation.targetLang === itemToDelete.targetLang) {
      resetFavoriteButtonState(false);
    }
    
    showToast('Removed from Favorites', 'info');
  }

  function checkIsFavorite(translation) {
    if (!translation) {
      resetFavoriteButtonState(false);
      return;
    }
    
    const favorites = getFavoritesFromStorage();
    const isFav = favorites.some(item => 
      item.srcText.toLowerCase() === translation.srcText.toLowerCase() &&
      item.srcLang === translation.srcLang &&
      item.targetLang === translation.targetLang
    );
    
    resetFavoriteButtonState(isFav);
  }

  // --- App Action Event Listeners ---

  // Select events
  srcLangSelect.addEventListener('change', () => {
    // If auto translate, update output when language changes
    if (srcTextarea.value.trim().length > 0) {
      performTranslation();
    }
  });

  targetLangSelect.addEventListener('change', () => {
    if (srcTextarea.value.trim().length > 0) {
      performTranslation();
    }
  });

  // Typing event in source textarea
  srcTextarea.addEventListener('input', () => {
    updateCharCount();
    debouncedTranslate();
  });

  // Swap Languages Button
  btnSwap.addEventListener('click', () => {
    const srcVal = srcLangSelect.value;
    const targetVal = targetLangSelect.value;

    // Cannot swap if source is 'auto' (since 'auto' is not valid for target dropdown)
    if (srcVal === 'auto') {
      showToast('Cannot swap while Auto-Detect is selected', 'error');
      return;
    }

    // Swapping selectors
    srcLangSelect.value = targetVal;
    targetLangSelect.value = srcVal;

    // Swap text values
    const srcText = srcTextarea.value;
    const targetText = targetOutput.textContent;

    if (srcText && targetText && !targetOutput.classList.contains('output-placeholder')) {
      srcTextarea.value = targetText;
      targetOutput.textContent = srcText;
      updateCharCount();
      performTranslation();
    } else {
      performTranslation();
    }

    showToast('Languages swapped', 'info');
  });

  // Clear Text (Source & Target)
  const clearAllText = () => {
    srcTextarea.value = '';
    updateCharCount();
    clearTranslationOutput();
    showToast('Text cleared', 'info');
  };

  btnSrcClear.addEventListener('click', clearAllText);
  if (btnTargetClear) {
    btnTargetClear.addEventListener('click', clearAllText);
  }

  // Voice output (TTS) source
  btnSrcSpeak.addEventListener('click', () => {
    const text = srcTextarea.value;
    const lang = srcLangSelect.value;
    speakText(text, lang);
  });

  // Voice output (TTS) target
  btnTargetSpeak.addEventListener('click', () => {
    const text = targetOutput.textContent;
    const lang = targetLangSelect.value;
    if (targetOutput.classList.contains('output-placeholder')) return;
    speakText(text, lang);
  });

  // Copy target text
  btnTargetCopy.addEventListener('click', () => {
    const text = targetOutput.textContent;
    if (!text || targetOutput.classList.contains('output-placeholder')) {
      showToast('No translation text to copy', 'error');
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => {
        showToast('Copied to clipboard', 'success');
        
        // Visual feedback on button
        const originalIcon = btnTargetCopy.innerHTML;
        btnTargetCopy.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--success-color);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          btnTargetCopy.innerHTML = originalIcon;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Copy failed', 'error');
      });
  });

  // Favorite button click
  btnTargetFavorite.addEventListener('click', toggleFavorite);



  // Clear History
  btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all translation history log?')) {
      localStorage.removeItem('aether-history');
      renderHistory();
      showToast('History database cleared', 'success');
    }
  });

  // Clear Favorites
  btnClearFavorites.addEventListener('click', () => {
    if (confirm('Delete all starred favorites?')) {
      localStorage.removeItem('aether-favorites');
      renderFavorites();
      resetFavoriteButtonState(false);
      showToast('Favorites database cleared', 'success');
    }
  });

  // Aside Sidebar Panel Tab Toggling
  tabHistory.addEventListener('click', () => {
    tabHistory.classList.add('active');
    tabFavorites.classList.remove('active');
    panelHistory.classList.add('active');
    panelFavorites.classList.remove('active');
    renderHistory(); // Refresh history list immediately when tab is selected
  });

  tabFavorites.addEventListener('click', () => {
    tabFavorites.classList.add('active');
    tabHistory.classList.remove('active');
    panelFavorites.classList.add('active');
    panelHistory.classList.remove('active');
    renderFavorites(); // Refresh favorites list immediately when tab is selected
  });

  // --- HTML Escaping Helper ---
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
