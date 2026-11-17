// Draws img/art/trading.svg for Mark I. Behind the name, the momentum rule
// against holding the S&P 500 from January 2022 to October 2026: +66.8%
// against +70.1%, at about half the drawdown. Around it, the 2024 test that
// removed Claude, the hash-chained ledger that ends in the kill switch, and
// the eight days from the first real order to the pause.
//
//   node tools/art/trading.mjs [out.svg]
import { plate, text, path, rng, card, W } from './lib.mjs';

const rnd = rng(11);
const C = {
  iron: '#9a774d', hi: '#e2bd8f', card: '#1e160e',
  ink: '#f1e5d3', spy: '#f6efe2', rust: '#d0683b',
};
const out = [];
const add = (s) => out.push(s);

// The chart: value 100 in January 2022, one month a step, to October 2026.
const MONTHS = 57;
const XR = 2290;
const xAt = (m) => (m / MONTHS) * XR;
const yAt = (v) => 1250 - (v - 70) * (590 / 105);
// Turning points by month. The index falls about a quarter in 2022; the rule
// about half as far. Both land on the case study's end figures.
const SPY = [[0, 100], [5, 81], [9, 76], [11, 82], [17, 94], [23, 104], [29, 118], [35, 128], [39, 113], [41, 130], [47, 148], [53, 160], [57, 170.1]];
const MOM = [[0, 100], [5, 91], [9, 88], [11, 91], [17, 96], [23, 104], [29, 116], [35, 126], [39, 119], [41, 128], [47, 145], [53, 157], [57, 166.8]];
const series = (pts, vol) => {
  const res = [];
  let e = 0;
  for (let w = 0; w <= MONTHS * 4; w += 1) {
    const m = w / 4;
    const k = Math.max(1, pts.findIndex(([pm]) => pm >= m));
    const [m0, v0] = pts[k - 1];
    const [m1, v1] = pts[k];
    const t = (m - m0) / (m1 - m0);
    const base = v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
    e = 0.75 * e + (rnd() - 0.5) * vol;
    const fade = m === 0 ? 0 : 1 - (m / MONTHS) ** 10;
    res.push([xAt(m), yAt(base + e * fade)]);
  }
  return res;
};
const spy = series(SPY, 5);
const mom = series(MOM, 3);

for (const v of [80, 100, 120, 140, 160]) {
  const y = yAt(v).toFixed(1);
  add(`<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${C.ink}" stroke-opacity="${v === 100 ? 0.3 : 0.1}" stroke-width="2"${v === 100 ? ' stroke-dasharray="10 10"' : ''}/>`);
}
for (let year = 2023; year <= 2026; year += 1) {
  const x = xAt((year - 2022) * 12).toFixed(1);
  add(`<line x1="${x}" x2="${x}" y1="${yAt(175).toFixed(1)}" y2="1250" stroke="${C.ink}" stroke-opacity="0.08" stroke-width="2"/>`);
  // Set inside the year that ends at the line, clear of the ledger to the right.
  add(text(Number(x) - 12, 1236, String(year - 1), { size: 22, mono: true, fill: C.ink, op: 0.45, anchor: 'end' }));
}
add(`<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.iron}" stop-opacity="0.55"/><stop offset="1" stop-color="${C.iron}" stop-opacity="0"/></linearGradient></defs>`);
add(`<path d="${path(mom)} L ${XR} 1250 L 0 1250 Z" fill="url(#f)"/>`);
add(`<path d="${path(spy)}" fill="none" stroke="${C.spy}" stroke-opacity="0.75" stroke-width="4" stroke-linejoin="round"/>`);
add(`<path d="${path(mom)}" fill="none" stroke="${C.hi}" stroke-width="7" stroke-linejoin="round"/>`);
const [sx, sy] = spy.at(-1);
const [mx, my] = mom.at(-1);
add(`<circle cx="${sx}" cy="${sy.toFixed(1)}" r="9" fill="${C.spy}"/><circle cx="${mx}" cy="${my.toFixed(1)}" r="11" fill="${C.hi}"/>`);
// The end figures, set under the curves' last stretch so no line runs through.
add(text(1985, 870, 'SPY, held', { size: 26, fill: C.spy, op: 0.85 }));
add(text(2305, 870, '+70.1%', { size: 26, mono: true, fill: C.spy, anchor: 'end' }));
add(text(1985, 908, 'Momentum rule', { size: 26, fill: C.hi }));
add(text(2305, 908, '+66.8%', { size: 26, mono: true, fill: C.hi, anchor: 'end' }));

