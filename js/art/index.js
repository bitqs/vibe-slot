import * as flowfield from './flowfield.js';
import * as nebula from './nebula.js';
import * as gridwave from './gridwave.js';
import * as branches from './branches.js';
import * as terrain from './terrain.js';
import * as orbits from './orbits.js';

// 顺序必须对齐 config.js ALGO_NAMES
export const ALGOS = [flowfield, nebula, gridwave, branches, terrain, orbits];
