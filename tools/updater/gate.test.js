import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  runGate, buildClaimsFile, openDraftPr, findOpenDraftPr, pollPreviewUrl,
  screenshotPreview, publishScreenshot,
} from './gate.js';
import { loadConfig } from './config.js';

const FORBIDDEN = /Co-Authored-By|Generated with/i;

function runner(script) {
  const calls = [];
  const run = async (cmd, args, opts = {}) => {
    calls.push({ cmd, args, opts });
    const hit = script(cmd, args, opts);
    return { code: 0, stdout: '', stderr: '', ...(hit ?? {}) };
  };
  run.calls = calls;
  return run;
}
const npmArg = (args) => args.join(' ');

test('runGate: exit 0 without a PASS line is not ok', async () => {
  const run = runner((cmd, args) => (npmArg(args).includes('check:browser') ? { stdout: '12 failed requests:\n/a.js net::ERR\n' } : {}));
  const r = await runGate('/r', run);
  assert.equal(r.ok, false);
});

test('runGate: npm run check failure stops before the browser suite', async () => {
  const run = runner((cmd, args) => (npmArg(args) === 'run check' ? { code: 1, stderr: 'SyntaxError' } : {}));
  const r = await runGate('/r', run);
  assert.equal(r.ok, false);
  assert.equal(run.calls.length, 1);
  assert.match(r.log, /SyntaxError/);
});

test('runGate: exit 0 plus PASS line is ok, with a long timeout for the browser suite', async () => {
  const run = runner((cmd, args) => (npmArg(args).includes('check:browser') ? { stdout: 'PASS 6487\n' } : {}));
  const r = await runGate('/r', run);
  assert.equal(r.ok, true);
  assert.equal(run.calls[1].opts.timeoutMs, 20 * 60 * 1000);
  assert.equal(run.calls[1].opts.cwd, '/r');
});

test('runGate: a failure line is not ok even with PASS and exit 0; failed requests alone are fine', async () => {
  const bad = runner((c, a) => (npmArg(a).includes('browser') ? { stdout: 'FAIL 2 of 6487\nPASS 6487\n' } : {}));
  assert.equal((await runGate('/r', bad)).ok, false);
  const info = runner((c, a) => (npmArg(a).includes('browser') ? { stderr: '1 failed requests:\n/x\n', stdout: 'PASS 6487\n' } : {}));
  assert.equal((await runGate('/r', info)).ok, true);
});

test('runGate: non-zero exit with a PASS line is not ok', async () => {
  const run = runner((c, a) => (npmArg(a).includes('browser') ? { code: 2, stdout: 'PASS 1\n' } : {}));
  assert.equal((await runGate('/r', run)).ok, false);
});

const claims = [
  { text: '38/39', source: 'It passed 38/39 tests.' },
  { text: '$5', source: 'Costs $5 a month.' },
];

test('buildClaimsFile: header, each claim with its source, deterministic', () => {
  const md = buildClaimsFile(claims);
  assert.ok(md.startsWith('from README, unverified'));
  assert.match(md, /38\/39/);
  assert.match(md, /It passed 38\/39 tests\./);
  assert.match(md, /Costs \$5 a month\./);
  assert.equal(md, buildClaimsFile(claims.map((c) => ({ ...c }))));
  assert.doesNotMatch(md, FORBIDDEN);
});

function prFixture({ openPrs = [], statuses = [] } = {}) {
  const requests = [];
  const fetch = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    requests.push({ url: String(url), method, body: init.body ? JSON.parse(init.body) : undefined });
    const u = String(url);
    const ok = (data) => ({ ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) });
    if (method === 'GET' && u.includes('/pulls?')) return ok(openPrs);
    if (method === 'POST' && u.endsWith('/pulls')) return ok({ html_url: 'https://github.com/o/r/pull/9', head: { sha: 'abc123' } });
    if (u.includes('/deployments?')) return ok([]);
    if (u.includes('/status')) return ok({ statuses });
    return ok({});
  };
  const run = runner((cmd, args) => (cmd === 'git' && args.join(' ') === 'config user.email' ? { stdout: 'fake@example.test\n' } : {}));
  return { fetch, requests, run };
}
let clock = 0;
const base = (fx, over = {}) => ({
  slug: 'my-proj', kind: 'new', branch: 'auto/project-my-proj', claimsMd: buildClaimsFile(claims),
  root: '/r', repo: 'o/r', token: 't', fetch: fx.fetch, run: fx.run, sleep: async (ms) => { clock += ms; }, now: () => clock, ...over,
});

test('openDraftPr: commits with the repo email, no attribution, base from baseBranch, claims in body', async () => {
  const fx = prFixture({ statuses: [{ context: 'Vercel', state: 'success', target_url: 'https://p.vercel.app' }] });
  const r = await openDraftPr(base(fx, { baseBranch: 'develop' }));
  assert.equal(r.prUrl, 'https://github.com/o/r/pull/9');
  assert.equal(r.previewUrl, 'https://p.vercel.app');
  const post = fx.requests.find((q) => q.method === 'POST' && q.url.endsWith('/pulls'));
  assert.equal(post.body.base, 'develop');
  assert.equal(post.body.head, 'auto/project-my-proj');
  assert.equal(post.body.draft, true);
  assert.match(post.body.body, /from README, unverified/);
  assert.match(post.body.body, /38\/39/);
  assert.doesNotMatch(post.body.body, FORBIDDEN);
  assert.doesNotMatch(post.body.title, FORBIDDEN);
  const commit = fx.run.calls.find((c) => c.args.includes('commit'));
  assert.ok(commit.args.includes('user.email=fake@example.test'));
  assert.ok(commit.args.includes('user.name=evanyap7'));
  assert.ok(!commit.args.includes('--no-verify'));
  assert.doesNotMatch(commit.args.join('\n'), FORBIDDEN);
  assert.ok(fx.run.calls.some((c) => c.args[0] === 'push'));
});

