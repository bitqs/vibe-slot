import { rng } from './util.js';

export const name = '分形枝';
export const fade = 1;

export function gen(seed, w, h) {
  const r = rng(seed), segs = [];
  const grow = (x, y, a, len, d) => {
    if (d > 8 || len < 6 || segs.length > 1500) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    segs.push({ x, y, x2, y2, d });
    const k = 2 + (r() < .3 ? 1 : 0);
    for (let i = 0; i < k; i++)
      grow(x2, y2, a + (r() - .5) * 1.1, len * (.66 + r() * .14), d + 1);
  };
  grow(w / 2, h, -Math.PI / 2, h * .22, 0);
  return { segs };
}

export function draw(ctx, t, s, pal) {
  for (const g of s.segs) {
    const sway = Math.sin(t * .8 + g.d * .7) * g.d * 1.2;
    ctx.strokeStyle = pal.colors[g.d % 4];
    ctx.lineWidth = Math.max(.6, 5 - g.d * .6);
    ctx.globalAlpha = Math.max(.15, .9 - g.d * .07);
    ctx.beginPath();
    ctx.moveTo(g.x + (g.d ? sway * .5 : 0), g.y);
    ctx.lineTo(g.x2 + sway, g.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
