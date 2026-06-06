// 老虎机纯逻辑：停位 → 中线判定 → 赔付。注入 rng，node 可测。
import { STRIPS, PAYTABLE, PITY } from './config.js';

export function lineOf(stops) {
  return stops.map((st, i) => STRIPS[i][st]);
}

// 中线判定：PAYTABLE 从高到低，首个匹配生效；null = 任意
export function judge(line) {
  for (const p of PAYTABLE)
    if (p.match.every((m, i) => m === null || line[i] === m)) return p;
  return null;
}

function pickSym(strip, sym, rng) {
  const idx = strip.flatMap((s, i) => (s === sym ? [i] : []));
  return idx[Math.floor(rng() * idx.length)];
}

// 软保底：构造 樱-樱-随机 停位（至少 cherry2=3×，偶尔自然升 cherry3）
function rigCherry(rng) {
  return [
    pickSym(STRIPS[0], 'C', rng),
    pickSym(STRIPS[1], 'C', rng),
    Math.floor(rng() * STRIPS[2].length),
  ];
}

// near-miss：第三轴改停在某个 7 的相邻格（中行非 7，但 7 在窗口上/下行可见）
function adjacentToSeven(strip, rng) {
  const n = strip.length, adj = [];
  strip.forEach((s, i) => {
    if (s === 'S') adj.push((i + 1) % n, (i - 1 + n) % n);
  });
  const ok = adj.filter(i => strip[i] !== 'S');
  return ok[Math.floor(rng() * ok.length)];
}

// 一次拉杆。pityCount = 当前连续空手次数。
// 返回 { stops, win, nearMiss }；win = PAYTABLE 行或 null。
export function spin(rng, pityCount = 0) {
  let stops = STRIPS.map(strip => Math.floor(rng() * strip.length));
  let win = judge(lineOf(stops));

  if (!win && pityCount >= PITY.losses) {
    stops = rigCherry(rng);
    win = judge(lineOf(stops));
  }

  let nearMiss = false;
  if (!win) {
    const line = lineOf(stops);
    // 7-7-x 必然不中（x≠7 时樱桃规则也不匹配），只改停位可见性，不改概率
    if (line[0] === 'S' && line[1] === 'S') {
      stops = [stops[0], stops[1], adjacentToSeven(STRIPS[2], rng)];
      nearMiss = true;
    }
  }

  return { stops, win, nearMiss };
}
