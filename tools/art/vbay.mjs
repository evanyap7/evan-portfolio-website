// Draws img/art/vbay.svg for Mark VI. Behind the name, a voice-phishing
// network: callers wired to the hubs that run them, and among them the
// honeypot, which answers and traces the calls it takes back to their
// callers. Around it, an incoming call, the market drawn to scale, and the
// window in which the model breaks even.
//
//   node tools/art/vbay.mjs [out.svg]
import { plate, text, rng, card } from './lib.mjs';

const rnd = rng(71);
const C = { gold: '#dcab3e', hi: '#f4d27e', card: '#15130e', ink: '#f1e9d8', dim: '#8d8676' };
const out = [];
const add = (s) => out.push(s);

const BOXES = [[160, 650, 460, 400], [1940, 720, 410, 520], [1500, 1340, 850, 140]];
const clear = (x, y) => !BOXES.some(([bx, by, bw, bh]) => x > bx - 30 && x < bx + bw + 30 && y > by - 30 && y < by + bh + 30);

// The rings: six hubs, each running its own callers.
const HUBS = [[380, 470], [760, 1210], [1420, 470], [1650, 1180], [2120, 520], [260, 1260]];
const POT = [1000, 860];
const callers = [];
while (callers.length < 170) {
  const h = HUBS[Math.floor(rnd() * HUBS.length)];
  const a = rnd() * Math.PI * 2;
  const r = 60 + rnd() * 300;
  const x = h[0] + Math.cos(a) * r * 1.4;
  const y = h[1] + Math.sin(a) * r * 0.8;
  if (x > 20 && x < 2380 && y > 380 && y < 1360 && clear(x, y) && Math.hypot(x - POT[0], y - POT[1]) > 130) callers.push({ x, y, h });
}
for (const { x, y, h } of callers) {
  add(`<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${h[0]}" y2="${h[1]}" stroke="${C.dim}" stroke-opacity="0.35" stroke-width="1.5"/>`);
}
// Hubs talk to each other.
for (let i = 0; i < HUBS.length; i += 1) {
  const [a, b] = [HUBS[i], HUBS[(i + 2) % HUBS.length]];
  add(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${C.dim}" stroke-opacity="0.18" stroke-width="2"/>`);
}
// The honeypot traces 24 of the calls it answered back to their callers.
const traced = callers
  .map((c) => [c, Math.hypot(c.x - POT[0], c.y - POT[1])])
  .sort((p, q) => p[1] - q[1])
  .slice(0, 24)
  .map(([c]) => c);
for (const { x, y } of traced) {
  add(`<line x1="${POT[0]}" y1="${POT[1]}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.hi}" stroke-opacity="0.7" stroke-width="2" stroke-dasharray="8 7"/>`);
}
for (const c of callers) {
  const hit = traced.includes(c);
  add(`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${hit ? 7 : 5}" fill="${hit ? C.hi : C.ink}" opacity="${hit ? 0.95 : 0.35}"/>`);
}
for (const [x, y] of HUBS) {
  add(`<circle cx="${x}" cy="${y}" r="22" fill="${C.card}" stroke="${C.ink}" stroke-opacity="0.5" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="${C.ink}" opacity="0.6"/>`);
}
for (const [r, op] of [[150, 0.12], [110, 0.2], [72, 0.35]]) {
  add(`<circle cx="${POT[0]}" cy="${POT[1]}" r="${r}" fill="none" stroke="${C.gold}" stroke-opacity="${op}" stroke-width="3"/>`);
}
add(`<circle cx="${POT[0]}" cy="${POT[1]}" r="36" fill="${C.gold}"/>`);
add(text(POT[0], POT[1] + 9, 'AI', { size: 26, fill: C.card, anchor: 'middle', weight: 700 }));

// LEFT: the call the honeypot takes.
add(card(176, 668, 424, 350, C.card, C.gold));
add(text(200, 712, 'Incoming call', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
add(text(200, 770, '+84 ••• ••• •••', { size: 38, mono: true, fill: C.ink }));
for (let i = 0; i < 44; i += 1) {
  const h = 4 + 34 * Math.abs(Math.sin(i * 0.7) * Math.cos(i * 0.23)) * (0.6 + 0.4 * rnd());
  add(`<rect x="${200 + i * 8.6}" y="${(860 - h).toFixed(1)}" width="5" height="${(2 * h).toFixed(1)}" rx="2.5" fill="${C.hi}" opacity="0.85"/>`);
}
add(`<circle cx="232" cy="960" r="28" fill="${C.gold}"/>`);
add(`<path d="M 220 950 q 4 -8 10 -4 l 4 6 q 2 4 -2 6 q 2 8 10 12 q 2 -4 6 -2 l 6 4 q 4 6 -4 10 q -24 0 -30 -32 Z" fill="${C.card}"/>`);
add(text(276, 968, 'answered by the honeypot', { size: 22, fill: C.hi }));

// RIGHT: the market, with the circles' areas in proportion.
add(card(1962, 744, 368, 492, C.card, C.gold));
add(text(1986, 786, 'Market sizing, to scale', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
{
  const R = 165;
  const r = R * Math.sqrt(7.5 / 350); // 24.15
  const cx = 2146;
  const cy = 980;
  add(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${C.gold}" fill-opacity="0.14" stroke="${C.gold}" stroke-width="3"/>`);
  add(text(cx, cy - 40, '$350M', { size: 48, fill: C.ink, anchor: 'middle', weight: 700 }));
  add(text(cx, cy - 6, 'TAM · 2027', { size: 20, mono: true, fill: C.ink, op: 0.7, anchor: 'middle' }));
  const sy = cy + R - r;
  add(`<circle cx="${cx}" cy="${sy.toFixed(2)}" r="${r.toFixed(2)}" fill="${C.hi}"/>`);
  add(text(cx, sy - r - 16, '$7.5M SOM', { size: 22, fill: C.hi, anchor: 'middle', weight: 700 }));
}
add(text(1986, 1206, 'circles drawn to scale', { size: 18, fill: C.ink, op: 0.55 }));

// FOOT: months to break-even, projected at 24 to 36.
const T0 = 1560;
const T1 = 2290;
const TY = 1420;
const X = (m) => T0 + (m / 48) * (T1 - T0);
add(`<rect x="${X(24)}" y="${TY - 16}" width="${X(36) - X(24)}" height="32" rx="6" fill="${C.gold}" opacity="0.9"/>`);
add(`<line x1="${T0}" x2="${T1}" y1="${TY}" y2="${TY}" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="2"/>`);
for (let m = 0; m <= 48; m += 12) {
  add(`<line x1="${X(m)}" x2="${X(m)}" y1="${TY - 8}" y2="${TY + 8}" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="2"/>`);
  add(text(X(m), TY + 38, String(m), { size: 18, mono: true, fill: C.ink, op: 0.6, anchor: 'middle' }));
}
add(text(T0, TY - 30, 'Months to break-even', { size: 22, fill: C.ink }));
add(text(X(30), TY - 30, '24–36', { size: 22, fill: C.hi, anchor: 'middle', weight: 700 }));

plate('vbay.svg', ['#2a2416', '#16130c', '#080705'], out);
