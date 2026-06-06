export const PALETTE_NAMES = ['霓虹夜', '黄昏胶片', '苔原冷雾', '蒸汽波', '墨与金', '酸性绿', '褪色海报', '单色裸机'];
export const ALGO_NAMES = ['流场', '粒子星云', '网格波', '分形枝', '噪声地形', '轨道环', '字符雨', '玻璃折射'];

// 运动节奏：speed=时间倍率，其余为 main.js 全局变换/覆盖层强度 0..1
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

export const REELS = [PALETTE_NAMES, ALGO_NAMES, MOTIONS.map(m => m.name)];

export const T = { lockGap: 400, spinMin: 1100, leverThreshold: 64 };
