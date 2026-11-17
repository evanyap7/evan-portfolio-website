// Draws img/art/match.svg for Mark IV. On a faint pitch, replays of one
// match run left to right through its 90 minutes. Each pair shares its
// random numbers, so the real match and the what-if run together until the
// 56th minute, where the penalty is removed, and then part: the what-if
// finds a win about half as often. Around it, the answer the screen gives
// and the realism check behind the simulator.
//
//   node tools/art/match.mjs [out.svg]
import { plate, text, path, rng, card } from './lib.mjs';

const rnd = rng(37);
const C = { red: '#e3392c', hi: '#ff8070', card: '#1c0907', ink: '#f6ebe8' };
const out = [];
const add = (s) => out.push(s);

// The pitch, barely there.
{
  const s = `fill="none" stroke="${C.ink}" stroke-opacity="0.08" stroke-width="3"`;
  add(`<rect x="90" y="170" width="2220" height="1260" ${s}/>`);
  add(`<line x1="1200" x2="1200" y1="170" y2="1430" ${s}/><circle cx="1200" cy="800" r="180" ${s}/>`);
  for (const [x, d] of [[90, 1], [2310, -1]]) {
    add(`<rect x="${Math.min(x, x + d * 330)}" y="470" width="330" height="660" ${s}/>`);
    add(`<rect x="${Math.min(x, x + d * 110)}" y="650" width="110" height="300" ${s}/>`);
    add(`<path d="M ${x + d * 330} 690 A 180 180 0 0 ${d > 0 ? 1 : 0} ${x + d * 330} 910" ${s}/>`);
    add(`<circle cx="${x + d * 220}" cy="800" r="6" fill="${C.ink}" fill-opacity="0.12"/>`);
  }
}

// Minutes across, the result down: win high, draw level, loss low.
const M = (m) => 120 + (m / 90) * 2180;
const BAND = { win: 700, draw: 940, loss: 1180 };
const CALL = 56;
const ease = (t) => t * t * (3 - 2 * t);
for (let p = 0; p < 130; p += 1) {
  const u = rnd(); // the pair's shared draw
  const real = u < 0.29 ? 'win' : u < 0.58 ? 'draw' : 'loss';
  const what = u < 0.15 ? 'win' : u < 0.5 ? 'draw' : 'loss';
  const noise = Array.from({ length: 31 }, () => (rnd() - 0.5) * 34);
  const jit = (rnd() - 0.5) * 110;
  const before = [];
  let y = 940;
  for (let i = 0; i <= 18; i += 1) {
    y = 0.8 * y + 0.2 * 940 + noise[i] * 1.4;
    before.push([M(i * 3), y]);
  }
  const at56 = [M(CALL), before.at(-1)[1]];
  const after = (band) => {
    const pts = [at56];
    for (let i = 1; i <= 12; i += 1) {
      const m = CALL + (i * (90 - CALL)) / 12;
      const t = ease(i / 12);
      pts.push([M(m), at56[1] + (BAND[band] + jit - at56[1]) * t + noise[18 + i] * (1 - t)]);
    }
    return pts;
  };
  add(`<path d="${path([...before, ...after(real)])}" fill="none" stroke="${C.ink}" stroke-opacity="0.17" stroke-width="2"/>`);
  add(`<path d="${path(after(what))}" fill="none" stroke="${C.hi}" stroke-opacity="0.26" stroke-width="2"/>`);
}
// The call.
add(`<line x1="${M(CALL)}" x2="${M(CALL)}" y1="390" y2="1330" stroke="${C.hi}" stroke-width="3" stroke-dasharray="14 10"/>`);
// Labelled on its left, so a phone's crop that ends just past the line keeps it.
add(text(M(CALL) - 14, 418, '56′', { size: 30, mono: true, fill: C.hi, weight: 700, anchor: 'end' }));
// Each result is named under its band, clear of the chip above the first.
for (const [label, y] of Object.entries(BAND)) {
  add(text(2318, y + 92, label, { size: 24, fill: C.ink, op: 0.7, anchor: 'end' }));
}
add(`<line x1="1990" x2="2040" y1="1300" y2="1300" stroke="${C.ink}" stroke-opacity="0.7" stroke-width="3"/>`);
add(text(2052, 1308, 'the real match', { size: 22, fill: C.ink, op: 0.8 }));
add(`<line x1="1990" x2="2040" y1="1336" y2="1336" stroke="${C.hi}" stroke-width="3"/>`);
add(text(2052, 1344, 'penalty removed', { size: 22, fill: C.hi }));

// LEFT: what the split screen says.
add(card(176, 668, 424, 380, C.card, C.red));
add(text(200, 712, '56′ · penalty removed', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
[['real match, win chance', 29, C.ink], ['what-if', 15, C.hi]].forEach(([label, v, fill], i) => {
  const y = 756 + i * 92;
  add(text(200, y, label, { size: 21, fill: C.ink, op: 0.8 }));
  add(`<rect x="200" y="${y + 14}" width="${v * 8}" height="32" rx="6" fill="${fill}" opacity="0.9"/>`);
  add(text(214 + v * 8, y + 42, `${v}%`, { size: 34, fill, weight: 700 }));
});
add(text(200, 986, '−14 points', { size: 44, fill: C.hi, weight: 700 }));
add(text(200, 1024, '500 paired replays', { size: 20, mono: true, fill: C.ink, op: 0.6 }));

// FOOT: the realism check, per simulated match.
add(text(1520, 1384, 'per match, over 360 simulated', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
add(text(1520, 1420, '2.78 goals · 27.4 shots · 82% passes', { size: 24, mono: true, fill: C.ink }));
add(text(1520, 1454, '24.4 fouls · 3.2 yellow cards', { size: 24, mono: true, fill: C.ink }));

plate('match.svg', ['#3a0e0a', '#1e0706', '#0b0303'], out);
