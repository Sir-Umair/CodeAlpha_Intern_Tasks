import os
import sys
import glob
import json
import time
from typing import Optional

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from dataset_downloader import download_or_generate_dataset
from preprocess import preprocess_dataset
from train import train_model
from generate import generate_track_file

# Create required directories
os.makedirs("data/midi_dataset/classical", exist_ok=True)
os.makedirs("data/midi_dataset/jazz", exist_ok=True)
os.makedirs("data/midi_dataset/custom", exist_ok=True)
os.makedirs("models", exist_ok=True)
os.makedirs("outputs", exist_ok=True)

# Ensure sample dataset exists
download_or_generate_dataset()

app = FastAPI(title="AI Music Generation Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Training State tracking
training_state = {
    "is_training": False,
    "current_epoch": 0,
    "total_epochs": 0,
    "current_loss": 0.0,
    "last_completed": None
}

class GenerationRequest(BaseModel):
    num_notes: int = 64
    temperature: float = 0.9
    seed_token: Optional[str] = None
    genre: Optional[str] = "all"

class TrainRequest(BaseModel):
    epochs: int = 30
    lr: float = 0.005

@app.get("/api/status")
def get_status():
    model_exists = os.path.exists("models/music_lstm.json")
    vocab_exists = os.path.exists("data/vocab.json")
    
    vocab_size = 0
    if vocab_exists:
        with open("data/vocab.json", "r") as f:
            v_data = json.load(f)
            vocab_size = v_data.get("vocab_size", 0)
            
    midi_files = glob.glob("data/midi_dataset/**/*.mid", recursive=True) + \
                 glob.glob("data/midi_dataset/**/*.midi", recursive=True)
                 
    return {
        "status": "online",
        "model_ready": model_exists,
        "vocab_ready": vocab_exists,
        "vocab_size": vocab_size,
        "total_midi_files": len(midi_files),
        "training": training_state
    }

@app.get("/api/dataset/summary")
def get_dataset_summary():
    midi_files = glob.glob("data/midi_dataset/**/*.mid", recursive=True) + \
                 glob.glob("data/midi_dataset/**/*.midi", recursive=True)
                 
    files_info = []
    for fpath in midi_files:
        files_info.append({
            "name": os.path.basename(fpath),
            "rel_path": os.path.relpath(fpath, "data/midi_dataset"),
            "size_bytes": os.path.getsize(fpath)
        })
        
    vocab_info = {}
    if os.path.exists("data/vocab.json"):
        with open("data/vocab.json", "r") as f:
            vocab_info = json.load(f)
            
    return {
        "total_files": len(midi_files),
        "files": files_info,
        "vocab": vocab_info
    }

@app.post("/api/generate")
def generate_music(req: GenerationRequest):
    if not os.path.exists("models/music_lstm.json"):
        # Trigger fast model initialization training if needed
        train_model(epochs=20)

    try:
        timestamp = int(time.time())
        midi_filename = f"gen_track_{timestamp}.mid"
        
        start_t = time.time()
        midi_file, wav_file, tokens = generate_track_file(
            output_filename=midi_filename,
            num_notes=req.num_notes,
            temperature=req.temperature,
            seed_token=req.seed_token
        )
        elapsed = time.time() - start_t
        
        wav_filename = f"gen_track_{timestamp}.wav"
        
        return {
            "success": True,
            "midi_url": f"/outputs/{midi_filename}",
            "wav_url": f"/outputs/{wav_filename}",
            "filename_midi": midi_filename,
            "filename_wav": wav_filename,
            "num_notes": len(tokens),
            "tokens": tokens,
            "temperature": req.temperature,
            "generation_time_sec": round(elapsed, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def run_training_background(epochs: int, lr: float):
    global training_state
    training_state["is_training"] = True
    training_state["total_epochs"] = epochs
    
    def on_progress(epoch, total, loss):
        training_state["current_epoch"] = epoch
        training_state["current_loss"] = round(loss, 4)
        
    try:
        train_model(epochs=epochs, lr=lr, progress_callback=on_progress)
        training_state["last_completed"] = time.strftime("%Y-%m-%d %H:%M:%S")
    except Exception as e:
        print(f"Background training failed: {e}")
    finally:
        training_state["is_training"] = False

@app.post("/api/train")
def trigger_training(req: TrainRequest, background_tasks: BackgroundTasks):
    global training_state
    if training_state["is_training"]:
        return JSONResponse({"status": "already_training", "message": "Model is currently training!"}, status_code=400)
        
    background_tasks.add_task(run_training_background, req.epochs, req.lr)
    return {"status": "started", "message": f"Training initiated for {req.epochs} epochs."}

@app.post("/api/upload")
async def upload_midi(file: UploadFile = File(...)):
    if not (file.filename.endswith(".mid") or file.filename.endswith(".midi")):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a .mid or .midi file.")
        
    dest_path = os.path.join("data", "midi_dataset", "custom", file.filename)
    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    # Re-run dataset preprocessing
    preprocess_dataset()
    
    return {"success": True, "filename": file.filename, "message": "File uploaded and dataset updated."}

# Mount static outputs
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")

# Resolve frontend directory path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

if os.path.exists(FRONTEND_DIR):
    app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR), name="frontend")

@app.get("/")
def read_root():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "AI Music Generation API is running. Frontend files ready in /frontend directory."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
