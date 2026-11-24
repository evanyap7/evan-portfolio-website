import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { applyNewMark, AnchorError, escapeHtml, lastSuitModels, nextNumeral, SlugExistsError, spaceLine } from './write-site.js';
import { pickSuit } from './suit.js';
import { sanitizeSvg, UnsafeSvgError } from './art.js';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURES = ['js/marks.js', 'js/hall.js', 'js/projects.js', 'index.html', 'tests/checks.js', 'tests/run.js', 'sitemap.xml', 'work', 'case-studies', 'css', 'img/art'];

/** A temp copy of the site files the writer touches, inside its own parent dir. */
function fixture() {
  const parent = mkdtempSync(join(tmpdir(), 'write-site-'));
  const root = join(parent, 'site');
  for (const rel of FIXTURES) cpSync(join(REPO, rel), join(root, rel), { recursive: true });
  return { parent, root, done: () => rmSync(parent, { recursive: true, force: true }) };
}

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else out[relative(dir, p)] = readFileSync(p, 'utf8');
    }
  };
  walk(dir);
  return out;
}

const draft = (over = {}) => ({
  name: 'Tiny Queue',
  role: 'Developer · Open source',
  blurb: 'A small job queue for Node with retries and a dashboard.',
  line: ['Small and ', 'fast', ' by design.'],
  sub: 'Jobs retry with backoff until they succeed or give up.',
  chips: [['3', 'retry strategies'], ['120', 'tests, run in CI'], ['0', 'runtime dependencies']],
  rows: [['3 retry strategies', 'Fixed, linear and exponential backoff.'], ['120 tests', 'Run on every push.']],
  stack: ['Node.js', 'TypeScript', 'Redis'],
  overview: 'Built to run background jobs for small Node services without a broker.',
  how: [['Enqueue', 'A job is stored in Redis with its retry policy.'], ['Run', 'A worker takes the job and runs it.'], ['Retry', 'A failed job waits, then runs again.']],
  decisions: [['Redis only', 'One store keeps it small, but Redis must be running.'], ['No runtime dependencies', 'Fewer upgrades, more code to own.']],
  evidence: [['Tests', '120 tests pass in CI.']],
  limits: 'The tests run against one Redis version.',
  built: 'Written in TypeScript and tested in CI on every push.',
  claims: [],
  slug: 'tiny-queue',
  ...over,
});
const spec = () => pickSuit({ name: 'tiny-queue' }, ['mark-50', 'mark-7']);
const art = (over = {}) => ({
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 1600"><rect width="2400" height="1600" fill="#123456"/></svg>',
  focus: '39% 50%',
  ...over,
});

let bust = 0;
async function marksOf(root) {
  return (await import(`${pathToFileURL(join(root, 'js/marks.js')).href}?v=${++bust}`)).MARKS;
}

/** Evaluates the literal that follows `open` up to `close` in a file. */
function literal(root, file, open, close) {
  const src = readFileSync(join(root, file), 'utf8');
  const start = src.indexOf(open);
  assert.ok(start >= 0, `${open} in ${file}`);
  const end = src.indexOf(close, start);
  const text = src.slice(start + open.length - 1, end + close.length - 1);
  return vm.runInNewContext(`(${text})`);
}

const grid = (html) => {
  const start = html.indexOf('<ul class="work__grid">');
  return html.slice(start, html.indexOf('</ul>', start));
};

test('escapeHtml escapes the five HTML metacharacters', () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  assert.equal(escapeHtml('plain'), 'plain');
});

test('nextNumeral and lastSuitModels read the live site', () => {
  const f = fixture();
  try {
    assert.equal(nextNumeral(f.root), 'VII', 'a new Mark goes in before Other builds');
    assert.deepEqual(lastSuitModels(f.root), ['mark-50', 'mark-7']);
  } finally {
    f.done();
  }
});