// LEFT: the 2024 replay. Claude had to beat the free rule; it did not.
add(card(176, 668, 424, 350, C.card, C.iron));
add(text(200, 712, '2024 · Sharpe ratio', { size: 22, mono: true, fill: C.ink, op: 0.6 }));
[['Claude agent · removed', 1.39, 'out'], ['Momentum rule', 1.36, C.hi], ['SPY, held', 1.89, C.spy]].forEach(([name, v, fill], i) => {
  const y = 764 + i * 92;
  const w = (v * 170).toFixed(1);
  add(text(200, y, name, { size: 24, fill: C.ink, op: fill === 'out' ? 0.55 : 0.9 }));
  add(fill === 'out'
    ? `<rect x="200" y="${y + 14}" width="${w}" height="28" rx="6" fill="none" stroke="${C.hi}" stroke-width="2" stroke-dasharray="8 6"/>`
    : `<rect x="200" y="${y + 14}" width="${w}" height="28" rx="6" fill="${fill}" opacity="0.85"/>`);
  add(text(212 + Number(w), y + 37, v.toFixed(2), { size: 24, mono: true, fill: C.ink }));
});

// RIGHT: every step lands in a hash-chained ledger; a file stops new orders.
add(text(1985, 954, 'hash-chained ledger', { size: 18, mono: true, fill: C.ink, op: 0.55 }));
[['a3f1', 'rule proposes'], ['9c0e', 'verifier'], ['51bd', 'size · 2% cap'], ['e7a2', 'risk engine']].forEach(([hash, step], i) => {
  const y = 968 + i * 60;
  add(`<rect x="1985" y="${y}" width="320" height="46" rx="10" fill="${C.card}" stroke="${C.iron}" stroke-width="2"/>`);
  add(text(2005, y + 31, hash, { size: 22, mono: true, fill: C.hi }));
  add(text(2085, y + 31, step, { size: 21, fill: C.ink, op: 0.8 }));
  add(`<line x1="2040" x2="2040" y1="${y + 46}" y2="${y + 60}" stroke="${C.iron}" stroke-width="3"/>`);
});
add(`<rect x="1985" y="1208" width="320" height="46" rx="10" fill="${C.rust}"/>`);
add(text(2005, 1239, 'state/KILL', { size: 22, mono: true, fill: '#1a0f08', weight: 700 }));
add(text(2150, 1239, 'stops orders', { size: 21, fill: '#1a0f08' }));

// FOOT: the first real orders on 23 September, the pause on 1 October.
const T0 = 1560;
const T1 = 2290;
const TY = 1418;
add(`<line x1="${T0}" x2="${T1}" y1="${TY}" y2="${TY}" stroke="${C.ink}" stroke-opacity="0.35" stroke-width="2"/>`);
for (let d = 0; d <= 8; d += 1) {
  const x = T0 + (d * (T1 - T0)) / 8;
  add(`<line x1="${x}" x2="${x}" y1="${TY - 8}" y2="${TY + 8}" stroke="${C.ink}" stroke-opacity="0.35" stroke-width="2"/>`);
  add(text(x, TY + 36, String(d < 8 ? 23 + d : 1), { size: 18, mono: true, fill: C.ink, op: 0.5, anchor: 'middle' }));
}
add(`<line x1="${T0}" x2="${T1}" y1="${TY}" y2="${TY}" stroke="${C.hi}" stroke-width="4"/>`);
add(`<circle cx="${T0}" cy="${TY}" r="10" fill="${C.hi}"/><rect x="${T1 - 10}" y="${TY - 10}" width="20" height="20" fill="${C.rust}"/>`);
add(text(T0, TY - 24, '23 Sep · first real order, one share', { size: 22, fill: C.ink }));
add(text(T1, TY - 24, '1 Oct · paused', { size: 22, fill: C.ink, anchor: 'end' }));

plate('trading.svg', ['#2d2117', '#17110b', '#0a0806'], out);
