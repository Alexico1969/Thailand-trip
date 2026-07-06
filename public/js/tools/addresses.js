import { load, save } from '../store.js';

const STORE_KEY = 'addresses:list';

function getAll() {
  return load(STORE_KEY, []);
}

export async function init(root) {
  root.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <h2>Important addresses</h2>
        <button class="btn small" id="add-address-btn">+ Add</button>
      </div>
      <div id="address-list"></div>
    </div>
    <div id="address-sheet-root"></div>
  `;

  root.querySelector('#add-address-btn').addEventListener('click', () => openSheet(root, null));
  paint(root);
}

function paint(root) {
  const items = getAll();
  const listEl = root.querySelector('#address-list');

  if (!items.length) {
    listEl.innerHTML = `<div class="empty-state">No addresses saved yet. Add your hotel, embassy, or anywhere you might need to show a taxi driver.</div>`;
    return;
  }

  listEl.innerHTML = items.map((item) => `
    <div class="list-row">
      <button class="list-row-btn" data-id="${item.id}">
        <div class="list-row-title">${escapeHtml(item.name || 'Untitled')}</div>
        <div class="list-row-sub">${escapeHtml(item.address || '')}</div>
      </button>
      ${item.address ? `
        <a class="list-row-maps" href="${mapsUrl(item.address)}" target="_blank" rel="noopener noreferrer" aria-label="Open ${escapeAttr(item.name || 'address')} in Google Maps" title="Open in Google Maps">🗺️</a>
      ` : ''}
    </div>
  `).join('');

  listEl.querySelectorAll('.list-row-btn').forEach((btn) => {
    btn.addEventListener('click', () => openSheet(root, btn.dataset.id));
  });
}

function mapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function openSheet(root, id) {
  const items = getAll();
  const entry = id ? items.find((i) => i.id === id) : { id: null, name: '', address: '', note: '' };
  if (!entry) return;
  const sheetRoot = root.querySelector('#address-sheet-root');

  sheetRoot.innerHTML = `
    <div class="bb-sheet-backdrop" id="address-backdrop">
      <div class="bb-sheet" role="dialog" aria-modal="true" aria-label="Address">
        <button class="bb-sheet-close" id="address-close" aria-label="Close">✕</button>
        <h2>${entry.id ? 'Edit address' : 'Add address'}</h2>
        <div class="field">
          <label for="addr-name">Name</label>
          <input type="text" id="addr-name" placeholder="e.g. Hotel, Embassy" value="${escapeAttr(entry.name)}">
        </div>
        <div class="field">
          <label for="addr-address">Address</label>
          <textarea id="addr-address" placeholder="Full address, in Thai if you have it">${escapeHtml(entry.address)}</textarea>
        </div>
        <div class="field">
          <label for="addr-note">Note (optional)</label>
          <textarea id="addr-note" placeholder="e.g. Ask for the Soi 11 entrance">${escapeHtml(entry.note || '')}</textarea>
        </div>
        <button class="btn block" id="addr-save">Save</button>
        ${entry.id ? '<button class="btn block danger" id="addr-delete" style="margin-top:8px;">Delete</button>' : ''}
      </div>
    </div>
  `;

  const close = () => { sheetRoot.innerHTML = ''; };
  sheetRoot.querySelector('#address-close').addEventListener('click', close);
  sheetRoot.querySelector('#address-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'address-backdrop') close();
  });

  sheetRoot.querySelector('#addr-save').addEventListener('click', () => {
    const name = sheetRoot.querySelector('#addr-name').value.trim();
    const address = sheetRoot.querySelector('#addr-address').value.trim();
    const note = sheetRoot.querySelector('#addr-note').value.trim();
    if (!name && !address) { close(); return; }

    const current = getAll();
    if (entry.id) {
      const target = current.find((i) => i.id === entry.id);
      if (target) Object.assign(target, { name, address, note });
    } else {
      current.push({ id: `addr-${Date.now()}`, name, address, note });
    }
    save(STORE_KEY, current);
    close();
    paint(root);
  });

  if (entry.id) {
    sheetRoot.querySelector('#addr-delete').addEventListener('click', () => {
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
