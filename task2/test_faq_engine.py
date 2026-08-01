"""
Unit tests for FAQ Engine (preprocessing, TF-IDF vectorization, Cosine Similarity matching).
"""

import unittest
import os
import json
from faq_engine import NLPPreprocessor, FAQEngine


class TestNLPPreprocessor(unittest.TestCase):
    def setUp(self):
        self.prep = NLPPreprocessor()

    def test_clean_text(self):
        raw = "Hello! How can I apply for undergraduate admission #12345?"
        cleaned = self.prep.clean_text(raw)
        self.assertEqual(cleaned, "hello how can i apply for undergraduate admission 12345")

    def test_preprocessing_pipeline(self):
        text = "What are the general admission requirements and deadlines?"
        prep_str, tokens = self.prep.preprocess(text)
        self.assertIn("admission", tokens)
        self.assertTrue("requirements" in tokens or "requirement" in tokens)
        self.assertNotIn("what", tokens)
        self.assertNotIn("are", tokens)


class TestFAQEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_file = "data/test_faqs.json"
        test_data = {
            "university_admission": {
                "name": "University Admission Support",
                "faqs": [
                    {
                        "id": "t1",
                        "question": "What are the general admission requirements for undergraduate programs?",
                        "answer": "Undergraduate applicants must have completed high school with a minimum GPA of 3.0.",
                        "category": "General & Eligibility"
                    },
                    {
                        "id": "t2",
                        "question": "How do I apply for financial aid and scholarships?",
                        "answer": "Submit the Financial Aid Application form along with proof of income on the portal.",
                        "category": "Tuition & Scholarships"
                    }
                ]
            }
        }
        os.makedirs("data", exist_ok=True)
        with open(cls.test_file, 'w', encoding='utf-8') as f:
            json.dump(test_data, f)
            
        cls.engine = FAQEngine(data_file=cls.test_file)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(cls.test_file):
            os.remove(cls.test_file)

    def test_exact_and_paraphrased_matching(self):
        match = self.engine.find_best_match("What is required to get admission in undergrad?", topic="university_admission")
        self.assertEqual(match["status"], "matched")
        self.assertEqual(match["matched_faq"]["id"], "t1")
        self.assertGreater(match["similarity_score"], 20.0)

    def test_low_confidence_fallback(self):
        match = self.engine.find_best_match("What is quantum entanglement thermodynamics?", topic="university_admission")
        self.assertEqual(match["status"], "low_confidence")
        self.assertEqual(match["confidence"], "fallback")

    def test_add_and_delete_faq(self):
        new_entry = self.engine.add_faq("university_admission", "When do campus tours start?", "Campus tours are held every Friday at 10 AM.")
        self.assertIsNotNone(new_entry["id"])
        
        match = self.engine.find_best_match("Schedule a campus tour", topic="university_admission")
        self.assertEqual(match["matched_faq"]["id"], new_entry["id"])
        
        deleted = self.engine.delete_faq("university_admission", new_entry["id"])
        self.assertTrue(deleted)


if __name__ == '__main__':
    unittest.main()
