# Changelog / 更新日志

All notable changes to ToriSidebar. / ToriSidebar 的所有重要更新。

---

## v0.5.0 — 2026-05-26

### New / 新增

- 💡 **First-Run Guide (Native)** — Replaced WebView2 with a pure WinAPI `WS_EX_LAYERED` window. Ice-blue glow is now rendered via CPU pixel shaders (4-layer gaussian blur), completely eliminating border/background artifacts. 首次启动引导改用纯 WinAPI 分层窗口，CPU 像素级绘制四层高斯光效，彻底消除 WebView2 的边框/背景瑕疵。
- 🎯 **Guide Dismiss on First Trigger** — The glow stays until the user first triggers the bar (mouse edge or shortcut), instead of a fixed 10s timer. 引导光效改为"触发即关闭"：持续显示直到用户首次呼出边栏（鼠标移到边缘或全局快捷键），而非固定 10 秒倒计时。
- ✨ **Silky Glow Polish** — 80px wide, centered on screen bezel so half spills outside; edge-fade-free vertical fill; multi-gaussian falloff for a seamless bloom. 光效细腻度大幅提升：80px 宽度、中心对齐屏幕边缘（半屏外发光）、仅上下 5% 边缘淡入淡出、多层衰减无硬边。

### Fixed / 修复

- 🧊 **First-run guide visual imperfection** — Resolved by ditching WebView2 transparent windows entirely. 首次引导视觉效果问题已通过完全移除 WebView2 方案解决。
- 🐛 **Bar incorrectly shown on first launch** — The sidebar no longer forces `show()` during setup on first run; visibility is now fully controlled by `BAR_TARGET_VISIBLE`. 修复首次启动时边栏被强制显示的问题。

---

## v0.4.0 — 2026-05-25

### New / 新增

- ⌨️ **Global Shortcut** — Customizable hotkey (default `Ctrl+Shift+Space`) to show/hide the sidebar. 可自定义全局快捷键（默认 `Ctrl+Shift+Space`）呼出/隐藏边栏。
- 🔒 **Shortcut Lock Mode** — Press shortcut once to lock the bar visible (auto-hide suspended); press again or click outside to unlock. 快捷键锁定模式：一次按下锁定常显，再次按下或点击外部区域解锁。
- ↔️ **Bar Position Toggle** — Switch between left and right screen edges, pinned to the outermost monitor. 边栏位置切换：左/右边缘，固定到最外侧显示器。
- ➖ **Nav Bar Hide Button** — Floating nav bar in app windows now has a `−` hide button (same as toggling the app off). 应用窗口悬浮导航栏新增 `−` 隐藏按钮。
- 🎹 **Shortcut UX Polish** — Click input to record, auto-save after recording, clear button, and weak conflict hint. 快捷键设置 UX：点击输入框录制、录制后自动保存、清除按钮、冲突弱提示。
- 🔄 **Manual Update Check** — Displays local vs latest GitHub release version, one-click jump to download. 手动检查更新：显示本地与 GitHub 最新版本，一键跳转下载。
- 📅 **Auto Check on Mondays** — Automatically checks for updates every Monday; shows red badge on manage button when update is available. 每周一自动检查更新；发现新版本时管理按钮显示红点提示。
- 💡 **First-Run Guide (Experimental)** — Ice-blue glow bar on screen edge for 10s on first launch. Windows WebView2 transparent window has rendering limitations; visual quality is suboptimal. 首次启动引导（实验性）：首次启动时屏幕边缘显示冰蓝色光条 10 秒。受 Windows WebView2 透明窗口渲染限制，视觉效果未达预期。

### Fixed / 修复

- 🐛 Right-side bar content no longer overflows screen (WebView2 inset compensation). 右侧边栏内容不再超出屏幕。
- 🐛 `activeApps` state no longer persists across restarts (was showing stale active indicators). activeApps 不再跨重启持久化，避免重启后显示错误的活跃状态。
- 🐛 Cleared shortcut no longer restores to default after restart. 清除快捷键后重启不再恢复默认值。

### Known Issues / 已知问题

- 🧊 **First-run guide visual imperfection** — WebView2 transparent windows on Windows cannot fully eliminate border/background artifacts. The 20px glow bar is a workaround; some edge artifacts may still be visible. 首次启动引导的视觉效果未达预期：WebView2 在 Windows 上的透明窗口无法完全消除边框/背景瑕疵，20px 光条为折中方案，边缘可能仍有可见瑕疵。

### Engineering / 工程化

- 🔧 `open_external_url` migrated from hard-coded `cmd /c start` to `tauri-plugin-opener`. 外部链接打开方式迁移到 `tauri-plugin-opener`。
- 🛡️ Frontend **Error Boundary** — Shows friendly crash screen with reload button. 前端添加错误边界，崩溃时显示友好界面。
- 🛡️ Rust **panic hook** — Writes panic info to `%APPDATA%/ToriSidebar/panic.log`. Rust 添加 panic hook，写入日志文件。
- 🚀 **GitHub Actions CI/CD** — `.github/workflows/release.yml` auto-builds on tag push. GitHub Actions 自动构建流水线。

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
