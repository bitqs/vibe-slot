import test from 'node:test';
import assert from 'node:assert';
import { STRIPS, PAYTABLE, ECON, PITY } from '../js/config.js';
import { spin, judge, lineOf } from '../js/slots.js';
import { rng } from '../js/art/util.js';

test('符号带组成：3 条 ×20 格，符号计数符合设计', () => {
  assert.equal(STRIPS.length, 3);
  const count = strip => strip.reduce((a, s) => (a[s] = (a[s] || 0) + 1, a), {});
  assert.deepEqual(count(STRIPS[0]), { C: 5, L: 5, M: 4, B: 3, R: 2, S: 1 });
  for (const i of [1, 2]) {
    assert.equal(STRIPS[i].length, 20);
    assert.deepEqual(count(STRIPS[i]), { C: 4, L: 5, M: 4, B: 3, R: 2, S: 2 });
  }
});

test('judge 全分支', () => {
  assert.equal(judge(['S', 'S', 'S']).id, 'jackpot');
  assert.equal(judge(['R', 'R', 'R']).id, 'bar3');
  assert.equal(judge(['B', 'B', 'B']).id, 'bell3');
  assert.equal(judge(['M', 'M', 'M']).id, 'melon3');
  assert.equal(judge(['L', 'L', 'L']).id, 'lemon3');
  assert.equal(judge(['C', 'C', 'C']).id, 'cherry3');
  assert.equal(judge(['C', 'C', 'L']).id, 'cherry2');
  assert.equal(judge(['C', 'B', 'S']).id, 'cherry1');
  assert.equal(judge(['L', 'C', 'C']), null);  // 樱桃必须左起连
  assert.equal(judge(['S', 'S', 'L']), null);  // 7-7-x 不中
  assert.equal(judge(['L', 'M', 'B']), null);
});

test('精确 RTP/命中率：枚举全部 8000 组合', () => {
  const n = STRIPS[0].length;
  let payout = 0, hits = 0;
  for (let a = 0; a < n; a++)
    for (let b = 0; b < n; b++)
      for (let c = 0; c < n; c++) {
        const w = judge(lineOf([a, b, c]));
        if (w) { payout += w.pay; hits++; }
      }
  const rtp = payout / (n * n * n * ECON.bet);
  const hit = hits / (n * n * n);
  assert.ok(rtp > .92 && rtp < .97, `理论 RTP ${rtp.toFixed(4)} 出带`);
  assert.ok(hit > .25 && hit < .32, `命中率 ${hit.toFixed(4)} 出带`);
});

test('软保底：pity 达标后空手被改写为小奖', () => {
  const r = rng(7);
  for (let i = 0; i < 500; i++) {
    const { win } = spin(r, PITY.losses);
    assert.ok(win, 'pity 拉杆必须中奖');
    // 自然中奖（含 cherry1）直接放行；被改写的空手至少 cherry2（rigCherry 构造 樱-樱-x）
  }
});

test('pity 未达标不强制中奖', () => {
  const r = rng(7);
  let losses = 0;
  for (let i = 0; i < 500; i++) if (!spin(r, 0).win) losses++;
  assert.ok(losses > 200, '无 pity 时应有大量空手');
});

test('near-miss：7-7 开局时第三轴停 7 隔壁，不改中奖结果', () => {
  const r = rng(99);
  let seen = 0;
  for (let i = 0; i < 20000 && seen < 10; i++) {
    const { stops, win, nearMiss } = spin(r, 0);
    if (nearMiss) {
      seen++;
      const line = lineOf(stops);
      assert.equal(line[0], 'S');
      assert.equal(line[1], 'S');
      assert.notEqual(line[2], 'S');           // 中行不是 7（没真中）
      assert.equal(win, null);
      const s3 = STRIPS[2], n = s3.length, p = stops[2];
      const windowHasS = s3[(p + 1) % n] === 'S' || s3[(p - 1 + n) % n] === 'S';
      assert.ok(windowHasS, '7 必须在窗口上/下行可见');
    }
  }
  assert.ok(seen >= 10, `20000 拉只见 ${seen} 次 near-miss，疑似失效`);
});

test('spin 确定性：同 seed 同结果序列', () => {
  const a = rng(123), b = rng(123);
  for (let i = 0; i < 200; i++)
    assert.deepEqual(spin(a, i % 8), spin(b, i % 8));
});
