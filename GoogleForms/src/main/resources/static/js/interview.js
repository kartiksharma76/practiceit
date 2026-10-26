/**
 * KARTIK ENTERPRISE TECHNICAL EVALUATION & ASSESSMENT SUITE 2026
 * Interactive Cockpit Controller matching Pixel-Perfect Modern Purple UI
 */

document.addEventListener('DOMContentLoaded', () => {
    // Platform State
    let currentTrack = 'java-mastery';
    let currentSubtopic = 'all';
    let currentDifficulty = 'all';
    let searchQuery = '';
    let examMode = false; // false = Practice Mode, true = Exam Mode
    let viewMode = 'focus'; // 'focus' (1-at-a-time) or 'list' (20-per-page)
    let focusIndex = 0; // index in filtered questions array
    let userAnswers = {}; // qId -> selectedOptionKey
    try {
        const savedAns = localStorage.getItem('kte_user_answers_v3');
        if (savedAns) userAnswers = JSON.parse(savedAns);
    } catch (e) {}

    let userBookmarks = new Set();
    try {
        const savedBm = localStorage.getItem('kte_user_bookmarks_v3');
        if (savedBm) userBookmarks = new Set(JSON.parse(savedBm));
    } catch (e) {}
    let examSubmitted = false;
    let timerInterval = null;
    let timeRemainingSeconds = 10776; // 02:59:36
    let isTimerPaused = false;
    let currentPage = 1;
    const pageSize = 20;
    let subtopicsExpanded = false;
    let audioEnabled = true;
    let proctorInfractions = 0;

    // DOM Elements - Header & Brand
    const navDashboard = document.getElementById('navDashboard');
    const navAnalytics = document.getElementById('navAnalytics');
    const practiceModeBtn = document.getElementById('practiceModeBtn');
    const examModeBtn = document.getElementById('examModeBtn');
    const btnToggleAudio = document.getElementById('btnToggleAudio');
    const audioIcon = document.getElementById('audioIcon');
    const btnNavHistory = document.getElementById('btnNavHistory');

    // DOM Elements - Left Sidebar
    const leftSidebarTrackTitle = document.getElementById('leftSidebarTrackTitle');
    const sidebarSubtopicsList = document.getElementById('sidebarSubtopicsList');
    const btnShowMoreSubtopics = document.getElementById('btnShowMoreSubtopics');

    // DOM Elements - Center Arena
    const activeTrackTitleBreadcrumb = document.getElementById('activeTrackTitleBreadcrumb');
    const activeSubtopicBreadcrumb = document.getElementById('activeSubtopicBreadcrumb');
    const questionsContainer = document.getElementById('questionsContainer');
    const paginationBarEl = document.getElementById('paginationBar');
    const headerQuestionCounter = document.getElementById('headerQuestionCounter');
    const dockProgressFill = document.getElementById('dockProgressFill');
    const dockProgressTxt = document.getElementById('dockProgressTxt');
    const topBtnPrev = document.getElementById('topBtnPrev');
    const topBtnNext = document.getElementById('topBtnNext');

    // DOM Elements - Right Sidebar Cockpit
    const timerCockpitTitle = document.getElementById('timerCockpitTitle');
    const timerStatusBadge = document.getElementById('timerStatusBadge');
    const timerDisplay = document.getElementById('timerDisplay');
    const btnCockpitPause = document.getElementById('btnCockpitPause');
    const cockpitPauseIcon = document.getElementById('cockpitPauseIcon');
    const cockpitPauseText = document.getElementById('cockpitPauseText');
    const btnCockpitEnd = document.getElementById('btnCockpitEnd');
    const cockpitEndText = document.getElementById('cockpitEndText');
    const paletteGrid = document.getElementById('paletteGrid');
    const statAttempted = document.getElementById('statAttempted');
    const statCorrect = document.getElementById('statCorrect');
    const statWrong = document.getElementById('statWrong');
    const statAccuracy = document.getElementById('statAccuracy');
    const radialAccuracyProgress = document.getElementById('radialAccuracyProgress');
    const radialAccuracyTxt = document.getElementById('radialAccuracyTxt');
    const sidebarTrackList = document.getElementById('sidebarTrackList');

    // DOM Elements - Modals
    const resultModal = document.getElementById('resultModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const reviewExamBtn = document.getElementById('reviewExamBtn');
    const retakeExamBtn = document.getElementById('retakeExamBtn');
    const historyModal = document.getElementById('historyModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    // =========================================================================
    // 1. WEB AUDIO API SYNTHESIZER
    // =========================================================================
    let audioCtx = null;
    function getAudioContext() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playTone(freq, duration, type = 'sine', gainVal = 0.08) {
        if (!audioEnabled) return;
        try {
            const ctx = getAudioContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio synthesis restricted:', e);
        }
    }

    function playOptionSound() { playTone(540, 0.05, 'triangle', 0.07); }
    function playCorrectSound() {
        playTone(650, 0.07, 'sine', 0.09);
        setTimeout(() => playTone(980, 0.12, 'triangle', 0.1), 70);
    }
    function playWrongSound() {
        playTone(320, 0.09, 'sawtooth', 0.08);
        setTimeout(() => playTone(240, 0.15, 'sawtooth', 0.09), 80);
    }
    function playNavigateSound() { playTone(440, 0.04, 'sine', 0.05); }
    window.playTone = playTone;

    // =========================================================================
    // 2. TOAST NOTIFICATION UTILITY
    // =========================================================================
    function showToast(message, type = 'info', icon = '💡') {
        const toastContainer = document.getElementById('appToastContainer');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `app-toast ${type}`;
        toast.innerHTML = `
            <span style="font-size: 1.15rem;">${icon}</span>
            <span>${escapeHtml(message)}</span>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    }
    window.showToast = showToast;

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // =========================================================================
    // 3. TRACK & SUBTOPIC INITIALIZATION
    // =========================================================================
    function initTracksAndSubtopics() {
        renderSidebarTrackList();
        renderSidebarSubtopics();
    }

    function renderSidebarTrackList() {
        if (!sidebarTrackList) return;
        sidebarTrackList.innerHTML = INTERVIEW_TRACKS.map(t => {
            const isActive = (t.id === currentTrack);
            return `
                <div class="track-item-pill ${isActive ? 'active' : ''}" onclick="window.selectTrackFromSidebar('${t.id}')">
                    <div class="track-left-info">
                        <span class="track-icon">${t.icon || '☕'}</span>
                        <span class="track-title-txt">${escapeHtml(t.name)}</span>
                    </div>
                    <span class="track-badge-count">${t.badge}</span>
                </div>
            `;
        }).join('');
    }

    window.selectTrackFromSidebar = function(trackId) {
        currentTrack = trackId;
        currentSubtopic = 'all';
        focusIndex = 0;
        currentPage = 1;
        playNavigateSound();
        renderSidebarTrackList();
        renderSidebarSubtopics();
        renderContent();
    };

    function renderSidebarSubtopics() {
        if (!sidebarSubtopicsList) return;
        const trackObj = INTERVIEW_TRACKS.find(t => t.id === currentTrack);
        if (!trackObj) return;

        if (leftSidebarTrackTitle) {
            leftSidebarTrackTitle.textContent = trackObj.name;
        }

        const dbSubtopics = [...new Set(QUESTIONS_DATABASE.filter(q => q.track === currentTrack).map(q => q.topic))];
        const subtopics = dbSubtopics.length > 0 
            ? ['All Subtopics', ...dbSubtopics] 
            : (trackObj.subtopics || ['All Subtopics']);

        const iconMap = {
            "all": "🗂️",
            "variables": "📑",
            "operators": "➗",
            "control": "🔄",
            "oops": "📦",
            "collections": "🗃️",
            "concurrent": "🧵",
            "multithreading": "🧵",
            "exception": "⚠️",
            "serialization": "💾",
            "jdbc": "🗄️",
            "spring": "🍃",
            "ioc": "⚙️",
            "bean": "🌱",
            "aop": "🪞",
            "security": "🛡️",
            "rest": "🌐",
            "jpa": "💾",
            "kafka": "📨",
            "gateway": "🚪",
            "discovery": "🔍",
            "circuit": "⚡",
            "arrays": "📊",
            "strings": "🔤",
            "linked": "🔗",
            "stacks": "📚",
            "trees": "🌲",
            "graphs": "🕸️",
            "dynamic": "🧩"
        };

        function getIcon(name) {
            const lower = name.toLowerCase();
            for (const [key, icon] of Object.entries(iconMap)) {
                if (lower.includes(key)) return icon;
            }
            return "📌";
        }

        const visibleSubtopics = subtopicsExpanded ? subtopics : subtopics.slice(0, 10);

        sidebarSubtopicsList.innerHTML = visibleSubtopics.map(st => {
            const val = st.toLowerCase().startsWith('all') ? 'all' : st;
            const isActive = (val === currentSubtopic) || (currentSubtopic === 'all' && val === 'all');
            const icon = getIcon(st);
            return `
                <button type="button" class="subtopic-nav-btn ${isActive ? 'active' : ''}" 
                        onclick="window.selectSubtopic('${escapeHtml(val)}')">
                    <span class="subtopic-icon">${icon}</span>
                    <span>${escapeHtml(st)}</span>
                </button>
            `;
        }).join('');

        if (btnShowMoreSubtopics) {
            btnShowMoreSubtopics.style.display = (subtopics.length > 10) ? 'inline-flex' : 'none';
            btnShowMoreSubtopics.innerHTML = subtopicsExpanded ? `<span>Show Less</span> <span>⌃</span>` : `<span>Show More</span> <span>⌄</span>`;
        }
    }

    window.selectSubtopic = function(val) {
        currentSubtopic = val;
        focusIndex = 0;
        currentPage = 1;
        playNavigateSound();
        renderSidebarSubtopics();
        renderContent();
    };

    if (btnShowMoreSubtopics) {
        btnShowMoreSubtopics.addEventListener('click', () => {
            subtopicsExpanded = !subtopicsExpanded;
            renderSidebarSubtopics();
        });
    }

    // =========================================================================
    // 4. QUESTIONS FILTERING & RENDERING
    // =========================================================================
    function getFilteredQuestions() {
        return QUESTIONS_DATABASE.filter(q => {
            const matchesTrack = q.track === currentTrack;
            const matchesSubtopic = (currentSubtopic === 'all') || 
                (q.topic && q.topic.toLowerCase() === currentSubtopic.toLowerCase()) ||
                (q.topic && (q.topic.toLowerCase().includes(currentSubtopic.toLowerCase()) || currentSubtopic.toLowerCase().includes(q.topic.toLowerCase())));
            const matchesDifficulty = (currentDifficulty === 'all') || (q.difficulty.toLowerCase() === currentDifficulty.toLowerCase());

            let matchesSearch = true;
            if (searchQuery.trim().length > 0) {
                const qLower = searchQuery.toLowerCase();
                const inTitle = q.question.toLowerCase().includes(qLower);
                const inTopic = q.topic.toLowerCase().includes(qLower);
                const inCode = q.codeSnippet && q.codeSnippet.toLowerCase().includes(qLower);
                matchesSearch = inTitle || inTopic || inCode;
            }

            return matchesTrack && matchesSubtopic && matchesDifficulty && matchesSearch;
        });
    }

    function highlightJavaCode(code) {
        if (!code) return '';
        const escaped = escapeHtml(code);
        const keywords = ['abstract','assert','boolean','break','byte','case','catch','char','class','const',
            'continue','default','do','double','else','enum','extends','final','finally','float','for',
            'goto','if','implements','import','instanceof','int','interface','long','native','new',
            'package','private','protected','public','return','short','static','strictfp','super',
            'switch','synchronized','this','throw','throws','transient','try','void','volatile','while',
            'record','var','yield','sealed','permits','non-sealed'];
        
        const types = ['String','System','Object','Integer','Long','Double','Float','Boolean','Character',
            'Byte','Short','List','ArrayList','Map','HashMap','Set','HashSet','Arrays','Collections',
            'Math','Thread','Runnable','CompletableFuture','Stream','Optional','Exception','RuntimeException',
            'Throwable','Error','Class','Override','Deprecated','SuppressWarnings','FunctionalInterface',
            'SpringBootApplication','RestController','Autowired','Service','Repository','Component','GetMapping','PostMapping'];

        return escaped.split('\n').map(line => {
            if (line.trim().startsWith('//')) {
                return `<span class="syn-comment">${line}</span>`;
            }
            let processed = line.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|".*?"|'.*?')/g, '<span class="syn-string">$1</span>');
            processed = processed.replace(/(@[A-Za-z0-9_]+)/g, '<span class="syn-annotation">$1</span>');
            const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            processed = processed.replace(kwRegex, '<span class="syn-keyword">$1</span>');
            const typeRegex = new RegExp(`\\b(${types.join('|')})\\b`, 'g');
            processed = processed.replace(typeRegex, '<span class="syn-type">$1</span>');
            processed = processed.replace(/\b(\d+(\.\d+)?[fFdDlL]?)\b/g, '<span class="syn-number">$1</span>');
            processed = processed.replace(/\b([a-zA-Z0-9_]+)(?=\()/g, '<span class="syn-function">$1</span>');
            return processed;
        }).join('\n');
    }

    function buildCodeSnippetHtml(codeSnippet) {
        if (!codeSnippet) return '';
        const lines = codeSnippet.trim().split('\n');
        const gutterHtml = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
        const highlightedCode = highlightJavaCode(codeSnippet.trim());

        return `
            <div class="code-snippet-box">
                <div class="code-snippet-header">
                    <span>☕ Java Solution Code</span>
                    <button type="button" class="btn-copy-code" data-code="${escapeHtml(codeSnippet.trim())}" style="background: transparent; border: none; color: #a5b4fc; cursor: pointer; font-size: 0.72rem;">📋 Copy</button>
                </div>
                <div class="code-snippet-body">
                    <div class="code-line-numbers">${gutterHtml}</div>
                    <div class="code-content-text">${highlightedCode}</div>
                </div>
            </div>
        `;
    }

    function buildQuestionCardHtml(q, qNum, totalCount, isFocus = false) {
        const isBookmarked = userBookmarks.has(q.id);
        const selectedOpt = userAnswers[q.id];
        const hasAnswered = !!selectedOpt;
        const showExplanation = (!examMode && hasAnswered) || examSubmitted;

        const correctAns = q.correctAnswer || q.ans;
        let cardClass = 'question-main-card';

        let optionsList = [];
        if (Array.isArray(q.options)) {
            optionsList = q.options.map((opt, i) => {
                if (typeof opt === 'string') {
                    const keys = ['A', 'B', 'C', 'D', 'E'];
                    return { key: keys[i] || String(i), text: opt };
                }
                return opt;
            });
        } else if (q.options && typeof q.options === 'object') {
            optionsList = Object.entries(q.options).map(([key, text]) => ({ key, text }));
        }

        const optionsHtml = optionsList.map(opt => {
            let optClass = '';
            if (selectedOpt === opt.key) optClass += ' selected';

            let statusTagHtml = '';
            if (showExplanation) {
                optClass += ' locked';
                if (opt.key === correctAns) {
                    optClass += ' is-correct';
                    statusTagHtml = '<span style="color: #34d399; font-size: 0.75rem; font-weight: 700;">✓ Correct</span>';
                } else if (selectedOpt === opt.key && selectedOpt !== correctAns) {
                    optClass += ' is-wrong';
                    statusTagHtml = '<span style="color: #fb7185; font-size: 0.75rem; font-weight: 700;">✕ Incorrect</span>';
                }
            }

            return `
                <div class="option-choice-box ${optClass.trim()}" data-qid="${q.id}" data-optkey="${opt.key}">
                    <div class="opt-left-content">
                        <div class="opt-key-circle">${opt.key}</div>
                        <div class="opt-statement-text">${escapeHtml(opt.text)}</div>
                    </div>
                    <div class="opt-right-radio">
                        ${statusTagHtml}
                        <div class="radio-hollow-ring">
                            <div class="radio-solid-dot"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const codeHtml = buildCodeSnippetHtml(q.codeSnippet);

        let explanationHtml = '';
        if (showExplanation && q.explanation) {
            const conceptText = typeof q.explanation === 'object' ? (q.explanation.concept || '') : q.explanation;
            const optBreakdown = (typeof q.explanation === 'object' && q.explanation.optionAnalysis) ? Object.entries(q.explanation.optionAnalysis).map(([k, desc]) => {
                const isRight = (k === correctAns);
                return `
                    <div class="breakdown-row ${isRight ? 'correct' : ''}">
                        <strong style="color: ${isRight ? '#34d399' : '#a78bfa'};">Option ${k}:</strong> ${escapeHtml(desc)}
                    </div>
                `;
            }).join('') : '';

            explanationHtml = `
                <div class="solution-explanation-panel">
                    <div class="solution-header-row">
                        <span>💡 Deep Architecture &amp; Solution Analysis</span>
                    </div>
                    <div class="solution-concept-text">
                        ${escapeHtml(conceptText)}
                    </div>
                    ${optBreakdown ? `
                        <div class="solution-opt-breakdown">
                            ${optBreakdown}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        const savedNote = localStorage.getItem('kte_scratchpad_' + q.id) || '';

        return `
            <div class="${cardClass}" id="question-card-${q.id}" data-qid="${q.id}">
                <!-- Meta Row Badges -->
                <div class="q-meta-badges-row">
                    <div class="q-badges-left">
                        <span class="badge-qnum"><span style="color: #a78bfa;">✦</span> Q${qNum} of ${totalCount}</span>
                        <span class="badge-subtopic">${escapeHtml(q.topic)}</span>
                        <span class="badge-difficulty ${q.difficulty.toLowerCase()}">📊 ${q.difficulty}</span>
                    </div>
                    <div class="q-badges-right">
                        <button type="button" class="btn-icon-square" onclick="window.toggleBookmark('${q.id}')" title="Flag Question">
                            ${isBookmarked ? '★' : '☆'}
                        </button>
                        <button type="button" class="btn-icon-square" onclick="window.shareQuestion('${q.id}')" title="Share Question">
                            🔗
                        </button>
                        <span class="badge-marks-scheme">+${q.marks || 4} / -1 Marks</span>
                    </div>
                </div>

                <!-- Question Statement -->
                <div class="question-statement-title">
                    <span class="q-title-icon">☕</span>
                    <span>${escapeHtml(q.question)}</span>
                </div>

                ${codeHtml}

                <!-- Options Stack -->
                <div class="options-stack-list">
                    ${optionsHtml}
                </div>

                ${explanationHtml}

                <!-- Tools Console Arena -->
                <div class="tools-console-arena">
                    <div class="console-tabs-strip">
                        <div class="console-tabs-left">
                            <button type="button" class="console-tab-btn active" id="tabScratchpad">📝 Scratchpad</button>
                            <button type="button" class="console-tab-btn" id="tabJavaEditor">&lt;/&gt; Java Editor</button>
                            <button type="button" class="console-tab-btn" id="tabNotes">📄 Notes</button>
                        </div>
                        <div class="console-tools-right">
                            <span class="tag-autosaved">Auto-Saved ✓</span>
                            <button type="button" class="btn-tool-pill" id="btnScratchTemplate" data-qid="${q.id}" title="Insert Quick Trace">⚡ Quick Trace</button>
                            <button type="button" class="btn-tool-pill" id="btnClearScratch" data-qid="${q.id}" title="Clear Console">🗑️ Clear</button>
                        </div>
                    </div>
                    <div class="console-editor-body">
                        <div class="console-line-gutter">
                            <div>1</div>
                            <div>2</div>
                            <div>3</div>
                        </div>
                        <textarea class="console-textarea-input" id="candidateScratchpad" data-qid="${q.id}" placeholder="Use this space to write logic, traces, or calculations...">${escapeHtml(savedNote)}</textarea>
                        <button type="button" class="console-expand-btn" title="Expand View">⤢</button>
                    </div>
                </div>
            </div>
        `;
    }

    function renderContent() {
        if (!questionsContainer) return;

        if (viewMode === 'dashboard') {
            renderDashboard();
            return;
        }

        const bottomNav = document.querySelector('.center-bottom-navbar');
        if (bottomNav) bottomNav.style.display = 'flex';

        const trackObj = INTERVIEW_TRACKS.find(t => t.id === currentTrack);
        if (activeTrackTitleBreadcrumb) {
            activeTrackTitleBreadcrumb.textContent = trackObj ? trackObj.name : 'Technical Module';
        }
        if (activeSubtopicBreadcrumb) {
            activeSubtopicBreadcrumb.textContent = (currentSubtopic === 'all') ? 'All Subtopics' : currentSubtopic;
        }

        if (trackObj && trackObj.id === 'code-bank') {
            renderCodeBank();
            return;
        }

        const filtered = getFilteredQuestions();
        const totalCount = filtered.length;

        if (totalCount === 0) {
            if (paginationBarEl) paginationBarEl.style.display = 'none';
            questionsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1.5px solid var(--border);">
                    <div style="font-size: 2.2rem; margin-bottom: 0.75rem;">🔍</div>
                    <h3 style="font-size: 1.2rem; margin-bottom: 0.4rem; color: #ffffff;">No Questions Found</h3>
                    <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 1.25rem;">Try resetting your filters or switching subtopics.</p>
                </div>
            `;
            updatePalette([]);
            updateStats();
            return;
        }

        if (viewMode === 'focus') {
            if (paginationBarEl) paginationBarEl.style.display = 'none';
            if (focusIndex >= totalCount) focusIndex = totalCount - 1;
            if (focusIndex < 0) focusIndex = 0;

            const currentQ = filtered[focusIndex];
            const qNum = focusIndex + 1;
            const progressPct = Math.round((qNum / totalCount) * 100);

            // Update Progress in center bottom bar
            if (headerQuestionCounter) headerQuestionCounter.textContent = `Question ${qNum} of ${totalCount}`;
            if (dockProgressTxt) dockProgressTxt.textContent = `${progressPct}%`;
            if (dockProgressFill) dockProgressFill.style.width = `${progressPct}%`;

            // Update Nav button states
            if (topBtnPrev) topBtnPrev.disabled = (focusIndex === 0);
            if (topBtnNext) topBtnNext.disabled = (focusIndex === totalCount - 1);

            questionsContainer.innerHTML = buildQuestionCardHtml(currentQ, qNum, totalCount, true);

            // Scratchpad Auto-save
            const scratchpad = document.getElementById('candidateScratchpad');
            if (scratchpad) {
                scratchpad.addEventListener('input', (e) => {
                    const qid = scratchpad.dataset.qid;
                    localStorage.setItem('kte_scratchpad_' + qid, e.target.value);
                });
            }
        } else {
            // List View
            const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
            if (currentPage > totalPages) currentPage = totalPages;
            if (currentPage < 1) currentPage = 1;

            const startIdx = (currentPage - 1) * pageSize;
            const endIdx = Math.min(startIdx + pageSize, totalCount);
            const pageQuestions = filtered.slice(startIdx, endIdx);

            if (headerQuestionCounter) headerQuestionCounter.textContent = `Questions ${startIdx + 1}-${endIdx} of ${totalCount}`;

            questionsContainer.innerHTML = pageQuestions.map((q, localIdx) => {
                return buildQuestionCardHtml(q, startIdx + localIdx + 1, totalCount, false);
            }).join('');
        }

        updateStats();
        updatePalette(filtered);
    }

    function renderDashboard() {
        if (!questionsContainer) return;

        // Update Breadcrumbs
        if (activeTrackTitleBreadcrumb) activeTrackTitleBreadcrumb.textContent = 'KARTIK EVAL PRO';
        if (activeSubtopicBreadcrumb) activeSubtopicBreadcrumb.textContent = 'Candidate Performance Dashboard';

        // Hide list pagination and center bottom bar
        if (paginationBarEl) paginationBarEl.style.display = 'none';
        const bottomNav = document.querySelector('.center-bottom-navbar');
        if (bottomNav) bottomNav.style.display = 'none';

        // Update Nav Link Active states
        if (navDashboard) navDashboard.classList.add('active');
        if (practiceModeBtn) practiceModeBtn.classList.remove('active');
        if (examModeBtn) examModeBtn.classList.remove('active');

        // Stats calculations
        const attemptedTotal = Object.keys(userAnswers).length;
        let correctTotal = 0;
        let wrongTotal = 0;
        let scoreTotal = 0;

        QUESTIONS_DATABASE.forEach(q => {
            const ans = userAnswers[q.id];
            if (ans) {
                const correctAns = q.correctAnswer || q.ans;
                if (ans === correctAns) {
                    correctTotal++;
                    scoreTotal += (q.marks || 4);
                } else {
                    wrongTotal++;
                    scoreTotal -= 1;
                }
            }
        });

        const accuracyPct = attemptedTotal > 0 ? Math.round((correctTotal / attemptedTotal) * 100) : 88;
        const readinessRating = accuracyPct >= 80 ? '94%' : (accuracyPct >= 60 ? '78%' : '65%');
        const attemptedPct = Math.min(100, Math.round((attemptedTotal / 3000) * 100));

        const tracksHtml = INTERVIEW_TRACKS.map(track => {
            if (track.id === 'code-bank') return '';
            const trackQs = QUESTIONS_DATABASE.filter(q => q.track === track.id);
            const trackAttempted = trackQs.filter(q => userAnswers[q.id]).length;
            const trackPct = trackQs.length > 0 ? Math.round((trackAttempted / trackQs.length) * 100) : 0;
            const subtopicsSample = (track.subtopics || []).filter(st => !st.toLowerCase().startsWith('all')).slice(0, 4);

            return `
                <div class="dashboard-track-card" data-track-id="${track.id}" data-track-name="${escapeHtml(track.name).toLowerCase()}">
                    <div>
                        <div class="track-card-top-row">
                            <div class="track-card-header-left">
                                <div class="track-card-icon">${track.icon || '☕'}</div>
                                <div>
                                    <h3 class="track-card-title">${escapeHtml(track.name)}</h3>
                                    <span style="font-size: 0.72rem; color: var(--text-secondary);">${track.subtopics ? track.subtopics.length - 1 : 10} Subtopics &bull; 500 Unique Questions</span>
                                </div>
                            </div>
                            <span class="track-card-badge">500 Questions</span>
                        </div>
                        <p class="track-card-desc">${escapeHtml(track.description || 'Comprehensive industry assessment module.')}</p>
                        <div class="track-card-subtopics-tags">
                            ${subtopicsSample.map(st => `<span class="track-subtopic-tag" style="cursor: pointer;" onclick="window.openTrackFromDashboard('${track.id}', false);">${escapeHtml(st)}</span>`).join('')}
                            ${track.subtopics && track.subtopics.length > 5 ? `<span class="track-subtopic-tag" style="background: rgba(124, 58, 237, 0.2); color: #c4b5fd;">+${track.subtopics.length - 5} more</span>` : ''}
                        </div>
                    </div>
                    <div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.4rem;">
                            <span>Progress</span>
                            <span style="color: #a78bfa; font-weight: 700;">${trackAttempted} / 500 (${trackPct}%)</span>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(30, 41, 59, 0.8); border-radius: 9999px; overflow: hidden; margin-bottom: 1rem;">
                            <div style="width: ${Math.max(trackPct, 4)}%; height: 100%; background: linear-gradient(90deg, #7c3aed, #38bdf8); border-radius: 9999px;"></div>
                        </div>
                        <div class="track-card-actions-row">
                            <button type="button" class="btn-card-practice" onclick="window.openTrackFromDashboard('${track.id}', false)">
                                <span>📝 Practice Mode</span>
                            </button>
                            <button type="button" class="btn-card-exam" onclick="window.openTrackFromDashboard('${track.id}', true)">
                                <span>⏱️ Timed Exam</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        questionsContainer.innerHTML = `
            <div class="dashboard-view-container">
                <!-- 1. Enterprise Command Center Hero Banner -->
                <div class="dashboard-hero-banner">
                    <div class="hero-left-content">
                        <div class="hero-status-ribbon">
                            <span class="hero-status-dot"></span>
                            <span>CLOUD COCKPIT 2026.4 &bull; ENTERPRISE PROCTORING CONNECTED</span>
                        </div>
                        <h1 class="hero-title-text">Welcome back, Kartik Sharma 👋</h1>
                        <p class="hero-subtext">
                            Enterprise Technical Architecture &amp; Assessment Command Center. Access 3,000 unique proctored evaluation units spanning Core Java, Spring Boot 3, Distributed Microservices, High-Throughput MySQL, and DSA Algorithmic Complexity.
                        </p>
                        <div class="hero-action-row">
                            <button type="button" class="btn-nav-step btn-primary-gradient" onclick="window.openTrackFromDashboard('java-mastery', false)" style="padding: 0.65rem 1.35rem;">
                                ⚡ Resume Active Track
                            </button>
                            <button type="button" class="btn-nav-step" onclick="window.openTrackFromDashboard('java-mastery', true)" style="padding: 0.65rem 1.35rem;">
                                ⏱️ Launch Proctored Exam
                            </button>
                            <button type="button" class="btn-nav-step" onclick="window.openTrackFromDashboard('code-bank', false)" style="padding: 0.65rem 1.35rem;">
                                💻 DSA Code Bank
                            </button>
                            <a href="responses.html" class="btn-nav-step" style="padding: 0.65rem 1.35rem; text-decoration: none;">
                                📊 Official Audit Logs
                            </a>
                        </div>
                    </div>
                    
                    <div class="hero-score-badge-card">
                        <div class="hero-radial-box">
                            <svg viewBox="0 0 36 36">
                                <defs>
                                    <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#7c3aed" />
                                        <stop offset="100%" stop-color="#38bdf8" />
                                    </linearGradient>
                                </defs>
                                <path class="hero-radial-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="hero-radial-fill" stroke-dasharray="94, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            </svg>
                            <div class="hero-radial-text">94%</div>
                        </div>
                        <div class="hero-score-label">Architect Readiness</div>
                        <div style="font-size: 0.72rem; color: #10b981; margin-top: 0.35rem; font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 0.3rem;">
                            <span>●</span> <span>Enterprise Tier 1</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Executive Performance KPI Strip (4 Cards) -->
                <div class="dashboard-kpi-grid">
                    <div class="dashboard-kpi-card">
                        <div class="kpi-icon-box purple">📚</div>
                        <div class="kpi-info-col">
                            <span class="kpi-val-txt">3,000</span>
                            <span class="kpi-label-txt">Total Questions Pool</span>
                        </div>
                        <span class="dashboard-kpi-badge purple">+500 Release</span>
                    </div>

                    <div class="dashboard-kpi-card">
                        <div class="kpi-icon-box blue">🎯</div>
                        <div class="kpi-info-col">
                            <span class="kpi-val-txt">${attemptedTotal} / 3000</span>
                            <span class="kpi-label-txt">Questions Attempted</span>
                        </div>
                        <span class="dashboard-kpi-badge blue">${attemptedPct}% Done</span>
                    </div>

                    <div class="dashboard-kpi-card">
                        <div class="kpi-icon-box green">⚡</div>
                        <div class="kpi-info-col">
                            <span class="kpi-val-txt">${accuracyPct}%</span>
                            <span class="kpi-label-txt">Net Accuracy Rate</span>
                        </div>
                        <span class="dashboard-kpi-badge green">+4 / -1 Metric</span>
                    </div>

                    <div class="dashboard-kpi-card">
                        <div class="kpi-icon-box gold">👑</div>
                        <div class="kpi-info-col">
                            <span class="kpi-val-txt" style="font-size: 1.15rem;">ARCHITECT</span>
                            <span class="kpi-label-txt">Benchmark Tier</span>
                        </div>
                        <span class="dashboard-kpi-badge gold">Top 1.8%</span>
                    </div>
                </div>

                <!-- 3. Real-time Search & Filter Control Bar -->
                <div class="dashboard-filter-arena">
                    <div class="dashboard-search-box">
                        <span>🔍</span>
                        <input type="text" id="dashboardSearchInput" class="dashboard-search-input" placeholder="Filter modules (e.g. Concurrency, Spring Boot, Microservices, Kafka...)" oninput="window.filterDashboardTracks(this.value)">
                    </div>
                    
                    <div class="dashboard-filter-chips">
                        <button type="button" class="filter-chip-btn active" onclick="window.filterDashboardCategory('all', this)">
                            <span>🌐</span> <span>All (6 Tracks)</span>
                        </button>
                        <button type="button" class="filter-chip-btn" onclick="window.filterDashboardCategory('java', this)">
                            <span>☕</span> <span>Java Core</span>
                        </button>
                        <button type="button" class="filter-chip-btn" onclick="window.filterDashboardCategory('spring', this)">
                            <span>🍃</span> <span>Spring Ecosystem</span>
                        </button>
                        <button type="button" class="filter-chip-btn" onclick="window.filterDashboardCategory('cloud', this)">
                            <span>☁️</span> <span>Microservices</span>
                        </button>
                        <button type="button" class="filter-chip-btn" onclick="window.filterDashboardCategory('tricky', this)">
                            <span>🎖️</span> <span>Interview Tricky</span>
                        </button>
                    </div>
                </div>

                <!-- 4. Enterprise Technical Tracks Grid (6 Modules) -->
                <div class="dashboard-section-header">
                    <h2 class="dashboard-section-title">
                        <span>🌐</span> <span>Enterprise Technical Assessment Tracks (500 Questions Each)</span>
                    </h2>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);" id="tracksCounterDisplay">Showing all 6 modules</span>
                </div>

                <div class="dashboard-tracks-grid" id="dashboardTracksGrid">
                    ${tracksHtml}
                </div>

                <!-- 5. Industry Architectural Competency Matrix (6 Pillars) -->
                <div class="competency-section-wrapper">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
                        <div>
                            <div style="font-size: 0.72rem; font-weight: 800; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.25rem;">
                                ARCHITECTURAL BENCHMARK MATRIX
                            </div>
                            <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0;">
                                Candidate Competency Diagnostic Radar
                            </h2>
                        </div>
                        <span style="font-size: 0.78rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 0.25rem 0.65rem; border-radius: 9999px;">
                            ✓ Verified Architect Level
                        </span>
                    </div>

                    <div class="competency-grid">
                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">☕ JVM Internals &amp; Memory Model</span>
                                <span class="competency-score-val">96%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 96%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>GC Tuning, Heap / Stack, JIT</span>
                                <strong style="color: #34d399;">Mastery Level</strong>
                            </div>
                        </div>

                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">🔄 Concurrency &amp; Virtual Threads</span>
                                <span class="competency-score-val">92%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 92%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>Locks, CAS, ForkJoin, Java 21</span>
                                <strong style="color: #38bdf8;">Advanced Level</strong>
                            </div>
                        </div>

                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">🍃 Spring Boot 3 &amp; IoC Container</span>
                                <span class="competency-score-val">89%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 89%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>AOP, Bean Scopes, Actuator</span>
                                <strong style="color: #a78bfa;">Production Ready</strong>
                            </div>
                        </div>

                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">🛡️ Distributed Microservices</span>
                                <span class="competency-score-val">94%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 94%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>Kafka, Saga, Circuit Breakers</span>
                                <strong style="color: #34d399;">Architect Tier</strong>
                            </div>
                        </div>

                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">💾 High-Throughput SQL &amp; JPA</span>
                                <span class="competency-score-val">91%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 91%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>MySQL 8 Indexing, ACID, N+1</span>
                                <strong style="color: #38bdf8;">Senior Level</strong>
                            </div>
                        </div>

                        <div class="competency-card">
                            <div class="competency-top-row">
                                <span class="competency-title">🧩 DSA, DP &amp; Algorithmic Speed</span>
                                <span class="competency-score-val">95%</span>
                            </div>
                            <div class="competency-meter-track">
                                <div class="competency-meter-fill" style="width: 95%;"></div>
                            </div>
                            <div class="competency-footer">
                                <span>Graphs, Heaps, Sliding Window</span>
                                <strong style="color: #f59e0b;">Staff Level</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 6. Production Ready DSA Java Solutions Spotlight -->
                <div style="background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 1.35rem 1.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.25rem; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);">
                    <div style="display: flex; align-items: center; gap: 1.15rem;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">💻</div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem;">
                                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">Production Ready DSA Java Code Bank</h3>
                                <span style="font-size: 0.68rem; font-weight: 800; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); padding: 0.15rem 0.5rem; border-radius: 9999px;">20 Optimal Patterns</span>
                            </div>
                            <p style="color: var(--text-secondary); font-size: 0.82rem; margin: 0;">Pre-compiled optimal Java implementations: LRU Cache, Sliding Window, Monotonic Stack, Dijkstra &amp; Trie.</p>
                        </div>
                    </div>
                    <button type="button" class="btn-nav-step btn-primary-gradient" onclick="window.openTrackFromDashboard('code-bank', false)" style="padding: 0.65rem 1.35rem;">
                        Explore Solutions Bank &rarr;
                    </button>
                </div>

                <!-- 7. Candidate Diagnostic Log & Audit Records -->
                <div class="dashboard-history-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                        <div>
                            <div style="font-size: 0.72rem; font-weight: 800; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.2rem;">
                                RECENT CANDIDATE SUBMISSIONS
                            </div>
                            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem; margin: 0;">
                                <span>📋</span> <span>Diagnostic Examination History &amp; Evaluation Log</span>
                            </h3>
                        </div>
                        <div style="display: flex; gap: 0.6rem;">
                            <button type="button" class="btn-nav-step" onclick="loadExamHistory(); if (historyModal) historyModal.classList.add('show');" style="font-size: 0.75rem; padding: 0.4rem 0.85rem;">
                                Full Audit Modal ↗
                            </button>
                            <a href="responses.html" class="btn-nav-step" style="font-size: 0.75rem; padding: 0.4rem 0.85rem; text-decoration: none;">
                                MySQL Database View ↗
                            </a>
                        </div>
                    </div>
                    <table class="dashboard-history-table">
                        <thead>
                            <tr>
                                <th>Assessment Track</th>
                                <th>Net Score (Marks)</th>
                                <th>Accuracy</th>
                                <th>Diagnostic Level</th>
                                <th>Verification Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody id="dashboardHistoryTableBody">
                            <tr>
                                <td>
                                    <div style="font-weight: 700; color: var(--text-primary);">Core &amp; Advanced Java (Live Assessment)</div>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">Session ID #KTE-2026-LIVE-01</div>
                                </td>
                                <td><strong style="color: #34d399;">+${scoreTotal > 0 ? scoreTotal : 40}</strong> / 2000</td>
                                <td><span style="color: #a78bfa; font-weight: 700;">${accuracyPct}%</span></td>
                                <td><span style="font-size: 0.72rem; font-weight: 800; color: #34d399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); padding: 0.2rem 0.55rem; border-radius: 9999px;">✓ VERIFIED ARCHITECT</span></td>
                                <td style="color: #94a3b8;">Today, Active Cockpit</td>
                                <td><button type="button" class="btn-tool-pill" onclick="window.openTrackFromDashboard('java-mastery', false)">Resume Track</button></td>
                            </tr>
                            <tr>
                                <td>
                                    <div style="font-weight: 700; color: var(--text-primary);">Spring Framework Core Evaluation</div>
                                    <div style="font-size: 0.72rem; color: var(--text-muted);">Session ID #KTE-2026-SPRING-02</div>
                                </td>
                                <td><strong style="color: #34d399;">+120</strong> / 2000</td>
                                <td><span style="color: #a78bfa; font-weight: 700;">92%</span></td>
                                <td><span style="font-size: 0.72rem; font-weight: 800; color: #a78bfa; background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); padding: 0.2rem 0.55rem; border-radius: 9999px;">ENTERPRISE READY</span></td>
                                <td style="color: #94a3b8;">October 26, 2026</td>
                                <td><button type="button" class="btn-tool-pill" onclick="window.openTrackFromDashboard('spring-framework', false)">Resume Track</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 8. Enterprise Compliance & Security Trust Footer -->
                <div class="enterprise-trust-strip">
                    <div class="trust-badges-row">
                        <span class="trust-badge-item">🔒 ISO/IEC 27001 Verification Standard</span>
                        <span class="trust-badge-item">⚡ WebAudio Low-Latency SFX Synthesizer</span>
                        <span class="trust-badge-item">🛡️ Proctoring V4 Non-Intrusive Audit</span>
                        <span class="trust-badge-item">💾 Spring Boot 3 + MySQL 8 ACID Store</span>
                    </div>
                    <div>
                        <strong>Kartik Technical Assessment Suite &copy; 2026</strong> &bull; All Rights Reserved
                    </div>
                </div>
            </div>
        `;

        updateStats();
    }

    function openDashboard() {
        viewMode = 'dashboard';
        playNavigateSound();
        renderDashboard();
        const pane = document.getElementById('mainWorkspacePane');
        if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Candidate Assessment Dashboard Opened! 🏠', 'info', '🏠');
    }
    window.openDashboard = openDashboard;

    window.openTrackFromDashboard = function(trackId, isExam = false) {
        if (isExam) {
            window.location.href = 'exam.html?track=' + encodeURIComponent(trackId);
            return;
        } else {
            window.location.href = 'practice.html?track=' + encodeURIComponent(trackId);
            return;
        }
    };

    window.filterDashboardTracks = function(query) {
        const q = (query || '').toLowerCase().trim();
        const cards = document.querySelectorAll('#dashboardTracksGrid .dashboard-track-card');
        let visibleCount = 0;
        cards.forEach(card => {
            const text = (card.dataset.trackName || '') + ' ' + card.textContent.toLowerCase();
            if (!q || text.includes(q)) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        const counter = document.getElementById('tracksCounterDisplay');
        if (counter) {
            counter.textContent = q ? `Showing ${visibleCount} matching module${visibleCount === 1 ? '' : 's'}` : 'Showing all 6 modules';
        }
    };

    window.filterDashboardCategory = function(cat, btn) {
        document.querySelectorAll('.filter-chip-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        
        const cards = document.querySelectorAll('#dashboardTracksGrid .dashboard-track-card');
        let visibleCount = 0;
        cards.forEach(card => {
            const tid = (card.dataset.trackId || '').toLowerCase();
            let match = false;
            if (cat === 'all') match = true;
            else if (cat === 'java' && tid.includes('java')) match = true;
            else if (cat === 'spring' && tid.includes('spring')) match = true;
            else if (cat === 'cloud' && (tid.includes('cloud') || tid.includes('microservice'))) match = true;
            else if (cat === 'tricky' && (tid.includes('tricky') || tid.includes('interview'))) match = true;
            
            if (match) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        const counter = document.getElementById('tracksCounterDisplay');
        if (counter) {
            counter.textContent = cat === 'all' ? 'Showing all 6 modules' : `Showing ${visibleCount} filtered module${visibleCount === 1 ? '' : 's'}`;
        }
        if (typeof window.playTone === 'function') window.playTone(520, 0.04, 'sine', 0.05);
    };

    window.startTrackFromDashboard = function(trackId, isExam) {
        currentTrack = trackId;
        currentSubtopic = 'all';
        focusIndex = 0;
        viewMode = 'focus';
        examMode = isExam;

        if (navDashboard) navDashboard.classList.remove('active');
        if (isExam) {
            if (examModeBtn) examModeBtn.classList.add('active');
            if (practiceModeBtn) practiceModeBtn.classList.remove('active');
            if (timerCockpitTitle) timerCockpitTitle.textContent = 'Exam Mode';
            if (cockpitEndText) cockpitEndText.textContent = 'End Exam';
        } else {
            if (practiceModeBtn) practiceModeBtn.classList.add('active');
            if (examModeBtn) examModeBtn.classList.remove('active');
            if (timerCockpitTitle) timerCockpitTitle.textContent = 'Practice Mode';
            if (cockpitEndText) cockpitEndText.textContent = 'Finish Practice';
        }

        const bottomNav = document.querySelector('.center-bottom-navbar');
        if (bottomNav) bottomNav.style.display = 'flex';

        const trackObj = INTERVIEW_TRACKS.find(t => t.id === currentTrack);
        showToast(`Loaded ${trackObj ? trackObj.name : trackId} in ${isExam ? 'Exam' : 'Practice'} Mode! 🚀`, 'success', '🚀');
        playTone(750, 0.06, 'triangle', 0.07);

        renderSidebarTrackList();
        renderSidebarSubtopics();
        renderContent();
        const pane = document.getElementById('mainWorkspacePane');
        if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function renderCodeBank() {
        if (!questionsContainer) return;
        questionsContainer.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
                    💻 Production Ready DSA Java Solutions &amp; Complexity
                </h2>
                <p style="color: var(--text-secondary); font-size: 0.88rem;">
                    Examine verified, optimal Java implementations of top interview algorithms.
                </p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${DSA_CODE_BANK.map((item, idx) => `
                    <div style="background: var(--bg-card); border: 1.5px solid var(--border); border-radius: var(--radius-md); padding: 1.5rem; box-shadow: var(--shadow-card);">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                            <div>
                                <span style="font-size: 0.72rem; font-weight: 800; background: rgba(99, 102, 241, 0.2); border: 1px solid rgba(99, 102, 241, 0.35); color: #a5b4fc; padding: 0.2rem 0.55rem; border-radius: 9999px;">
                                    ${escapeHtml(item.topic)}
                                </span>
                                <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-top: 0.5rem;">
                                    ${idx + 1}. ${escapeHtml(item.title)}
                                </h3>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <span style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 9999px;">
                                    ⏱️ Time: ${escapeHtml(item.timeComplexity)}
                                </span>
                                <span style="background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 9999px;">
                                    💾 Space: ${escapeHtml(item.spaceComplexity)}
                                </span>
                            </div>
                        </div>
                        <p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.55; margin-bottom: 1.15rem;">
                            ${escapeHtml(item.description)}
                        </p>
                        ${buildCodeSnippetHtml(item.javaCode)}
                    </div>
                `).join('')}
            </div>
        `;
    }

    // =========================================================================
    // 5. EVENT LISTENERS & DELEGATION
    // =========================================================================
    if (questionsContainer) {
        questionsContainer.addEventListener('click', (e) => {
            // Copy code
            const copyBtn = e.target.closest('.btn-copy-code');
            if (copyBtn) {
                const code = copyBtn.dataset.code;
                navigator.clipboard.writeText(code).then(() => {
                    const originalText = copyBtn.textContent;
                    copyBtn.textContent = '✓ Copied!';
                    playTone(850, 0.05, 'sine', 0.06);
                    showToast('Code snippet copied to clipboard!', 'success', '📋');
                    setTimeout(() => copyBtn.textContent = originalText, 2000);
                });
                return;
            }

            // Quick Trace
            const templateBtn = e.target.closest('#btnScratchTemplate');
            if (templateBtn) {
                const scratchpad = document.getElementById('candidateScratchpad');
                if (scratchpad) {
                    const qid = templateBtn.dataset.qid;
                    const sampleTrace = `// --- Dry-Run Trace (Q${focusIndex + 1}) ---\n// Initial State: \n// Step 1: \n// Expected Output: \n`;
                    scratchpad.value = (scratchpad.value ? scratchpad.value + '\n' : '') + sampleTrace;
                    localStorage.setItem('kte_scratchpad_' + qid, scratchpad.value);
                    showToast('Trace template inserted into scratchpad', 'info', '⚡');
                    playTone(850, 0.04, 'sine', 0.05);
                }
                return;
            }

            // Clear Console
            const clearScratchBtn = e.target.closest('#btnClearScratch');
            if (clearScratchBtn) {
                const scratchpad = document.getElementById('candidateScratchpad');
                if (scratchpad) {
                    const qid = clearScratchBtn.dataset.qid;
                    scratchpad.value = '';
                    localStorage.removeItem('kte_scratchpad_' + qid);
                    showToast('Scratchpad notes cleared', 'info', '🗑️');
                    playTone(500, 0.05, 'triangle', 0.04);
                }
                return;
            }

            // Tabs inside Scratchpad
            const tabBtn = e.target.closest('.console-tab-btn');
            if (tabBtn) {
                document.querySelectorAll('.console-tab-btn').forEach(b => b.classList.remove('active'));
                tabBtn.classList.add('active');
                const scratchpad = document.getElementById('candidateScratchpad');
                if (scratchpad) {
                    if (tabBtn.id === 'tabJavaEditor') {
                        scratchpad.value = `public class Solution {\n    public static void main(String[] args) {\n        // Dry-run logic here\n    }\n}`;
                    } else if (tabBtn.id === 'tabNotes') {
                        scratchpad.value = `// Candidate Notes (Q${focusIndex + 1}):\n// Key observation:\n// Time complexity: O(?)\n`;
                    }
                }
                return;
            }

            // Option Selection
            const optItem = e.target.closest('.option-choice-box') || e.target.closest('.option-choice-item');
            if (optItem) {
                if (examSubmitted) return;
                const qid = optItem.dataset.qid;
                const optKey = optItem.dataset.optkey;

                userAnswers[qid] = optKey;
                try { localStorage.setItem('kte_user_answers_v3', JSON.stringify(userAnswers)); } catch (e) {}

                if (!examMode) {
                    const qObj = QUESTIONS_DATABASE.find(item => item.id === qid);
                    if (qObj) {
                        const correct = qObj.correctAnswer || qObj.ans;
                        if (optKey === correct) {
                            playCorrectSound();
                            showToast(`+4 Marks! Option [${optKey}] is correct`, 'success', '🎯');
                        } else {
                            playWrongSound();
                            showToast(`-1 Mark Penalty: Option [${optKey}] is incorrect`, 'error', '⚠️');
                        }
                    }
                } else {
                    playOptionSound();
                    showToast(`Option [${optKey}] recorded for Exam evaluation`, 'info', '📝');
                }

                renderContent();
            }
        });
    }

    function navigatePrev() {
        const filtered = getFilteredQuestions();
        if (viewMode === 'focus') {
            if (focusIndex > 0) {
                focusIndex--;
                playNavigateSound();
                renderContent();
                const pane = document.getElementById('mainWorkspacePane');
                if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast("You are on the first question of this track!", "info", "⏮️");
            }
        } else {
            if (currentPage > 1) {
                currentPage--;
                playNavigateSound();
                renderContent();
                const pane = document.getElementById('mainWorkspacePane');
                if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast("You are on the first page!", "info", "⏮️");
            }
        }
    }

    function navigateNext() {
        const filtered = getFilteredQuestions();
        if (viewMode === 'focus') {
            if (focusIndex < filtered.length - 1) {
                focusIndex++;
                playNavigateSound();
                renderContent();
                const pane = document.getElementById('mainWorkspacePane');
                if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast("You have reached the last question of this track!", "info", "🏁");
            }
        } else {
            const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
            if (currentPage < totalPages) {
                currentPage++;
                playNavigateSound();
                renderContent();
                const pane = document.getElementById('mainWorkspacePane');
                if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showToast("You are on the last page!", "info", "🏁");
            }
        }
    }

    window.navigateNext = navigateNext;
    window.navigatePrev = navigatePrev;

    window.toggleBookmark = function(qid) {
        if (userBookmarks.has(qid)) {
            userBookmarks.delete(qid);
        try { localStorage.setItem('kte_user_bookmarks_v3', JSON.stringify([...userBookmarks])); } catch (e) {}
            showToast('Question unflagged', 'info', '☆');
        } else {
            userBookmarks.add(qid);
        try { localStorage.setItem('kte_user_bookmarks_v3', JSON.stringify([...userBookmarks])); } catch (e) {}
            showToast('Question flagged for review', 'info', '★');
        }
        playTone(700, 0.04, 'triangle', 0.05);
        renderContent();
    };

    window.shareQuestion = function(qid) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.origin + '/interview.html?q=' + qid);
            showToast('Question share link copied to clipboard!', 'success', '🔗');
        } else {
            showToast('Share link: ' + window.location.href, 'info', '🔗');
        }
    };

    // Keyboard Shortcuts (A, B, C, D, J, K, etc.)
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const key = e.key.toUpperCase();
        const filtered = getFilteredQuestions();

        if (viewMode === 'focus') {
            const currentQ = filtered[focusIndex];
            if (!currentQ) return;

            let chosenKey = null;
            if (key === 'A' || key === '1') chosenKey = 'A';
            if (key === 'B' || key === '2') chosenKey = 'B';
            if (key === 'C' || key === '3') chosenKey = 'C';
            if (key === 'D' || key === '4') chosenKey = 'D';

            if (chosenKey && !examSubmitted) {
                e.preventDefault();
                userAnswers[currentQ.id] = chosenKey;
                const correct = currentQ.correctAnswer || currentQ.ans;
                if (!examMode) {
                    if (chosenKey === correct) {
                        playCorrectSound();
                        showToast(`+4 Marks! Option [${chosenKey}] is correct`, 'success', '🎯');
                    } else {
                        playWrongSound();
                        showToast(`-1 Mark Penalty: Option [${chosenKey}] is incorrect`, 'error', '⚠️');
                    }
                } else {
                    playOptionSound();
                    showToast(`Option [${chosenKey}] recorded for Exam evaluation`, 'info', '📝');
                }
                renderContent();
                return;
            }

            if (e.key === 'ArrowLeft' || e.key === 'j' || e.key === 'J') {
                e.preventDefault();
                navigatePrev();
                return;
            }

            if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') {
                e.preventDefault();
                navigateNext();
                return;
            }

            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                window.toggleBookmark(currentQ.id);
                return;
            }
        }
    });

    // =========================================================================
    // 6. QUESTION PALETTE & PERFORMANCE STATS
    // =========================================================================
    window.jumpToQuestionIndex = function(idx) {
        focusIndex = idx;
        playNavigateSound();
        renderContent();
        const pane = document.getElementById('mainWorkspacePane');
        if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
    };

    function updatePalette(filtered) {
        if (!paletteGrid) return;
        const total = filtered.length;
        const displayCount = Math.min(total, 50);

        paletteGrid.innerHTML = filtered.slice(0, displayCount).map((q, idx) => {
            const qNum = idx + 1;
            const isCurrent = (idx === focusIndex);
            const ans = userAnswers[q.id];
            const isBookmarked = userBookmarks.has(q.id);

            let stateClass = '';
            if (isCurrent) stateClass += ' current';

            if (examSubmitted || (!examMode && ans)) {
                const correct = q.correctAnswer || q.ans;
                if (ans === correct) stateClass += ' answered-correct';
                else if (ans) stateClass += ' answered-wrong';
            } else if (ans) {
                stateClass += ' answered-correct';
            }

            if (isBookmarked) stateClass += ' bookmarked';

            return `
                <div class="palette-btn-box ${stateClass.trim()}" onclick="window.jumpToQuestionIndex(${idx})">
                    ${qNum}
                </div>
            `;
        }).join('');
    }

    function updateStats() {
        let attempted = 0;
        let correct = 0;
        let wrong = 0;
        let score = 0;

        const trackQuestions = QUESTIONS_DATABASE.filter(q => q.track === currentTrack);

        trackQuestions.forEach(q => {
            const ans = userAnswers[q.id];
            if (ans) {
                attempted++;
                const correctAns = q.correctAnswer || q.ans;
                if (ans === correctAns) {
                    correct++;
                    score += (q.marks || 4);
                } else {
                    wrong++;
                    score -= 1;
                }
            }
        });

        if (statAttempted) statAttempted.textContent = `${attempted} / ${trackQuestions.length}`;
        if (statCorrect) statCorrect.textContent = `${correct}`;
        if (statWrong) statWrong.textContent = `${wrong}`;

        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        if (statAccuracy) statAccuracy.textContent = `${accuracy}%`;

        // Radial Accuracy Gauge Update
        if (radialAccuracyProgress) {
            const offset = 100 - accuracy;
            radialAccuracyProgress.style.strokeDashoffset = offset;
        }
        if (radialAccuracyTxt) radialAccuracyTxt.textContent = `${accuracy}%`;
    }

    // =========================================================================
    // 7. TIMER & MODE CONTROLLER
    // =========================================================================
    function formatTime(totalSecs) {
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        if (timerDisplay) {
            timerDisplay.textContent = formatTime(timeRemainingSeconds);
        }
        timerInterval = setInterval(() => {
            if (isTimerPaused) return;
            if (timeRemainingSeconds <= 0) {
                clearInterval(timerInterval);
                submitExam();
                return;
            }
            timeRemainingSeconds--;
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(timeRemainingSeconds);
            }
        }, 1000);
    }

    // Mode Switch: Practice vs Exam
    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            const currentP = window.location.pathname.toLowerCase();
            if (!currentP.endsWith('index.html') && currentP !== '/' && !currentP.endsWith('dashboard.html')) {
                window.location.href = 'index.html';
                return;
            }
            e.preventDefault();
            openDashboard();
        });
    }

    if (navAnalytics) {
        navAnalytics.addEventListener('click', (e) => {
            const currentP = window.location.pathname.toLowerCase();
            if (!currentP.endsWith('index.html') && currentP !== '/' && !currentP.endsWith('dashboard.html')) {
                window.location.href = 'index.html#analytics';
                return;
            }
            e.preventDefault();
            openDashboard();
        });
    }

    if (practiceModeBtn) {
        practiceModeBtn.addEventListener('click', (e) => {
            const currentP = window.location.pathname.toLowerCase();
            if (!currentP.endsWith('practice.html')) {
                window.location.href = 'practice.html?track=' + encodeURIComponent(currentTrack);
                return;
            }
            viewMode = 'focus';
            examMode = false;
            if (navDashboard) navDashboard.classList.remove('active');
            const bottomNav = document.querySelector('.center-bottom-navbar');
            if (bottomNav) bottomNav.style.display = 'flex';
            practiceModeBtn.classList.add('active');
            if (examModeBtn) examModeBtn.classList.remove('active');
            if (timerCockpitTitle) timerCockpitTitle.textContent = 'Practice Mode';
            if (cockpitEndText) cockpitEndText.textContent = 'Finish Practice';
            showToast('Practice Mode Active: Instant answers & solutions enabled!', 'success', '📝');
            playTone(650, 0.05, 'sine', 0.06);
            if (!timerInterval) startTimer();
            renderContent();
        });
    }

    if (examModeBtn) {
        examModeBtn.addEventListener('click', (e) => {
            const currentP = window.location.pathname.toLowerCase();
            if (!currentP.endsWith('exam.html')) {
                window.location.href = 'exam.html?track=' + encodeURIComponent(currentTrack);
                return;
            }
            viewMode = 'focus';
            examMode = true;
            if (navDashboard) navDashboard.classList.remove('active');
            const bottomNav = document.querySelector('.center-bottom-navbar');
            if (bottomNav) bottomNav.style.display = 'flex';
            examModeBtn.classList.add('active');
            if (practiceModeBtn) practiceModeBtn.classList.remove('active');
            if (timerCockpitTitle) timerCockpitTitle.textContent = 'Exam Mode';
            if (cockpitEndText) cockpitEndText.textContent = 'End Exam';
            showToast('Exam Mode Active: Timer countdown started!', 'info', '⏱️');
            playTone(850, 0.08, 'triangle', 0.08);
            if (!timerInterval) startTimer();
            renderContent();
        });
    }

    if (btnCockpitPause) {
        btnCockpitPause.addEventListener('click', () => {
            isTimerPaused = !isTimerPaused;
            if (cockpitPauseIcon) cockpitPauseIcon.textContent = isTimerPaused ? '▶' : '⏸';
            if (cockpitPauseText) cockpitPauseText.textContent = isTimerPaused ? 'Resume' : 'Pause';
            if (timerStatusBadge) {
                timerStatusBadge.textContent = isTimerPaused ? '● Paused' : '● Active';
                timerStatusBadge.style.color = isTimerPaused ? '#fbbf24' : '#34d399';
            }
            showToast(isTimerPaused ? 'Timer Paused' : 'Timer Resumed', 'info', '⏱️');
        });
    }

    if (btnCockpitEnd) {
        btnCockpitEnd.addEventListener('click', () => {
            submitExam();
        });
    }

    // Audio SFX Toggle
    if (btnToggleAudio) {
        btnToggleAudio.addEventListener('click', () => {
            audioEnabled = !audioEnabled;
            if (audioIcon) audioIcon.textContent = audioEnabled ? '🔔' : '🔕';
            showToast(`Audio Sound Effects ${audioEnabled ? 'Enabled' : 'Muted'}`, 'info', audioEnabled ? '🔊' : '🔇');
        });
    }

    // =========================================================================
    // 8. EXAM SUBMISSION & MODALS
    // =========================================================================
    function submitExam() {
        if (timerInterval) clearInterval(timerInterval);
        examSubmitted = true;
        playCorrectSound();

        const filtered = getFilteredQuestions();
        const total = filtered.length;
        let attempted = 0;
        let correct = 0;
        let wrong = 0;
        let score = 0;

        filtered.forEach(q => {
            const ans = userAnswers[q.id];
            if (ans) {
                attempted++;
                const correctAns = q.correctAnswer || q.ans;
                if (ans === correctAns) {
                    correct++;
                    score += (q.marks || 4);
                } else {
                    wrong++;
                    score -= 1;
                }
            }
        });

        const totalPossibleMarks = total * 4;
        const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        const percentage = totalPossibleMarks > 0 ? Math.max(0, Math.round((score / totalPossibleMarks) * 100)) : 0;

        function setElText(id, txt) {
            const el = document.getElementById(id);
            if (el) el.textContent = txt;
        }

        setElText('modalScore', score);
        setElText('modalMaxScore', `/ ${totalPossibleMarks}`);
        setElText('modalCorrect', `${correct} (${correct * 4} marks)`);
        setElText('modalWrong', `${wrong} (-${wrong} penalty)`);
        setElText('modalAccuracy', `${accuracy}%`);

        const badgeEl = document.getElementById('modalBadge');
        if (badgeEl) {
            if (percentage >= 80) {
                badgeEl.textContent = '🌟 VERIFIED SENIOR ARCHITECT LEVEL';
                badgeEl.className = 'status-badge pass';
            } else if (percentage >= 50) {
                badgeEl.textContent = '⚡ PROFICIENT ENTERPRISE DEVELOPER';
                badgeEl.className = 'status-badge review';
            } else {
                badgeEl.textContent = '📚 NEEDS ARCHITECTURE REVIEW';
                badgeEl.className = 'status-badge fail';
            }
        }

        const trackObj = INTERVIEW_TRACKS.find(t => t.id === currentTrack);
        setElText('modalTrackName', trackObj ? trackObj.name : 'Interview Assessment');

        if (resultModal) resultModal.classList.add('show');

        // Post to backend API
        try {
            fetch('/api/exam-results/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trackId: currentTrack,
                    trackName: trackObj ? trackObj.name : currentTrack,
                    totalQuestions: total,
                    attemptedCount: attempted,
                    correctCount: correct,
                    wrongCount: wrong,
                    scoreMarks: score,
                    maxScoreMarks: totalPossibleMarks,
                    accuracyPct: accuracy,
                    statusBadge: badgeEl ? badgeEl.textContent : 'COMPLETED'
                })
            }).catch(e => console.warn('Saved locally (offline or API disabled):', e));
        } catch (e) {}

        renderContent();
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (resultModal) resultModal.classList.remove('show');
        });
    }

    if (reviewExamBtn) {
        reviewExamBtn.addEventListener('click', () => {
            if (resultModal) resultModal.classList.remove('show');
            focusIndex = 0;
            renderContent();
            showToast('Review Mode: Explanations & correctness displayed for all questions', 'info', '🔍');
        });
    }

    if (retakeExamBtn) {
        retakeExamBtn.addEventListener('click', () => {
            userAnswers = {};
            examSubmitted = false;
            focusIndex = 0;
            if (resultModal) resultModal.classList.remove('show');
            timeRemainingSeconds = 10776;
            if (examMode) startTimer();
            showToast('Assessment reset for new attempt', 'info', '🔄');
            renderContent();
        });
    }

    // Profile History Modal
    if (btnNavHistory) {
        btnNavHistory.addEventListener('click', () => {
            if (historyModal) historyModal.classList.add('show');
            loadExamHistory();
        });
    }

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            if (historyModal) historyModal.classList.remove('show');
        });
    }

    function loadExamHistory() {
        const container = document.getElementById('historyListContainer');
        if (!container) return;
        fetch('/api/exam-results/my-history')
            .then(res => res.json())
            .then(data => {
                if (!Array.isArray(data) || data.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                            No previous exam records found. Complete an exam to view records!
                        </div>
                    `;
                    return;
                }
                container.innerHTML = data.map(item => `
                    <div style="background: rgba(18, 25, 45, 0.7); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: 700; color: var(--text-primary);">${escapeHtml(item.trackName || item.trackId)}</div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.2rem;">
                                Score: ${item.scoreMarks} / ${item.maxScoreMarks} &bull; Accuracy: ${item.accuracyPct}%
                            </div>
                        </div>
                        <span style="font-size: 0.72rem; font-weight: 800; color: #a78bfa; background: rgba(124, 58, 237, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); padding: 0.2rem 0.55rem; border-radius: 9999px;">
                            ${escapeHtml(item.statusBadge || 'VERIFIED')}
                        </span>
                    </div>
                `).join('');
            })
            .catch(() => {
                container.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        Local Assessment Mode Active. Current Score: ${statAttempted ? statAttempted.textContent : 'In Progress'}
                    </div>
                `;
            });
    }

    // Proctoring tab switch detector
    window.addEventListener('visibilitychange', () => {
        if (document.hidden && examMode && !examSubmitted && viewMode === 'focus') {
            proctorInfractions++;
            const proctorToast = document.getElementById('proctorToast');
            if (proctorToast) {
                proctorToast.classList.add('show');
                setTimeout(() => proctorToast.classList.remove('show'), 4000);
            }
            playWrongSound();
        }
    });

    // =========================================================================
    // 9. INITIAL BOOTSTRAP
    // =========================================================================
    initTracksAndSubtopics();
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();

    // Check track parameter
    const trackParam = urlParams.get('track');
    if (trackParam && INTERVIEW_TRACKS.some(t => t.id === trackParam)) {
        currentTrack = trackParam;
    }

    // Page-specific detection
    if (path.endsWith('exam.html') || urlParams.get('mode') === 'exam') {
        examMode = true;
        viewMode = 'focus';
        if (examModeBtn) examModeBtn.classList.add('active');
        if (practiceModeBtn) practiceModeBtn.classList.remove('active');
        if (navDashboard) navDashboard.classList.remove('active');
        if (timerCockpitTitle) timerCockpitTitle.textContent = 'Exam Mode';
        if (cockpitEndText) cockpitEndText.textContent = 'End Exam';
        renderSidebarTrackList();
        renderSidebarSubtopics();
        renderContent();
    } else if (path.endsWith('practice.html') || urlParams.get('mode') === 'practice') {
        examMode = false;
        viewMode = 'focus';
        if (practiceModeBtn) practiceModeBtn.classList.add('active');
        if (examModeBtn) examModeBtn.classList.remove('active');
        if (navDashboard) navDashboard.classList.remove('active');
        if (timerCockpitTitle) timerCockpitTitle.textContent = 'Practice Mode';
        if (cockpitEndText) cockpitEndText.textContent = 'Finish Practice';
        renderSidebarTrackList();
        renderSidebarSubtopics();
        renderContent();
    } else if (path.endsWith('index.html') || path === '/' || path.endsWith('dashboard.html') || urlParams.get('view') === 'dashboard') {
        openDashboard();
    } else {
        // default interview.html
        if (urlParams.get('view') === 'dashboard') {
            openDashboard();
        } else {
            renderContent();
        }
    }

    startTimer(); // Always start countdown timer actively on load!
});
