/**
 * The quality gate, the draft PR and the preview screenshot. Nothing here shells out through a
 * string or touches the network directly: git and npm go through an injectable runner (an
 * argument array, never a shell), GitHub through an injectable fetch, the browser through an
 * injectable launcher. Slugs reach branch names, paths and URLs only after ^[a-z0-9-]+$.
 */
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

/** @typedef {import('./context.js').Claim} Claim */
/** @typedef {(cmd: string, args: string[], opts?: { cwd?: string, timeoutMs?: number, env?: Record<string, string> }) => Promise<{ code: number, stdout: string, stderr: string }>} CommandRunner */

const SLUG_RE = /^[a-z0-9-]+$/;
const SCREENSHOT_BRANCH = 'updater-screenshots';
const BROWSER_TIMEOUT_MS = 20 * 60 * 1000;
const PREVIEW_WAIT_MS = 10 * 60 * 1000;
const PREVIEW_POLL_MS = 15 * 1000;
const PR_LOG_LINES = 200;
const DEFAULT_REPO = 'evanyap7/evan-portfolio-website';

function assertSlug(slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) throw new Error(`Invalid slug: ${JSON.stringify(slug)}`);
}

/** Kills a detached child's whole process group (npm, node, Chrome, the python server). */
export function killGroup(child, kill = process.kill) {
  try { kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
}

// What `npm run check`, `npm run check:browser` and their Chrome need, and nothing else: the
// run's ANTHROPIC_API_KEY, EGO_WEBHOOK_SECRET and GITHUB_TOKEN never reach the suite or a page.
const GATE_ENV_KEYS = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'TERM', 'TMPDIR', 'TMP', 'TEMP', 'CI',
  'CHECK_TIMEOUT_MS', 'PLAYWRIGHT_BROWSERS_PATH', 'XDG_CACHE_HOME', 'XDG_CONFIG_HOME', 'XDG_RUNTIME_DIR', 'DISPLAY'];

/** The allowlisted part of an environment, for the gate and the screenshot browser. */
export function gateEnv(env = process.env) {
  const out = {};
  for (const k of GATE_ENV_KEYS) if (typeof env[k] === 'string') out[k] = env[k];
  return out;
}

/**
 * Without opts.env the child inherits this process's environment (git needs it); with it, that
 * object is the child's whole environment.
 * @type {CommandRunner}
 */
export function defaultRunner(cmd, args, { cwd, timeoutMs = 120000, env } = {}, deps = {}) {
  return new Promise((resolve) => {
    const child = (deps.spawn ?? spawn)(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], detached: true, ...(env ? { env } : {}) });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => killGroup(child, deps.kill), timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('error', (err) => { clearTimeout(timer); resolve({ code: 127, stdout, stderr: stderr + String(err.message) }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? 1, stdout, stderr }); });
  });
}

const joinLog = (r) => `${r.stdout ?? ''}${r.stderr ? `\n${r.stderr}` : ''}`;

/**
 * Runs `npm run check`, then `npm run check:browser`. ok needs exit 0, the suite's `PASS <n>`
 * line, and no `FAIL ...` line. "failed requests" lines are informational. Both run with the
 * scrubbed gateEnv(), never the run's secrets.
 * @param {string} root
 * @param {CommandRunner} [run]
 * @param {{ env?: Record<string, string|undefined> }} [opts] the environment to scrub (process.env)
 */
export async function runGate(root, run = defaultRunner, { env: from = process.env } = {}) {
  const env = gateEnv(from);
  const syntax = await run('npm', ['run', 'check'], { cwd: root, timeoutMs: 5 * 60 * 1000, env });
  const syntaxLog = `$ npm run check\n${joinLog(syntax)}`;
  if (syntax.code !== 0) return { ok: false, log: syntaxLog };
  const browser = await run('npm', ['run', 'check:browser'], { cwd: root, timeoutMs: BROWSER_TIMEOUT_MS, env });
  const out = joinLog(browser);
  const log = `${syntaxLog}\n$ npm run check:browser\n${out}`;
  const passed = /^PASS \d+\s*$/m.test(out);
  const failed = /^FAIL\b/m.test(out) || /^TIMEOUT:/m.test(out);
  return { ok: browser.code === 0 && passed && !failed, log };
}

