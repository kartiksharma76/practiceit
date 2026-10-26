document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const formId = params.get('id') || params.get('formId');
    const titleParam = params.get('title');

    const headingEl = document.getElementById('heading');
    const responsesContainer = document.getElementById('responses');

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    if (titleParam && headingEl) {
        headingEl.textContent = `Responses: ${decodeURIComponent(titleParam)}`;
    }

    if (!formId) {
        // No form ID specified: show list of existing forms to pick from
        headingEl.textContent = 'Select a Form to View Responses';
        responsesContainer.innerHTML = '<div style="color: var(--text-muted);">Loading forms...</div>';

        try {
            const res = await fetch('/api/forms');
            if (!res.ok) throw new Error('Could not load forms');
            const forms = await res.json();

            if (!forms || forms.length === 0) {
                responsesContainer.innerHTML = `
                    <div class="empty-state">
                        <h3>No forms found</h3>
                        <p>Create a form first from the form builder.</p>
                        <a href="/" class="btn-fill" style="text-decoration:none; padding: 0.6rem 1.2rem; border-radius: 8px;">Go to Form Builder</a>
                    </div>
                `;
                return;
            }

            responsesContainer.innerHTML = `
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Choose a form below to inspect submitted answers:</p>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${forms.map(f => `
                        <a href="/responses.html?id=${f.id}&title=${encodeURIComponent(f.title)}" 
                           class="panel" 
                           style="display: flex; justify-content: space-between; align-items: center; text-decoration: none; padding: 1.25rem; color: inherit;">
                            <div>
                                <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">${escapeHtml(f.title)}</h3>
                                <p style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(f.description || 'No description')}</p>
                            </div>
                            <span class="btn-responses" style="padding: 0.4rem 0.8rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600;">View Responses →</span>
                        </a>
                    `).join('')}
                </div>
            `;
        } catch (err) {
            console.error(err);
            responsesContainer.innerHTML = `<div class="status error show">Error: ${err.message}</div>`;
        }
        return;
    }

    // Load responses for the given formId
    try {
        responsesContainer.innerHTML = '<div style="color: var(--text-muted);">Loading responses...</div>';

        const res = await fetch(`/api/forms/${formId}/responses`);
        if (!res.ok) {
            throw new Error(`Failed to load responses (${res.status})`);
        }

        const responsesList = await res.json();

        if (!responsesList || responsesList.length === 0) {
            responsesContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No responses yet</h3>
                    <p>There are no submissions recorded for this form yet.</p>
                    <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 1rem;">
                        <a href="/" class="secondary" style="text-decoration:none; display:inline-flex; align-items:center; padding: 0.6rem 1.2rem; border-radius: 8px;">Back to Builder</a>
                    </div>
                </div>
            `;
            return;
        }

        // Header controls (Total count badge + CSV Export)
        const headerRow = document.createElement('div');
        headerRow.className = 'responses-header-row';
        headerRow.innerHTML = `
            <div class="responses-stats">
                <span class="stat-pill">📊 ${responsesList.length} ${responsesList.length === 1 ? 'Submission' : 'Submissions'}</span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button type="button" id="exportCsvBtn" class="secondary" style="font-size: 0.85rem; padding: 0.5rem 1rem;">
                    📥 Export to CSV
                </button>
            </div>
        `;

        const cardsContainer = document.createElement('div');
        cardsContainer.className = 'responses-container';

        responsesList.forEach((r, idx) => {
            const card = document.createElement('div');
            card.className = 'response-card';

            const dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }) : 'Unknown date';

            const answers = r.answers || {};
            const answerEntries = Object.entries(answers);

            let answersHtml = '';
            if (answerEntries.length === 0) {
                answersHtml = '<div style="color: var(--text-muted); font-size: 0.875rem;">No answers provided.</div>';
            } else {
                answersHtml = answerEntries.map(([questionText, answerText]) => `
                    <div class="answer-item">
                        <div class="answer-question">${escapeHtml(questionText)}</div>
                        <div class="answer-value">${answerText ? escapeHtml(answerText) : '<em style="color:var(--text-muted);">No answer</em>'}</div>
                    </div>
                `).join('');
            }

            card.innerHTML = `
                <div class="response-header">
                    <span class="response-badge">#${responsesList.length - idx} &bull; Response ID: ${r.responseId}</span>
                    <span>${dateStr}</span>
                </div>
                <div class="response-answers-grid">
                    ${answersHtml}
                </div>
            `;

            cardsContainer.appendChild(card);
        });

        responsesContainer.innerHTML = '';
        responsesContainer.appendChild(headerRow);
        responsesContainer.appendChild(cardsContainer);

        // Bind CSV export
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                exportToCsv(responsesList, formId, titleParam);
            });
        }

    } catch (err) {
        console.error(err);
        responsesContainer.innerHTML = `<div class="status error show">Error loading responses: ${err.message}</div>`;
    }

    // CSV Export function
    function exportToCsv(data, formId, title) {
        if (!data || data.length === 0) return;

        // Gather all unique question headers
        const questionSet = new Set();
        data.forEach(r => {
            if (r.answers) {
                Object.keys(r.answers).forEach(q => questionSet.add(q));
            }
        });
        const questionList = Array.from(questionSet);

        // Build header row
        const headers = ['Response ID', 'Submitted At', ...questionList];
        const rows = [headers.map(escapeCsvValue).join(',')];

        // Build data rows
        data.forEach(r => {
            const dateStr = r.submittedAt ? new Date(r.submittedAt).toISOString() : '';
            const rowValues = [
                r.responseId,
                dateStr,
                ...questionList.map(q => (r.answers && r.answers[q] !== undefined) ? r.answers[q] : '')
            ];
            rows.push(rowValues.map(escapeCsvValue).join(','));
        });

        const csvContent = rows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const filename = `responses-form-${formId}-${Date.now()}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function escapeCsvValue(val) {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    }
});
