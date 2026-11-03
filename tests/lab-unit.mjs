// Unit tests for the lab's pure modules. Run: node tests/lab-unit.mjs
import assert from 'node:assert/strict';
import { railPosition, holds, damp } from '../js/lab/rail.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; } catch (e) { console.error(`FAIL ${name}\n${e.message}`); process.exitCode = 1; }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const vh = 800;
const stops = [
  { top: 0, height: 800 }, { top: 800, height: 1600 }, { top: 2400, height: 800 },
  { top: 3200, height: 4000 }, { top: 7200, height: 1200 }, { top: 8400, height: 600 },
];
const maxScroll = 8400 + 600 + 300 - 800;
const opts = { maxScroll, row: { stop: 3, count: 7 } };
const at = (y, o = opts) => railPosition(y, vh, stops, o);

test('rail starts at the door', () => {
  assert.equal(at(0).u, 0);
  assert.equal(at(0).stop, 0);
});
test('halfway through the first travel is halfway along', () => assert.equal(at(400).u, 0.5));
test('About holds while its section is on screen', () => {
  assert.equal(at(800).u, 1);
  assert.equal(at(1200).u, 1);
  assert.equal(at(1600).u, 1);
  assert.equal(at(1200).stop, 1);
});
test('the suit row starts on the first bay', () => {
  assert.equal(at(3200).u, 3);
  assert.equal(at(3200).bay, 0);
});
test('the suit row ends on the last bay', () => {
  assert.equal(at(3200 + 4000 - 800).u, 4);
  assert.equal(at(3200 + 4000 - 800).bay, 6);
});
test('halfway through the row rests on the middle bay', () => {
  assert.ok(near(at(3200 + (4000 - 800) / 2).bay, 3), String(at(4800).bay));
});
test('bay is -1 outside the row', () => {
  for (const y of [0, 1200, 2400, 7600, maxScroll]) assert.equal(at(y).bay, -1, `y ${y}`);
});
test('the last stop is reached at the end of the page', () => {
  assert.equal(at(maxScroll).u, 6);
  assert.equal(at(maxScroll).stop, 5);
});
test('the last stop is reached even when the page ends before its top', () => {
  const short = { ...opts, maxScroll: 8000 };
  assert.equal(at(8000, short).u, 6);
  assert.equal(at(8000, short).stop, 5);
});
test('the rail never goes back or jumps', () => {
  for (const o of [opts, { ...opts, maxScroll: 8000 }]) {
    let prev = at(0, o).u;
    for (let y = 1; y <= o.maxScroll; y++) {
      const u = at(y, o).u;
      assert.ok(u >= prev, `u fell at ${y}`);
      assert.ok(u - prev <= 0.02, `u jumped ${u - prev} at ${y}`);
      prev = u;
    }
  }
});
test('holds rests on its ends and middle', () => {
  assert.equal(holds(0, 7), 0);
  assert.equal(holds(1, 7), 6);
  assert.equal(holds(0.5, 7), 3);
});
test('holds never goes back', () => {
  let prev = 0;
  for (let i = 0; i <= 10000; i++) {
    const v = holds(i / 10000, 7);
    assert.ok(v >= prev, `fell at ${i}`);
    prev = v;
  }
});
test('damp moves toward the target', () => {
  assert.equal(damp(0, 10, 5, 0), 0);
  assert.ok(near(damp(0, 10, 5, 1e3), 10));
});

console.log(`lab-unit: ${passed} passed`);
