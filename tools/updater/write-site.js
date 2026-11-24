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
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
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

// The catch-all last Mark. A new Mark goes in before it, and it moves up one.
const TAIL = 'Other builds';

/** Where the next Mark goes in MARKS: before the tail Mark when it is last, else at the end. */
const insertAt = (marks) => (marks.at(-1)?.name === TAIL ? marks.length - 1 : marks.length);

/** The numeral the next Mark gets, from js/marks.js (e.g. 'VII', with Other builds moving to VIII). */
export function nextNumeral(root) {
  return toRoman(insertAt(readMarks(read(root, BLOCKS.marks.file))) + 1);
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

/** Puts back a space the model dropped between two parts ("Agents that" + "answer"), never before punctuation. */
export function spaceLine(parts) {
  let acc = '';
  return parts.map((p) => {
    if (acc && p && /\S$/.test(acc) && /^[^\s.,;:!?)]/.test(p)) p = ` ${p}`;
    acc += p;
    return p;
  });
}

const points = (list) => list.map(([h, x]) => [clean(h), clean(x)]).filter(([h, x]) => h && x);

function checkDraft(draft) {
  const { claims, ...rest } = draft ?? {};
  const problems = validate(rest, DRAFT_SCHEMA);
  if (problems.length) throw new TypeError(`Draft is invalid: ${problems.join('; ')}`);
  for (const [fig] of draft.chips) if (clean(fig).length > 12) throw new TypeError(`Draft chips: figure "${fig}" is longer than 12 characters`);
  return {
    name: clean(draft.name),
    role: clean(draft.role),
    blurb: clean(draft.blurb),
    line: spaceLine(draft.line.map(cleanPart)),
    sub: clean(draft.sub),
    chips: draft.chips.map(([f, c]) => [clean(f), clean(c)]),
    rows: draft.rows.map(([h, d]) => [clean(h), clean(d)]),
    stack: draft.stack.map(clean).filter(Boolean),
    overview: clean(draft.overview),
    how: points(draft.how),
    decisions: points(draft.decisions),
    evidence: points(draft.evidence),
    limits: clean(draft.limits),
    built: clean(draft.built),
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
    `                <p class="work__line">${e(d.line.join('').trim())}</p>`, // parts already spaced by spaceLine
    `                <span class="work__more" id="more-${slug}">Read the case study <span class="work__arrow" aria-hidden="true">→</span></span>`,
    `              </a></li>`,
  ].join('\n');
}

/** A heading that reads as the start of a sentence: "Fail closed." */
const stop = (h) => (/[.!?]$/.test(h) ? h : `${h}.`);

/** The page's sections after What it does, as in work/assistant-bot.html; an empty one is left out. */
function sections(d) {
  const e = escapeHtml;
  const item = (pad) => ([h, x]) => `${pad}<li><strong>${e(stop(h))}</strong> ${e(x)}</li>`;
  const how = d.how.length
    ? `      <div><h2 class="mono">How it works</h2><div class="prose">\n        <ol>\n${d.how.map(item('          ')).join('\n')}\n        </ol>\n      </div></div>\n`
    : '';
  const decisions = d.decisions.length
    ? `      <div><h2 class="mono">Decisions and trade-offs</h2><div class="prose"><ul>\n${d.decisions.map(item('        ')).join('\n')}\n      </ul></div></div>\n`
    : '';
  const limits = d.limits ? `        <details class="more"><summary>Limits of these numbers</summary>\n          <p>${e(d.limits)}</p>\n        </details>\n` : '';
  let evidence = '';
  if (d.evidence.length) {
    const facts = d.evidence.map(([h, x]) => `          <div><dt>${e(h)}</dt><dd>${e(x)}</dd></div>`).join('\n');
    evidence = `      <div><h2 class="mono">Evidence</h2><div class="prose">\n        <dl class="facts">\n${facts}\n        </dl>\n${limits}      </div></div>\n`;
  } else if (d.limits) {
    evidence = `      <div><h2 class="mono">Limits</h2><div class="prose">\n        <p>${e(d.limits)}</p>\n      </div></div>\n`;
  }
  const built = `      <div><h2 class="mono">How I built it</h2><div class="prose">\n        <p>${e(d.built)}</p>\n      </div></div>\n`;
  return { how, decisions, evidence, built };
}

