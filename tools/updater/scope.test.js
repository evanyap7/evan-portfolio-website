import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScope, scopeQuery, reducedRuns } from '../../tests/scope.js';

const all = ['structure', 'callouts', 'picker'];
const pageChecks = ['titles', 'projectPage'];

test('parseScope: unset is the full suite with no slug and an unchanged URL', () => {
  assert.deepEqual(parseScope([]), { scope: 'full', slug: undefined });
  assert.equal(scopeQuery(parseScope([])), '');
});

test('parseScope: reduced needs a safe slug; anything else throws', () => {
  assert.deepEqual(parseScope(['--scope=reduced', '--slug=my-repo-2']), { scope: 'reduced', slug: 'my-repo-2' });
  assert.throws(() => parseScope(['--scope=reduced']), /--slug/);
  assert.throws(() => parseScope(['--scope=reduced', '--slug=../x']), /--slug/);
  assert.throws(() => parseScope(['--scope=reduced', '--slug=A&b']), /--slug/);
  assert.throws(() => parseScope(['--scope=bogus']), /Unknown scope/);
  assert.throws(() => parseScope(['--slug=x']), /only applies/);
});

test('scopeQuery: reduced adds scope and slug', () => {
  assert.equal(scopeQuery({ scope: 'reduced', slug: 'abc' }), '&scope=reduced&slug=abc');
});

test('reducedRuns: the main-page group keeps its order, the work page and card checks are added', () => {
  const runs = reducedRuns({ slug: 'newthing', all, pageChecks });
  const main = runs.filter((r) => r.src === '/' && r.names === all);
  assert.ok(main.length >= 1);
  for (const r of main) assert.deepEqual(r.names, ['structure', 'callouts', 'picker']);
  assert.equal(runs.filter((r) => r.src === '/work/newthing.html').length, 5);
  assert.ok(runs.filter((r) => r.src === '/work/newthing.html').every((r) => r.names === pageChecks));
  assert.ok(runs.some((r) => r.src === '/#work-newthing' && r.names.includes('deepLink')));
  assert.ok(runs.some((r) => r.names.includes('pickerLabels')));
  assert.throws(() => reducedRuns({ slug: '../x', all, pageChecks }), /Invalid slug/);
});
