/**
 * Writes one new Mark into the site: an entry in js/marks.js, js/hall.js and
 * js/projects.js, a card in index.html, a sitemap.xml entry, a work page from templates/work-page.html,
 * the art plate, and the browser suite's card and page lists.
 *
 * Every edit is an anchored text insertion that fails loudly (AnchorError) when its
 * anchor is missing, and nothing is written until every edit has been computed and
 * checked. The slug comes from untrusted text, so it is reduced to [a-z0-9-] and every
 * write is confined to a fixed list of paths inside the site root. HTML values are
 * escaped; JS values are written with JSON.stringify, never spliced in as code.
 */
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { validate } from './claude.js';
import { DRAFT_SCHEMA, slugify } from './draft-mark.js';
import { sanitizeSvg } from './art.js';
import { MODELS } from './suit.js';

const TEMPLATE = fileURLToPath(new URL('./templates/work-page.html', import.meta.url));

export class SlugExistsError extends Error {
  constructor(slug) {
    super(`A Mark with the slug "${slug}" already exists`);
    this.name = 'SlugExistsError';
    this.slug = slug;
  }
}

export class AnchorError extends Error {
  constructor(file, anchor) {
    super(`${file}: anchor not found exactly once: ${anchor}`);
    this.name = 'AnchorError';
    this.file = file;
    this.anchor = anchor;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes the five HTML metacharacters, for text and attribute values alike. */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESC[c]);
}

// ---------------------------------------------------------------- anchored blocks

const BLOCKS = {
  marks: { file: 'js/marks.js', open: 'export const MARKS = [', close: '\n];' },
  suits: { file: 'js/hall.js', open: 'const SUITS = [', close: '\n];' },
  slugs: { file: 'js/projects.js', open: 'const SLUGS = {', close: '\n};' },
  cards: { file: 'tests/checks.js', open: 'const CARDS = [', close: '];' },
  markOf: { file: 'tests/checks.js', open: 'const MARK_OF = {', close: '\n};' },
  pages: { file: 'tests/run.js', open: 'const PAGES = [', close: '\n];' },
};

function once(src, needle, file) {
  const at = src.indexOf(needle);
  if (at < 0 || src.indexOf(needle, at + 1) >= 0) throw new AnchorError(file, needle);
  return at;
}

/** Finds a literal block: { start of literal, index of the close anchor, value }. */
function block(src, { file, open, close }) {
  const start = once(src, open, file) + open.length - 1;
  const end = src.indexOf(close, start);
  if (end < 0) throw new AnchorError(file, `${open} ... ${JSON.stringify(close)}`);
  const text = src.slice(start, end + close.length - 1); // the literal, without its ';'
  let value;
  try {
    // structuredClone brings the value into this realm, as plain data.
    value = structuredClone(vm.runInNewContext(`(${text})`, Object.create(null), { timeout: 1000 }));
  } catch (err) {
    throw new AnchorError(file, `${open} (literal does not evaluate: ${err.message})`);
  }
  return { start, end, value };
}

/** Inserts `entry` as the last element of a block whose last element ends with a comma. */
function append(src, spec, entry) {
  const b = block(src, spec);
  const before = src.slice(b.start, b.end).trimEnd();
  if (!spec.close.startsWith('\n')) {
    // a one-line array, ['a', 'b'];
    if (before.endsWith(',') || before.endsWith('[')) throw new AnchorError(spec.file, `${spec.open} (not a one-line list)`);
    return src.slice(0, b.end) + `, ${entry}` + src.slice(b.end);
  }
  if (!before.endsWith(',')) throw new AnchorError(spec.file, `${spec.open} (last element has no trailing comma)`);
  return src.slice(0, b.end) + `\n${entry}` + src.slice(b.end);
}

const read = (root, file) => readFileSync(join(root, file), 'utf8');

// ---------------------------------------------------------------- numerals

const ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
function toRoman(n) {
  let out = '';
  for (const [v, s] of ROMAN) for (; n >= v; n -= v) out += s;
  return out;
}

function readMarks(src) {
  const marks = block(src, BLOCKS.marks).value;
  if (!Array.isArray(marks) || !marks.length) throw new AnchorError(BLOCKS.marks.file, 'MARKS is not a non-empty array');
  marks.forEach((m, i) => {
    if (m?.mark !== toRoman(i + 1)) throw new Error(`js/marks.js: Mark ${i + 1} is numbered ${m?.mark}, expected ${toRoman(i + 1)}`);
  });
  return marks;
}

/** The numeral the next Mark gets, from js/marks.js (e.g. 'VIII'). */
export function nextNumeral(root) {
  return toRoman(readMarks(read(root, BLOCKS.marks.file)).length + 1);
}

/** Base-model names of the last two suits in js/hall.js, for pickSuit's neighbours. */
export function lastSuitModels(root) {
  const suits = block(read(root, BLOCKS.suits.file), BLOCKS.suits).value;
  return suits.slice(-2).map((s) => s?.spec?.model).filter((m) => typeof m === 'string');
}

// ---------------------------------------------------------------- validation

/** Collapses whitespace and replaces em dashes, which the site allows nowhere. */
const clean = (s) => String(s).replace(/\s*—\s*/g, ', ').replace(/\s+/g, ' ').trim();
// The line's parts keep their edge spaces ("Small and ", "fast", " by design.").
const cleanPart = (s) => String(s).replace(/\s*—\s*/g, ', ').replace(/\s+/g, ' ');

function checkDraft(draft) {
  const { claims, ...rest } = draft ?? {};
  const problems = validate(rest, DRAFT_SCHEMA);
  if (problems.length) throw new TypeError(`Draft is invalid: ${problems.join('; ')}`);
  for (const [fig] of draft.chips) if (clean(fig).length > 12) throw new TypeError(`Draft chips: figure "${fig}" is longer than 12 characters`);
  return {
    name: clean(draft.name),
    role: clean(draft.role),
    blurb: clean(draft.blurb),
    line: draft.line.map(cleanPart),
    sub: clean(draft.sub),
    chips: draft.chips.map(([f, c]) => [clean(f), clean(c)]),
    rows: draft.rows.map(([h, d]) => [clean(h), clean(d)]),
    stack: draft.stack.map(clean).filter(Boolean),
  };
}

