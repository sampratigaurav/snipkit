// SnipKit - popup.js

import {
  getAllSnippets,
  saveSnippet,
  deleteSnippet,
  exportData,
  importData
} from '../shared/storage.js';

// ============================================================
// STATE
// ============================================================
let allSnippets = [];
let activeCategory = 'all';
let searchQuery = '';
let editingId = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRender();
  bindEvents();
});

// ============================================================
// LOAD & RENDER
// ============================================================
async function loadAndRender() {
  try {
    allSnippets = await getAllSnippets();
    const count = allSnippets.length;
    document.getElementById('snippet-count').textContent =
      count + ' snippet' + (count !== 1 ? 's' : '');
    renderList();
  } catch (err) {
    console.error('[SnipKit] loadAndRender failed:', err);
  }
}

function renderList() {
  const list = document.getElementById('snippet-list');
  const emptyState = document.getElementById('empty-state');

  // Filter by category
  let filtered = activeCategory === 'all'
    ? allSnippets
    : allSnippets.filter(s => s.category === activeCategory);

  // Filter by search query
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(s =>
      s.trigger.toLowerCase().includes(q) ||
      s.expansion.toLowerCase().includes(q)
    );
  }

  // Clear existing <li> items (leave #empty-state in place)
  const existingItems = list.querySelectorAll('.snippet-item');
  existingItems.forEach(el => el.remove());

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  // Snippets exist — ensure empty state is hidden
  emptyState.classList.add('hidden');

  filtered.forEach(snippet => {
    const li = document.createElement('li');
    li.className = 'snippet-item';

    // Trigger pill
    const triggerSpan = document.createElement('span');
    triggerSpan.className = 'trigger-pill';
    triggerSpan.textContent = snippet.trigger;

    // Expansion preview
    const previewSpan = document.createElement('span');
    previewSpan.className = 'expansion-preview';
    previewSpan.textContent = snippet.expansion.length > 45
      ? snippet.expansion.slice(0, 45) + '…'
      : snippet.expansion;
    previewSpan.title = snippet.expansion;

    // Usage badge
    const usageBadge = document.createElement('span');
    usageBadge.className = 'usage-badge';
    if (snippet.usageCount > 0) {
      usageBadge.textContent = '×' + snippet.usageCount;
    } else {
      usageBadge.style.display = 'none';
    }

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = '✎';
    editBtn.title = 'Edit';
    editBtn.addEventListener('click', () => openModal(snippet));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete';
    deleteBtn.addEventListener('click', () => handleDelete(snippet.id, snippet.trigger));

    li.appendChild(triggerSpan);
    li.appendChild(previewSpan);
    li.appendChild(usageBadge);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

// ============================================================
// BIND EVENTS
// ============================================================
function bindEvents() {
  // Search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', debounce((e) => {
    searchQuery = e.target.value.trim();
    renderList();
  }, 200));

  // Category pills
  document.querySelectorAll('.cat-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderList();
    });
  });

  // Action bar
  document.getElementById('btn-new').addEventListener('click', () => openModal(null));
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('btn-save').addEventListener('click', handleSave);

  // Close modal when clicking the overlay backdrop (not the card)
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) {
      closeModal();
    }
  });

  // Export / Import
  document.getElementById('btn-export').addEventListener('click', handleExport);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('file-input').click();
  });
  document.getElementById('file-input').addEventListener('change', handleImport);

  // Trigger auto-prefix: if user blurs the field without a leading '\', prepend it
  document.getElementById('modal-trigger').addEventListener('blur', () => {
    const input = document.getElementById('modal-trigger');
    const val = input.value;
    if (val && !val.startsWith('\\')) {
      input.value = '\\' + val;
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('modal-overlay');
    const modalOpen = !overlay.classList.contains('hidden');

    // Cmd/Ctrl+Enter → save modal
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (modalOpen) {
        e.preventDefault();
        handleSave();
      }
      return;
    }

    // Escape → close modal or popup
    if (e.key === 'Escape') {
      if (modalOpen) {
        closeModal();
      } else {
        window.close();
      }
    }
  });
}

