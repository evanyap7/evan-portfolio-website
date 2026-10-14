# Portfolio revamp (the drawing set) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild evanyap.com as six one-screen "drawing sheets" (Intro, About, Experience, Selected work, Toolkit and credentials, Contact) in a light, single-accent design that works in every mobile browser, keeping the waving cartoon and the animated project diagrams.

**Architecture:**
- Same static site: plain HTML, CSS and ES modules, no build step and no dependencies.
- `index.html` is rewritten around six `section.sheet` elements. The CSS is split by responsibility:
  - `base.css`: tokens, reset and utilities
  - `layout.css`: the shared components
  - `sheets.css`: each sheet's layout
  - `figures.css`: the diagrams and the cartoon
- Behaviour lives in small modules started by `main.js`:
  - `work.js`: project list
  - `index.js`: sheet index and clock
  - `menu.js`: phone menu
  - `contact.js`: copy button
  - `reel.js` and `scenes.js`: the existing diagram engine, recoloured
- A zero-dependency check page (`tests/`) loads the site in iframes at fixed sizes and asserts the spec's rules.

**Tech Stack:** HTML, CSS (grid, `clamp()`, `svh`), vanilla JavaScript (ES modules, Web Animations API), Python 3 `http.server` for local serving.

**Spec:** `docs/superpowers/specs/2026-10-14-portfolio-revamp-design.md`

## Global Constraints

- No framework, no build step, no runtime dependencies. Python 3 is only used to serve files locally.
- Palette tokens, exactly:
  - `--desk #e6e5e0`
  - `--sheet #fafaf7`
  - `--ink #111214`
  - `--ink-2 #4f5156`
  - `--ink-3 #6c6e72`
  - `--rule rgba(17,18,20,.10)`
  - `--rule-2 rgba(17,18,20,.22)`
  - `--accent #2541e6`
  - Diagrams may also use white `#ffffff`.
- Fonts: Switzer 400/500/600 from Fontshare, and Fragment Mono 400 from Google Fonts, both with `display=swap`. No Satoshi, Inter or Instrument Serif.
- One sheet, one screen:
  - At ≥1024 × 650 every sheet has `min-height: calc(100svh - bar - gap)`, with a `100vh` fallback declared first.
  - The checks require an exact fit at 1280 × 650, 1440 × 800 and 1920 × 1080.
  - Everywhere else, sheets grow with their content. Nothing is clipped, and nothing scrolls inside a sheet.
- No horizontal scrolling at any width from 320px.
- Tap targets are at least 44 × 44px on phones, except links inside running text and the sheet ticks; the nav links duplicate the ticks.
- Hover styles go inside `@media (hover: hover)`.
- Not allowed: `backdrop-filter`, `background-attachment: fixed`, scroll snapping, scroll hijacking.
- `prefers-reduced-motion: reduce` stops all motion. Figures show their finished state.
- Supported browsers: iOS Safari 16+, iPadOS Safari, Android Chrome, and current desktop Chrome, Edge, Firefox and Safari 17+.
- Facts and figures in the copy never change. Every shortened or new sentence is listed for Evan in Task 9 before merging.
- Commits: small and frequent on branch `revamp/drawing-set`. Evan is the only author: no `Co-Authored-By` or other credit lines. Nothing is pushed or deployed without Evan's say-so.

## Deviations from the spec (flag to Evan)

1. **Project list pattern.** Projects use one disclosure pattern (a button with `aria-expanded` controlling a region) at every size, not ARIA tabs on desktop. This avoids switching roles at a breakpoint, which screen readers handle badly. Arrow keys, Home and End still move between rows, and on wide screens they also open the row.
2. **Reduced-motion note.** It is a visible line in the cartoon's caption ("still: Reduce Motion is on"), shown only when Reduce Motion is on, not screen-reader-only text. The people who mistake stillness for a fault are sighted visitors like Evan on his iPhone.
3. **No safe-area padding.** The page does not set `viewport-fit=cover`, so Safari keeps content clear of notches itself and no `env(safe-area-inset-*)` padding is needed.
4. **Menu breakpoint.** The menu replaces the bar's navigation below 1024px, so tablets get it too, not only phones.
5. **Sheet-fit sizes.** The fit is checked from 1280px wide, as the spec's Testing section says. Between 1024 and 1279 the desktop layout applies and sheets may grow.
6. **Sheet notes.** The sheet heads gain short mono notes ("Singapore", "2023 – now", "Five projects · 2026", "Updated Oct 2026").
7. **Case study wording.** Its note "Pink marks the only step that was ever a model" becomes "Blue marks…", because the colour changes.

## Review Focus

1. **Browser zoom or larger text.** 1280 × 800 at 200% is a 640 × 400 viewport. Sheets must grow, never clip, and never scroll sideways. Covered by the `overflow` check at 640 × 400 (Task 1).
2. **Web fonts fail to load.** The fallback fonts (Arial, Menlo) are wider, and every sheet must still fit at the fit sizes. Covered by the `fitFallback` check (Task 3).
3. **Widening past 1024px with every project closed.** This happens when a phone rotates, or a window is widened. The desktop layout must still show one project. Covered by the `crossToWide` run (Task 5).
4. **Arriving on a sheet link such as `/#toolkit`.** The index must say 05 straight away, not 01. Covered by the `hashSheet` run (Task 6).
5. **Reduce Motion on, as on Evan's iPhone.** Nothing moves, the figures sit finished, and the caption says why. Covered by the `reducedMotionNote` check (Task 4), plus a visual check in Task 9.

---

## File map

| File | Status | Responsibility |
| --- | --- | --- |
| `tests/index.html`, `tests/run.js`, `tests/checks.js`, `tests/serve.py` | Create | Check page, runner, checks, no-cache local server |
| `.vercelignore` | Modify | Also exclude `tests` from deploys |
| `index.html` | Rewrite | Six sheets, bar, menu |
| `css/base.css` | Rewrite | Tokens, reset, utilities, reveal |
| `css/layout.css` | Create | Bar, menu, sheet, title block, next link, button, link, spec list, rows, caption |
| `css/sheets.css` | Create | Per-sheet layouts |
| `css/figures.css` | Create | Diagram figures, cartoon, keyframes |
| `css/case-study.css` | Rewrite | Case study on the new system |
| `js/main.js` | Rewrite | Starts every module |
| `js/reveal.js` | Modify | Single fade only |
| `js/config.js` | Modify | Comment only |
| `js/reel.js` | Modify | Mount on `.project__panel` instead of `<details>` |
| `js/scenes.js` | Modify | New palette constants |
| `js/work.js` | Create | Project list behaviour, deep links |
| `js/index.js` | Create | Sheet index and SGT clock |
| `js/menu.js` | Create | Phone menu |
| `js/contact.js` | Create | Copy button |
| `case-studies/trading-agent.html` | Modify | New head, bar, sheet wrapper, class names |
| `img/og.jpg` | Replace | New share image |
| `README.md` | Rewrite | New structure |
| `css/hero.css`, `css/keyboard.css`, `css/sections.css`, `css/contact.css`, `css/motion.css` | Delete | Replaced |
| `js/keyboard.js`, `js/kinetic.js`, `js/countup.js`, `js/shader.js`, `js/tabs.js`, `js/projects.js`, `js/scrollspy.js` | Delete | Removed features |

## How to run the checks (used by every task)

1. Start the no-cache server from the repo root, once per session:
   ```bash
   lsof -ti tcp:4173 | xargs kill 2>/dev/null; python3 tests/serve.py 4173 &
   ```
2. Open `http://localhost:4173/tests/` in Chrome. The heading turns into `PASS n` or `FAIL n of m`, and the table lists each result.
3. To read only the failures from DevTools, or from the chrome-devtools MCP's `evaluate_script`, run:
   ```js
   async () => (await window.__done).filter((r) => !r.pass).map((r) => `${r.size} | ${r.name} | ${r.detail}`)
   ```
4. Reload with the cache bypassed after each change.

---

### Task 1: Check harness

**Files:**
- Create: `tests/serve.py`, `tests/index.html`, `tests/run.js`, `tests/checks.js`
- Modify: `.vercelignore`

**Interfaces:**
- Produces:
  - In `tests/run.js`: `ALL` (an array of check names run at every size) and `EXTRA` (an array of `{ width, height, src, names }`). Later tasks edit only these two constants.
  - In `tests/checks.js`: check functions `(win, frame) => Result[] | Promise<Result[]>`, where `Result = { name: string, pass: boolean, detail: string }`.
- Check names used by later tasks: `structure`, `removed`, `overflow`, `fonts`, `targets`, `fit`, `fitFallback`, `palette`, `figureCaptions`, `cartoon`, `reducedMotionNote`, `work`, `deepLink`, `crossToWide`, `sheetIndex`, `hashSheet`, `menu`, `copy`.

- [ ] **Step 1: Write the no-cache server**

`tests/serve.py`:

```python
# Serves the site for local checks with caching turned off, so the checks
# always see the files as they are on disk. Listens on every interface so a
# phone on the same network can open the site too.
#
#   python3 tests/serve.py 4173

import http.server
import os
import sys


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    http.server.ThreadingHTTPServer(('', port), NoStore).serve_forever()
```

- [ ] **Step 2: Write the check page**

`tests/index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Portfolio checks</title>
  <style>
    body { margin: 16px; font: 13px/1.45 ui-monospace, Menlo, monospace; }
    table { border-collapse: collapse; }
    td { padding: 2px 12px 2px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
    .pass td:first-child { color: #1a7f37; }
    .fail { color: #b00020; }
    .frames { position: absolute; top: 0; left: -99999px; }
  </style>
</head>
<body>
  <h1 data-summary>Running…</h1>
  <table data-table></table>
  <div class="frames" data-frames></div>
  <script type="module" src="run.js"></script>
</body>
</html>
```

- [ ] **Step 3: Write the runner**

`tests/run.js`:

```js
import * as checks from './checks.js';

// Viewports for the page-wide checks: desktops, tablets, phones, a landscape
// phone, and 1280 × 800 at 200% zoom.
const SIZES = [
  [1280, 650], [1440, 800], [1920, 1080], [1024, 700],
  [768, 1024], [1024, 1366],
  [320, 640], [375, 667], [393, 852], [412, 915], [430, 932],
  [852, 393], [640, 400],
];

// Checks run at every size, in this order. Later tasks add to it.
const ALL = ['structure', 'removed', 'overflow'];

// One-off runs: a size, a URL and the checks to run there.
const EXTRA = [];

const table = document.querySelector('[data-table]');
const summary = document.querySelector('[data-summary]');
const holder = document.querySelector('[data-frames]');

function load(width, height, src) {
  const [path, hash] = src.split('#');
  const frame = document.createElement('iframe');
  frame.width = String(width);
  frame.height = String(height);
  frame.src = `${path}?t=${Date.now()}${hash ? `#${hash}` : ''}`;
  holder.append(frame);
  return new Promise((resolve) => {
    frame.addEventListener('load', async () => {
      await frame.contentDocument.fonts.ready;
      await new Promise((done) => { setTimeout(done, 400); });
      resolve(frame);
    }, { once: true });
  });
}

function row(cells, pass) {
  const tr = document.createElement('tr');
  tr.className = pass ? 'pass' : 'fail';
  cells.forEach((text) => {
    const td = document.createElement('td');
    td.textContent = text;
    tr.append(td);
  });
  table.append(tr);
}

async function run({ width, height, src, names }, results) {
  const frame = await load(width, height, src);
  const label = `${width}×${height}${src === '/' ? '' : ` ${src}`}`;
  for (const name of names) {
    const found = await checks[name](frame.contentWindow, frame);
    found.forEach((result) => {
      results.push({ size: label, ...result });
      row([result.pass ? 'PASS' : 'FAIL', label, result.name, result.detail], result.pass);
    });
  }
  frame.remove();
}

window.__done = (async () => {
  const results = [];
  const runs = [
    ...SIZES.map(([width, height]) => ({ width, height, src: '/', names: ALL })),
    ...EXTRA,
  ];
  for (const each of runs) await run(each, results);
  const failed = results.filter((result) => !result.pass);
  summary.textContent = failed.length ? `FAIL ${failed.length} of ${results.length}` : `PASS ${results.length}`;
  window.__results = results;
  return results;
})();
```

- [ ] **Step 4: Write every check**

The later tasks switch these on by name. `tests/checks.js`:

```js
// Checks the portfolio against its spec. Each check gets the window of the
// page loaded in an iframe of a set size, and the iframe itself, and returns
// a list of { name, pass, detail }. run.js decides which checks run where.

const FIT = { minWidth: 1280, minHeight: 650 };
const WIDE = 1024;
const PHONE = 720;
const SHEETS = ['top', 'about', 'experience', 'work', 'toolkit', 'contact'];
const OLD_COLOURS = /#(ffb7d5|ffd98e|a9ddff|b9f2df|ff8fb1|ffe446|cdf5e6|ff9fb6|3a4a86|9b3158)|rgba\(255,\s*228|rgba\(255,\s*255,\s*255,\s*0?\.5\)/i;

const result = (name, pass, detail = '') => ({ name, pass: Boolean(pass), detail: String(detail) });
const wait = (ms) => new Promise((done) => { setTimeout(done, ms); });
const shown = (el) => {
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
};

// Six sheets in story order, each with a title block and a link to the next.
export function structure(win) {
  const sheets = [...win.document.querySelectorAll('main > .sheet')];
  const ids = sheets.map((sheet) => sheet.id).join(',');
  const out = [result('six sheets in story order', ids === SHEETS.join(','), ids)];
  sheets.forEach((sheet, i) => {
    const want = `#${SHEETS[(i + 1) % SHEETS.length]}`;
    const href = sheet.querySelector('.sheet__next')?.getAttribute('href');
    out.push(result(`${sheet.id}: title block`, sheet.querySelector('.titleblock')));
    out.push(result(`${sheet.id}: next link to ${want}`, href === want, href ?? 'none'));
  });
  return out;
}

