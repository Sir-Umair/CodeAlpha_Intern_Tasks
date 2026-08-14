import unittest
import os
import sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from model import NumpyMusicLSTM, softmax

class TestModel(unittest.TestCase):
    def test_lstm_forward_and_train(self):
        vocab_size = 12
        seq_len = 16
        model = NumpyMusicLSTM(vocab_size=vocab_size, embed_dim=32, hidden_dim=64)
        
        # Test forward pass
        dummy_seq = list(np.random.randint(0, vocab_size, size=seq_len))
        logits, cache, h, c = model.forward(dummy_seq)
        
        self.assertEqual(logits.shape, (vocab_size, 1), "Output logits shape mismatch")
        self.assertEqual(h.shape, (64, 1), "Hidden state shape mismatch")
        
        # Test train step
        target_idx = 3
        initial_loss = model.train_step(dummy_seq, target_idx, lr=0.01)
        self.assertIsInstance(initial_loss, float, "Train step loss should be float")
        
        # Perform 5 train steps and verify loss reduction
        for _ in range(5):
            loss = model.train_step(dummy_seq, target_idx, lr=0.01)
        self.assertLessEqual(loss, initial_loss, "Model loss should decrease during training")

    def test_softmax_temperature(self):
        logits = np.array([2.0, 1.0, 0.1])
        p1 = softmax(logits, temperature=0.5)
        p2 = softmax(logits, temperature=1.5)
        
        self.assertAlmostEqual(np.sum(p1), 1.0, places=5)
        self.assertAlmostEqual(np.sum(p2), 1.0, places=5)
        self.assertGreater(p1[0], p2[0], "Lower temperature should sharpen probability peak")

if __name__ == '__main__':
    unittest.main()
