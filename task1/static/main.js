/**
 * AetherTranslate - Client Logic for Python Flask Backend
 */

document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const srcLangSelect = document.getElementById('src-lang-select');
  const targetLangSelect = document.getElementById('target-lang-select');
  const btnSwap = document.getElementById('btn-swap-languages');
  const srcTextarea = document.getElementById('src-textarea');
  const targetOutput = document.getElementById('target-output');
  const detectedLangBadge = document.getElementById('detected-lang-badge');
  const currentCharCount = document.getElementById('current-char-count');
  const charProgressFill = document.getElementById('char-progress-fill');
  const translationSpeed = document.getElementById('translation-speed');
  const translationLoader = document.getElementById('translation-loader');
  const activeEngineLabel = document.getElementById('active-engine-label');
  const audioVisualizer = document.getElementById('audio-visualizer');

  // Quick Preset Bars
  const srcPresetBar = document.getElementById('src-preset-bar');
  const targetPresetBar = document.getElementById('target-preset-bar');

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

  // App State
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
    showToast(`Switched to ${newTheme} theme`, 'success');
  });

  // Load languages from Python Flask backend
  async function loadLanguages() {
    try {
      const res = await fetch('/api/languages');
      const data = await res.json();
      languagesList = data.languages;
      localeMap = data.locales;

      // Populate Source Select
      srcLangSelect.innerHTML = '';
      for (const [code, name] of Object.entries(languagesList)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = name;
        if (code === 'auto') opt.selected = true;
        srcLangSelect.appendChild(opt);
      }

      // Populate Target Select
      targetLangSelect.innerHTML = '';
      for (const [code, name] of Object.entries(languagesList)) {
        if (code === 'auto') continue;
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = name;
        if (code === 'ur') opt.selected = true; // Default to Urdu
        targetLangSelect.appendChild(opt);
      }

      updatePresetPillActiveState(srcPresetBar, 'auto');
      updatePresetPillActiveState(targetPresetBar, 'ur');

    } catch (e) {
      console.error("Language load error:", e);
      showToast("Error connecting to Python backend", "error");
    }
  }

  function setupEventListeners() {
    // Quick Preset Bar Clicks
    setupPresetBar(srcPresetBar, srcLangSelect);
    setupPresetBar(targetPresetBar, targetLangSelect);

    // Text Input Debounce
    srcTextarea.addEventListener('input', () => {
      updateCharCount();
      if (!chkAutoTranslate.checked) return;
      clearTimeout(translationTimeout);
      translationTimeout = setTimeout(performTranslation, 350);
    });

    srcLangSelect.addEventListener('change', () => {
      updatePresetPillActiveState(srcPresetBar, srcLangSelect.value);
      performTranslation();
    });

    targetLangSelect.addEventListener('change', () => {
      updatePresetPillActiveState(targetPresetBar, targetLangSelect.value);
      performTranslation();
    });

    // Language Swap
    btnSwap.addEventListener('click', () => {
      const srcVal = srcLangSelect.value;
      const targetVal = targetLangSelect.value;

      if (srcVal === 'auto') {
        showToast("Cannot swap when Source is Auto Detect", "error");
        return;
      }

      srcLangSelect.value = targetVal;
      targetLangSelect.value = srcVal;

      updatePresetPillActiveState(srcPresetBar, targetVal);
      updatePresetPillActiveState(targetPresetBar, srcVal);

      const currentTargetText = targetOutput.textContent;
      if (currentTargetText && !targetOutput.classList.contains('placeholder')) {
        srcTextarea.value = currentTargetText;
        updateCharCount();
      }

      performTranslation();
    });

    // Clear Buttons
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
        showToast("Copy failed", "error");
      }
    });

    // Audio Playback
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

    // Voice Dictation (STT)
    btnSrcListen.addEventListener('click', toggleSpeechRecognition);

    // Favorite Toggle
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
      const engineName = engineSelect.options[engineSelect.selectedIndex].text.split(' (')[0];
      activeEngineLabel.textContent = `Engine: ${engineName}`;
      showToast("Preferences saved!", "success");
      performTranslation();
    });
  }

  function setupPresetBar(bar, selectEl) {
    if (!bar) return;
    bar.querySelectorAll('.preset-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        selectEl.value = lang;
        updatePresetPillActiveState(bar, lang);
        performTranslation();
      });
    });
  }

  function updatePresetPillActiveState(bar, lang) {
    if (!bar) return;
    bar.querySelectorAll('.preset-pill').forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function updateCharCount() {
    const len = srcTextarea.value.length;
    currentCharCount.textContent = `${len} / 5000`;
    const pct = Math.min(100, (len / 5000) * 100);
    charProgressFill.style.width = `${pct}%`;
  }

  // Execute Translation via Python Backend Endpoint
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
        showToast(data.error || "Translation failed", "error");
      }
    } catch (e) {
      translationLoader.classList.add('hide');
      showToast("Server communication error", "error");
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
      const url = `/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
      activeAudio = new Audio(url);
      await activeAudio.play();
    } catch (e) {
      speakBrowserFallback(text, lang);
    }
  }

  function speakBrowserFallback(text, lang) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = localeMap[lang] || lang;
      window.speechSynthesis.speak(utt);
    }
  }

  // Speech Dictation
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btnSrcListen.style.opacity = '0.4';
      btnSrcListen.title = 'Speech Recognition unavailable';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      srcTextarea.value = transcript;
      updateCharCount();
    };

    recognition.onend = () => {
      isListening = false;
      btnSrcListen.classList.remove('listening');
      audioVisualizer.classList.add('hide');
      performTranslation();
    };

    recognition.onerror = (e) => {
      isListening = false;
      btnSrcListen.classList.remove('listening');
      audioVisualizer.classList.add('hide');
      showToast(`Voice input error: ${e.error}`, "error");
    };
  }

  function toggleSpeechRecognition() {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      isListening = false;
      btnSrcListen.classList.remove('listening');
      audioVisualizer.classList.add('hide');
    } else {
      const lang = srcLangSelect.value;
      recognition.lang = localeMap[lang] || lang;
      recognition.start();
      isListening = true;
      btnSrcListen.classList.add('listening');
      audioVisualizer.classList.remove('hide');
      showToast("Listening to voice... Speak now", "success");
    }
  }

  // Favorites Management
  async function toggleFavorite() {
    if (!currentTranslation || !currentTranslation.translatedText) {
      showToast("No translation to bookmark", "error");
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
      showToast("Favorites error", "error");
    }
  }

  // Drawer Controls
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
      renderDrawerList(historyContainer, items);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadFavoritesList() {
    try {
      const res = await fetch('/api/favorites');
      const items = await res.json();
      renderDrawerList(favoritesContainer, items);
    } catch (e) {
      console.error(e);
    }
  }

  function renderDrawerList(container, items) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
      container.innerHTML = '<div style="padding: 30px; text-align: center; color: var(--text-muted); font-size: 13px;">No entries saved yet</div>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'history-card-item';

      const srcName = languagesList[item.sourceLang] || item.sourceLang;
      const targetName = languagesList[item.targetLang] || item.targetLang;

      card.innerHTML = `
        <div class="card-lang-header">${srcName} ➔ ${targetName}</div>
        <div class="card-text-src">${escapeHtml(item.sourceText)}</div>
        <div class="card-text-target">${escapeHtml(item.translatedText)}</div>
      `;

      card.addEventListener('click', () => {
        srcTextarea.value = item.sourceText;
        if (item.sourceLang in languagesList) srcLangSelect.value = item.sourceLang;
        if (item.targetLang in languagesList) targetLangSelect.value = item.targetLang;

        updatePresetPillActiveState(srcPresetBar, item.sourceLang);
        updatePresetPillActiveState(targetPresetBar, item.targetLang);

        updateCharCount();
        performTranslation();
        closeDrawer();
      });

      container.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}" style="color: var(--accent-${type === 'success' ? 'emerald' : 'coral'});"></i>
      <span>${escapeHtml(msg)}</span>
    `;

    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }
});
