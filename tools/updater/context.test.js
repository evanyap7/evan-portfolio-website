import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { collectContext, extractClaims, hashReadme, NoUsableContentError } from './context.js';

const repo = { name: 'demo', fullName: 'evanyap7/demo', description: 'A demo', topics: ['ai'], defaultBranch: 'main' };

function fakeGh({ readme = '# Demo\nHello.', languages = { JavaScript: 10, CSS: 5 }, commits = [] } = {}) {
  const calls = [];
  return {
    calls,
    async json(path) {
      calls.push(path);
      if (path.includes('/languages')) return languages;
      if (path.includes('/commits')) return commits.map((message) => ({ commit: { message } }));
      throw new Error(`unexpected ${path}`);
    },
    async text(path) {
      calls.push(path);
      return readme;
    },
  };
}

test('extractClaims finds percent, fraction and plus claims with their sentence', () => {
  const claims = extractClaims('97% accuracy (38/39), 476+ tests');
  assert.deepEqual(claims.map((c) => c.text), ['97%', '38/39', '476+']);
  for (const c of claims) assert.equal(c.source, '97% accuracy (38/39), 476+ tests');
});

test('extractClaims uses the surrounding sentence as source', () => {
  const claims = extractClaims('It is fast. Handles 1,200 req/s on $5 hosting. Ranges 3-5 items, 2.5x faster.');
  const byText = Object.fromEntries(claims.map((c) => [c.text, c.source]));
  assert.equal(byText['1,200'], 'Handles 1,200 req/s on $5 hosting.');
  assert.equal(byText['$5'], 'Handles 1,200 req/s on $5 hosting.');
  assert.equal(byText['3-5'], 'Ranges 3-5 items, 2.5x faster.');
  assert.equal(byText['2.5x'], 'Ranges 3-5 items, 2.5x faster.');
});

test('extractClaims returns [] for empty or non-numeric text', () => {
  assert.deepEqual(extractClaims(''), []);
  assert.deepEqual(extractClaims('   \n '), []);
  assert.deepEqual(extractClaims('no numbers here'), []);
  assert.deepEqual(extractClaims(undefined), []);
});

test('hashReadme is SHA-256 of the trimmed text', () => {
  assert.equal(hashReadme('  hi\n'), createHash('sha256').update('hi').digest('hex'));
});

test('collectContext gathers readme, languages, topics, commits and hash', async () => {
  const gh = fakeGh({ commits: ['feat: a', 'fix: b'] });
  const ctx = await collectContext(repo, gh, '2026-01-01T00:00:00Z');
  assert.equal(ctx.name, 'demo');
  assert.equal(ctx.description, 'A demo');
  assert.equal(ctx.readme, '# Demo\nHello.');
  assert.deepEqual(ctx.languages, ['JavaScript', 'CSS']);
  assert.deepEqual(ctx.topics, ['ai']);
  assert.deepEqual(ctx.commits, ['feat: a', 'fix: b']);
  assert.equal(ctx.readmeHash, hashReadme('# Demo\nHello.'));
  assert.ok(gh.calls.some((p) => p.includes('since=2026-01-01T00:00:00Z')));
});

test('collectContext truncates the readme to 20k characters but hashes the full text', async () => {
  const big = 'a'.repeat(30000);
  const ctx = await collectContext(repo, fakeGh({ readme: big }));
  assert.equal(ctx.readme.length, 20000);
  assert.equal(ctx.readmeHash, hashReadme(big));
});

test('collectContext rejects with NoUsableContentError for empty readme and description', async () => {
  for (const readme of ['', '  \n\t ']) {
    await assert.rejects(
      collectContext({ ...repo, description: '' }, fakeGh({ readme })),
      (err) => err instanceof NoUsableContentError && err.name === 'NoUsableContentError',
    );
  }
  await assert.rejects(collectContext({ ...repo, description: null }, fakeGh({ readme: ' ' })), NoUsableContentError);
});

test('collectContext accepts a description alone', async () => {
  const ctx = await collectContext(repo, fakeGh({ readme: '' }));
  assert.equal(ctx.readme, '');
  assert.equal(ctx.description, 'A demo');
});
