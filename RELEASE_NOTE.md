# ToriSidebar v0.1.5

🐦 A lightweight Edge Sidebar replacement for Windows.

---

## English

### What's This?

Microsoft killed Edge's sidebar. So I built my own.

ToriSidebar lives on the right edge of your screen. Move your mouse to the edge and it slides out. Click an icon to open web apps in independent windows. Move your mouse away and it slides back. That's it.

### What's Included

| Feature | Status |
|---------|--------|
| Edge auto-hide bar | ✅ |
| Independent WebView windows per app | ✅ |
| Multi-monitor support | ✅ |
| Session persistence (background keep-alive) | ✅ |
| Single foreground window (auto-hide others) | ✅ |
| Auto favicon fetching | ✅ |
| Random emoji icons | ✅ |
| System tray icon | ✅ |
| Single instance lock | ✅ |
| Adjustable trigger zone | ✅ |
| Inline manage mode (expand bar to reorder & delete) | ✅ |

### Download

Download `ToriSidebar.exe` from the release and double-click to run. No installation needed.

### Requirements

- Windows 10/11 (x64)
- WebView2 Runtime (pre-installed on Windows 10/11)

### Usage Tips

- **Trigger zone**: Move your mouse to the right edge of any monitor to summon the bar. Default trigger width is 30px, adjustable in settings.
- **Add apps**: Click the ➕ button at the bottom of the bar to add your favorite web apps.
- **Manage apps**: Click the ⚙️ button to enter manage mode. The bar expands so you can reorder apps with ↑/↓ buttons or delete them. Click ✓ when done.
- **Switch apps**: Click an app to open it; other open apps will automatically hide in the background (sessions preserved).
- **Close windows**: Hover over an active app icon and click the red ×, or press ESC to close the last opened window.
- **Exit**: Right-click the tray icon and select "退出" (Quit).

### Notes

- The app enforces single-instance. If you try to launch it twice, the second launch will silently do nothing.
- Each web app runs in its own isolated WebView window. You can be logged into multiple accounts simultaneously.
- Multi-monitor teleport: when you move your mouse to a different monitor, the bar will instantly teleport there instead of sliding across the desktop gap.

---

## 中文

### 这是啥？

微软把 Edge 的侧边栏砍了，于是我自己造了一个。

ToriSidebar 常驻在屏幕右边缘。鼠标往右一蹭，它就滑出来；点个图标，网页应用就在旁边展开；鼠标移走，它又自动缩回去。就这么简单。

### 功能清单

| 功能 | 状态 |
|------|------|
| 贴边自动隐藏边栏 | ✅ |
| 每个应用独立 WebView 窗口 | ✅ |
| 多显示器支持 | ✅ |
| 后台保活（隐藏不丢会话） | ✅ |
| 单前台窗口（自动隐藏其他应用） | ✅ |
| 自动获取网站图标 | ✅ |
| 随机 emoji 图标 | ✅ |
| 系统托盘图标 | ✅ |
| 单例运行锁 | ✅ |
| 触发区域宽度可调 | ✅ |
| 边栏内联管理（展开后排序/删除） | ✅ |

### 下载

从 release 区域下载 `ToriSidebar.exe`，双击即用，无需安装。

### 系统要求

- Windows 10/11（64位）
- WebView2 运行时（Win10/11 已预装）

### 使用技巧

- **呼出边栏**：把鼠标移到任意显示器的右边缘，bar 会自动滑出。默认触发宽度 30 像素，可在设置中调整。
- **添加应用**：点击边栏底部的 ➕ 按钮添加常用网页应用。
- **管理应用**：点击边栏底部的 ⚙️ 按钮进入管理模式，边栏会自动展开，此时可以用 ↑/↓ 按钮调整应用顺序，或直接删除应用。点击 ✓ 完成管理。
- **切换应用**：点击应用图标打开，其他已打开的应用会自动隐藏到后台（会话保持）。
- **关闭窗口**：鼠标悬停在已打开的应用图标上，点击红色 × 关闭；或按 ESC 关闭最后一个打开的窗口。
- **退出程序**：右键系统托盘图标，选择「退出」。

### 注意事项

- 程序强制单例运行。如果你双击了第二次，它会礼貌地假装什么都没发生。
- 每个网页应用运行在独立的 WebView 窗口中，Cookie 互相隔离。你可以同时登录多个账号，互不干扰。
- 多显示器瞬移：当你把鼠标移到另一块屏幕时，bar 会直接瞬移到那边，而不是慢悠悠地滑过桌面间隙。
