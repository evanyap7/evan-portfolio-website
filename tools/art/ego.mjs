// Draws img/art/ego.svg: what goes into E.G.O on the left, what comes out on
// the right, and a voice note's waveform running behind the name that
// settles, as it crosses, into the ordered cells of a calendar.
//
//   node tools/art/ego.mjs [out.svg]
import { writeFileSync } from 'node:fs';

const W = 2400, H = 1600, CY = 880;
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const C = {
  crimson: '#c23a2d', crimsonHi: '#e8735f', crimsonLo: '#6e1a14',
  gold: '#d9a944', goldHi: '#f0cf80', goldLo: '#4a3413',
  ink: '#f4dcd5',
};
const SANS = "-apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";
const out = [];
const add = (s) => out.push(s);

// The ground: deep crimson, lit behind the name.
add(`<defs>
  <radialGradient id="g" cx="55%" cy="52%" r="70%"><stop offset="0" stop-color="#4b130e"/><stop offset="0.6" stop-color="#2a0a08"/><stop offset="1" stop-color="#140504"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>`);

// The waveform. Speech is syllables: bursts under an envelope, with pauses.
const PITCH = 26, BAR = 14;
const n = Math.ceil(W / PITCH) + 1;
const SETTLE_A = 900, SETTLE_B = 1450; // where the voice turns into the grid
const CELL = 22, GAP = 4; // grid cell, and the bars quantised to it
for (let i = 0; i < n; i += 1) {
  const x = i * PITCH;
  const syll = Math.abs(Math.sin(i * 0.37) * Math.sin(i * 0.113 + 1.3));
  const pause = (i % 23 > 19) ? 0.15 : 1;
  const amp = (60 + 300 * syll * (0.55 + 0.45 * rnd())) * pause;
  const t = Math.min(1, Math.max(0, (x - SETTLE_A) / (SETTLE_B - SETTLE_A)));
  if (t >= 1) continue;
  const q = CELL + GAP;
  const snapped = Math.max(1, Math.round(amp / q)) * q;
  const h = amp * (1 - t) + snapped * t * 0.9;
  const col = t < 0.5 ? C.crimsonHi : C.crimson;
  const op = (0.55 + 0.35 * syll) * (1 - 0.25 * t);
  if (t < 0.35) {
    add(`<rect x="${x}" y="${(CY - h).toFixed(1)}" width="${BAR}" height="${(2 * h).toFixed(1)}" rx="7" fill="${col}" opacity="${op.toFixed(2)}"/>`);
  } else {
    // Breaking into cells.
    const cells = Math.round((2 * h) / q);
    for (let k = 0; k < cells; k += 1) {
      const y = CY - (cells * q) / 2 + k * q;
      const gold = rnd() < t * 0.5;
      add(`<rect x="${x}" y="${y.toFixed(1)}" width="${(BAR + 8 * t).toFixed(1)}" height="${CELL}" rx="${(7 - 3 * t).toFixed(1)}" fill="${gold ? C.gold : col}" opacity="${op.toFixed(2)}"/>`);
    }
  }
}
// The calendar the voice settled into: seven rows, a day each, from the
// settle point to the edge. Most slots are free; some hold events.
const ROWS = 7, rowsTop = CY - (ROWS * (CELL + GAP)) / 2;
for (let x = SETTLE_B; x < W + PITCH; x += PITCH) {
  for (let r = 0; r < ROWS; r += 1) {
    const y = rowsTop + r * (CELL + GAP);
    const busy = rnd() < 0.3;
    add(busy
      ? `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="4" fill="${C.gold}" opacity="0.85"/>`
      : `<rect x="${x + 0.75}" y="${y + 0.75}" width="${CELL - 1.5}" height="${CELL - 1.5}" rx="4" fill="none" stroke="${C.gold}" stroke-opacity="0.28" stroke-width="1.5"/>`);
  }
}
// Thursday: the 3pm moves to 4.
{
  const y = rowsTop + 3 * (CELL + GAP);
  const x0 = SETTLE_B + PITCH * 26, x1 = x0 + PITCH * 4;
  add(`<rect x="${x0 - 4}" y="${y - 6}" width="${PITCH * 3}" height="${CELL + 12}" rx="8" fill="#2a0a08" stroke="${C.goldHi}" stroke-dasharray="6 6" stroke-width="2" opacity="0.8"/>`);
  add(`<rect x="${x1}" y="${y - 6}" width="${PITCH * 3}" height="${CELL + 12}" rx="8" fill="${C.goldHi}"/>`);
  add(`<path d="M ${x0 + 30} ${y - 14} C ${x0 + 50} ${y - 70}, ${x1 + 10} ${y - 70}, ${x1 + 30} ${y - 14}" fill="none" stroke="${C.goldHi}" stroke-width="3" stroke-linecap="round"/>`);
}

