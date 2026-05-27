## v0.6.3 — Smooth Settings Animation + Position Fix / 设置动画优化 + 位置修复

### What's New / 新功能

**✨ Smooth Settings Panel Animation / 设置面板平滑动画**

- Sidebar now widens smoothly from 64px to 280px when opening settings / 打开设置时边栏从 64px 平滑展开到 280px
- App list fades out while settings content fades in, all synchronized / 应用列表淡出，设置内容淡入，三者同步协调
- CSS height transition shortened to 0.05s (instant), opacity cross-fade dominates at 0.35s / CSS 高度动画缩短到 0.05s（瞬间完成），opacity 交叉淡化主导 0.35s

### Bug Fixes / 修复

- Fixed window position race condition in expanded mode / 修复展开模式下的窗口位置竞争条件
  - `set_position` and `outer_position()` were racing each other, causing the bar to never reach the correct right-edge alignment / `set_position` 和 `outer_position()` 互相竞争，导致边栏永远无法对齐屏幕右边缘
  - Sync now only runs when no move is needed, avoiding coordinate overwrite / 同步逻辑只在不需要移动时执行，避免坐标被旧值覆盖
- Fixed width teleport that caused the bar to overshoot the screen edge / 修复宽度瞬移导致边栏飞出屏幕边缘
  - Removed `diff.abs() > 200` guard for width transitions / 去掉宽度过渡中的 `diff.abs() > 200` 瞬移判断
  - Width now always eases frame-by-frame (step = diff × 0.15, clamped 1–16px) / 宽度始终逐帧缓动（步长 = 差值 × 0.15，限制 1–16px）
