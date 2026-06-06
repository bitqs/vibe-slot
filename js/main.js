import { STRIPS, PAYTABLE, ECON, T, MOTIONS } from './config.js';
import { SYM_SVG } from './symbols.js';
import { PALETTES } from './art/palette.js';
import { ALGOS } from './art/index.js';
import { motionFrame } from './art/util.js';
import { spin as slotSpin, lineOf, judge } from './slots.js';
import { Reel } from './reels.js';
import * as audio from './audio.js';

const $ = id => document.getElementById(id);
const reelEls = [...document.querySelectorAll('.reel')];
const reels = reelEls.map((el, i) => new Reel(el, STRIPS[i]));

// ---- 存档（容错：私密模式不崩） ----
let save = { coins: ECON.start, debt: 0, pity: 0 };
try {
  const s = JSON.parse(localStorage.getItem('vibeslot') || 'null');
  if (s && typeof s.coins === 'number') save = { coins: s.coins, debt: s.debt || 0, pity: s.pity || 0 };
} catch {}
function persist() { try { localStorage.setItem('vibeslot', JSON.stringify(save)); } catch {} }

// ---- 赔率表 ----
for (const p of PAYTABLE) {
  const row = document.createElement('div');
  row.className = 'pt-row' + (p.id === 'jackpot' ? ' gold' : '');
  row.dataset.id = p.id;
  const syms = p.match.map(m => m ? SYM_SVG[m] : '<span style="width:17px;text-align:center;opacity:.4">·</span>').join('');
  row.innerHTML = `<span class="pt-syms">${syms}</span><span class="pt-pay">${p.pay}</span>`;
  $('paytable').appendChild(row);
}

// ---- 灯泡 ----
const BULBN = 11;
for (let i = 0; i < BULBN; i++) {
  const b = document.createElement('div');
  b.className = 'bulb';
  $('bulbs').appendChild(b);
}
const bulbs = [...document.querySelectorAll('.bulb')];
let bulbMode = 'idle', bulbStep = 0;
setInterval(() => {
  bulbStep++;
  if (bulbMode === 'idle')
    bulbs.forEach((b, i) => b.classList.toggle('on', (i + bulbStep) % 4 === 0));
  else if (bulbMode === 'flash')
    bulbs.forEach(b => b.classList.toggle('on', bulbStep % 2 === 0));
  else if (bulbMode === 'chase')
    bulbs.forEach((b, i) => b.classList.toggle('on', (i + bulbStep * 2) % 3 !== 0));
}, 200);
function bulbsFlash(mode, ms) {
  bulbMode = mode;
  if (ms) setTimeout(() => { bulbMode = 'idle'; }, ms);
}

// ---- 余额/欠账 ----
let shownBalance = save.coins;
function renderBalance() {
  $('balance').textContent = Math.round(shownBalance);
  $('debt').textContent = save.debt ? `欠柜台 ${save.debt}` : '';
}
function countTo(target) {
  const from = shownBalance, t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 550);
    shownBalance = from + (target - from) * (1 - Math.pow(1 - k, 3));
    renderBalance();
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
renderBalance();

// ---- 提示条 ----
let toastTimer = 0;
function toast(text, ms = 2400) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), ms);
}

// ---- 金币掉托盘 ----
function dropCoins(n) {
  const box = $('tray-coins');
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'coin';
      c.style.left = 8 + Math.random() * (box.parentElement.clientWidth - 40) + 'px';
      c.style.bottom = 2 + Math.random() * 18 + 'px';
      box.appendChild(c);
      while (box.children.length > 42) box.firstChild.remove();
    }, i * 70);
  }
}

// ---- 主循环：tick 转轴 + 过格哒声 ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  for (const r of reels) {
    const before = Math.floor(r.pos);
    r.tick(dt);
    const cell = Math.floor(r.pos);
    if (cell !== before && (r.state === 'lock' || cell % 3 === 0)) audio.tick();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- 抽取流程 ----
let state = 'idle';

function startSpin(forcedStops) {
  if (state === 'spin') return;

  if (save.coins < ECON.bet) {
    save.coins += ECON.loan;
    save.debt += ECON.loan;
    persist();
    countTo(save.coins);
    toast(`老板娘叹了口气，又赊给你 ${ECON.loan} 个币`);
    audio.coinsCascade(6);
  }

  state = 'spin';
  save.coins -= ECON.bet;
  persist();
  countTo(save.coins);
  audio.coin();
  document.querySelectorAll('.pt-row.lit').forEach(r => r.classList.remove('lit'));

  const result = forcedStops
    ? { stops: forcedStops, win: judge(lineOf(forcedStops)), nearMiss: false }
    : slotSpin(Math.random, save.pity);
  const line = lineOf(result.stops);
  // 7-7 开局：第三轴吊胃口
  const drama = line[0] === 'S' && line[1] === 'S';

  setTimeout(() => audio.whirrStart(), 60);
  reels.forEach(r => r.spin());

  let locked = 0;
  result.stops.forEach((stop, i) => {
    const extra = (i === 2 && drama) ? 750 : 0;
    setTimeout(() => {
      reels[i].lockTo(stop, () => {
        audio.clunk(i);
        reelEls[i].classList.remove('hit');
        void reelEls[i].offsetWidth;
        reelEls[i].classList.add('hit');
        if (++locked === 3) {
          audio.whirrStop();
          settle(result);
        }
      }, (i === 2 && drama) ? 9 : 4);
    }, T.spinMin + i * T.lockGap + extra);
  });
}

