import test from 'node:test';
import assert from 'node:assert';
import { SYMBOLS, STRIPS, PAYTABLE, ECON, PITY, T, MOTIONS, ALGO_NAMES } from '../js/config.js';
import { PALETTES } from '../js/art/palette.js';

test('符号带只含合法符号', () => {
  for (const strip of STRIPS)
    for (const s of strip)
      assert.ok(SYMBOLS.includes(s), `非法符号 ${s}`);
});

test('赔付表从高到低排序（首匹配生效的前提）', () => {
  for (let i = 1; i < PAYTABLE.length; i++)
    assert.ok(PAYTABLE[i - 1].pay >= PAYTABLE[i].pay);
});

test('经济/保底/时序常量存在', () => {
  for (const k of ['start', 'bet', 'loan']) assert.equal(typeof ECON[k], 'number');
  assert.equal(typeof PITY.losses, 'number');
  for (const k of ['lockGap', 'spinMin', 'leverThreshold']) assert.equal(typeof T[k], 'number');
});

test('jackpot 海报素材仍齐：8 调色盘 + 8 算法名 + 8 运动', () => {
  assert.equal(PALETTES.length, 8);
  assert.equal(ALGO_NAMES.length, 8);
  assert.equal(MOTIONS.length, 8);
  for (const p of PALETTES) {
    assert.match(p.bg, /^#[0-9a-f]{6}$/i);
    assert.equal(p.colors.length, 4);
  }
  for (const m of MOTIONS)
    for (const k of ['speed', 'breath', 'pulse', 'drift', 'swirl', 'grain', 'scan'])
      assert.equal(typeof m[k], 'number');
});
