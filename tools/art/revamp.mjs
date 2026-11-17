// Draws img/art/revamp.svg for Mark V. Behind the name, the kind of field
// the redesign's Three.js scene drew: a mesh of nodes in depth, and the
// bright trail a drag leaves through it. Around it, the stress test that
// spikes and settles, the nine pages and their seven languages, and the three
// executive tools along the foot.
//
//   node tools/art/revamp.mjs [out.svg]
import { plate, text, rng, card } from './lib.mjs';

const rnd = rng(53);
const C = {
  purple: '#8150d8', hi: '#bb95ff', lo: '#2d1656', card: '#150a2a',
  silver: '#c3c8d2', ink: '#eee8f8',
};
const out = [];
const add = (s) => out.push(s);

// Where the pictures sit; the mesh keeps out of them.
const BOXES = [[160, 650, 460, 400], [1940, 720, 410, 560], [1500, 1340, 850, 140]];
const clear = (x, y) => !BOXES.some(([bx, by, bw, bh]) => x > bx - 30 && x < bx + bw + 30 && y > by - 30 && y < by + bh + 30);

// The mesh: nodes at a depth z, near ones larger and brighter.
const nodes = [];
while (nodes.length < 260) {
  const x = rnd() * 2400;
  const y = 380 + rnd() * 1000;
  if (clear(x, y)) nodes.push({ x, y, z: rnd() });
}
add('<defs><filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter></defs>');
const seen = new Set();
for (const [i, a] of nodes.entries()) {
  nodes
    .map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)])
    .filter(([j, d]) => j !== i && d < 190)
    .sort((p, q) => p[1] - q[1])
    .slice(0, 3)
    .forEach(([j]) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) return;
      seen.add(key);
      const b = nodes[j];
      const op = (0.08 + 0.2 * Math.min(a.z, b.z)).toFixed(2);
      add(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${C.hi}" stroke-opacity="${op}" stroke-width="1.5"/>`);
    });
}
for (const { x, y, z } of nodes) {
  add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + 5 * z).toFixed(1)}" fill="${z > 0.7 ? C.hi : C.silver}" opacity="${(0.25 + 0.6 * z).toFixed(2)}"/>`);
}

// The drag: a ribbon of light through the mesh, sparks thrown off its path.
const RIBBON = 'M -40 1240 C 400 1300, 600 560, 1100 700 S 1700 1000, 1940 420';
add(`<path d="${RIBBON}" fill="none" stroke="${C.purple}" stroke-width="34" stroke-linecap="round" opacity="0.55" filter="url(#glow)"/>`);
add(`<path d="${RIBBON}" fill="none" stroke="${C.hi}" stroke-width="8" stroke-linecap="round"/>`);
add(`<path d="${RIBBON}" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>`);
{
  // Sample the curve's two cubic segments for the sparks.
  const cubic = (p0, p1, p2, p3, t) => {
    const s = 1 - t;
    return p0 * s * s * s + 3 * p1 * s * s * t + 3 * p2 * s * t * t + p3 * t * t * t;
  };
  const segs = [
    [[-40, 1240], [400, 1300], [600, 560], [1100, 700]],
    [[1100, 700], [1600, 840], [1700, 1000], [1940, 420]],
  ];
  for (let k = 0; k < 70; k += 1) {
    const [a, b, c, d] = segs[k % 2];
    const t = rnd();
    const x = cubic(a[0], b[0], c[0], d[0], t) + (rnd() - 0.5) * 90;
    const y = cubic(a[1], b[1], c[1], d[1], t) + (rnd() - 0.5) * 90;
    if (clear(x, y)) add(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.5 + rnd() * 3.5).toFixed(1)}" fill="#fff" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`);
  }
}

// A counter drum: the digit it shows, with its neighbours rolling past.
const drum = (x, y, w, h, d, size) => {
  add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 7}" fill="${C.lo}" stroke="${C.hi}" stroke-opacity="0.5" stroke-width="2"/>`);
  add(text(x + w / 2, y + h * 0.23, String((d + 9) % 10), { size: size / 2, mono: true, fill: C.ink, op: 0.25, anchor: 'middle' }));
  add(text(x + w / 2, y + h * 0.64, String(d), { size, mono: true, fill: C.ink, anchor: 'middle', weight: 700 }));
  add(text(x + w / 2, y + h * 0.93, String((d + 1) % 10), { size: size / 2, mono: true, fill: C.ink, op: 0.25, anchor: 'middle' }));
};

