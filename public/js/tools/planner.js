import { load, save } from '../store.js';
import { claudeCall, parseJsonLoose } from '../api.js';

const DAY_TYPES = ['Temples', 'Markets', 'Kid-friendly', 'Food crawl', 'Rainy day', 'Chill'];
const HISTORY_KEY = 'planner:history';
const MAX_HISTORY = 5;
const WEB_SEARCH_TOOLS = [{ type: 'web_search_20250305', name: 'web_search' }];

function systemPrompt() {
  return `You are a Bangkok day-trip planner for a tourist. Use web search to verify current opening hours/closures for any venues you suggest and to check that date's weather. Respond ONLY with JSON in this exact shape, no other text:\n{"title":"...","weather_note":"...","stops":[{"time":"09:00","name":"...","what":"...","transit":"BTS to Saphan Taksin, Exit 2","duration_min":90,"rain_backup":"...","cost_thb":200}],"total_cost_thb":1200,"tips":"..."}`;
}

export async function init(root) {
  const trip = load('trip', {});
  root.innerHTML = `
    <div class="card no-print">
      <h2>Plan a day</h2>
      <div class="chip-row" id="day-type-chips">
        ${DAY_TYPES.map((t) => `<button class="chip" data-type="${t}">${t}</button>`).join('')}
      </div>
      <div class="field">
        <label for="plan-date">Date</label>
        <input type="date" id="plan-date">
      </div>
      <div class="field">
        <label for="plan-start">Starting point</label>
        <input type="text" id="plan-start" value="${escapeAttr(trip.homeBase || '')}" placeholder="Hotel or area name">
      </div>
      <button class="btn block" id="plan-go">Build my day</button>
      <div id="plan-status"></div>
    </div>
    <div class="card" id="plan-result-card" style="display:none;"></div>
    <div class="card no-print" id="plan-history-card"></div>
  `;

  let selectedType = null;
  root.querySelectorAll('#day-type-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('#day-type-chips .chip').forEach((c) => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedType = chip.dataset.type;
    });
  });

  renderHistory(root.querySelector('#plan-history-card'), root);

  root.querySelector('#plan-go').addEventListener('click', () => {
    const date = root.querySelector('#plan-date').value;
    const start = root.querySelector('#plan-start').value.trim() || 'my hotel';
    if (!selectedType) { statusMsg(root, 'Pick a day type first.'); return; }
    if (!date) { statusMsg(root, 'Pick a date first.'); return; }
    buildPlan(root, selectedType, date, start);
  });
}

function statusMsg(root, msg) {
  root.querySelector('#plan-status').innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`;
}

async function buildPlan(root, dayType, date, start) {
  const statusEl = root.querySelector('#plan-status');
  const resultCard = root.querySelector('#plan-result-card');
  const btn = root.querySelector('#plan-go');
  btn.disabled = true;
  statusEl.innerHTML = `<div class="status-line"><span class="spinner"></span> Building your day… usually 15–25 s</div>`;

  let rawText = '';
  try {
    rawText = await claudeCall({
      system: systemPrompt(),
      messages: [{
        role: 'user',
        content: `Plan a "${dayType}" day in Bangkok on ${date}, starting from "${start}".`,
      }],
      tools: WEB_SEARCH_TOOLS,
      max_tokens: 2200,
    });
    const parsed = parseJsonLoose(rawText);
    statusEl.innerHTML = '';
    renderPlan(resultCard, parsed, date);
    saveHistory(date, dayType, parsed);
    renderHistory(root.querySelector('#plan-history-card'), root);
  } catch (err) {
    statusEl.innerHTML = `<div class="error-box">Couldn't build a plan: ${escapeHtml(err.message)}. Try again once you have signal.</div>`;
    if (rawText) {
      resultCard.style.display = 'block';
      resultCard.innerHTML = `<details class="raw-fold" open><summary>Couldn't parse — raw answer below</summary><pre>${escapeHtml(rawText)}</pre></details>`;
    }
  } finally {
    btn.disabled = false;
  }
}

function renderPlan(card, parsed, date) {
  card.style.display = 'block';
  const stops = Array.isArray(parsed.stops) ? parsed.stops : [];

  const stopsHtml = stops.map((s) => `
    <div class="timeline-stop">
      <div class="stop-time">${escapeHtml(s.time || '')}</div>
      <div class="stop-name">${escapeHtml(s.name || '')}</div>
      <div class="stop-meta">${escapeHtml(s.what || '')}</div>
      ${s.transit ? `<div class="transit-chip">🚇 ${escapeHtml(s.transit)}</div>` : ''}
      <div class="stop-meta">${s.duration_min ? s.duration_min + ' min' : ''} ${s.cost_thb ? '· ฿' + s.cost_thb : ''}</div>
      ${s.rain_backup ? `<details class="rain-details"><summary>☔ rain backup</summary><div>${escapeHtml(s.rain_backup)}</div></details>` : ''}
    </div>
  `).join('');

  card.innerHTML = `
    <div class="card-title-row">
      <h2>${escapeHtml(parsed.title || 'Your Bangkok day')}</h2>
      <button class="btn small outline no-print" id="print-plan">🖨️ Print</button>
    </div>
    <div class="muted">${escapeHtml(date)}${parsed.weather_note ? ' · ' + escapeHtml(parsed.weather_note) : ''}</div>
    <div class="timeline" style="margin-top:12px;">${stopsHtml || '<p class="muted">No stops returned.</p>'}</div>
    ${parsed.total_cost_thb ? `<p style="margin-top:10px;"><strong>Estimated total: ฿${parsed.total_cost_thb}</strong></p>` : ''}
    ${parsed.tips ? `<p class="muted">${escapeHtml(parsed.tips)}</p>` : ''}
  `;

  card.querySelector('#print-plan').addEventListener('click', () => window.print());
}

function saveHistory(date, dayType, parsed) {
  const history = load(HISTORY_KEY, []);
  history.unshift({ date, dayType, parsed, ts: Date.now() });
  save(HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

function renderHistory(card, root) {
  const history = load(HISTORY_KEY, []);
  if (!history.length) {
    card.innerHTML = `<h2>Saved plans</h2><div class="empty-state">No plans yet — build one above.</div>`;
    return;
  }
  card.innerHTML = `
    <h2>Saved plans</h2>
    ${history.map((h, i) => `
      <button class="history-item" data-idx="${i}">
        <span>${escapeHtml(h.date)} · ${escapeHtml(h.dayType)}</span>
        <span class="muted">${escapeHtml(h.parsed.title || '')}</span>
      </button>
    `).join('')}
  `;
  card.querySelectorAll('.history-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = history[Number(btn.dataset.idx)];
      const resultCard = root.querySelector('#plan-result-card');
      renderPlan(resultCard, h.parsed, h.date);
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function escapeAttr(str) { return escapeHtml(str); }