test('applyNewMark puts a new Mark before Other builds, which moves up to VIII', async () => {
  const f = fixture();
  try {
    const s = spec();
    const res = applyNewMark(f.root, draft(), s, art(), { sourceUrl: 'https://github.com/evanyap7/tiny-queue', liveUrl: 'https://tiny-queue.example.dev/' });
    assert.equal(res.numeral, 'VII');
    assert.deepEqual([...res.changed].sort(), [
      'css/project.css', 'img/art/tiny-queue.svg', 'index.html', 'js/hall.js', 'js/marks.js', 'js/projects.js', 'sitemap.xml', 'tests/checks.js', 'tests/run.js',
      'work/others.html', 'work/research-agent.html', 'work/tiny-queue.html', 'work/v-bay.html', 'work/watchpartyyy.html',
    ]);

    const marks = await marksOf(f.root);
    assert.equal(marks.length, 8);
    const m = marks[6];
    assert.equal(m.mark, 'VII');
    assert.equal(m.name, 'Tiny Queue');
    assert.equal(m.hue, s.hue);
    assert.deepEqual(m.spec, { model: s.model, paint: s.paint });
    assert.deepEqual(m.colours, s.colours);
    assert.equal(m.paint, s.paintName);
    assert.deepEqual(m.art, { file: 'tiny-queue.svg', focus: '39% 50%' });
    assert.deepEqual(m.chips, draft().chips);
    assert.deepEqual(m.line, draft().line);
    assert.deepEqual(m.links, [['Read the case study', 'work/tiny-queue.html']]);
    assert.equal(marks.at(-1).name, 'Other builds');
    assert.equal(marks.at(-1).mark, 'VIII');

    const suits = literal(f.root, 'js/hall.js', 'const SUITS = [', '\n];');
    assert.equal(suits.length, 8);
    assert.equal(suits.at(-2).id, 'tiny-queue');
    assert.equal(suits.at(-2).mark, 'VII');
    assert.equal(suits.at(-2).spec.model, s.model);
    assert.equal(suits.at(-1).id, 'others');
    assert.equal(suits.at(-1).mark, 'VIII');
    assert.deepEqual(lastSuitModels(f.root), [s.model, 'mark-7']);
    assert.ok(readFileSync(join(f.root, 'js/hall.js'), 'utf8').includes('View all 9 projects'));

    const slugs = literal(f.root, 'js/projects.js', 'const SLUGS = {', '\n};');
    assert.equal(slugs['tiny-queue'], 6);
    assert.equal(slugs.watchpartyyy, 7);
    assert.equal(slugs.others, 7);
    assert.equal(slugs['v-bay'], 5);

    const index = readFileSync(join(f.root, 'index.html'), 'utf8');
    const g = grid(index);
    assert.match(g, /<li data-reveal><a class="card work__card" id="work-tiny-queue" href="work\/tiny-queue\.html"/);
    assert.ok(g.indexOf('id="work-tiny-queue"') < g.indexOf('id="work-watchpartyyy"'), 'the card sits before Other builds');
    assert.ok(g.indexOf('id="work-v-bay"') < g.indexOf('id="work-tiny-queue"'));
    assert.equal((g.match(/<li /g) ?? []).length, 9);
    assert.match(g, /<h3 class="work__name vt-tiny-queue" id="name-tiny-queue">Tiny Queue<\/h3>/);
    assert.match(g, /<p class="work__line">Small and fast by design\.<\/p>/);
    assert.ok(index.includes('Marks I–VIII</small>'));
    assert.ok(index.includes('id="p-mark">Mark II of VIII</span>'));

    const page = readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8');
    assert.ok(page.includes('<title>Tiny Queue | Evan Yap</title>'));
    assert.ok(page.includes(`<body data-mark="vii" style="--suit: ${s.colours[0]}">`));
    assert.ok(page.includes('<h1 class="project__title vt-tiny-queue">Tiny Queue</h1>'));
    assert.ok(page.includes('<a class="next" data-mark="viii" href="/work/others.html">'));
    assert.ok(page.includes('<span class="next__pre">Next</span> Dragon Tiles</span>'));
    assert.ok(page.includes('<p>Built to run background jobs for small Node services without a broker.</p>'));
    assert.ok(page.includes('<h2 class="mono">How it works</h2>'));
    assert.ok(page.includes('<li><strong>Enqueue.</strong> A job is stored in Redis with its retry policy.</li>'));
    assert.ok(page.includes('<h2 class="mono">Decisions and trade-offs</h2>'));
    assert.ok(page.includes('<h2 class="mono">Evidence</h2>'));
    assert.ok(page.includes('<div><dt>Tests</dt><dd>120 tests pass in CI.</dd></div>'));
    assert.ok(page.includes('<summary>Limits of these numbers</summary>'));
    assert.ok(page.includes('<h2 class="mono">How I built it</h2>'));
    assert.ok(page.includes('href="https://tiny-queue.example.dev/" target="_blank" rel="noopener">Live site'));
    assert.ok(page.includes('href="https://github.com/evanyap7/tiny-queue"'));
    assert.equal((page.match(/<span data-count>/g) ?? []).length, 3);
    assert.ok(!page.includes('{{'), 'no placeholder left');
    assert.equal(readFileSync(join(f.root, 'img/art/tiny-queue.svg'), 'utf8'), sanitizeSvg(art().svg), 'the sanitised plate');

    // The Next chain: V-Bay -> Tiny Queue -> Dragon Tiles; links into the tail now say viii.
    const vbay = readFileSync(join(f.root, 'work/v-bay.html'), 'utf8');
    assert.ok(vbay.includes('<a class="next" data-mark="vii" href="/work/tiny-queue.html">'));
    assert.ok(vbay.includes('<span class="next__pre">Next</span> Tiny Queue</span>'));
    assert.ok(readFileSync(join(f.root, 'work/research-agent.html'), 'utf8').includes('<a class="next" data-mark="viii" href="/work/watchpartyyy.html">'));
    for (const t of ['work/others.html', 'work/watchpartyyy.html']) assert.ok(readFileSync(join(f.root, t), 'utf8').includes('<body data-mark="viii"'), t);
    const css = readFileSync(join(f.root, 'css/project.css'), 'utf8');
    assert.ok(css.includes(`[data-mark="vii"] { --suit: ${s.colours[0]}; }\n[data-mark="viii"] { --suit: #1b3a78; }`));

    const cards = literal(f.root, 'tests/checks.js', 'const CARDS = [', '];');
    assert.deepEqual([...cards.slice(-3)], ['tiny-queue', 'watchpartyyy', 'others']);
    assert.equal(cards.length, 9);
    const markOf = literal(f.root, 'tests/checks.js', 'const MARK_OF = {', '\n};');
    assert.equal(markOf['tiny-queue'], 6);
    assert.equal(markOf.watchpartyyy, 7);
    assert.equal(markOf.others, 7);
    const pages = literal(f.root, 'tests/run.js', 'const PAGES = [', '\n];');
    assert.deepEqual([...pages.slice(-3)], ['/work/tiny-queue.html', '/work/watchpartyyy.html', '/work/others.html']);
    const sitemap = readFileSync(join(f.root, 'sitemap.xml'), 'utf8');
    assert.ok(sitemap.includes('  <url><loc>https://www.evanyap.com/work/tiny-queue</loc></url>\n</urlset>'), 'sitemap lists the page last');

    assert.equal(nextNumeral(f.root), 'VIII');
  } finally {
    f.done();
  }
});

