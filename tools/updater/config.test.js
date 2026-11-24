import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, loadState, saveState } from './config.js';

test('loadConfig returns owner, thresholds, model and base branch', () => {
  const c = loadConfig();
  assert.equal(c.owner, 'evanyap7');
  assert.equal(c.baseBranch, 'main');
  assert.deepEqual(c.changeThresholds, { minCommits: 5, readmeChanged: true });
  assert.equal(c.models.draft, 'claude-sonnet-5-5');
  // evans-trading-agent's page is case-studies/, which the updater cannot edit; finance-tracker and
  // ATPI-Webpage are not on the site and are not to be proposed.
  for (const r of ['ai-job-search', 'skills-introduction-to-github', 'introduction-to-github', 'open-higgsfield', 'evan-portfolio-website', 'evanyap7',
    'evans-trading-agent', 'finance-tracker', 'ATPI-Webpage']) {
    assert.ok(c.deny.includes(r), r);
  }
});

test('committed state seeds six public repos as published, slugs exist in projects.js', () => {
  const expected = {
    'evans-trading-agent': 'trading-agent',
    'telegram-personal-assistant': 'assistant-bot',
    'ai-research-agent': 'research-agent',
    'Parallel-Match': 'parallel-match',
    'univers-homepage-revamp': 'website-revamp',
    WatchPartyyy: 'watchpartyyy',
  };
  const { repos } = loadState();
  assert.deepEqual(Object.keys(repos).sort(), Object.keys(expected).sort());
  const src = readFileSync(new URL('../../js/projects.js', import.meta.url), 'utf8');
  for (const [repo, slug] of Object.entries(expected)) {
    assert.equal(repos[repo].slug, slug);
    assert.equal(repos[repo].status, 'published');
    // Placeholders until the baseline run records the real values.
    assert.match(repos[repo].pushedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    assert.equal(typeof repos[repo].readmeHash, 'string');
    assert.match(src, new RegExp(`['"]?${slug}['"]?\\s*:`), slug);
  }
  // Every seeded repo the updater may edit has its own work page and home-page card.
  const config = loadConfig();
  const index = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  for (const [repo, slug] of Object.entries(expected)) {
    if (config.deny.includes(repo)) continue;
    assert.ok(existsSync(new URL(`../../work/${slug}.html`, import.meta.url)), `work/${slug}.html`);
    assert.match(index, new RegExp(`id="work-${slug}" href="work/${slug}\\.html"`), slug);
  }
});

test('saveState then loadState round-trips', () => {
  const p = join(mkdtempSync(join(tmpdir(), 'upd-')), 'state.json');
  const state = { repos: { foo: { slug: 'foo', status: 'pending', pushedAt: '2026-01-01T00:00:00Z', readmeHash: 'abc', mark: 'x' } } };
  saveState(state, p);
  assert.deepEqual(loadState(p), state);
});

test('malformed JSON throws an error naming the file', () => {
  const p = join(mkdtempSync(join(tmpdir(), 'upd-')), 'bad.json');
  writeFileSync(p, '{ nope');
  assert.throws(() => loadState(p), new RegExp('bad\\.json'));
  assert.throws(() => loadConfig(p), new RegExp('bad\\.json'));
});