const int24 = (n) => Number.isInteger(n) && n >= 0 && n <= 0xffffff;
const unit = (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
const HEX = /^#[0-9a-f]{6}$/i;

function checkSpec(spec) {
  if (!MODELS.includes(spec?.model)) throw new TypeError(`Suit model "${spec?.model}" is not one of ${MODELS.join(', ')}`);
  const p = spec.paint ?? {};
  if (!int24(p.base) || !int24(p.accent) || !unit(p.metal) || !unit(p.rough)) throw new TypeError('Suit paint is invalid');
  if (!Array.isArray(spec.colours) || spec.colours.length !== 2 || !spec.colours.every((c) => HEX.test(c))) throw new TypeError('Suit colours must be two #rrggbb colours');
  if (!Number.isInteger(spec.hue) || spec.hue < 0 || spec.hue > 359) throw new TypeError('Suit hue must be an integer 0..359');
  if (typeof spec.paintName !== 'string' || !spec.paintName.trim()) throw new TypeError('Suit paintName is missing');
  return {
    model: spec.model,
    paint: { base: p.base, accent: p.accent, metal: p.metal, rough: p.rough },
    paintName: clean(spec.paintName),
    colours: spec.colours.map((c) => c.toLowerCase()),
    hue: spec.hue,
  };
}

const SOURCE = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

// ---------------------------------------------------------------- JS writers

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const RAW = Symbol('raw');
/** A hex literal such as 0x1b3a78, written as code. */
const hexLit = (n) => ({ [RAW]: `0x${n.toString(16).padStart(6, '0')}` });

/** Serialises a value as a JS literal: JSON.stringify for strings and keys, hex for colours. */
function js(v) {
  if (v && typeof v === 'object' && RAW in v) return v[RAW];
  if (Array.isArray(v)) return `[${v.map(js).join(', ')}]`;
  if (v && typeof v === 'object') {
    return `{ ${Object.entries(v).map(([k, x]) => `${IDENT.test(k) ? k : JSON.stringify(k)}: ${js(x)}`).join(', ')} }`;
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new TypeError('Non-finite number');
    return String(v);
  }
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  throw new TypeError(`Cannot serialise ${typeof v}`);
}

const suitSpec = (s) => ({ model: s.model, paint: { base: hexLit(s.paint.base), accent: hexLit(s.paint.accent), metal: s.paint.metal, rough: s.paint.rough } });

function marksEntry(numeral, d, s, slug, focus) {
  const head = { mark: numeral, name: d.name, role: d.role, hue: s.hue, spec: suitSpec(s), colours: s.colours, paint: s.paintName };
  const lines = [
    `  ${js(head).slice(0, -2)},`,
    `    art: ${js({ file: `${slug}.svg`, focus })},`,
    `    chips: ${js(d.chips)},`,
    `    blurb: ${js(d.blurb)},`,
    `    line: ${js(d.line)}, sub: ${js(d.sub)},`,
    `    rows: ${js(d.rows)},`,
    `    stack: ${js(d.stack)},`,
    `    links: ${js([['Read the case study', `work/${slug}.html`]])} },`,
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------- HTML writers

const NEW_TAB = '<span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span>';

function card(slug, d) {
  const [fig, cap] = d.chips[0];
  const e = escapeHtml;
  return [
    `            <li data-reveal><a class="card work__card" id="work-${slug}" href="work/${slug}.html"`,
    `                aria-labelledby="name-${slug} more-${slug}">`,
    `                <span class="mono label">${e(d.role)}</span>`,
    `                <span class="work__figure"><span data-count>${e(fig)}</span><small>${e(cap)}</small></span>`,
    `                <h3 class="work__name vt-${slug}" id="name-${slug}">${e(d.name)}</h3>`,
    `                <p class="work__line">${e(d.line.join('').trim())}</p>`,
    `                <span class="work__more" id="more-${slug}">Read the case study <span class="work__arrow" aria-hidden="true">→</span></span>`,
    `              </a></li>`,
  ].join('\n');
}

function page(template, { slug, numeral, d, s, first, sourceUrl }) {
  const e = escapeHtml;
  const stats = d.chips.map(([f, c]) => `        <div><dt>${e(c)}</dt><dd><span data-count>${e(f)}</span></dd></div>`).join('\n');
  const facts = d.rows.map(([h, x]) => `        <div><dt>${e(h)}</dt><dd>${e(x)}</dd></div>`).join('\n');
  const stack = d.stack.length ? `      <div><h2 class="mono">Stack</h2><p class="stack">${d.stack.map(e).join(' · ')}</p></div>\n` : '';
  const links = sourceUrl
    ? `      <div><h2 class="mono">Links</h2><p class="links">\n          <a class="pill" href="${e(sourceUrl)}" target="_blank" rel="noopener">Source ${NEW_TAB}</a>\n        </p></div>\n`
    : '';
  const href = String(first.links?.[0]?.[1] ?? '');
  if (!/^[a-z0-9/-]+\.html$/.test(href)) throw new Error(`js/marks.js: Mark I's case-study link "${href}" is not a site page`);
  const values = {
    name: e(d.name), blurb: e(d.blurb), role: e(d.role), sub: e(d.sub), line: e(d.line.join('').trim()),
    slug, mark: numeral, markId: numeral.toLowerCase(), suit: s.colours[0], paint: e(s.paintName),
    stats, facts, stack, links,
    nextMark: String(first.mark).toLowerCase(), nextHref: `/${href}`, nextName: e(first.name),
  };
  const out = template.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in values)) throw new AnchorError('templates/work-page.html', m);
    return values[key];
  });
  return out;
}

