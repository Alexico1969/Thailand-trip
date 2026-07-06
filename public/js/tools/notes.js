import { load, save } from '../store.js';

const STORE_KEY = 'notes:list';

function getAll() {
  return load(STORE_KEY, []);
}

export async function init(root) {
  root.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <h2>Notes</h2>
        <button class="btn small" id="add-note-btn">+ New</button>
      </div>
      <div id="notes-list"></div>
    </div>
    <div id="notes-sheet-root"></div>
  `;

  root.querySelector('#add-note-btn').addEventListener('click', () => openSheet(root, null));
  paint(root);
}

function paint(root) {
  const items = getAll().slice().sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const listEl = root.querySelector('#notes-list');

  if (!items.length) {
    listEl.innerHTML = `<div class="empty-state">No notes yet. Jot down anything worth remembering — a phrase, a recommendation, a reservation number.</div>`;
    return;
  }

  listEl.innerHTML = items.map((item) => `
    <button class="list-row" data-id="${item.id}">
      <div class="list-row-main">
        <div class="list-row-title">${escapeHtml(item.title || 'Untitled note')}</div>
        <div class="list-row-sub">${escapeHtml((item.body || '').slice(0, 60))}</div>
      </div>
      <div class="list-row-chevron">›</div>
    </button>
  `).join('');

  listEl.querySelectorAll('.list-row').forEach((btn) => {
    btn.addEventListener('click', () => openSheet(root, btn.dataset.id));
  });
}

function openSheet(root, id) {
  const items = getAll();
  const entry = id ? items.find((i) => i.id === id) : { id: null, title: '', body: '' };
  if (!entry) return;
  const sheetRoot = root.querySelector('#notes-sheet-root');

  sheetRoot.innerHTML = `
    <div class="bb-sheet-backdrop" id="note-backdrop">
      <div class="bb-sheet" role="dialog" aria-modal="true" aria-label="Note">
        <button class="bb-sheet-close" id="note-close" aria-label="Close">✕</button>
        <h2>${entry.id ? 'Edit note' : 'New note'}</h2>
        <div class="field">
          <label for="note-title">Title (optional)</label>
          <input type="text" id="note-title" placeholder="e.g. Taxi phrase" value="${escapeAttr(entry.title)}">
        </div>
        <div class="field">
          <label for="note-body">Note</label>
          <textarea id="note-body" placeholder="Write your note here" style="min-height:140px;">${escapeHtml(entry.body)}</textarea>
        </div>
        <button class="btn block" id="note-save">Save</button>
        ${entry.id ? '<button class="btn block danger" id="note-delete" style="margin-top:8px;">Delete</button>' : ''}
      </div>
    </div>
  `;

  const close = () => { sheetRoot.innerHTML = ''; };
  sheetRoot.querySelector('#note-close').addEventListener('click', close);
  sheetRoot.querySelector('#note-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'note-backdrop') close();
  });

  sheetRoot.querySelector('#note-save').addEventListener('click', () => {
    const title = sheetRoot.querySelector('#note-title').value.trim();
    const body = sheetRoot.querySelector('#note-body').value.trim();
    if (!title && !body) { close(); return; }

    const current = getAll();
    const now = new Date().toISOString();
    if (entry.id) {
      const target = current.find((i) => i.id === entry.id);
      if (target) Object.assign(target, { title, body, updated: now });
    } else {
      current.push({ id: `note-${Date.now()}`, title, body, updated: now });
    }
    save(STORE_KEY, current);
    close();
    paint(root);
  });

  if (entry.id) {
    sheetRoot.querySelector('#note-delete').addEventListener('click', () => {
      const current = getAll().filter((i) => i.id !== entry.id);
      save(STORE_KEY, current);
      close();
      paint(root);
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function escapeAttr(str) { return escapeHtml(str); }
