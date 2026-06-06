import test from 'node:test';
import assert from 'node:assert';
import { REELS, MOTIONS, T } from '../js/config.js';
import { PALETTES } from '../js/art/palette.js';

test('3 转轴 × 8 词条', () => {
  assert.equal(REELS.length, 3);
  for (const r of REELS) assert.equal(r.length, 8);
});

test('8 调色盘合法', () => {
  assert.equal(PALETTES.length, 8);
  for (const p of PALETTES) {
    assert.match(p.bg, /^#[0-9a-f]{6}$/i);
    assert.equal(p.colors.length, 4);
    for (const c of p.colors) assert.match(c, /^#[0-9a-f]{6}$/i);
  }
});

test('8 运动参数字段齐', () => {
  assert.equal(MOTIONS.length, 8);
  for (const m of MOTIONS) {
    assert.equal(typeof m.name, 'string');
    for (const k of ['speed', 'breath', 'pulse', 'drift', 'swirl', 'grain', 'scan'])
      assert.equal(typeof m[k], 'number', `${m.name}.${k}`);
  }
});

test('时序常量存在', () => {
  for (const k of ['lockGap', 'spinMin', 'leverThreshold'])
    assert.equal(typeof T[k], 'number');
});