/** next: { mark, href, name } for the page's Next link; name is HTML already. */
function page(template, { slug, numeral, d, s, next, sourceUrl, liveUrl }) {
  const e = escapeHtml;
  const stats = d.chips.map(([f, c]) => `        <div><dt>${e(c)}</dt><dd><span data-count>${e(f)}</span></dd></div>`).join('\n');
  const facts = d.rows.map(([h, x]) => `        <div><dt>${e(h)}</dt><dd>${e(x)}</dd></div>`).join('\n');
  const stack = d.stack.length ? `      <div><h2 class="mono">Stack</h2><p class="stack">${d.stack.map(e).join(' · ')}</p></div>\n` : '';
  const pills = [
    liveUrl && `          <a class="pill" href="${e(liveUrl)}" target="_blank" rel="noopener">Live site ${NEW_TAB}</a>`,
    sourceUrl && `          <a class="pill" href="${e(sourceUrl)}" target="_blank" rel="noopener">Source ${NEW_TAB}</a>`,
  ].filter(Boolean);
  const links = pills.length ? `      <div><h2 class="mono">Links</h2><p class="links">\n${pills.join('\n')}\n        </p></div>\n` : '';
  const values = {
    name: e(d.name), blurb: e(d.blurb), role: e(d.role), sub: e(d.sub), overview: e(d.overview),
    slug, mark: numeral, markId: numeral.toLowerCase(), suit: s.colours[0], paint: e(s.paintName),
    stats, facts, ...sections(d), stack, links,
    nextMark: next.mark, nextHref: next.href, nextName: next.name,
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

// ---------------------------------------------------------------- inserting before the tail

const reEsc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Slugs are [a-z0-9-] already; one with a dash is quoted, as the site writes them.
const key = (slug) => (IDENT.test(slug) ? slug : `'${slug}'`);

/** Puts `entry` on its own line before the one line of the block that matches `re`; `fix` rewrites that line. */
function insertBeforeLine(src, spec, re, entry, fix = (l) => l) {
  const b = block(src, spec);
  const hits = [];
  for (let at = src.indexOf('\n', b.start); at >= 0 && at < b.end; at = src.indexOf('\n', at + 1)) {
    const end = src.indexOf('\n', at + 1);
    const line = src.slice(at + 1, end < 0 ? src.length : end);
    if (re.test(line)) hits.push([at + 1, line]);
  }
  if (hits.length !== 1) throw new AnchorError(spec.file, `${spec.open} ... ${re.source}`);
  const [start, line] = hits[0];
  return src.slice(0, start) + entry + '\n' + fix(line) + src.slice(start + line.length);
}

/** In a one-line list, puts `entry` before the quoted item `before`. */
function insertInList(src, spec, before, entry) {
  const b = block(src, spec);
  const hits = [...src.slice(b.start, b.end).matchAll(new RegExp(`(['"])${reEsc(before)}\\1`, 'g'))];
  if (hits.length !== 1) throw new AnchorError(spec.file, `${spec.open} ... ${before}`);
  const at = b.start + hits[0].index;
  return src.slice(0, at) + entry + ', ' + src.slice(at);
}

/** In a { slug: index } block, moves every slug at `index` up one and puts `slug: index` before the first of them. */
function shiftMap(src, spec, index, slug) {
  const b = block(src, spec);
  const moved = Object.keys(b.value).filter((k) => b.value[k] === index);
  if (!moved.length) throw new AnchorError(spec.file, `${spec.open} (nothing at ${index} to move up)`);
  let body = src.slice(b.start, b.end);
  let first = Infinity;
  for (const k of moved) {
    const re = new RegExp(`(?<=^|[\\s{,])(['"]?)${reEsc(k)}\\1:(\\s*)${index}(?=\\s*[,}])`, 'gm');
    const hits = [...body.matchAll(re)];
    if (hits.length !== 1) throw new AnchorError(spec.file, `${spec.open} ... ${k}: ${index}`);
    first = Math.min(first, hits[0].index);
    body = body.replace(re, (_, q, sp) => `${q}${k}${q}:${sp}${index + 1}`);
  }
  // Every key moved sits at or after `first`, so the offset still holds.
  const lineStart = body.lastIndexOf('\n', first) + 1;
  const entry = `${key(slug)}: ${index},`;
  body = /^\s*$/.test(body.slice(lineStart, first))
    ? body.slice(0, first) + entry + '\n' + body.slice(lineStart, first) + body.slice(first)
    : body.slice(0, first) + entry + ' ' + body.slice(first);
  return src.slice(0, b.start) + body + src.slice(b.end);
}

/** Puts the card's <li> before the earliest card of `before` in index.html. */
function insertCardBefore(src, before, entry) {
  const file = 'index.html';
  const ats = before.filter((k) => src.includes(`id="work-${k}"`)).map((k) => once(src, `id="work-${k}"`, file));
  if (!ats.length) throw new AnchorError(file, `a card for ${before.join(', ')}`);
  const at = Math.min(...ats);
  const lineStart = src.lastIndexOf('\n', at) + 1;
  if (!/^\s*<li\b/.test(src.slice(lineStart, at))) throw new AnchorError(file, '<li> on the same line as the card it holds');
  return src.slice(0, lineStart) + entry + '\n' + src.slice(lineStart);
}

const NEXT_TITLE = '(">\\s*<span class="next__title"><span><span class="next__pre">Next</span> )([^<]*)(</span>)';

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
// Going in before the tail Mark also edits css/project.css and the pages whose Next link moves.
const SITE_FILES = ['js/marks.js', 'js/hall.js', 'js/projects.js', 'index.html', 'sitemap.xml', 'tests/checks.js', 'tests/run.js'];
const CSS = 'css/project.css';
const PAGE_DIRS = ['work', 'case-studies'];
const SITE_PAGE = /^(?:work|case-studies)\/[a-z0-9-]+\.html$/;

/** A https address for the Live site link, or a TypeError. */
function checkLive(u) {
  let url;
  try {
    url = new URL(String(u));
  } catch {
    url = null;
  }
  if (!url || url.protocol !== 'https:' || url.username || url.password) throw new TypeError(`Invalid live URL: ${u}`);
  return url.href;
}

/** Old value -> new value for every key, with `slug` added at `index`. */
const shifted = (old, now, slug, index) =>
  now[slug] === index && Object.keys(now).length === Object.keys(old).length + 1 &&
  Object.keys(old).every((k) => now[k] === (old[k] >= index ? old[k] + 1 : old[k]));

/**
 * Inserts the Mark before the tail Mark ("Other builds") when that is last, moving the tail
 * up one numeral; otherwise appends it.
 * @param {string} root site root
 * @param {import('./draft-mark.js').MarkDraft} draft
 * @param {import('./suit.js').SuitSpec} spec
 * @param {{ svg: string, focus: string }} art
 * @param {{ sourceUrl?: string, liveUrl?: string }} [opts] a github.com repo URL for the Source link; an https URL for Live site
 * @returns {{ changed: string[], numeral: string }}
 */
export function applyNewMark(root, draft, spec, art, { sourceUrl, liveUrl } = {}) {
  const d = checkDraft(draft);
  const s = checkSpec(spec);
  const focus = String(art?.focus ?? '');
  if (!/^\d{1,3}% \d{1,3}%$/.test(focus)) throw new TypeError(`Art focus "${focus}" must look like "39% 50%"`);
  const svg = sanitizeSvg(art?.svg);
  if (sourceUrl !== undefined && !SOURCE.test(String(sourceUrl))) throw new TypeError(`Invalid source URL: ${sourceUrl}`);
  const live = liveUrl === undefined ? undefined : checkLive(liveUrl);

  const slug = slugify(draft.slug || draft.name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug === 'index') throw new TypeError(`Unusable slug "${slug}"`);
  const pageFile = `work/${slug}.html`;
  const artFile = `img/art/${slug}.svg`;
  const safe = guard(root);

  const src = Object.fromEntries(SITE_FILES.map((f) => [f, read(root, f)]));
  const marks = readMarks(src['js/marks.js']);
  const index = insertAt(marks);
  const insert = index < marks.length;
  const numeral = toRoman(index + 1);
  const oldTotal = toRoman(marks.length);
  const newTotal = toRoman(marks.length + 1);
  if (insert) {
    src[CSS] = read(root, CSS);
    for (const dir of PAGE_DIRS) {
      if (!existsSync(join(root, dir))) continue;
      for (const f of readdirSync(join(root, dir)).sort()) if (SITE_PAGE.test(`${dir}/${f}`)) src[`${dir}/${f}`] = read(root, `${dir}/${f}`);
    }
  }
  const targets = Object.fromEntries([...Object.keys(src), pageFile, artFile].map((f) => [f, safe(f)]));

  const suits = block(src['js/hall.js'], BLOCKS.suits).value;
  const slugs = block(src['js/projects.js'], BLOCKS.slugs).value;
  const cards = block(src['tests/checks.js'], BLOCKS.cards).value;
  const markOf = block(src['tests/checks.js'], BLOCKS.markOf).value;
  const pages = block(src['tests/run.js'], BLOCKS.pages).value;
  const taken =
    slug in slugs || suits.some((x) => x?.id === slug) || cards.includes(slug) ||
    src['index.html'].includes(`id="work-${slug}"`) || existsSync(targets[pageFile]) || existsSync(targets[artFile]) ||
    existsSync(join(root, 'case-studies', `${slug}.html`));
  if (taken) throw new SlugExistsError(slug);

  const out = { ...src };
  const entry = marksEntry(numeral, d, s, slug, focus);
  const suit = `  ${js({ id: slug, mark: numeral, hue: s.hue, spec: suitSpec(s) })},`;
  const slugLine = `  ${key(slug)}: ${index},`;
  let html = src['index.html'];
  let next;

  if (insert) {
    const tailNew = newTotal;
    const markLine = new RegExp(`^\\s*\\{\\s*mark:\\s*(['"])${numeral}\\1`);
    const suitLine = new RegExp(`\\bmark:\\s*(['"])${numeral}\\1`);
    const renumber = (l) => l.replace(new RegExp(`(\\bmark:\\s*)(['"])${numeral}\\2`), (_, a, q) => `${a}${q}${tailNew}${q}`);
    const tailLinks = (marks[index].links ?? []).map(([, h]) => String(h));
    if (!tailLinks.length || !tailLinks.every((h) => SITE_PAGE.test(h) && h in src)) {
      throw new AnchorError(BLOCKS.marks.file, `${TAIL}'s links (${tailLinks.join(', ')}) as site pages`);
    }
    const tailSlugs = Object.keys(slugs).filter((k) => slugs[k] === index);
    const firstCard = cards.find((c) => tailSlugs.includes(c));
    const firstPage = pages.find((p) => tailLinks.includes(String(p).slice(1)));
    if (!firstCard) throw new AnchorError(BLOCKS.cards.file, `${BLOCKS.cards.open} ... a card for ${TAIL}`);
    if (!firstPage) throw new AnchorError(BLOCKS.pages.file, `${BLOCKS.pages.open} ... a page of ${TAIL}`);

    out['js/marks.js'] = insertBeforeLine(src['js/marks.js'], BLOCKS.marks, markLine, entry, renumber);
    out['js/hall.js'] = insertBeforeLine(src['js/hall.js'], BLOCKS.suits, suitLine, suit, renumber);
    out['js/projects.js'] = shiftMap(src['js/projects.js'], BLOCKS.slugs, index, slug);
    out['tests/checks.js'] = insertInList(src['tests/checks.js'], BLOCKS.cards, firstCard, `'${slug}'`);
    out['tests/checks.js'] = shiftMap(out['tests/checks.js'], BLOCKS.markOf, index, slug);
    out['tests/run.js'] = insertBeforeLine(src['tests/run.js'], BLOCKS.pages, new RegExp(`(['"])${reEsc(firstPage)}\\1`), `  '/${pageFile}',`);
    html = insertCardBefore(html, tailSlugs, card(slug, d));

    // The colour rule: the tail's moves up a numeral, and the new Mark takes its old one.
    const oldSel = `[data-mark="${numeral.toLowerCase()}"]`;
    const newSel = `[data-mark="${tailNew.toLowerCase()}"]`;
    if (src[CSS].includes(newSel)) throw new AnchorError(CSS, `${newSel} is already in use`);
    const at = src[CSS].indexOf(oldSel);
    if (at >= 0) {
      const css = src[CSS].split(oldSel).join(newSel);
      const ls = css.lastIndexOf('\n', at) + 1;
      out[CSS] = css.slice(0, ls) + `${oldSel} { --suit: ${s.colours[0]}; }\n` + css.slice(ls);
    }

    // The tail's own pages, and every Next link into the tail, move up a numeral.
    for (const f of tailLinks) {
      out[f] = replaceOnce(out[f], f, new RegExp(`<body data-mark="${numeral.toLowerCase()}"`), () => `<body data-mark="${tailNew.toLowerCase()}"`);
    }
    const nextAt = `<a class="next" data-mark="${numeral.toLowerCase()}"`;
    for (const f of Object.keys(src)) if (SITE_PAGE.test(f)) out[f] = out[f].split(nextAt).join(`<a class="next" data-mark="${tailNew.toLowerCase()}"`);

    // The page that led to the tail's last page now leads to the new Mark, which leads there.
    const target = `/${tailLinks.at(-1)}`;
    const re = new RegExp(`(<a class="next" data-mark=")[a-z]+(" href=")${reEsc(target)}${NEXT_TITLE}`);
    const from = Object.keys(src).filter((f) => SITE_PAGE.test(f) && re.test(out[f]));
    if (from.length !== 1) throw new AnchorError(`${PAGE_DIRS.join('/, ')}/`, `one Next link to ${target}`);
    let name = '';
    out[from[0]] = replaceOnce(out[from[0]], from[0], re, (_, a, b, c, n, z) => {
      name = n;
      return `${a}${numeral.toLowerCase()}${b}/${pageFile}${c}${escapeHtml(d.name)}${z}`;
    });
    next = { mark: tailNew.toLowerCase(), href: target, name };
  } else {
    out['js/marks.js'] = append(src['js/marks.js'], BLOCKS.marks, entry);
    out['js/hall.js'] = append(src['js/hall.js'], BLOCKS.suits, suit);
    out['js/projects.js'] = append(src['js/projects.js'], BLOCKS.slugs, slugLine);
    out['tests/checks.js'] = append(src['tests/checks.js'], BLOCKS.cards, `'${slug}'`);
    out['tests/checks.js'] = append(out['tests/checks.js'], BLOCKS.markOf, slugLine);
    out['tests/run.js'] = append(src['tests/run.js'], BLOCKS.pages, `  '/${pageFile}',`);
    html = insertCard(html, card(slug, d));
    const href = String(marks[0].links?.[0]?.[1] ?? '');
    if (!/^[a-z0-9/-]+\.html$/.test(href)) throw new Error(`js/marks.js: Mark I's case-study link "${href}" is not a site page`);
    next = { mark: String(marks[0].mark).toLowerCase(), href: `/${href}`, name: escapeHtml(marks[0].name) };
  }

  out['js/hall.js'] = replaceOnce(out['js/hall.js'], 'js/hall.js', /View all \d+ projects/, () => `View all ${cards.length + 1} projects`);
  html = replaceOnce(html, 'index.html', new RegExp(`Marks I–${oldTotal}</small>`), () => `Marks I–${newTotal}</small>`);
  html = replaceOnce(html, 'index.html', new RegExp(`(id="p-mark">Mark [IVXLCDM]+ of )${oldTotal}(</span>)`), (_, a, b) => `${a}${newTotal}${b}`);
  out['index.html'] = html;
  out['sitemap.xml'] = insertSitemap(src['sitemap.xml'], slug);

  out[pageFile] = page(readFileSync(TEMPLATE, 'utf8'), { slug, numeral, d, s, next, sourceUrl, liveUrl: live });
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
    after.marks.length === marks.length + 1 && after.marks[index].name === d.name &&
    (!insert || (after.marks.at(-1).name === TAIL && after.marks.at(-1).mark === newTotal)) &&
    after.suits.length === suits.length + 1 && after.suits.find((x) => x?.id === slug)?.mark === numeral &&
    after.suits.filter((x) => x?.mark === numeral).length === 1 &&
    shifted(slugs, after.slugs, slug, index) && shifted(markOf, after.markOf, slug, index) &&
    after.cards.length === cards.length + 1 && after.cards.includes(slug) &&
    after.pages.length === pages.length + 1 && after.pages.includes(`/${pageFile}`);
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
