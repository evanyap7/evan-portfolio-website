// A slim market strip under the hero: BTC live from Coinbase's public price
// feed, the STI and VIX delayed through /api/quotes (api/quotes.js).
//
// It shows only numbers that were really fetched. Nothing is invented while a
// request is pending, and a source that fails is left out; with no data at all
// the strip is never added, so the page is exactly what it was. The looping
// copy is hidden from screen readers so the figures are read once.

import { whenActive } from './gate.js';

const root = document.documentElement;
const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)');
const COINBASE = 'https://api.coinbase.com/v2/prices/BTC-USD/spot';
const REFRESH_MS = 15000;
const ORDER = ['BTC', 'STI', 'VIX'];

const state = new Map(); // sym -> { label, price, pct, live }

function format(price) {
  return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function itemHtml(sym, entry) {
  const dir = entry.pct == null ? '' : entry.pct >= 0 ? 'up' : 'down';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
  const pct = entry.pct == null ? '' : `${arrow} ${Math.abs(entry.pct).toFixed(2)}%`;
  const tag = entry.live ? 'live' : 'delayed';
  return `<span class="ticker__item" data-sym="${sym}" data-dir="${dir}">
    <span class="ticker__sym">${entry.label}</span>
    <span class="ticker__price">${format(entry.price)}</span>
    <span class="ticker__pct">${pct}</span>
    <span class="ticker__tag ticker__tag--${tag}">${tag}</span>
  </span>`;
}

let strip = null;

function render() {
  const items = ORDER.filter((sym) => state.has(sym)).map((sym) => itemHtml(sym, state.get(sym))).join('');
  if (!items) return;
  if (strip) {
    // Patch the figures in place: rebuilding would restart the loop.
    ORDER.filter((sym) => state.has(sym)).forEach((sym) => {
      const entry = state.get(sym);
      strip.querySelectorAll(`[data-sym="${sym}"]`).forEach((item) => {
        item.dataset.dir = entry.pct == null ? '' : entry.pct >= 0 ? 'up' : 'down';
        item.querySelector('.ticker__price').textContent = format(entry.price);
      });
    });
    return;
  }
  const hero = document.querySelector('.hero');
  if (!hero) return;
  strip = document.createElement('div');
  strip.className = 'ticker';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Market snapshot');
  hero.after(strip);
  requestAnimationFrame(() => strip.classList.add('is-in'));
  // Twice, so the loop has no gap; the copy is hidden from screen readers.
  const copies = REDUCE.matches ? 1 : 2;
  strip.innerHTML = Array.from({ length: copies }, (_, i) =>
    `<div class="ticker__track"${i ? ' aria-hidden="true"' : ''}>${items}</div>`).join('');
}

async function getJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

async function loadDelayed() {
  try {
    const { quotes } = await getJson('/api/quotes');
    quotes.forEach((q) => {
      const btc = state.get('BTC');
      if (q.sym === 'BTC' && btc) {
        btc.pct = q.pct; // BTC's day change comes from here; its price stays the live one
      } else {
        state.set(q.sym, { label: q.label, price: q.price, pct: q.pct, live: false });
      }
    });
  } catch { /* no function (local server) or no network: leave these out */ }
}

async function loadBtc() {
  try {
    const { data } = await getJson(COINBASE);
    const price = Number(data.amount);
    if (!Number.isFinite(price)) return;
    const prior = state.get('BTC');
    state.set('BTC', { label: 'BTC', price, pct: prior ? prior.pct : null, live: true });
  } catch { /* keep the last price, or leave BTC out */ }
}

export function initTicker() {
  if (!root.classList.contains('lab')) return;
  whenActive(async () => {
    // BTC first, so the delayed feed's BTC row only supplies the day change.
    await loadBtc();
    await loadDelayed();
    render();
    setInterval(async () => {
      if (document.hidden || !strip) return;
      await loadBtc();
      render();
    }, REFRESH_MS);
  });
}