/** @param {Claim[]} claims */
export function buildClaimsFile(claims) {
  const lines = ['from README, unverified', ''];
  for (const c of claims) lines.push(`- ${c.text}`, `  source: ${c.source}`);
  return `${lines.join('\n')}\n`;
}

const tail = (text, n) => String(text).split('\n').slice(-n).join('\n');

function ghFetch(opts) {
  const doFetch = opts.fetch ?? globalThis.fetch;
  const token = opts.token ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const repo = opts.repo ?? DEFAULT_REPO;
  const call = (method, path, body) => doFetch(`https://api.github.com/repos/${repo}/${path}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'portfolio-updater',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { call, repo };
}

/** @returns {Promise<string|null>} URL of an open PR from auto/project-<slug>, or null. */
export async function findOpenDraftPr(slug, opts = {}) {
  assertSlug(slug);
  const { call, repo } = ghFetch(opts);
  const head = encodeURIComponent(`${repo.split('/')[0]}:auto/project-${slug}`);
  const res = await call('GET', `pulls?state=open&head=${head}`);
  if (!res.ok) throw new Error(`GitHub pulls lookup failed: ${res.status}`);
  const prs = await res.json();
  return prs[0]?.html_url ?? null;
}

/** Polls Vercel's deployment for a commit; null if it is not ready within 10 minutes. */
export async function pollPreviewUrl(sha, opts = {}) {
  const { call } = ghFetch(opts);
  const sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const start = now();
  while (now() - start < PREVIEW_WAIT_MS) {
    try {
      const deps = await (await call('GET', `deployments?sha=${sha}`)).json();
      for (const d of Array.isArray(deps) ? deps : []) {
        const sts = await (await call('GET', `deployments/${d.id}/statuses`)).json();
        const ok = (Array.isArray(sts) ? sts : []).find((s) => s.state === 'success' && s.environment_url);
        if (ok) return ok.environment_url;
      }
      const combined = await (await call('GET', `commits/${sha}/status`)).json();
      const hit = (combined.statuses ?? []).find((s) => /vercel/i.test(s.context) && s.state === 'success' && s.target_url);
      if (hit) return hit.target_url;
    } catch { /* keep polling */ }
    await sleep(PREVIEW_POLL_MS);
  }
  return null;
}

async function git(run, root, args) {
  const r = await run('git', args, { cwd: root });
  if (r.code !== 0) throw new Error(`git ${args[0]} failed: ${r.stderr.trim()}`);
  return r.stdout;
}

/**
 * Commits the working tree to auto/project-<slug>, pushes, and opens a draft PR.
 * @param {{ slug: string, kind: 'new'|'changed', branch: string, claimsMd: string, root: string,
 *   baseBranch?: string, gateLog?: string, repo?: string, token?: string, fetch?: Function,
 *   run?: CommandRunner, sleep?: Function, now?: Function }} opts
 */
export async function openDraftPr(opts) {
  const { slug, kind, branch, claimsMd, root, baseBranch = 'main', gateLog = '', paths } = opts;
  assertSlug(slug);
  if (branch !== `auto/project-${slug}`) throw new Error(`Unexpected branch ${JSON.stringify(branch)}`);
  if (!Array.isArray(paths) || paths.length === 0) throw new Error('openDraftPr needs a non-empty paths list');
  for (const p of paths) {
    if (typeof p !== 'string' || p === '' || p.startsWith('/') || p.startsWith('-') || p.split('/').includes('..')) {
      throw new Error(`Invalid path to stage: ${JSON.stringify(p)}`);
    }
  }
  const existing = await findOpenDraftPr(slug, opts);
  if (existing) throw new Error(`A draft PR is already open for ${slug}: ${existing}`);

  const run = opts.run ?? defaultRunner;
  const remote = await git(run, root, ['ls-remote', '--heads', 'origin', branch]);
  if (remote.trim()) throw new Error(`Branch ${branch} already exists on origin with no open PR; delete it or resume it by hand`);
  const email = (await git(run, root, ['config', 'user.email'])).trim();
  if (!email) throw new Error('git user.email is not configured');
  const title = kind === 'new' ? `Add ${slug} to the portfolio` : `Update ${slug} on the portfolio`;
  await git(run, root, ['fetch', 'origin', baseBranch]);
  await git(run, root, ['checkout', '-B', branch, `origin/${baseBranch}`]);
  await git(run, root, ['add', '--', ...paths]);
  await git(run, root, ['-c', 'user.name=evanyap7', '-c', `user.email=${email}`, 'commit', '-m', title]);
  await git(run, root, ['push', '-u', 'origin', branch]);

  const body = [
    `Draft ${kind === 'new' ? 'new Mark' : 'copy update'} for \`${slug}\`. Merging also records it in tools/projects-state.json.`,
    '',
    '## Claims to verify',
    '',
    claimsMd.trimEnd(),
    ...(gateLog ? ['', '## Gate log (last lines)', '', '```', tail(gateLog, PR_LOG_LINES), '```'] : []),
  ].join('\n');
  const { call } = ghFetch(opts);
  // Ready for review, not a GitHub draft: the gate has passed, and EGO's Approve refuses to merge a
  // draft PR (reason "pr-draft"). "Draft" in this module means "awaiting Evan's approval".
  const res = await call('POST', 'pulls', { title, head: branch, base: baseBranch, body, draft: false });
  if (res.status === 422) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(`A draft PR is already drafted for ${slug} (GitHub 422: ${detail.message ?? 'validation failed'})`);
  }
  if (!res.ok) throw new Error(`Opening the PR failed: ${res.status}`);
  const pr = await res.json();
  const previewUrl = await pollPreviewUrl(pr.head.sha, opts);
  return { prUrl: pr.html_url, previewUrl };
}

