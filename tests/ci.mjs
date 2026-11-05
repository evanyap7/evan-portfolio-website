// Runs the browser checks in tests/ headless and exits non-zero on any failure.
//   node tests/ci.mjs        (locally uses installed Chrome; in CI uses Playwright's Chromium)
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4178;
const server = spawn('python3', ['tests/serve.py', String(PORT)], { stdio: 'ignore' });
let code = 1;
try {
  await new Promise((done) => { setTimeout(done, 800); });
  const browser = await chromium.launch(process.env.CI ? {} : { channel: 'chrome' });
  // The check frames sit in a fixed layer at the top left of this page, and an
  // IntersectionObserver inside a frame only sees the part of it that is on
  // screen. The default 1280×720 hides the lower half of the 1024×1366 frame,
  // so titles scrolled to its centre never counted as seen. The viewport must
  // be at least as large as the biggest frame in tests/run.js (1920×1080 and
  // 1024×1366).
  const page = await browser.newPage({ viewport: { width: 1920, height: 1400 } });
  // A failed request (a script the server dropped, say) stops a page's modules
  // from running and shows up as an unrelated check failing, so name them.
  const failedRequests = [];
  page.on('requestfailed', (request) => {
    // A check removing its frame mid-load aborts that frame's requests; that
    // is the check finishing, not a fault.
    if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
    failedRequests.push(`${request.url().replace(`http://localhost:${PORT}`, '')} ${request.failure()?.errorText}`);
  });
  await page.goto(`http://localhost:${PORT}/tests/`);

  // Wait in 30 second slices and say how far the run has got, so a run that
  // stalls shows where it stalled instead of one timeout after twenty minutes.
  const limit = Number(process.env.CHECK_TIMEOUT_MS) || 1200000;
  const started = Date.now();
  const done = () => /^(PASS|FAIL)/.test(document.querySelector('[data-summary]').textContent);
  let finished = false;
  while (!finished && Date.now() - started < limit) {
    try {
      await page.waitForFunction(done, null, { timeout: Math.min(30000, Math.max(1, limit - (Date.now() - started))) });
      finished = true;
    } catch {
      const seen = await page.$$eval('tr', (trs) => ({ total: trs.length, failed: trs.filter((tr) => tr.className === 'fail').length, last: trs.at(-1)?.textContent.trim().replace(/\s+/g, ' ') }));
      console.error(`${Math.round((Date.now() - started) / 1000)}s: ${seen.total} checks, ${seen.failed} failed, last: ${seen.last}`);
    }
  }

  const rows = await page.$$eval('tr.fail', (trs) => trs.map((tr) => tr.textContent.trim().replace(/\s+/g, ' ')));
  if (rows.length) console.error(rows.join('\n'));
  if (failedRequests.length) console.error(`${failedRequests.length} failed requests:\n${[...new Set(failedRequests)].slice(0, 20).join('\n')}`);
  if (finished) {
    const text = await page.locator('[data-summary]').textContent();
    console.log(text);
    code = text.startsWith('PASS') ? 0 : 1;
  } else {
    console.error(`TIMEOUT: the checks did not finish within ${Math.round(limit / 1000)}s`);
    code = 2;
  }

  // The fallbacks, each on a fresh page of its own: with reduced motion, and
  // with three.js failing to load from the CDN. The scene needs neither, so
  // it stays; reduced motion keeps the Hall, and a failed fetch brings back
  // the Work cards.
  const fallbacks = [
    { name: 'reduced motion', options: { reducedMotion: 'reduce' }, settle: 1500, shows: '#work .hall' },
    { name: 'three.js blocked', block: '**/three.module.min.js', settle: 9000, shows: '#work .work__grid' },
  ];
  for (const fallback of fallbacks) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 }, ...fallback.options });
    await context.addInitScript(() => { try { sessionStorage.setItem('portfolio-on', '1'); } catch { /* gated then */ } });
    const tab = await context.newPage();
    if (fallback.block) await tab.route(fallback.block, (route) => route.abort());
    await tab.goto(`http://localhost:${PORT}/`);
    // The Hall fetches three.js only once Work is near, and only a failed
    // fetch brings the cards back, so go to Work as a visitor would.
    await tab.waitForTimeout(500);
    await tab.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
    await tab.waitForTimeout(fallback.settle);
    const state = await tab.evaluate((selector) => ({
      lab: document.documentElement.classList.contains('lab'),
      shows: [...document.querySelectorAll(selector)].some((el) => {
        const box = el.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      }),
    }), fallback.shows);
    const pass = state.lab && state.shows;
    (pass ? console.log : console.error)(`${pass ? 'PASS' : 'FAIL'} fallback, ${fallback.name}: lab ${state.lab}, work shows ${state.shows}`);
    if (!pass && code === 0) code = 1;
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
process.exit(code);
