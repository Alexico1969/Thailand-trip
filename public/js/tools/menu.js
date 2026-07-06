import { load } from '../store.js';
import { getLatestRates } from '../rates.js';
import { claudeCall, parseJsonLoose, imageBlockFromDataUrl } from '../api.js';
import { mountPhotoIntake } from '../imageintake.js';

const SYSTEM_PROMPT = `You read Thai-script restaurant menus for a tourist. Look at the photo and transcribe each dish. Respond ONLY with JSON in this exact shape, no other text:\n{"dishes":[{"thai":"...","phonetic":"...","english":"...","description":"...","spice":0,"flags":["peanuts","offal","raw","shellfish","fermented fish","very spicy"],"price_thb":60}],"unreadable_note":"..."}\nspice is 0-3. flags is an array of applicable strings from that list (can be empty). If the menu has no readable Thai text, leave dishes empty and explain in unreadable_note.`;

const FILTERS = ['peanuts', 'offal', 'raw', 'shellfish'];

let lastDishes = [];
let activeFilters = new Set();
let cachedRate = null;

export async function init(root) {
  root.innerHTML = `
    <div class="card">
      <h2>Snap the menu</h2>
      <p class="muted">Photograph a Thai-script menu — Claude will translate and flag heads-ups.</p>
      <div id="photo-mount"></div>
      <div id="photo-preview-wrap"></div>
      <div id="menu-status"></div>
    </div>
    <div class="card" id="menu-result-card" style="display:none;">
      <div class="filter-bar" id="filter-bar">
        <span class="muted" style="align-self:center;">Hide dishes with:</span>
        ${FILTERS.map((f) => `<button class="filter-toggle" data-filter="${f}">${f}</button>`).join('')}
      </div>
      <div id="menu-rows"></div>
    </div>
  `;

  cachedRate = load('rates:latest', null);
  getLatestRates().then((r) => { cachedRate = r; }).catch(() => {});

  root.querySelectorAll('#filter-bar .filter-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      if (activeFilters.has(f)) { activeFilters.delete(f); btn.classList.remove('active'); }
      else { activeFilters.add(f); btn.classList.add('active'); }
      renderRows(root.querySelector('#menu-rows'));
    });
  });

  const mount = root.querySelector('#photo-mount');
  const previewWrap = root.querySelector('#photo-preview-wrap');
  const statusEl = root.querySelector('#menu-status');

  mountPhotoIntake(mount, {
    onImage: (dataUrl) => {
      previewWrap.innerHTML = `<img class="photo-preview" src="${dataUrl}" alt="Captured menu">`;
      runDecode(root, dataUrl, statusEl);
    },
    onError: (msg) => { statusEl.innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`; },
  });
}

async function runDecode(root, dataUrl, statusEl) {
  statusEl.innerHTML = `<div class="status-line"><span class="spinner"></span> Reading menu… usually 5–15 s</div>`;
  const resultCard = root.querySelector('#menu-result-card');
  resultCard.style.display = 'none';

  let rawText = '';
  try {
    rawText = await claudeCall({
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [imageBlockFromDataUrl(dataUrl), { type: 'text', text: 'Translate this Thai menu.' }],
      }],
      max_tokens: 2000,
    });
    const parsed = parseJsonLoose(rawText);
    statusEl.innerHTML = '';

    if (!parsed.dishes || !parsed.dishes.length) {
      resultCard.style.display = 'block';
      resultCard.querySelector('#menu-rows').innerHTML = `<div class="empty-state">${escapeHtml(parsed.unreadable_note || "Couldn't find readable Thai text. Try a closer, sharper shot.")}</div>`;
      root.querySelector('#filter-bar').style.display = 'none';
      return;
    }

    root.querySelector('#filter-bar').style.display = 'flex';
    lastDishes = parsed.dishes;
    resultCard.style.display = 'block';
    renderRows(root.querySelector('#menu-rows'));
  } catch (err) {
    statusEl.innerHTML = `<div class="error-box">Couldn't read that menu: ${escapeHtml(err.message)}. Try a closer, sharper shot.</div>`;
    if (rawText) {
      statusEl.innerHTML += `<details class="raw-fold"><summary>Couldn't parse — raw answer below</summary><pre>${escapeHtml(rawText)}</pre></details>`;
    }
  }
}

function renderRows(container) {
  container.innerHTML = lastDishes.map((d) => {
    const flags = Array.isArray(d.flags) ? d.flags : [];
    const hidden = flags.some((f) => activeFilters.has(f));
    const usd = cachedRate && d.price_thb ? (d.price_thb / cachedRate.thb).toFixed(2) : null;
    return `
      <div class="menu-row ${hidden ? 'hidden' : ''}">
        <div class="menu-row-top">
          <div>
            <div class="menu-row-name">${escapeHtml(d.english || d.thai || 'Dish')}</div>
            <div class="menu-row-phonetic">${escapeHtml(d.phonetic || '')} · ${escapeHtml(d.thai || '')}</div>
          </div>
          <div class="menu-row-price">${d.price_thb ? '฿' + d.price_thb : ''}${usd ? ` <span class="muted">($${usd})</span>` : ''}</div>
        </div>
        ${d.description ? `<div class="menu-row-desc">${escapeHtml(d.description)}</div>` : ''}
        <div>${'🌶️'.repeat(d.spice || 0)}</div>
        ${flags.length ? `<div class="menu-row-flags">${flags.map((f) => `<span class="chip flag">${escapeHtml(f)}</span>`).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