/** Lists the page in sitemap.xml by its canonical address, before </urlset>. */
function insertSitemap(src, slug) {
  const file = 'sitemap.xml';
  const close = once(src, '\n</urlset>', file);
  const loc = `https://www.evanyap.com/work/${slug}`;
  if (src.includes(`<loc>${loc}</loc>`)) throw new SlugExistsError(slug);
  return src.slice(0, close) + `\n  <url><loc>${loc}</loc></url>` + src.slice(close);
}

function replaceOnce(src, file, re, fn) {
  const hits = [...src.matchAll(new RegExp(re.source, 'g'))];
  if (hits.length !== 1) throw new AnchorError(file, re.source);
  return src.replace(re, fn);
}

function insertCard(src, entry) {
  const file = 'index.html';
  const open = once(src, '<ul class="work__grid">', file);
  const close = src.indexOf('</ul>', open);
  if (close < 0) throw new AnchorError(file, '<ul class="work__grid"> ... </ul>');
  if (src.slice(open + 1, close).includes('<ul')) throw new AnchorError(file, 'work__grid contains a nested list');
  const lineStart = src.lastIndexOf('\n', close) + 1;
  if (src.slice(lineStart, close).trim()) throw new AnchorError(file, '</ul> of work__grid on its own line');
  return src.slice(0, lineStart) + entry + '\n' + src.slice(lineStart);
}

// ---------------------------------------------------------------- paths

function guard(root) {
  const real = realpathSync(root);
  return (rel) => {
    const abs = resolve(root, rel);
    const r = relative(resolve(root), abs);
    if (!r || r.startsWith('..') || isAbsolute(r)) throw new Error(`Refusing to write outside the site: ${rel}`);
    const dir = realpathSync(dirname(abs));
    const rd = relative(real, dir);
    if (rd.startsWith('..') || isAbsolute(rd)) throw new Error(`Refusing to write outside the site (via a link): ${rel}`);
    if (existsSync(abs) && lstatSync(abs).isSymbolicLink()) throw new Error(`Refusing to write through a symlink (outside the site?): ${rel}`);
    return abs;
  };
}

// ---------------------------------------------------------------- applyNewMark

// The existing files a new Mark edits; it also creates work/<slug>.html and img/art/<slug>.svg.
const SITE_FILES = ['js/marks.js', 'js/hall.js', 'js/projects.js', 'index.html', 'sitemap.xml', 'tests/checks.js', 'tests/run.js'];

/**
 * @param {string} root site root
 * @param {import('./draft-mark.js').MarkDraft} draft
 * @param {import('./suit.js').SuitSpec} spec
 * @param {{ svg: string, focus: string }} art
 * @param {{ sourceUrl?: string }} [opts] a github.com repo URL for the page's Source link
 * @returns {{ changed: string[], numeral: string }}
 */
