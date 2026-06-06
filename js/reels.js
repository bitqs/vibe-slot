// 符号转轴：STRIPS 词条 ×3 复制循环；spin 高速+模糊，lockTo 减速+机械顿挫回弹
import { SYM_SVG } from './symbols.js';

export class Reel {
  constructor(el, strip) {
    this.el = el;
    this.symbols = strip;
    this.n = strip.length;
    this.stripEl = el.querySelector('.strip');
    for (let k = 0; k < 3; k++)
      for (const s of strip) {
        const d = document.createElement('div');
        d.className = 'cell';
        d.innerHTML = SYM_SVG[s];
        this.stripEl.appendChild(d);
      }
    this.pos = Math.floor(Math.random() * this.n);
    this.state = 'idle';
    this.cellH = 72;                  // 与 CSS .cell 同步
    this.winH = el.offsetHeight;
    this.render();
  }

  render() {
    const h = this.cellH, n = this.n;
    const p = ((this.pos % n) + n) % n;
    const y = this.winH / 2 - h / 2 - (p + n) * h;
    this.stripEl.style.transform = `translateY(${y}px)`;
  }

  // 当前停在中线（payline）的 cell 元素
  midCell() {
    const n = this.n;
    const p = ((Math.round(this.pos) % n) + n) % n;
    return this.stripEl.children[p + n];
  }

  spin(boost = 0) {
    this.state = 'spin';
    this.v = 24 + boost + Math.random() * 5; // 格/秒；boost=猛拉奖励
    this.el.classList.add('blur');
  }

  // 减速滚向 target（至少再滚 nMin 格），easeOutBack 过冲回弹 = 机械咔哒
  lockTo(target, onDone, nMin = 4) {
    const n = this.n, cur = Math.ceil(this.pos);
    let d = ((target - cur) % n + n) % n;
    if (d < nMin) d += n;
    this.from = this.pos;
    this.dist = cur + d - this.pos;
    this.t = 0;
    this.dur = .65 + this.dist * .022;
    this.state = 'lock';
    this.onDone = onDone;
  }

  tick(dt) {
    if (this.state === 'spin') {
      this.pos += this.v * dt;
    } else if (this.state === 'lock') {
      this.t = Math.min(1, this.t + dt / this.dur);
      if (this.t > .5) this.el.classList.remove('blur');
      const x = this.t - 1, c = 1.7;
      this.pos = this.from + this.dist * (1 + (c + 1) * x * x * x + c * x * x);
      if (this.t >= 1) {
        this.pos = this.from + this.dist;
        this.state = 'idle';
        const f = this.onDone;
        this.onDone = null;
        if (f) f();
      }
    } else return;
    this.render();
  }
}
