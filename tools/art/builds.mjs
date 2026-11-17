// Draws img/art/builds.svg for Mark VII, which holds two builds. Behind the
// name, Dragon Tiles: the sculpture's piano keys laid along a dragon's back
// on a CAD grid, pressed in turn, the wave lit where it has reached. Around
// it, WatchPartyyy: the extension's three scripts, and the relay holding a
// room's state so a pause reaches every player at once.
//
//   node tools/art/builds.mjs [out.svg]
import { plate, text, card } from './lib.mjs';

const C = {
  navy: '#3566c4', hi: '#8db3f0', lo: '#14284f', card: '#0a1730',
  steel: '#b2c2d9', ink: '#e8eef8', key: '#dfe6f1',
};
const out = [];
const add = (s) => out.push(s);

// The CAD grid.
for (let v = 0; v <= 2400; v += 80) {
  const op = v % 400 === 0 ? 0.13 : 0.05;
  add(`<line x1="${v}" x2="${v}" y1="0" y2="1600" stroke="${C.steel}" stroke-opacity="${op}" stroke-width="1.5"/>`);
  if (v <= 1600) add(`<line x1="0" x2="2400" y1="${v}" y2="${v}" stroke="${C.steel}" stroke-opacity="${op}" stroke-width="1.5"/>`);
}

// The dragon's back, and a key every 66 units along it.
const Y = (x) => 900 + 250 * Math.sin((x / 2400) * Math.PI * 2 * 1.1 + 0.4);
const slope = (x) => Math.atan2(Y(x + 1) - Y(x - 1), 2) * (180 / Math.PI);
const keys = [];
{
  let s = 0;
  let next = 0;
  let px = -60;
  let py = Y(px);
  for (let x = -60; x <= 2460; x += 1) {
    const y = Y(x);
    s += Math.hypot(x - px, y - py);
    if (s >= next) {
      keys.push({ x, y, ang: slope(x) });
      next += 66;
    }
    px = x;
    py = y;
  }
}
add(`<path d="${keys.map((k, i) => `${i ? 'L' : 'M'} ${k.x} ${k.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${C.steel}" stroke-opacity="0.35" stroke-width="2" stroke-dasharray="10 8" transform="translate(0 172)"/>`);
const WAVE = 24; // the key being pressed now; the six before it still glow
keys.forEach((k, i) => {
  const lit = i <= WAVE && i > WAVE - 7 ? 1 - (WAVE - i) / 7 : 0;
  const press = i === WAVE ? 12 : 6 * lit;
  const fill = lit > 0 ? C.hi : C.key;
  const op = lit > 0 ? (0.45 + 0.5 * lit).toFixed(2) : '0.28';
  add(`<g transform="translate(${k.x} ${k.y.toFixed(1)}) rotate(${k.ang.toFixed(1)})">`
    + `<rect x="-29" y="${(-150 + press).toFixed(1)}" width="58" height="300" rx="8" fill="${fill}" fill-opacity="${op}" stroke="${C.steel}" stroke-opacity="0.5" stroke-width="2"/></g>`);
});
// Black keys sit between whites, two then three in each octave.
keys.forEach((k, i) => {
  if (i === keys.length - 1 || ![0, 1, 3, 4, 5].includes(i % 7)) return;
  const x = (k.x + keys[i + 1].x) / 2;
  add(`<g transform="translate(${x} ${Y(x).toFixed(1)}) rotate(${slope(x).toFixed(1)})"><rect x="-18" y="-150" width="36" height="180" rx="5" fill="${C.lo}" stroke="${C.steel}" stroke-opacity="0.45" stroke-width="2"/></g>`);
});

// LEFT: WatchPartyyy's three scripts, each with one job.
add(card(176, 668, 424, 350, C.card, C.navy));
add(text(200, 712, 'WatchPartyyy', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
[['page.js', 'drives Netflix'], ['content.js', 'watches the video'], ['background.js', 'holds the socket']].forEach(([file, job], i) => {
  const y = 734 + i * 90;
  add(`<rect x="200" y="${y}" width="376" height="58" rx="12" fill="${C.lo}" stroke="${C.hi}" stroke-opacity="0.5" stroke-width="2"/>`);
  add(text(220, y + 37, file, { size: 22, mono: true, fill: C.hi }));
  add(text(556, y + 37, job, { size: 20, fill: C.ink, op: 0.8, anchor: 'end' }));
  if (i < 2) add(`<path d="M 260 ${y + 62} L 260 ${y + 86} M 252 ${y + 78} L 260 ${y + 86} L 268 ${y + 78}" fill="none" stroke="${C.hi}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
});
add(text(200, 1000, '→ to the relay, on Fly.io', { size: 19, fill: C.ink, op: 0.6 }));

// RIGHT: the relay holds the room; every player stops at the same frame.
add(card(1962, 744, 368, 400, C.card, C.navy));
add(text(1986, 786, 'Relay · room state', { size: 20, mono: true, fill: C.ink, op: 0.6 }));
const HEAD = 0.62;
['you', 'friend', 'friend'].forEach((who, i) => {
  const y = 816 + i * 82;
  add(`<rect x="1986" y="${y}" width="320" height="64" rx="10" fill="${C.lo}"/>`);
  add(`<rect x="2002" y="${y + 18}" width="7" height="22" rx="2" fill="${C.ink}"/><rect x="2014" y="${y + 18}" width="7" height="22" rx="2" fill="${C.ink}"/>`);
  add(text(2036, y + 36, who, { size: 19, fill: C.ink, op: 0.75 }));
  add(`<line x1="2120" x2="2290" y1="${y + 32}" y2="${y + 32}" stroke="${C.steel}" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>`);
  add(`<line x1="2120" x2="${2120 + 170 * HEAD}" y1="${y + 32}" y2="${y + 32}" stroke="${C.hi}" stroke-width="5" stroke-linecap="round"/>`);
});
add(`<line x1="${2120 + 170 * HEAD}" x2="${2120 + 170 * HEAD}" y1="806" y2="1062" stroke="${C.hi}" stroke-width="2" stroke-dasharray="6 5"/>`);
add(text(1986, 1112, 'paused for everyone', { size: 24, fill: C.hi, weight: 700 }));

// FOOT: the three controls, and whose keys these are.
{
  const y = 1396;
  add(`<path d="M 1520 ${y - 18} L 1546 ${y} L 1520 ${y + 18} Z" fill="${C.hi}"/>`);
  add(`<rect x="1566" y="${y - 18}" width="9" height="36" rx="2" fill="${C.hi}"/><rect x="1582" y="${y - 18}" width="9" height="36" rx="2" fill="${C.hi}"/>`);
  add(`<path d="M 1612 ${y - 18} L 1632 ${y} L 1612 ${y + 18} Z M 1634 ${y - 18} L 1654 ${y} L 1634 ${y + 18} Z" fill="${C.hi}"/>`);
  add(text(1676, y + 9, 'play, pause and seek, in lockstep', { size: 24, fill: C.ink }));
  add(text(1520, y + 56, 'Dragon Tiles · keys pressed in turn · Sports@Buona Vista', { size: 22, fill: C.ink, op: 0.75 }));
}

plate('builds.svg', ['#16294f', '#0b1630', '#040914'], out);
