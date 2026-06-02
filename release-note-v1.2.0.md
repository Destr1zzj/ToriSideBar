## v1.2.0 — Click Outside to Hide / 点击外部自动隐藏

### What's New / 新功能

**👆 Click Outside to Hide / 点击外部自动隐藏**

- New toggle in Manage Mode settings: "Click Outside to Hide" / 管理模式设置中新增"点击外部自动隐藏"开关
- When enabled, clicking outside the sidebar and any app window automatically hides everything / 开启后，点击边栏和应用窗口之外的区域会自动隐藏所有内容
- Only triggers when at least one app window is visible — no interference when the sidebar is idle / 只在有应用窗口可见时才触发，边栏空闲时不会误触
- Works in Manage Mode too: clicking outside collapses the sidebar back to its narrow form / 管理模式下同样生效：点击外部区域会让边栏从管理模式收回到窄条状态
- Hidden app windows keep their active indicators lit, consistent with the existing toggle behavior / 隐藏后的应用窗口保持激活状态高亮，与原有的点击图标二次隐藏行为一致

### Improvements / 改进

- **Hide instead of Close**: Click-outside action now hides windows rather than closing them, preserving window state and navigation history / **隐藏而非关闭**：点击外部现在隐藏窗口而不是关闭窗口，保留窗口状态和浏览历史
- **Child window aware**: The detection covers both parent and child windows, so clicking outside a sub-window also triggers the hide action / **子窗口感知**：检测范围覆盖父窗口和子窗口，点击子窗口外部区域也会触发隐藏

### Version Bump / 版本更新

- `package.json`: `1.1.0` → `1.2.0`
- `Cargo.toml`: `1.1.0` → `1.2.0`
- `tauri.conf.json`: `1.1.0` → `1.2.0`