test('with no Other builds last, a new Mark is appended and leads back to Mark I', async () => {
  const f = fixture();
  try {
    const p = join(f.root, 'js/marks.js');
    writeFileSync(p, readFileSync(p, 'utf8').replace("name: 'Other builds'", "name: 'More builds'"));
    assert.equal(nextNumeral(f.root), 'VIII');
    const res = applyNewMark(f.root, draft(), spec(), art());
    assert.equal(res.numeral, 'VIII');
    assert.ok(!res.changed.includes('css/project.css'));
    const marks = await marksOf(f.root);
    assert.equal(marks.at(-1).name, 'Tiny Queue');
    assert.equal(literal(f.root, 'js/projects.js', 'const SLUGS = {', '\n};')['tiny-queue'], 7);
    assert.equal(literal(f.root, 'tests/checks.js', 'const CARDS = [', '];').at(-1), 'tiny-queue');
    const page = readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8');
    assert.ok(page.includes('<a class="next" data-mark="i" href="/case-studies/trading-agent.html">'));
    assert.ok(page.includes('<span class="next__pre">Next</span> Systematic Trading System</span>'));
    assert.ok(readFileSync(join(f.root, 'index.html'), 'utf8').includes('Marks I–VIII</small>'));
  } finally {
    f.done();
  }
});

test('spaceLine puts back a dropped space, but never before punctuation', () => {
  assert.equal(spaceLine(['Agents that', 'answer', 'to someone.']).join(''), 'Agents that answer to someone.');
  assert.deepEqual(spaceLine(['Everything Gets ', 'Optimised', '.']), ['Everything Gets ', 'Optimised', '.']);
  assert.deepEqual(spaceLine(['Small and ', 'fast', ' by design.']), ['Small and ', 'fast', ' by design.']);
  assert.equal(spaceLine(['', 'Fast', ', always']).join(''), 'Fast, always');
});

