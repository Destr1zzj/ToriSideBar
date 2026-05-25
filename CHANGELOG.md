# Changelog / 更新日志

All notable changes to ToriSidebar are documented here.  
此处记录了 ToriSidebar 的所有重要变更。

---

## v0.2.0 — Refactor + Drag-to-Sort / 重构 + 拖动排序

### New / 新增

- **Drag-to-Sort / 拖动排序**  
  Reorder apps by dragging icons directly in normal mode — no need to enter manage panel.  
  在常规模式下直接拖动图标排序，无需进入管理面板。

- **Live Drag Preview / 实时拖动预览**  
  The dragged item follows your cursor in real time with scale-up animation. Other items smoothly slide out of the way.  
  被拖动的图标实时跟随光标并放大，其他图标平滑滑开让位。

- **Auto-Scroll During Drag / 拖动时自动滚动**  
  When the app list overflows the sidebar viewport, hovering near the top or bottom edge auto-scrolls the list.  
  当应用列表超出边栏可视区域时，鼠标靠近顶部或底部边缘会自动滚动列表。

- **Conditional Back Button / 条件返回按钮**  
  The floating nav bar's back button is now hidden when `history.length <= 1`.  
  悬浮导航栏的返回按钮在 `history.length <= 1` 时自动隐藏。

- **Keep Sidebar Visible During Drag / 拖动时边栏保持可见**  
  Auto-hide is paused while drag-sorting so the bar doesn't retract mid-drag.  
  拖动排序期间自动隐藏暂停，边栏不会中途缩回。

### Changed / 变更

- **Frontend Refactor / 前端重构**  
  Monolithic `App.tsx` (600+ lines) split into `src/{types,utils,hooks,components}/`.  
  单体 `App.tsx`（600+ 行）拆分为 `src/{types,utils,hooks,components}/`。

- **Backend Refactor / 后端重构**  
  `lib.rs` (932 lines) split into 6 focused modules: `state`, `monitor`, `inject`, `animation`, `window`, `commands`.  
  `lib.rs`（932 行）拆分为 6 个专注模块：`state`、`monitor`、`inject`、`animation`、`window`、`commands`。

- **INJECT_JS Externalized / INJECT_JS 外置**  
  The hardcoded injection script moved to `src-tauri/inject/navbar.js`, loaded via `include_str!`.  
  硬编码的注入脚本移至 `src-tauri/inject/navbar.js`，通过 `include_str!` 加载。

### Fixed / 修复

- Accurate drop-target detection during drag, unaffected by list scroll or item transforms.  
  拖动期间准确的放置目标检测，不受列表滚动或图标变换影响。

---

## v0.1.10 — Bug Fixes / Bug 修复

- Window close state now syncs correctly with sidebar active indicator via `app-closed` Tauri event.  
  窗口关闭状态通过 `app-closed` Tauri 事件正确同步到侧边栏活跃指示器。

- Language switch now live-updates tooltips in already-opened app nav bars via `sync_language`.  
  语言切换通过 `sync_language` 实时更新已打开应用的导航栏 tooltip。

- New windows now correctly inherit the current language setting.  
  新窗口现在正确继承当前语言设置。

---

## v0.1.9 — Bilingual Support / 双语支持

- Full English / Chinese (Simplified) bilingual UI.  
  完整的英语 / 简体中文双语界面。

- Hand-written React Context i18n (zero dependencies). Default: English.  
  手写 React Context 国际化（零依赖）。默认英语。

- Language setting persists to `localStorage` and syncs across all windows.  
  语言设置持久化到 `localStorage`，并同步到所有窗口。

---

## v0.1.8 — Child Window Support / 子窗口支持

- Same-domain links open as child windows instead of external browser.  
  同域链接以内置子窗口打开，而非外部浏览器。

- Each parent window allowed one child at a time. Boundary protection included.  
  每个父窗口同一时间只允许一个子窗口，包含边界保护。

---

## v0.1.7 — Multi-Monitor + Auto-Hide / 多显示器 + 自动隐藏

- Smooth slide-in/out animation at ~60fps with 150ms decision loop.  
  约 60fps 的平滑滑入/滑出动画，150ms 决策循环。

- Multi-monitor detection: bar follows mouse across monitors.  
  多显示器检测：边栏跟随鼠标跨显示器移动。

- Trigger zone width configurable (1–200px).  
  触发区宽度可配置（1–200px）。

---

## v0.1.0 — Initial Release / 初始发布

- Basic sidebar with preset apps (Outlook, Gmail, Twitter, YouTube, Notion, WeChat, GitHub).  
  基础侧边栏，带预设应用（Outlook、Gmail、Twitter、YouTube、Notion、微信网页版、GitHub）。

- System tray icon with right-click quit menu.  
  系统托盘图标，右键退出菜单。

- Single-instance enforcement via Windows named mutex.  
  通过 Windows 命名互斥锁强制单实例运行。
