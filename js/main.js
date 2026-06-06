import { STRIPS, PAYTABLE, ECON, T, MOTIONS } from './config.js';
import { SYM_SVG } from './symbols.js';
import { PALETTES } from './art/palette.js';
import { ALGOS } from './art/index.js';
import { motionFrame } from './art/util.js';
import { spin as slotSpin, lineOf, judge } from './slots.js';
import { Reel } from './reels.js';
import * as audio from './audio.js';
import { openShare, closeShare, saveShareImage } from './share.js';

const $ = id => document.getElementById(id);
const reelEls = [...document.querySelectorAll('.reel')];
const reels = reelEls.map((el, i) => new Reel(el, STRIPS[i]));

// ---- 存档（容错：私密模式不崩） ----
let save = { coins: ECON.start, debt: 0, pity: 0, pulls: 0 };
try {
  const s = JSON.parse(localStorage.getItem('vibeslot') || 'null');
  if (s && typeof s.coins === 'number') save = { coins: s.coins, debt: s.debt || 0, pity: s.pity || 0, pulls: s.pulls || 0 };
} catch {}
function persist() { try { localStorage.setItem('vibeslot', JSON.stringify(save)); } catch {} }

// ---- 赔率表 ----
for (const p of PAYTABLE) {
  const row = document.createElement('div');
  row.className = 'pt-row' + (p.id === 'jackpot' ? ' gold banner' : '');
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

function startSpin(forcedStops, boost = 0) {
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
  save.pulls++;
  persist();
  countTo(save.coins);
  audio.coin();
  document.querySelectorAll('.pt-row.lit').forEach(r => r.classList.remove('lit'));

  // 新手钩子：第 2 拉必中铃铛×3（首因效应——开局就尝到大的）
  if (!forcedStops && save.pulls === 2) forcedStops = STRIPS.map(s => s.indexOf('B'));

  const result = forcedStops
    ? { stops: forcedStops, win: judge(lineOf(forcedStops)), nearMiss: false }
    : slotSpin(Math.random, save.pity);
  const line = lineOf(result.stops);
  // 7-7 开局：第三轴吊胃口
  const drama = line[0] === 'S' && line[1] === 'S';

  setTimeout(() => audio.whirrStart(), 60);
  $('reelbox').classList.add('lit');
  reels.forEach(r => r.spin(boost));

  let locked = 0;
  result.stops.forEach((stop, i) => {
    const extra = (i === 2 && drama) ? 750 : 0;
    setTimeout(() => {
      reels[i].lockTo(stop, () => {
        audio.clunk(i);
        reelEls[i].classList.remove('hit');
        void reelEls[i].offsetWidth;
        reelEls[i].classList.add('hit');
        const m = $('machine');
        m.classList.remove('bump');
        void m.offsetWidth;
        m.classList.add('bump');
        if (++locked === 3) {
          audio.whirrStop();
          $('reelbox').classList.remove('lit');
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

  const big = tier <= 2; // bar3/bell3 以上算大奖
  audio.winBells(big ? 10 : Math.max(2, 7 - tier));
  audio.coinsCascade(Math.min(18, Math.ceil(win.pay / 10)));
  dropCoins(Math.min(24, Math.max(3, Math.round(win.pay / 8))));
  bulbsFlash(big ? 'chase' : 'flash', big ? 3400 : 1500);
  winFx(win, big);
  if (big) bigWin(win);
  $('winpop').textContent = `+${win.pay}`;
  $('winpop').classList.remove('show');
  void $('winpop').offsetWidth;
  $('winpop').classList.add('show');
  countTo(save.coins);
}

// ---- BIG WIN 砸屏：流金大字 slam + 金额滚动 + 二段金币瀑布 ----
function bigWin(win) {
  const bw = $('bigwin'), amt = bw.querySelector('.bw-amount');
  bw.classList.remove('show', 'out');
  void bw.offsetWidth;
  bw.classList.add('show');
  // 金额从 0 滚到 pay
  const t0 = performance.now();
  const roll = now => {
    const k = Math.min(1, (now - t0) / 900);
    amt.textContent = `+${Math.round(win.pay * (1 - Math.pow(1 - k, 3)))}`;
    if (k < 1) requestAnimationFrame(roll);
  };
  requestAnimationFrame(roll);
  // 二段庆祝：0.9s 后再来一轮金币瀑布 + 飞币
  setTimeout(() => {
    audio.coinsCascade(14);
    dropCoins(14);
  }, 900);
  setTimeout(() => bw.classList.add('out'), 2300);
  setTimeout(() => bw.classList.remove('show', 'out'), 2900);
}

// ---- 中奖视觉爆点：payline 爆闪 + 符号弹跳 + 光芒轮 + 屏闪 + 抛物线金币 + 机柜光环 ----
function winFx(win, big) {
  const pl = $('payline');
  pl.classList.remove('flash');
  void pl.offsetWidth;
  pl.classList.add('flash');
  setTimeout(() => pl.classList.remove('flash'), 1800);

  // 中线符号弹跳（只点亮参与中奖的轴：樱桃按左起连数）
  const litReels = win.id === 'cherry1' ? 1 : win.id === 'cherry2' ? 2 : 3;
  document.querySelectorAll('.cell.pop').forEach(c => c.classList.remove('pop'));
  for (let i = 0; i < litReels; i++) reels[i].midCell()?.classList.add('pop');
  setTimeout(() => document.querySelectorAll('.cell.pop').forEach(c => c.classList.remove('pop')), 1700);

  const rays = $('rays');
  rays.classList.remove('on');
  void rays.offsetWidth;
  rays.classList.add('on');

  const fl = $('flash');
  fl.classList.remove('go', 'big');
  void fl.offsetWidth;
  fl.classList.add('go');
  if (big) fl.classList.add('big');

  document.body.classList.add(big ? 'win-big' : 'win-sm');
  setTimeout(() => document.body.classList.remove('win-sm', 'win-big'), big ? 2600 : 1400);

  // 抛物线金币：从转轴窗飞向托盘
  const rb = $('reelbox').getBoundingClientRect();
  const tr = $('tray').getBoundingClientRect();
  const n = Math.min(16, Math.max(4, Math.round(win.pay / 12)));
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'flycoin';
      c.style.left = rb.left + rb.width * (0.3 + Math.random() * 0.4) + 'px';
      c.style.top = rb.top + rb.height * 0.5 + 'px';
      c.style.setProperty('--dx', (Math.random() - .5) * 180 + 'px');
      c.style.setProperty('--dy', tr.top + 20 - (rb.top + rb.height * 0.5) + Math.random() * 24 + 'px');
      document.body.appendChild(c);
      c.addEventListener('animationend', () => c.remove());
    }, i * 55);
  }
}

// ---- JACKPOT 头奖海报（复用 v1 生成艺术） ----
let posterRaf = 0;
function jackpot(win) {
  audio.jackpotFanfare();
  bulbsFlash('chase', 0);
  const fl = $('flash');
  fl.classList.remove('go', 'big');
  void fl.offsetWidth;
  fl.classList.add('go', 'big');
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

// ---- 拉杆（核心交互：阻力曲线 + 咬合点 + 阻尼弹簧回摆 + 猛拉奖励） ----
const lever = $('lever'), arm = $('arm');
const MAXPULL = 130;       // 手指行程 px
const MAXANG = 54;         // 杆臂最大角
const COMMIT = .78;        // 咬合点：过此深度松手必触发
let drag = null, springRaf = 0, lastActivity = performance.now();

// 弹簧阻力：初段灵敏，末段渐重（同样指距换来的角度越来越少）
const pullCurve = p => 1 - Math.pow(1 - p, 1.7);
const setAng = a => arm.style.setProperty('--pull', a.toFixed(2));

// 松手阻尼弹簧：过冲反向再衰减稳住（拟真金属杆回摆）
function springBack(fromAng) {
  cancelAnimationFrame(springRaf);
  const t0 = performance.now();
  const step = now => {
    const t = (now - t0) / 1000;
    const ang = fromAng * Math.exp(-7.5 * t) * Math.cos(15 * t);
    setAng(Math.max(-7, ang));
    if (t < .6) springRaf = requestAnimationFrame(step);
    else setAng(0);
  };
  springRaf = requestAnimationFrame(step);
}

function fireLever(boost) {
  audio.springRelease();
  startSpin(undefined, boost);
}

lever.addEventListener('pointerdown', e => {
  try { lever.setPointerCapture(e.pointerId); } catch {}
  cancelAnimationFrame(springRaf);
  drag = { y0: e.clientY, t0: performance.now(), notch: 0, dy: 0, committed: false, vy: 0, lastY: e.clientY, lastT: performance.now() };
  lever.classList.add('held');
  audio.ensure();
  lastActivity = performance.now();
});

lever.addEventListener('pointermove', e => {
  if (!drag) return;
  const now = performance.now();
  // 测速（指数平滑）：松手时的拉速 = 猛拉奖励
  const dt = Math.max(1, now - drag.lastT);
  drag.vy = .7 * drag.vy + .3 * ((e.clientY - drag.lastY) / dt * 1000);
  drag.lastY = e.clientY; drag.lastT = now;

  drag.dy = Math.max(0, Math.min(MAXPULL, e.clientY - drag.y0));
  const p = drag.dy / MAXPULL;
  // 咬合点：跨过瞬间机构"咬住"——重击声 + 2° 滑落卡位
  if (!drag.committed && p >= COMMIT) {
    drag.committed = true;
    audio.commitClick();
  }
  setAng(MAXANG * pullCurve(p) + (drag.committed ? 2 : 0));
  if (drag.dy - drag.notch > 14) {
    audio.ratchet(p);
    drag.notch = drag.dy;
  }
});

function release() {
  if (!drag) return;
  const { dy, t0, committed, vy } = drag;
  drag = null;
  lever.classList.remove('held');
  lastActivity = performance.now();
  const p = dy / MAXPULL;
  const tap = performance.now() - t0 < 250 && dy < 8;
  const curAng = MAXANG * pullCurve(p) + (committed ? 2 : 0);

  if (tap && state !== 'spin') {
    // 点按：快速代拉一整程（120ms 下压 → 弹簧回摆）
    const t1 = performance.now();
    const down = now => {
      const k = Math.min(1, (now - t1) / 120);
      setAng(MAXANG * k);
      if (k < 1) { springRaf = requestAnimationFrame(down); return; }
      audio.commitClick();
      springBack(MAXANG);
      fireLever(2);
    };
    cancelAnimationFrame(springRaf);
    springRaf = requestAnimationFrame(down);
    return;
  }

  springBack(curAng);
  if (committed && state !== 'spin') {
    // 猛拉奖励：松手速度 → 转轴初速（300px/s 起步，每 200px/s +1 格/秒，封顶 6）
    const boost = Math.max(0, Math.min(6, (vy - 300) / 200));
    fireLever(boost);
  }
}
lever.addEventListener('pointerup', release);
lever.addEventListener('pointercancel', () => {
  if (!drag) return;
  const ang = MAXANG * pullCurve(drag.dy / MAXPULL);
  drag = null;
  lever.classList.remove('held');
  springBack(ang);
});

// 待机邀请：闲置 14s 杆子自己轻轻晃一下（勾你来拉）
setInterval(() => {
  if (drag || state === 'spin') return;
  if (performance.now() - lastActivity > 14000) {
    springBack(7);
    lastActivity = performance.now();
  }
}, 4000);

// ---- 分享 ----
$('sharebtn').addEventListener('click', () => { audio.ensure(); openShare(); });
$('shClose').addEventListener('click', closeShare);
$('shSave').addEventListener('click', saveShareImage);

// ---- Loading：字体 + 音频预取，灯泡进度，揭幕开玩 ----
(function boot() {
  const loader = $('loader');
  const LDN = 9;
  for (let i = 0; i < LDN; i++) {
    const b = document.createElement('div');
    b.className = 'bulb';
    $('ld-bulbs').appendChild(b);
  }
  const ldBulbs = [...document.querySelectorAll('#ld-bulbs .bulb')];
  // 进度单位：音频 8 件 + 字体 1 件 = 9
  const TOTAL = 9;
  let doneUnits = 0;
  const bump = () => {
    doneUnits++;
    const lit = Math.round(doneUnits / TOTAL * LDN);
    ldBulbs.forEach((b, i) => b.classList.toggle('on', i < lit));
  };

  const t0 = performance.now();
  const tasks = [
    audio.prefetch(bump),
    (document.fonts?.ready || Promise.resolve()).then(bump),
  ];
  const timeout = new Promise(r => setTimeout(r, 8000)); // 兜底：慢网 8s 强行开玩（音频走合成回退）

  Promise.race([Promise.all(tasks), timeout]).then(() => {
    // 至少亮 600ms，别闪一下就没
    const wait = Math.max(0, 600 - (performance.now() - t0));
    setTimeout(() => {
      ldBulbs.forEach(b => b.classList.add('on'));
      loader.classList.add('done');
      $('machine').classList.remove('preload');
      $('lever').classList.remove('preload');
      setTimeout(() => loader.remove(), 700);
    }, wait);
  });
})();

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
