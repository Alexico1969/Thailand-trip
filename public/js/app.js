import { load, save } from './store.js';

const TOOLS = ['dashboard', 'converter', 'routes', 'passport', 'planner', 'menu'];
const initialized = new Set();
const toolModules = {};

const panels = {};
TOOLS.forEach((t) => { panels[t] = document.getElementById(`panel-${t}`); });
const tabs = Array.from(document.querySelectorAll('.bb-tab'));

async function loadToolModule(tool) {
  if (toolModules[tool]) return toolModules[tool];
  const mod = await import(`./tools/${tool}.js`);
  toolModules[tool] = mod;
  return mod;
}

async function showTool(tool) {
  if (!TOOLS.includes(tool)) tool = 'dashboard';

  TOOLS.forEach((t) => {
    panels[t].classList.toggle('active', t === tool);
  });
  tabs.forEach((btn) => {
    btn.setAttribute('aria-current', String(btn.dataset.tab === tool));
  });

  if (!initialized.has(tool)) {
    initialized.add(tool);
    try {
      const mod = await loadToolModule(tool);
      if (mod && typeof mod.init === 'function') {
        await mod.init(panels[tool]);
      }
    } catch (err) {
      panels[tool].innerHTML = `<div class="error-box">This tool failed to load: ${escapeHtml(err.message || String(err))}</div>`;
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function currentTabFromHash() {
  const hash = location.hash.replace('#', '');
  return TOOLS.includes(hash) ? hash : 'dashboard';
}

tabs.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tab;
    if (location.hash.replace('#', '') === tool) {
      showTool(tool);
    } else {
      location.hash = tool;
    }
  });
});

window.addEventListener('hashchange', () => showTool(currentTabFromHash()));

// ---- Trip countdown pill + first-run trip setup ----
function updateCountdownPill() {
  const trip = load('trip', null);
  const pill = document.getElementById('countdown-pill');
  if (!trip || !trip.departure) {
    pill.textContent = '✈️ set dates';
    return;
  }
  const now = new Date();
  const dep = new Date(trip.departure + 'T00:00:00');
  const ret = trip.return ? new Date(trip.return + 'T00:00:00') : null;
  const msPerDay = 86400000;
  const daysToDep = Math.ceil((dep - now) / msPerDay);

  if (daysToDep > 0) {
    pill.textContent = `✈️ ${daysToDep} day${daysToDep === 1 ? '' : 's'}`;
  } else if (ret && now <= ret) {
    const daysLeft = Math.ceil((ret - now) / msPerDay);
    pill.textContent = `🇹🇭 ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  } else {
    pill.textContent = '🐘 welcome back';
  }
}

function openSettingsSheet() {
  const trip = load('trip', {});
  const root = document.getElementById('settings-root');
  root.innerHTML = `
    <div class="bb-sheet-backdrop" id="settings-backdrop">
      <div class="bb-sheet" role="dialog" aria-modal="true" aria-label="Trip settings">
        <button class="bb-sheet-close" id="settings-close" aria-label="Close">✕</button>
        <h2>Trip settings</h2>
        <div class="field">
          <label for="set-departure">Departure date</label>
          <input type="date" id="set-departure" value="${trip.departure || ''}">
        </div>
        <div class="field">
          <label for="set-return">Return date</label>
          <input type="date" id="set-return" value="${trip.return || ''}">
        </div>
        <div class="field">
          <label for="set-homebase">Hotel / area (home base)</label>
          <input type="text" id="set-homebase" placeholder="e.g. Sukhumvit Soi 11" value="${trip.homeBase ? escapeHtml(trip.homeBase) : ''}">
        </div>
        <button class="btn block" id="settings-save">Save</button>
      </div>
    </div>
  `;
  document.getElementById('settings-close').addEventListener('click', closeSettingsSheet);
  document.getElementById('settings-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'settings-backdrop') closeSettingsSheet();
  });
  document.getElementById('settings-save').addEventListener('click', () => {
    const departure = document.getElementById('set-departure').value;
    const ret = document.getElementById('set-return').value;
    const homeBase = document.getElementById('set-homebase').value.trim();
    save('trip', { departure, return: ret, homeBase });
    updateCountdownPill();
    closeSettingsSheet();
    window.dispatchEvent(new CustomEvent('bb:trip-updated'));
  });
}

function closeSettingsSheet() {
  document.getElementById('settings-root').innerHTML = '';
}

document.getElementById('settings-btn').addEventListener('click', openSettingsSheet);

// First run: if no trip saved yet, prompt for setup.
function maybeFirstRunSetup() {
  const trip = load('trip', null);
  if (!trip) {
    save('trip', {});
    openSettingsSheet();
  }
}

updateCountdownPill();
maybeFirstRunSetup();
setInterval(updateCountdownPill, 60 * 60 * 1000);
showTool(currentTabFromHash());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
