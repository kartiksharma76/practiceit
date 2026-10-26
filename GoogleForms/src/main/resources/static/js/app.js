document.addEventListener('DOMContentLoaded', () => {
    // State
    let questions = [];
    let questionIdCounter = 0;

    // Elements
    const formTitleInput = document.getElementById('formTitle');
    const formDescInput = document.getElementById('formDescription');
    const questionsContainer = document.getElementById('questions');
    const addQuestionBtn = document.getElementById('addQuestion');
    const createFormBtn = document.getElementById('createForm');
    const statusEl = document.getElementById('status');
    const refreshFormsBtn = document.getElementById('refreshForms');
    const formsListEl = document.getElementById('formsList');

    // Helper: is choice type
    function isChoiceType(type) {
        return type === 'MULTIPLE_CHOICE' || type === 'CHECKBOXES' || type === 'DROPDOWN';
    }

    // Helper: Show status message
    function showStatus(message, type = 'info') {
        if (!statusEl) return;
        statusEl.className = `status show ${type}`;
        statusEl.innerHTML = message;
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideStatus() {
        if (!statusEl) return;
        statusEl.className = 'status';
        statusEl.innerHTML = '';
    }

    // Add new question to state and render
    function addQuestion(initialData = null) {
        questionIdCounter++;
        const q = {
            id: questionIdCounter,
            questionText: initialData?.questionText || '',
            type: initialData?.type || 'SHORT_ANSWER',
            required: initialData?.required || false,
            options: initialData?.options || ['Option 1']
        };

        questions.push(q);
        renderQuestions();
    }

    // Remove question
    function removeQuestion(id) {
        if (questions.length <= 1) {
            alert('A form must have at least one question.');
            return;
        }
        questions = questions.filter(q => q.id !== id);
        renderQuestions();
    }

    // Add option to question
    function addOption(questionId) {
        const q = questions.find(item => item.id === questionId);
        if (q) {
            const nextIndex = q.options.length + 1;
            q.options.push(`Option ${nextIndex}`);
            renderQuestions();
        }
    }

    // Remove option from question
    function removeOption(questionId, optIndex) {
        const q = questions.find(item => item.id === questionId);
        if (q) {
            if (q.options.length <= 1) {
                alert('At least one option is required for this question type.');
                return;
            }
            q.options.splice(optIndex, 1);
            renderQuestions();
        }
    }

    // Render questions list
    function renderQuestions() {
        if (!questionsContainer) return;
        questionsContainer.innerHTML = '';

        questions.forEach((q, index) => {
            const card = document.createElement('div');
            card.className = 'question-builder-card';
            card.dataset.id = q.id;

            const hasOptions = isChoiceType(q.type);

            // Card Header
            let optionsHtml = '';
            if (hasOptions) {
                const bulletClass = q.type === 'CHECKBOXES' ? 'checkbox-bullet' : '';
                const optionsRows = q.options.map((opt, optIdx) => `
                    <div class="qb-option-row">
                        <span class="qb-option-bullet ${bulletClass}"></span>
                        <input type="text" value="${escapeHtml(opt)}" 
                            placeholder="Option text"
                            data-action="update-option"
                            data-qid="${q.id}"
                            data-optidx="${optIdx}">
                        <button type="button" class="danger-icon" title="Remove option"
                            data-action="remove-option"
                            data-qid="${q.id}"
                            data-optidx="${optIdx}">×</button>
                    </div>
                `).join('');

                optionsHtml = `
                    <div class="qb-options-container">
                        ${optionsRows}
                        <button type="button" class="qb-add-opt-btn"
                            data-action="add-option" data-qid="${q.id}">+ Add Option</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="qb-header">
                    <span class="qb-badge">Question ${index + 1}</span>
                    <button type="button" class="danger-icon" title="Delete question" 
                        data-action="delete-question" data-qid="${q.id}">🗑️</button>
                </div>
                <div class="qb-row">
                    <input type="text" value="${escapeHtml(q.questionText)}" 
                        placeholder="e.g. What is your full name?"
                        data-action="update-text"
                        data-qid="${q.id}">
                    <select data-action="update-type" data-qid="${q.id}">
                        <option value="SHORT_ANSWER" ${q.type === 'SHORT_ANSWER' ? 'selected' : ''}>Short Answer</option>
                        <option value="PARAGRAPH" ${q.type === 'PARAGRAPH' ? 'selected' : ''}>Paragraph</option>
                        <option value="MULTIPLE_CHOICE" ${q.type === 'MULTIPLE_CHOICE' ? 'selected' : ''}>Multiple Choice</option>
                        <option value="CHECKBOXES" ${q.type === 'CHECKBOXES' ? 'selected' : ''}>Checkboxes</option>
                        <option value="DROPDOWN" ${q.type === 'DROPDOWN' ? 'selected' : ''}>Dropdown</option>
                    </select>
                </div>
                ${optionsHtml}
                <div class="qb-footer">
                    <label class="switch-label">
                        <input type="checkbox" ${q.required ? 'checked' : ''} 
                            data-action="toggle-required" data-qid="${q.id}">
                        <span class="switch-slider"></span>
                        <span>Required</span>
                    </label>
                </div>
            `;

            questionsContainer.appendChild(card);
        });
    }

    // Event delegation for questionsContainer
    if (questionsContainer) {
        questionsContainer.addEventListener('input', (e) => {
            const target = e.target;
            const qid = parseInt(target.dataset.qid);
            const q = questions.find(item => item.id === qid);
            if (!q) return;

            if (target.dataset.action === 'update-text') {
                q.questionText = target.value;
            } else if (target.dataset.action === 'update-option') {
                const optIdx = parseInt(target.dataset.optidx);
                q.options[optIdx] = target.value;
            }
        });

        questionsContainer.addEventListener('change', (e) => {
            const target = e.target;
            const qid = parseInt(target.dataset.qid);
            const q = questions.find(item => item.id === qid);
            if (!q) return;

            if (target.dataset.action === 'update-type') {
                q.type = target.value;
                if (isChoiceType(q.type) && (!q.options || q.options.length === 0)) {
                    q.options = ['Option 1'];
                }
                renderQuestions();
            } else if (target.dataset.action === 'toggle-required') {
                q.required = target.checked;
            }
        });

        questionsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const action = btn.dataset.action;
            const qid = parseInt(btn.dataset.qid);

            if (action === 'delete-question') {
                removeQuestion(qid);
            } else if (action === 'add-option') {
                addOption(qid);
            } else if (action === 'remove-option') {
                const optIdx = parseInt(btn.dataset.optidx);
                removeOption(qid, optIdx);
            }
        });
    }

    // Add question button
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', () => {
            addQuestion();
        });
    }

    // Create & Publish Form
    if (createFormBtn) {
        createFormBtn.addEventListener('click', async () => {
            const title = formTitleInput.value.trim();
            const description = formDescInput.value.trim();

            if (!title) {
                showStatus('Please enter a form title.', 'error');
                formTitleInput.focus();
                return;
            }

            if (questions.length === 0) {
                showStatus('Please add at least one question.', 'error');
                return;
            }

            // Validate questions
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (!q.questionText.trim()) {
                    showStatus(`Question ${i + 1} text cannot be blank.`, 'error');
                    return;
                }
                if (isChoiceType(q.type)) {
                    const validOpts = q.options.map(o => o.trim()).filter(o => o.length > 0);
                    if (validOpts.length === 0) {
                        showStatus(`Question ${i + 1} (${q.type.replace('_', ' ')}) requires at least one option.`, 'error');
                        return;
                    }
                }
            }

            createFormBtn.disabled = true;
            createFormBtn.textContent = 'Publishing...';
            showStatus('Creating your form...', 'info');

            const payload = {
                title: title,
                description: description,
                questions: questions.map((q, idx) => ({
                    questionText: q.questionText.trim(),
                    type: q.type,
                    required: !!q.required,
                    options: isChoiceType(q.type)
                        ? q.options.map(o => o.trim()).filter(o => o.length > 0)
                        : [],
                    position: idx
                }))
            };

            try {
                const res = await fetch('/api/forms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || 'Failed to create form');
                }

                const data = await res.json();
                const fullPublicUrl = window.location.origin + data.publicUrl;

                showStatus(`
                    🎉 <strong>Form published successfully!</strong><br>
                    Shareable link: <a href="${data.publicUrl}" target="_blank">${fullPublicUrl}</a>
                    <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem;">
                        <button type="button" class="btn-copy" onclick="navigator.clipboard.writeText('${fullPublicUrl}').then(() => alert('Link copied to clipboard!'))">📋 Copy Link</button>
                        <a href="${data.publicUrl}" target="_blank" class="btn-fill" style="text-decoration:none; padding: 0.55rem 0.9rem; border-radius: 8px;">Open Form</a>
                    </div>
                `, 'success');

                // Reset form builder
                formTitleInput.value = '';
                formDescInput.value = '';
                questions = [];
                questionIdCounter = 0;
                addQuestion();

                // Reload forms list
                loadForms();

            } catch (err) {
                console.error(err);
                showStatus(`Error: ${err.message}`, 'error');
            } finally {
                createFormBtn.disabled = false;
                createFormBtn.textContent = 'Create and Publish';
            }
        });
    }

    // Load all forms
    async function loadForms() {
        if (!formsListEl) return;
        formsListEl.innerHTML = '<div style="color: var(--text-muted); font-size: 0.95rem;">Loading forms...</div>';

        try {
            const res = await fetch('/api/forms');
            if (!res.ok) throw new Error('Could not load forms');
            const forms = await res.json();

            if (!forms || forms.length === 0) {
                formsListEl.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1;">
                        <h3>No forms created yet</h3>
                        <p>Fill out the form builder above and click "Create and Publish" to make your first form.</p>
                    </div>
                `;
                return;
            }

            formsListEl.innerHTML = forms.map(f => {
                const qCount = f.questions ? f.questions.length : 0;
                const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric'
                }) : '';
                const formUrl = `/form.html?id=${f.publicId}`;
                const fullUrl = window.location.origin + formUrl;
                const responsesUrl = `/responses.html?id=${f.id}&title=${encodeURIComponent(f.title)}`;

                return `
                    <div class="form-item-card">
                        <div>
                            <h3 class="form-item-title">${escapeHtml(f.title)}</h3>
                            <p class="form-item-desc">${escapeHtml(f.description || 'No description provided.')}</p>
                        </div>
                        <div class="form-item-meta">
                            <span class="meta-chip">📝 ${qCount} ${qCount === 1 ? 'question' : 'questions'}</span>
                            ${dateStr ? `<span class="meta-chip">📅 ${dateStr}</span>` : ''}
                        </div>
                        <div class="form-item-actions">
                            <div class="action-row">
                                <a href="${formUrl}" target="_blank" class="btn-fill">Fill Form</a>
                                <button type="button" class="btn-copy" onclick="navigator.clipboard.writeText('${fullUrl}').then(() => alert('Form link copied to clipboard!'))">Copy Link</button>
                            </div>
                            <a href="${responsesUrl}" class="btn-responses">View Responses</a>
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error(err);
            formsListEl.innerHTML = `<div class="status error show">Failed to load forms: ${err.message}</div>`;
        }
    }

    if (refreshFormsBtn) {
        refreshFormsBtn.addEventListener('click', loadForms);
    }

    // HTML escape utility
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // Init: add 1 default question and load forms
    addQuestion();
    loadForms();
});
