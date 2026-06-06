import { rng } from './util.js';

export const name = '粒子星云';
export const fade = .12;

export function gen(seed, w, h) {
  const r = rng(seed), pts = [];
  for (let i = 0; i < 500; i++) {
    const rad = Math.pow(r(), .7) * Math.min(w, h) * .42;
    pts.push({
      rad, a: r() * Math.PI * 2,
      sp: (.2 + r() * .6) / (.3 + rad * .01),
      sz: .6 + r() * 1.8, c: Math.floor(r() * 4), e: .4 + r() * .5,
    });
  }
  return { pts, cx: w / 2, cy: h / 2 };
}

export function draw(ctx, t, s, pal) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of s.pts) {
    const a = p.a + t * p.sp;
    ctx.fillStyle = pal.colors[p.c];
    ctx.globalAlpha = .5;
    ctx.beginPath();
    ctx.arc(s.cx + Math.cos(a) * p.rad, s.cy + Math.sin(a) * p.rad * p.e, p.sz, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
