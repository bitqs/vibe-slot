import { rng, noise2 } from './util.js';

export const name = '噪声地形';
export const fade = 1;

export function gen(seed, w, h) {
  const r = rng(seed);
  return { ns: Math.floor(r() * 1e9), rows: 18, w, h };
}

export function draw(ctx, t, s, pal) {
  const nz = noise2(s.ns), step = s.w / 80;
  for (let j = 0; j < s.rows; j++) {
    const base = s.h * .25 + (s.h * .7) * (j / s.rows);
    ctx.beginPath();
    ctx.moveTo(0, s.h);
    for (let x = 0; x <= s.w; x += step) {
      const e = nz(x * .004 + t * .06, j * .5) * Math.pow(nz(x * .012, j * .5 + t * .04), 2);
      ctx.lineTo(x, base - e * s.h * .35);
    }
    ctx.lineTo(s.w, s.h);
    ctx.closePath();
    ctx.fillStyle = pal.bg;
    ctx.globalAlpha = 1;
    ctx.fill();
    ctx.strokeStyle = pal.colors[j % 4];
    ctx.globalAlpha = .9;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
