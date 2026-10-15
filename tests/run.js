import * as checks from './checks.js';

// Viewports for the page-wide checks: desktops, tablets, phones, a landscape
// phone, and 1280 × 800 at 200% zoom.
const SIZES = [
  [1280, 650], [1440, 800], [1920, 1080], [1024, 700],
  [768, 1024], [1024, 1366],
  [320, 640], [375, 667], [393, 852], [412, 915], [430, 932],
  [852, 393], [640, 400],
];

// Checks run on the main page at every size, in this order.
const ALL = ['structure', 'headings', 'removed', 'overflow', 'fonts', 'targets', 'palette', 'contrast', 'emDash', 'aboutPhoto', 'proof', 'workTitle', 'workCards', 'titles', 'pointerOnly', 'timeline', 'tabs', 'navIndex', 'progress', 'menu', 'copy'];

// The project pages and the case study, each checked at every size too.
const PAGES = [
  '/work/website-revamp.html',
  '/work/assistant-bot.html',
  '/case-studies/trading-agent.html',
  '/work/research-agent.html',
  '/work/v-bay.html',
  '/work/others.html',
];
const PAGE_CHECKS = ['titles', 'headings', 'removed', 'overflow', 'fonts', 'targets', 'palette', 'emDash', 'projectPage', 'figureText', 'menu'];

// One-off runs: a size, a URL and the checks to run there.
const EXTRA = [
  ...PAGES.flatMap((src) => SIZES.map(([width, height]) => ({ width, height, src, names: PAGE_CHECKS }))),
  { width: 1440, height: 800, src: '/#work-trading-agent', names: ['deepLink'] },
  { width: 393, height: 852, src: '/#work-others', names: ['deepLink'] },
  { width: 1440, height: 800, src: '/#toolkit', names: ['hashSection'] },
  { width: 1440, height: 800, src: '/#education', names: ['tabLink'] },
  { width: 393, height: 852, src: '/#certifications', names: ['tabLink'] },
];

// A frame that has not loaded, and had its fonts settle, by then is a failure.
const LOAD_TIMEOUT = 15000;

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
    const timer = setTimeout(() => {
      frame.remove();
      resolve(null);
    }, LOAD_TIMEOUT);
    frame.addEventListener('load', async () => {
      try {
        await frame.contentDocument.fonts.ready;
        await new Promise((done) => { setTimeout(done, 400); });
      } finally {
        clearTimeout(timer);
        resolve(frame);
      }
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

function record(size, result, results) {
  results.push({ size, ...result });
  row([result.pass ? 'PASS' : 'FAIL', size, result.name, result.detail], result.pass);
}

async function run({ width, height, src, names }, results) {
  const label = `${width}×${height}${src === '/' ? '' : ` ${src}`}`;
  const frame = await load(width, height, src);
  if (!frame) {
    record(label, { name: 'load timed out', pass: false, detail: `after ${LOAD_TIMEOUT} ms` }, results);
    return;
  }
  for (const name of names) {
    let found;
    try {
      found = await checks[name](frame.contentWindow, frame);
    } catch (error) {
      found = [{ name, pass: false, detail: String(error) }];
    }
    found.forEach((result) => record(label, result, results));
  }
  frame.remove();
}

window.__done = (async () => {
  const results = [];
  const runs = [
    ...SIZES.map(([width, height]) => ({ width, height, src: '/', names: ALL })),
    ...EXTRA,
  ];
  for (const each of runs) {
    try {
      await run(each, results);
    } catch (error) {
      record(`${each.width}×${each.height}`, { name: 'run failed', pass: false, detail: String(error) }, results);
    }
  }
  const failed = results.filter((result) => !result.pass);
  summary.textContent = failed.length ? `FAIL ${failed.length} of ${results.length}` : `PASS ${results.length}`;
  window.__results = results;
  return results;
})();