test('a sparse draft leaves out empty sections', () => {
  const f = fixture();
  try {
    applyNewMark(f.root, draft({ evidence: [], limits: '' }), spec(), art());
    const page = readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8');
    assert.ok(!page.includes('<h2 class="mono">Evidence</h2>'));
    assert.ok(!page.includes('Limits'));
    assert.ok(page.includes('<h2 class="mono">How I built it</h2>'));
  } finally {
    f.done();
  }
});

test('a second new Mark becomes VIII and Other builds IX', async () => {
  const f = fixture();
  try {
    applyNewMark(f.root, draft(), spec(), art());
    const res = applyNewMark(f.root, draft({ name: 'Second', slug: 'second' }), pickSuit({ name: 'second' }, lastSuitModels(f.root)), art());
    assert.equal(res.numeral, 'VIII');
    const marks = await marksOf(f.root);
    assert.equal(marks.length, 9);
    assert.deepEqual(marks.slice(-3).map((x) => [x.mark, x.name]), [['VII', 'Tiny Queue'], ['VIII', 'Second'], ['IX', 'Other builds']]);
    const slugs = literal(f.root, 'js/projects.js', 'const SLUGS = {', '\n};');
    assert.equal(slugs.second, 7);
    assert.equal(slugs.others, 8);
    const tq = readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8');
    assert.ok(tq.includes('<a class="next" data-mark="viii" href="/work/second.html">'), 'the first new page now leads to the second');
    assert.ok(readFileSync(join(f.root, 'work/second.html'), 'utf8').includes('<a class="next" data-mark="ix" href="/work/others.html">'));
    const css = readFileSync(join(f.root, 'css/project.css'), 'utf8');
    assert.ok(css.includes('[data-mark="ix"] { --suit: #1b3a78; }'));
  } finally {
    f.done();
  }
});

test('without a source URL the page has no Links section; without a stack, no Stack section', () => {
  const f = fixture();
  try {
    applyNewMark(f.root, draft({ stack: [] }), spec(), art());
    const page = readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8');
    assert.ok(!page.includes('<h2 class="mono">Links</h2>'));
    assert.ok(!page.includes('<h2 class="mono">Stack</h2>'));
  } finally {
    f.done();
  }
});

test('a path-traversal repo name becomes a safe slug and writes stay inside the allowed paths', () => {
  const f = fixture();
  try {
    const before = snapshot(f.root);
    const res = applyNewMark(f.root, draft({ slug: '../../etc/x' }), spec(), art());
    assert.ok(res.changed.includes('work/etc-x.html'));
    assert.deepEqual(readdirSync(f.parent), ['site'], 'nothing written beside the site');
    const after = snapshot(f.root);
    const added = Object.keys(after).filter((k) => !(k in before)).sort();
    assert.deepEqual(added, ['img/art/etc-x.svg', 'work/etc-x.html']);
    const modified = Object.keys(before).filter((k) => before[k] !== after[k]).sort();
    assert.deepEqual(modified, [
      'css/project.css', 'index.html', 'js/hall.js', 'js/marks.js', 'js/projects.js', 'sitemap.xml', 'tests/checks.js', 'tests/run.js',
      'work/others.html', 'work/research-agent.html', 'work/v-bay.html', 'work/watchpartyyy.html',
    ]);
  } finally {
    f.done();
  }
});

test('markup in a repo name is escaped everywhere and never reaches the HTML as a tag', async () => {
  const f = fixture();
  try {
    const evil = '<script>x</script>';
    const indexBefore = readFileSync(join(f.root, 'index.html'), 'utf8');
    applyNewMark(f.root, draft({ slug: evil, name: evil, role: `"><img src=x onerror=alert(1)>`, rows: [[evil, evil]], stack: [evil] }), spec(), art());
    const page = readFileSync(join(f.root, 'work/script-x-script.html'), 'utf8');
    const index = readFileSync(join(f.root, 'index.html'), 'utf8');
    for (const html of [page, index]) {
      assert.ok(!html.includes('<script>x'), 'no injected script tag');
      assert.ok(!html.includes('<img src=x'), 'no injected img tag');
      assert.ok(html.includes('&lt;script&gt;x&lt;/script&gt;'));
    }
    const count = (s) => (s.match(/<script/g) ?? []).length;
    assert.equal(count(page), 2, 'only the template\'s own two scripts');
    assert.equal(count(index), count(indexBefore));
    assert.equal((await marksOf(f.root))[6].name, evil, 'JS keeps the text exactly, as data');
  } finally {
    f.done();
  }
});

