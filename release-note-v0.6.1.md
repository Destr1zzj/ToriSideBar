## v0.6.1 — Autostart / 开机自启动

### What's New / 新功能

**🚀 Launch on Login / 开机自启动**

- New toggle in **Manage Mode → Settings** / 管理模式设置中新增开关
- Enable to have ToriSidebar start automatically when you log in to Windows / 开启后每次登录 Windows 自动启动
- Disable to keep it manual / 关闭后保持手动启动
- Uses Windows Registry Run key (no UAC prompt) / 使用 Windows 注册表 Run 键，无需管理员权限

### Technical / 技术

- Added `tauri-plugin-autostart` for cross-platform autostart support / 新增 `tauri-plugin-autostart` 插件
