"""
CLI Chatbot Interface for University Admission FAQ Engine.
Allows direct terminal testing of the NLP preprocessing, TF-IDF vectorization,
and Cosine Similarity FAQ matching algorithm for University Admissions.
"""

import sys
from faq_engine import FAQEngine


def main():
    print("=" * 68)
    print(" 🎓 UNIVERSITY ADMISSION CHATBOT - CLI (NLP + Cosine Similarity)")
    print("=" * 68)
    print("Initializing NLP Preprocessor and loading admission FAQs...")
    
    engine = FAQEngine(data_file="data/faqs.json")
    topics = engine.get_topics()
    
    print("\nAvailable Knowledge Domains:")
    for idx, t in enumerate(topics):
        print(f" [{idx}] {t['name']} ({t['count']} FAQs)")
        
    print("\nCommands:")
    print(" - Type 'list' to view all admission FAQs.")
    print(" - Type 'exit' or 'quit' to terminate.\n")

    current_topic = "university_admission"
    topic_name = "University Admission Support"

    while True:
        try:
            prompt_label = f"\n[UniAdmit AI] Ask an admission question > "
            user_input = input(prompt_label).strip()

            if not user_input:
                continue

            cmd_lower = user_input.lower()

            if cmd_lower in ['exit', 'quit']:
                print("\nThank you for using UniAdmit AI. Goodbye! 🎓")
                break

            if cmd_lower == 'list':
                faqs = engine.get_faqs(current_topic)
                print(f"\n--- Questions in {topic_name} ({len(faqs)} total) ---")
                for item in faqs:
                    print(f" • [{item.get('category', 'General')}] {item.get('question')}")
                continue

            # Execute NLP & Cosine Similarity match
            res = engine.find_best_match(user_input, topic=current_topic)

            print("\n" + "-" * 50)
            print(f"🔍 NLP Preprocessed Tokens : {res['preprocessed_tokens']}")
            print(f"📊 Cosine Similarity Score : {res['similarity_score']}%")
            print(f"🏷️ Confidence Level        : {res['confidence'].upper()}")
            print("-" * 50)

            if res['status'] == 'matched':
                matched = res['matched_faq']
                print(f"\n💡 Matched Question: \"{matched['question']}\"")
                print(f"💬 Answer: {res['answer']}\n")

                if res['alternatives']:
                    print("📌 Related Questions:")
                    for alt in res['alternatives']:
                        print(f"   • {alt['question']} ({alt['similarity_score']}% match)")
            else:
                print(f"\n⚠️ Bot Response: {res['answer']}\n")
                if res['alternatives']:
                    print("📌 Did you mean one of these?")
                    for alt in res['alternatives']:
                        print(f"   • {alt['question']} ({alt['similarity_score']}% match)")

            print("-" * 50)

        except (KeyboardInterrupt, EOFError):
            print("\nExiting. Goodbye!")
            break


if __name__ == '__main__':
    main()
