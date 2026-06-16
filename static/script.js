/* ═══════════════════════════════════════════════════════════════════════
   Smart Study Planner — Client-Side Logic
   ═══════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // ── DOM References ──────────────────────────────────────────────────
    const form = document.getElementById('subject-form');
    const btnAddSubject = document.getElementById('btn-add-subject');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    const tableBody = document.getElementById('table-body');
    const tableWrap = document.getElementById('table-wrap');
    const emptyState = document.getElementById('empty-state');
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-msg');

    // Inputs
    const inputSubject = document.getElementById('input-subject');
    const inputDifficulty = document.getElementById('input-difficulty');
    const inputPrep = document.getElementById('input-prep');
    const inputDays = document.getElementById('input-days');
    const inputHours = document.getElementById('input-hours');

    // ── State ───────────────────────────────────────────────────────────
    let toastTimer = null;
    let editingId = null;

    function showToast(message, icon = '✅') {
        toastIcon.textContent = icon;
        toastMsg.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ── Render Table ────────────────────────────────────────────────────
    function renderTable(subjects) {
        // Automatically save the latest state to Local Storage!
        if (subjects) {
            localStorage.setItem('study_planner_subjects', JSON.stringify(subjects));
        }

        tableBody.innerHTML = '';

        if (!subjects || subjects.length === 0) {
            tableWrap.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        tableWrap.style.display = 'block';
        emptyState.style.display = 'none';

        subjects.forEach((s, i) => {
            const tr = document.createElement('tr');
            tr.style.animationDelay = `${i * 0.06}s`;

            const priorityBadge = s.priority !== null
                ? `<span class="badge badge--priority">${s.priority}</span>`
                : `<span class="badge badge--pending">—</span>`;

            const timeBadge = s.allocated_time !== null
                ? `<span class="badge badge--time">${s.allocated_time}</span>`
                : `<span class="badge badge--pending">—</span>`;

            const strategyText = s.strategy_note
                ? `<span style="font-size: 0.75rem; color: var(--text-hint);">${s.strategy_note}</span>`
                : `<span class="badge badge--pending">—</span>`;

            const actionButtons = `
                <button class="btn-action edit-btn" data-id="${s.id}" data-subject="${escapeHtml(s.subject)}" data-diff="${s.difficulty}" data-prep="${s.prep_level}" data-days="${s.days_left}" title="Edit">✏️</button>
                <button class="btn-action delete-btn" data-id="${s.id}" title="Delete">🗑️</button>
            `;

            tr.innerHTML = `
                <td>${i + 1}</td>
                <td>${escapeHtml(s.subject)}</td>
                <td>${s.difficulty}</td>
                <td>${s.prep_level}</td>
                <td>${s.days_left}</td>
                <td>${priorityBadge}</td>
                <td>${timeBadge}</td>
                <td>${strategyText}</td>
                <td>${actionButtons}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // ── HTML Escape ─────────────────────────────────────────────────────
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Add Subject ─────────────────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const payload = {
            subject: inputSubject.value.trim(),
            difficulty: parseFloat(inputDifficulty.value),
            prep_level: parseFloat(inputPrep.value),
            days_left: parseFloat(inputDays.value)
        };

        try {
            const url = editingId ? `/api/edit_subject/${editingId}` : '/api/add_subject';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'Something went wrong.', '❌');
                return;
            }

            renderTable(data.subjects);
            showToast(editingId ? 'Subject updated successfully!' : 'Subject added successfully!', '✅');

            // Reset form & refocus
            form.reset();
            editingId = null;
            btnAddSubject.innerHTML = '<span class="btn__icon">＋</span> Add Subject';
            inputSubject.focus();

        } catch (err) {
            showToast('Network error. Is the server running?', '⚠️');
        }
    });

    // ── Generate Timetable ──────────────────────────────────────────────
    btnGenerate.addEventListener('click', async () => {
        const hours = parseFloat(inputHours.value);
        if (!hours || hours <= 0) {
            showToast('Please enter valid study hours.', '⚠️');
            inputHours.focus();
            return;
        }

        btnGenerate.disabled = true;
        btnGenerate.textContent = 'Generating…';

        try {
            const res = await fetch('/api/generate_timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_hours: hours })
            });
            const data = await res.json();

            if (!res.ok) {
                showToast(data.error || 'Failed to generate.', '❌');
                return;
            }

            renderTable(data.subjects);
            showToast('Timetable generated with AI predictions! 🎯', '🚀');

        } catch (err) {
            showToast('Network error. Is the server running?', '⚠️');
        } finally {
            btnGenerate.disabled = false;
            btnGenerate.innerHTML = '<span class="btn__icon">⚡</span> Generate Timetable';
        }
    });

    // ── Clear All ───────────────────────────────────────────────────────
    btnClear.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/clear', { method: 'POST' });
            const data = await res.json();
            renderTable(data.subjects);
            showToast('All subjects cleared.', '🗑');
            // Reset edit state if clearing all
            form.reset();
            editingId = null;
            btnAddSubject.innerHTML = '<span class="btn__icon">＋</span> Add Subject';
        } catch (err) {
            showToast('Network error.', '⚠️');
        }
    });

    // ── Edit & Delete Actions ───────────────────────────────────────────
    tableBody.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-action');
        if (!btn) return;

        const id = btn.getAttribute('data-id');

        if (btn.classList.contains('delete-btn')) {
            try {
                const res = await fetch(`/api/delete_subject/${id}`, { method: 'DELETE' });
                const data = await res.json();
                renderTable(data.subjects);
                showToast('Subject deleted.', '🗑️');
                // If deleting currently edited item, reset form
                if (editingId === id) {
                    form.reset();
                    editingId = null;
                    btnAddSubject.innerHTML = '<span class="btn__icon">＋</span> Add Subject';
                }
            } catch (err) {
                showToast('Network error.', '⚠️');
            }
        } else if (btn.classList.contains('edit-btn')) {
            inputSubject.value = btn.getAttribute('data-subject');
            inputDifficulty.value = btn.getAttribute('data-diff');
            inputPrep.value = btn.getAttribute('data-prep');
            inputDays.value = btn.getAttribute('data-days');

            editingId = id;
            btnAddSubject.innerHTML = '<span class="btn__icon">✏️</span> Update Subject';
            inputSubject.focus();

            // Scroll to form
            document.getElementById('input-section').scrollIntoView({ behavior: 'smooth' });
        }
    });

    // ── Load existing subjects on page load ─────────────────────────────
    (async () => {
        try {
            // 1. Check if the user has data in their browser's Local Storage
            const localData = localStorage.getItem('study_planner_subjects');
            if (localData) {
                const subjects = JSON.parse(localData);
                if (subjects && subjects.length > 0) {
                    // Quietly sync this local data back to the server
                    const res = await fetch('/api/import_subjects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(subjects)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        renderTable(data.subjects);
                        return; // Successfully restored from Local Storage
                    }
                }
            }

            // 2. Fallback to whatever is currently on the server
            const res = await fetch('/api/subjects');
            const data = await res.json();
            renderTable(data.subjects);
        } catch (err) {
            // Server might not be ready yet; ignore silently
        }
    })();
});
