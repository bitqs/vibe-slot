# vibe老虎机 — 设计 spec

2026-06-06 · 纯前端生成艺术玩具 · 独立仓库 `bitqs/vibe-slot` · 部署 vibe-slot.pages.dev

## 概念

一台拉 vibe 的老虎机。拉杆 → 三个转轴（调色盘 × 图案算法 × 运动节奏）依次锁定 →
全屏渲染该组合的生成艺术 + 合成氛围音。纯玩具：无数值、无收藏、一屏做完，
凭仪式感和产出物的美留人。

## 交互流

一屏，移动优先：

- 上半屏：大 canvas 舞台（产出物）
- 中部：三个转轴窗，滚动的是文字词条
- 底部：拉杆（拖拽下拉过阈值释放触发，或直接点按）

状态机：`idle → spin → lock(×3) → render`。
三轴左中右依次锁定（间隔 ~400ms），每次锁定 click 音 + 微震屏；
全部锁定后舞台淡入渲染 + 氛围音起。spin/render 中再拉随时打断重抽。

## 三维度（各 8 词条 = 512 组合，组合内随机种子 → 无限）

| 调色盘 | 图案算法 | 运动节奏 |
|---|---|---|
| 霓虹夜 | 流场 | 慢呼吸 |
| 黄昏胶片 | 粒子星云 | 心跳脉冲 |
| 苔原冷雾 | 网格波 | 漂移 |
| 蒸汽波 | 递归分形枝 | 涡旋 |
| 墨与金 | 噪声地形 | 静止微噪 |
| 酸性绿 | 轨道环 | 扫描线 |
| 褪色海报 | 字符雨 | 雨落 |
| 单色裸机 | 玻璃折射条 | 失重 |

## 代码结构（零依赖、零构建、vanilla JS）

```
index.html
css/style.css
js/
  config.js        # 维度词条 + 权重
  reels.js         # 转轴滚动/锁定动画
  art/
    palette.js     # 8 调色盘定义
    flowfield.js … # 8 算法各一文件，统一接口 draw(ctx, t, seed, palette, motion)
  audio.js         # WebAudio 全合成：棘轮/tick/thunk/氛围 pad（LFO 随节奏维度变）
  main.js          # 状态机 + 输入
```

- 算法纯函数：seed 进、确定性输出；`t` 驱动动画，`motion` 维度调制节奏参数。
- AudioContext 首次用户交互后才 init（iOS 限制）。

## 测试

`node --test`：config 完整性（8×8×8 词条齐全）+ 算法 seed 确定性（同 seed 同输出）。
视觉/手感验收走浏览器 + 手机。

## 部署

```bash
wrangler pages deploy . --project-name=vibe-slot
```

GitHub `bitqs/vibe-slot`，线上 https://vibe-slot.pages.dev。
