# 🎵 Task 3: Music Generation / AI Music Generator Studio (`/task3`)

An end-to-end AI Music Generation Web Application & Deep Learning Studio powered by a **Custom LSTM Neural Network** (NumPy-based architecture), **FastAPI Backend Engine**, **Web Audio Synthesizer**, and **Interactive Web Interface**.

---

## ✨ Key Features

- **LSTM Neural Network Engine (`backend/model.py`)**: Built-in Recurrent Neural Network with Long Short-Term Memory (LSTM) cells written from scratch using NumPy. Features forward-propagation, Softmax sampling with temperature control, cross-entropy loss computation, and backpropagation through time (BPTT).
- **MIDI Preprocessing & Vocabulary Generator (`backend/preprocess.py`)**: Parses MIDI sequence events (notes, chords, durations, rests) using `music21`, builds a dynamic pitch vocabulary (`data/vocab.json`), and serializes training sequence patterns (`data/processed_data.npz`).
- **Real-Time Polyphonic Software Synthesizer (`backend/synth.py`)**: Converts generated MIDI note sequences directly into WAV audio using pure Python sine/sawtooth sound synthesis, ADSR envelopes, and smooth decay curves.
- **FastAPI REST Server (`backend/app.py`)**: Provides clean RESTful API endpoints for music generation, dataset inspection, background model training, MIDI file uploading, and output streaming.
- **Modern Web Studio Interface (`frontend/`)**: Futuristic web UI featuring interactive canvas visualizer, piano roll preview, temperature sliders, genre selectors, live progress indicators, and instant audio playback.
- **Automated Dataset Downloader (`backend/dataset_downloader.py`)**: Bundles starter classical and jazz MIDI tracks and fallback procedural dataset generation.
- **Comprehensive Unit Test Suite (`backend/tests/`)**: Test coverage for preprocessing, LSTM forward/loss calculations, vocabulary mapping, and track generation.

---

## 📁 Repository Structure

```text
task3/
├── backend/
│   ├── app.py                 # FastAPI REST server & endpoint routing
│   ├── dataset_downloader.py  # Sample dataset downloader & fallback generator
│   ├── generate.py            # Model inference & track generator script
│   ├── model.py               # Pure NumPy LSTM Neural Network implementation
│   ├── preprocess.py          # MIDI parser & dataset preprocessing module
│   ├── synth.py               # Software audio synthesizer (MIDI to WAV)
│   ├── train.py               # Model training script with callback progress
│   ├── requirements.txt       # Python dependencies
│   ├── data/                  # MIDI datasets, vocab.json & processed dataset
│   ├── models/                # Saved LSTM model weights & JSON configurations
│   ├── outputs/               # Generated MIDI and WAV track outputs
│   └── tests/                 # Unit test suite
├── frontend/
│   ├── index.html             # Web Studio HTML5 UI
│   ├── style.css              # Cyber-deluxe studio styling & animations
│   └── app.js                 # Web Audio preview & API controller
└── run.py                     # One-click launcher for FastAPI studio server
```

---

## 🚀 REST API Endpoints

- `GET /api/status`: Returns system online status, model readiness, vocabulary size, and training progress.
- `GET /api/dataset/summary`: Lists dataset files, note vocabulary tokens, and file size metadata.
- `POST /api/generate`: Generates a new musical sequence with parameters (`num_notes`, `temperature`, `seed_token`). Returns MIDI and WAV URLs.
- `POST /api/train`: Triggers background model training for custom epoch count and learning rate.
- `POST /api/upload`: Uploads custom `.mid` / `.midi` files to expand dataset and auto-reprocess vocabulary.
- `GET /outputs/{filename}`: Static file server for generated MIDI and synthesized WAV audio files.

---

## 🛠️ How to Run

### 1. Install Dependencies
```bash
cd task3/backend
pip install -r requirements.txt
```

### 2. Run the Studio Server
From the `task3` directory, run:
```bash
python run.py
```
Open your browser and navigate to **`http://localhost:8000`**.

### 3. Run Automated Tests
```bash
cd task3/backend
python -m unittest discover -s tests
```