test('openDraftPr: base defaults to main (config.baseBranch)', async () => {
  const fx = prFixture();
  await openDraftPr(base(fx));
  assert.equal(fx.requests.find((q) => q.method === 'POST').body.base, 'main');
  assert.equal(loadConfig().baseBranch, 'main');
});

test('openDraftPr refuses when a draft PR is already open and does not touch git', async () => {
  const fx = prFixture({ openPrs: [{ html_url: 'https://github.com/o/r/pull/3' }] });
  await assert.rejects(openDraftPr(base(fx)), /already open.*pull\/3/);
  assert.equal(fx.run.calls.length, 0);
});

test('findOpenDraftPr: URL or null, queries head owner:branch', async () => {
  const fx = prFixture({ openPrs: [{ html_url: 'https://github.com/o/r/pull/3' }] });
  assert.equal(await findOpenDraftPr('my-proj', { repo: 'o/r', fetch: fx.fetch }), 'https://github.com/o/r/pull/3');
  assert.match(fx.requests[0].url, /head=o%3Aauto%2Fproject-my-proj/);
  const none = prFixture();
  assert.equal(await findOpenDraftPr('my-proj', { repo: 'o/r', fetch: none.fetch }), null);
});

test('slug validation and branch match', async () => {
  const fx = prFixture();
  for (const slug of ['Bad', 'a b', '../x', 'a;rm', '']) {
    await assert.rejects(openDraftPr(base(fx, { slug, branch: `auto/project-${slug}` })), /slug/i);
    await assert.rejects(findOpenDraftPr(slug, { repo: 'o/r', fetch: fx.fetch }), /slug/i);
  }
  await assert.rejects(openDraftPr(base(fx, { branch: 'auto/project-other' })), /branch/i);
  assert.equal(fx.run.calls.length, 0);
});

test('pollPreviewUrl: returns the URL once ready; null on timeout without throwing', async () => {
  let t = 0;
  let n = 0;
  const fetch = async (url) => ({
    ok: true, status: 200,
    json: async () => (String(url).includes('/deployments?') ? [] : { statuses: ++n < 3 ? [{ context: 'Vercel', state: 'pending' }] : [{ context: 'Vercel', state: 'success', target_url: 'https://x.vercel.app' }] }),
  });
  const opts = { repo: 'o/r', fetch, sleep: async (ms) => { t += ms; }, now: () => t };
  assert.equal(await pollPreviewUrl('abc', opts), 'https://x.vercel.app');
  const never = { ...opts, fetch: async () => ({ ok: true, status: 200, json: async () => ({ statuses: [] }) }) };
  t = 0;
  assert.equal(await pollPreviewUrl('abc', never), null);
  assert.ok(t >= 10 * 60 * 1000);
});

test('screenshotPreview writes mobile and desktop frames through an injected launcher', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'shot-'));
  const sizes = [];
  const launch = async () => ({
    newPage: async ({ viewport }) => ({
      goto: async () => {}, waitForTimeout: async () => {},
      screenshot: async ({ path }) => { sizes.push(viewport.width); writeFileSync(path, 'png'); },
    }),
    close: async () => {},
  });
  await screenshotPreview('https://p.vercel.app/work/x.html', join(dir, 'x.png'), { launch });
  assert.deepEqual(sizes, [390, 1440]);
  assert.ok(existsSync(join(dir, 'x-mobile.png')) && existsSync(join(dir, 'x-desktop.png')));
  await assert.rejects(screenshotPreview('file:///etc/passwd', join(dir, 'y.png'), { launch }), /https/);
});

test('publishScreenshot returns the raw URL, or null on failure, never throwing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pub-'));
  const png = join(dir, 'x-mobile.png');
  writeFileSync(png, 'png');
  const puts = [];
  const fetch = async (url, init = {}) => {
    if ((init.method ?? 'GET') === 'PUT') puts.push({ url: String(url), body: JSON.parse(init.body) });
    return { ok: true, status: 200, json: async () => ({ object: { sha: 's' }, sha: 's' }) };
  };
  const url = await publishScreenshot(png, 'my-proj', { repo: 'o/r', token: 't', fetch });
  assert.equal(url, 'https://raw.githubusercontent.com/o/r/updater-screenshots/screenshots/my-proj/x-mobile.png');
  assert.equal(puts[0].body.branch, 'updater-screenshots');
  const boom = async () => { throw new Error('net'); };
  assert.equal(await publishScreenshot(png, 'my-proj', { repo: 'o/r', token: 't', fetch: boom }), null);
  assert.equal(await publishScreenshot(png, 'Bad Slug', { repo: 'o/r', token: 't', fetch }), null);
  const fail = async () => ({ ok: false, status: 422, json: async () => ({}) });
  assert.equal(await publishScreenshot(png, 'my-proj', { repo: 'o/r', token: 't', fetch: fail }), null);
});
