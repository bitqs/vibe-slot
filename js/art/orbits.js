import { rng } from './util.js';

export const name = '轨道环';
export const fade = .15;

export function gen(seed, w, h) {
  const r = rng(seed), rings = [];
  const n = 5 + Math.floor(r() * 4), R = Math.min(w, h) * .44;
  for (let i = 0; i < n; i++) {
    const rad = R * (.15 + .85 * (i / (n - 1))) * (.9 + r() * .2);
    rings.push({
      rad, sp: (r() - .5) * 1.6, ph: r() * 7,
      dots: 1 + Math.floor(r() * 3), c: Math.floor(r() * 4), tilt: .5 + r() * .5,
    });
  }
  return { rings, cx: w / 2, cy: h / 2 };
}

export function draw(ctx, t, s, pal) {
  for (const g of s.rings) {
    ctx.strokeStyle = pal.colors[g.c];
    ctx.globalAlpha = .18;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(s.cx, s.cy, g.rad, g.rad * g.tilt, 0, 0, 7);
    ctx.stroke();
    for (let i = 0; i < g.dots; i++) {
      const a = g.ph + t * g.sp + i * Math.PI * 2 / g.dots;
      ctx.fillStyle = pal.colors[g.c];
      ctx.globalAlpha = .95;
      ctx.beginPath();
      ctx.arc(s.cx + Math.cos(a) * g.rad, s.cy + Math.sin(a) * g.rad * g.tilt, 3, 0, 7);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
