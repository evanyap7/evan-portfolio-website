// Shared by the plate scripts in this folder. Each draws one Mark's plate, the
// art behind its suit in the Projects chapter, as a 2400×1600 SVG in
// img/art. (ego.mjs came first and stands alone.)
//
// The opener sets its words over the plate. With a long name (every Mark but
// E.G.O) these are taken, in plate units at 1440 wide: the picker, y 231–366;
// the chips, x 178–599 at y 423–625 and y 1054–1295, and x 1922–2343 at
// y 425–627; the name, y 457–1270; the suit, x 1196–1940; the blurb,
// x 174–1472 from y 1369; the paint swatch, bottom right. What is left for
// pictures: LEFT (x 180–590, y 650–1030), RIGHT (x 1960–2330, y 660–1250),
// FOOT (x 1520–2330, y 1360–1460), and the band behind the letters.
import { writeFileSync } from 'node:fs';

export const W = 2400;
export const H = 1600;
export const SANS = "-apple-system, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const MONO = 'ui-monospace, Menlo, Consolas, monospace';

// Seeded, so a plate redraws the same.
export const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const text = (x, y, s, { size = 24, fill = '#fff', op = 1, mono = false, anchor, weight } = {}) =>
  `<text x="${x}" y="${y}" font-family="${mono ? MONO : SANS}" font-size="${size}" fill="${fill}"`
  + `${op < 1 ? ` opacity="${op}"` : ''}${anchor ? ` text-anchor="${anchor}"` : ''}`
  + `${weight ? ` font-weight="${weight}"` : ''}>${esc(s)}</text>`;

export const path = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

// A panel that a picture sits on, so the field behind does not run through it.
export const card = (x, y, w, h, fill, stroke) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" fill-opacity="0.9"`
  + `${stroke ? ` stroke="${stroke}" stroke-opacity="0.35" stroke-width="2"` : ''}/>`;

export function plate(file, ground, body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs><radialGradient id="g" cx="55%" cy="52%" r="70%"><stop offset="0" stop-color="${ground[0]}"/><stop offset="0.6" stop-color="${ground[1]}"/><stop offset="1" stop-color="${ground[2]}"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
${body.join('\n')}
</svg>
`;
  writeFileSync(process.argv[2] || new URL(`../../img/art/${file}`, import.meta.url), svg);
  console.log(`${file}: ${(svg.length / 1024).toFixed(1)} KB`);
}
