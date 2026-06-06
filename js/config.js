// ===== v2 老虎机数值 =====
// 符号：C 樱桃 / L 柠檬 / M 西瓜 / B 铃铛 / R BAR / S 红7
export const SYMBOLS = ['C', 'L', 'M', 'B', 'R', 'S'];

// 三条符号带，各 20 格——真实机械老虎机做法，概率 = 格数乘积/8000。
// Reel1: C5 L5 M4 B3 R2 S1；Reel2/3: C4 L5 M4 B3 R2 S2。
// 同符号格打散排布（相邻重复会让滚动显得假）。
export const STRIPS = [
  ['C','L','M','B','C','L','R','C','M','L','B','C','S','L','M','C','R','L','B','M'],
  ['C','L','M','B','S','L','R','C','M','L','B','C','S','L','M','C','R','B','L','M'],
  ['C','L','M','B','S','L','R','C','M','L','B','C','S','L','M','C','R','B','L','M'],
];

// 中线赔付（coins，bet=5）。樱桃按左起连算（经典规则）。
// 理论 RTP ≈ 94.4%，命中率 ≈ 27.9%（build/sim.mjs 验证）
export const PAYTABLE = [
  { id: 'jackpot', match: ['S', 'S', 'S'],   pay: 1000, label: '7 7 7' },
  { id: 'bar3',    match: ['R', 'R', 'R'],   pay: 400 },
  { id: 'bell3',   match: ['B', 'B', 'B'],   pay: 150 },
  { id: 'melon3',  match: ['M', 'M', 'M'],   pay: 90 },
  { id: 'lemon3',  match: ['L', 'L', 'L'],   pay: 70 },
  { id: 'cherry3', match: ['C', 'C', 'C'],   pay: 30 },
  { id: 'cherry2', match: ['C', 'C', null],  pay: 15 },
  { id: 'cherry1', match: ['C', null, null], pay: 3 },
];

export const ECON = {
  start: 100,   // 开局币
  bet: 5,       // 固定注
  loan: 100,    // 破产赊账额
};

export const PITY = {
  losses: 6,    // 连续空手 N 次后下次必中小奖（构造樱桃停位）
};

// 时序（ms）
export const T = { lockGap: 450, spinMin: 1000, leverThreshold: 60 };

// ===== v1 生成艺术（JACKPOT 777 头奖海报复用）=====
export const ALGO_NAMES = ['流场', '粒子星云', '网格波', '分形枝', '噪声地形', '轨道环', '字符雨', '玻璃折射'];

// 运动节奏：speed=时间倍率，其余为海报渲染全局变换/覆盖层强度 0..1
export const MOTIONS = [
  { name: '慢呼吸',   speed: .35, breath: 1,  pulse: 0, drift: 0,  swirl: 0,   grain: 0,  scan: 0 },
  { name: '心跳脉冲', speed: .6,  breath: 0,  pulse: 1, drift: 0,  swirl: 0,   grain: 0,  scan: 0 },
  { name: '漂移',     speed: .5,  breath: 0,  pulse: 0, drift: 1,  swirl: 0,   grain: 0,  scan: 0 },
  { name: '涡旋',     speed: .7,  breath: 0,  pulse: 0, drift: 0,  swirl: 1,   grain: 0,  scan: 0 },
  { name: '静止微噪', speed: .07, breath: 0,  pulse: 0, drift: 0,  swirl: 0,   grain: 1,  scan: 0 },
  { name: '扫描线',   speed: .5,  breath: 0,  pulse: 0, drift: 0,  swirl: 0,   grain: .3, scan: 1 },
  { name: '雨落',     speed: 1.4, breath: 0,  pulse: 0, drift: .2, swirl: 0,   grain: 0,  scan: 0 },
  { name: '失重',     speed: .22, breath: .5, pulse: 0, drift: .6, swirl: .15, grain: 0,  scan: 0 },
];
