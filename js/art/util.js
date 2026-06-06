// mulberry32 — 种子 PRNG，gen() 确定性的根基
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function h2(seed, x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

// 哈希格点值噪声 — 无查找表，闭包零状态
export function noise2(seed) {
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
    const a = h2(seed, x0, y0), b = h2(seed, x0 + 1, y0);
    const c = h2(seed, x0, y0 + 1), d = h2(seed, x0 + 1, y0 + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

// 运动维度 → 每帧全局变换参数（算法只拿 tt，不感知运动）
export function motionFrame(m, t) {
  const tt = t * m.speed;
  let amp = 1;
  if (m.breath) amp += m.breath * .06 * Math.sin(t * .7);
  if (m.pulse) {
    const ph = (t * 1.1) % 1;
    amp += m.pulse * .12 * (Math.pow(Math.max(0, 1 - ph * 4), 2)
      + .5 * Math.pow(Math.max(0, 1 - (ph - .25) * 4), 2));
  }
  return {
    tt, amp,
    dx: m.drift ? Math.sin(t * .23) * 26 * m.drift : 0,
    dy: m.drift ? Math.cos(t * .19) * 18 * m.drift : 0,
    rot: m.swirl ? t * .15 * m.swirl : 0,
  };
}
