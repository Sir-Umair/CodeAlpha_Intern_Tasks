import os
import json
import numpy as np

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -15, 15)))

def softmax(x, temperature=1.0):
    x = x / max(temperature, 1e-5)
    e_x = np.exp(x - np.max(x))
    return e_x / np.sum(e_x, axis=-1, keepdims=True)

class NumpyMusicLSTM:
    """
    Pure NumPy implementation of a Multi-Gate LSTM Recurrent Neural Network for Music Generation.
    Guarantees 100% cross-platform compatibility without C++ DLL dependencies.
    """
    def __init__(self, vocab_size, embed_dim=64, hidden_dim=128):
        self.vocab_size = vocab_size
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim
        
        # Initialize weights (Xavier / He initialization)
        scale = np.sqrt(2.0 / (embed_dim + hidden_dim))
        
        # Embedding weights
        self.W_embed = np.random.randn(vocab_size, embed_dim) * 0.1
        
        # LSTM Stacked Weights [i, f, c, o] concatenated (shape: (4*hidden_dim, embed_dim))
        self.W_x = np.random.randn(4 * hidden_dim, embed_dim) * scale
        self.W_h = np.random.randn(4 * hidden_dim, hidden_dim) * scale
        self.b = np.zeros((4 * hidden_dim, 1))
        # Forget gate bias initialization to 1.0 (LSTM best practice)
        self.b[hidden_dim:2*hidden_dim] = 1.0
        
        # FC Output Layer weights
        self.W_out = np.random.randn(vocab_size, hidden_dim) * np.sqrt(2.0 / hidden_dim)
        self.b_out = np.zeros((vocab_size, 1))
        
        # Adam Optimizer Moment Accumulators
        self.m_W_x = np.zeros_like(self.W_x)
        self.v_W_x = np.zeros_like(self.W_x)
        self.m_W_h = np.zeros_like(self.W_h)
        self.v_W_h = np.zeros_like(self.W_h)
        self.m_b = np.zeros_like(self.b)
        self.v_b = np.zeros_like(self.b)
        self.m_W_out = np.zeros_like(self.W_out)
        self.v_W_out = np.zeros_like(self.W_out)
        self.m_embed = np.zeros_like(self.W_embed)
        self.v_embed = np.zeros_like(self.W_embed)
        self.t_step = 0

    def forward_step(self, x_idx, h_prev, c_prev):
        """
        Forward pass for a single time-step x_idx (integer token).
        """
        e = self.W_embed[x_idx:x_idx+1].T  # (embed_dim, 1)
        
        # Gates computation
        gates = np.dot(self.W_x, e) + np.dot(self.W_h, h_prev) + self.b  # (4*hidden_dim, 1)
        
        H = self.hidden_dim
        i_gate = sigmoid(gates[0:H])
        f_gate = sigmoid(gates[H:2*H])
        c_cand = np.tanh(gates[2*H:3*H])
        o_gate = sigmoid(gates[3*H:4*H])
        
        c_next = f_gate * c_prev + i_gate * c_cand
        h_next = o_gate * np.tanh(c_next)
        
        cache = (x_idx, e, h_prev, c_prev, i_gate, f_gate, c_cand, o_gate, c_next, h_next)
        return h_next, c_next, cache

    def forward(self, sequence):
        """
        Full unrolled sequence forward pass.
        Returns final output logits and caches for backpropagation through time.
        """
        h = np.zeros((self.hidden_dim, 1))
        c = np.zeros((self.hidden_dim, 1))
        caches = []
        
        for x_idx in sequence:
            h, c, cache = self.forward_step(x_idx, h, c)
            caches.append(cache)
            
        # Final prediction logits
        logits = np.dot(self.W_out, h) + self.b_out  # (vocab_size, 1)
        return logits, caches, h, c

    def train_step(self, sequence, target_idx, lr=0.005, beta1=0.9, beta2=0.999, eps=1e-8):
        """
        Executes BPTT training step with Cross-Entropy Loss & Adam Optimizer.
        """
        logits, caches, h_final, c_final = self.forward(sequence)
        probs = softmax(logits.ravel())
        
        # Loss calculation (Cross Entropy)
        loss = -np.log(max(probs[target_idx], 1e-12))
        
        # Output Gradient
        dlogits = probs.copy()
        dlogits[target_idx] -= 1.0
        dlogits = dlogits.reshape(-1, 1)  # (vocab_size, 1)
        
        # Gradients wrt W_out & b_out
        dW_out = np.dot(dlogits, h_final.T)
        db_out = dlogits
        
        # Backprop into last hidden state
        dh_next = np.dot(self.W_out.T, dlogits)
        dc_next = np.zeros((self.hidden_dim, 1))
        
        dW_x = np.zeros_like(self.W_x)
        dW_h = np.zeros_like(self.W_h)
        db = np.zeros_like(self.b)
        dW_embed = np.zeros_like(self.W_embed)
        
        H = self.hidden_dim
        
        # Backprop through time across sequence steps
        for cache in reversed(caches):
            x_idx, e, h_prev, c_prev, i_gate, f_gate, c_cand, o_gate, c_curr, h_curr = cache
            
            do = dh_next * np.tanh(c_curr)
            dc = dc_next + dh_next * o_gate * (1.0 - np.tanh(c_curr) ** 2)
            
            df = dc * c_prev
            di = dc * c_cand
            dc_cand = dc * i_gate
            
            dc_prev = dc * f_gate
            
            di_raw = di * i_gate * (1.0 - i_gate)
            df_raw = df * f_gate * (1.0 - f_gate)
            dc_cand_raw = dc_cand * (1.0 - c_cand ** 2)
            do_raw = do * o_gate * (1.0 - o_gate)
            
            dgates = np.vstack([di_raw, df_raw, dc_cand_raw, do_raw])  # (4*hidden_dim, 1)
            
            dW_x += np.dot(dgates, e.T)
            dW_h += np.dot(dgates, h_prev.T)
            db += dgates
            
            dW_embed[x_idx] += np.dot(self.W_x.T, dgates).ravel()
            
            dh_next = np.dot(self.W_h.T, dgates)
            dc_next = dc_prev

        # Gradient Clipping to prevent exploding gradients
        for g in [dW_x, dW_h, db, dW_out, db_out, dW_embed]:
            np.clip(g, -5.0, 5.0, out=g)
            
        # Adam Optimizer Update
        self.t_step += 1
        t = self.t_step
        
        for p, dp, m, v in [
            (self.W_x, dW_x, self.m_W_x, self.v_W_x),
            (self.W_h, dW_h, self.m_W_h, self.v_W_h),
            (self.b, db, self.m_b, self.v_b),
            (self.W_out, dW_out, self.m_W_out, self.v_W_out),
            (self.W_embed, dW_embed, self.m_embed, self.v_embed)
        ]:
            m[:] = beta1 * m + (1.0 - beta1) * dp
            v[:] = beta2 * v + (1.0 - beta2) * (dp ** 2)
            m_hat = m / (1.0 - beta1 ** t)
            v_hat = v / (1.0 - beta2 ** t)
            p -= lr * m_hat / (np.sqrt(v_hat) + eps)
            
        self.b_out -= lr * db_out
        return float(loss)

    def save_model(self, file_path):
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        data = {
            "vocab_size": self.vocab_size,
            "embed_dim": self.embed_dim,
            "hidden_dim": self.hidden_dim,
            "W_embed": self.W_embed.tolist(),
            "W_x": self.W_x.tolist(),
            "W_h": self.W_h.tolist(),
            "b": self.b.tolist(),
            "W_out": self.W_out.tolist(),
            "b_out": self.b_out.tolist()
        }
        with open(file_path, "w") as f:
            json.dump(data, f)
        print(f"Saved NumpyMusicLSTM model to {file_path}")

    @classmethod
    def load_model(cls, file_path):
        with open(file_path, "r") as f:
            data = json.load(f)
        model = cls(data['vocab_size'], data['embed_dim'], data['hidden_dim'])
        model.W_embed = np.array(data['W_embed'], dtype=np.float32)
        model.W_x = np.array(data['W_x'], dtype=np.float32)
        model.W_h = np.array(data['W_h'], dtype=np.float32)
        model.b = np.array(data['b'], dtype=np.float32)
        model.W_out = np.array(data['W_out'], dtype=np.float32)
        model.b_out = np.array(data['b_out'], dtype=np.float32)
        return model
