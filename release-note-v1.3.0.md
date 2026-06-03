## v1.3.0 — Collapsible Nav Bar / 可折叠悬浮导航栏

### What's New / 新功能

**🔽 Collapsible Floating Nav Bar / 可折叠悬浮导航栏**

- New toggle button on the floating nav bar to collapse/expand all action buttons / 悬浮导航栏新增切换按钮，可一键收起/展开所有操作按钮
- Collapsed state is persisted via `localStorage` and survives window switches / 收起状态通过 `localStorage` 持久化，切换窗口后依然保持
- Collapsed nav bar shrinks to a single compact circle for minimal distraction / 收起后导航栏缩为单个圆形按钮，最小化视觉干扰

**🎨 Icon Consistency Fixes / 图标一致性修复**

- Forced `!important` styles on all nav bar button icons to prevent host page CSS overrides / 强制 `!important` 样式覆盖所有导航栏图标，防止网页 CSS 干扰
- Unified icon color to white with `filter: brightness(0) invert(1)` across all sites / 通过 `filter: brightness(0) invert(1)` 统一图标颜色为白色，不受网站影响
- Fixed icon size to `16px` and centered regardless of page styles / 固定图标大小为 `16px` 并居中显示，不受页面样式影响

**🔙 Smarter Back Button / 更智能的后退按钮**

- Back button now prefers `window.navigation.canGoBack` API when available for accurate detection / 后退按钮优先使用 `window.navigation.canGoBack` API 进行准确判断
- Falls back to `history.length` check on older browsers / 旧浏览器自动回退到 `history.length` 检查
- Periodic 2-second polling catches navigations not detected by event listeners / 每 2 秒定时检查，捕获事件监听器遗漏的导航变化

### Improvements / 改进

- **Toggle icon clarity**: Changed collapse/expand symbols from `‹`/`›` to solid triangles `◀`/`▶` for better visibility / **切换图标更清晰**：将收起/展开符号从 `‹`/`›` 改为实心三角 `◀`/`▶`，辨识度更高
- **Language sync robustness**: `sync_language` command now targets buttons by ID instead of index, preventing misalignment when button order changes / **语言同步更健壮**：`sync_language` 命令改用 ID 定位按钮，避免按钮顺序变化时错位

### Version Bump / 版本更新

- `package.json`: `1.2.0` → `1.3.0`
- `Cargo.toml`: `1.2.0` → `1.3.0`
- `tauri.conf.json`: `1.2.0` → `1.3.0`