export function removed(win) {
  const doc = win.document;
  const gone = ['.keyboard', '.marquee', '[data-kinetic]', '[data-shader]', '[data-tabs]', '.chip', '.credentials'];
  const files = ['keyboard.css', 'marquee.css', 'hero.css', 'sections.css', 'contact.css', 'motion.css'];
  const hrefs = [...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'));
  return [
    ...gone.map((selector) => result(`removed: ${selector}`, !doc.querySelector(selector))),
    result('removed: old stylesheets', !hrefs.some((href) => files.some((file) => href.endsWith(file))), hrefs.join(' ')),
  ];
}

export function overflow(win) {
  const width = win.document.documentElement.scrollWidth;
  return [result('no horizontal scroll', width <= win.innerWidth, `${width} vs ${win.innerWidth}`)];
}

export function fonts(win) {
  const loaded = [...win.document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family.replace(/"/g, ''));
  return [
    result('Switzer loaded', loaded.includes('Switzer'), loaded.join(', ')),
    result('Fragment Mono loaded', loaded.includes('Fragment Mono'), loaded.join(', ')),
  ];
}

// On phones, every control a thumb needs is at least 44 × 44.
export function targets(win) {
  if (win.innerWidth >= PHONE) return [];
  const selector = '.bar a, .bar button, .project__row, .button, [data-copy], .sheet__next, .project__links a, .contact__spec a, .intro__actions a';
  const small = [...win.document.querySelectorAll(selector)].filter(shown).filter((el) => {
    const box = el.getBoundingClientRect();
    return box.width < 44 || box.height < 44;
  });
  return [result('tap targets at least 44px', small.length === 0, small.map((el) => el.textContent.trim().slice(0, 30)).join(' | '))];
}

// At the fit sizes each sheet is exactly one screen below the bar.
export function fit(win) {
  if (win.innerWidth < FIT.minWidth || win.innerHeight < FIT.minHeight) return [];
  const doc = win.document;
  const room = win.innerHeight - doc.querySelector('.bar').getBoundingClientRect().height - 12;
  return [...doc.querySelectorAll('main > .sheet')].map((sheet) => {
    const height = sheet.getBoundingClientRect().height;
    return result(`${sheet.id}: fits one screen`, Math.abs(height - room) <= 1, `${Math.round(height)} vs ${Math.round(room)}`);
  });
}

// The same, with the wider fallback fonts a visitor gets if the web fonts fail.
export async function fitFallback(win) {
  if (win.innerWidth < FIT.minWidth || win.innerHeight < FIT.minHeight) return [];
  const root = win.document.documentElement;
  root.style.setProperty('--font-sans', 'Arial, sans-serif');
  root.style.setProperty('--font-mono', 'Menlo, Consolas, monospace');
  await wait(50);
  const out = fit(win).map((each) => ({ ...each, name: `${each.name} (fallback fonts)` }));
  root.style.removeProperty('--font-sans');
  root.style.removeProperty('--font-mono');
  return out;
}

export function palette(win) {
  const stale = [...win.document.querySelectorAll('svg [fill], svg [stroke]')]
    .filter((el) => OLD_COLOURS.test(`${el.getAttribute('fill')} ${el.getAttribute('stroke')}`));
  return [result('figures use only the new palette', stale.length === 0, `${stale.length} old colours`)];
}

export function figureCaptions(win) {
  const labels = [...win.document.querySelectorAll('.reel__name b')].map((b) => b.textContent.trim());
  const want = ['Fig. 4.1', 'Fig. 4.2', 'Fig. 4.3', 'Fig. 4.4', 'Fig. 4.5'];
  return [result('figures numbered 4.1 to 4.5', labels.join() === want.join(), labels.join())];
}

export function cartoon(win) {
  const art = win.document.querySelector('#top [data-wave] svg[role="img"]');
  return [result('cartoon waves in the intro, recoloured', art && art.querySelector('circle[fill="#2541e6"]') && !art.querySelector('[fill="#ff9fb6"]'))];
}

// The caption under the cartoon explains why it is still when Reduce Motion is on.
export function reducedMotionNote(win) {
  const doc = win.document;
  let ruled = false;
  [...doc.styleSheets].forEach((sheet) => {
    let rules = [];
    try { rules = [...sheet.cssRules]; } catch { return; }
    rules.forEach((rule) => {
      if (rule.media && /reduce/.test(rule.media.mediaText) && /caption__still/.test(rule.cssText)) ruled = true;
    });
  });
  return [result('reduced-motion note under the cartoon', doc.querySelector('#top .caption__still') && ruled)];
}

export function work(win) {
  const doc = win.document;
  const rows = [...doc.querySelectorAll('.project__row')];
  const panels = [...doc.querySelectorAll('.project__panel')];
  const open = () => panels.filter((panel) => !panel.hidden).map((panel) => panel.id).join();
  const accordion = win.innerWidth < WIDE;
  const out = [
    result('five projects', rows.length === 5 && panels.length === 5, `${rows.length} rows, ${panels.length} panels`),
    result('4.1 open on load', open() === panels[0]?.id, open()),
  ];
  rows[2].click();
  out.push(result('choosing 4.3 opens only 4.3', open() === panels[2].id, open()));
  out.push(result('rows report their state', rows[2].getAttribute('aria-expanded') === 'true' && rows[0].getAttribute('aria-expanded') === 'false'));
  rows[2].click();
  out.push(accordion
    ? result('tapping the open row closes it', open() === '', open())
    : result('clicking the open row keeps it open', open() === panels[2].id, open()));
  rows[0].click();
  return out;
}

export function deepLink(win) {
  const id = win.location.hash.slice(1);
  const row = win.document.getElementById(id)?.querySelector('.project__row');
  const panel = row && win.document.getElementById(row.getAttribute('aria-controls'));
  return [result(`#${id} opens that project`, panel && !panel.hidden)];
}

// Closes every project on a phone-width page, then widens it past 1024.
export async function crossToWide(win, frame) {
  win.document.querySelector('.project__row[aria-expanded="true"]')?.click();
  frame.width = '1440';
  frame.height = '800';
  await wait(400);
  const open = [...win.document.querySelectorAll('.project__panel')].filter((panel) => !panel.hidden);
  return [result('widening past 1024px opens one project', open.length === 1, `${open.length} open`)];
}

export async function sheetIndex(win) {
  const doc = win.document;
  doc.getElementById('experience').scrollIntoView({ behavior: 'instant' });
  await wait(300);
  const number = doc.querySelector('[data-where-n]')?.textContent;
  const current = doc.querySelector('.ticks a[aria-current="true"]')?.getAttribute('href');
  win.scrollTo({ top: 0, behavior: 'instant' });
  await wait(100);
  const clock = doc.querySelector('[data-clock]')?.textContent ?? '';
  return [
    result('index follows the sheet on screen', number === '03' && current === '#experience', `${number} ${current}`),
    result('clock shows Singapore time', /^SGT \d{2}:\d{2}$/.test(clock), clock),
  ];
}

export function hashSheet(win) {
  const number = win.document.querySelector('[data-where-n]')?.textContent;
  return [result('arriving at #toolkit marks sheet 05', number === '05', number)];
}

export function menu(win) {
  const doc = win.document;
  const button = doc.querySelector('[data-menu-button]');
  const panel = doc.getElementById('menu');
  if (win.innerWidth >= WIDE) return [result('menu button hidden on wide screens', button && !shown(button))];
  const out = [
    result('menu button shown', button && shown(button)),
    result('menu starts closed', panel?.hidden),
  ];
  button.click();
  out.push(result('menu opens', !panel.hidden && button.getAttribute('aria-expanded') === 'true'));
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  out.push(result('Escape closes it', panel.hidden && button.getAttribute('aria-expanded') === 'false'));
  return out;
}

// In an unfocused iframe the clipboard refuses, so either outcome passes.
export async function copy(win) {
  const button = win.document.querySelector('[data-copy]');
  if (!button || button.hidden) return [result('copy button shown', false, 'missing or hidden')];
  button.click();
  await wait(150);
  return [result('copy button responds', /Copied|Selected/.test(button.textContent), button.textContent)];
}
```

- [ ] **Step 5: Keep the checks out of deploys**

Replace the contents of `.vercelignore` with:

```
docs
tests
```

- [ ] **Step 6: Run the checks against the current page to see them fail**

Run the server and open `http://localhost:4173/tests/` (see "How to run the checks").

Expected: `FAIL`, with these failing at every size:
- `six sheets in story order`
- the per-sheet title-block and next-link checks
- `removed: .keyboard`, `removed: .credentials`
- `removed: old stylesheets`

`no horizontal scroll` should pass.

- [ ] **Step 7: Commit**

```bash
git add tests/serve.py tests/index.html tests/run.js tests/checks.js .vercelignore
git commit -m "test: add a browser check page for the revamp"
```

---

### Task 2: New page skeleton, tokens and shared components

**Files:**
- Rewrite: `index.html`, `css/base.css`, `js/main.js`, `js/reveal.js`
- Create: `css/layout.css`, `css/sheets.css` (header comment only), `css/figures.css` (header comment only)
- Modify: `js/config.js` (comment), `tests/run.js` (`ALL`)
- Delete:
  - `css/hero.css`, `css/keyboard.css`, `css/sections.css`, `css/contact.css`, `css/motion.css`
  - `js/keyboard.js`, `js/kinetic.js`, `js/countup.js`, `js/shader.js`, `js/tabs.js`, `js/projects.js`, `js/scrollspy.js`

**Interfaces:**
- Produces the markup contract every later task relies on:
  - Sheets: `main > section.sheet#{top,about,experience,work,toolkit,contact}`, each with `data-sheet` ("01" to "06") and `data-sheet-name`, a `.sheet__next` link and a `.titleblock`.
  - Bar: `.bar` containing `.bar__id`, `nav.bar__index`, `nav.bar__nav` and `button.bar__menu[data-menu-button][aria-controls="menu"]`.
  - Sheet index: `.ticks a[href="#…"]` (the first has `aria-current="true"`), `[data-where-n]`, `[data-where-name]`.
  - Clocks: `[data-clock]` (two of them).
  - Menu: `nav.menu#menu[hidden]` with `.menu__sheets a`.
  - Projects: `.projects[data-projects]` holding, for each project, `h3.project__head#work-{slug}` containing `button.project__row#row-{slug}[aria-controls="panel-{slug}"][aria-expanded="true"]`, followed by `div.project__panel#panel-{slug}`.
  - Slugs: `website-revamp`, `assistant-bot`, `trading-agent`, `research-agent`, `v-bay`.
  - Contact: `button[data-copy][hidden]` and `[data-copy-status]`.
  - Email: `[data-contact-link]` gets a `mailto:` href, and `[data-contact-text]` gets the address as its text.
  - Cartoon: `.wave[data-wave]` in `#top`, with `.caption__still` in its caption.
  - Diagrams: `figure.reel[data-reel="chain|ledger|rating|market"]`.

- [ ] **Step 1: Switch on the checks this task must pass**

In `tests/run.js` replace the `ALL` line with:

```js
const ALL = ['structure', 'removed', 'overflow', 'fonts'];
```

Run the checks. Expected: FAIL, as in Task 1, plus `Switzer loaded` and `Fragment Mono loaded`.

- [ ] **Step 2: Write `index.html`**

Write this template. The five `<!-- svg:… -->` and `<!-- reel:… -->` markers are filled in Step 3, from the current page's markup.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Evan Yap — Software and AI engineering</title>
  <meta name="description" content="Evan Yap is an Engineering Systems and Design student at SUTD and an AI Business Consultant Intern at Univers. He builds AI systems and measures whether they work. Looking for software engineering and AI internships.">
  <meta name="theme-color" content="#e6e5e0">
  <meta property="og:title" content="Evan Yap — Software and AI engineering">
  <meta property="og:description" content="I build AI systems and check they work. Top 5 at the Corporate Website Revamp Challenge, 2nd place at a regional hackathon.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://www.evanyap.com/">
  <meta property="og:image" content="https://www.evanyap.com/img/og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Evan Yap's portfolio: the headline “I build AI systems, and check they work” beside a cartoon of Evan waving, on a paper drawing sheet.">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://www.evanyap.com/">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23111214'/%3E%3Crect x='4.5' y='4.5' width='23' height='23' fill='none' stroke='%23fafaf7'/%3E%3Crect x='9' y='19' width='14' height='3' fill='%232541e6'/%3E%3C/svg%3E">

  <link rel="preconnect" href="https://api.fontshare.com" crossorigin>
  <link rel="preconnect" href="https://cdn.fontshare.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fragment+Mono&display=swap">

  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/layout.css">
  <link rel="stylesheet" href="css/sheets.css">
  <link rel="stylesheet" href="css/figures.css">

  <script>document.documentElement.classList.add('js');</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>

  <header class="bar">
    <a class="bar__id" href="#top">Evan Yap<span class="bar__role">&nbsp;— Software &amp; AI engineering</span></a>

    <nav class="bar__index" aria-label="Sheets">
      <ol class="ticks">
        <li><a href="#top" aria-current="true"><span class="visually-hidden">01 Intro</span></a></li>
        <li><a href="#about"><span class="visually-hidden">02 About</span></a></li>
        <li><a href="#experience"><span class="visually-hidden">03 Experience</span></a></li>
        <li><a href="#work"><span class="visually-hidden">04 Selected work</span></a></li>
        <li><a href="#toolkit"><span class="visually-hidden">05 Toolkit and credentials</span></a></li>
        <li><a href="#contact"><span class="visually-hidden">06 Contact</span></a></li>
      </ol>
      <p class="bar__where mono" aria-hidden="true"><b data-where-n>01</b> / 06 <span data-where-name>Intro</span></p>
    </nav>

    <nav class="bar__nav" aria-label="Primary">
      <span class="bar__clock mono" data-clock></span>
      <a href="#about">About</a>
      <a href="#experience">Experience</a>
      <a href="#work">Work</a>
      <a href="#toolkit">Toolkit</a>
      <a href="#contact">Contact</a>
      <a class="link" href="resume/Evan-Yap-Resume.pdf" target="_blank" rel="noopener">Resume <span aria-hidden="true">↓</span><span class="visually-hidden"> (PDF, opens in a new tab)</span></a>
    </nav>

    <button class="bar__menu" type="button" aria-expanded="false" aria-controls="menu" data-menu-button>Menu</button>
  </header>

  <nav class="menu" id="menu" aria-label="Menu" hidden data-menu>
    <ol class="menu__sheets">
      <li><a href="#top" aria-current="true"><span class="mono">01</span>Intro</a></li>
      <li><a href="#about"><span class="mono">02</span>About</a></li>
      <li><a href="#experience"><span class="mono">03</span>Experience</a></li>
      <li><a href="#work"><span class="mono">04</span>Selected work</a></li>
      <li><a href="#toolkit"><span class="mono">05</span>Toolkit and credentials</a></li>
      <li><a href="#contact"><span class="mono">06</span>Contact</a></li>
    </ol>
    <p class="menu__more">
      <a class="link" href="resume/Evan-Yap-Resume.pdf" target="_blank" rel="noopener">Resume (PDF) <span aria-hidden="true">↓</span><span class="visually-hidden"> (opens in a new tab)</span></a>
      <a class="link" href="#contact" data-contact-link data-contact-text>Email</a>
    </p>
    <p class="menu__clock mono" data-clock></p>
  </nav>

  <main id="main">
    <section class="sheet" id="top" aria-labelledby="intro-title" data-sheet="01" data-sheet-name="Intro">
      <p class="sheet__label mono"><b>01</b> Intro</p>
      <div class="intro">
        <h1 class="intro__title" id="intro-title">I build AI systems, and <span class="mark">check they work.<svg class="mark__stroke" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true"><path d="M4 13C52 4 96 17 150 9s98-4 146 2" pathLength="1"/></svg></span></h1>
        <figure class="intro__figure">
          <div class="wave" data-wave>
            <!-- svg:cartoon -->
          </div>
          <figcaption class="caption mono"><span>Fig. 1.1 — The author, waving<span class="caption__still"> (still: Reduce Motion is on)</span></span><span>Drawn from a photo · see sheet 02</span></figcaption>
        </figure>
        <p class="intro__lede">I’m <strong>Evan Yap</strong>, an engineering student in Singapore. I build agents and tools with AI, measure whether they earn their place, and keep only what the numbers support. Looking for software engineering and AI internships.</p>
        <p class="intro__actions">
          <a class="button" href="resume/Evan-Yap-Resume.pdf" target="_blank" rel="noopener">Download resume (PDF) <span aria-hidden="true">↓</span><span class="visually-hidden"> (opens in a new tab)</span></a>
          <a class="link" href="#contact" data-contact-link data-contact-text>Email me</a>
        </p>
        <dl class="spec intro__spec">
          <div><dt class="mono">Now</dt><dd>AI Business Consultant Intern, Univers</dd></div>
          <div><dt class="mono">Studying</dt><dd>Engineering Systems and Design, SUTD · 1 of 6 TEP scholars</dd></div>
          <div><dt class="mono">Recognition</dt><dd>Top 5, Corporate Website Revamp · 2nd, Vietnam Grand Challenge</dd></div>
        </dl>
      </div>
      <a class="sheet__next mono" href="#about">Next: 02 About <span aria-hidden="true">→</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>01/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>

    <section class="sheet" id="about" aria-labelledby="about-title" data-sheet="02" data-sheet-name="About">
      <p class="sheet__label mono"><b>02</b> About</p>
      <div class="sheet__head"><h2 class="sheet__title" id="about-title">About</h2><p class="mono">Singapore</p></div>
      <div class="about">
        <figure class="about__photo" data-reveal>
          <img src="img/evan.jpg" srcset="img/evan-600.jpg 600w, img/evan.jpg 1000w" sizes="(min-width: 1024px) 34vw, 90vw" width="1000" height="1339" loading="lazy" decoding="async" alt="Evan Yap smiling, in a navy suit and burgundy tie, standing in an office.">
          <figcaption class="caption mono"><span>Fig. 2.1 — The author, in person</span></figcaption>
        </figure>
        <div class="about__text" data-reveal>
          <p class="about__statement">I keep what the numbers support and delete what they don’t.</p>
          <p>I’m studying Engineering Systems and Design at the Singapore University of Technology and Design, on a dual degree with a Master’s in Technology Entrepreneurship, as one of six recipients of its Technology Entrepreneurship Programme Scholarship.</p>
          <p>I work where data, automation and AI meet: agents that do the research, models that test the assumptions, and interfaces that make the answer easy to act on. Then I measure whether each one earned its place.</p>
          <p>Away from the keyboard I captain SUTD’s men’s floorball team and train as a HYROX athlete. I’ve played guitar in my church’s worship ministry since 2019, I’m in SUTD’s Google Developers Club, and I helped attendees debug at DevFest Singapore 2025. I also run on a lot of coffee.</p>
        </div>
      </div>
      <a class="sheet__next mono" href="#experience">Next: 03 Experience <span aria-hidden="true">→</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>02/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>

    <section class="sheet" id="experience" aria-labelledby="experience-title" data-sheet="03" data-sheet-name="Experience">
      <p class="sheet__label mono"><b>03</b> Experience</p>
      <div class="sheet__head"><h2 class="sheet__title" id="experience-title">Experience</h2><p class="mono">2023 – now</p></div>
      <ol class="roles">
        <li class="role" data-reveal>
          <p class="role__dates mono">Aug 2026 – now</p>
          <div class="role__who">
            <h3 class="role__org"><img class="role__logo" src="img/logos/univers.svg" alt="Univers" width="104" height="22"></h3>
            <p class="role__title">Intern, AI Business Consultant · Aviation, Transportation, Logistics</p>
          </div>
          <ul class="role__points">
            <li>Built and deployed an internal AI research agent that automates ESG disclosure research and claim verification. Details are confidential.</li>
            <li>Calibrated an HVAC energy-consumption model to within 2–3 percentage points of observed use, to validate client energy assumptions and find efficiency gains.</li>
            <li>Ranked AI and energy-management use cases by impact, telemetry, feasibility and effort, and turned them into business cases for the Senior Director, Global Lead and clients.</li>
          </ul>
        </li>
        <li class="role" data-reveal>
          <p class="role__dates mono">Sept 2024 – Jan 2026</p>
          <div class="role__who">
            <h3 class="role__org">EvanYapFitness</h3>
            <p class="role__title">Founder</p>
          </div>
          <ul class="role__points">
            <li>Grew an online coaching brand to 2.2k followers and 10k average views per post by iterating on content analytics and A/B-tested messaging.</li>
            <li>Built an intake pipeline for more than 20 clients, and an AI-assisted workflow that drafts their training and meal templates for me to refine by hand, halving average programming time per client.</li>
          </ul>
        </li>
      </ol>
      <h3 class="roles__earlier mono">Earlier</h3>
      <ol class="roles roles--earlier">
        <li class="role" data-reveal>
          <p class="role__dates mono">Dec 2024 – Mar 2025</p>
          <div class="role__who">
            <h4 class="role__org">The Social Nugget</h4>
            <p class="role__title">Digital Marketing Intern</p>
          </div>
          <p class="role__points">Tracked reach, click-through and A/B test results in Meta Business Suite and turned them into reports that shaped the next content calendars.</p>
        </li>
        <li class="role" data-reveal>
          <p class="role__dates mono">Jan 2023 – Nov 2024</p>
          <div class="role__who">
            <h4 class="role__org">Singapore Army</h4>
            <p class="role__title">Detachment Commander, 1st Commando Battalion</p>
          </div>
          <p class="role__points">Led a detachment of 12 in a unit awarded Best Combat Unit for 2023/24, and represented the SAF in the National Day Parade 2024 Colours Party.</p>
        </li>
      </ol>
      <a class="sheet__next mono" href="#work">Next: 04 Selected work <span aria-hidden="true">→</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>03/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>

    <section class="sheet" id="work" aria-labelledby="work-title" data-sheet="04" data-sheet-name="Selected work">
      <p class="sheet__label mono"><b>04</b> Selected work</p>
      <div class="sheet__head"><h2 class="sheet__title" id="work-title">Selected work</h2><p class="mono">Five projects · 2026</p></div>
      <div class="projects" data-projects>
        <h3 class="project__head" id="work-website-revamp">
          <button class="project__row" type="button" id="row-website-revamp" aria-controls="panel-website-revamp" aria-expanded="true">
            <span class="project__n mono">4.1</span>
            <span class="project__title">Corporate Website Revamp Challenge</span>
            <span class="project__meta mono"><em>Top 5</em> · Frontend developer · Sept 2026</span>
            <span class="project__key">9 pages</span>
          </button>
        </h3>
        <div class="project__panel" id="panel-website-revamp" role="region" aria-labelledby="row-website-revamp">
          <figure class="reel reel--plate">
            <figcaption class="reel__bar"><span class="reel__name"><b>Fig. 4.1</b> Homepage, branding redacted</span></figcaption>
            <div class="reel__scene reel__scene--plate"><img src="img/previews/website-revamp.webp" width="1440" height="900" loading="lazy" decoding="async" alt="A redesigned corporate homepage with a large headline beside a live operations dashboard. Company branding is redacted."></div>
          </figure>
          <p class="project__summary">A nine-page interactive redesign of a company’s website, built with no framework and no build step. It reached the Top 5 against senior solution architects worldwide, and I pitched it live to the CEO.</p>
          <dl class="figures">
            <div><dt>Finalist against senior solution architects worldwide</dt><dd>Top 5</dd></div>
            <div><dt>Languages from one custom i18n engine</dt><dd>7</dd></div>
            <div><dt>Executive tools: ROI modeler, ops simulator, live counters</dt><dd>3</dd></div>
          </dl>
          <div class="project__foot">
            <p class="project__stack mono">Vanilla JavaScript · Three.js (WebGL) · CSS · Web Audio API · Vercel serverless functions</p>
            <p class="project__links"><a class="link" href="https://github.com/evanyap7/univers-homepage-revamp" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></p>
          </div>
        </div>

        <h3 class="project__head" id="work-assistant-bot">
          <button class="project__row" type="button" id="row-assistant-bot" aria-controls="panel-assistant-bot" aria-expanded="true">
            <span class="project__n mono">4.2</span>
            <span class="project__title">Personal Assistant Bot</span>
            <span class="project__meta mono">Full-stack developer · Aug – Sept 2026</span>
            <span class="project__key">~65% cheaper</span>
          </button>
        </h3>
        <div class="project__panel" id="panel-assistant-bot" role="region" aria-labelledby="row-assistant-bot">
          <!-- reel:chain -->
          <p class="project__summary">A serverless Telegram assistant that handles calendars, expenses, bill splitting and email from text, voice notes or photos. A three-model chain tries the cheapest model first and fails over to the next.</p>
          <dl class="figures">
            <div><dt>Intents, each validated by a Zod schema</dt><dd>24</dd></div>
            <div><dt>Test commands routed correctly (my own set, so a smoke test)</dt><dd>31/31</dd></div>
            <div><dt>Lower cost per call across the chain (21-message benchmark)</dt><dd>~65%</dd></div>
            <div><dt>Lower batch latency than sequential parsing (7 receipts)</dt><dd>~77%</dd></div>
          </dl>
          <div class="project__foot">
            <p class="project__stack mono">Next.js · TypeScript · Vercel AI SDK · Gemini · Perplexity Sonar · Google Cloud Pub/Sub · Gmail, Sheets and Calendar APIs · Zod</p>
            <p class="project__links">
              <a class="link" href="https://github.com/evanyap7/telegram-personal-assistant" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a>
              <a class="link" href="https://github.com/evanyap7/telegram-personal-assistant/tree/main/scripts" target="_blank" rel="noopener">Benchmarks and tests <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a>
            </p>
          </div>
        </div>

        <h3 class="project__head" id="work-trading-agent">
          <button class="project__row" type="button" id="row-trading-agent" aria-controls="panel-trading-agent" aria-expanded="true">
            <span class="project__n mono">4.3</span>
            <span class="project__title">Autonomous Trading Agent</span>
            <span class="project__meta mono">Developer · Sept 2026</span>
            <span class="project__key">174 tests</span>
          </button>
        </h3>
        <div class="project__panel" id="panel-trading-agent" role="region" aria-labelledby="row-trading-agent">
          <!-- reel:ledger -->
          <p class="project__summary">A swing-trading agent for a Webull Singapore cash account where no model can size or place an order. I backtested the Claude agents against a plain momentum rule on 2024 data, found no measurable edge for about $27 a year, and removed the LLM layer.</p>
          <dl class="figures">
            <div><dt>Automated tests, run in CI on every push</dt><dd>174</dd></div>
            <div><dt>Symbols in the 2024 backtest</dt><dd>112</dd></div>
            <div><dt>Yearly API cost of the LLM layer I measured, then removed</dt><dd>~$27</dd></div>
          </dl>
          <div class="project__foot">
            <p class="project__stack mono">Python · Pydantic · SQLite · pytest · Webull OpenAPI SDK · Databento · Telegram Bot API</p>
            <p class="project__links">
              <a class="link" href="case-studies/trading-agent.html">Read the case study <span aria-hidden="true">→</span></a>
              <a class="link" href="https://github.com/evanyap7/evans-trading-agent" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a>
              <a class="link" href="https://github.com/evanyap7/evans-trading-agent/blob/HEAD/docs/backtest-llm-vs-baseline-2024.md" target="_blank" rel="noopener">Backtest report <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a>
            </p>
          </div>
        </div>

        <h3 class="project__head" id="work-research-agent">
          <button class="project__row" type="button" id="row-research-agent" aria-controls="panel-research-agent" aria-expanded="true">
            <span class="project__n mono">4.4</span>
            <span class="project__title">Decarbonisation Research Agent</span>
            <span class="project__meta mono">Full-stack developer · Aug 2026</span>
            <span class="project__key">0–100 rating</span>
          </button>
        </h3>
        <div class="project__panel" id="panel-research-agent" role="region" aria-labelledby="row-research-agent">
          <!-- reel:rating -->
          <p class="project__summary">A research tool for a company’s energy engineers and decarbonisation consultants. It answers only from the reports and PDFs it retrieved, as a cited brief or a verdict on an ESG claim, and drops any finding that cites a source it never fetched.</p>
          <dl class="figures">
            <div><dt>Modes: research brief and claim verification</dt><dd>2</dd></div>
            <div><dt>Verdicts, each with a 0–100 truth rating</dt><dd>3</dd></div>
            <div><dt>Preset practice areas, from ports to renewables</dt><dd>5</dd></div>
          </dl>
          <div class="project__foot">
            <p class="project__stack mono">Next.js · React · TypeScript · Tailwind CSS · Vercel AI SDK · Groq (gpt-oss-120b) with Gemini fallback · Zod · Cheerio · pdf-parse</p>
            <p class="project__links"><a class="link" href="https://github.com/evanyap7/approved-research-agent" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></p>
          </div>
        </div>

        <h3 class="project__head" id="work-v-bay">
          <button class="project__row" type="button" id="row-v-bay" aria-controls="panel-v-bay" aria-expanded="true">
            <span class="project__n mono">4.5</span>
            <span class="project__title">Project V-Bẫy</span>
            <span class="project__meta mono"><em>2nd place</em> · Strategy and research lead · May 2026</span>
            <span class="project__key">$350M TAM</span>
          </button>
        </h3>
        <div class="project__panel" id="panel-v-bay" role="region" aria-labelledby="row-v-bay">
          <!-- reel:market -->
          <p class="project__summary">An AI-driven telecom honeypot and DaaS platform to intercept and expose voice-phishing networks, built for the Entrepreneurial Solutions to Vietnam’s Grand Challenge Hackathon. I sized the market, built the three-year financial model and pitched it to four investors.</p>
          <dl class="figures">
            <div><dt>Total addressable market by 2027</dt><dd>$350M</dd></div>
            <div><dt>Serviceable obtainable market</dt><dd>$7.5M</dd></div>
            <div><dt>Months to projected break-even</dt><dd>24–36</dd></div>
          </dl>
          <div class="project__foot">
            <p class="project__stack mono">Market sizing · Stakeholder interviews · Financial modelling in Excel · B2G and B2B go-to-market</p>
            <p class="project__links"><a class="link" href="https://canva.link/ons4k8siiodipm9" target="_blank" rel="noopener">Pitch deck (Canva) <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></p>
          </div>
        </div>

        <p class="also"><b>Also built</b> Dragon Tiles, an interactive outdoor piano sculpture (lead design engineer), and SleepWise, a bedtime-nudge app (idea, feature design and demo video).</p>
      </div>
      <a class="sheet__next mono" href="#toolkit">Next: 05 Toolkit and credentials <span aria-hidden="true">→</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>04/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>

    <section class="sheet" id="toolkit" aria-labelledby="toolkit-title" data-sheet="05" data-sheet-name="Toolkit and credentials">
      <p class="sheet__label mono"><b>05</b> Toolkit and credentials</p>
      <div class="sheet__head"><h2 class="sheet__title" id="toolkit-title">Toolkit and credentials</h2><p class="mono">Updated Oct 2026</p></div>
      <div class="kit">
        <div class="kit__tools" data-reveal>
          <h3 class="kit__head mono">Toolkit</h3>
          <dl class="rows">
            <div><dt class="mono">Languages</dt><dd>Python · TypeScript · JavaScript · C++ · C · SQL · HTML · CSS</dd></div>
            <div><dt class="mono">Frameworks</dt><dd>Next.js · React · Node.js · Tailwind CSS · Three.js · Vercel AI SDK · Zod · REST APIs · OAuth 2.0 · Telegram Bot API</dd></div>
            <div><dt class="mono">AI and data</dt><dd>Claude API · Google Gemini · Perplexity Sonar · LLM agents · Prompt engineering · Data analysis · Excel and Sheets</dd></div>
            <div><dt class="mono">Cloud and tools</dt><dd>Vercel · Git · GitHub · Google Cloud · Gmail, Calendar and Sheets APIs</dd></div>
            <div><dt class="mono">Design and modelling</dt><dd>Grasshopper · Rhino 3D · Blender · CAD</dd></div>
          </dl>
        </div>
        <div class="kit__recognition" data-reveal>
          <h3 class="kit__head mono">Recognition</h3>
          <dl class="rows">
            <div><dt>Top 5</dt><dd>Corporate Website Revamp Challenge, 2026. Finalist against senior solution architects worldwide; pitched live to the CEO.</dd></div>
            <div><dt>2nd place</dt><dd>Entrepreneurial Solutions to Vietnam’s Grand Challenge Hackathon, 2026, with Project V-Bẫy.</dd></div>
            <div><dt>1 of 6</dt><dd>Recipients of the SUTD Technology Entrepreneurship Programme Scholarship.</dd></div>
            <div><dt>Nominated</dt><dd>Best Storytelling and Execution, 03.007 Innovating with Design and AI, for Dragon Tiles.</dd></div>
          </dl>
        </div>
        <div class="kit__education" id="education" data-reveal>
          <h3 class="kit__head mono">Education</h3>
          <dl class="rows rows--stacked">
            <div><dt>Singapore University of Technology and Design</dt><dd>B.Eng. Engineering Systems and Design and M.Sc. Technology Entrepreneurship, expected May 2030.</dd></div>
            <div><dt>VinUniversity</dt><dd>Entrepreneurial Solutions to Vietnam’s Grand Challenge course, May 2026.</dd></div>
            <div><dt>Victoria Junior College</dt><dd>GCE A-Levels, 2021–2022. Vice-captain, boys’ hockey; first runners-up, 2022 National School Games.</dd></div>
          </dl>
        </div>
        <div class="kit__certs" id="certifications" data-reveal>
          <h3 class="kit__head mono">Certifications</h3>
          <dl class="rows rows--stacked">
            <div><dt>Prompt Design in Vertex AI, 2024</dt><dd>Google Cloud skill badge. <a class="link" href="https://www.credly.com/badges/3ff0ec8a-ee9e-4176-8f15-516fcbd9c2e9" target="_blank" rel="noopener">Credential <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
            <div><dt>Certified Personal Trainer, 2025</dt><dd>NCCPT-CPT, National Council on Strength and Fitness.</dd></div>
          </dl>
        </div>
      </div>
      <a class="sheet__next mono" href="#contact">Next: 06 Contact <span aria-hidden="true">→</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>05/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>

    <section class="sheet" id="contact" aria-labelledby="contact-title" data-sheet="06" data-sheet-name="Contact">
      <p class="sheet__label mono"><b>06</b> Contact</p>
      <div class="contact">
        <h2 class="contact__title" id="contact-title">Good work starts with hello.</h2>
        <p class="contact__invite">Have a project in mind, a half-formed idea, or just want to say hi?</p>
        <p class="contact__email">
          <a class="contact__address" href="#contact" data-contact-link data-contact-text>Email me</a>
          <button class="contact__copy mono" type="button" data-copy hidden>Copy</button>
          <span class="visually-hidden" role="status" data-copy-status></span>
        </p>
        <dl class="spec contact__spec">
          <div><dt class="mono">Resume</dt><dd><a class="link" href="resume/Evan-Yap-Resume.pdf" target="_blank" rel="noopener">Download (PDF) <span aria-hidden="true">↓</span><span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
          <div><dt class="mono">GitHub</dt><dd><a class="link" href="https://github.com/evanyap7" target="_blank" rel="noopener">github.com/evanyap7 <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
          <div><dt class="mono">LinkedIn</dt><dd><a class="link" href="https://www.linkedin.com/in/evanyapzhikai/" target="_blank" rel="noopener">in/evanyapzhikai <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
        </dl>
        <footer class="contact__footer mono"><p>© 2026 Evan Yap · Built by hand with HTML, CSS and JavaScript</p></footer>
      </div>
      <a class="sheet__next mono" href="#top">Back to 01 Intro <span aria-hidden="true">↑</span></a>
      <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>06/06</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>
    </section>
  </main>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Fill the markers from the previous page**

Run from the repo root:

```bash
OLD=$(mktemp) && git show 9ee7848:index.html > "$OLD" && python3 - "$OLD" <<'EOF'
import pathlib, re, sys
old = pathlib.Path(sys.argv[1]).read_text()
page = pathlib.Path('index.html').read_text()
parts = {'svg:cartoon': re.search(r'<svg class="wave__art".*?</svg>', old, re.S).group(0)}
for name in ('chain', 'ledger', 'rating', 'market'):
    parts[f'reel:{name}'] = re.search(rf'<figure class="reel" data-reel="{name}">.*?</figure>', old, re.S).group(0)
for token, markup in parts.items():
    marker = f'<!-- {token} -->'
    assert page.count(marker) == 1, marker
    page = page.replace(marker, markup)
pathlib.Path('index.html').write_text(page)
print('filled', len(parts), 'markers')
EOF
grep -c '<!-- svg:\|<!-- reel:' index.html
```

Expected: `filled 5 markers`, then `0`.

- [ ] **Step 4: Write `css/base.css`**

```css
/* Tokens ------------------------------------------------------------ */
/* The drawing set: paper sheets on a grey desk, one ink, one accent. */
:root {
  --desk: #e6e5e0;
  --sheet: #fafaf7;
  --paper: #ffffff;
  --ink: #111214;
  --ink-2: #4f5156;
  --ink-3: #6c6e72;
  --rule: rgba(17, 18, 20, 0.1);
  --rule-2: rgba(17, 18, 20, 0.22);
  --accent: #2541e6;

  --font-sans: "Switzer", "Helvetica Neue", Arial, sans-serif;
  --font-mono: "Fragment Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --bar: 48px;   /* height of the desk bar */
  --gap: 12px;   /* desk showing around each sheet */
  --frame: 12px; /* inset of the frame drawn on each sheet */
  --pad: 40px;   /* content inset inside the frame */
  --ease: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-out: cubic-bezier(0.2, 0.7, 0.3, 1);
}

@media (max-width: 1023px) {
  :root {
    --bar: 52px;
    --pad: 28px;
  }
}

@media (max-width: 719px) {
  :root {
    --gap: 8px;
    --frame: 8px;
    --pad: 12px;
  }
}

/* Reset ------------------------------------------------------------- */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  scroll-padding-top: var(--bar);
}

@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}

html.menu-open {
  overflow: hidden;
}

body {
  min-width: 320px;
  margin: 0;
  background: var(--desk);
  color: var(--ink);
  font: 400 15px/1.55 var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  overflow-x: hidden;
  overflow-x: clip;
}

h1, h2, h3, h4, p, ul, ol, dl, dd, figure {
  margin: 0;
}

ul, ol {
  padding: 0;
  list-style: none;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

img, svg {
  display: block;
  max-width: 100%;
}

img {
  height: auto;
}

strong, b {
  font-weight: 500;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

/* Long words break at hyphens on narrow screens instead of overflowing. */
@media (max-width: 719px) {
  p, li, dd {
    -webkit-hyphens: auto;
    hyphens: auto;
  }
}

/* Utilities --------------------------------------------------------- */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: 0;
  left: 12px;
  z-index: 20;
  padding: 10px 14px;
  background: var(--ink);
  color: var(--sheet);
  font-weight: 500;
  transform: translateY(-120%);
}

.skip-link:focus {
  transform: translateY(8px);
}

/* Labels, captions and the title block. */
.mono {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 400;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@media (min-width: 1440px) {
  .mono { font-size: 11px; }
}

/* Scroll reveal ----------------------------------------------------- */
/* The hidden state is scoped to .js, so nothing hides if scripts fail. */
@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] {
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 500ms var(--ease-out), transform 500ms var(--ease-out);
  }

  .js [data-reveal].is-visible {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 5: Write `css/layout.css`**

```css
/* Desk bar ---------------------------------------------------------- */
/* Identity on the left, the sheet index in the middle, navigation on the
   right. Below 1024px the index and navigation move into the menu. */
.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  height: var(--bar);
  padding: 0 calc(var(--gap) + 12px);
  background: var(--desk);
}

.bar__id {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.bar__role {
  color: var(--ink-3);
  font-weight: 400;
}

.bar__index {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ticks {
  display: flex;
  align-items: center;
}

/* Each tick is a 12 × 24px target around a 1px line. The current one is
   drawn as an outlined box. */
.ticks a {
  display: grid;
  place-items: center;
  width: 12px;
  height: 24px;
}

.ticks a::before {
  content: "";
  width: 1px;
  height: 13px;
  background: var(--ink-3);
}

.ticks a[aria-current="true"] {
  width: 34px;
}

.ticks a[aria-current="true"]::before {
  width: 22px;
  border: 1px solid var(--ink);
  background: transparent;
}

@media (prefers-reduced-motion: no-preference) {
  .ticks a,
  .ticks a::before {
    transition: width 300ms var(--ease);
  }
}

.bar__where {
  color: var(--ink-3);
  white-space: nowrap;
}

.bar__where b {
  color: var(--ink);
  font-weight: 400;
}

.bar__nav {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 22px;
  color: var(--ink-2);
  font-size: 13.5px;
}

.bar__nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}

.bar__clock {
  color: var(--ink-3);
}

@media (hover: hover) {
  .bar__nav a:hover { color: var(--ink); }
}

.bar__menu {
  display: none;
}

@media (max-width: 1279px) {
  .bar__role { display: none; }
}

@media (max-width: 1023px) {
  .bar {
    grid-template-columns: 1fr auto;
  }

  .bar__index,
  .bar__nav {
    display: none;
  }

  .js .bar__menu {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 44px;
    min-height: 44px;
    font-size: 14px;
    font-weight: 500;
  }
}

/* Menu -------------------------------------------------------------- */
/* Below 1024px: the six sheets, the resume, email and the clock. */
.menu {
  position: fixed;
  top: var(--bar);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 9;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px calc(var(--gap) + 12px) 32px;
  background: var(--desk);
}

@media (min-width: 1024px) {
  .menu { display: none; }
}

.menu__sheets {
  border-top: 1px solid var(--rule-2);
}

.menu__sheets a {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
}

.menu__sheets .mono {
  min-width: 2.5em;
  color: var(--ink-3);
}

.menu__sheets a[aria-current="true"] .mono {
  color: var(--accent);
}

.menu__more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 24px;
}

.menu__more .link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}

.menu__clock {
  margin-top: 16px;
  color: var(--ink-3);
}

/* Sheet ------------------------------------------------------------- */
/* One per section. From 1024 × 650 each fills exactly one screen below the
   bar; elsewhere it grows with its content. */
.sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0 var(--gap) var(--gap);
  padding: calc(var(--frame) + 18px) calc(var(--frame) + var(--pad)) calc(var(--frame) + 56px);
  background: var(--sheet);
}

