// 双层音频：audio/sfx/*.mp3（ElevenLabs 素材）优先，缺文件回退 Web Audio 合成。
// AudioContext 必须在用户手势内 ensure()（iOS 限制）。
let ac, master, whirrNode = null, bgmNode = null;
const bufs = {};            // name → AudioBuffer（加载成功的素材）
let loading = false;

const SFX_FILES = ['coin', 'lever', 'spin', 'stop', 'bell', 'coins', 'jackpot'];

export function ensure() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = .55;
    master.connect(ac.destination);
    loadAll();
  }
  if (ac.state === 'suspended') ac.resume();
  bgmStart();
}

async function loadOne(name, url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    bufs[name] = await ac.decodeAudioData(await res.arrayBuffer());
  } catch {}
}

function loadAll() {
  if (loading) return;
  loading = true;
  for (const n of SFX_FILES) loadOne(n, `audio/sfx/${n}.mp3`);
  // bgm 加载完且已解锁 → 立即起播（不等下一次手势）
  loadOne('bgm', 'audio/bgm.mp3').then(() => { if (ac.state === 'running') bgmStart(); });
}

// 素材播放；返回 false 表示没素材（调用方走合成回退）
function play(name, { vol = 1, rate = 1, when = 0, loop = false } = {}) {
  const buf = bufs[name];
  if (!buf) return null;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.playbackRate.value = rate;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(master);
  src.start(ac.currentTime + when);
  return { src, g };
}

// BGM：WebAudio buffer 循环（无缝），首手势后开始
function bgmStart() {
  if (bgmNode || !bufs.bgm) return;
  const node = play('bgm', { vol: .3, loop: true });
  if (node) bgmNode = node;
}

// ===== 合成底层 =====
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

// ===== 对外接口（素材优先，合成回退）=====

// 投币
export function coin() {
  if (play('coin', { vol: .8 })) return;
  blip(2520, .07, 'triangle', .22);
  blip(3360, .05, 'sine', .14, .03);
  thud(4000, .03, .1);
}

// 拉杆棘轮齿（高频小事件，合成最跟手）。p=下拉深度 0..1，越深音高越紧
export function ratchet(p = .5) {
  blip(680 + p * 520 + Math.random() * 90, .025, 'square', .08 + p * .05);
  thud(2600, .02, .08);
}

// 过点咬合：机构"咬住"的沉重一声——过了这里松手必触发
export function commitClick() {
  blip(300, .05, 'square', .22);
  thud(1100, .045, .4);
}

// 释放回弹
export function springRelease() {
  if (play('lever', { vol: .9 })) return;
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

// 转轴运转底噪
export function whirrStart() {
  if (!ac || whirrNode) return;
  const fileNode = play('spin', { vol: .5, loop: true });
  if (fileNode) {
    whirrNode = { src: fileNode.src, g: fileNode.g };
    return;
  }
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

// 转轴过格哒声（高频小事件，合成最跟手）
export function tick() {
  blip(640, .02, 'square', .05);
}

// 轴锁定
export function clunk(i) {
  if (play('stop', { vol: .9, rate: 1 - i * .06 })) return;
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

// 中奖铃：档位越高敲越多
export function winBells(times) {
  if (bufs.bell) {
    for (let i = 0; i < times; i++)
      play('bell', { vol: .7, rate: .96 + Math.random() * .08, when: i * .14 });
    return;
  }
  for (let i = 0; i < times; i++) {
    blip(1865, .25, 'sine', .22, i * .14);
    blip(2793, .18, 'sine', .1, i * .14);
    thud(6000, .02, .08, i * .14);
  }
}

// 金币入盘瀑布
export function coinsCascade(n) {
  if (play('coins', { vol: Math.min(1, .5 + n * .03) })) return;
  for (let i = 0; i < n; i++) {
    const w = i * .07 + Math.random() * .03;
    blip(2200 + Math.random() * 900, .06, 'triangle', .13, w);
    thud(5000, .02, .07, w);
  }
}

// JACKPOT
export function jackpotFanfare() {
  if (!ac) return;
  if (play('jackpot', { vol: 1 })) {
    // 素材打底，再补低频轰鸣加重
  } else {
    for (let i = 0; i < 14; i++) {
      blip(1865, .3, 'sine', .2, i * .12);
      blip(2793, .22, 'sine', .1, i * .12 + .04);
    }
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
