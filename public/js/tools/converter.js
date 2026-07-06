import { load, save } from '../store.js';
import { getLatestRates, convertOffline } from '../rates.js';
import { claudeCall, parseJsonLoose, imageBlockFromDataUrl } from '../api.js';
import { mountPhotoIntake } from '../imageintake.js';
import { judgePrice } from '../data/fairprices.js';

const SYSTEM_PROMPT = `You are a receipt/menu price reader for a tourist in Thailand. Look at the photo and extract every price you can see, each with its item label. Respond ONLY with JSON in this exact shape, no other text: {"prices":[{"label":"...","thb":123}], "notes":"..."}. Prices must be numbers in Thai Baht (THB). If a price is ambiguous, make your best guess and mention it in "notes".`;

let cachedRate = null;

export async function init(root) {
  root.innerHTML = `
    <div class="card">
      <h2>Quick convert</h2>
      <div class="field">
        <label for="quick-thb">฿ Amount (THB)</label>
        <input type="number" inputmode="decimal" id="quick-thb" placeholder="e.g. 250">
      </div>
      <div id="quick-result" class="muted">Enter an amount above — works fully offline.</div>
    </div>
    <div class="card">
      <h2>Snap a photo</h2>
      <p class="muted">Photograph a menu or receipt — Claude will pull out every price.</p>
      <div id="photo-mount"></div>
      <div id="photo-preview-wrap"></div>
      <div id="convert-status"></div>
      <div id="convert-result"></div>
    </div>
  `;

  cachedRate = load('rates:latest', null);
  getLatestRates().then((r) => { cachedRate = r; }).catch(() => {});

  const quickInput = root.querySelector('#quick-thb');
  const quickResult = root.querySelector('#quick-result');
  quickInput.addEventListener('input', () => {
    const amount = parseFloat(quickInput.value);
    if (!isFinite(amount)) { quickResult.textContent = 'Enter an amount above — works fully offline.'; return; }
    const rate = cachedRate || load('rates:latest', null);
    if (!rate) { quickResult.textContent = 'No cached rate yet — open the app online once first.'; return; }
    const converted = convertOffline(amount, rate);
    quickResult.innerHTML = `฿${amount} ≈ <strong>$${converted.usd.toFixed(2)}</strong> · <strong>€${converted.eur.toFixed(2)}</strong> <span class="muted">(rate from ${rate.date}${rate.offline ? ', offline' : ''})</span>`;
  });

  const mount = root.querySelector('#photo-mount');
  const previewWrap = root.querySelector('#photo-preview-wrap');
  const statusEl = root.querySelector('#convert-status');
  const resultEl = root.querySelector('#convert-result');

  mountPhotoIntake(mount, {
    onImage: (dataUrl) => {
      previewWrap.innerHTML = `<img class="photo-preview" src="${dataUrl}" alt="Captured photo">`;
      runConversion(dataUrl, statusEl, resultEl);
    },
    onError: (msg) => { statusEl.innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`; },
  });
}

async function runConversion(dataUrl, statusEl, resultEl) {
  statusEl.innerHTML = `<div class="status-line"><span class="spinner"></span> Reading prices… usually 5–15 s</div>`;
  resultEl.innerHTML = '';

  let rawText = '';
  try {
    rawText = await claudeCall({
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [imageBlockFromDataUrl(dataUrl), { type: 'text', text: 'Extract every visible price with its label.' }],
      }],
      max_tokens: 1200,
    });

    const parsed = parseJsonLoose(rawText);
    const rate = cachedRate || load('rates:latest', null);
    statusEl.innerHTML = '';
    renderResult(parsed, rate, resultEl);
  } catch (err) {
    statusEl.innerHTML = `<div class="error-box">Couldn't read that photo: ${escapeHtml(err.message)}. Manual quick-convert above still works offline.</div>`;
    if (rawText) {
      resultEl.innerHTML = `<details class="raw-fold"><summary>Couldn't parse — raw answer below</summary><pre>${escapeHtml(rawText)}</pre></details>`;
    }
  }
}

function renderResult(parsed, rate, resultEl) {
  const prices = Array.isArray(parsed.prices) ? parsed.prices : [];
  if (!prices.length) {
    resultEl.innerHTML = `<div class="empty-state">No prices found in that photo. Try a closer, sharper shot.</div>`;
    return;
  }

  const rows = prices.map((p) => {
    const thb = Number(p.thb) || 0;
    const usd = rate ? thb / rate.thb : null;
    const eur = rate ? (thb / rate.thb) * rate.eur : null;
    const badge = judgePrice(p.label, thb);
    const badgeHtml = badge === 'high'
      ? `<span class="badge high">🔺 tourist price?</span>`
      : badge === 'fair'
        ? `<span class="badge fair">✅ fair</span>`
        : '';
    return `
      <tr>
        <td>${escapeHtml(p.label || 'item')}</td>
        <td>฿${thb.toFixed(0)}</td>
        <td>${usd !== null ? '$' + usd.toFixed(2) : '—'}</td>
        <td>${eur !== null ? '€' + eur.toFixed(2) : '—'}</td>
        <td>${badgeHtml}</td>
      </tr>
    `;
  }).join('');

  resultEl.innerHTML = `
    <table class="bb-table">
      <thead><tr><th>Item</th><th>฿</th><th>$</th><th>€</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${rate ? `<div class="muted" style="margin-top:6px;">Rate used: ฿${rate.thb.toFixed(2)}/USD, ${rate.date}${rate.offline ? ' (offline)' : ''}</div>` : ''}
    ${parsed.notes ? `<div class="muted" style="margin-top:6px;">${escapeHtml(parsed.notes)}</div>` : ''}
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