.sheet::before {
  content: "";
  position: absolute;
  inset: var(--frame);
  border: 1px solid var(--rule);
  pointer-events: none;
}

@media (min-width: 1024px) and (min-height: 650px) {
  .sheet {
    min-height: calc(100vh - var(--bar) - var(--gap));
    min-height: calc(100svh - var(--bar) - var(--gap));
  }
}

.sheet__label {
  display: flex;
  gap: 14px;
  color: var(--ink-3);
}

.sheet__label b {
  color: var(--ink);
  font-weight: 400;
}

.sheet__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-top: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--rule-2);
}

.sheet__head .mono {
  color: var(--ink-3);
}

.sheet__title {
  font-size: 40px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.035em;
}

/* The "next sheet" link and the title block sit on the bottom edge of the
   frame, mirroring each other. */
.sheet__next,
.titleblock {
  position: absolute;
  bottom: var(--frame);
  display: flex;
  align-items: center;
  border-top: 1px solid var(--rule);
  background: var(--sheet);
  color: var(--ink-3);
}

.sheet__next {
  left: var(--frame);
  gap: 8px;
  padding: 8px 12px 7px;
  border-right: 1px solid var(--rule);
}

@media (hover: hover) {
  .sheet__next:hover { color: var(--accent); }
}

.titleblock {
  right: var(--frame);
}

