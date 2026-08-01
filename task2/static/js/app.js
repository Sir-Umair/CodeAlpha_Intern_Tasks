/**
 * FAQ Chatbot Frontend JavaScript Application.
 * Handles real-time chat interactions, REST API requests, NLP inspection visualizer,
 * knowledge base browsing, custom interactive range slider, and animation types.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const topicList = document.getElementById('topic-list');
    const activeTopicName = document.getElementById('active-topic-name');
    const statFaqs = document.getElementById('stat-faqs');
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdVal = document.getElementById('threshold-val');
    const sliderTrackFill = document.getElementById('slider-track-fill');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const animationTypeSelect = document.getElementById('animation-type-select');
    const nlpToggle = document.getElementById('nlp-toggle');
    const suggestionChips = document.getElementById('suggestion-chips');
    const clearChatBtn = document.getElementById('clear-chat-btn');

    // Sidebar Mobile Controls
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    // Modal Elements
    const kbModal = document.getElementById('kb-modal');
    const openKbBtn = document.getElementById('open-kb-btn');
    const closeKbModal = document.getElementById('close-kb-modal');
    const kbFaqList = document.getElementById('kb-faq-list');
    const kbSearch = document.getElementById('kb-search');
    const kbTopicFilter = document.getElementById('kb-topic-filter');

    const addFaqModal = document.getElementById('add-faq-modal');
    const openAddFaqBtn = document.getElementById('open-add-faq-btn');
    const closeAddModal = document.getElementById('close-add-modal');
    const cancelAddModal = document.getElementById('cancel-add-modal');
    const addFaqForm = document.getElementById('add-faq-form');

    // State Variables
    let currentTopic = 'university_admission';
    let topicsData = [];
    let currentFaqs = [];
    let isNlpInspectorEnabled = true;
    let thresholdValue = 0.20;
    let animationType = 'typewriter';

    // Default Quick Prompt Suggestions for GCUF Admissions
    const topicSuggestions = {
        'all': [
            "How can I apply for admission to GCUF?",
            "What is the admission processing fee at GCUF?",
            "How is merit calculated for undergraduate admissions at GCUF?",
            "Is an entry test compulsory for all programs at GCUF?",
            "What is the difference between Morning and Replica programs at GCUF?",
            "Is there an age limit for GCUF admission?",
            "How do I get my admission test voucher for GCUF?",
            "What documents are usually required at the time of admission?"
        ],
        'university_admission': [
            "How can I apply for admission to GCUF?",
            "What is the admission processing fee at GCUF?",
            "How is merit calculated for undergraduate admissions at GCUF?",
            "Is an entry test compulsory for all programs at GCUF?",
            "What is the difference between Morning and Replica programs at GCUF?",
            "Is there an age limit for GCUF admission?",
            "What if I have not appeared in HEC USAT?",
            "How do I get my admission test voucher for GCUF?",
            "Are scholarships available at GCUF?",
            "Where can I get help if I have a problem with the application or test?"
        ]
    };

    // --- 1. INITIALIZATION & DATA FETCHING ---
    init();

    async function init() {
        updateSliderFill(thresholdSlider.value);
        await fetchTopics();
        await fetchStats();
        renderQuickSuggestions();
        setupEventListeners();
    }

    async function fetchTopics() {
        try {
            const res = await fetch('/api/topics');
            const data = await res.json();
            if (data.success) {
                topicsData = data.topics;
                const found = topicsData.find(t => t.id === 'university_admission');
                if (found) {
                    currentTopic = 'university_admission';
                } else if (topicsData.length > 0) {
                    currentTopic = topicsData[0].id;
                }
                renderTopicsList();
                populateKbTopicFilter();
            }
        } catch (err) {
            console.error('Error fetching topics:', err);
        }
    }

    async function fetchStats() {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.success) {
                statFaqs.textContent = data.total_faqs;
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    }

    // --- 2. RENDER UI COMPONENTS ---
    function renderTopicsList() {
        topicList.innerHTML = '';
        topicsData.forEach(t => {
            if (t.id === 'all' && topicsData.length <= 2) return;
            const btn = document.createElement('button');
            btn.className = `topic-btn ${t.id === currentTopic ? 'active' : ''}`;
            btn.dataset.topic = t.id;
            
            let iconClass = 'fa-university';
            if (t.id === 'university_admission') iconClass = 'fa-graduation-cap';

            btn.innerHTML = `
                <i class="fa-solid ${iconClass}"></i>
                <span>${t.name}</span>
                <span class="topic-count">${t.count}</span>
            `;

            btn.addEventListener('click', () => selectTopic(t.id, t.name));
            topicList.appendChild(btn);
        });
    }

    function selectTopic(topicId, topicName) {
        currentTopic = topicId;
        activeTopicName.textContent = topicName || 'University Admission Support';
        
        document.querySelectorAll('.topic-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.topic === topicId);
        });

        closeSidebarHandler();
        renderQuickSuggestions();
    }

    function renderQuickSuggestions() {
        suggestionChips.innerHTML = '';
        const suggestions = topicSuggestions[currentTopic] || topicSuggestions['all'];
        
        suggestions.forEach(q => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = q;
            chip.addEventListener('click', () => {
                userInput.value = q;
                handleChatSubmit();
            });
            suggestionChips.appendChild(chip);
        });
    }

    // --- 3. CHAT INTERACTION LOGIC ---
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleChatSubmit();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmit();
        }
    });

    async function handleChatSubmit() {
        const queryText = userInput.value.trim();
        if (!queryText) return;

        appendUserMessage(queryText);
        userInput.value = '';
        userInput.style.height = 'auto';

        const typingId = appendTypingIndicator();

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: queryText,
                    topic: currentTopic,
                    threshold: thresholdValue
                })
            });

            const data = await res.json();
            removeMessage(typingId);

            if (data.success) {
                appendBotResponse(data.result);
            } else {
                appendErrorMessage(data.error || 'Failed to process match.');
            }

        } catch (err) {
            removeMessage(typingId);
            appendErrorMessage('Network error communicating with NLP engine.');
            console.error('Chat API Error:', err);
        }
    }

    function appendUserMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper user-wrapper anim-${animationType}`;
        wrapper.innerHTML = `
            <div class="avatar user-avatar"><i class="fa-solid fa-user-graduate"></i></div>
            <div class="message-content">
                <div class="message-bubble user-bubble">${escapeHtml(text)}</div>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    function appendTypingIndicator() {
        const id = 'typing-' + Date.now();
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot-wrapper anim-fade_slide';
        wrapper.id = id;
        wrapper.innerHTML = `
            <div class="avatar bot-avatar"><i class="fa-solid fa-graduation-cap"></i></div>
            <div class="message-content">
                <div class="message-bubble bot-bubble">
                    <i class="fa-solid fa-circle-notch fa-spin"></i> Analyzing admission requirements & matching FAQs...
                </div>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
        return id;
    }

    function removeMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function appendBotResponse(result) {
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper bot-wrapper anim-${animationType}`;

        const confClass = `confidence-${result.confidence}`;
        const confLabel = result.confidence.toUpperCase();
        
        let nlpSection = '';
        if (isNlpInspectorEnabled && result.preprocessed_tokens) {
            const tokenChips = result.preprocessed_tokens.map(t => `<span class="token-chip">${t}</span>`).join('');
            nlpSection = `
                <div class="nlp-inspector-box">
                    <div class="inspector-title">
                        <i class="fa-solid fa-code"></i> NLP Preprocessed Tokens (${result.preprocessed_tokens.length}):
                    </div>
                    <div class="token-list">${tokenChips || '<em>None</em>'}</div>
                </div>
            `;
        }

        let alternativesSection = '';
        if (result.alternatives && result.alternatives.length > 0) {
            const titleText = result.status === 'matched' ? '📌 Related Admission FAQs:' : '📌 Did you mean one of these questions?';
            const altBtns = result.alternatives.map(alt => `
                <button class="related-chip-btn" data-question="${escapeHtml(alt.question)}">
                    <span><i class="fa-solid fa-circle-question"></i> ${escapeHtml(alt.question)}</span>
                    <span class="score-pill">${alt.similarity_score}%</span>
                </button>
            `).join('');

            alternativesSection = `
                <div class="related-box">
                    <span class="related-title">${titleText}</span>
                    ${altBtns}
                </div>
            `;
        }

        const matchedTitle = result.matched_faq ? `
            <div class="matched-question-title">
                <i class="fa-solid fa-bullseye"></i> Matched FAQ: "${escapeHtml(result.matched_faq.question)}"
            </div>
        ` : '';

        // Handle Typewriter vs standard static answer rendering
        const answerHtml = (animationType === 'typewriter') 
            ? `<div class="answer-body" id="typewriter-body-${Date.now()}"><span class="typing-cursor"></span></div>`
            : `<div class="answer-body">${escapeHtml(result.answer)}</div>`;

        wrapper.innerHTML = `
            <div class="avatar bot-avatar"><i class="fa-solid fa-graduation-cap"></i></div>
            <div class="message-content">
                <div class="message-bubble bot-bubble">
                    <div class="response-card">
                        <div class="card-header-bar">
                            <span class="badge-confidence ${confClass}">${confLabel} MATCH</span>
                            <span class="score-pill"><i class="fa-solid fa-chart-simple"></i> ${result.similarity_score}% Match</span>
                        </div>
                        
                        ${matchedTitle}
                        ${answerHtml}
                        ${nlpSection}
                        ${alternativesSection}
                    </div>
                </div>
            </div>
        `;

        chatMessages.appendChild(wrapper);

        // Execute Typewriter effect if typewriter mode selected
        if (animationType === 'typewriter') {
            const bodyEl = wrapper.querySelector('.answer-body');
            typewriterText(bodyEl, result.answer);
        }

        wrapper.querySelectorAll('.related-chip-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                userInput.value = btn.dataset.question;
                handleChatSubmit();
            });
        });

        scrollToBottom();
    }

    function typewriterText(element, text) {
        if (!element) return;
        element.innerHTML = '<span class="typing-cursor"></span>';
        const words = text.split(' ');
        let idx = 0;

        const interval = setInterval(() => {
            if (idx < words.length) {
                const currentText = words.slice(0, idx + 1).join(' ');
                element.innerHTML = `${escapeHtml(currentText)} <span class="typing-cursor"></span>`;
                idx++;
                scrollToBottom();
            } else {
                clearInterval(interval);
                element.innerHTML = escapeHtml(text);
            }
        }, 35);
    }

    function appendErrorMessage(msg) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper bot-wrapper anim-bounce';
        wrapper.innerHTML = `
            <div class="avatar bot-avatar" style="background:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="message-content">
                <div class="message-bubble bot-bubble" style="border-color:#ef4444;">
                    ${escapeHtml(msg)}
                </div>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- 4. CONTROLS & EVENT LISTENERS ---
    function setupEventListeners() {
        // Sidebar drawer toggles
        if (sidebarToggleBtn) sidebarToggleBtn.addEventListener('click', openSidebarHandler);
        if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeSidebarHandler);
        if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarHandler);

        // Custom Slider Input Event
        thresholdSlider.addEventListener('input', (e) => {
            const val = e.target.value;
            setSliderValue(val);
        });

        // Preset Buttons Click Events
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const val = btn.dataset.val;
                thresholdSlider.value = val;
                setSliderValue(val);
            });
        });

        // Animation Mode Dropdown
        if (animationTypeSelect) {
            animationTypeSelect.addEventListener('change', (e) => {
                animationType = e.target.value;
            });
        }

        // NLP Toggle
        nlpToggle.addEventListener('change', (e) => {
            isNlpInspectorEnabled = e.target.checked;
        });

        // Clear Chat
        clearChatBtn.addEventListener('click', () => {
            chatMessages.innerHTML = `
                <div class="message-wrapper bot-wrapper anim-${animationType}">
                    <div class="avatar bot-avatar"><i class="fa-solid fa-graduation-cap"></i></div>
                    <div class="message-content">
                        <div class="message-bubble bot-bubble">
                            <div class="welcome-card">
                                <h3>Conversation Cleared</h3>
                                <p>Ask any question about university admissions, eligibility, tuition, or deadlines.</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Modal Handlers
        openKbBtn.addEventListener('click', () => {
            closeSidebarHandler();
            openKbModalHandler();
        });
        closeKbModal.addEventListener('click', () => kbModal.classList.remove('active'));

        openAddFaqBtn.addEventListener('click', () => {
            closeSidebarHandler();
            addFaqModal.classList.add('active');
        });
        closeAddModal.addEventListener('click', () => addFaqModal.classList.remove('active'));
        cancelAddModal.addEventListener('click', () => addFaqModal.classList.remove('active'));

        // KB Filter / Search
        kbSearch.addEventListener('input', filterKbList);
        kbTopicFilter.addEventListener('change', loadKbFaqs);

        // Add FAQ Form Submit
        addFaqForm.addEventListener('submit', handleAddFaqSubmit);
    }

    function setSliderValue(val) {
        thresholdValue = parseFloat(val) / 100.0;
        thresholdVal.textContent = `${val}%`;
        
        // Trigger badge pop animation
        thresholdVal.classList.remove('pop-anim');
        void thresholdVal.offsetWidth; // trigger reflow
        thresholdVal.classList.add('pop-anim');

        updateSliderFill(val);
        updateActivePreset(val);
    }

    function updateSliderFill(val) {
        if (!sliderTrackFill) return;
        const min = thresholdSlider.min || 5;
        const max = thresholdSlider.max || 80;
        const percentage = ((val - min) / (max - min)) * 100;
        sliderTrackFill.style.width = `${percentage}%`;
    }

    function updateActivePreset(val) {
        presetBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.val === String(val));
        });
    }

    function openSidebarHandler() {
        if (sidebar) sidebar.classList.add('open');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    }

    function closeSidebarHandler() {
        if (sidebar) sidebar.classList.remove('open');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }

    // --- 5. KNOWLEDGE BASE BROWSER & MODAL LOGIC ---
    async function openKbModalHandler() {
        kbModal.classList.add('active');
        await loadKbFaqs();
    }

    function populateKbTopicFilter() {
        kbTopicFilter.innerHTML = '';
        topicsData.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            kbTopicFilter.appendChild(opt);
        });
    }

    async function loadKbFaqs() {
        const topic = kbTopicFilter.value || currentTopic;
        try {
            const res = await fetch(`/api/faqs?topic=${topic}`);
            const data = await res.json();
            if (data.success) {
                currentFaqs = data.faqs;
                renderKbList(currentFaqs);
            }
        } catch (err) {
            console.error('Error loading KB FAQs:', err);
        }
    }

    function renderKbList(faqs) {
        kbFaqList.innerHTML = '';
        if (faqs.length === 0) {
            kbFaqList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No FAQs found.</div>';
            return;
        }

        faqs.forEach(item => {
            const card = document.createElement('div');
            card.className = 'kb-item';
            card.innerHTML = `
                <div class="kb-item-header">
                    <span class="kb-category">${escapeHtml(item.topic_name || item.topic_id)} • ${escapeHtml(item.category || 'General')}</span>
                    <button class="icon-btn btn-delete-faq" data-topic="${item.topic_id}" data-id="${item.id}" title="Delete FAQ">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
                <div class="kb-question">${escapeHtml(item.question)}</div>
                <div class="kb-answer">${escapeHtml(item.answer)}</div>
            `;

            card.querySelector('.btn-delete-faq').addEventListener('click', (e) => {
                const topic = e.currentTarget.dataset.topic;
                const id = e.currentTarget.dataset.id;
                deleteFaq(topic, id);
            });

            kbFaqList.appendChild(card);
        });
    }

    function filterKbList() {
        const term = kbSearch.value.toLowerCase().trim();
        if (!term) {
            renderKbList(currentFaqs);
            return;
        }

        const filtered = currentFaqs.filter(f => 
            f.question.toLowerCase().includes(term) ||
            f.answer.toLowerCase().includes(term) ||
            (f.category && f.category.toLowerCase().includes(term))
        );
        renderKbList(filtered);
    }

    async function deleteFaq(topic, faqId) {
        if (!confirm('Are you sure you want to delete this FAQ entry?')) return;

        try {
            const res = await fetch(`/api/faqs/${topic}/${faqId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await loadKbFaqs();
                await fetchTopics();
                await fetchStats();
            } else {
                alert(data.error || 'Failed to delete FAQ.');
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    }

    async function handleAddFaqSubmit(e) {
        e.preventDefault();
        const topic = document.getElementById('add-faq-topic').value;
        const category = document.getElementById('add-faq-category').value;
        const question = document.getElementById('add-faq-question').value;
        const answer = document.getElementById('add-faq-answer').value;

        try {
            const res = await fetch('/api/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic, category, question, answer })
            });

            const data = await res.json();
            if (data.success) {
                addFaqModal.classList.remove('active');
                addFaqForm.reset();
                await fetchTopics();
                await fetchStats();
                alert('✅ FAQ added successfully! Vectorizers re-fitted.');
            } else {
                alert(data.error || 'Failed to add FAQ.');
            }
        } catch (err) {
            console.error('Add FAQ Error:', err);
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
