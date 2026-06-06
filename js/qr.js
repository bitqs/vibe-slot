// 极简真·QR 编码器：固定 Version 2 (25×25) / EC level L / Byte mode / mask 0。
// 容量 32 字节，装本站 URL 足够；返回 25×25 的 0/1 矩阵。
export function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > 32) throw new Error('qr v2-L 容量超限: ' + bytes.length);

  // ---- 比特流：mode + 长度 + 数据 + 终止符 + 补齐 ----
  const bits = [];
  const push = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const b of bytes) push(b, 8);
  push(0, Math.min(4, 34 * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }
  const PAD = [0xec, 0x11];
  for (let i = 0; data.length < 34; i++) data.push(PAD[i % 2]);

  // ---- GF(256) Reed-Solomon：10 个纠错码字 ----
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const polyMul = (a, b) => {
    const r = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) if (a[i])
      for (let j = 0; j < b.length; j++) if (b[j])
        r[i + j] ^= EXP[(LOG[a[i]] + LOG[b[j]]) % 255];
    return r;
  };
  let gen = [1];
  for (let i = 0; i < 10; i++) gen = polyMul(gen, [1, EXP[i]]);
  const msg = [...data, ...new Array(10).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const c = msg[i];
    if (!c) continue;
    const l = LOG[c];
    for (let j = 0; j < gen.length; j++) msg[i + j] ^= EXP[(l + LOG[gen[j]]) % 255];
  }
  const codewords = [...data, ...msg.slice(data.length)];

  // ---- 25×25 矩阵：功能图形 ----
  const N = 25;
  const M = Array.from({ length: N }, () => new Array(N).fill(null)); // null = 数据区
  const set = (r, c, v) => { M[r][c] = v ? 1 : 0; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue;
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(rr, cc, on);
    }
  };
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++)   // 对齐图案 @ (18,18)
    set(18 + r, 18 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
  for (let i = 8; i < N - 8; i++) {                              // 时序
    if (M[6][i] === null) set(6, i, i % 2 === 0);
    if (M[i][6] === null) set(i, 6, i % 2 === 0);
  }
  set(N - 8, 8, 1);                                              // 暗模块

  // 格式信息位置（两份），先占位再回填
  const fmtPos1 = [];
  for (let i = 0; i <= 5; i++) fmtPos1.push([8, i]);
  fmtPos1.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i <= 14; i++) fmtPos1.push([14 - i, 8]);
  const fmtPos2 = [];
  for (let i = 0; i <= 6; i++) fmtPos2.push([N - 1 - i, 8]);
  for (let i = 7; i <= 14; i++) fmtPos2.push([8, N - 15 + i]);
  for (const [r, c] of [...fmtPos1, ...fmtPos2]) if (M[r][c] === null) set(r, c, 0);

  // ---- 数据之字形填充 + mask 0 ----
  let bi = 0;
  const total = codewords.length * 8;
  const bit = i => (codewords[i >> 3] >>> (7 - (i & 7))) & 1;
  let up = true;
  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;                                      // 跳过时序列
    for (let k = 0; k < N; k++) {
      const r = up ? N - 1 - k : k;
      for (const c of [col, col - 1]) {
        if (M[r][c] !== null) continue;
        let v = bi < total ? bit(bi++) : 0;
        if ((r + c) % 2 === 0) v ^= 1;                           // mask 0
        M[r][c] = v;
      }
    }
    up = !up;
  }

  // ---- 格式信息：EC L(01) + mask 0，BCH(15,5) + 固定异或 ----
  const fd = (0b01 << 3) | 0;
  let fr = fd << 10;
  for (let i = 14; i >= 10; i--) if ((fr >>> i) & 1) fr ^= 0b10100110111 << (i - 10);
  const fmt = ((fd << 10) | fr) ^ 0b101010000010010;
  for (let i = 0; i < 15; i++) {
    const v = (fmt >>> (14 - i)) & 1;                 // MSB 先填位置 0（规范位序）
    M[fmtPos1[i][0]][fmtPos1[i][1]] = v;
    M[fmtPos2[i][0]][fmtPos2[i][1]] = v;
  }
  return M;
}
