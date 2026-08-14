import os
import mido
from mido import Message, MidiFile, MidiTrack

def create_sample_midi(file_path, note_sequence, bpm=120, channel=0):
    """
    Creates a programmatic MIDI file from a list of (pitch, duration_ticks, velocity) tuples.
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    mid = MidiFile(ticks_per_beat=480)
    track = MidiTrack()
    mid.tracks.append(track)
    
    # Set tempo (microsecond per beat)
    tempo = mido.bpm2tempo(bpm)
    track.append(mido.MetaMessage('set_tempo', tempo=tempo, time=0))
    track.append(mido.MetaMessage('track_name', name='Sample Track', time=0))
    
    for pitch, duration, velocity in note_sequence:
        if pitch is None or pitch == 'rest':
            # Rest event
            track.append(Message('note_off', note=60, velocity=0, time=duration, channel=channel))
        elif isinstance(pitch, list) or isinstance(pitch, tuple):
            # Chord event
            for p in pitch:
                track.append(Message('note_on', note=p, velocity=velocity, time=0, channel=channel))
            # Note off for chord after duration
            for idx, p in enumerate(pitch):
                t = duration if idx == 0 else 0
                track.append(Message('note_off', note=p, velocity=0, time=t, channel=channel))
        else:
            # Single note event
            track.append(Message('note_on', note=pitch, velocity=velocity, time=0, channel=channel))
            track.append(Message('note_off', note=pitch, velocity=0, time=duration, channel=channel))
            
    mid.save(file_path)
    print(f"Generated MIDI: {file_path}")

def generate_classical_samples():
    classical_dir = os.path.join("data", "midi_dataset", "classical")
    
    # Bach C-Major Prelude snippet pattern
    bach_pattern = [
        (48, 240, 80), (52, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85),
        (48, 240, 80), (52, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85),
        (48, 240, 80), (50, 240, 85), (57, 240, 85), (62, 240, 90), (65, 240, 85), (57, 240, 85), (62, 240, 90), (65, 240, 85),
        (47, 240, 80), (50, 240, 85), (55, 240, 85), (62, 240, 90), (65, 240, 85), (55, 240, 85), (62, 240, 90), (65, 240, 85),
        (48, 240, 80), (52, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85), (55, 240, 85), (60, 240, 90), (64, 240, 85),
    ]
    create_sample_midi(os.path.join(classical_dir, "bach_prelude_c.mid"), bach_pattern, bpm=100)
    
    # Beethoven Fur Elise snippet pattern
    beethoven_pattern = [
        (76, 240, 90), (75, 240, 90), (76, 240, 90), (75, 240, 90), (76, 240, 90), (71, 240, 85), (74, 240, 85), (72, 240, 85), (69, 480, 95),
        (60, 240, 75), (64, 240, 80), (69, 240, 85), (71, 480, 90),
        (64, 240, 75), (68, 240, 80), (71, 240, 85), (72, 480, 90),
        (64, 240, 75), (76, 240, 90), (75, 240, 90), (76, 240, 90), (75, 240, 90), (76, 240, 90), (71, 240, 85), (74, 240, 85), (72, 240, 85), (69, 480, 95)
    ]
    create_sample_midi(os.path.join(classical_dir, "beethoven_fur_elise.mid"), beethoven_pattern, bpm=130)

    # Mozart Minuet / Sonatina snippet
    mozart_pattern = [
        ([60, 64, 67], 480, 85), (67, 240, 80), (69, 240, 80), (67, 240, 80), (65, 240, 80),
        ([64, 67, 72], 480, 90), (64, 240, 80), (65, 240, 80), (64, 240, 80), (62, 240, 80),
        ([60, 64, 67], 480, 85), (62, 240, 85), (64, 240, 85), (65, 240, 85), (67, 240, 85), (72, 480, 95)
    ]
    create_sample_midi(os.path.join(classical_dir, "mozart_sonata.mid"), mozart_pattern, bpm=110)

def generate_jazz_samples():
    jazz_dir = os.path.join("data", "midi_dataset", "jazz")
    
    # ii-V-I Jazz Progression in C Major
    jazz_ii_v_i = [
        ([50, 53, 57, 60], 480, 80),  # Dm7
        (62, 240, 85), (65, 240, 85),
        ([55, 59, 62, 65], 480, 85),  # G7
        (67, 240, 90), (64, 240, 85),
        ([48, 52, 55, 59], 480, 85),  # Cmaj7
        (60, 240, 80), (62, 240, 80),
        ([45, 49, 52, 55], 480, 80),  # A7
        (57, 240, 85), (59, 240, 85)
    ]
    create_sample_midi(os.path.join(jazz_dir, "jazz_ii_v_i_progression.mid"), jazz_ii_v_i, bpm=120)
    
    # Jazz Blues Swing Pattern
    jazz_swing = [
        ([48, 60, 64, 67, 70], 360, 90), (72, 120, 75),  # C7
        ([48, 60, 64, 67, 70], 360, 90), (70, 120, 75),
        ([53, 57, 60, 63, 65], 360, 90), (69, 120, 75),  # F7
        ([48, 60, 64, 67, 70], 360, 90), (72, 120, 75),  # C7
        ([55, 59, 62, 65, 69], 360, 95), (71, 120, 80),  # G7
        ([53, 57, 60, 63, 65], 360, 90), (67, 120, 75),  # F7
        ([48, 60, 64, 67, 70], 480, 95)
    ]
    create_sample_midi(os.path.join(jazz_dir, "jazz_blues_swing.mid"), jazz_swing, bpm=135)

def download_or_generate_dataset():
    print("Initializing MIDI Music Dataset...")
    generate_classical_samples()
    generate_jazz_samples()
    print("Dataset setup complete! Samples ready in data/midi_dataset/")

if __name__ == "__main__":
    download_or_generate_dataset()
