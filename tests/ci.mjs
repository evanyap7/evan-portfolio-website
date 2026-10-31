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
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/tests/`);
  const summary = page.locator('[data-summary]');
  await page.waitForFunction(() => /^(PASS|FAIL)/.test(document.querySelector('[data-summary]').textContent), null, { timeout: 540000 });
  const text = await summary.textContent();
  if (text.startsWith('FAIL')) {
    const rows = await page.$$eval('tr.fail', (trs) => trs.map((tr) => tr.textContent.trim().replace(/\s+/g, ' ')));
    console.error(rows.slice(0, 30).join('\n'));
  }
  console.log(text);
  code = text.startsWith('PASS') ? 0 : 1;
  await browser.close();
} finally {
  server.kill();
}
process.exit(code);
