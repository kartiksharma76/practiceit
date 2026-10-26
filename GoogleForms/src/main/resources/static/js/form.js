document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const publicId = params.get('id');

    const formTitleEl = document.getElementById('formTitle');
    const formDescEl = document.getElementById('formDescription');
    const publicForm = document.getElementById('publicForm');
    const questionsContainer = document.getElementById('publicQuestions');
    const statusEl = document.getElementById('status');
    const submitBtn = publicForm ? publicForm.querySelector('button[type="submit"]') : null;

    let currentFormData = null;

    function showStatus(msg, type = 'info') {
        if (!statusEl) return;
        statusEl.className = `status show ${type}`;
        statusEl.innerHTML = msg;
        statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideStatus() {
        if (!statusEl) return;
        statusEl.className = 'status';
        statusEl.innerHTML = '';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    if (!publicId) {
        formTitleEl.textContent = 'Invalid Form Link';
        formDescEl.textContent = 'No form identifier was provided in the URL.';
        if (submitBtn) submitBtn.style.display = 'none';
        return;
    }

    // Fetch public form data
    try {
        const res = await fetch(`/api/forms/public/${publicId}`);
        if (!res.ok) {
            if (res.status === 404) {
                formTitleEl.textContent = 'Form Not Found';
                formDescEl.textContent = 'This form does not exist or has been removed.';
            } else {
                formTitleEl.textContent = 'Unable to Load Form';
                formDescEl.textContent = 'An error occurred while fetching the form.';
            }
            if (submitBtn) submitBtn.style.display = 'none';
            return;
        }

        currentFormData = await res.json();
        document.title = currentFormData.title + ' - Forms Studio';
        formTitleEl.textContent = currentFormData.title;
        formDescEl.textContent = currentFormData.description || '';

        renderPublicQuestions(currentFormData.questions || []);

    } catch (err) {
        console.error(err);
        formTitleEl.textContent = 'Network Error';
        formDescEl.textContent = 'Could not connect to the server to load the form.';
        if (submitBtn) submitBtn.style.display = 'none';
    }

    // Render questions
    function renderPublicQuestions(questions) {
        if (!questionsContainer) return;
        questionsContainer.innerHTML = '';

        if (questions.length === 0) {
            questionsContainer.innerHTML = '<p style="color: var(--text-muted);">This form has no questions.</p>';
            if (submitBtn) submitBtn.style.display = 'none';
            return;
        }

        questions.forEach((q, idx) => {
            const card = document.createElement('div');
            card.className = 'public-question-card';
            card.id = `q_card_${q.id}`;

            const requiredBadge = q.required ? '<span class="required-star">*</span>' : '';
            const options = q.optionsText ? q.optionsText.split(/\r?\n/).filter(o => o.trim().length > 0) : [];

            let inputHtml = '';

            switch (q.type) {
                case 'SHORT_ANSWER':
                    inputHtml = `
                        <input type="text" name="q_${q.id}" id="input_q_${q.id}"
                            placeholder="Your answer"
                            autocomplete="off">
                    `;
                    break;

                case 'PARAGRAPH':
                    inputHtml = `
                        <textarea name="q_${q.id}" id="input_q_${q.id}" rows="3"
                            placeholder="Your answer"></textarea>
                    `;
                    break;

                case 'MULTIPLE_CHOICE':
                    inputHtml = `
                        <div class="choice-options-list">
                            ${options.map((opt, optIdx) => `
                                <label class="choice-label">
                                    <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" id="q_${q.id}_opt_${optIdx}">
                                    <span>${escapeHtml(opt)}</span>
                                </label>
                            `).join('')}
                        </div>
                    `;
                    break;

                case 'CHECKBOXES':
                    inputHtml = `
                        <div class="choice-options-list">
                            ${options.map((opt, optIdx) => `
                                <label class="choice-label">
                                    <input type="checkbox" name="q_${q.id}" value="${escapeHtml(opt)}" id="q_${q.id}_opt_${optIdx}">
                                    <span>${escapeHtml(opt)}</span>
                                </label>
                            `).join('')}
                        </div>
                    `;
                    break;

                case 'DROPDOWN':
                    inputHtml = `
                        <select name="q_${q.id}" id="input_q_${q.id}">
                            <option value="">Select an option</option>
                            ${options.map(opt => `
                                <option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>
                            `).join('')}
                        </select>
                    `;
                    break;

                default:
                    inputHtml = `<input type="text" name="q_${q.id}" id="input_q_${q.id}" placeholder="Your answer">`;
            }

            card.innerHTML = `
                <div class="public-question-title">
                    <span>${idx + 1}.</span>
                    <span>${escapeHtml(q.questionText)}</span>
                    ${requiredBadge}
                </div>
                ${inputHtml}
            `;

            questionsContainer.appendChild(card);
        });
    }

    // Submit handler
    if (publicForm) {
        publicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideStatus();

            if (!currentFormData || !currentFormData.questions) return;

            const answers = {};
            let hasValidationError = false;

            for (const q of currentFormData.questions) {
                const card = document.getElementById(`q_card_${q.id}`);
                let answerValue = '';

                if (q.type === 'SHORT_ANSWER' || q.type === 'PARAGRAPH') {
                    const input = document.getElementById(`input_q_${q.id}`);
                    answerValue = input ? input.value.trim() : '';
                } else if (q.type === 'MULTIPLE_CHOICE') {
                    const selected = publicForm.querySelector(`input[name="q_${q.id}"]:checked`);
                    answerValue = selected ? selected.value : '';
                } else if (q.type === 'CHECKBOXES') {
                    const checkedBoxes = Array.from(publicForm.querySelectorAll(`input[name="q_${q.id}"]:checked`));
                    answerValue = checkedBoxes.map(cb => cb.value).join(',');
                } else if (q.type === 'DROPDOWN') {
                    const select = document.getElementById(`input_q_${q.id}`);
                    answerValue = select ? select.value : '';
                }

                if (q.required && (!answerValue || answerValue.trim().length === 0)) {
                    if (card) {
                        card.style.borderColor = 'var(--error)';
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    showStatus(`Please complete required question: "${escapeHtml(q.questionText)}"`, 'error');
                    hasValidationError = true;
                    return;
                } else if (card) {
                    card.style.borderColor = '';
                }

                if (answerValue) {
                    answers[q.id] = answerValue;
                }
            }

            if (hasValidationError) return;

            // Submit to backend
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            try {
                const res = await fetch(`/api/forms/public/${publicId}/responses`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ answers })
                });

                if (!res.ok) {
                    const errData = await res.json().catch(() => ({}));
                    throw new Error(errData.message || 'Failed to submit response');
                }

                // Render success view
                publicForm.innerHTML = `
                    <div class="panel success-screen">
                        <div class="success-icon">✓</div>
                        <h2>Response Recorded!</h2>
                        <p>Thank you for taking the time to complete this form.</p>
                        <button type="button" class="secondary" onclick="window.location.reload()">
                            Submit another response
                        </button>
                    </div>
                `;

            } catch (err) {
                console.error(err);
                showStatus(`Submission error: ${err.message}`, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Response';
            }
        });
    }
});
