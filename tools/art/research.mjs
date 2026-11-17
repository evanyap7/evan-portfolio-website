// Draws img/art/research.svg for Mark III. Behind the name, a cited brief:
// lines of text with their source pills, and under it the one finding that
// cited a source the agent never fetched, struck out in code. Around it, the
// sources it did fetch, a claim checked to a truth rating, and the five
// practice areas the engineers start from.
//
//   node tools/art/research.mjs [out.svg]
import { plate, text, rng, card } from './lib.mjs';

const rnd = rng(23);
const C = {
  green: '#1ba86c', hi: '#6fdba6', card: '#08251a', gold: '#e2b54a',
  goldHi: '#f5d88e', ink: '#e4f3ea', rust: '#e0805a', dark: '#0b1a12',
};
const out = [];
const add = (s) => out.push(s);

const pill = (x, y, label, { fill = C.gold, ink = C.dark, w = 50, h = 26, size = 17, dashed = false } = {}) =>
  (dashed
    ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="${fill}" stroke-width="2" stroke-dasharray="5 4"/>`
    : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`)
  + text(x + w / 2, y + h / 2 + size * 0.36, label, { size, mono: true, fill: dashed ? fill : ink, anchor: 'middle', weight: 700 });

// The brief. Each paragraph opens with a heading line and closes short; a
// finding ends in the pill of the source it came from.
const TOP = 476;
const PITCH = 42;
for (let k = 0; k < 20; k += 1) {
  const y = TOP + k * PITCH;
  const heading = k % 6 === 0;
  const last = k % 6 === 5;
  const end = heading ? 420 + rnd() * 380 : last ? 900 + rnd() * 900 : 2380;
  let x = 24 + rnd() * 16;
  while (x < end) {
    const w = heading ? 60 + rnd() * 140 : 26 + rnd() * 120;
    if (x + w > end) break;
    add(heading
      ? `<rect x="${x.toFixed(1)}" y="${y - 10}" width="${w.toFixed(1)}" height="20" rx="6" fill="${C.hi}" opacity="0.55"/>`
      : `<rect x="${x.toFixed(1)}" y="${y - 6}" width="${w.toFixed(1)}" height="12" rx="6" fill="${C.ink}" opacity="0.3"/>`);
    x += w + 14;
    if (!heading && rnd() < 0.07 && x + 60 < end) {
      add(pill(x, y - 13, `S${1 + Math.floor(rnd() * 4)}`));
      x += 64;
    }
  }
}
// The finding that cited S6, a page never fetched: dropped before the brief.
{
  const y = TOP + 20 * PITCH;
  let x = 612;
  while (x < 1080) {
    const w = 30 + rnd() * 90;
    add(`<rect x="${x.toFixed(1)}" y="${y - 6}" width="${Math.min(w, 1090 - x).toFixed(1)}" height="12" rx="6" fill="${C.ink}" opacity="0.3"/>`);
    x += w + 14;
  }
  add(`<line x1="604" x2="1098" y1="${y}" y2="${y}" stroke="${C.rust}" stroke-width="4" stroke-linecap="round"/>`);
  add(pill(1110, y - 13, 'S6', { fill: C.rust, dashed: true }));
}

// LEFT: what it fetched. S6 is not among them.
add(card(176, 668, 424, 350, C.card, C.green));
add(text(200, 712, 'Sources fetched', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
['PDF', 'HTML', 'PDF', 'HTML'].forEach((kind, i) => {
  const y = 736 + i * 56;
  add(pill(200, y, `S${i + 1}`, { w: 56, h: 30, size: 18 }));
  add(text(272, y + 22, kind, { size: 19, mono: true, fill: C.ink, op: 0.75 }));
  add(`<rect x="340" y="${y + 10}" width="${(140 + rnd() * 70).toFixed(1)}" height="10" rx="5" fill="${C.ink}" opacity="0.28"/>`);
  add(text(572, y + 23, '✓', { size: 22, fill: C.hi, anchor: 'end' }));
});
add(`<rect x="194" y="958" width="390" height="44" rx="12" fill="none" stroke="${C.rust}" stroke-width="2" stroke-dasharray="7 6"/>`);
add(pill(204, 965, 'S6', { fill: C.rust, dashed: true, w: 56, h: 30, size: 18 }));
add(text(274, 987, 'never fetched · dropped', { size: 20, fill: C.rust }));

// RIGHT: a claim, checked. The rating is one of the case study's examples.
// The card starts below the reach of the longest name's last letters.
add(card(1962, 744, 368, 456, C.card, C.green));
add(text(1986, 786, 'Claim check', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
add(text(1986, 832, '“Net zero by 2030”', { size: 30, fill: C.ink }));
{
  const cx = 2146;
  const cy = 990;
  const r = 105;
  const th = Math.PI * (1 - 0.72);
  const ex = cx + r * Math.cos(th);
  const ey = cy - r * Math.sin(th);
  add(`<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${C.ink}" stroke-opacity="0.14" stroke-width="20" stroke-linecap="round"/>`);
  add(`<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${C.hi}" stroke-width="20" stroke-linecap="round"/>`);
  add(text(cx, cy - 16, '72', { size: 56, fill: C.ink, anchor: 'middle', weight: 700 }));
  add(text(cx, cy + 14, 'truth rating, 0–100', { size: 17, fill: C.ink, op: 0.6, anchor: 'middle' }));
}
[['evidence for', 230, C.hi], ['against', 90, C.rust]].forEach(([label, w, fill], i) => {
  const y = 1048 + i * 38;
  add(text(1986, y + 6, label, { size: 18, fill: C.ink, op: 0.75 }));
  add(`<rect x="2110" y="${y - 8}" width="${w * 0.9}" height="16" rx="8" fill="${fill}" opacity="0.85"/>`);
});
[['verified', 104], ['refuted', 96], ['unverified', 116]].reduce((x, [label, w]) => {
  add(`<rect x="${x}" y="1124" width="${w}" height="34" rx="17" fill="none" stroke="${C.hi}" stroke-opacity="0.7" stroke-width="2"/>`);
  add(text(x + w / 2, 1147, label, { size: 17, fill: C.ink, anchor: 'middle' }));
  return x + w + 8;
}, 1986);

// FOOT: the preset practice areas.
const AREAS = [['Ports and terminals', 'HVAC and chiller plants', 'Commercial real estate'], ['SBTi targets', 'Renewables and microgrids']];
AREAS.forEach((row, r) => {
  let x = 1520;
  row.forEach((label) => {
    const w = Math.round(label.length * 10.4 + 30);
    add(`<rect x="${x}" y="${1364 + r * 50}" width="${w}" height="38" rx="19" fill="#0f3a28" stroke="${C.hi}" stroke-width="2"/>`);
    add(text(x + w / 2, 1364 + r * 50 + 26, label, { size: 19, fill: C.ink, anchor: 'middle' }));
    x += w + 12;
  });
});

plate('research.svg', ['#11382a', '#091f16', '#030c08'], out);
