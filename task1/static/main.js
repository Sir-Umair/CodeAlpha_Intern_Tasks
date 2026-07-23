/**
 * AetherTranslate - Frontend Client Logic for Python Flask Backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const srcLangSelect = document.getElementById('src-lang-select');
  const targetLangSelect = document.getElementById('target-lang-select');
  const btnSwap = document.getElementById('btn-swap-languages');
  const srcTextarea = document.getElementById('src-textarea');
  const targetOutput = document.getElementById('target-output');
  const detectedLangBadge = document.getElementById('detected-lang-badge');
  const currentCharCount = document.getElementById('current-char-count');
  const translationSpeed = document.getElementById('translation-speed');
  const translationLoader = document.getElementById('translation-loader');

  // Tool buttons
  const btnSrcListen = document.getElementById('btn-src-listen');
  const btnSrcSpeak = document.getElementById('btn-src-speak');
  const btnSrcClear = document.getElementById('btn-src-clear');
  const btnTargetCopy = document.getElementById('btn-target-copy');
  const btnTargetSpeak = document.getElementById('btn-target-speak');
  const btnTargetFavorite = document.getElementById('btn-target-favorite');
  const btnTargetClear = document.getElementById('btn-target-clear');

  // Settings & Theme
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const btnSettingsToggle = document.getElementById('btn-settings-toggle');
  const settingsModal = document.getElementById('settings-modal');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetSettings = document.getElementById('btn-reset-settings');
  const engineSelect = document.getElementById('engine-select');
  const chkAutoTranslate = document.getElementById('setting-auto-translate');

  // Drawer & Tabs
  const btnHistoryToggle = document.getElementById('btn-history-toggle');
  const btnFavoritesToggle = document.getElementById('btn-favorites-toggle');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  const sidebarDrawer = document.getElementById('sidebar-drawer');
  const tabHistory = document.getElementById('tab-history');
  const tabFavorites = document.getElementById('tab-favorites');
  const panelHistory = document.getElementById('panel-history-list');
  const panelFavorites = document.getElementById('panel-favorites-list');
  const historyContainer = document.getElementById('history-items-container');
  const favoritesContainer = document.getElementById('favorites-items-container');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnClearFavorites = document.getElementById('btn-clear-favorites');

  const toastContainer = document.getElementById('toast-container');

  // State
  let languagesList = {};
  let localeMap = {};
  let translationTimeout = null;
  let currentTranslation = null;
  let recognition = null;
  let isListening = false;
  let activeAudio = null;

  init();

  async function init() {
    initTheme();
    await loadLanguages();
    setupEventListeners();
    initSpeechRecognition();
  }

  // Theme Management
  function initTheme() {
    const savedTheme = localStorage.getItem('aether_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function updateThemeIcon(theme) {
    const icon = btnThemeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  btnThemeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('aether_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode`, 'success');
  });

  // Load languages from Python Flask backend
  async function loadLanguages() {
    try {
      const res = await fetch('/api/languages');
      const data = await res.json();
      languagesList = data.languages;
      localeMap = data.locales;

      // Populate Source Dropdown
      srcLangSelect.innerHTML = '';
      for (const [code, name] of Object.entries(languagesList)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === 'auto') option.selected = true;
        srcLangSelect.appendChild(option);
      }

      // Populate Target Dropdown
      targetLangSelect.innerHTML = '';
      for (const [code, name] of Object.entries(languagesList)) {
        if (code === 'auto') continue;
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        if (code === 'ur') option.selected = true; // Default to Urdu
        targetLangSelect.appendChild(option);
      }
    } catch (err) {
      console.error("Error fetching languages from Python API:", err);
      showToast("Failed to load language list from server", "error");
    }
  }

  function setupEventListeners() {
    // Input debounce translation
    srcTextarea.addEventListener('input', () => {
      updateCharCount();
      if (!chkAutoTranslate.checked) return;
      clearTimeout(translationTimeout);
      translationTimeout = setTimeout(performTranslation, 350);
    });

    srcLangSelect.addEventListener('change', () => performTranslation());
    targetLangSelect.addEventListener('change', () => performTranslation());

    // Swap Languages
    btnSwap.addEventListener('click', () => {
      const srcVal = srcLangSelect.value;
      const targetVal = targetLangSelect.value;

      if (srcVal === 'auto') {
        showToast("Cannot swap when Source is Auto Detect", "error");
        return;
      }

      srcLangSelect.value = targetVal;
      targetLangSelect.value = srcVal;

      const currentTargetText = targetOutput.textContent;
      if (currentTargetText && !targetOutput.classList.contains('placeholder')) {
        srcTextarea.value = currentTargetText;
        updateCharCount();
      }

      performTranslation();
    });

    // Clear buttons
    btnSrcClear.addEventListener('click', () => {
      srcTextarea.value = '';
      updateCharCount();
      targetOutput.textContent = 'Translation will appear here in real-time...';
      targetOutput.classList.add('placeholder');
      detectedLangBadge.classList.add('hide');
      translationSpeed.textContent = '0 ms';
    });

    btnTargetClear.addEventListener('click', () => {
      targetOutput.textContent = 'Translation will appear here in real-time...';
      targetOutput.classList.add('placeholder');
    });

    // Copy Translation
    btnTargetCopy.addEventListener('click', async () => {
      const text = targetOutput.textContent;
      if (!text || targetOutput.classList.contains('placeholder')) {
        showToast("No translation text to copy", "error");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!", "success");
      } catch (e) {
        showToast("Failed to copy", "error");
      }
    });

    // Python TTS playback
    btnSrcSpeak.addEventListener('click', () => {
      const text = srcTextarea.value;
      const lang = srcLangSelect.value === 'auto' ? 'en' : srcLangSelect.value;
      speakPythonTTS(text, lang);
    });

    btnTargetSpeak.addEventListener('click', () => {
      const text = targetOutput.textContent;
      if (!text || targetOutput.classList.contains('placeholder')) return;
      speakPythonTTS(text, targetLangSelect.value);
    });

    // Speech Recognition (STT)
    btnSrcListen.addEventListener('click', toggleSpeechRecognition);

    // Favorite Button
    btnTargetFavorite.addEventListener('click', toggleFavorite);

    // Drawer Toggles
    btnHistoryToggle.addEventListener('click', () => openDrawer('history'));
    btnFavoritesToggle.addEventListener('click', () => openDrawer('favorites'));
    btnCloseDrawer.addEventListener('click', closeDrawer);
    drawerBackdrop.addEventListener('click', closeDrawer);

    tabHistory.addEventListener('click', () => switchTab('history'));
    tabFavorites.addEventListener('click', () => switchTab('favorites'));

    btnClearHistory.addEventListener('click', async () => {
      await fetch('/api/history', { method: 'DELETE' });
      loadHistoryList();
      showToast("History cleared", "success");
    });

    btnClearFavorites.addEventListener('click', async () => {
      await fetch('/api/favorites', { method: 'DELETE' });
      loadFavoritesList();
      showToast("Favorites cleared", "success");
    });

    // Settings Modal
    btnSettingsToggle.addEventListener('click', () => settingsModal.classList.remove('hide'));
    btnCloseSettings.addEventListener('click', () => settingsModal.classList.add('hide'));
    btnSaveSettings.addEventListener('click', () => {
      settingsModal.classList.add('hide');
      showToast("Preferences saved!", "success");
      performTranslation();
    });
  }

  function updateCharCount() {
    const len = srcTextarea.value.length;
    currentCharCount.textContent = `${len} / 5000`;
  }

  // Translation Execution via Python Flask API
  async function performTranslation() {
    const text = srcTextarea.value.trim();
    if (!text) {
      targetOutput.textContent = 'Translation will appear here in real-time...';
      targetOutput.classList.add('placeholder');
      detectedLangBadge.classList.add('hide');
      translationSpeed.textContent = '0 ms';
      return;
    }

    translationLoader.classList.remove('hide');

    try {
      const payload = {
        text: text,
        source: srcLangSelect.value,
        target: targetLangSelect.value,
        engine: engineSelect.value
      };

      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      translationLoader.classList.add('hide');

      if (data.success) {
        currentTranslation = data;
        targetOutput.textContent = data.translatedText;
        targetOutput.classList.remove('placeholder');
        translationSpeed.textContent = `${data.durationMs} ms`;

        if (srcLangSelect.value === 'auto' && data.sourceLang) {
          const langName = languagesList[data.sourceLang] || data.sourceLang.toUpperCase();
          detectedLangBadge.textContent = `Detected: ${langName}`;
          detectedLangBadge.classList.remove('hide');
        } else {
          detectedLangBadge.classList.add('hide');
        }
      } else {
        showToast(data.error || "Translation error", "error");
      }
    } catch (err) {
      translationLoader.classList.add('hide');
      console.error("Python translation endpoint error:", err);
      showToast("Server connection error", "error");
    }
  }

  // Python TTS Audio Playback
  async function speakPythonTTS(text, lang) {
    if (!text) {
      showToast("No text to speak", "error");
      return;
    }

    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }

    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
      activeAudio = new Audio(audioUrl);
      await activeAudio.play();
    } catch (e) {
      speakBrowserFallback(text, lang);
    }
  }

  function speakBrowserFallback(text, lang) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = localeMap[lang] || lang;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Speech Recognition (STT)
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnSrcListen.style.opacity = '0.5';
      btnSrcListen.title = 'Speech Recognition not supported in this browser';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      srcTextarea.value = transcript;
      updateCharCount();
    };

    recognition.onend = () => {
      isListening = false;
      btnSrcListen.classList.remove('listening');
      performTranslation();
    };

    recognition.onerror = (e) => {
      isListening = false;
      btnSrcListen.classList.remove('listening');
      showToast(`Speech error: ${e.error}`, "error");
    };
  }

  function toggleSpeechRecognition() {
    if (!recognition) {
      showToast("Speech Recognition not supported", "error");
      return;
    }

    if (isListening) {
      recognition.stop();
      isListening = false;
      btnSrcListen.classList.remove('listening');
    } else {
      const lang = srcLangSelect.value;
      recognition.lang = localeMap[lang] || lang;
      recognition.start();
      isListening = true;
      btnSrcListen.classList.add('listening');
      showToast("Listening... Speak now", "success");
    }
  }

  // Favorites Management
  async function toggleFavorite() {
    if (!currentTranslation || !currentTranslation.translatedText) {
      showToast("No active translation to favorite", "error");
      return;
    }

    try {
      const payload = {
        sourceText: srcTextarea.value.trim(),
        translatedText: currentTranslation.translatedText,
        sourceLang: currentTranslation.sourceLang || srcLangSelect.value,
        targetLang: targetLangSelect.value
      };

      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.isFavorite) {
        btnTargetFavorite.innerHTML = '<i class="fa-solid fa-star" style="color: var(--accent-amber);"></i>';
        showToast("Saved to Favorites!", "success");
      } else {
        btnTargetFavorite.innerHTML = '<i class="fa-regular fa-star"></i>';
        showToast("Removed from Favorites", "success");
      }
    } catch (e) {
      showToast("Error updating favorites", "error");
    }
  }

  // Slide-out Drawer
  function openDrawer(tab = 'history') {
    drawerBackdrop.classList.add('active');
    sidebarDrawer.classList.add('open');
    switchTab(tab);
  }

  function closeDrawer() {
    drawerBackdrop.classList.remove('active');
    sidebarDrawer.classList.remove('open');
  }

  function switchTab(tab) {
    if (tab === 'history') {
      tabHistory.classList.add('active');
      tabFavorites.classList.remove('active');
      panelHistory.classList.add('active');
      panelFavorites.classList.remove('active');
      loadHistoryList();
    } else {
      tabFavorites.classList.add('active');
      tabHistory.classList.remove('active');
      panelFavorites.classList.add('active');
      panelHistory.classList.remove('active');
      loadFavoritesList();
    }
  }

  async function loadHistoryList() {
    try {
      const res = await fetch('/api/history');
      const items = await res.json();
      renderItems(historyContainer, items);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadFavoritesList() {
    try {
      const res = await fetch('/api/favorites');
      const items = await res.json();
      renderItems(favoritesContainer, items);
    } catch (e) {
      console.error(e);
    }
  }

  function renderItems(container, items) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13px;">No items stored yet</div>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-item';
      
      const srcName = languagesList[item.sourceLang] || item.sourceLang;
      const targetName = languagesList[item.targetLang] || item.targetLang;

      card.innerHTML = `
        <div class="history-item-header">
          <span>${srcName} ➔ ${targetName}</span>
        </div>
        <div class="history-item-src">${escapeHtml(item.sourceText)}</div>
        <div class="history-item-target">${escapeHtml(item.translatedText)}</div>
      `;

      card.addEventListener('click', () => {
        srcTextarea.value = item.sourceText;
        if (item.sourceLang in languagesList) srcLangSelect.value = item.sourceLang;
        if (item.targetLang in languagesList) targetLangSelect.value = item.targetLang;
        updateCharCount();
        performTranslation();
        closeDrawer();
      });

      container.appendChild(card);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="toast-icon fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
      <span class="toast-msg">${escapeHtml(msg)}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
});
