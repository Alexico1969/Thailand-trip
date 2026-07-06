import { load, save } from '../store.js';
import { claudeCall, parseJsonLoose } from '../api.js';
import { LINES, OFFLINE_DESTINATION_GUESSES } from '../data/transit.js';

const HISTORY_KEY = 'routes:history';
const MAX_HISTORY = 10;

const WEB_SEARCH_TOOLS = [{ type: 'web_search_20250305', name: 'web_search' }];

function systemPrompt(origin) {
  const groundTruth = Object.entries(LINES).map(([key, line]) =>
    `${key}: ${line.stations.join(' → ')}. Interchanges: ${JSON.stringify(line.interchanges)}`
  ).join('\n');

  return `You are a Bangkok public transit router helping a tourist get from "${origin}" to a destination. Use this seeded line/station ground truth as authoritative for which lines exist and where they interchange:\n${groundTruth}\n\nUse web search to confirm the nearest BTS/MRT station to the destination, a current fare estimate, and the recommended exit number. Respond ONLY with JSON in this exact shape, no other text:\n{"steps":[{"mode":"BTS Sukhumvit|BTS Silom|MRT Blue|MRT Purple|ARL|walk|boat","from":"...","to":"...","direction":"toward ...","stops":5,"note":"..."}],"fare_thb":45,"exit":"Exit 2","total_minutes":35,"tips":"..."}`;
}

function lineColor(mode) {
  if (!mode) return '#999';
  const key = Object.keys(LINES).find((k) => mode.includes(k) || k.includes(mode));
  if (key) return LINES[key].color;
  if (/walk/i.test(mode)) return '#8A8A8A';
  if (/boat/i.test(mode)) return '#2C7FB8';
  return '#999';
}

export async function init(root) {
  const trip = load('trip', {});
  root.innerHTML = `
    <div class="card">
      <h2>Where to?</h2>
      <div class="field">
        <label for="origin-input">From (home base)</label>
        <input type="text" id="origin-input" value="${escapeAttr(trip.homeBase || '')}" placeholder="Hotel or area name">
      </div>
      <div class="field">
        <label for="dest-input">Destination</label>
        <input type="text" id="dest-input" placeholder="e.g. Chatuchak Market, Wat Pho, ICONSIAM">
      </div>
      <button class="btn block" id="route-go">Find route</button>
      <div id="route-status"></div>
    </div>
    <div class="card" id="route-result-card" style="display:none;"></div>
    <div class="card" id="route-history-card"></div>
  `;

  renderHistory(root.querySelector('#route-history-card'), root);

  root.querySelector('#route-go').addEventListener('click', () => {
    const origin = root.querySelector('#origin-input').value.trim() || 'my hotel';
    const dest = root.querySelector('#dest-input').value.trim();
    if (!dest) { toastStatus(root, 'Enter a destination first.'); return; }
    findRoute(root, origin, dest);
  });
}

function toastStatus(root, msg) {
  root.querySelector('#route-status').innerHTML = `<div class="error-box">${escapeHtml(msg)}</div>`;
}

async function findRoute(root, origin, dest) {
  const statusEl = root.querySelector('#route-status');
  const resultCard = root.querySelector('#route-result-card');
  const btn = root.querySelector('#route-go');
  btn.disabled = true;
  statusEl.innerHTML = `<div class="status-line"><span class="spinner"></span> Finding your route… usually 10–20 s</div>`;

  let rawText = '';
  try {
    rawText = await claudeCall({
      system: systemPrompt(origin),
      messages: [{ role: 'user', content: `Get from "${origin}" to "${dest}" using BTS/MRT/ARL/walking/boat.` }],
      tools: WEB_SEARCH_TOOLS,
      max_tokens: 1500,
    });
    const parsed = parseJsonLoose(rawText);
    statusEl.innerHTML = '';
    renderRoute(resultCard, parsed, origin, dest, false);
    saveHistory(origin, dest, parsed);
    renderHistory(root.querySelector('#route-history-card'), root);
  } catch (err) {
    statusEl.innerHTML = `<div class="error-box">Couldn't reach the router: ${escapeHtml(err.message)}.</div>`;
    const fallback = offlineFallback(dest);
    if (fallback) {
      renderOfflineFallback(resultCard, origin, dest, fallback);
    } else if (rawText) {
      resultCard.style.display = 'block';
      resultCard.innerHTML = `<details class="raw-fold" open><summary>Couldn't parse — raw answer below</summary><pre>${escapeHtml(rawText)}</pre></details>`;
    }
  } finally {
    btn.disabled = false;
  }
}

