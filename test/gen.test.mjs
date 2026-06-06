import test from 'node:test';
import assert from 'node:assert';
import { ALGOS } from '../js/art/index.js';

test('gen 确定性：同 seed 同场景，不同 seed 不同', () => {
  for (const a of ALGOS) {
    const s1 = JSON.stringify(a.gen(12345, 390, 520));
    const s2 = JSON.stringify(a.gen(12345, 390, 520));
    assert.equal(s1, s2, a.name);
    assert.notEqual(s1, JSON.stringify(a.gen(54321, 390, 520)), a.name);
  }
});

test('算法接口齐全', () => {
  for (const a of ALGOS) {
    assert.equal(typeof a.gen, 'function');
    assert.equal(typeof a.draw, 'function');
    assert.equal(typeof a.fade, 'number');
  }
});
