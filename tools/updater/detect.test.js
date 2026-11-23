import test from 'node:test';
import assert from 'node:assert/strict';
import { listEligibleRepos, enrichRepos, classify, isChoreOnly } from './detect.js';
import { hashReadme } from './context.js';

const config = {
  owner: 'evanyap7', baseBranch: 'main', allow: [], deny: ['denied'],
  changeThresholds: { minCommits: 5, readmeChanged: true }, models: { draft: 'm' },
};

const raw = (name, over = {}) => ({
  name, full_name: `evanyap7/${name}`, description: `${name} d`, private: false, fork: false, archived: false,
  pushed_at: '2026-02-01T00:00:00Z', default_branch: 'main', topics: [], language: 'JS', ...over,
});

test('listEligibleRepos drops private, fork, archived and denied repos', async () => {
  const gh = {
    async json(path) {
      assert.ok(path.startsWith('users/evanyap7/repos'));
      return [raw('ok'), raw('priv', { private: true }), raw('frk', { fork: true }), raw('arc', { archived: true }), raw('denied'), raw('ok2')];
    },
  };
  const repos = await listEligibleRepos(config, gh);
  assert.deepEqual(repos.map((r) => r.name), ['ok', 'ok2']);
  assert.equal(repos[0].fullName, 'evanyap7/ok');
  assert.equal(repos[0].pushedAt, '2026-02-01T00:00:00Z');
  assert.equal(repos[0].defaultBranch, 'main');
});

test('listEligibleRepos follows pages of 100 until a short page', async () => {
  const paths = [];
  const page = (n, count) => Array.from({ length: count }, (_, i) => raw(`p${n}-${i}`));
  const gh = {
    async json(path) {
      paths.push(path);
      const n = Number(/[?&]page=(\d+)/.exec(path)?.[1]);
      assert.match(path, /per_page=100/);
      return n === 1 ? page(1, 100) : n === 2 ? page(2, 100) : page(3, 7);
    },
  };
  const repos = await listEligibleRepos(config, gh);
  assert.equal(repos.length, 207);
  assert.equal(paths.length, 3);
  assert.deepEqual(paths.map((p) => /[?&]page=(\d+)/.exec(p)[1]), ['1', '2', '3']);
});

test('listEligibleRepos stops at a page cap instead of looping forever', async () => {
  let calls = 0;
  const gh = { json: async () => { calls += 1; return Array.from({ length: 100 }, (_, i) => raw(`r${calls}-${i}`)); } };
  await assert.rejects(listEligibleRepos(config, gh), /pages/i);
  assert.ok(calls <= 10, `${calls} calls`);
});

test('listEligibleRepos restricts to allow when non-empty; deny still wins', async () => {
  const gh = { json: async () => [raw('a'), raw('b'), raw('denied')] };
  const repos = await listEligibleRepos({ ...config, allow: ['a', 'denied'] }, gh);
  assert.deepEqual(repos.map((r) => r.name), ['a']);
});

function fakeGh({ readmes = {}, commits = {} } = {}) {
  const calls = [];
  return {
    calls,
    async json(path) {
      calls.push(path);
      const name = path.match(/repos\/evanyap7\/([^/]+)\/commits/)[1];
      return (commits[name] ?? []).map((message) => ({ commit: { message } }));
    },
    async text(path) {
      calls.push(path);
      const name = path.match(/repos\/evanyap7\/([^/]+)\/readme/)[1];
      if (readmes[name] === null) throw new Error('gh: 404 Not Found');
      return readmes[name] ?? '';
    },
  };
}

const repo = (name, over = {}) => ({ name, fullName: `evanyap7/${name}`, description: 'd', pushedAt: '2026-02-01T00:00:00Z', defaultBranch: 'main', topics: [], ...over });

test('enrichRepos adds commitsSince, readmeHash and recentCommitMessages', async () => {
  const gh = fakeGh({ readmes: { a: '  Hello \n' }, commits: { a: ['feat: x', 'fix: y', 'z'] } });
  const state = { repos: { a: { slug: 'a', status: 'published', pushedAt: '2026-01-01T00:00:00Z', readmeHash: 'old' } } };
  const [a] = await enrichRepos([repo('a')], state, gh);
  assert.equal(a.commitsSince, 3);
  assert.equal(a.readmeHash, hashReadme('Hello'));
  assert.deepEqual(a.recentCommitMessages, ['feat: x', 'fix: y', 'z']);
  assert.ok(gh.calls.some((p) => p.includes('since=2026-01-01T00:00:00Z') && p.includes('sha=main')));
});