.titleblock span {
  padding: 8px 12px 7px;
  border-left: 1px solid var(--rule);
  white-space: nowrap;
}

.titleblock b {
  margin-left: 6px;
  color: var(--ink);
  font-weight: 400;
}

@media (max-width: 719px) {
  .sheet {
    padding-bottom: calc(var(--frame) + 12px);
  }

  .sheet__title {
    font-size: 32px;
  }

  .sheet__next,
  .titleblock {
    position: static;
    align-self: flex-start;
    border: 1px solid var(--rule);
  }

  .sheet__next {
    min-height: 44px;
    margin-top: 28px;
  }

  .titleblock {
    margin-top: 10px;
  }

  .titleblock span:first-child {
    border-left: 0;
  }

  .titleblock span:nth-child(2) {
    display: none;
  }
}

/* Controls ---------------------------------------------------------- */
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 2px;
  background: var(--ink);
  color: var(--sheet);
  font-size: 14.5px;
  font-weight: 500;
  transition: background-color 200ms;
}

.link {
  font-weight: 500;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.25em;
  transition: color 200ms;
}

@media (hover: hover) {
  .button:hover { background: var(--accent); }
  .link:hover { color: var(--accent); }
}

/* Lists of facts ---------------------------------------------------- */
/* .spec: short label over value, in columns. .rows: label beside value. */
.spec {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--rule-2);
}