// ============================================================
// MODAL
// ============================================================
function openModal(snippet) {
  editingId = snippet ? snippet.id : null;

  document.getElementById('modal-title').textContent =
    snippet ? 'Edit snippet' : 'New snippet';
  document.getElementById('modal-trigger').value =
    snippet ? snippet.trigger : '\\';
  document.getElementById('modal-expansion').value =
    snippet ? snippet.expansion : '';
  document.getElementById('modal-category').value =
    snippet ? snippet.category : 'work';
  document.getElementById('trigger-error').textContent = '';

  document.getElementById('modal-trigger').classList.remove('error-border');
  document.getElementById('modal-overlay').classList.remove('hidden');

  setTimeout(() => document.getElementById('modal-trigger').focus(), 50);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  editingId = null;
}

// ============================================================
// SAVE
// ============================================================
async function handleSave() {
  const triggerInput = document.getElementById('modal-trigger');
  const expansionInput = document.getElementById('modal-expansion');
  const categoryInput = document.getElementById('modal-category');
  const errorEl = document.getElementById('trigger-error');

  const trigger = triggerInput.value.trim().toLowerCase();
  const expansion = expansionInput.value.trim();
  const category = categoryInput.value;

  // Clear previous error
  errorEl.textContent = '';

  // Validate trigger format
  if (!trigger.startsWith('\\') || trigger.length < 3) {
    errorEl.textContent = 'Trigger must start with \\ and be at least 3 chars.';
    triggerInput.classList.add('shake', 'error-border');
    setTimeout(() => triggerInput.classList.remove('shake'), 400);
    return;
  }

  // Validate no spaces
  if (trigger.includes(' ')) {
    errorEl.textContent = 'Trigger cannot contain spaces.';
    triggerInput.classList.add('shake', 'error-border');
    setTimeout(() => triggerInput.classList.remove('shake'), 400);
    return;
  }

  // Validate expansion not empty
  if (!expansion) {
    errorEl.textContent = 'Expansion text cannot be empty.';
    return;
  }

  // Duplicate check
  const duplicate = allSnippets.find(s =>
    s.trigger === trigger && s.id !== editingId
  );
  if (duplicate) {
    errorEl.textContent = 'Trigger already exists. Choose a unique trigger.';
    triggerInput.classList.add('shake', 'error-border');
    setTimeout(() => triggerInput.classList.remove('shake'), 400);
    return;
  }

  try {
    const existing = editingId ? allSnippets.find(s => s.id === editingId) : null;
    await saveSnippet({
      id: editingId || crypto.randomUUID(),
      trigger,
      expansion,
      category,
      usageCount: existing ? existing.usageCount : 0,
      createdAt: existing ? existing.createdAt : Date.now()
    });
    await loadAndRender();
    closeModal();
  } catch (err) {
    console.error('[SnipKit] handleSave failed:', err);
    errorEl.textContent = 'Save failed. Please try again.';
  }
}

// ============================================================
// DELETE
// ============================================================
async function handleDelete(id, trigger) {
  if (!confirm('Delete ' + trigger + '?')) return;
  try {
    await deleteSnippet(id);
    await loadAndRender();
  } catch (err) {
    console.error('[SnipKit] handleDelete failed:', err);
  }
}

// ============================================================
// EXPORT
// ============================================================
async function handleExport() {
  try {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snipkit-snippets.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[SnipKit] handleExport failed:', err);
  }
}

// ============================================================
// IMPORT
// ============================================================
async function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const result = await importData(text);
    alert('Imported ' + result.imported + ' snippets. Skipped ' + result.skipped + '.');
    await loadAndRender();
  } catch (err) {
    console.error('[SnipKit] handleImport failed:', err);
    alert('Import failed. Please check the file format and try again.');
  } finally {
    e.target.value = '';
  }
}

// ============================================================
// DEBOUNCE HELPER
// ============================================================
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
