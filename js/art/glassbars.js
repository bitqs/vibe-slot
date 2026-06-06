import { rng } from './util.js';

export const name = '玻璃折射';
export const fade = 1;

export function gen(seed, w, h) {
  const r = rng(seed), blobs = [], bars = [];
  for (let i = 0; i < 5; i++)
    blobs.push({
      x: r() * w, y: r() * h, r: Math.min(w, h) * (.25 + r() * .3),
      c: Math.floor(r() * 4), px: (r() - .5) * 4, py: (r() - .5) * 4,
    });
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++)
    bars.push({ x: (i + .5) / n + (r() - .5) * .06, bw: .05 + r() * .07, sp: .2 + r() * .4, ph: r() * 7 });
  return { blobs, bars, w, h };
}

function backdrop(ctx, t, s, pal, ox) {
  for (const b of s.blobs) {
    const x = b.x + Math.sin(t * .3 + b.px) * 30 + ox;
    const y = b.y + Math.cos(t * .27 + b.py) * 24;
    const g = ctx.createRadialGradient(x, y, 0, x, y, b.r);
    g.addColorStop(0, pal.colors[b.c]);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s.w, s.h);
  }
}

export function draw(ctx, t, s, pal) {
  ctx.globalAlpha = .8;
  backdrop(ctx, t, s, pal, 0);
  for (const b of s.bars) {
    const x = (b.x + Math.sin(t * b.sp + b.ph) * .04) * s.w, bw = b.bw * s.w;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - bw / 2, 0, bw, s.h);
    ctx.clip();
    ctx.globalAlpha = 1;
    backdrop(ctx, t, s, pal, bw * .6);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = .07;
    ctx.fillRect(x - bw / 2, 0, bw, s.h);
    ctx.restore();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = .5;
    ctx.fillRect(x - bw / 2, 0, 1.5, s.h);
    ctx.globalAlpha = .25;
    ctx.fillRect(x + bw / 2 - 1.5, 0, 1.5, s.h);
  }
  ctx.globalAlpha = 1;
}