.spec > div {
  padding: 12px 20px 0 0;
}

.spec dt {
  color: var(--ink-3);
}

.spec dd {
  margin-top: 4px;
  font-size: 14.5px;
  line-height: 1.4;
}

.rows {
  border-top: 1px solid var(--rule-2);
}

.rows > div {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr);
  gap: 2px 16px;
  padding: 9px 0;
  border-bottom: 1px solid var(--rule);
}

.rows dt {
  font-weight: 500;
}

.rows dt.mono {
  padding-top: 3px;
  color: var(--ink-3);
}

.rows dd {
  color: var(--ink-2);
  font-size: 14.5px;
  line-height: 1.45;
}

.rows--stacked > div {
  grid-template-columns: minmax(0, 1fr);
}

.caption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--rule);
  color: var(--ink-3);
}

@media (max-width: 719px) {
  .spec {
    grid-template-columns: minmax(0, 1fr);
  }

  .spec > div {
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
  }

  .rows > div {
    grid-template-columns: minmax(0, 1fr);
  }

  .caption {
    flex-direction: column;
    gap: 2px;
  }
}
```

- [ ] **Step 6: Create the two placeholder stylesheets**

Tasks 3 and 4 fill these. `css/sheets.css`:

```css
/* Sheet layouts: one block per sheet, in story order. */
```

`css/figures.css`:

```css
/* Figures: the project diagrams and the cartoon. */
```

- [ ] **Step 7: Rewrite `js/main.js`**

```js
import { CONTACT_EMAIL } from './config.js';
import { initReveal } from './reveal.js';
import { initWave } from './wave.js';

function applyContactEmail() {
  document.querySelectorAll('[data-contact-link]').forEach((link) => {
    link.href = `mailto:${CONTACT_EMAIL}`;
  });
  document.querySelectorAll('[data-contact-text]').forEach((node) => {
    node.textContent = CONTACT_EMAIL;
  });
}

// The project diagrams are drawn finished in the HTML, so the player is only
// fetched once one is on screen in an open project, and never with reduced
// motion. Browsers that cannot animate `scale` and `translate` keep the still.
function initReels() {
  const reels = document.querySelectorAll('[data-reel]');
  if (!reels.length || !('animate' in Element.prototype)) return;
  if (!window.CSS?.supports('scale', '1')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    import('./reel.js').then(({ startReels }) => startReels(reels));
  }, { rootMargin: '200px' });

  reels.forEach((reel) => observer.observe(reel));
}

applyContactEmail();
initWave();
initReveal();
initReels();
```

- [ ] **Step 8: Simplify `js/reveal.js`**

```js
// Fades content in the first time it scrolls into view. The hidden starting
// state is scoped to .js in CSS, so nothing is hidden if this never runs.

