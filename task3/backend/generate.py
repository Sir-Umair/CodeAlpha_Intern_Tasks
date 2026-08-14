import os
import sys
import json
import random
import numpy as np
import music21

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from model import NumpyMusicLSTM, softmax
from synth import midi_to_wav

def tokens_to_midi(note_tokens, output_file="outputs/generated_track.mid", bpm=120):
    """
    Converts note tokens ('60', '60.64.67', 'rest') to MIDI file using music21.
    """
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    score = music21.stream.Score()
    part = music21.stream.Part()
    part.append(music21.tempo.MetronomeMark(number=bpm))
    part.append(music21.instrument.Piano())

    duration_quarter = 0.5  # Eighth note duration

    for token in note_tokens:
        if token == 'rest':
            r = music21.note.Rest(quarterLength=duration_quarter)
            part.append(r)
        elif '.' in token:
            try:
                pitches = [int(p) for p in token.split('.')]
                c = music21.chord.Chord(pitches, quarterLength=duration_quarter)
                part.append(c)
            except Exception:
                pass
        else:
            try:
                pitch_val = int(token)
                n = music21.note.Note(pitch_val, quarterLength=duration_quarter)
                part.append(n)
            except Exception:
                pass

    score.append(part)
    score.write('midi', fp=output_file)
    print(f"Exported MIDI: {output_file}")
    return output_file

def generate_music_sequence(
    model_path="models/music_lstm.json",
    vocab_path="data/vocab.json",
    num_notes=64,
    temperature=1.0,
    seed_token=None
):
    """
    Generates music sequence using trained NumpyMusicLSTM model with temperature-scaled softmax sampling.
    """
    if not os.path.exists(model_path):
        print("Model checkpoint missing. Launching fast training run...")
        from train import train_model
        train_model(epochs=25)
        
    with open(vocab_path, "r") as f:
        vocab_info = json.load(f)
        
    note2idx = vocab_info['note2idx']
    idx2note = {int(k): v for k, v in vocab_info['idx2note'].items()}
    sequence_length = vocab_info['sequence_length']
    
    model = NumpyMusicLSTM.load_model(model_path)
    
    # Initialize seed pattern
    if seed_token and seed_token in note2idx:
        seed_idx = note2idx[seed_token]
        pattern = [seed_idx] * sequence_length
    else:
        vocab_indices = list(idx2note.keys())
        start_idx = random.choice(vocab_indices)
        pattern = [start_idx] * sequence_length

    generated_tokens = []
    
    print(f"Generating {num_notes} note tokens (Temperature: {temperature:.2f})...")
    for _ in range(num_notes):
        seq_in = pattern[-sequence_length:]
        logits, _, _, _ = model.forward(seq_in)
        
        # Softmax sampling with temperature
        probs = softmax(logits.ravel(), temperature=temperature)
        
        # Sample index from categorical probability distribution
        next_idx = np.random.choice(len(probs), p=probs)
        
        note_str = idx2note[next_idx]
        generated_tokens.append(note_str)
        pattern.append(next_idx)
        
    return generated_tokens

def generate_track_file(output_filename="generated_track.mid", num_notes=64, temperature=1.0, seed_token=None):
    output_path = os.path.join("outputs", output_filename)
    tokens = generate_music_sequence(num_notes=num_notes, temperature=temperature, seed_token=seed_token)
    midi_file = tokens_to_midi(tokens, output_file=output_path)
    
    # Synthesize WAV audio
    wav_filename = os.path.splitext(output_filename)[0] + ".wav"
    wav_path = os.path.join("outputs", wav_filename)
    midi_to_wav(midi_file, output_wav_path=wav_path)
    
    return midi_file, wav_path, tokens

if __name__ == "__main__":
    midi_p, wav_p, tok = generate_track_file(num_notes=48, temperature=0.9)
    print(f"Generated track! MIDI: {midi_p} | WAV: {wav_p}")
