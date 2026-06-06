// 蒙特卡洛：模拟真实玩家行为（含 pity 计数 + 破产赊账），看实效曲线
// 用法：node build/sim.mjs [pulls]
import { ECON, PITY } from '../js/config.js';
import { spin } from '../js/slots.js';
import { rng } from '../js/art/util.js';

const PULLS = Number(process.argv[2]) || 200000;
const r = rng(20260606);

let coins = ECON.start, debt = 0, pity = 0;
let wagered = 0, returned = 0, hits = 0, jackpots = 0, nearMisses = 0, loans = 0;
let drought = 0, maxDrought = 0, rigged = 0;
const payCount = {};

for (let i = 0; i < PULLS; i++) {
  if (coins < ECON.bet) { coins += ECON.loan; debt += ECON.loan; loans++; }
  coins -= ECON.bet;
  wagered += ECON.bet;

  const wasPity = pity >= PITY.losses;
  const { win, nearMiss } = spin(r, pity);

  if (win) {
    coins += win.pay;
    returned += win.pay;
    hits++;
    payCount[win.id] = (payCount[win.id] || 0) + 1;
    if (win.id === 'jackpot') jackpots++;
    if (wasPity) rigged++;
    drought = 0;
    pity = 0;
  } else {
    drought++;
    pity++;
    maxDrought = Math.max(maxDrought, drought);
  }
  if (nearMiss) nearMisses++;
}

const rtp = returned / wagered;
const hit = hits / PULLS;

console.log(`拉杆 ${PULLS} 次（seed 固定）`);
console.log(`实效 RTP: ${(rtp * 100).toFixed(2)}%   命中率: ${(hit * 100).toFixed(2)}%`);
console.log(`jackpot: ${jackpots} 次（1/${Math.round(PULLS / Math.max(1, jackpots))}）   near-miss: ${nearMisses} 次（1/${Math.round(PULLS / Math.max(1, nearMisses))}）`);
console.log(`pity 改写: ${rigged} 次   最长干旱: ${maxDrought} 拉   赊账: ${loans} 次（净胜 ${coins - debt - ECON.start}）`);
console.log('分布:', Object.entries(payCount).map(([k, v]) => `${k}=${v}`).join(' '));

// 断言带
const fail = [];
if (rtp < .92 || rtp > .99) fail.push(`实效 RTP ${(rtp * 100).toFixed(2)}% 出带 [92,99]`);
if (hit < .27 || hit > .36) fail.push(`命中率 ${(hit * 100).toFixed(2)}% 出带 [27,36]（含 pity）`);
if (maxDrought > PITY.losses + 1) fail.push(`最长干旱 ${maxDrought} 超过 pity 上限 ${PITY.losses + 1}`);
if (fail.length) { console.error('❌ ' + fail.join('；')); process.exit(1); }
console.log('✅ 数值在目标带内');
