import { createHash } from 'node:crypto';

export const MODELS = ['mark-1', 'mark-7', 'mark-7-lite', 'mark-50'];

/** @typedef {{ model: 'mark-1'|'mark-7'|'mark-7-lite'|'mark-50', paint: { base: number, accent: number, metal: number, rough: number },
 *   paintName: string, colours: [string,string], hue: number }} SuitSpec */

const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
function luminance(rgb) {
  return 0.2126 * lin((rgb >> 16) & 255) + 0.7152 * lin((rgb >> 8) & 255) + 0.0722 * lin(rgb & 255);
}

/** WCAG contrast ratio between two 0xRRGGBB colours. */
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(x * 255);
  return (to(f(0)) << 16) | (to(f(8)) << 8) | to(f(4));
}

const hex6 = (n) => '#' + n.toString(16).padStart(6, '0');

const HUE_NAMES = [
  [15, 'Red'], [45, 'Orange'], [70, 'Gold'], [165, 'Green'], [200, 'Teal'],
  [255, 'Blue'], [290, 'Purple'], [335, 'Magenta'], [360, 'Red'],
];
const hueName = (h) => HUE_NAMES.find(([max]) => h < max)[1];

const FINISH = {
  'mark-1': { metal: 0.35, rough: 0.6 },
  'mark-7': { metal: 0.75, rough: 0.38 },
  'mark-7-lite': { metal: 0.6, rough: 0.45 },
  'mark-50': { metal: 0.7, rough: 0.35 },
};

/**
 * Deterministic suit from the repo name: hash -> hue -> base (dark) and accent
 * (light, lightened in fixed steps until contrast >= 3); model by hash among non-neighbours.
 * @param {{ name: string }} ctx
 * @param {string[]} neighbours adjacent suit model names to avoid
 * @returns {SuitSpec}
 */
export function pickSuit(ctx, neighbours = []) {
  const h = createHash('sha256').update(String(ctx.name ?? '')).digest();
  const hue = h.readUInt16BE(0) % 360;
  const base = hslToRgb(hue, 55, 28);
  const accentHue = (hue + 30 + (h[2] % 30)) % 360;
  let accent = 0;
  for (let l = 62; l <= 98; l += 4) {
    accent = hslToRgb(accentHue, 60, l);
    if (contrastRatio(base, accent) >= 3) break;
  }
  const taken = new Set(neighbours);
  const pool = MODELS.filter((m) => !taken.has(m));
  const choices = pool.length ? pool : MODELS;
  const model = choices[h.readUInt32BE(4) % choices.length];
  return {
    model,
    paint: { base, accent, ...FINISH[model] },
    paintName: `${hueName(hue)} and ${hueName(accentHue).toLowerCase()}`,
    colours: [hex6(base), hex6(accent)],
    hue,
  };
}
