"""
FAQ Engine - NLP Preprocessing, TF-IDF Vectorization, and Cosine Similarity Matching.
Uses NLTK for tokenization, stopword removal, and lemmatization.
Uses scikit-learn for TF-IDF matrix generation and Cosine Similarity computation.
"""

import os
import json
import re
import string
import numpy as np
from typing import Dict, List, Any, Tuple, Optional

# Import NLTK with automated data downloading
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Scikit-Learn for Vectorization and Cosine Similarity
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Import NLTK safely without blocking on network downloads
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Try finding existing NLTK resources without attempting online downloads
for res, res_type in [('punkt', 'tokenizers/punkt'), ('stopwords', 'corpora/stopwords'), ('wordnet', 'corpora/wordnet')]:
    try:
        nltk.data.find(res_type)
    except LookupError:
        pass


class NLPPreprocessor:
    """Handles text cleaning, tokenization, stopword removal, and lemmatization."""

    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        
        # Load English stopwords with fallback
        try:
            self.stop_words = set(stopwords.words('english'))
        except Exception:
            self.stop_words = {
                "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
                "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
                "below", "between", "both", "but", "by", "can't", "cannot", "could", "couldn't",
                "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
                "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
                "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
                "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i",
                "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's",
                "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
                "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
                "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
                "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
                "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
                "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
                "they've", "this", "those", "through", "to", "too", "under", "until", "up",
                "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
                "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
                "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
                "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
                "yourself", "yourselves"
            }

    def clean_text(self, text: str) -> str:
        """Lowercases text and strips special punctuation characters."""
        if not text:
            return ""
        text = text.lower()
        # Remove punctuation
        text = re.sub(r'[^\w\s]', ' ', text)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def tokenize(self, text: str) -> List[str]:
        """Tokenizes text using NLTK or regex fallback."""
        try:
            return word_tokenize(text)
        except Exception:
            return text.split()

    def preprocess(self, text: str) -> Tuple[str, List[str]]:
        """
        Executes full NLP pipeline:
        1. Clean & lowercase text
        2. Tokenize into words
        3. Filter out stopwords
        4. Lemmatize remaining words
        
        Returns:
            Tuple of (preprocessed string for TF-IDF, list of clean lemmatized tokens)
        """
        cleaned = self.clean_text(text)
        tokens = self.tokenize(cleaned)
        
        filtered_tokens = []
        for word in tokens:
            if word not in self.stop_words and len(word) > 1:
                try:
                    lemmatized = self.lemmatizer.lemmatize(word)
                except Exception:
                    lemmatized = word
                filtered_tokens.append(lemmatized)
                
        # Return preprocessed string and token list
        return " ".join(filtered_tokens), filtered_tokens


