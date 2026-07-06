import { load, save, toast } from '../store.js';
import { getLatestRates, getTrend30d } from '../rates.js';

const TODO_SEED = [
  { id: 't1', text: 'Get International Driving Permit (AAA)', done: false },
  { id: 't2', text: 'Order/activate eSIM before departure', done: false },
  { id: 't3', text: 'Plan currency: exchange at Suvarnabhumi B Floor near the Airport Rail Link (better rates than terminal counters); SuperRich in the city', done: false },
  { id: 't4', text: 'Get Rabbit Card at any BTS station for BTS/MRT', done: false },
  { id: 't5', text: 'Charge & pack translation earbuds (Thai needs online mode — confirm eSIM data works with them)', done: false },
  { id: 't6', text: 'Download offline Google Maps area for Bangkok', done: false },
];

const DOC_SEED = [
  { id: 'd1', text: 'Passport (valid 6+ months beyond entry)', done: false },
  { id: 'd2', text: 'Green card — required for US re-entry', done: false },
  { id: 'd3', text: 'International Driving Permit + home license', done: false },
  { id: 'd4', text: 'Travel insurance details', done: false },
  { id: 'd5', text: 'Hotel booking confirmation (first night address for arrival card)', done: false },
];

const WMO_ICONS = {
  0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌦️',
  56: '🌦️', 57: '🌦️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️',
  71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function wmoIcon(code) { return WMO_ICONS[code] || '🌡️'; }
function cToF(c) { return Math.round((c * 9) / 5 + 32); }

export async function init(root) {
  root.innerHTML = `
    <div class="card" id="weather-card"><h2>Bangkok weather</h2><div class="status-line"><span class="spinner"></span> Loading forecast…</div></div>
    <div class="card" id="rate-card"><h2>Exchange rate</h2><div class="status-line"><span class="spinner"></span> Loading rates…</div></div>
    <div class="card" id="todo-card"></div>
    <div class="card" id="doc-card"></div>
  `;

  renderChecklist(root.querySelector('#todo-card'), 'todo', 'Pre-trip to-dos', TODO_SEED);
  renderChecklist(root.querySelector('#doc-card'), 'docs', 'Document checklist', DOC_SEED);

  loadWeather(root.querySelector('#weather-card'));
  loadRates(root.querySelector('#rate-card'));
}

async function loadWeather(card) {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=13.7563&longitude=100.5018&current=temperature_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=Asia%2FBangkok&forecast_days=7';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`weather fetch failed (${res.status})`);
    const data = await res.json();

    const curC = Math.round(data.current.temperature_2m);
    const curF = cToF(data.current.temperature_2m);
    const curIcon = wmoIcon(data.current.weather_code);

    const days = data.daily.time.map((date, i) => ({
      date,
      hiC: Math.round(data.daily.temperature_2m_max[i]),
      loC: Math.round(data.daily.temperature_2m_min[i]),
      hiF: cToF(data.daily.temperature_2m_max[i]),
      loF: cToF(data.daily.temperature_2m_min[i]),
      pop: data.daily.precipitation_probability_max[i],
      icon: wmoIcon(data.daily.weather_code[i]),
    }));

    card.innerHTML = `
      <h2>Bangkok weather</h2>
      <div class="weather-now">
        <div class="icon" style="font-size:2.2rem;">${curIcon}</div>
        <div>
          <div class="temp">${curC}°C <span class="muted" style="font-size:1.1rem;">(${curF}°F)</span></div>
          <div class="cond">Now · ${Math.round(data.current.precipitation * 10) / 10}mm precip</div>
        </div>
      </div>
      <div class="weather-strip">
        ${days.map((d) => `
          <div class="weather-day">
            <div>${new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class="icon">${d.icon}</div>
            <div class="hi">${d.hiC}°/${d.hiF}°F</div>
            <div class="lo">${d.loC}°</div>
            <div class="muted">${d.pop}%💧</div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (err) {
    card.innerHTML = `<h2>Bangkok weather</h2><div class="error-box">Couldn't load the forecast (${escapeHtml(err.message)}). Check your connection.</div>`;
  }
}

async function loadRates(card) {
  try {
    const rates = await getLatestRates();
    const trend = await getTrend30d();
    const sparkline = trend.length > 1 ? buildSparkline(trend) : '';

    card.innerHTML = `
      <h2>Exchange rate</h2>
      ${rates.offline ? `<div class="banner-offline">Showing rate from ${rates.date} (offline)</div>` : ''}
      <div class="rate-row">
        <div>
          <div class="rate-big">฿${rates.thb.toFixed(2)}</div>
          <div class="rate-sub">per 1 USD · as of ${rates.date}</div>
        </div>
        <div class="rate-sub">€1 = $${(1 / rates.eur).toFixed(2)} · $1 = €${rates.eur.toFixed(3)}</div>
      </div>
      <div class="rate-sub" style="margin-top:4px;">฿1,000 ≈ <strong>$${(1000 / rates.thb).toFixed(2)}</strong></div>
      ${sparkline}
      <div class="rate-sub" style="margin-top:6px;">30-day trend, USD→THB</div>
    `;
  } catch (err) {
    card.innerHTML = `<h2>Exchange rate</h2><div class="error-box">${escapeHtml(err.message)}</div>`;
  }
}

function buildSparkline(trend) {
  const vals = trend.map((t) => t.thb);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 300, h = 48, pad = 4;
  const points = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${points}" fill="none" stroke="#0E7C7B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function renderChecklist(card, storeKey, title, seed) {
  const items = load(`checklist:${storeKey}`, null) || seed;
  if (!load(`checklist:${storeKey}`, null)) save(`checklist:${storeKey}`, items);

  function paint() {
    const list = load(`checklist:${storeKey}`, seed);
    const doneCount = list.filter((i) => i.done).length;
    const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;
    card.innerHTML = `
      <div class="card-title-row"><h2>${title}</h2></div>
      <div class="progress-label">${doneCount}/${list.length} done</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <ul class="check-list">
        ${list.map((item) => `
          <li class="${item.done ? 'done' : ''}" data-id="${item.id}">
            <input type="checkbox" ${item.done ? 'checked' : ''} aria-label="Mark done">
            <span class="item-text">${escapeHtml(item.text)}</span>
            <button class="del-btn" aria-label="Delete">✕</button>
          </li>
        `).join('')}
      </ul>
      <div class="field" style="margin-top:10px; display:flex; gap:8px;">
        <input type="text" placeholder="Add item…" id="add-${storeKey}" style="flex:1;">
        <button class="btn small" id="addbtn-${storeKey}">Add</button>
      </div>
    `;

    card.querySelectorAll('.check-list input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const li = cb.closest('li');
        const id = li.dataset.id;
        const current = load(`checklist:${storeKey}`, seed);
        const target = current.find((i) => i.id === id);
        if (target) target.done = cb.checked;
        save(`checklist:${storeKey}`, current);
        paint();
      });
    });

    card.querySelectorAll('.del-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const li = btn.closest('li');
        const id = li.dataset.id;
        const current = load(`checklist:${storeKey}`, seed).filter((i) => i.id !== id);
        save(`checklist:${storeKey}`, current);
        paint();
      });
    });

    const addBtn = card.querySelector(`#addbtn-${storeKey}`);
    const addInput = card.querySelector(`#add-${storeKey}`);
    const addItem = () => {
      const text = addInput.value.trim();
      if (!text) return;
      const current = load(`checklist:${storeKey}`, seed);
      current.push({ id: `${storeKey}-${Date.now()}`, text, done: false });
      save(`checklist:${storeKey}`, current);
      paint();
    };
    addBtn.addEventListener('click', addItem);
    addInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addItem(); });
  }

  paint();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