test('quotes and brackets in copy cannot break out of the JS literals', async () => {
  const f = fixture();
  try {
    const nasty = `It's "quoted" \\ '}]; globalThis.pwned = 1; //`;
    applyNewMark(f.root, draft({ name: nasty, blurb: nasty }), spec(), art());
    const m = (await marksOf(f.root))[6];
    assert.equal(m.name, nasty);
    assert.equal(m.blurb, nasty);
    assert.equal(globalThis.pwned, undefined);
    assert.equal(literal(f.root, 'js/hall.js', 'const SUITS = [', '\n];').length, 8);
  } finally {
    f.done();
  }
});

test('em dashes are replaced, since the site allows none', async () => {
  const f = fixture();
  try {
    applyNewMark(f.root, draft({ blurb: 'A queue — with retries.' }), spec(), art());
    assert.equal((await marksOf(f.root))[6].blurb, 'A queue, with retries.');
    assert.ok(!readFileSync(join(f.root, 'work/tiny-queue.html'), 'utf8').includes('—'));
  } finally {
    f.done();
  }
});

test('a slug that already exists is refused and nothing changes', () => {
  const f = fixture();
  try {
    const before = snapshot(f.root);
    assert.throws(() => applyNewMark(f.root, draft({ slug: 'assistant-bot' }), spec(), art()), SlugExistsError);
    assert.throws(() => applyNewMark(f.root, draft({ slug: 'watchpartyyy' }), spec(), art()), SlugExistsError);
    writeFileSync(join(f.root, 'work/fresh.html'), 'x');
    assert.throws(() => applyNewMark(f.root, draft({ slug: 'fresh' }), spec(), art()), SlugExistsError);
    rmSync(join(f.root, 'work/fresh.html'));
    assert.deepEqual(snapshot(f.root), before);
  } finally {
    f.done();
  }
});

test('a missing anchor fails loudly and nothing is written', () => {
  const f = fixture();
  try {
    const p = join(f.root, 'js/projects.js');
    writeFileSync(p, readFileSync(p, 'utf8').replace('const SLUGS = {', 'const SLUG_MAP = {'));
    const before = snapshot(f.root);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art()), AnchorError);
    assert.deepEqual(snapshot(f.root), before);

    const g = join(f.root, 'index.html');
    writeFileSync(p, readFileSync(p, 'utf8').replace('const SLUG_MAP = {', 'const SLUGS = {'));
    writeFileSync(g, readFileSync(g, 'utf8').replace('Marks I–VII', 'Marks one to seven'));
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art()), AnchorError);
    assert.ok(!existsSync(join(f.root, 'work/tiny-queue.html')));
  } finally {
    f.done();
  }
});

test('unsafe art, a bad focus or a bad suit is refused before anything is written', () => {
  const f = fixture();
  try {
    const before = snapshot(f.root);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art({ svg: '<svg xmlns="http://www.w3.org/2000/svg"><script>x</script></svg>' })), UnsafeSvgError);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art({ focus: '1%; background: red' })), /focus/);
    assert.throws(() => applyNewMark(f.root, draft(), { ...spec(), model: 'mark-99' }, art()), /model/);
    assert.throws(() => applyNewMark(f.root, draft(), { ...spec(), colours: ['red', '#fff'] }, art()), /colour/);
    assert.throws(() => applyNewMark(f.root, draft({ chips: [['1', 'a']] }), spec(), art()), /chips/);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art(), { sourceUrl: 'javascript:alert(1)' }), /source/);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art(), { liveUrl: 'javascript:alert(1)' }), /live/);
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art(), { liveUrl: 'http://plain.example.dev' }), /live/);
    assert.deepEqual(snapshot(f.root), before);
  } finally {
    f.done();
  }
});

test('a symlinked folder that leads outside the site is refused', () => {
  const f = fixture();
  try {
    const outside = join(f.parent, 'outside');
    mkdirSync(outside);
    rmSync(join(f.root, 'img/art'), { recursive: true });
    symlinkSync(outside, join(f.root, 'img/art'));
    assert.throws(() => applyNewMark(f.root, draft(), spec(), art()), /outside/);
    assert.deepEqual(readdirSync(outside), []);
  } finally {
    f.done();
  }
});