class FAQEngine:
    """
    Core FAQ Engine handling dataset management, TF-IDF vector generation,
    Cosine Similarity computation, and matching queries against FAQs.
    """

    def __init__(self, data_file: str = "data/faqs.json"):
        self.data_file = data_file
        self.preprocessor = NLPPreprocessor()
        self.datasets: Dict[str, Any] = {}
        self.vectorizers: Dict[str, TfidfVectorizer] = {}
        self.tfidf_matrices: Dict[str, Any] = {}
        self.preprocessed_faqs: Dict[str, List[Dict[str, Any]]] = {}
        
        self._last_mtime = os.path.getmtime(self.data_file) if os.path.exists(self.data_file) else 0
        self.load_data()
        self.fit_all_vectorizers()

    def _check_and_reload_if_modified(self):
        """Checks if the dataset JSON file on disk was modified and reloads vectorizers automatically."""
        if os.path.exists(self.data_file):
            current_mtime = os.path.getmtime(self.data_file)
            if getattr(self, '_last_mtime', 0) != current_mtime:
                self.load_data()
                self.fit_all_vectorizers()
                self._last_mtime = current_mtime

    def load_data(self):
        """Loads FAQ dataset from JSON file."""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r', encoding='utf-8') as f:
                self.datasets = json.load(f)
            self._last_mtime = os.path.getmtime(self.data_file)
        else:
            self.datasets = {
                "general": {
                    "name": "General FAQ",
                    "faqs": []
                }
            }

    def save_data(self):
        """Saves current FAQ dataset to JSON file."""
        os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
        with open(self.data_file, 'w', encoding='utf-8') as f:
            json.dump(self.datasets, f, indent=2)

    def fit_vectorizer_for_topic(self, topic: str):
        """Preprocesses questions and fits a TF-IDF Vectorizer for a given topic."""
        faqs_to_index = []
        
        if topic == "all":
            for t_key, t_data in self.datasets.items():
                for faq in t_data.get("faqs", []):
                    faq_copy = dict(faq)
                    faq_copy["topic"] = t_key
                    faqs_to_index.append(faq_copy)
        elif topic in self.datasets:
            for faq in self.datasets[topic].get("faqs", []):
                faq_copy = dict(faq)
                faq_copy["topic"] = topic
                faqs_to_index.append(faq_copy)

        if not faqs_to_index:
            self.preprocessed_faqs[topic] = []
            self.vectorizers[topic] = None
            self.tfidf_matrices[topic] = None
            return

        corpus = []
        processed_list = []
        for faq in faqs_to_index:
            prep_str, prep_tokens = self.preprocessor.preprocess(faq["question"])
            # Fallback to original cleaned string if tokens are empty
            if not prep_str.strip():
                prep_str = self.preprocessor.clean_text(faq["question"])
                prep_tokens = prep_str.split()
                
            corpus.append(prep_str)
            faq_entry = dict(faq)
            faq_entry["prep_question"] = prep_str
            faq_entry["tokens"] = prep_tokens
            processed_list.append(faq_entry)

        self.preprocessed_faqs[topic] = processed_list
        
        # Fit TF-IDF Vectorizer with unigrams and bigrams
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            token_pattern=r'(?u)\b\w+\b',
            sublinear_tf=True
        )
        try:
            matrix = vectorizer.fit_transform(corpus)
            self.vectorizers[topic] = vectorizer
            self.tfidf_matrices[topic] = matrix
        except ValueError:
            # Handle edge case where corpus has no valid features
            self.vectorizers[topic] = None
            self.tfidf_matrices[topic] = None

    def fit_all_vectorizers(self):
        """Fits vectorizers for each individual topic and a combined 'all' topic."""
        for topic in self.datasets:
            self.fit_vectorizer_for_topic(topic)
        self.fit_vectorizer_for_topic("all")

    def find_best_match(
        self,
        query: str,
        topic: str = "all",
        threshold: float = 0.20
    ) -> Dict[str, Any]:
        """
        Matches user query against indexed FAQs using Cosine Similarity.
        
        Args:
            query: User's question string.
            topic: Domain topic ("all" or specific topic key).
            threshold: Minimum cosine similarity score required for positive match.
            
        Returns:
            Dict containing match status, best answer, score %, preprocessed tokens,
            confidence rating, and alternative question recommendations.
        """
        self._check_and_reload_if_modified()
        if topic not in self.preprocessed_faqs or not self.preprocessed_faqs[topic]:
            topic = "all"
            
        faqs = self.preprocessed_faqs.get(topic, [])
        vectorizer = self.vectorizers.get(topic)
        tfidf_matrix = self.tfidf_matrices.get(topic)

        # Preprocess input query
        raw_query = query
        prep_query_str, prep_query_tokens = self.preprocessor.preprocess(query)
        if not prep_query_str.strip():
            prep_query_str = self.preprocessor.clean_text(query)
            prep_query_tokens = prep_query_str.split()

        if not faqs or vectorizer is None or tfidf_matrix is None or not prep_query_tokens:
            return {
                "status": "no_faqs",
                "query": raw_query,
                "preprocessed_tokens": prep_query_tokens,
                "answer": "No FAQs are available in this category yet.",
                "similarity_score": 0.0,
                "confidence": "none",
                "matched_faq": None,
                "alternatives": []
            }

        # Vectorize input query
        query_vec = vectorizer.transform([prep_query_str])

        # Calculate Cosine Similarity
        cosine_sims = cosine_similarity(query_vec, tfidf_matrix).flatten()

        # Sort similarity scores in descending order
        sorted_indices = np.argsort(cosine_sims)[::-1]
        best_index = sorted_indices[0]
        best_score = float(cosine_sims[best_index])
        best_faq = faqs[best_index]

        # Calculate keyword overlap score to boost exact phrasing match
        query_set = set(prep_query_tokens)
        target_set = set(best_faq.get("tokens", []))
        jaccard_sim = len(query_set & target_set) / max(len(query_set | target_set), 1)
        
        # Combined score calculation (80% Cosine Sim + 20% Jaccard Overlap)
        final_score = round(float((best_score * 0.85) + (jaccard_sim * 0.15)), 4)
        match_percentage = round(final_score * 100, 1)

        # Collect top alternative matches for recommendations
        alternatives = []
        for idx in sorted_indices[1:4]:
            alt_score = float(cosine_sims[idx])
            if alt_score > 0.05:
                alt_faq = faqs[idx]
                alternatives.append({
                    "id": alt_faq.get("id"),
                    "question": alt_faq.get("question"),
                    "answer": alt_faq.get("answer"),
                    "category": alt_faq.get("category"),
                    "similarity_score": round(alt_score * 100, 1)
                })

        # Determine confidence level
        if final_score >= 0.70:
            confidence = "high"
        elif final_score >= 0.40:
            confidence = "medium"
        elif final_score >= threshold:
            confidence = "low"
        else:
            confidence = "fallback"

        # Check if match meets similarity threshold
        if final_score >= threshold:
            return {
                "status": "matched",
                "query": raw_query,
                "preprocessed_tokens": prep_query_tokens,
                "matched_faq": {
                    "id": best_faq.get("id"),
                    "question": best_faq.get("question"),
                    "answer": best_faq.get("answer"),
                    "category": best_faq.get("category"),
                    "topic": best_faq.get("topic")
                },
                "answer": best_faq.get("answer"),
                "similarity_score": match_percentage,
                "confidence": confidence,
                "alternatives": alternatives
            }
        else:
            # Low similarity score fallback
            fallback_answer = (
                "I'm sorry, I couldn't find an exact match for your question. "
                "Below are some closely related questions that might help:"
            )
            
            # Combine current top result and alternatives into suggestions
            suggestions = []
            if best_faq:
                suggestions.append({
                    "id": best_faq.get("id"),
                    "question": best_faq.get("question"),
                    "answer": best_faq.get("answer"),
                    "similarity_score": match_percentage
                })
            suggestions.extend(alternatives[:2])

            return {
                "status": "low_confidence",
                "query": raw_query,
                "preprocessed_tokens": prep_query_tokens,
                "matched_faq": None,
                "answer": fallback_answer,
                "similarity_score": match_percentage,
                "confidence": "fallback",
                "alternatives": suggestions
            }

    def get_topics(self) -> List[Dict[str, Any]]:
        """Returns list of topics with FAQ counts."""
        self._check_and_reload_if_modified()
        result = []
        total_faqs = 0
        for topic_id, topic_info in self.datasets.items():
            count = len(topic_info.get("faqs", []))
            total_faqs += count
            result.append({
                "id": topic_id,
                "name": topic_info.get("name", topic_id),
                "count": count
            })
        
        result.insert(0, {
            "id": "all",
            "name": "All Topics (Combined)",
            "count": total_faqs
        })
        return result

    def get_faqs(self, topic: str = "all") -> List[Dict[str, Any]]:
        """Returns list of all FAQs for a given topic."""
        self._check_and_reload_if_modified()
        if topic == "all":
            all_list = []
            for t_id, t_info in self.datasets.items():
                for item in t_info.get("faqs", []):
                    entry = dict(item)
                    entry["topic_id"] = t_id
                    entry["topic_name"] = t_info.get("name")
                    all_list.append(entry)
            return all_list
        elif topic in self.datasets:
            topic_name = self.datasets[topic].get("name")
            res = []
            for item in self.datasets[topic].get("faqs", []):
                entry = dict(item)
                entry["topic_id"] = topic
                entry["topic_name"] = topic_name
                res.append(entry)
            return res
        return []

    def add_faq(self, topic: str, question: str, answer: str, category: str = "General") -> Dict[str, Any]:
        """Adds a new FAQ item and re-fits vectorizers."""
        if topic not in self.datasets:
            self.datasets[topic] = {
                "name": topic.replace("_", " ").title(),
                "faqs": []
            }
            
        faq_id = f"{topic}_{len(self.datasets[topic]['faqs']) + 1}_{int(hash(question) % 10000)}"
        new_faq = {
            "id": faq_id,
            "question": question.strip(),
            "answer": answer.strip(),
            "category": category.strip() if category else "General"
        }
        
        self.datasets[topic]["faqs"].append(new_faq)
        self.save_data()
        self.fit_all_vectorizers()
        return new_faq

    def delete_faq(self, topic: str, faq_id: str) -> bool:
        """Deletes an FAQ item by ID and re-fits vectorizers."""
        if topic not in self.datasets:
            return False
            
        initial_len = len(self.datasets[topic]["faqs"])
        self.datasets[topic]["faqs"] = [
            f for f in self.datasets[topic]["faqs"] if f.get("id") != faq_id
        ]
        
        if len(self.datasets[topic]["faqs"]) < initial_len:
            self.save_data()
            self.fit_all_vectorizers()
            return True
        return False
