# Changelog / 更新日志

All notable changes to ToriSidebar. / ToriSidebar 的所有重要更新。

---

## v0.3.0 — 2026-05-25

### New / 新增

- 📥 **Edge Bar Import** — One-click import custom apps from Microsoft Edge sidebar. Supports Stable, Beta, Dev, and Canary versions, scanning all profiles. 一键从 Edge 侧边栏导入自定义应用，支持正式版 / Beta / Dev / Canary 及所有用户配置。
- 🎭 **Emoji Icon Fallback** — When favicon fails to load, automatically falls back to a random emoji. No more broken image icons. Favicon 加载失败时自动回退到随机 emoji，告别破碎图标。
- 🖥️ **Native Exit Confirm Dialog** — Exit confirmation uses Windows native MessageBox, displayed outside the sidebar window. 退出确认使用 Windows 系统对话框，不受边栏宽度限制。
- ✓ **Select All / Deselect All** toggle in import modal. 导入弹窗支持全选 / 全不选切换。

### Fixed / 修复

- 🔧 Fixed long icon URLs covering delete button in manage mode. 修复管理模式下长图标 URL 覆盖删除按钮的问题。
- 🔧 Enhanced URL detection (`//` protocol-relative, `data:image/` base64) in AppIcon. 增强 AppIcon 的 URL 检测（支持协议相对 URL 和 base64 图片）。

---

## v0.2.0 — 2026-05-25

### New / 新增

- 🖱️ **Drag-to-Sort** — Reorder apps by dragging icons directly in normal mode. 常规模式下直接拖动图标排序。
- ✨ **Live Drag Animation** — Dragged item follows cursor with scale-up; others slide out of the way. 被拖动项放大跟随光标，其他项平滑让位。
- 📜 **Auto-Scroll** — List auto-scrolls when dragging near edges. 靠近边缘时列表自动滚动。
- 🔙 **Smart Back Button** — Nav bar back button hides when history has only one page. 历史记录只有一页时隐藏返回按钮。
- ⏸️ **Pause Auto-Hide While Dragging** — Sidebar stays visible during drag-sort. 拖动排序期间边栏保持可见。

### Changed / 变更

- 🏗️ Frontend refactored into modular directories (`components/`, `hooks/`, `types/`, `utils/`). 前端重构为模块化目录结构。
- 🏗️ Backend `lib.rs` (932 lines) split into 6 focused Rust modules. 后端 `lib.rs` 拆分为 6 个 Rust 模块。
- 🏗️ `INJECT_JS` extracted to standalone `src-tauri/inject/navbar.js`. 注入脚本提取为独立文件。

---

## v0.1.10 — 2026-05-25

### Fixed / 修复

- 🐛 Closing an app window now correctly clears the sidebar active indicator. 关闭应用窗口后侧边栏活跃指示器正确清除。
- 🐛 Nav bar tooltip language syncs immediately on language switch. 切换语言后导航栏 tooltip 实时更新。
- 🐛 New app windows now inherit the current language setting. 新打开的窗口正确继承当前语言。

---

## v0.1.9 — 2026-05-25

### New / 新增

- 🌐 **Full English & Chinese bilingual support** — UI, settings, modals, tray menu, and nav bar. 完整的 UI、设置、弹窗、托盘菜单及导航栏中英双语支持。
- 🌐 **Language switcher in Manage Mode** — Switch between English / 中文 instantly, persisted across restarts. 管理模式内切换语言，设置自动记忆。
- 🌐 **English as default language** for first-time users. 默认使用英文。

---

## v0.1.8 — 2026-05-18

### Fixed / 修复

- 🐛 Fixed child page 404 caused by `<base>` tag relative URL resolution. 修复 `<base>` 标签导致的相对路径解析错误。
- 🐛 Child windows now replace the previous one instead of stacking. 子页面现在会替换旧的，不再堆积多开。

### Improved / 改进

- 🆕 Child window nav bar added "Open in Browser" button. 子窗口导航栏新增"用浏览器打开"按钮。
- 📊 Enhanced backend diagnostic logs for child window debugging. 增强子窗口调试日志。

---

## v0.1.7 — 2026-05-18

### Fixed / 修复

- 🐛 Child window now opens correctly for same-domain `target="_blank"` links and `window.open()`. 同域 `target="_blank"` 链接和 `window.open()` 现在正确打开子窗口。
- 🐛 Fixed Tauri v2 IPC parameter naming mismatch (`parent_label` → `parentLabel`). 修复 IPC 参数命名不匹配。
- 🐛 Relative URLs resolved to absolute before passing to backend. 相对路径在传给后端前解析为绝对路径。
- 🐛 Domain matching now uses root-domain comparison. 同域判断改为根域名匹配。
- 🐛 Child window positioning uses parent window's monitor. 子窗口位置基于父窗口所在显示器。

### Improved / 改进

- 🛠️ Added DevTools support: press **F12** in any app window. 应用窗口支持 F12 打开 DevTools。

---

## v0.1.6-preview — 2026-05-13

### New / 新增

- 🧭 App window floating toolbar added **Back** and **Refresh** buttons. 应用窗口悬浮工具栏新增返回和刷新按钮。

### Fixed / 修复

- 🔒 localStorage security fix. localStorage 安全修复。

---

## v0.1.5 — 2026-05-07

### New / 新增

- 🚀 First stable-ish release with all core features: auto-hide bar, independent WebView windows per app, multi-monitor support, session persistence, single foreground window, auto favicon fetching, random emoji icons, system tray, single instance lock, adjustable trigger zone, inline manage mode. 首个稳定版本，包含所有核心功能。

---

## v0.1.4 — 2026-05-07

- Internal build. 内部构建。

---

## v0.1.2 — 2026-05-06

- 🥚 Initial release. A bar that lives on the right edge. That's it. 初始版本。一个常驻右边缘的边栏。仅此而已。
