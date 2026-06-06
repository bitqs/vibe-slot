import { rng, noise2 } from './util.js';

export const name = '流场';
export const fade = .08;

export function gen(seed, w, h) {
  const r = rng(seed), n = 300 + Math.floor(r() * 300);
  const pts = [];
  for (let i = 0; i < n; i++)
    pts.push({ x: r() * w, y: r() * h, c: Math.floor(r() * 4), v: .5 + r() });
  return { pts, ns: Math.floor(r() * 1e9), sc: .002 + r() * .003, w, h };
}

export function draw(ctx, t, s, pal) {
  const nz = noise2(s.ns);
  ctx.lineWidth = 1.2;
  for (const p of s.pts) {
    const a = nz(p.x * s.sc, p.y * s.sc + t * .05) * Math.PI * 4;
    const nx = p.x + Math.cos(a) * p.v * 1.6, ny = p.y + Math.sin(a) * p.v * 1.6;
    ctx.strokeStyle = pal.colors[p.c];
    ctx.globalAlpha = .5;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
    p.x = nx; p.y = ny;
    if (p.x < 0 || p.x > s.w || p.y < 0 || p.y > s.h) {
      p.x = (p.x + s.w) % s.w; p.y = (p.y + s.h) % s.h;
    }
  }
  ctx.globalAlpha = 1;
}