test('enrichRepos caps unseen repos and omits since; missing README hashes as empty', async () => {
  const gh = fakeGh({ readmes: { n: null }, commits: { n: ['feat: a'] } });
  const [n] = await enrichRepos([repo('n')], { repos: {} }, gh);
  assert.equal(n.commitsSince, 1);
  assert.equal(n.readmeHash, hashReadme(''));
  const commitCall = gh.calls.find((p) => p.includes('/commits'));
  assert.ok(!commitCall.includes('since='));
  assert.match(commitCall, /per_page=\d+/);
});

test('enrichRepos does not mutate its input', async () => {
  const input = repo('a');
  await enrichRepos([input], { repos: {} }, fakeGh());
  assert.equal(input.commitsSince, undefined);
});

test('enrichRepos treats a 409 empty-repo commits error as zero commits', async () => {
  const gh = {
    json: async () => { throw new Error('gh: 409 Git Repository is empty.'); },
    text: async () => { throw new Error('gh: 404 Not Found'); },
  };
  const [e] = await enrichRepos([repo('empty')], { repos: {} }, gh);
  assert.equal(e.commitsSince, 0);
  assert.deepEqual(e.recentCommitMessages, []);
});

test('enrichRepos skips a repo that fails otherwise, with a warning, and enriches the rest', async () => {
  const good = fakeGh({ readmes: { ok: 'hi' }, commits: { ok: ['feat: a'] } });
  const gh = {
    json: (p) => (p.includes('/bad/') ? Promise.reject(new Error('gh: 502 Bad Gateway')) : good.json(p)),
    text: (p) => good.text(p),
  };
  const warnings = [];
  const orig = console.warn;
  console.warn = (...a) => warnings.push(a.join(' '));
  let out;
  try {
    out = await enrichRepos([repo('bad'), repo('ok')], { repos: {} }, gh);
  } finally {
    console.warn = orig;
  }
  assert.deepEqual(out.map((r) => r.name), ['ok']);
  assert.equal(out[0].commitsSince, 1);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /bad.*502/);
});

test('isChoreOnly: conventional chore prefixes with optional scope', () => {
  assert.equal(isChoreOnly(['chore: bump', 'docs(readme): typo', 'ci: x', 'style!: y', 'test(a): z']), true);
  assert.equal(isChoreOnly(['chore: bump', 'feat: real']), false);
  assert.equal(isChoreOnly(['choreography']), false);
  assert.equal(isChoreOnly([]), false);
});

const tracked = (status, over = {}) => ({ slug: 's', status, pushedAt: '2026-01-01T00:00:00Z', readmeHash: 'h1', ...over });
const enriched = (name, over = {}) => repo(name, { commitsSince: 0, readmeHash: 'h1', recentCommitMessages: [], ...over });

test('classify: unseen repo is new', () => {
  const out = classify([enriched('u')], { repos: {} }, config);
  assert.deepEqual(out.map((x) => [x.repo.name, x.kind]), [['u', 'new']]);
});

test('classify: published repo is changed on README hash change or enough commits', () => {
  const state = { repos: { a: tracked('published'), b: tracked('published'), c: tracked('published') } };
  const out = classify([
    enriched('a', { readmeHash: 'h2' }),
    enriched('b', { commitsSince: 5, recentCommitMessages: ['feat: 1'] }),
    enriched('c', { commitsSince: 4 }),
  ], state, config);
  assert.deepEqual(out.map((x) => [x.repo.name, x.kind]), [['a', 'changed'], ['b', 'changed']]);
});

test('classify: chore-only pushes are not changed', () => {
  const state = { repos: { a: tracked('published') } };
  const msgs = ['chore: deps', 'docs: typo', 'ci: x', 'style: y', 'test: z'];
  assert.deepEqual(classify([enriched('a', { commitsSince: 5, recentCommitMessages: msgs })], state, config), []);
});

test('classify: skipped repos are re-proposed only when changed again', () => {
  const state = { repos: { a: tracked('skipped'), b: tracked('skipped'), c: tracked('skipped') } };
  const out = classify([
    enriched('a'),
    enriched('b', { readmeHash: 'h9' }),
    enriched('c', { commitsSince: 7, recentCommitMessages: ['feat: q'] }),
  ], state, config);
  assert.deepEqual(out.map((x) => [x.repo.name, x.kind]), [['b', 'changed'], ['c', 'changed']]);
});

test('classify: pending repos are never re-proposed', () => {
  const state = { repos: { a: tracked('pending') } };
  const out = classify([enriched('a', { readmeHash: 'zzz', commitsSince: 50, recentCommitMessages: ['feat: x'] })], state, config);
  assert.deepEqual(out, []);
});

test('classify: readmeChanged=false ignores README hash differences', () => {
  const cfg = { ...config, changeThresholds: { minCommits: 5, readmeChanged: false } };
  const state = { repos: { a: tracked('published') } };
  assert.deepEqual(classify([enriched('a', { readmeHash: 'h2' })], state, cfg), []);
});