// A bubble, Telegram's shape: rounded, with a tail at one lower corner.
const bubble = (x, y, w, h, fill, side) => {
  const tail = side === 'out'
    ? `M ${x + w - 30} ${y + h - 34} q 20 30 50 34 q -40 6 -70 -10 Z`
    : `M ${x + 30} ${y + h - 34} q -20 30 -50 34 q 40 6 70 -10 Z`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${fill}"/><path d="${tail}" fill="${fill}"/>`;
};

// In: the message from the case study, sent as text.
add(bubble(-40, 352, 1060, 104, C.crimsonLo, 'out'));
add(`<text x="130" y="418" font-family="${SANS}" font-size="44" fill="${C.ink}" opacity="0.92">log lunch $14 and move my 3pm to 4</text>`);
add(`<text x="986" y="442" font-family="${SANS}" font-size="20" fill="${C.ink}" opacity="0.5" text-anchor="end">12:41 ✓✓</text>`);

// In: a voice note.
add(bubble(-40, 1300, 740, 112, C.crimsonLo, 'out'));
add(`<circle cx="170" cy="1356" r="34" fill="${C.crimsonHi}"/><path d="M 160 1338 L 188 1356 L 160 1374 Z" fill="#2a0a08"/>`);
for (let i = 0; i < 28; i += 1) {
  const h = 6 + 30 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.31));
  add(`<rect x="${228 + i * 13}" y="${(1356 - h).toFixed(1)}" width="7" height="${(2 * h).toFixed(1)}" rx="3.5" fill="${C.ink}" opacity="${i < 11 ? 0.85 : 0.4}"/>`);
}
add(`<text x="600" y="1366" font-family="${SANS}" font-size="26" fill="${C.ink}" opacity="0.6">0:07</text>`);

// In: a photo, a schedule screenshot, tipped as it is sent.
add(`<g transform="translate(110 660) rotate(-7)">
  <rect x="0" y="0" width="236" height="380" rx="26" fill="${C.crimsonLo}"/>
  <rect x="12" y="12" width="212" height="356" rx="16" fill="#f1e2d6"/>
  ${Array.from({ length: 9 }, (_, i) => {
    const y = 40 + i * 36, w = 60 + ((i * 53) % 110);
    return `<rect x="30" y="${y}" width="34" height="14" rx="3" fill="#b9a59a"/><rect x="76" y="${y}" width="${w}" height="14" rx="3" fill="${i % 3 === 1 ? C.crimson : '#cdbbb0'}"/>`;
  }).join('')}
</g>`);

// Out: the reply, with its undo.
add(bubble(1530, 330, 920, 128, '#2b1d0c', 'in'));
add(`<text x="1580" y="392" font-family="${SANS}" font-size="38" fill="${C.goldHi}">Logged $14 lunch · moved 3pm to 4pm</text>`);
add(`<text x="1580" y="436" font-family="${SANS}" font-size="24" fill="${C.goldHi}" opacity="0.55">2 tool calls · Haiku → Sonnet</text>`);
add(`<rect x="2060" y="404" width="160" height="44" rx="22" fill="none" stroke="${C.gold}" stroke-width="2"/><text x="2140" y="434" font-family="${SANS}" font-size="24" fill="${C.goldHi}" text-anchor="middle">↶ Undo</text>`);

// Out: the row it wrote to the sheet.
const row = [['Lunch', 200], ['Food', 170], ['14.00', 170]];
let cx = 1760;
row.forEach(([txt, w], i) => {
  add(`<rect x="${cx}" y="1330" width="${w - 4}" height="70" rx="${i === 0 ? 14 : 4}" fill="#2b1d0c" stroke="${C.gold}" stroke-opacity="0.45" stroke-width="2"/>`);
  add(`<text x="${cx + 22}" y="1376" font-family="${MONO}" font-size="30" fill="${i === 2 ? C.goldHi : C.gold}"${i === 2 ? ' font-weight="700"' : ''}>${txt}</text>`);
  cx += w;
});
add(`<rect x="${cx}" y="1330" width="${W - cx + 40}" height="70" rx="4" fill="#2b1d0c" stroke="${C.gold}" stroke-opacity="0.25" stroke-width="2"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${out.join('\n')}\n</svg>\n`;
writeFileSync(process.argv[2] || new URL('../../img/art/ego.svg', import.meta.url), svg);
console.log(`${(svg.length / 1024).toFixed(1)} KB`);