export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  const show = (target) => target.classList.add('is-visible');

  if (!('IntersectionObserver' in window)) {
    targets.forEach(show);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      show(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' });

  targets.forEach((target) => observer.observe(target));
}
```

- [ ] **Step 9: Update the comment in `js/config.js`**

Replace its first two lines with:

```js
// The one place the contact address lives. Every email link and the address
// on the Contact sheet are filled in from this value.
```

- [ ] **Step 10: Delete the replaced files**

```bash
git rm -q css/hero.css css/keyboard.css css/sections.css css/contact.css css/motion.css \
  js/keyboard.js js/kinetic.js js/countup.js js/shader.js js/tabs.js js/projects.js js/scrollspy.js
grep -rn "keyboard\|kinetic\|countup\|shader\|tabs.js\|projects.js\|scrollspy\|motion.css\|hero.css" index.html js css
```

Expected: no output from `grep`.

- [ ] **Step 11: Run the checks**

Expected: PASS for `structure`, `removed`, `overflow` and `fonts` at every size. If `no horizontal scroll` fails at 320 or 375 wide, the likely cause is an unstyled diagram SVG at its intrinsic width. Add this rule to the end of `css/figures.css` now; Task 4's version replaces it:

```css
.reel__scene { display: block; width: 100%; height: auto; }
```

- [ ] **Step 12: Commit**

```bash
git add index.html css js tests/run.js
git commit -m "feat: rebuild the page as six drawing sheets"
```

---

### Task 3: Sheet layouts

**Files:**
- Modify: `css/sheets.css`, `tests/run.js` (`ALL`)

**Interfaces:**
- Consumes: the markup classes from Task 2.
- Produces: `.projects.is-ready`. Task 5's `work.js` adds this class, and only then does the desktop list-plus-panel grid apply.

- [ ] **Step 1: Switch on the layout checks**

In `tests/run.js`:

```js
const ALL = ['structure', 'removed', 'overflow', 'fonts', 'targets', 'fit', 'fitFallback'];
```

Run the checks. Expected: FAIL. The `fits one screen` checks fail at the three fit sizes, and `tap targets at least 44px` fails on phones (the inline links in the intro and projects are too short).

- [ ] **Step 2: Write `css/sheets.css`**

```css
/* Sheet layouts: one block per sheet, in story order. Desktop layouts use
   a 12-column grid from 1024px; below that every sheet is one column. */

/* 01 Intro ---------------------------------------------------------- */
.intro {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: 1fr auto auto auto;
  column-gap: 24px;
}

.intro__title {
  grid-column: 1 / 9;
  grid-row: 1;
  align-self: end;
  margin-top: 32px;
  font-size: clamp(44px, min(6.4vw, 13vh), 104px);
  font-size: clamp(44px, min(6.4vw, 13svh), 104px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.045em;
}

/* The hand-drawn underline. Drawn without non-scaling-stroke, which makes
   Chrome cut the dash short. */
.mark {
  position: relative;
  white-space: nowrap;
}

.mark__stroke {
  position: absolute;
  bottom: -0.1em;
  left: -1%;
  width: 102%;
  height: 12px;
  overflow: visible;
  pointer-events: none;
}

.mark__stroke path {
  fill: none;
  stroke: var(--accent);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-dasharray: 1;
}

.intro__figure {
  grid-column: 9 / 13;
  grid-row: 1 / 3;
  align-self: end;
}

.intro__figure .wave__art {
  max-height: 46vh;
  max-height: 46svh;
}

.intro__lede {
  grid-column: 1 / 7;
  grid-row: 2;
  max-width: 36em;
  margin-top: 24px;
  color: var(--ink-2);
  font-size: 18px;
  line-height: 1.5;
}

.intro__lede strong {
  color: var(--ink);
}

.intro__actions {
  grid-column: 1 / 9;
  grid-row: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  margin-top: 24px;
}

.intro__spec {
  grid-column: 1 / 10;
  grid-row: 4;
  margin-top: 28px;
}

/* 02 About ---------------------------------------------------------- */
.about {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: 24px;
  align-items: end;
  padding-top: 24px;
}

.about__photo {
  grid-column: 1 / 6;
}

.about__photo img {
  width: 100%;
  max-height: calc(100vh - 300px);
  max-height: calc(100svh - 300px);
  aspect-ratio: 4 / 5;
  object-fit: cover;
  object-position: 50% 30%;
}

.about__text {
  grid-column: 6 / 13;
  display: grid;
  gap: 14px;
  max-width: 40em;
  color: var(--ink-2);
  font-size: 16px;
}

.about__statement {
  margin-bottom: 8px;
  color: var(--ink);
  font-size: clamp(26px, 2.6vw, 36px);
  font-weight: 500;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

/* 03 Experience ----------------------------------------------------- */
.role {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: 24px;
  padding: 14px 0;
  border-bottom: 1px solid var(--rule);
}

.role__dates {
  grid-column: 1 / 3;
  padding-top: 3px;
  color: var(--ink-3);
}

.role__who {
  grid-column: 3 / 6;
}

.role__org {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.3;
}

.role__logo {
  width: auto;
  height: 22px;
}

.role__title {
  margin-top: 4px;
  color: var(--ink-3);
  font-size: 13.5px;
  line-height: 1.4;
}

.role__points {
  grid-column: 6 / 13;
  display: grid;
  gap: 6px;
  color: var(--ink-2);
  font-size: 14.5px;
  line-height: 1.45;
}

ul.role__points li {
  position: relative;
  padding-left: 16px;
}

ul.role__points li::before {
  content: "";
  position: absolute;
  top: 0.7em;
  left: 0;
  width: 7px;
  height: 1px;
  background: var(--ink-3);
}

.roles__earlier {
  margin-top: 18px;
  color: var(--ink-3);
}

.roles--earlier .role {
  padding: 10px 0;
}

/* 04 Selected work -------------------------------------------------- */
/* Without work.js every project is open, one under another. work.js adds
   .is-ready, and from 1024px the rows then sit on the left with the open
   project's panel on the right. */
.projects {
  flex: 1;
}

.project__row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 3px 12px;
  width: 100%;
  padding: 13px 0;
  border-bottom: 1px solid var(--rule);
  color: var(--ink-3);
  text-align: left;
}

.project__n {
  padding-top: 4px;
}

.project__title {
  color: var(--ink-2);
  font-size: 16.5px;
  font-weight: 500;
  line-height: 1.35;
  transition: color 200ms;
}

.project__meta {
  grid-column: 2;
}

.project__meta em {
  color: var(--accent);
  font-style: normal;
}

.project__key {
  grid-column: 3;
  grid-row: 1 / 3;
  align-self: center;
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.project__row[aria-expanded="true"] .project__title,
.project__row[aria-expanded="true"] .project__key {
  color: var(--ink);
}

.project__row[aria-expanded="true"] .project__n {
  color: var(--accent);
}

.project__row[aria-expanded="true"] .project__n::before {
  content: "■ ";
}

@media (hover: hover) {
  .project__row:hover .project__title { color: var(--ink); }
}

.project__panel {
  padding: 16px 0 28px;
  border-bottom: 1px solid var(--rule);
}

.project__summary {
  max-width: 64ch;
  margin-top: 14px;
  color: var(--ink-2);
}

.figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
  margin-top: 12px;
  border-top: 1px solid var(--rule-2);
}

/* Each figure's number reads above its label. */
.figures > div {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-end;
  padding: 10px 16px 0 0;
}

.figures dd {
  font-size: 24px;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.figures dt {
  margin-top: 2px;
  color: var(--ink-3);
  font-size: 12.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.project__foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  margin-top: 12px;
}

.project__stack {
  max-width: 44em;
  color: var(--ink-3);
  overflow-wrap: anywhere;
}

.project__links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 20px;
  font-size: 14.5px;
}

.project__links .link {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
}

.also {
  margin-top: 16px;
  color: var(--ink-3);
  font-size: 13px;
}

.also b {
  color: var(--ink-2);
}

@media (min-width: 1024px) {
  .projects.is-ready {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    grid-template-rows: repeat(5, auto) 1fr;
    column-gap: 24px;
  }

  .projects.is-ready .project__head {
    grid-column: 1 / 6;
  }

  .projects.is-ready .project__panel {
    grid-column: 6 / 13;
    grid-row: 1 / -1;
    padding: 14px 0 0;
    border: 0;
  }

  .projects.is-ready .also {
    grid-column: 1 / 6;
    grid-row: 6;
  }

  .projects.is-ready .reel__scene {
    height: clamp(160px, calc(100vh - 520px), 360px);
    height: clamp(160px, calc(100svh - 520px), 360px);
    aspect-ratio: auto;
  }
}

/* 05 Toolkit and credentials ---------------------------------------- */
.kit {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: auto 1fr;
  align-content: start;
  gap: 24px;
  margin-top: 20px;
}

.kit__tools {
  grid-column: 1 / 6;
  grid-row: 1 / 3;
}

.kit__recognition {
  grid-column: 6 / 13;
}

.kit__education {
  grid-column: 6 / 10;
}

.kit__certs {
  grid-column: 10 / 13;
}

.kit__head {
  margin-bottom: 8px;
  color: var(--ink-3);
}

/* 06 Contact -------------------------------------------------------- */
.contact {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 26px;
  max-width: 60rem;
  padding: 24px 0;
}

.contact__title {
  font-size: clamp(40px, min(6vw, 12vh), 96px);
  font-size: clamp(40px, min(6vw, 12svh), 96px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.045em;
}

.contact__invite {
  color: var(--ink-2);
  font-size: 18px;
}

.contact__email {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.contact__address {
  font-size: clamp(22px, 3vw, 40px);
  font-weight: 500;
  letter-spacing: -0.02em;
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
  overflow-wrap: anywhere;
}

.contact__copy {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--rule-2);
  border-radius: 2px;
  color: var(--ink-2);
}

@media (hover: hover) {
  .contact__address:hover { color: var(--accent); }
  .contact__copy:hover { border-color: var(--ink); color: var(--ink); }
}

.contact__spec {
  max-width: 48rem;
}

.contact__footer {
  color: var(--ink-3);
}

/* Narrower than 1024px: one column ------------------------------------ */
@media (max-width: 1023px) {
  .intro,
  .about,
  .kit {
    display: flex;
    flex-direction: column;
  }

  .intro__figure {
    order: -1;
    width: min(60%, 340px);
    margin-top: 16px;
  }

  .intro__title {
    margin-top: 24px;
    font-size: clamp(36px, 9.5vw, 72px);
  }

  .intro__lede {
    font-size: 16px;
  }

  .about {
    align-items: stretch;
    gap: 24px;
  }

  .about__photo {
    width: min(100%, 420px);
  }

  .about__photo img {
    max-height: none;
  }

  .role {
    grid-template-columns: minmax(0, 1fr);
    row-gap: 8px;
  }

  .role__dates,
  .role__who,
  .role__points {
    grid-column: 1;
  }
}

@media (max-width: 719px) {
  /* "check they work." may wrap on a phone, so the drawn stroke gives way
     to a plain underline in the same colour. */
  .mark {
    white-space: normal;
    text-decoration: underline;
    text-decoration-color: var(--accent);
    text-decoration-thickness: 0.06em;
    text-underline-offset: 0.12em;
  }

  .mark__stroke {
    display: none;
  }

  .intro__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .intro__actions .link,
  .project__links .link,
  .contact__spec .link {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    min-height: 44px;
  }

  .contact__invite {
    font-size: 16px;
  }
}
```

- [ ] **Step 3: Run the checks**

Expected: PASS everywhere except `work: fits one screen` and `work: fits one screen (fallback fonts)` at the three fit sizes. Task 5 fixes those.

- [ ] **Step 4: If any other sheet does not fit, tighten it in this order, re-running after each**

Stop as soon as everything except `work` passes.

| Sheet | Changes, in order |
| --- | --- |
| `experience` | 1. In `.role__points`, `font-size: 14px`. 2. In `.role`, `padding: 12px 0`. 3. In `.roles__earlier`, `margin-top: 12px`. |
| `toolkit` | 1. In `.rows > div`, `padding: 7px 0`. 2. In `.rows dd`, `font-size: 14px`. |
| `about` | In `.about__photo img`, both `max-height` values become `calc(100…vh - 340px)`. |
| `top` | In `.intro__title`, both `min()` arguments become `min(6vw, 12vh)` and `min(6vw, 12svh)`. |

If a sheet still fails after its listed changes, stop and report the measured height from the check's detail column. Do not cut copy without asking Evan.

- [ ] **Step 5: Look at it**

Screenshot all six sheets at 1440 × 800 and 393 × 852, and confirm they read like mockup v2.

- [ ] **Step 6: Commit**

```bash
git add css/sheets.css tests/run.js
git commit -m "feat: lay out each sheet to fit one screen"
```

---

### Task 4: Figures and the cartoon in the new palette

**Files:**
- Modify: `css/figures.css`, `index.html` (SVG colours and captions), `js/scenes.js` (lines 5 to 7), `js/reel.js` (`mount`), `tests/run.js` (`ALL`)

**Interfaces:**
- Consumes:
  - `.project__panel` from Task 2.
  - `startReels(reels)`, the existing export of `js/reel.js`, unchanged.
- Produces: `reel.js` listens for a `project-toggle` event on `.project__panel`, and treats `panel.hidden === false` as open. Task 5 dispatches that event.

- [ ] **Step 1: Switch on the figure checks**

In `tests/run.js`:

```js
const ALL = ['structure', 'removed', 'overflow', 'fonts', 'targets', 'fit', 'fitFallback', 'palette', 'figureCaptions', 'cartoon', 'reducedMotionNote'];
```

Run the checks. Expected: FAIL for `figures use only the new palette`, `figures numbered 4.1 to 4.5`, `cartoon waves in the intro, recoloured` and `reduced-motion note under the cartoon`.

- [ ] **Step 2: Recolour the SVGs and number the figures**

Run from the repo root:

```bash
python3 - <<'EOF'
import pathlib, re
path = pathlib.Path('index.html')
page = path.read_text()
swaps = [
    # Cartoon: charcoal suit, deeper tie, accent backdrop, no blush, no drop disc.
    ('<circle cx="200" cy="248" r="160" fill="#111"/>', ''),
    ('fill="#cdf5e6"', 'fill="#2541e6"'),
    ('#3a4a86', '#1c1e24'),
    ('#2e3b70', '#121318'),
    ('#9b3158', '#7a2840'),
    ('<circle cx="164" cy="227" r="8" fill="#ff9fb6" opacity="0.35"/>', ''),
    ('<circle cx="236" cy="227" r="8" fill="#ff9fb6" opacity="0.35"/>', ''),
    ('class="wave__line wave__lines" stroke="#111"', 'class="wave__line wave__lines" stroke="#2541e6"'),
    # Diagrams: white plates, ink lines, accent for whatever moves or passes.
    ('rx="17" fill="#ffb7d5"', 'rx="17" class="reel__pill"'),
    ('rx="17" fill="#ffd98e"', 'rx="17" class="reel__pill"'),
    ('rx="17" fill="#a9ddff"', 'rx="17" class="reel__pill"'),
    ('rx="12" fill="#b9f2df"', 'rx="12" class="reel__box reel__box--ok"'),
    ('fill="#b9f2df"', 'fill="#2541e6"'),
    ('fill="#ff8fb1"', 'fill="#111214"'),
    ('fill="#ffe446"', 'fill="#2541e6"'),
    ('fill="rgba(255,228,70,0.14)"', 'fill="rgba(37,65,230,0.08)"'),
    ('stroke="#a9ddff"', 'stroke="#111214"'),
    ('stroke="#b9f2df"', 'stroke="#2541e6"'),
    ('stroke="#ff8fb1"', 'stroke="#111214"'),
    ('stroke="#ffb7d5"', 'stroke="#6c6e72"'),
    ('stroke="#ffd98e"', 'stroke="#2541e6"'),
    ('stroke="rgba(255,255,255,0.5)"', 'stroke="rgba(17,18,20,0.25)"'),
    (' reel__text--dark', ''),
    ('reel__text--pink', 'reel__text--bad'),
    ('reel__text--yellow', 'reel__text--key'),
    ('<span class="reel__name">Model chain</span>', '<span class="reel__name"><b>Fig. 4.2</b> Model chain, cheapest first</span>'),
    ('<span class="reel__name">Idea to ledger</span>', '<span class="reel__name"><b>Fig. 4.3</b> Idea to ledger</span>'),
    ('<span class="reel__name">Claim check</span>', '<span class="reel__name"><b>Fig. 4.4</b> Claim check</span>'),
    ('<span class="reel__name">Market sizing</span>', '<span class="reel__name"><b>Fig. 4.5</b> Market sizing, to scale</span>'),
]
for old, new in swaps:
    assert old in page, f'missing: {old}'
    page = page.replace(old, new)
left = re.findall(r'#(?:ffb7d5|ffd98e|a9ddff|b9f2df|ff8fb1|ffe446|cdf5e6|ff9fb6)', page)
assert not left, left
path.write_text(page)
print('recoloured')
EOF
```

Expected: `recoloured`.

- [ ] **Step 3: Recolour the timelines**

In `js/scenes.js`, replace lines 5 to 7:

```js
const OK = '#b9f2df';
const BAD = '#ff8fb1';
const LINE = 'rgba(255, 255, 255, 0.28)';
```

with:

```js
const OK = '#2541e6';
const BAD = '#111214';
const LINE = '#111214';
```

- [ ] **Step 4: Mount each reel on its project panel**

In `js/reel.js`:

1. Replace the opening comment:

   ```js
   // Plays the looping diagrams inside the project cards. Each one is inline
   // SVG in index.html, drawn in its finished state; this animates it from
   // empty and loops it. Loaded on demand by main.js.
   ```

   with:

   ```js
   // Plays the looping diagrams in the Selected work panels. Each one is inline
   // SVG in index.html, drawn in its finished state; this animates it from
   // empty and loops it. Loaded on demand by main.js.
   ```

2. Replace:

   ```js
   // A reel only runs while its card is open, it is on screen and the visitor
   // has not paused it.
   function mount(reel) {
     const scene = SCENES[reel.dataset.reel];
     if (!scene) return;

     const card = reel.closest('details');
   ```

   with:

   ```js
   // A reel only runs while its project is open, it is on screen and the
   // visitor has not paused it. work.js fires `project-toggle` on the panel
   // whenever it opens or closes.
   function mount(reel) {
     const scene = SCENES[reel.dataset.reel];
     if (!scene) return;

     const panel = reel.closest('.project__panel');
   ```

3. Replace:

   ```js
       const playing = card.open && inView && !paused;
   ```

   with:

   ```js
       const playing = !panel.hidden && inView && !paused;
   ```

4. Replace:

   ```js
     // Reopening a card starts its diagram again from the top.
     card.addEventListener('toggle', () => {
       if (card.open) {
   ```

   with:

   ```js
     // Opening a project again starts its diagram from the top.
     panel.addEventListener('project-toggle', () => {
       if (!panel.hidden) {
   ```

Then run:

```bash
grep -n "card" js/reel.js
```

Expected: no output.

- [ ] **Step 5: Write `css/figures.css`**

```css
/* Figures ----------------------------------------------------------- */
/* Every diagram is a figure: a mono caption above a white plate with a
   faint dot grid. Diagrams are inline SVG drawn finished, which is what
   shows without JavaScript or with reduced motion; reel.js animates them. */
.reel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.reel__bar {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 28px;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 10.5px;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.reel__name {
  margin-right: auto;
}

.reel__name b {
  margin-right: 10px;
  color: var(--ink);
  font-weight: 400;
}

.reel__clock {
  font-variant-numeric: tabular-nums;
}

/* Pause bars while playing, a play triangle once paused. */
.reel__toggle {
  position: relative;
  flex: none;
  width: 28px;
  height: 28px;
  border: 1px solid var(--rule-2);
  border-radius: 2px;
  color: var(--ink);
}

@media (hover: hover) {
  .reel__toggle:hover { border-color: var(--ink); }
}

.reel__toggle::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 9px;
  border-inline: 2px solid currentColor;
  transform: translate(-50%, -50%);
}

.reel__toggle[aria-pressed="true"]::before {
  width: 9px;
  border: 0;
  background: currentColor;
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  transform: translate(-40%, -50%);
}

/* Widens the touch target to 44px without growing the button. */
.reel__toggle::after {
  content: "";
  position: absolute;
  inset: -8px;
}

.reel__scene {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 480 / 320;
  border: 1px solid var(--rule-2);
  background: var(--paper) radial-gradient(rgba(17, 18, 20, 0.13) 0.8px, transparent 0.8px) 0 0 / 16px 16px;
}

.reel__scene--plate {
  display: grid;
  place-items: center;
  overflow: hidden;
}

.reel__scene--plate img {
  width: auto;
  max-width: 88%;
  max-height: 86%;
  border: 1px solid var(--rule-2);
}

/* Diagram parts. Anything the timeline moves is tagged data-a and scales
   or turns around its own centre. */
.reel [data-a] {
  transform-box: fill-box;
  transform-origin: center;
}

.reel .reel__cover {
  fill: var(--paper);
  transform-origin: 100% 50%;
}

.reel__corner,
.reel__wire,
.reel__track,
.reel__fill,
.reel__rail,
.reel__glyph {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.reel__corner { stroke: var(--ink-3); stroke-width: 1; }
.reel__rail { stroke: var(--accent); stroke-width: 2; }
.reel:not(.is-live) .reel__rail { visibility: hidden; }
.reel__wire { stroke: var(--ink); stroke-width: 1.25; }
.reel__wire--dashed { stroke: var(--ink-3); stroke-dasharray: 3 4; }
.reel__track { stroke: var(--rule-2); }
.reel__glyph { stroke: var(--paper); stroke-width: 2; }

/* Drawn by sliding the dash along a path whose length is set to 1. The gap
   is longer than the path so no stray cap shows at either end. */
.reel__draw { stroke-dasharray: 1 2; }

.reel__box { fill: var(--paper); stroke: var(--ink); stroke-width: 1.25; }
.reel__box--ok { stroke: var(--accent); stroke-width: 2; }
.reel__box--missing { stroke: var(--ink-3); stroke-dasharray: 4 4; }
.reel__pill { fill: var(--paper); stroke: var(--ink); stroke-width: 1.25; }
.reel__area { fill: rgba(37, 65, 230, 0.06); stroke: var(--ink); stroke-width: 1.25; }
.reel__ring { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }

.reel__text {
  fill: var(--ink);
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 500;
  text-anchor: middle;
}

.reel__text--start { text-anchor: start; }
.reel__text--end { text-anchor: end; }
.reel__text--bad { fill: var(--ink); }
.reel__text--key { fill: var(--accent); }

.reel__text--note {
  fill: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.reel__text--note.reel__text--bad { fill: var(--ink); }
.reel__text--note.reel__text--key { fill: var(--accent); }

.reel__text--mono {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 400;
}

.reel__text--num {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.reel__text--xl { font-size: 32px; }

/* Cartoon ----------------------------------------------------------- */
/* Flat colour inside an ink outline. Limbs are thick strokes laid over a
   slightly thicker ink stroke, which gives them the same outline. */
.wave__art {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.wave__ink {
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linejoin: round;
}

.wave__line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wave__line--flat { stroke-linecap: butt; }

/* The forearm swings from the elbow and the hand from the wrist. Pixel
   origins, because Safari ignores transform-box on some SVG groups. */
.wave__forearm { transform-origin: 402px 350px; }
.wave__hand { transform-origin: 416px 270px; }
.wave__head { transform-origin: 200px 285px; }

.wave__eye {
  transform-box: fill-box;
  transform-origin: center;
}

.wave__lines { opacity: 0; }

/* Shown only when the visitor has asked for less motion, so a still
   cartoon is not mistaken for a broken one. */
.caption__still { display: none; }

@media (prefers-reduced-motion: reduce) {
  .caption__still { display: inline; }
}

/* Motion ------------------------------------------------------------ */
/* The cartoon arrives, waves once and then only blinks; wave.js replays
   the wave on hover or tap. The underline draws once after the headline.
   `both` keeps the animations findable after they end. */
@media (prefers-reduced-motion: no-preference) {
  .wave { animation: wave-in 700ms 250ms cubic-bezier(0.3, 1.4, 0.5, 1) backwards; }
  .wave__forearm { animation: wave-arm 1500ms 900ms ease-in-out both; }
  .wave__hand { animation: wave-hand 1500ms 900ms ease-in-out both; }
  .wave__head { animation: wave-head 1500ms 900ms ease-in-out both; }
  .wave__lines { animation: wave-lines 1500ms 900ms ease-out both; }
  .wave__eye { animation: wave-blink 5s 3s infinite; }
  .mark__stroke path { animation: draw 900ms 700ms var(--ease) backwards; }
}

@keyframes wave-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.9);
  }
}

@keyframes wave-arm {
  0%, 100% { transform: rotate(0deg); }
  14%, 54% { transform: rotate(15deg); }
  34%, 74% { transform: rotate(-11deg); }
}

@keyframes wave-hand {
  0%, 100% { transform: rotate(0deg); }
  14%, 54% { transform: rotate(11deg); }
  34%, 74% { transform: rotate(-9deg); }
}

@keyframes wave-head {
  0%, 100% { transform: rotate(0deg); }
  30%, 70% { transform: rotate(-3deg); }
}

@keyframes wave-lines {
  0%, 100% { opacity: 0; }
  18%, 76% { opacity: 1; }
}

@keyframes wave-blink {
  0%, 95%, 100% { transform: scaleY(1); }
  97.5% { transform: scaleY(0.1); }
}

@keyframes draw {
  from { stroke-dashoffset: 1; }
}
```

If Task 2 Step 11 added a `.reel__scene` rule to this file, the rule above replaces it.

- [ ] **Step 6: Run the checks**

Expected: everything passes except `work: fits one screen` and its fallback-font twin.

- [ ] **Step 7: Watch it**

Open `http://localhost:4173/#work` at 1440 × 800 and confirm:
- 4.2 to 4.5 animate in ink and blue on white, with the pause button working.
- The cartoon waves on load and again on hover.
- The underline draws fully under "check they work.", including "work."

Reload with Reduce Motion emulated (DevTools → Rendering → `prefers-reduced-motion: reduce`) and confirm:
- Nothing moves.
- The diagrams sit finished.
- The caption reads "Fig. 1.1 — The author, waving (still: Reduce Motion is on)".

- [ ] **Step 8: Commit**

```bash
git add index.html css/figures.css js/scenes.js js/reel.js tests/run.js
git commit -m "feat: redraw the figures and the cartoon in ink and blue"
```

---

### Task 5: Selected work list (one project open, deep links)

**Files:**
- Create: `js/work.js`
- Modify: `js/main.js`, `tests/run.js` (`ALL`, `EXTRA`)

**Interfaces:**
- Consumes:
  - The markup from Task 2: `.projects[data-projects]`, `.project__row[aria-controls]`, `.project__panel`, `h3#work-{slug}`.
  - `.projects.is-ready` from Task 3's CSS.
  - The `project-toggle` contract from Task 4.
- Produces: `initWork()`, exported from `js/work.js`.

- [ ] **Step 1: Switch on the work checks**

In `tests/run.js`:

```js
const ALL = ['structure', 'removed', 'overflow', 'fonts', 'targets', 'fit', 'fitFallback', 'palette', 'figureCaptions', 'cartoon', 'reducedMotionNote', 'work'];

const EXTRA = [
  { width: 1440, height: 800, src: '/#work-trading-agent', names: ['deepLink'] },
  { width: 393, height: 852, src: '/#work-trading-agent', names: ['deepLink'] },
  { width: 393, height: 852, src: '/', names: ['crossToWide'] },
];
```

Run the checks. Expected: FAIL for:
- `4.1 open on load`, because every panel is visible
- `choosing 4.3 opens only 4.3`
- the deep links
- `widening past 1024px opens one project`
- `work: fits one screen`

- [ ] **Step 2: Write `js/work.js`**

```js
// Selected work. Each project is a row button and a panel. From 1024px wide
// the rows sit on the left and the open project's panel on the right, like
// tabs; narrower, each panel opens under its row, like an accordion. Either
// way at most one project is open, and a link such as #work-trading-agent
// opens that one.

const WIDE = window.matchMedia('(min-width: 1024px)');

export function initWork() {
  const list = document.querySelector('[data-projects]');
  if (!list) return;

  const rows = [...list.querySelectorAll('.project__row')];
  const panelOf = (row) => document.getElementById(row.getAttribute('aria-controls'));
  const isOpen = (row) => row.getAttribute('aria-expanded') === 'true';

  // Opens `target` and closes the rest; `null` closes them all. reel.js
  // listens for project-toggle to start and stop each diagram.
  const open = (target) => {
    rows.forEach((row) => {
      const panel = panelOf(row);
      const opening = row === target;
      const changed = panel.hidden === opening;
      row.setAttribute('aria-expanded', String(opening));
      panel.hidden = !opening;
      if (changed) panel.dispatchEvent(new CustomEvent('project-toggle'));
    });
  };

  // Closing a long panel above can pull the chosen row off the top of the
  // screen, so bring it back.
  const keepInView = (row) => {
    const bar = document.querySelector('.bar')?.offsetHeight ?? 0;
    if (row.getBoundingClientRect().top < bar) row.scrollIntoView({ block: 'start' });
  };

  const fromHash = () => {
    if (!location.hash.startsWith('#work-')) return null;
    return document.getElementById(location.hash.slice(1))?.querySelector('.project__row') ?? null;
  };

  // On wide screens the whole sheet is the useful view; on narrow ones,
  // the row itself.
  const reveal = (row) => {
    open(row);
    (WIDE.matches ? document.getElementById('work') : row).scrollIntoView({ block: 'start' });
  };

  rows.forEach((row, i) => {
    row.addEventListener('click', () => {
      if (isOpen(row) && WIDE.matches) return;
      open(isOpen(row) ? null : row);
      if (!WIDE.matches) keepInView(row);
    });

    // Up and Down, Home and End move between projects; on wide screens
    // they also open the project, as tabs would.
    row.addEventListener('keydown', (event) => {
      const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: rows.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      const next = rows[(to + rows.length) % rows.length];
      next.focus();
      if (WIDE.matches) open(next);
    });
  });

  window.addEventListener('hashchange', () => {
    const row = fromHash();
    if (row) reveal(row);
  });

  // A wide screen always shows a project, even after a narrow one closed them all.
  WIDE.addEventListener('change', () => {
    if (WIDE.matches && !rows.some(isOpen)) open(rows[0]);
  });

  list.classList.add('is-ready');
  const linked = fromHash();
  open(linked ?? rows[0]);
  if (linked) requestAnimationFrame(() => reveal(linked));
}
```

- [ ] **Step 3: Start it from `js/main.js`**

1. Add the import after the `initWave` import:

   ```js
   import { initWork } from './work.js';
   ```

2. Change the start-up block to:

   ```js
   applyContactEmail();
   initWave();
   initWork();
   initReveal();
   initReels();
   ```

   `initWork` runs before `initReels`, so closed panels are hidden before the diagram observer starts.

- [ ] **Step 4: Run the checks**

Expected: PASS at every size.

If `work: fits one screen` still fails at 1280 × 650:
1. In both `.projects.is-ready .reel__scene` height declarations, change the `clamp()` minimum from `160px` to `140px`.
2. If it still fails, set `.project__row` padding to `11px 0`.

Re-run after each change.

- [ ] **Step 5: Try it by hand**

At 1440 × 800:
- Click 4.3: its panel replaces 4.1 on the right and its diagram plays.
- Tab to the rows and use Up and Down to move through the projects.

At 393 × 852:
- Tap 4.4 under an open 4.2: 4.4 opens and stays on screen.
- Tap 4.4 again: it closes.

- [ ] **Step 6: Commit**

```bash
git add js/work.js js/main.js tests/run.js
git commit -m "feat: open one project at a time, as tabs or an accordion"
```

---

### Task 6: Sheet index, clock, phone menu and copy button

**Files:**
- Create: `js/index.js`, `js/menu.js`, `js/contact.js`
- Modify: `js/main.js`, `tests/run.js` (`ALL`, `EXTRA`)

**Interfaces:**
- Consumes:
  - From Task 2: `main > .sheet[data-sheet][data-sheet-name]`, `.ticks a`, `.menu__sheets a`, `[data-where-n]`, `[data-where-name]`, `[data-clock]`, `[data-menu-button]`, `#menu`, `[data-copy]`, `[data-copy-status]`, `.contact__address`.
  - `CONTACT_EMAIL` from `js/config.js`.
- Produces: `initIndex()`, `initMenu()` and `initCopy()`.

- [ ] **Step 1: Switch on the checks**

In `tests/run.js`:

```js
const ALL = ['structure', 'removed', 'overflow', 'fonts', 'targets', 'fit', 'fitFallback', 'palette', 'figureCaptions', 'cartoon', 'reducedMotionNote', 'work', 'sheetIndex', 'menu', 'copy'];

const EXTRA = [
  { width: 1440, height: 800, src: '/#work-trading-agent', names: ['deepLink'] },
  { width: 393, height: 852, src: '/#work-trading-agent', names: ['deepLink'] },
  { width: 393, height: 852, src: '/', names: ['crossToWide'] },
  { width: 1440, height: 800, src: '/#toolkit', names: ['hashSheet'] },
];
```

Run the checks. Expected: FAIL for:
- `index follows the sheet on screen` and `clock shows Singapore time`
- `menu button shown` (desktop sizes pass `menu button hidden on wide screens`)
- `copy button shown`
- `arriving at #toolkit marks sheet 05`

- [ ] **Step 2: Write `js/index.js`**

```js
// The sheet index in the bar and the menu. It marks the sheet under the
// middle of the screen (or the last sheet once the page is scrolled to the
// end), and keeps the Singapore clock current. Driven by scroll position
// rather than IntersectionObserver so it also works inside iframes.

export function initIndex() {
  const sheets = [...document.querySelectorAll('main > .sheet')];
  if (!sheets.length) return;

  const links = [...document.querySelectorAll('.ticks a, .menu__sheets a')];
  const number = document.querySelector('[data-where-n]');
  const name = document.querySelector('[data-where-name]');
  let current = null;

  const pick = () => {
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) return sheets[sheets.length - 1];
    const middle = window.innerHeight / 2;
    return [...sheets].reverse().find((sheet) => sheet.getBoundingClientRect().top <= middle) ?? sheets[0];
  };

  const update = () => {
    const sheet = pick();
    if (sheet === current) return;
    current = sheet;
    const hash = `#${sheet.id}`;
    links.forEach((link) => {
      if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (number) number.textContent = sheet.dataset.sheet;
    if (name) name.textContent = sheet.dataset.sheetName;
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
  startClock();
}

function startClock() {
  const clocks = document.querySelectorAll('[data-clock]');
  if (!clocks.length) return;
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const tick = () => {
    const text = `SGT ${format.format(new Date())}`;
    clocks.forEach((clock) => { clock.textContent = text; });
  };
  tick();
  setInterval(tick, 15000);
}
```

- [ ] **Step 3: Write `js/menu.js`**

```js
// The menu that holds the sheet index and navigation below 1024px wide.
// A plain button toggling `hidden`, so it works in every supported browser.

export function initMenu() {
  const button = document.querySelector('[data-menu-button]');
  const menu = document.getElementById('menu');
  if (!button || !menu) return;

  const setOpen = (open) => {
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Close' : 'Menu';
    menu.hidden = !open;
    document.documentElement.classList.toggle('menu-open', open);
  };

  button.addEventListener('click', () => setOpen(menu.hidden));

  // Choosing a sheet closes the menu and lets the page scroll to it.
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.hidden) return;
    setOpen(false);
    button.focus();
  });

  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}
```

- [ ] **Step 4: Write `js/contact.js`**

```js
import { CONTACT_EMAIL } from './config.js';

// The copy button beside the address on the Contact sheet. When the
// clipboard refuses (an older browser, or a page without focus) it selects
// the address instead, so it can be copied by hand.

export function initCopy() {
  const button = document.querySelector('[data-copy]');
  const address = document.querySelector('.contact__address');
  const status = document.querySelector('[data-copy-status]');
  if (!button || !address) return;

  let timer = 0;
  const say = (label, message) => {
    button.textContent = label;
    if (status) status.textContent = message;
    clearTimeout(timer);
    timer = setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  };

  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      say('Copied', 'Email address copied');
    } catch {
      const range = document.createRange();
      range.selectNodeContents(address);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      say('Selected', 'Email address selected');
    }
  });
}
```

- [ ] **Step 5: Start them from `js/main.js`**

The final `js/main.js`:

```js
import { CONTACT_EMAIL } from './config.js';
import { initCopy } from './contact.js';
import { initIndex } from './index.js';
import { initMenu } from './menu.js';
import { initReveal } from './reveal.js';
import { initWave } from './wave.js';
import { initWork } from './work.js';

function applyContactEmail() {
  document.querySelectorAll('[data-contact-link]').forEach((link) => {
    link.href = `mailto:${CONTACT_EMAIL}`;
  });
  document.querySelectorAll('[data-contact-text]').forEach((node) => {
    node.textContent = CONTACT_EMAIL;
  });
}

// The project diagrams are drawn finished in the HTML, so the player is only
// fetched once one is on screen in an open project, and never with reduced
// motion. Browsers that cannot animate `scale` and `translate` keep the still.
function initReels() {
  const reels = document.querySelectorAll('[data-reel]');
  if (!reels.length || !('animate' in Element.prototype)) return;
  if (!window.CSS?.supports('scale', '1')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    import('./reel.js').then(({ startReels }) => startReels(reels));
  }, { rootMargin: '200px' });

  reels.forEach((reel) => observer.observe(reel));
}

applyContactEmail();
initMenu();
initIndex();
initWave();
initWork();
initCopy();
initReveal();
initReels();
```

- [ ] **Step 6: Run the checks**

Expected: `PASS` at every size and for every extra run.

- [ ] **Step 7: Try it by hand**

- At 393 × 852, open the menu, check that the current sheet's number is blue, choose "05 Toolkit and credentials", and confirm the menu closes on that sheet.
- Press Escape with the menu open; focus should return to the button.
- On the Contact sheet, click Copy, then paste somewhere to confirm the address.

- [ ] **Step 8: Commit**

```bash
git add js/index.js js/menu.js js/contact.js js/main.js tests/run.js
git commit -m "feat: add the sheet index, clock, phone menu and copy button"
```

---

### Task 7: Case study page on the new system

**Files:**
- Modify: `case-studies/trading-agent.html`
- Rewrite: `css/case-study.css`

**Interfaces:**
- Consumes: `css/base.css` and `css/layout.css` (`.bar`, `.bar__id`, `.bar__nav`, `.sheet`, `.sheet__next`, `.titleblock`, `.link`, `.mono`), plus the `.figures` and `.project__links` styles. Those live in `sheets.css`, so the case study links it too.

- [ ] **Step 1: Write the failing check by hand**

Open `http://localhost:4173/case-studies/trading-agent.html` at 393 × 852 and at 1440 × 800. Expected now: an unstyled page, because its stylesheets `hero.css` and `sections.css` were deleted in Task 2.

- [ ] **Step 2: Replace the head's styling, the header and the wrappers**

Run from the repo root:

```bash
python3 - <<'EOF'
import pathlib, re
path = pathlib.Path('case-studies/trading-agent.html')
page = path.read_text()
swaps = [
    ('<meta name="theme-color" content="#fff7fb">', '<meta name="theme-color" content="#e6e5e0">'),
    ('<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=satoshi@700,900&display=swap">', '<link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap">'),
    ('<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap">', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fragment+Mono&display=swap">'),
    ('<link rel="stylesheet" href="/css/hero.css">\n  <link rel="stylesheet" href="/css/sections.css">', '<link rel="stylesheet" href="/css/layout.css">\n  <link rel="stylesheet" href="/css/sheets.css">'),
    ('<main id="main" class="case">', '<main id="main" class="sheet case">'),
    ('<p class="eyebrow">', '<p class="eyebrow mono">'),
    ('class="text-link"', 'class="link"'),
    ('Pink marks the only step that was ever a model.', 'Blue marks the only step that was ever a model.'),
    ('<p class="case__fine">An engineering project, not investment advice. Backtest results do not predict live performance.</p>\n  </main>',
     '<p class="case__fine">An engineering project, not investment advice. Backtest results do not predict live performance.</p>\n    <a class="sheet__next mono" href="/#work-trading-agent">Back to 04 Selected work <span aria-hidden="true">↩</span></a>\n    <p class="titleblock mono" aria-hidden="true"><span>Sheet <b>04.3</b></span><span>Drawn <b>E. Yap</b></span><span>Rev <b>2026.10</b></span></p>\n  </main>'),
]
for old, new in swaps:
    assert old in page, f'missing: {old}'
    page = page.replace(old, new)
page = re.sub(r'<link rel="icon" href="[^"]*">',
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 32 32\'%3E%3Crect width=\'32\' height=\'32\' fill=\'%23111214\'/%3E%3Crect x=\'4.5\' y=\'4.5\' width=\'23\' height=\'23\' fill=\'none\' stroke=\'%23fafaf7\'/%3E%3Crect x=\'9\' y=\'19\' width=\'14\' height=\'3\' fill=\'%232541e6\'/%3E%3C/svg%3E">', page, count=1)
page = re.sub(r'  <header class="site-header">.*?</header>',
    '''  <header class="bar bar--case">
    <a class="bar__id" href="/">Evan Yap<span class="bar__role">&nbsp;— Software &amp; AI engineering</span></a>
    <nav class="bar__nav" aria-label="Primary">
      <a href="/#work-trading-agent">← Back to work</a>
      <a class="link" href="https://github.com/evanyap7/evans-trading-agent" target="_blank" rel="noopener">Source <span aria-hidden="true">↗</span><span class="visually-hidden"> (opens in a new tab)</span></a>
    </nav>
  </header>''', page, count=1, flags=re.S)
page = re.sub(r'\n  <footer class="case__footer">.*?</footer>', '', page, count=1, flags=re.S)
page = page.replace('<p class="case__fine">', '''<footer class="case__footer">
      <p>© 2026 Evan Yap</p>
      <p class="case__footer-links"><a class="link" href="https://github.com/evanyap7" target="_blank" rel="noopener">GitHub</a> <a class="link" href="https://www.linkedin.com/in/evanyapzhikai/" target="_blank" rel="noopener">LinkedIn</a></p>
    </footer>
    <p class="case__fine">''', 1)
path.write_text(page)
print('case study updated')
EOF
grep -c "site-header\|text-link\|satoshi\|Instrument\|hero.css\|sections.css" case-studies/trading-agent.html
```

Expected: `case study updated`, then `0`.

- [ ] **Step 3: Rewrite `css/case-study.css`**

```css
/* Case study -------------------------------------------------------- */
/* A long-form write-up on one sheet at its natural height. Text runs at a
   readable measure; diagrams and tables may run wider. Paragraph styles
   use :where() so the named blocks below can override them. */
.bar--case {
  grid-template-columns: 1fr auto;
}

.bar--case .bar__nav {
  display: flex;
  gap: 16px;
}

.case {
  min-height: 0;
  padding-bottom: calc(var(--frame) + 72px);
}

.case > * {
  max-width: 46rem;
}

.case > .flow,
.case > .case__table {
  max-width: 62rem;
}

.eyebrow {
  margin-top: 8px;
  color: var(--ink-3);
}

.case__title {
  margin-top: 16px;
  font-size: clamp(34px, 5vw, 64px);
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.04em;
}

.case__title em {
  color: var(--accent);
  font-style: normal;
}

.case__lede {
  margin-top: 20px;
  color: var(--ink-2);
  font-size: 18px;
}

.case__figures {
  margin-top: 28px;
}

.case h2 {
  margin-top: 48px;
  padding-top: 12px;
  border-top: 1px solid var(--rule-2);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.case :where(p:not(.mono)),
.case__list {
  margin-top: 14px;
  color: var(--ink-2);
  font-size: 16px;
  line-height: 1.6;
}

.case strong {
  color: var(--ink);
}

.case code {
  padding: 1px 4px;
  border: 1px solid var(--rule);
  background: var(--paper);
  font-family: var(--font-mono);
  font-size: 0.88em;
}

.case__list {
  display: grid;
  gap: 10px;
}

.case__list li {
  position: relative;
  padding-left: 18px;
}

.case__list li::before {
  content: "";
  position: absolute;
  top: 0.8em;
  left: 0;
  width: 8px;
  height: 1px;
  background: var(--ink-3);
}

.case__list--numbered {
  counter-reset: step;
}

.case__list--numbered li {
  padding-left: 30px;
  counter-increment: step;
}

.case__list--numbered li::before {
  content: counter(step, decimal-leading-zero);
  top: 0.25em;
  width: auto;
  height: auto;
  background: none;
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 11px;
}

.case__sub {
  margin-top: 28px;
  font-size: 17px;
  font-weight: 600;
}

.case__note,
.case__fine,
.case__code {
  color: var(--ink-3);
  font-size: 14px;
}

/* Pipeline: three lanes of steps, the model step outlined in the accent. */
.flow {
  display: grid;
  gap: 12px;
  margin-top: 20px;
}

.flow__lane {
  padding: 14px 16px;
  border: 1px solid var(--rule-2);
  background: var(--paper);
}

.flow__label {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.flow__steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 6px;
  margin-top: 10px;
}

.flow__steps li {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flow__steps li:not(:last-child)::after {
  content: "→";
  color: var(--ink-3);
}

.flow__step {
  padding: 4px 10px;
  border: 1px solid var(--ink);
  font-size: 13.5px;
}

.flow__step--model {
  border-color: var(--accent);
  color: var(--accent);
}

.case__decisions {
  display: grid;
  gap: 18px;
  margin-top: 20px;
  counter-reset: decision;
}

.case__decisions > li {
  position: relative;
  padding-left: 44px;
  counter-increment: decision;
}

.case__decisions > li::before {
  content: counter(decision, decimal-leading-zero);
  position: absolute;
  top: 3px;
  left: 0;
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 11px;
}

.case__decisions h3 {
  font-size: 17px;
  font-weight: 600;
}

.case__table {
  margin-top: 20px;
  overflow-x: auto;
  border: 1px solid var(--rule-2);
  background: var(--paper);
}

.case__table table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.case__table th,
.case__table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--rule);
  text-align: left;
  vertical-align: top;
}

.case__table thead th {
  color: var(--ink-3);
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: 400;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.case__table tbody th {
  font-weight: 500;
}

.case__table tbody tr:last-child th,
.case__table tbody tr:last-child td {
  border-bottom: 0;
}

.case__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 40px;
}

.case__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 24px;
  margin-top: 32px;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
  color: var(--ink-3);
  font-size: 13px;
}

.case__footer p {
  margin: 0;
  color: inherit;
  font-size: inherit;
}

.case__footer-links {
  display: flex;
  gap: 20px;
}

@media (max-width: 719px) {
  .bar--case .bar__nav a:not(.link) {
    display: none;
  }

  .case__links .link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
}
```

- [ ] **Step 4: Check it**

Open the case study at 1440 × 800, 393 × 852 and 320 × 640. Confirm:
- One long sheet, with the frame and title block.
- The pipeline lanes wrap, and the model step is blue.
- The tables scroll sideways inside their frame, never the page.
- In DevTools, `document.documentElement.scrollWidth <= innerWidth` is `true` at all three sizes.
- "Back to 04 Selected work" lands on the main page with 4.3 open.

- [ ] **Step 5: Commit**

```bash
git add case-studies/trading-agent.html css/case-study.css
git commit -m "feat: move the case study onto the drawing set"
```

---

### Task 8: Share image and README

**Files:**
- Replace: `img/og.jpg`
- Rewrite: `README.md`

- [ ] **Step 1: Capture the share image**

1. Open `http://localhost:4173/` in a 1200 × 630 viewport.
2. Wait three seconds for the wave to finish.
3. Screenshot the viewport as JPEG at quality 85 to `img/og.jpg`. With the chrome-devtools MCP: `resize_page` 1200 × 630, then `take_screenshot` with `format: "jpeg"`, `quality: 85`, `filePath: "<repo>/img/og.jpg"`.
4. Confirm the size:

   ```bash
   sips -g pixelWidth -g pixelHeight img/og.jpg
   ```

   Expected: 1200 × 630, or 2400 × 1260 on a 2× display. In that case resize it:

   ```bash
   sips -z 630 1200 img/og.jpg
   ```

- [ ] **Step 2: Rewrite `README.md`**

````markdown
# My portfolio

My personal site, laid out as a set of six engineering drawing sheets: Intro, About, Experience, Selected work, Toolkit and credentials, and Contact. Each sheet is one screen on a laptop and grows to fit on a phone.

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.

## Run it locally

The scripts are ES modules, so the page has to be served over HTTP. This server turns caching off:

```sh
python3 tests/serve.py 4173
```

Then open <http://localhost:4173>. On a phone on the same Wi-Fi, use the Mac's address instead, from `ipconfig getifaddr en0`.

## Check it

Open <http://localhost:4173/tests/>. The page loads the site at 13 sizes, from a 320px phone to a 1920px desktop, and checks that:

- each sheet fits one screen at 1280 × 650, 1440 × 800 and 1920 × 1080, even with fallback fonts
- nothing scrolls sideways
- phone tap targets are at least 44px
- the project list, the menu, the sheet index and the copy button behave

The heading says `PASS` or `FAIL`, and the table lists every result. `docs/` and `tests/` are left out of deploys by `.vercelignore`.

## Change the email address

It lives in one place, `js/config.js`:

```js
export const CONTACT_EMAIL = 'evanyap7@gmail.com';
```

Every email link, the address on the Contact sheet and the copy button read from it.

## Where things are

| Path | What it holds |
| --- | --- |
| `index.html` | All six sheets |
| `case-studies/` | Long-form write-ups, one sheet each |
| `resume/` | The downloadable resume PDF |
| `css/base.css` | Colour and type tokens, reset, utilities, the scroll fade |
| `css/layout.css` | The bar, the phone menu, the sheet frame, title block, buttons, links and lists |
| `css/sheets.css` | Each sheet's own layout |
| `css/figures.css` | Project diagrams, the cartoon and all keyframes |
| `css/case-study.css` | Case study pages |
| `js/main.js` | Starts everything |
| `js/work.js` | The project list: tabs from 1024px, an accordion below, and `#work-…` links |
| `js/index.js` | The sheet index in the bar and menu, and the Singapore clock |
| `js/menu.js` | The menu below 1024px |
| `js/contact.js` | The copy button |
| `js/wave.js` | Replays the cartoon's wave on hover or tap |
| `js/reel.js`, `js/scenes.js` | The project diagram player and each diagram's timeline |
| `js/reveal.js` | The fade as content first scrolls into view |
| `tests/` | The check page and the local server |

## The design

- Paper sheets (`#fafaf7`) on a grey desk (`#e6e5e0`), one ink (`#111214`) and one blue accent (`#2541e6`).
- Type is Switzer, with Fragment Mono for labels.
- Each sheet ends with a link to the next one, so the page reads in order.
- The bar shows which sheet you are on.

To add a project, copy one `h3.project__head` and the `div.project__panel` after it in `index.html`, give both new ids (`work-…`, `row-…` and `panel-…`), and number it in `.project__n`.

## Project diagrams

Four projects have a looping diagram, inline SVG inside a `<figure class="reel" data-reel="…">`, drawn in its finished state so it reads as a still.

To change one, edit its SVG in `index.html` and its timeline in `js/scenes.js`. The timeline finds parts by their `data-a` name and gives times in milliseconds into a nine-second loop. A diagram plays only while its project is open and on screen, and each has a pause button.

## Motion

The cartoon waves once on load and again on hover or tap, the headline's underline draws once, and the project diagrams loop. With Reduce Motion on, nothing moves: the diagrams show their finished state, and the cartoon's caption says it is still on purpose.

## Update the resume

Replace `resume/Evan-Yap-Resume.pdf`. The public copy leaves out the phone number, so remove it from any new version before committing. Check by searching the PDF for the number: covering it with a box is not enough, because the text stays in the file.

## Share image

`img/og.jpg` (1200 × 630) is the preview shown when the site is pasted into LinkedIn, Slack or iMessage. Recapture it from the Intro sheet if the headline or cartoon changes.
````

- [ ] **Step 3: Commit**

```bash
git add img/og.jpg README.md
git commit -m "docs: rewrite the README and share image for the drawing set"
```

---

### Task 9: Cross-browser QA and content sign-off

**Files:**
- No new files. Fixes found here go in the file that owns them, each in its own commit.

- [ ] **Step 1: Full check run in Chrome**

Open `http://localhost:4173/tests/` with the cache bypassed. Expected: `PASS`. Fix any failure in the owning task's file before continuing.

- [ ] **Step 2: Lighthouse**

Run Lighthouse on `http://localhost:4173/` in mobile and desktop modes; with the chrome-devtools MCP, use `lighthouse_audit`. Required:

| Category | Minimum |
| --- | --- |
| Accessibility | 95 |
| Performance | 90 |
| Best practices | 95 |

Record the four scores for each mode in the hand-off message.

- [ ] **Step 3: Reduced motion**

Emulate `prefers-reduced-motion: reduce` and reload. Confirm:
- Nothing moves.
- The diagrams show their finished state, with no pause buttons, because `main.js` never loads the player.
- The cartoon's caption shows "(still: Reduce Motion is on)".

- [ ] **Step 4: Keyboard walkthrough at 1440 × 800**

From a fresh load, press Tab and check, in order:
1. The skip link appears.
2. The bar links follow.
3. The resume button and email link.
4. The "Next" link.

Then, in Selected work:
- Arrow keys move through the projects and each one opens.
- The pause button toggles its diagram.

On the Contact sheet, Copy works. Every focused control shows the blue outline.

- [ ] **Step 5: Safari (WebKit)**

Ask Evan to open `http://localhost:4173/tests/` in Safari on his Mac and report the heading.

If Playwright is installed (`npx --no-install playwright --version` succeeds), also screenshot all six sheets in WebKit at 393 × 852 and 1440 × 800. Otherwise skip this and say so in the hand-off.

- [ ] **Step 6: Evan's iPhone**

1. Run `ipconfig getifaddr en0`.
2. Give Evan the URL `http://<that address>:4173/`, to open in Safari on his iPhone 15 on the same Wi-Fi.
3. Ask him to check that:
   - The cartoon waves; if it is still, the caption says Reduce Motion is on.
   - The menu opens and jumps to each sheet.
   - Tapping projects opens them under their rows, and each diagram plays.
   - Copy works.
   - Nothing scrolls sideways.
   - It works in landscape too.

- [ ] **Step 7: Content sign-off list**

Post this list to Evan, and wait for his approval or edits before merging. Each item is new or shortened wording; no facts or figures changed.

1. The Intro lede, which is new.
2. The three About paragraphs, cut from the original three. The house committee role is dropped, and the closing "Then I measure whether each one earned its place" is new.
3. The Experience points:
   - Univers: three points, shortened.
   - EvanYapFitness: two points, with the intake pipeline and AI workflow merged.
   - The Social Nugget and the Army: one line each.
4. The project summaries for 4.1, 4.2, 4.4 and 4.5, all shortened, and the row key figures ("~65% cheaper", "0–100 rating", "$350M TAM").
5. The "Also built" line.
6. The Education lines.
7. The sheet notes: "Singapore", "2023 – now", "Five projects · 2026", "Updated Oct 2026".
8. The case study note: "Pink marks…" becomes "Blue marks…".
9. The deviations listed at the top of this plan.

- [ ] **Step 8: Hand off**

Report to Evan:
- the check page result
- the Lighthouse scores
- what was checked in WebKit and what was not
- the content list

Do not merge, push or deploy until he says so.
