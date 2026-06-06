// 分享卡：游戏截图 + 真二维码 + 复古海报排版（canvas 合成，无外部依赖）
import { qrMatrix } from './qr.js';

const URL_FULL = 'https://vibe-slot.pages.dev';
const URL_SHOW = 'vibe-slot.pages.dev';

let shareBlob = null;
let built = false;

function drawQR(x, ox, oy, size) {
  const m = qrMatrix(URL_FULL), n = m.length;
  const mod = size / (n + 8);                       // 四周 4 模块静区
  x.fillStyle = '#fff';
  x.fillRect(ox, oy, size, size);
  x.fillStyle = '#1a130c';
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++)
      if (m[r][c]) x.fillRect(ox + (c + 4) * mod, oy + (r + 4) * mod, mod + .5, mod + .5);
}

function roundRect(x, a, b, w, h, r) {
  x.beginPath();
  x.moveTo(a + r, b);
  x.arcTo(a + w, b, a + w, b + h, r);
  x.arcTo(a + w, b + h, a, b + h, r);
  x.arcTo(a, b + h, a, b, r);
  x.arcTo(a, b, a + w, b, r);
  x.closePath();
}

function spaced(x, t, cx, y, ls) {
  const ch = [...t];
  const ws = ch.map(c => x.measureText(c).width);
  let cur = cx - (ws.reduce((a, b) => a + b, 0) + ls * (ch.length - 1)) / 2;
  const ta = x.textAlign;
  x.textAlign = 'left';
  ch.forEach((c, i) => { x.fillText(c, cur, y); cur += ws[i] + ls; });
  x.textAlign = ta;
}

export async function buildShareCard() {
  const cv = document.getElementById('shareCanvas');
  const x = cv.getContext('2d');
  const W = cv.width, H = cv.height;                // 1080×1920

  // 底：暗木渐变 + 暗角
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#3a2517');
  bg.addColorStop(.4, '#241710');
  bg.addColorStop(1, '#140d08');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  const vg = x.createRadialGradient(W / 2, H / 2, H * .2, W / 2, H / 2, H * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,.55)');
  x.fillStyle = vg;
  x.fillRect(0, 0, W, H);

  // 黄铜双线框
  x.strokeStyle = 'rgba(201,162,39,.55)';
  x.lineWidth = 3;
  roundRect(x, 36, 36, W - 72, H - 72, 22);
  x.stroke();
  x.strokeStyle = 'rgba(243,221,142,.25)';
  x.lineWidth = 1;
  roundRect(x, 48, 48, W - 96, H - 96, 16);
  x.stroke();

  x.textAlign = 'center';
  // 版头流金
  const gold = x.createLinearGradient(W / 2 - 280, 0, W / 2 + 280, 0);
  gold.addColorStop(0, '#b08a1e');
  gold.addColorStop(.5, '#fffbe8');
  gold.addColorStop(1, '#b08a1e');
  x.fillStyle = gold;
  x.font = "92px 'Limelight', Georgia, serif";
  x.shadowColor = 'rgba(243,221,142,.5)';
  x.shadowBlur = 28;
  x.fillText('VIBE SLOT', W / 2, 168);
  x.shadowBlur = 0;
  x.fillStyle = '#b89868';
  x.font = "26px 'Cutive Mono', monospace";
  spaced(x, 'EST. 1952 · 一台有手感的老虎机', W / 2, 222, 6);

  // 截图：黄铜圆角框
  const img = new Image();
  img.src = 'assets/shot.jpg';
  await img.decode().catch(() => {});
  const iw = 560, ih = iw * (img.naturalHeight || 800) / (img.naturalWidth || 390);
  const ix = (W - iw) / 2, iy = 268;
  x.save();
  roundRect(x, ix, iy, iw, ih, 20);
  x.clip();
  x.drawImage(img, ix, iy, iw, ih);
  x.restore();
  x.strokeStyle = '#c9a227';
  x.lineWidth = 5;
  roundRect(x, ix - 3, iy - 3, iw + 6, ih + 6, 22);
  x.stroke();

  // 扫码区
  const qy = iy + ih + 56;
  x.fillStyle = '#efe3cb';
  x.font = "34px 'Cutive Mono', monospace";
  spaced(x, '扫 码 来 拉 一 把', W / 2, qy, 6);
  const qs = 270;
  x.save();
  roundRect(x, (W - qs) / 2, qy + 28, qs, qs, 14);
  x.clip();
  drawQR(x, (W - qs) / 2, qy + 28, qs);
  x.restore();
  x.fillStyle = '#8a7148';
  x.font = "26px 'Cutive Mono', monospace";
  spaced(x, URL_SHOW, W / 2, qy + qs + 84, 5);

  built = true;
  shareBlob = null;
  cv.toBlob(b => { shareBlob = b; }, 'image/png');  // 提前缓存：保存点击留在手势栈内（iOS）
}

export async function openShare() {
  const ov = document.getElementById('share');
  ov.classList.add('show');
  if (!built) await buildShareCard();
}

export function closeShare() {
  document.getElementById('share').classList.remove('show');
}

export async function saveShareImage() {
  if (shareBlob && navigator.canShare) {
    const file = new File([shareBlob], 'vibe-slot.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const url = shareBlob ? URL.createObjectURL(shareBlob)
    : document.getElementById('shareCanvas').toDataURL('image/png');
  const a = document.createElement('a');
  a.download = 'vibe-slot.png';
  a.href = url;
  a.click();
  if (shareBlob) setTimeout(() => URL.revokeObjectURL(url), 2000);
}
