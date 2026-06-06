// 机械系全合成零素材。AudioContext 必须在用户手势内 ensure()（iOS 限制）
let ac, master, whirrNode = null;

export function ensure() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = .55;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

function env(g, t0, a, d, peak) {
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(.001, t0 + a + d);
}

function blip(freq, dur, type, vol, when = 0) {
  if (!ac) return;
  const t = ac.currentTime + when;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(master);
  env(g, t, .004, dur, vol);
  o.start(t);
  o.stop(t + dur + .05);
}

// 短噪声打击（机械撞击的"沙"质感）
function thud(cutoff, dur, vol, when = 0) {
  if (!ac) return;
  const t = ac.currentTime + when;
  const len = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

// 投币：双层金属脆响
export function coin() {
  blip(2520, .07, 'triangle', .22);
  blip(3360, .05, 'sine', .14, .03);
  thud(4000, .03, .1);
}

// 拉杆棘轮齿
export function ratchet() {
  blip(820 + Math.random() * 160, .025, 'square', .09);
  thud(2600, .02, .08);
}

// 释放回弹：弹簧 + 闷击
export function springRelease() {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(180, t + .16);
  o.connect(g); g.connect(master);
  env(g, t, .004, .18, .2);
  o.start(t); o.stop(t + .25);
  thud(900, .08, .3, .1);
}

// 转轴运转底噪（循环滤波噪声）
export function whirrStart() {
  if (!ac || whirrNode) return;
  const len = ac.sampleRate;
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 480;
  f.Q.value = 1.2;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, ac.currentTime);
  g.gain.linearRampToValueAtTime(.06, ac.currentTime + .2);
  src.connect(f); f.connect(g); g.connect(master);
  src.start();
  whirrNode = { src, g };
}
export function whirrStop() {
  if (!whirrNode) return;
  const { src, g } = whirrNode;
  whirrNode = null;
  g.gain.linearRampToValueAtTime(0, ac.currentTime + .25);
  setTimeout(() => { try { src.stop(); } catch {} }, 400);
}

// 转轴过格哒声（锁定减速段自然变疏）
export function tick() {
  blip(640, .02, 'square', .05);
}

// 轴锁定：沉闷机械顿挫
export function clunk(i) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120 - i * 12, t);
  o.frequency.exponentialRampToValueAtTime(55, t + .1);
  o.connect(g); g.connect(master);
  env(g, t, .004, .16, .55);
  o.start(t); o.stop(t + .22);
  thud(1400, .05, .35);
}

// 中奖铃：真老虎机的钟铃，档位越高敲越多
export function winBells(times) {
  for (let i = 0; i < times; i++) {
    blip(1865, .25, 'sine', .22, i * .14);
    blip(2793, .18, 'sine', .1, i * .14);
    thud(6000, .02, .08, i * .14);
  }
}

// 金币入盘瀑布
export function coinsCascade(n) {
  for (let i = 0; i < n; i++) {
    const w = i * .07 + Math.random() * .03;
    blip(2200 + Math.random() * 900, .06, 'triangle', .13, w);
    thud(5000, .02, .07, w);
  }
}

// JACKPOT：钟声轰炸 + 低频轰鸣
export function jackpotFanfare() {
  if (!ac) return;
  for (let i = 0; i < 14; i++) {
    blip(1865, .3, 'sine', .2, i * .12);
    blip(2793, .22, 'sine', .1, i * .12 + .04);
  }
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(72, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 1.6);
  o.connect(g); g.connect(master);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.4, t + .08);
  g.gain.exponentialRampToValueAtTime(.001, t + 1.8);
  o.start(t); o.stop(t + 2);
}
