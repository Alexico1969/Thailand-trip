// Exchange rate fetch + daily cache. Frankfurter is free and keyless.
// Note: api.frankfurter.app 301-redirects to api.frankfurter.dev, and the
// redirect response itself carries no CORS headers (only the .dev origin
// does), so browsers block the redirected fetch. Call .dev directly.
import { load, save } from './store.js';

const FRANKFURTER_BASE = 'https://api.frankfurter.dev/v1';

const LATEST_KEY = 'rates:latest';
const TREND_KEY = 'rates:trend30d';

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStamp(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Returns { thb, eur, date, offline }
export async function getLatestRates() {
  const cached = load(LATEST_KEY, null);
  try {
    const res = await fetch(`${FRANKFURTER_BASE}/latest?from=USD&to=THB,EUR`);
    if (!res.ok) throw new Error(`rate fetch failed (${res.status})`);
    const data = await res.json();
    const fresh = {
      thb: data.rates.THB,
      eur: data.rates.EUR,
      date: data.date || todayStamp(),
      offline: false,
    };
    save(LATEST_KEY, fresh);
    return fresh;
  } catch (err) {
    if (cached) return { ...cached, offline: true };
    throw new Error('No exchange rate available (offline and no cached rate yet).');
  }
}

// Returns array of { date, thb } for the last 30 days, oldest first.
export async function getTrend30d() {
  const cached = load(TREND_KEY, null);
  try {
    const from = daysAgoStamp(30);
    const res = await fetch(`${FRANKFURTER_BASE}/${from}..?from=USD&to=THB`);
    if (!res.ok) throw new Error(`trend fetch failed (${res.status})`);
    const data = await res.json();
    const series = Object.entries(data.rates || {})
      .map(([date, r]) => ({ date, thb: r.THB }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    save(TREND_KEY, series);
    return series;
  } catch (err) {
    if (cached) return cached;
    return [];
  }
}

// Instant, fully offline conversion using whatever rate is cached.
export function convertOffline(thbAmount, cachedRate) {
  if (!cachedRate) return null;
  const usd = thbAmount / cachedRate.thb;
  const eur = usd * cachedRate.eur;
  return { usd, eur };
}