/**
 * Writes <base>-mobile.png (390x844) and <base>-desktop.png (1440x900) of an https page.
 * @param {string} url
 * @param {string} outPath
 * @param {{ launch?: () => Promise<any> }} [opts]
 */
export async function screenshotPreview(url, outPath, opts = {}) {
  if (!/^https:\/\//.test(url)) throw new Error('Screenshot URL must be https');
  const launch = opts.launch ?? (async () => {
    // The browser suite's own dependency: playwright-core with installed Chrome (Chromium in CI).
    const { chromium } = await import('playwright-core');
    return chromium.launch({ ...(process.env.CI ? {} : { channel: 'chrome' }), env: gateEnv() });
  });
  const stem = outPath.slice(0, outPath.length - extname(outPath).length);
  const browser = await launch();
  try {
    for (const [name, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
      const page = await browser.newPage({ viewport });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${stem}-${name}.png` });
    }
  } finally {
    await browser.close();
  }
}

/**
 * Commits a PNG to the never-merged updater-screenshots branch; returns its raw URL, or null.
 * @returns {Promise<string|null>}
 */
export async function publishScreenshot(pngPath, slug, opts = {}) {
  try {
    assertSlug(slug);
    const name = basename(pngPath);
    if (!/^[a-z0-9-]+\.png$/.test(name)) return null;
    const { call, repo } = ghFetch(opts);
    const ref = await call('GET', `git/ref/heads/${SCREENSHOT_BRANCH}`);
    if (!ref.ok) {
      const base = await call('GET', `git/ref/heads/${opts.baseBranch ?? 'main'}`);
      if (!base.ok) return null;
      const made = await call('POST', 'git/refs', { ref: `refs/heads/${SCREENSHOT_BRANCH}`, sha: (await base.json()).object.sha });
      if (!made.ok) return null;
    }
    const path = `screenshots/${slug}/${name}`;
    const prior = await call('GET', `contents/${path}?ref=${SCREENSHOT_BRANCH}`);
    const sha = prior.ok ? (await prior.json()).sha : undefined;
    const put = await call('PUT', `contents/${path}`, {
      message: `screenshot: ${slug}`, branch: SCREENSHOT_BRANCH,
      content: readFileSync(pngPath).toString('base64'), ...(sha ? { sha } : {}),
    });
    if (!put.ok) return null;
    return `https://raw.githubusercontent.com/${repo}/${SCREENSHOT_BRANCH}/${path}`;
  } catch {
    return null;
  }
}
