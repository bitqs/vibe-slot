import { rng, noise2 } from './util.js';

export const name = '网格波';
export const fade = 1;

export function gen(seed, w, h) {
  const r = rng(seed);
  return { ns: Math.floor(r() * 1e9), rows: 14 + Math.floor(r() * 8), cols: 26, amp: h * (.05 + r() * .06), w, h };
}

export function draw(ctx, t, s, pal) {
  const nz = noise2(s.ns), gx = s.w / (s.cols - 1), gy = s.h / (s.rows + 1);
  ctx.lineWidth = 1.4;
  for (let j = 0; j < s.rows; j++) {
    ctx.strokeStyle = pal.colors[j % 4];
    ctx.globalAlpha = .8;
    ctx.beginPath();
    for (let i = 0; i < s.cols; i++) {
      const y = gy * (j + 1) + Math.sin(i * .5 + t + j * .4) * s.amp * .4
        + (nz(i * .3, j * .3 + t * .15) - .5) * s.amp * 2;
      i ? ctx.lineTo(i * gx, y) : ctx.moveTo(0, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
