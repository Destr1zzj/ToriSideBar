## v1.4.1 — Sidebar Height & Auto-hide Polish / 边栏高度与自动隐藏优化

### Fixed / 修复

- 🐛 **Taskbar overlap** — Sidebar and opened app webview windows now use a 4px safety margin below the monitor work area, preventing the bottom from being covered by the taskbar. 边栏和打开的应用窗口底部不再被任务栏遮挡，工作区高度减去 4px 安全边距。
- 🐛 **Height sync** — App webview windows always keep the same height as the sidebar after restore or creation. 恢复或新建应用窗口时，高度始终与边栏保持一致。

### New / 新增

- ⚙️ **Auto-hide sidebar on app open** — New setting in Manage mode. When enabled, the sidebar hides automatically when you open an app, and reappears after the last app window is closed. 管理模式新增「打开应用时自动隐藏边栏」开关；开启后打开应用自动隐藏边栏，关闭最后一个应用后恢复显示。

### Version Bump / 版本更新

- `package.json`: `1.4.0` → `1.4.1`
- `Cargo.toml`: `1.4.0` → `1.4.1`
- `tauri.conf.json`: `1.4.0` → `1.4.1`