function settle({ win, nearMiss }) {
  state = 'idle';
  if (!win) {
    save.pity++;
    persist();
    if (nearMiss) toast('差一个 7 ……', 1600);
    return;
  }
  save.pity = 0;
  save.coins += win.pay;
  persist();

  const tier = PAYTABLE.findIndex(p => p.id === win.id); // 0=jackpot
  const row = document.querySelector(`.pt-row[data-id="${win.id}"]`);
  if (row) {
    row.classList.add('lit');
    setTimeout(() => row.classList.remove('lit'), 2600);
  }

  if (win.id === 'jackpot') { jackpot(win); return; }

  audio.winBells(Math.max(2, 7 - tier));
  audio.coinsCascade(Math.min(18, Math.ceil(win.pay / 10)));
  dropCoins(Math.min(24, Math.max(3, Math.round(win.pay / 8))));
  bulbsFlash(tier <= 2 ? 'chase' : 'flash', tier <= 2 ? 2600 : 1500);
  $('winpop').textContent = `+${win.pay}`;
  $('winpop').classList.remove('show');
  void $('winpop').offsetWidth;
  $('winpop').classList.add('show');
  countTo(save.coins);
}

// ---- JACKPOT 头奖海报（复用 v1 生成艺术） ----
let posterRaf = 0;
function jackpot(win) {
  audio.jackpotFanfare();
  bulbsFlash('chase', 0);
  const jp = $('jackpot');
  jp.hidden = false;
  $('jp-amount').textContent = `+${win.pay}`;

  const cv = $('poster'), ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const pal = PALETTES[Math.floor(Math.random() * 8)];
  const algo = ALGOS[Math.floor(Math.random() * 8)];
  const motion = MOTIONS[Math.floor(Math.random() * 8)];
  const scene = algo.gen((Math.random() * 0xffffffff) >>> 0, W, H);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  const t0 = performance.now();
  const frame = now => {
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
    posterRaf = requestAnimationFrame(frame);
  };
  posterRaf = requestAnimationFrame(frame);

  countTo(save.coins);
  const dismiss = () => {
    jp.hidden = true;
    cancelAnimationFrame(posterRaf);
    bulbMode = 'idle';
    jp.removeEventListener('pointerdown', dismiss);
    dropCoins(26);
    audio.coinsCascade(18);
  };
  setTimeout(() => jp.addEventListener('pointerdown', dismiss), 1200);
}

// ---- 拉杆 ----
const lever = $('lever'), arm = $('arm');
const MAXPULL = 120, MAXANG = 52;
let drag = null;

lever.addEventListener('pointerdown', e => {
  try { lever.setPointerCapture(e.pointerId); } catch {}
  drag = { y0: e.clientY, t0: performance.now(), notch: 0, dy: 0 };
  lever.classList.add('held');
  arm.classList.remove('snap');
  audio.ensure();
});
lever.addEventListener('pointermove', e => {
  if (!drag) return;
  drag.dy = Math.max(0, Math.min(MAXPULL, e.clientY - drag.y0));
  arm.style.setProperty('--pull', (drag.dy / MAXPULL * MAXANG).toFixed(1));
  if (drag.dy - drag.notch > 15) {
    audio.ratchet();
    drag.notch = drag.dy;
  }
});
function release() {
  if (!drag) return;
  const { dy, t0 } = drag;
  drag = null;
  lever.classList.remove('held');
  const fire = dy >= T.leverThreshold || (performance.now() - t0 < 250 && dy < 8);
  if (fire && state !== 'spin') {
    // 点按也给完整拉杆动画
    if (dy < 8) {
      arm.style.setProperty('--pull', MAXANG);
      setTimeout(() => { arm.classList.add('snap'); arm.style.setProperty('--pull', 0); }, 130);
    } else {
      arm.classList.add('snap');
      arm.style.setProperty('--pull', 0);
    }
    audio.springRelease();
    startSpin();
  } else {
    arm.classList.add('snap');
    arm.style.setProperty('--pull', 0);
  }
}
lever.addEventListener('pointerup', release);
lever.addEventListener('pointercancel', () => {
  drag = null;
  lever.classList.remove('held');
  arm.classList.add('snap');
  arm.style.setProperty('--pull', 0);
});

// ---- 调试钩子 ----
if (location.search.includes('debug')) {
  window.VS = {
    save,
    jackpot: () => startSpin(STRIPS.map(s => s.indexOf('S'))),
    win: id => {
      const p = PAYTABLE.find(q => q.id === id);
      startSpin(p.match.map((m, i) => STRIPS[i].indexOf(m || (i === 1 ? 'M' : 'L'))));
    },
  };
}
