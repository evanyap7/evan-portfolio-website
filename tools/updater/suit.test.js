import test from 'node:test';
import assert from 'node:assert/strict';
import { pickSuit, contrastRatio, MODELS } from './suit.js';

const ctx = (name) => ({ name });
const hex = /^#[0-9a-f]{6}$/;

test('pickSuit is deterministic for a repo name', () => {
  assert.deepEqual(pickSuit(ctx('alpha'), []), pickSuit(ctx('alpha'), []));
});

test('pickSuit never returns a neighbour model', () => {
  for (let i = 0; i < 60; i++) {
    const n = [MODELS[i % 4], MODELS[(i + 1) % 4]];
    const s = pickSuit(ctx(`repo-${i}`), n);
    assert.ok(!n.includes(s.model), `${s.model} in ${n}`);
  }
});

test('pickSuit falls back to any model when every model is a neighbour', () => {
  assert.ok(MODELS.includes(pickSuit(ctx('x'), [...MODELS]).model));
});

test('base and accent contrast is at least 3, colours are hex', () => {
  for (let i = 0; i < 200; i++) {
    const s = pickSuit(ctx(`repo-${i}`), []);
    assert.ok(contrastRatio(s.paint.base, s.paint.accent) >= 3, s.colours.join());
    assert.equal(s.colours.length, 2);
    for (const c of s.colours) assert.match(c, hex);
    assert.equal(s.colours[0], '#' + s.paint.base.toString(16).padStart(6, '0'));
    assert.equal(s.colours[1], '#' + s.paint.accent.toString(16).padStart(6, '0'));
    assert.ok(Number.isInteger(s.hue) && s.hue >= 0 && s.hue < 360);
    assert.equal(typeof s.paintName, 'string');
    assert.ok(s.paintName.length > 0);
    assert.equal(typeof s.paint.metal, 'number');
    assert.equal(typeof s.paint.rough, 'number');
  }
});
