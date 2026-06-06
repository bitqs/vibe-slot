# vibe 老虎机

拉一下，抽一种 vibe。三个转轴 = 调色盘 × 图案算法 × 运动节奏，
512 种组合 × 无限种子的纯前端生成艺术。零依赖、零构建、零素材（音频全合成）。

**Play:** https://vibe-slot.pages.dev

## Dev

```bash
python3 -m http.server 8787   # 本地跑
npm test                      # config 完整性 + 算法 seed 确定性
```

## Deploy

```bash
wrangler pages deploy . --project-name=vibe-slot --branch=main
```
