import { REELS, MOTIONS, T } from './config.js';
import { PALETTES } from './art/palette.js';
import { ALGOS } from './art/index.js';
import { motionFrame } from './art/util.js';
import { Reel } from './reels.js';
import * as audio from './audio.js';

const cv = document.getElementById('stage');
const ctx = cv.getContext('2d');
const combo = document.getElementById('combo');
const knob = document.getElementById('knob');
const reelEls = [...document.querySelectorAll('.reel')];
const reels = reelEls.map((el, i) => new Reel(el, REELS[i]));

let W, H, state = 'idle';
let scene = null, algo = null, pal = null, motion = null;
let curSeed = 0, t0 = 0;

function resize() {
  const r = cv.parentElement.getBoundingClientRect();
  const dpr = Math.min(2, devicePixelRatio || 1);
  W = r.width; H = r.height;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (state === 'render') {
    scene = algo.gen(curSeed, W, H); // 同 seed 重生成，适配新尺寸
    ctx.fillStyle = pal.bg; ctx.fillRect(0, 0, W, H);
  }
}
addEventListener('resize', resize);
resize();

// ---- 渲染 ----
function renderArt(now) {
  const t = (now - t0) / 1000;
  const f = motionFrame(motion, t);
  ctx.globalAlpha = algo.fade;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(W / 2 + f.dx, H / 2 + f.dy);
  ctx.rotate(f.rot);
  ctx.scale(f.amp, f.amp);
  ctx.translate(-W / 2, -H / 2);
  algo.draw(ctx, f.tt, scene, pal);
  ctx.restore();
  overlays(t);
}

function overlays(t) {
  if (motion.scan) {
    ctx.fillStyle = '#fff'; ctx.globalAlpha = .05;
    ctx.fillRect(0, (t * 110) % (H + 40) - 20, W, 3);
    ctx.fillStyle = '#000'; ctx.globalAlpha = .04;
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  }
  if (motion.grain) {
    ctx.globalAlpha = .06 * motion.grain; ctx.fillStyle = '#fff';
    for (let i = 0; i < 90; i++) ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---- 主循环：常驻 RAF，tick 转轴 + 渲染艺术 ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  reels.forEach((r, i) => {
    const before = Math.floor(r.pos);
    r.tick(dt);
    const cell = Math.floor(r.pos);
    if (cell !== before) {
      // 锁定减速段每格都响（棘轮放慢），匀速段只响首轴每 3 格，避免太密
      if (r.state === 'lock') audio.tick();
      else if (i === 0 && cell % 3 === 0) audio.tick();
    }
  });
  if (state === 'render') renderArt(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- 抽取流程 ----
function startSpin() {
  if (state === 'spin') return;
  state = 'spin';
  cv.classList.remove('on');
  combo.textContent = '';
  audio.padStop();
  const targets = [0, 1, 2].map(() => Math.floor(Math.random() * 8));
  reels.forEach(r => r.spin());
  let locked = 0;
  targets.forEach((tg, i) => setTimeout(() => {
    reels[i].lockTo(tg, () => {
      audio.lock(i);
      reelEls[i].classList.remove('hit');
      void reelEls[i].offsetWidth;
      reelEls[i].classList.add('hit');
      if (++locked === 3) reveal(targets);
    });
  }, T.spinMin + i * T.lockGap));
}

function reveal([p, a, m]) {
  pal = PALETTES[p];
  algo = ALGOS[a];
  motion = MOTIONS[m];
  curSeed = (Math.random() * 0xffffffff) >>> 0;
  scene = algo.gen(curSeed, W, H);
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  t0 = performance.now();
  state = 'render';
  cv.classList.add('on');
  combo.textContent = `${REELS[0][p]} · ${REELS[1][a]} · ${REELS[2][m]}  #${curSeed.toString(16).padStart(8, '0')}`;
  audio.pad(motion, curSeed);
}

// ---- 拉杆：下拉过阈值释放触发，或快速点按 ----
let drag = null;
knob.addEventListener('pointerdown', e => {
  knob.setPointerCapture(e.pointerId);
  drag = { y0: e.clientY, t0: performance.now(), lastNotch: 0, dy: 0 };
  knob.classList.add('held');
  audio.ensure(); // 必须在手势内解锁 AudioContext
});
knob.addEventListener('pointermove', e => {
  if (!drag) return;
  drag.dy = Math.max(0, Math.min(96, e.clientY - drag.y0));
  knob.style.transform = `translateY(${drag.dy}px)`;
  if (drag.dy - drag.lastNotch > 16) {
    audio.ratchet();
    drag.lastNotch = drag.dy;
  }
});
function release() {
  if (!drag) return;
  const { dy, t0: downAt } = drag;
  drag = null;
  knob.classList.remove('held');
  knob.style.transform = '';
  if (dy >= T.leverThreshold || (performance.now() - downAt < 250 && dy < 8)) startSpin();
}
knob.addEventListener('pointerup', release);
knob.addEventListener('pointercancel', () => {
  drag = null;
  knob.classList.remove('held');
  knob.style.transform = '';
});
