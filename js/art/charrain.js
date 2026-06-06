import { rng } from './util.js';

const GLYPHS = 'アイウエオカキクケコサシスセソ0123456789<>/*+=#@';

export const name = '字符雨';
export const fade = .22;

export function gen(seed, w, h) {
  const r = rng(seed), cw = 18, cols = [];
  for (let i = 0; i < Math.ceil(w / cw); i++)
    cols.push({ x: i * cw + cw / 2, sp: 60 + r() * 180, off: r() * h, c: Math.floor(r() * 4) });
  return { cols, h };
}

export function draw(ctx, t, s, pal) {
  ctx.font = '16px ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (const col of s.cols) {
    const y = (col.off + t * col.sp) % (s.h + 80) - 40;
    for (let k = 0; k < 6; k++) {
      const yy = y - k * 18;
      if (yy < -20) continue;
      const gi = Math.abs(Math.imul((col.x | 0) * 31 + (Math.floor(t * col.sp / 18) - k) * 7, 2654435761)) % GLYPHS.length;
      ctx.fillStyle = k ? pal.colors[col.c] : pal.colors[3];
      ctx.globalAlpha = k ? .7 - k * .1 : 1;
      ctx.fillText(GLYPHS[gi], col.x, yy);
    }
  }
  ctx.globalAlpha = 1;
}
