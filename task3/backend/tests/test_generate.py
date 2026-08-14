import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from generate import generate_track_file, tokens_to_midi

class TestGenerate(unittest.TestCase):
    def test_music_generation_and_export(self):
        midi_path, wav_path, tokens = generate_track_file(
            output_filename="test_generated.mid",
            num_notes=32,
            temperature=0.8
        )
        
        self.assertEqual(len(tokens), 32, "Should generate exactly requested number of note tokens")
        self.assertTrue(os.path.exists(midi_path), f"MIDI file should exist at {midi_path}")
        self.assertTrue(os.path.exists(wav_path), f"WAV file should exist at {wav_path}")
        self.assertGreater(os.path.getsize(midi_path), 0, "MIDI file should not be 0 bytes")
        self.assertGreater(os.path.getsize(wav_path), 0, "WAV file should not be 0 bytes")

if __name__ == '__main__':
    unittest.main()
