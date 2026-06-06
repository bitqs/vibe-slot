// 转轴：词条 ×3 复制成带循环错觉的 strip；pos 单位 = 格
// spin 匀速滚动，lockTo 用 easeOutBack 滚过头再弹回 —— 机械顿挫感
export class Reel {
  constructor(el, items) {
    this.el = el;
    this.items = items;
    this.n = items.length;
    this.strip = el.querySelector('.strip');
    for (let k = 0; k < 3; k++)
      for (const it of items) {
        const d = document.createElement('div');
        d.className = 'cell';
        d.textContent = it;
        this.strip.appendChild(d);
      }
    this.pos = Math.floor(Math.random() * this.n);
    this.state = 'idle';
    this.render();
  }

  render() {
    const h = this.strip.children[0].offsetHeight, n = this.n;
    const p = ((this.pos % n) + n) % n;
    const y = this.el.offsetHeight / 2 - h / 2 - (p + n) * h;
    this.strip.style.transform = `translateY(${y}px)`;
  }

  spin() {
    this.state = 'spin';
    this.v = 16 + Math.random() * 5; // 格/秒
  }

  lockTo(target, onDone) {
    const n = this.n, cur = Math.ceil(this.pos);
    let d = ((target - cur) % n + n) % n;
    if (d < 2) d += n; // 至少再滚 2 格，避免急停
    this.from = this.pos;
    this.dist = cur + d - this.pos;
    this.t = 0;
    this.state = 'lock';
    this.onDone = onDone;
  }

  tick(dt) {
    if (this.state === 'spin') {
      this.pos += this.v * dt;
    } else if (this.state === 'lock') {
      this.t = Math.min(1, this.t + dt / .85);
      const x = this.t - 1, c = 1.4;
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
