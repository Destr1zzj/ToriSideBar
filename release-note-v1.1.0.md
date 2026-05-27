## v1.1.0 — WebView Session Isolation / WebView 会话隔离

### What's New / 新功能

**🔒 Isolated WebView Sessions / 独立的 WebView 会话**

- Each app now runs in its own WebView2 user data directory / 每个应用现在运行在独立的 WebView2 用户数据目录中
- Cookies, localStorage, and caches are fully isolated between apps / Cookie、localStorage 和缓存在应用之间完全隔离
- Log into multiple accounts on the same service (e.g., two Gmail accounts) with zero conflicts / 可在同一服务上登录多个账号（例如两个 Gmail 账号）且互不干扰
- Child windows inherit the parent app's data directory, keeping same-origin sessions alive / 子窗口继承父应用的数据目录，同域链接保持登录态

### Implementation Details / 实现细节

- Data directory path: `%APPDATA%/<bundle-id>/webview-data/<app-label>/`
- Applied to `toggle_app_window` (parent windows) and `open_child_window` (child windows)
- No breaking changes to existing configs or app lists

### Version Bump / 版本更新

- `package.json`: `1.0.0` → `1.1.0`
- `Cargo.toml`: `1.0.0` → `1.1.0`
- `tauri.conf.json`: `1.0.0` → `1.1.0`
