import os
import json
import random
import numpy as np
from preprocess import preprocess_dataset
from model import NumpyMusicLSTM

def train_model(epochs=40, lr=0.005, progress_callback=None):
    print("Initializing Music LSTM Neural Network Training...")
    
    data_dir = "data"
    npz_path = os.path.join(data_dir, "processed_data.npz")
    vocab_path = os.path.join(data_dir, "vocab.json")
    
    if not (os.path.exists(npz_path) and os.path.exists(vocab_path)):
        print("Processed dataset missing. Executing dataset preprocessing...")
        preprocess_dataset()
        
    data = np.load(npz_path)
    X_data, y_data = data['X'], data['y']
    
    with open(vocab_path, "r") as f:
        vocab_info = json.load(f)
        
    vocab_size = vocab_info['vocab_size']
    sequence_length = vocab_info['sequence_length']
    
    print(f"Dataset Loaded: {len(X_data)} patterns | Vocabulary Size: {vocab_size} | Seq Len: {sequence_length}")
    
    # Instantiate Model
    model = NumpyMusicLSTM(vocab_size=vocab_size, embed_dim=64, hidden_dim=128)
    
    indices = list(range(len(X_data)))
    history = {'loss': []}
    
    for epoch in range(1, epochs + 1):
        random.shuffle(indices)
        total_loss = 0.0
        
        for idx in indices:
            seq_in = X_data[idx]
            target = y_data[idx]
            loss = model.train_step(seq_in, target, lr=lr)
            total_loss += loss
            
        epoch_loss = total_loss / max(len(X_data), 1)
        history['loss'].append(epoch_loss)
        
        if epoch % 5 == 0 or epoch == 1 or epoch == epochs:
            print(f"Epoch [{epoch}/{epochs}] - Loss: {epoch_loss:.4f}")
            
        if progress_callback:
            progress_callback(epoch, epochs, epoch_loss)
            
    # Save trained checkpoint
    save_path = os.path.join("models", "music_lstm.json")
    model.save_model(save_path)
    print(f"Training completed successfully! Saved model to {save_path}")
    return model, history

if __name__ == "__main__":
    train_model(epochs=35)