// LEFT: the Interactive Lab's grid stress test, its readout settling on 11.
add(card(176, 668, 424, 350, C.card, C.purple));
add(text(200, 712, 'Grid stress test', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
drum(200, 736, 88, 150, 1, 72);
drum(300, 736, 88, 150, 1, 72);
add(text(404, 832, 'ms', { size: 40, fill: C.hi }));
// The spike, then the settle.
add(`<path d="M 200 960 L 300 960 L 318 912 L 336 990 L 352 948 L 368 966 L 384 958 L 576 960" fill="none" stroke="${C.hi}" stroke-width="3" stroke-linejoin="round"/>`);
add(text(200, 918, 'Spikes the telemetry', { size: 20, fill: C.ink, op: 0.8 }));
add(text(576, 996, 'resolves in 11 ms', { size: 20, fill: C.ink, op: 0.8, anchor: 'end' }));

// RIGHT: nine pages, seven languages. The card starts below the longest name.
add(card(1962, 744, 368, 446, C.card, C.purple));
add(text(1986, 786, 'Nine pages', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
for (let r = 0; r < 3; r += 1) {
  for (let c = 0; c < 3; c += 1) {
    const x = 1986 + c * 110;
    const y = 806 + r * 76;
    add(`<rect x="${x}" y="${y}" width="100" height="66" rx="6" fill="${C.lo}" stroke="${C.silver}" stroke-opacity="0.35" stroke-width="1.5"/>`);
    add(`<rect x="${x + 8}" y="${y + 10}" width="${30 + ((r * 3 + c) * 17) % 40}" height="8" rx="4" fill="${C.hi}" opacity="0.8"/>`);
    add(`<rect x="${x + 8}" y="${y + 26}" width="84" height="22" rx="3" fill="${C.purple}" opacity="${(0.35 + ((r + c) % 3) * 0.15).toFixed(2)}"/>`);
    add(`<rect x="${x + 8}" y="${y + 54}" width="${50 + ((r + 2 * c) * 11) % 30}" height="5" rx="2.5" fill="${C.silver}" opacity="0.5"/>`);
  }
}
add(text(1986, 1062, 'seven languages, one engine', { size: 19, fill: C.ink, op: 0.75 }));
['EN', 'DE', 'FR', 'JA', 'NL', 'NO', 'ZH'].forEach((lang, i) => {
  const x = 1986 + (i % 4) * 82;
  const y = 1080 + Math.floor(i / 4) * 46;
  add(`<rect x="${x}" y="${y}" width="72" height="36" rx="18" fill="${i === 0 ? C.hi : 'none'}" stroke="${C.hi}" stroke-width="2"/>`);
  add(text(x + 36, y + 25, lang, { size: 18, mono: true, fill: i === 0 ? C.card : C.ink, anchor: 'middle', weight: 700 }));
});

// FOOT: the three executive tools. The counters are drawn mid-roll, on no
// figure in particular.
const FY = 1384;
add(text(1520, FY, 'ROI modeler', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
add(`<line x1="1520" x2="1760" y1="1430" y2="1430" stroke="${C.silver}" stroke-opacity="0.4" stroke-width="6" stroke-linecap="round"/>`);
add(`<line x1="1520" x2="1680" y1="1430" y2="1430" stroke="${C.hi}" stroke-width="6" stroke-linecap="round"/>`);
add(`<circle cx="1680" cy="1430" r="13" fill="#fff" stroke="${C.hi}" stroke-width="3"/>`);
add(text(1810, FY, 'Ops simulator', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
{
  const pts = [];
  for (let i = 0; i <= 24; i += 1) pts.push(`${(1810 + i * 10).toFixed(0)} ${(1440 - 18 * Math.sin(i * 0.55) - i * 0.9 - rnd() * 8).toFixed(1)}`);
  add(`<polyline points="${pts.join(' ')}" fill="none" stroke="${C.hi}" stroke-width="3" stroke-linejoin="round"/>`);
}
add(text(2100, FY, 'Live counters', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
for (let i = 0; i < 5; i += 1) {
  const x = 2100 + i * 46;
  add(`<rect x="${x}" y="1400" width="40" height="58" rx="6" fill="${C.lo}" stroke="${C.hi}" stroke-opacity="0.5" stroke-width="1.5"/>`);
  for (let k = 0; k < 3; k += 1) {
    add(`<rect x="${x + 10}" y="${1408 + k * 16}" width="20" height="10" rx="3" fill="${C.ink}" opacity="${k === 1 ? 0.75 : 0.25}"/>`);
  }
}

plate('revamp.svg', ['#2a1550', '#160b2c', '#080412'], out);
