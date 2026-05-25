# ToriSidebar v0.1.10

🐦 A lightweight Edge Sidebar replacement for Windows.

---

## English

### What's New in v0.1.10

**Bug Fixes**
- **Closing an app window now correctly updates the sidebar state** — When clicking the close button inside an app's floating navigation bar, the sidebar's active indicator is now properly cleared.
- **Nav bar language now syncs with language switch** — The floating navigation bar inside app windows updates its tooltip language immediately when you switch languages in Manage Mode.
- **New app windows now respect the selected language** — Previously, newly opened app windows defaulted to English because each WebView has isolated localStorage. Now the current language preference is explicitly passed to every new window.

### Download

Download `ToriSidebar.exe` from the release and double-click to run. No installation needed.

### Requirements

- Windows 10/11 (x64)
- WebView2 Runtime (pre-installed on Windows 10/11)

---

## 中文

### v0.1.10 更新内容

**Bug 修复**
- **关闭应用窗口后侧边栏状态同步更新** — 在应用窗口的浮动导航栏内点击关闭按钮后，侧边栏的活跃指示器现在会正确清除。
- **导航栏语言随语言切换实时更新** — 在管理模式中切换语言后，应用窗口内的浮动导航栏 tooltip 会立即更新。
- **新打开的窗口正确显示当前语言** — 之前由于每个 WebView 的 localStorage 互相隔离，新窗口总是默认显示英文。现在会将当前语言偏好显式传递到每个新窗口。

### 下载

从 release 区域下载 `ToriSidebar.exe`，双击即用，无需安装。

### 系统要求

- Windows 10/11（64位）
- WebView2 运行时（Win10/11 已预装）