function offlineFallback(dest) {
  const key = Object.keys(OFFLINE_DESTINATION_GUESSES).find((k) => dest.toLowerCase().includes(k));
  return key ? OFFLINE_DESTINATION_GUESSES[key] : null;
}

function renderOfflineFallback(card, origin, dest, guess) {
  card.style.display = 'block';
  card.innerHTML = `
    <div class="banner-offline">📵 offline — verify before you go</div>
    <h3>${escapeHtml(origin)} → ${escapeHtml(dest)}</h3>
    <p>Nearest station guess: <strong>${escapeHtml(guess.station)}</strong> (${escapeHtml(guess.line)})</p>
    <p class="muted">This is a seeded offline guess, not a live route. Confirm exit number and fare once you have signal.</p>
  `;
}

function renderRoute(card, parsed, origin, dest, isHistory) {
  card.style.display = 'block';
  const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
  const stepsHtml = steps.map((s) => `
    <div class="route-step">
      <div class="route-line-mark" style="background:${lineColor(s.mode)}"></div>
      <div class="route-step-body">
        <div class="route-step-mode">${escapeHtml(s.mode || '')}</div>
        <div class="route-step-detail">${escapeHtml(s.from || '')} → ${escapeHtml(s.to || '')} ${s.direction ? '· ' + escapeHtml(s.direction) : ''}</div>
        ${s.stops ? `<div class="route-step-detail">${s.stops} stop${s.stops === 1 ? '' : 's'}</div>` : ''}
        ${s.note ? `<div class="route-step-detail">${escapeHtml(s.note)}</div>` : ''}
      </div>
    </div>
  `).join('');

  card.innerHTML = `
    <h3>${escapeHtml(origin)} → ${escapeHtml(dest)}</h3>
    ${stepsHtml || '<p class="muted">No steps returned.</p>'}
    <div style="display:flex; align-items:center; justify-content:space-between; margin-top:14px; flex-wrap:wrap; gap:10px;">
      <div>
        <div class="muted">Fare: <strong>฿${parsed.fare_thb ?? '?'}</strong> · ~${parsed.total_minutes ?? '?'} min</div>
        <div class="muted">Tap in/out with your Rabbit Card on BTS/MRT.</div>
      </div>
      ${parsed.exit ? `<span class="badge exit">🚪 ${escapeHtml(parsed.exit)}</span>` : ''}
    </div>
    ${parsed.tips ? `<p class="muted" style="margin-top:8px;">${escapeHtml(parsed.tips)}</p>` : ''}
  `;
}

function saveHistory(origin, dest, parsed) {
  const history = load(HISTORY_KEY, []);
  history.unshift({ origin, dest, parsed, ts: Date.now() });
  save(HISTORY_KEY, history.slice(0, MAX_HISTORY));
}

function renderHistory(card, root) {
  const history = load(HISTORY_KEY, []);
  if (!history.length) {
    card.innerHTML = `<h2>Recent routes</h2><div class="empty-state">No routes yet — search one above.</div>`;
    return;
  }
  card.innerHTML = `
    <h2>Recent routes</h2>
    ${history.map((h, i) => `
      <button class="history-item" data-idx="${i}">
        <span>${escapeHtml(h.origin)} → ${escapeHtml(h.dest)}</span>
        <span class="muted">${new Date(h.ts).toLocaleDateString()}</span>
      </button>
    `).join('')}
  `;
  card.querySelectorAll('.history-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const h = history[Number(btn.dataset.idx)];
      const resultCard = root.querySelector('#route-result-card');
      renderRoute(resultCard, h.parsed, h.origin, h.dest, true);
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
