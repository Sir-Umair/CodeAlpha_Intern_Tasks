import unittest
import os
import glob
import sys

# Ensure backend path is in sys.path when running tests
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from preprocess import preprocess_dataset, parse_midi_file

class TestPreprocess(unittest.TestCase):
    def test_midi_parsing(self):
        midi_files = glob.glob("data/midi_dataset/**/*.mid", recursive=True)
        if not midi_files:
            from dataset_downloader import download_or_generate_dataset
            download_or_generate_dataset()
            midi_files = glob.glob("data/midi_dataset/**/*.mid", recursive=True)
            
        self.assertGreater(len(midi_files), 0, "Dataset MIDI files should exist")
        
        notes = parse_midi_file(midi_files[0])
        self.assertIsInstance(notes, list, "Note tokens should be returned as a list")
        self.assertGreater(len(notes), 0, "Note sequence should not be empty")

    def test_preprocess_dataset(self):
        X, y, vocab_info = preprocess_dataset(sequence_length=16)
        self.assertIsNotNone(X, "X sequences should be created")
        self.assertIsNotNone(y, "y targets should be created")
        self.assertIn('vocab_size', vocab_info, "Vocab info must contain vocab_size")
        self.assertGreater(vocab_info['vocab_size'], 0, "Vocab size must be positive")

if __name__ == '__main__':
    unittest.main()
