// 全合成零素材。AudioContext 必须在用户手势内 ensure()（iOS 限制）
let ac, master, padNodes = [];

export function ensure() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain();
    master.gain.value = .5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
}

function env(g, t0, a, d, peak) {
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(.001, t0 + a + d);
}

function blip(freq, dur, type, vol) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(master);
  env(g, ac.currentTime, .004, dur, vol);
  o.start();
  o.stop(ac.currentTime + dur + .05);
}

export function ratchet() { blip(1200 + Math.random() * 300, .03, 'square', .08); }
export function tick() { blip(900, .025, 'square', .05); }

export function lock(i) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(140 - i * 15, t);
  o.frequency.exponentialRampToValueAtTime(60, t + .12);
  o.connect(g);
  g.connect(master);
  env(g, t, .005, .18, .5);
  o.start(t);
  o.stop(t + .25);
  blip(2400, .04, 'triangle', .12);
}

export function padStop() {
  for (const n of padNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch {} }
  padNodes = [];
}

// 氛围 pad：根音随 seed 取五声音阶，LFO 扫滤波随 motion.speed
export function pad(motion, seed) {
  if (!ac) return;
  padStop();
  const t = ac.currentTime;
  const root = [110, 123.47, 130.81, 146.83, 164.81][seed % 5];
  const filt = ac.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 600;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(.16, t + 2);
  filt.connect(g);
  g.connect(master);
  for (const m of [1, 1.5, 2.003]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = root * m;
    o.detune.value = (Math.random() - .5) * 8;
    o.connect(filt);
    o.start(t);
    padNodes.push(o);
  }
  const lfo = ac.createOscillator(), lg = ac.createGain();
  lfo.frequency.value = .1 + motion.speed * .5;
  lg.gain.value = 320;
  lfo.connect(lg);
  lg.connect(filt.frequency);
  lfo.start(t);
  padNodes.push(lfo, g);
}
