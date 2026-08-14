document.addEventListener('DOMContentLoaded', () => {
    // API Configuration - Always target Python FastAPI backend on port 8000 unless hosted on port 8000 directly
    const API_BASE = window.location.port === '8000' 
        ? window.location.origin 
        : 'http://localhost:8000';

    async function safeParseJson(res) {
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error(`Server returned non-JSON response (${res.status}). Ensure Python FastAPI backend is running on port 8000.`);
        }
    }

    // State Variables
    let audioContext = null;
    let vizMode = 'waterfall';
    let currentTokens = [];
    let isPlayingTrack = false;
    let tokenPlaybackTimer = null;
    let trainingPollInterval = null;
    
    // DOM Elements
    const badgeModel = document.getElementById('badge-model');
    const vocabCountEl = document.getElementById('vocab-count');
    const datasetCountEl = document.getElementById('dataset-count');
    
    const studioCanvas = document.getElementById('studio-canvas');
    const ctx = studioCanvas ? studioCanvas.getContext('2d') : null;
    const canvasOverlay = document.getElementById('canvas-idle-overlay');
    const vizButtons = document.querySelectorAll('.viz-btn');
    const pianoKeyboard = document.getElementById('piano-keyboard');
    
    const generatorForm = document.getElementById('generator-form');
    const numNotesSlider = document.getElementById('num-notes-slider');
    const numNotesVal = document.getElementById('num-notes-val');
    const tempSlider = document.getElementById('temperature-slider');
    const tempVal = document.getElementById('temperature-val');
    const seedSelect = document.getElementById('seed-token-select');
    const generateBtn = document.getElementById('generate-btn');
    const presetChips = document.querySelectorAll('.preset-chip');
    
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const seekBar = document.getElementById('seek-bar');
    const currTimeEl = document.getElementById('curr-time');
    const durTimeEl = document.getElementById('dur-time');
    const volSlider = document.getElementById('vol-slider');
    const trackTitleEl = document.getElementById('track-title');
    const trackStatusLabel = document.getElementById('track-status-label');
    const downloadWavBtn = document.getElementById('download-wav-btn');
    const downloadMidiBtn = document.getElementById('download-midi-btn');
    const tokensContainer = document.getElementById('tokens-container');
    const tokenCountEl = document.getElementById('token-count');
    
    const trainModal = document.getElementById('train-modal');
    const openTrainBtn = document.getElementById('open-train-modal-btn');
    const closeTrainBtn = document.getElementById('close-train-modal');
    const trainForm = document.getElementById('train-form');
    const trainStatusBox = document.getElementById('training-status-box');
    const trainEpochText = document.getElementById('train-epoch-text');
    const trainProgressFill = document.getElementById('train-progress-fill');
    const trainLossText = document.getElementById('train-loss-text');
    
    const uploadModal = document.getElementById('upload-modal');
    const openUploadBtn = document.getElementById('open-upload-modal-btn');
    const closeUploadBtn = document.getElementById('close-upload-modal');
    const midiDropzone = document.getElementById('midi-dropzone');
    const midiFileInput = document.getElementById('midi-file-input');
    const uploadFeedback = document.getElementById('upload-feedback');
    const toastContainer = document.getElementById('toast-container');

    // Initialize Web Audio API
    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return audioContext;
    }

    // Synthesize Live Piano Key Sound
    function playSynthesizedNote(pitch, duration = 0.4) {
        const actx = getAudioContext();
        const freq = 440 * Math.pow(2, (pitch - 69) / 12);
        
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        
        // Attack-decay envelope
        gain.gain.setValueAtTime(0, actx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, actx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(actx.destination);
        
        osc.start();
        osc.stop(actx.currentTime + duration);
    }

    // Render 2-Octave Piano Keyboard (C3 to B4 -> MIDI 48 to 71)
    function buildPianoKeyboard() {
        pianoKeyboard.innerHTML = '';
        const whiteNotes = [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71];
        const noteNames = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4'];
        
        const blackNotesMap = {
            48: 49, // C#3
            50: 51, // D#3
            53: 54, // F#3
            55: 56, // G#3
            57: 58, // A#3
            60: 61, // C#4
            62: 63, // D#4
            65: 66, // F#4
            67: 68, // G#4
            69: 70  // A#4
        };

        const totalWhite = whiteNotes.length;

        whiteNotes.forEach((pitch, index) => {
            const keyEl = document.createElement('div');
            keyEl.className = 'white-key';
            keyEl.dataset.pitch = pitch;
            keyEl.innerText = noteNames[index];
            
            keyEl.addEventListener('click', () => {
                playSynthesizedNote(pitch);
                flashKey(pitch);
                triggerVisualizerNote(pitch);
            });
            
            pianoKeyboard.appendChild(keyEl);

            // Add corresponding black key if present
            if (blackNotesMap[pitch]) {
                const bPitch = blackNotesMap[pitch];
                const bKey = document.createElement('div');
                bKey.className = 'black-key';
                bKey.dataset.pitch = bPitch;
                
                // Position black key centered on white key boundary seam
                bKey.style.left = `calc(${((index + 1) / totalWhite) * 100}% - 13px)`;
                
                bKey.addEventListener('click', (e) => {
                    e.stopPropagation();
                    playSynthesizedNote(bPitch);
                    flashKey(bPitch);
                    triggerVisualizerNote(bPitch);
                });
                
                pianoKeyboard.appendChild(bKey);
            }
        });
    }

    function flashKey(pitch) {
        const key = pianoKeyboard.querySelector(`[data-pitch="${pitch}"]`);
        if (key) {
            key.classList.add('active');
            setTimeout(() => key.classList.remove('active'), 250);
        }
    }

    // Canvas Resize & Animation
    function resizeCanvas() {
        if (!studioCanvas || !studioCanvas.parentElement) return;
        const rect = studioCanvas.parentElement.getBoundingClientRect();
        studioCanvas.width = rect.width;
        studioCanvas.height = rect.height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Visualizer Render Particles & Waterfall Notes
    let visualizerNotes = [];

    function triggerVisualizerNote(pitch) {
        if (!studioCanvas) return;
        visualizerNotes.push({
            pitch: pitch,
            x: ((pitch - 48) / 24) * studioCanvas.width,
            y: 0,
            radius: 8 + Math.random() * 8,
            color: `hsl(${(pitch * 12) % 360}, 85%, 65%)`,
            speed: 2 + Math.random() * 2,
            life: 1.0
        });
        if (canvasOverlay) canvasOverlay.style.opacity = '0';
    }

    function renderCanvas() {
        if (!studioCanvas || !ctx) return;
        ctx.fillStyle = 'rgba(8, 9, 17, 0.25)';
        ctx.fillRect(0, 0, studioCanvas.width, studioCanvas.height);

        if (vizMode === 'waterfall') {
            // Waterfall Piano Roll effect
            for (let i = visualizerNotes.length - 1; i >= 0; i--) {
                const n = visualizerNotes[i];
                n.y += n.speed;
                n.life -= 0.008;

                ctx.save();
                ctx.globalAlpha = Math.max(n.life, 0);
                ctx.fillStyle = n.color;
                ctx.shadowColor = n.color;
                ctx.shadowBlur = 12;

                ctx.beginPath();
                ctx.roundRect(n.x, n.y, 14, 30, 6);
                ctx.fill();
                ctx.restore();

                if (n.y > studioCanvas.height || n.life <= 0) {
                    visualizerNotes.splice(i, 1);
                }
            }
        } else if (vizMode === 'bars') {
            // Spectrum Bars
            const numBars = 32;
            const barWidth = studioCanvas.width / numBars;
            for (let i = 0; i < numBars; i++) {
                const activeVal = isPlayingTrack ? (Math.sin(Date.now() * 0.005 + i) * 0.5 + 0.5) * studioCanvas.height * 0.7 : 4;
                const hue = (i * 10 + Date.now() * 0.05) % 360;
                
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.shadowColor = `hsl(${hue}, 80%, 60%)`;
                ctx.shadowBlur = 8;
                ctx.fillRect(i * barWidth + 2, studioCanvas.height - activeVal, barWidth - 4, activeVal);
            }
        } else if (vizMode === 'wave') {
            // Oscilloscope Waveform
            ctx.beginPath();
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 10;

            const sliceWidth = studioCanvas.width / 100;
            let x = 0;
            for (let i = 0; i < 100; i++) {
                const v = isPlayingTrack ? Math.sin(i * 0.2 + Date.now() * 0.01) * 30 + studioCanvas.height / 2 : studioCanvas.height / 2;
                if (i === 0) ctx.moveTo(x, v);
                else ctx.lineTo(x, v);
                x += sliceWidth;
            }
            ctx.stroke();
        }

        requestAnimationFrame(renderCanvas);
    }
    renderCanvas();

    // Toggle Visualizer Modes
    vizButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            vizButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            vizMode = btn.dataset.mode;
        });
    });

    // Preset Selection
    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            presetChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const preset = chip.dataset.preset;
            if (preset === 'classical') {
                numNotesSlider.value = 64;
                tempSlider.value = 0.85;
                seedSelect.value = '60';
            } else if (preset === 'jazz') {
                numNotesSlider.value = 80;
                tempSlider.value = 1.1;
                seedSelect.value = '60.64.67';
            } else if (preset === 'ambient') {
                numNotesSlider.value = 48;
                tempSlider.value = 0.6;
                seedSelect.value = '64';
            } else if (preset === 'staccato') {
                numNotesSlider.value = 96;
                tempSlider.value = 1.3;
                seedSelect.value = '72';
            }
            updateSliderLabels();
        });
    });

    // Form Sliders Updates
    function updateSliderLabels() {
        numNotesVal.innerText = `${numNotesSlider.value} notes`;
        const temp = parseFloat(tempSlider.value);
        let desc = temp < 0.6 ? 'Predictable' : temp < 1.1 ? 'Harmonic' : 'Experimental';
        tempVal.innerText = `${temp.toFixed(2)} (${desc})`;
    }

    numNotesSlider.addEventListener('input', updateSliderLabels);
    tempSlider.addEventListener('input', updateSliderLabels);

    // Fetch System Status
    async function checkBackendStatus() {
        try {
            const res = await fetch(`${API_BASE}/api/status`);
            const data = await safeParseJson(res);

            if (data.model_ready) {
                badgeModel.innerHTML = '<span class="dot online"></span><span class="badge-text">Model: Ready</span>';
            } else {
                badgeModel.innerHTML = '<span class="dot offline"></span><span class="badge-text">Model: Untrained</span>';
            }

            vocabCountEl.innerText = data.vocab_size || 0;
            datasetCountEl.innerText = data.total_midi_files || 0;

            if (data.training && data.training.is_training) {
                badgeModel.innerHTML = '<span class="dot training"></span><span class="badge-text">Model: Training...</span>';
                updateTrainingUI(data.training);
            }
        } catch (err) {
            badgeModel.innerHTML = '<span class="dot offline"></span><span class="badge-text">API Offline</span>';
        }
    }

    // Submit Track Generation
    generatorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating Track...';

        const payload = {
            num_notes: parseInt(numNotesSlider.value),
            temperature: parseFloat(tempSlider.value),
            seed_token: seedSelect.value || null
        };

        try {
            const res = await fetch(`${API_BASE}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await safeParseJson(res);
            if (!res.ok) {
                throw new Error(data.detail || 'Generation failed');
            }

            showToast('Track generated successfully!', 'success');
            loadGeneratedTrack(data);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fa-solid fa-sparkles"></i> Generate Music Track';
        }
    });

    // Populate Player with Generated Track
    function loadGeneratedTrack(data) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isPlayingTrack = false;
        playIcon.className = 'fa-solid fa-play';
        stopTokenHighlighting();
        seekBar.value = 0;
        currTimeEl.innerText = formatTime(0);
        durTimeEl.innerText = formatTime(0);

        currentTokens = data.tokens || [];
        trackTitleEl.innerText = data.filename_wav;
        trackStatusLabel.innerText = `Generated in ${data.generation_time_sec}s (${data.num_notes} tokens)`;
        
        audioPlayer.src = `${API_BASE}${data.wav_url}`;
        audioPlayer.load();

        playPauseBtn.disabled = false;
        seekBar.disabled = false;
        downloadWavBtn.href = `${API_BASE}${data.wav_url}`;
        downloadWavBtn.disabled = false;
        downloadMidiBtn.href = `${API_BASE}${data.midi_url}`;
        downloadMidiBtn.disabled = false;

        // Render Tokens List
        tokenCountEl.innerText = currentTokens.length;
        tokensContainer.innerHTML = '';
        currentTokens.forEach((token, idx) => {
            const chip = document.createElement('span');
            chip.className = 'token-chip';
            if (token === 'rest') chip.classList.add('rest');
            else if (token.includes('.')) chip.classList.add('chord');
            chip.innerText = token;
            chip.dataset.idx = idx;
            tokensContainer.appendChild(chip);
        });

        if (canvasOverlay) canvasOverlay.style.opacity = '0';
    }

    // Audio Playback Controls
    playPauseBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            if (!isNaN(audioPlayer.duration) && audioPlayer.currentTime >= audioPlayer.duration) {
                audioPlayer.currentTime = 0;
            }
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    });

    audioPlayer.addEventListener('play', () => {
        isPlayingTrack = true;
        playIcon.className = 'fa-solid fa-pause';
        startTokenHighlighting();
    });

    audioPlayer.addEventListener('pause', () => {
        isPlayingTrack = false;
        playIcon.className = 'fa-solid fa-play';
        stopTokenHighlighting();
    });

    audioPlayer.addEventListener('ended', () => {
        isPlayingTrack = false;
        playIcon.className = 'fa-solid fa-play';
        stopTokenHighlighting();
        audioPlayer.currentTime = 0;
        seekBar.value = 0;
        currTimeEl.innerText = formatTime(0);
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
            const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            seekBar.value = progress;
            currTimeEl.innerText = formatTime(audioPlayer.currentTime);
            durTimeEl.innerText = formatTime(audioPlayer.duration);
        }
    });

    seekBar.addEventListener('input', () => {
        if (!isNaN(audioPlayer.duration)) {
            audioPlayer.currentTime = (seekBar.value / 100) * audioPlayer.duration;
            currTimeEl.innerText = formatTime(audioPlayer.currentTime);
            if (audioPlayer.currentTime < audioPlayer.duration && !audioPlayer.paused) {
                startTokenHighlighting();
            }
        }
    });

    volSlider.addEventListener('input', () => {
        audioPlayer.volume = parseFloat(volSlider.value);
    });

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // Synchronized Note Highlight during Playback
    function startTokenHighlighting() {
        stopTokenHighlighting();
        if (currentTokens.length === 0) return;

        const totalDuration = audioPlayer.duration || 1;
        const timePerToken = totalDuration / currentTokens.length;

        tokenPlaybackTimer = setInterval(() => {
            if (!isPlayingTrack) return;
            const currentIdx = Math.floor(audioPlayer.currentTime / timePerToken);
            if (currentIdx < currentTokens.length) {
                const token = currentTokens[currentIdx];
                
                // Highlight Chip
                document.querySelectorAll('.token-chip').forEach(c => {
                    c.style.transform = 'none';
                    c.classList.remove('active');
                });
                const chip = tokensContainer.querySelector(`[data-idx="${currentIdx}"]`);
                if (chip) {
                    chip.style.transform = 'scale(1.15)';
                    chip.classList.add('active');
                    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }

                // Trigger Piano Flash & Visualizer Particle
                if (token !== 'rest') {
                    const pitches = token.split('.').map(p => parseInt(p));
                    pitches.forEach(p => {
                        flashKey(p);
                        triggerVisualizerNote(p);
                    });
                }
            } else {
                stopTokenHighlighting();
            }
        }, 100);
    }

    function stopTokenHighlighting() {
        if (tokenPlaybackTimer) {
            clearInterval(tokenPlaybackTimer);
            tokenPlaybackTimer = null;
        }
        document.querySelectorAll('.token-chip').forEach(c => {
            c.style.transform = 'none';
            c.classList.remove('active');
        });
    }

    // Training Manager Modal
    openTrainBtn.addEventListener('click', () => trainModal.classList.add('active'));
    closeTrainBtn.addEventListener('click', () => trainModal.classList.remove('active'));

    trainForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const epochs = parseInt(document.getElementById('train-epochs').value);
        const lr = parseFloat(document.getElementById('train-lr').value);

        try {
            const res = await fetch(`${API_BASE}/api/train`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ epochs, lr })
            });
            const data = await safeParseJson(res);
            if (!res.ok) throw new Error(data.message || data.detail || 'Training failed');
            
            showToast(data.message, 'success');
            trainStatusBox.style.display = 'flex';
            startTrainingPoll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });

    function startTrainingPoll() {
        if (trainingPollInterval) clearInterval(trainingPollInterval);
        trainingPollInterval = setInterval(checkBackendStatus, 1500);
    }

    function updateTrainingUI(training) {
        trainStatusBox.style.display = 'flex';
        trainEpochText.innerText = `Epoch ${training.current_epoch} / ${training.total_epochs}`;
        const pct = (training.current_epoch / training.total_epochs) * 100;
        trainProgressFill.style.width = `${pct}%`;
        trainLossText.innerText = training.current_loss.toFixed(4);

        if (!training.is_training) {
            clearInterval(trainingPollInterval);
            showToast('Model training completed!', 'success');
            checkBackendStatus();
        }
    }

    // MIDI File Uploader Modal
    openUploadBtn.addEventListener('click', () => uploadModal.classList.add('active'));
    closeUploadBtn.addEventListener('click', () => uploadModal.classList.remove('active'));

    midiDropzone.addEventListener('click', () => midiFileInput.click());

    midiDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        midiDropzone.classList.add('dragover');
    });

    midiDropzone.addEventListener('dragleave', () => midiDropzone.classList.remove('dragover'));

    midiDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        midiDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    midiFileInput.addEventListener('change', () => {
        if (midiFileInput.files.length) {
            handleFileUpload(midiFileInput.files[0]);
        }
    });

    async function handleFileUpload(file) {
        if (!file.name.endsWith('.mid') && !file.name.endsWith('.midi')) {
            showToast('Please upload a valid .mid or .midi file', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        uploadFeedback.innerHTML = '<span class="hint-text"><i class="fa-solid fa-spinner fa-spin"></i> Uploading and preprocessing dataset...</span>';

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await safeParseJson(res);
            if (!res.ok) throw new Error(data.detail || 'Upload failed');

            uploadFeedback.innerHTML = `<span style="color: var(--accent-green);"><i class="fa-solid fa-check"></i> ${data.message}</span>`;
            showToast(`Uploaded ${file.name} successfully!`, 'success');
            checkBackendStatus();
            setTimeout(() => uploadModal.classList.remove('active'), 1500);
        } catch (err) {
            uploadFeedback.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-xmark"></i> ${err.message}</span>`;
        }
    }

    // Helper Toast
    function showToast(message, type = 'info') {
        if (message === 'Failed to fetch' || message.includes('Failed to fetch') || message.includes('NetworkError')) {
            message = 'Backend server offline. Please run "python run.py" in terminal.';
            type = 'error';
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'circle-check' : 'circle-exclamation'}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    // Init Calls
    buildPianoKeyboard();
    checkBackendStatus();
});
