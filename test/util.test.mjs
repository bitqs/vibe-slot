import test from 'node:test';
import assert from 'node:assert';
import { rng, noise2, motionFrame } from '../js/art/util.js';
import { MOTIONS } from '../js/config.js';

test('rng 同 seed 同序列，不同 seed 不同', () => {
  const a = rng(42), b = rng(42), c = rng(43);
  const sa = [], sb = [], sc = [];
  for (let i = 0; i < 8; i++) { sa.push(a()); sb.push(b()); sc.push(c()); }
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, sc);
  for (const v of sa) assert.ok(v >= 0 && v < 1);
});

test('noise2 确定且 ∈[0,1)', () => {
  const n1 = noise2(7), n2 = noise2(7);
  for (let i = 0; i < 30; i++) {
    const x = i * .37, y = i * .91;
    const v = n1(x, y);
    assert.ok(v >= 0 && v < 1);
    assert.equal(v, n2(x, y));
  }
});

test('motionFrame 对全部 8 motion 返回有限数', () => {
  for (const m of MOTIONS) {
    const f = motionFrame(m, 3.7);
    for (const k of ['tt', 'amp', 'dx', 'dy', 'rot'])
      assert.ok(Number.isFinite(f[k]), `${m.name}.${k}`);
  }
});