export function applyNewMark(root, draft, spec, art, { sourceUrl } = {}) {
  const d = checkDraft(draft);
  const s = checkSpec(spec);
  const focus = String(art?.focus ?? '');
  if (!/^\d{1,3}% \d{1,3}%$/.test(focus)) throw new TypeError(`Art focus "${focus}" must look like "39% 50%"`);
  const svg = sanitizeSvg(art?.svg);
  if (sourceUrl !== undefined && !SOURCE.test(String(sourceUrl))) throw new TypeError(`Invalid source URL: ${sourceUrl}`);

  const slug = slugify(draft.slug || draft.name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'index') throw new TypeError(`Unusable slug "${slug}"`);
  const pageFile = `work/${slug}.html`;
  const artFile = `img/art/${slug}.svg`;
  const safe = guard(root);
  const targets = Object.fromEntries([...SITE_FILES, pageFile, artFile].map((f) => [f, safe(f)]));

  const src = Object.fromEntries(SITE_FILES.map((f) => [f, read(root, f)]));
  const marks = readMarks(src['js/marks.js']);
  const suits = block(src['js/hall.js'], BLOCKS.suits).value;
  const slugs = block(src['js/projects.js'], BLOCKS.slugs).value;
  const cards = block(src['tests/checks.js'], BLOCKS.cards).value;
  const taken =
    slug in slugs || suits.some((x) => x?.id === slug) || cards.includes(slug) ||
    src['index.html'].includes(`id="work-${slug}"`) || existsSync(targets[pageFile]) || existsSync(targets[artFile]) ||
    existsSync(join(root, 'case-studies', `${slug}.html`));
  if (taken) throw new SlugExistsError(slug);

  const index = marks.length;
  const numeral = toRoman(index + 1);
  const prev = toRoman(index);

  const out = { ...src };
  out['js/marks.js'] = append(src['js/marks.js'], BLOCKS.marks, marksEntry(numeral, d, s, slug, focus));
  out['js/hall.js'] = append(src['js/hall.js'], BLOCKS.suits, `  ${js({ id: slug, mark: numeral, hue: s.hue, spec: suitSpec(s) })},`);
  out['js/projects.js'] = append(src['js/projects.js'], BLOCKS.slugs, `  ${js({ [slug]: index }).slice(2, -2)},`);
  out['tests/checks.js'] = append(src['tests/checks.js'], BLOCKS.cards, JSON.stringify(slug));
  out['tests/checks.js'] = append(out['tests/checks.js'], BLOCKS.markOf, `  ${js({ [slug]: index }).slice(2, -2)},`);
  out['tests/run.js'] = append(src['tests/run.js'], BLOCKS.pages, `  ${JSON.stringify(`/${pageFile}`)},`);

  let html = insertCard(src['index.html'], card(slug, d));
  html = replaceOnce(html, 'index.html', new RegExp(`Marks I–${prev}</small>`), () => `Marks I–${numeral}</small>`);
  html = replaceOnce(html, 'index.html', new RegExp(`(id="p-mark">Mark [IVXLCDM]+ of )${prev}(</span>)`), (_, a, b) => `${a}${numeral}${b}`);
  out['index.html'] = html;
  out['sitemap.xml'] = insertSitemap(src['sitemap.xml'], slug);

  out[pageFile] = page(readFileSync(TEMPLATE, 'utf8'), { slug, numeral, d, s, first: marks[0], sourceUrl });
  out[artFile] = svg;

  // Re-read every edited block before anything touches the disk.
  const after = {
    marks: readMarks(out['js/marks.js']),
    suits: block(out['js/hall.js'], BLOCKS.suits).value,
    slugs: block(out['js/projects.js'], BLOCKS.slugs).value,
    cards: block(out['tests/checks.js'], BLOCKS.cards).value,
    markOf: block(out['tests/checks.js'], BLOCKS.markOf).value,
    pages: block(out['tests/run.js'], BLOCKS.pages).value,
  };
  const ok =
    after.marks.length === index + 1 && after.marks.at(-1).name === d.name &&
    after.suits.length === suits.length + 1 && after.suits.at(-1).mark === numeral &&
    after.slugs[slug] === index && after.markOf[slug] === index &&
    after.cards.at(-1) === slug && after.pages.at(-1) === `/${pageFile}`;
  if (!ok) throw new Error('The edited site files do not read back as expected; nothing was written');
  try {
    new vm.Script(out['js/marks.js'].replace(/^export /m, ''));
  } catch (err) {
    throw new Error(`js/marks.js would not parse: ${err.message}`);
  }

  const changed = [];
  for (const [file, text] of Object.entries(out)) {
    if (file in src && src[file] === text) continue;
    writeFileSync(targets[file], text, { flag: file in src ? 'w' : 'wx' });
    changed.push(file);
  }
  return { changed, numeral };
}
