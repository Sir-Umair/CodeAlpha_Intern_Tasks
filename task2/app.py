"""
Flask REST API Application for University Admission FAQ Chatbot.
Provides endpoints for chat matching, topic management, FAQ CRUD operations,
and serving the frontend Web UI for University Admissions.
"""

import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from faq_engine import FAQEngine

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Initialize FAQ Engine
engine = FAQEngine(data_file="data/faqs.json")


@app.route('/')
def home():
    """Serves the main chat interface HTML."""
    return render_template('index.html')


@app.route('/api/topics', methods=['GET'])
def get_topics():
    """API endpoint to retrieve available FAQ topics."""
    topics = engine.get_topics()
    return jsonify({
        "success": True,
        "topics": topics
    })


@app.route('/api/faqs', methods=['GET'])
def get_faqs():
    """API endpoint to retrieve FAQs for a given topic."""
    topic = request.args.get('topic', 'all')
    faqs = engine.get_faqs(topic)
    return jsonify({
        "success": True,
        "topic": topic,
        "count": len(faqs),
        "faqs": faqs
    })


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main Chat API Endpoint.
    Preprocesses query using NLP, calculates TF-IDF vector & Cosine Similarity,
    and returns top matching answer and confidence metrics.
    """
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    topic = data.get('topic', 'all')
    threshold = float(data.get('threshold', 0.20))

    if not query:
        return jsonify({
            "success": False,
            "error": "Query cannot be empty."
        }), 400

    match_result = engine.find_best_match(query, topic=topic, threshold=threshold)

    return jsonify({
        "success": True,
        "result": match_result
    })


@app.route('/api/faqs', methods=['POST'])
def add_faq():
    """API endpoint to add a custom FAQ entry dynamically."""
    data = request.get_json() or {}
    topic = data.get('topic', 'university_admission').strip()
    question = data.get('question', '').strip()
    answer = data.get('answer', '').strip()
    category = data.get('category', 'General').strip()

    if not topic or not question or not answer:
        return jsonify({
            "success": False,
            "error": "Topic, question, and answer are required fields."
        }), 400

    new_faq = engine.add_faq(topic, question, answer, category)
    return jsonify({
        "success": True,
        "message": "FAQ added successfully.",
        "faq": new_faq
    }), 201


@app.route('/api/faqs/<topic>/<faq_id>', methods=['DELETE'])
def delete_faq(topic, faq_id):
    """API endpoint to delete an existing FAQ entry."""
    success = engine.delete_faq(topic, faq_id)
    if success:
        return jsonify({
            "success": True,
            "message": "FAQ deleted successfully."
        })
    else:
        return jsonify({
            "success": False,
            "error": "FAQ not found."
        }), 404


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns analytics and system statistics."""
    topics = engine.get_topics()
    total_faqs = sum(t['count'] for t in topics if t['id'] != 'all')
    return jsonify({
        "success": True,
        "domain": "University Admission Support",
        "total_topics": len(topics) - 1,
        "total_faqs": total_faqs,
        "algorithm": "TF-IDF Vectorization + Cosine Similarity",
        "nlp_library": "NLTK + Scikit-Learn"
    })


if __name__ == '__main__':
    print("Starting University Admission FAQ Chatbot Server on http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
