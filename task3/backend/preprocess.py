import os
import glob
import json
import numpy as np
import music21
import mido

def parse_midi_file(file_path):
    """
    Parses a MIDI file and extracts a flat sequence of note/chord string tokens.
    Uses music21 with fallback to mido for full coverage.
    """
    notes = []
    try:
        score = music21.converter.parse(file_path)
        elements = score.recurse().notesAndRests
        
        for element in elements:
            if isinstance(element, music21.note.Note):
                notes.append(str(element.pitch.midi))
            elif isinstance(element, music21.chord.Chord):
                pitches = sorted([p.midi for p in element.pitches])
                notes.append('.'.join(str(p) for p in pitches))
            elif isinstance(element, music21.note.Rest):
                notes.append('rest')
    except Exception as e:
        print(f"music21 parse warning for {file_path}: {e}. Trying mido parser...")
        try:
            mid = mido.MidiFile(file_path)
            active_notes = set()
            for track in mid.tracks:
                for msg in track:
                    if msg.type == 'note_on' and msg.velocity > 0:
                        notes.append(str(msg.note))
        except Exception as err:
            print(f"Failed to parse {file_path}: {err}")

    return notes

def preprocess_dataset(dataset_dir="data/midi_dataset", sequence_length=16, output_dir="data"):
    """
    Scans all MIDI files, extracts note tokens, creates sliding window sequence pairs (X, y),
    builds vocabulary dictionaries, and saves output files.
    """
    os.makedirs(output_dir, exist_ok=True)
    midi_files = glob.glob(os.path.join(dataset_dir, "**", "*.mid"), recursive=True) + \
                 glob.glob(os.path.join(dataset_dir, "**", "*.midi"), recursive=True)
                 
    if not midi_files:
        print(f"No MIDI files found in {dataset_dir}. Generating default sample dataset...")
        from dataset_downloader import download_or_generate_dataset
        download_or_generate_dataset()
        midi_files = glob.glob(os.path.join(dataset_dir, "**", "*.mid"), recursive=True) + \
                     glob.glob(os.path.join(dataset_dir, "**", "*.midi"), recursive=True)
                     
    all_notes = []
    track_notes = []
    
    print(f"Found {len(midi_files)} MIDI files. Processing note sequences...")
    for fpath in midi_files:
        notes = parse_midi_file(fpath)
        if len(notes) >= sequence_length:
            track_notes.append(notes)
            all_notes.extend(notes)
            print(f"Parsed {len(notes)} tokens from {os.path.basename(fpath)}")
            
    if not all_notes:
        raise ValueError("No note tokens could be extracted from dataset!")
        
    unique_pitches = sorted(list(set(all_notes)))
    vocab_size = len(unique_pitches)
    note2idx = {note: idx for idx, note in enumerate(unique_pitches)}
    idx2note = {idx: note for idx, note in enumerate(unique_pitches)}
    
    vocab_info = {
        "note2idx": note2idx,
        "idx2note": idx2note,
        "vocab_size": vocab_size,
        "sequence_length": sequence_length
    }
    vocab_path = os.path.join(output_dir, "vocab.json")
    with open(vocab_path, "w") as f:
        json.dump(vocab_info, f, indent=2)
    print(f"Saved vocabulary to {vocab_path} (Vocabulary Size: {vocab_size})")

    network_inputs = []
    network_targets = []
    
    for notes in track_notes:
        for i in range(len(notes) - sequence_length):
            seq_in = notes[i : i + sequence_length]
            seq_out = notes[i + sequence_length]
            network_inputs.append([note2idx[char] for char in seq_in])
            network_targets.append(note2idx[seq_out])
            
    n_patterns = len(network_inputs)
    print(f"Total training sequence patterns: {n_patterns}")
    
    X = np.array(network_inputs, dtype=np.int32)
    y = np.array(network_targets, dtype=np.int32)
    
    processed_path = os.path.join(output_dir, "processed_data.npz")
    np.savez_compressed(processed_path, X=X, y=y)
    print(f"Saved processed dataset to {processed_path}")
    
    return X, y, vocab_info

if __name__ == "__main__":
    preprocess_dataset()
