# 🐦 ToriSidebar

> Microsoft killed Edge's sidebar. So I built my own.  
> 微软砍了 Edge 侧边栏，那我自己造一个。

---

## Why Does This Exist? / 为什么有这东西？

Microsoft Edge had this neat little sidebar — tucked away at the edge of your screen, one click away from your favorite web apps. Peak productivity (and peak procrastination).  
Edge 以前有个挺好用的侧边栏，贴边收着，点一下就能展开，常用网页随手就能打开，生产力（和摸鱼）双双拉满。

Then Microsoft killed it. One day it's there, the next day it's on the chopping block. Meanwhile, the Copilot button is permanently glued to your toolbar like an unwanted houseguest.  
然后微软说砍就砍。更离谱的是，真正有用的功能没了，Copilot 按钮倒是像狗皮膏药一样赖在工具栏上撕都撕不掉。

**So I decided to build my own.**  
**那我自己写一个呗。**

The name "Tori" (鳥) means "bird" in Japanese 🐦 — quietly perched at the edge of your screen, invisible until you need it, then *whoosh* — there it is.  
"Tori" 是日语里"鸟"的意思 🐦。这玩意就像只鸟——平时安安静静停在屏幕边上看不见，你需要的时候扑棱一下就冒出来了。

---

## Quick Start / 快速开始

1. Go to [**Releases**](https://github.com/Destr1zzj/ToriSideBar/releases) and grab `ToriSidebar_new.exe`.  
   去 [**Releases**](https://github.com/Destr1zzj/ToriSideBar/releases) 下载 `ToriSidebar_new.exe`。
2. Double-click it. No installer, no registry keys.  
   双击就完事。不用安装，不写注册表。
3. Move your mouse to the **right edge** of your screen. The sidebar flutters out like a bird taking flight.  
   鼠标往屏幕**右边缘**一靠，边栏就飞出来了。

---

## Features / 功能

| Feature | Description / 描述 |
|---|---|
| 📥 **Edge Import** | One-click import your custom apps from Edge sidebar. Supports all Edge versions (Stable / Beta / Dev / Canary) and all user profiles. 一键从 Edge 侧边栏导入应用，支持所有版本（稳定版 / Beta / Dev / Canary）和所有用户配置。 |
| ⌨️ **Global Shortcut** | Customizable hotkey to show or hide the bar. Press once to lock it visible, press again to unlock. 自定义全局快捷键呼出或隐藏边栏，按一下锁定常显，再按一下解锁。 |
| ↔️ **Left / Right Edge** | Pin the bar to the left or right edge of your screen. 边栏可以贴左边，也可以贴右边。 |
| 🖥️ **Multi-Monitor** | The bar smoothly follows your cursor when you move the mouse across monitors. 鼠标跨屏幕时，边栏跟着一起过去。 |
| 🖱️ **Drag-to-Sort** | Long-press and drag icons to reorder apps directly — no need to open a manage panel. 长按并拖动图标直接排序，不用进设置面板。 |
| 🧭 **Floating Nav Bar** | Every app window gets a mini nav bar at the top: back, reload, open in browser, hide, close. 每个应用窗口顶部都有个 mini 导航栏：返回、刷新、浏览器打开、隐藏、关闭。 |
| 🍪 **Isolated Sessions** | Each app runs in its own independent WebView. Log into multiple Google accounts at the same time with zero conflicts. 每个应用跑在独立的 WebView 里，同时登几个 Google 账号也不会打架。 |
| 🎨 **Theme System** | 4 built-in presets (Dark / Light / Nord / Dracula) plus fully custom colors. Switch instantly, no restart needed. 4 套内置预设（暗色 / 亮色 / Nord / Dracula）加上完全自定义配色，切换立刻生效，不用重启。 |
| 💾 **Config Export/Import** | Export all your apps and settings to a JSON file, then import it on another machine to restore everything. 把应用和配置一键导出成 JSON，换电脑直接导入就能恢复原样。 |
| 🌐 **Bilingual** | Full English / 简体中文 support across the entire UI, all windows sync the language switch instantly. 完整的英文 / 简体中文支持，所有界面同步切换语言。 |

---

## Roadmap / 之后做什么

This is just the beginning. More features are brewing, but I haven't decided what to build next. Got ideas? Open an issue or drop a suggestion — I'm all ears.  
这才刚起步，后面肯定还会加东西，但具体加啥还没想好。有想法的话开个 Issue 或者在 Discussion 里丢个建议，我都看。

---

## Usage / 怎么用

### Trigger / 触发
Move your mouse to the screen edge (default 12px). The sidebar slides out. Move away, it hides.  
鼠标贴到屏幕边缘（默认 12px）边栏就会出来，移开就缩回去。

### Add App / 添加应用
1. Hover over the sidebar to expand it. 鼠标停到边栏上把它展开。
2. Click the **➕** button at the bottom. 点底部的 **➕**。
3. Enter a name and URL, pick an icon or a random emoji. 填名字和链接，选个图标或随机 emoji。
4. Click **Add**. 点 **添加**，搞定。

### Manage Mode / 管理模式
Click the **⚙️** gear icon to expand the sidebar into manage mode. Here you can:  
点 **⚙️** 展开管理模式，在这里你可以：

- **Drag the ⋮⋮ handle** to reorder apps. 拖动 **⋮⋮** 把手给应用排序。
- **Click 🗑️** to delete an app. 点 **🗑️** 删掉应用。
- **Adjust trigger width** with the slider. 用滑块调触发区域宽度。
- **Switch theme** — Dark, Light, Nord, Dracula, or fully custom. 切换主题：暗色、亮色、Nord、Dracula 或完全自定义。
- **Switch language** between English and 简体中文. 切换界面语言。
- **Switch bar position** — left or right edge. 切换边栏位置：贴左还是贴右。
- **Set a global shortcut** — default is `Ctrl+Shift+Space`. 设置全局快捷键，默认是 `Ctrl+Shift+Space`。
- **Reset to defaults** if you mess things up. 搞砸了可以一键恢复默认。

Click **✓ Done** to collapse back to the slim sidebar.  
点 **✓ 完成** 收起边栏。

### Import from Edge / 从 Edge 导入

Already spent hours curating your Edge sidebar? Don't let that work go to waste.  
之前在 Edge 侧边栏里整理了好久的应用？别浪费了。

1. In Manage Mode, click **"Import from Edge"**. 进管理模式，点 **"从 Edge 导入"**。
2. ToriSidebar scans all your Edge installations — Stable, Beta, Dev, Canary, all profiles. ToriSidebar 会自动扫描你电脑上所有 Edge 版本（稳定版 / Beta / Dev / Canary）和所有用户配置。
3. Select the ones you want, then click **Import**. 勾选想要的，点 **导入**。

### App Window Navigation / 应用窗口导航
Every app opens in its own window with a floating nav bar at the top:  
每个应用都在独立窗口里打开，顶部有个悬浮导航栏：

- **←** Back (hides itself on the first page) 返回（首页自动隐藏）
- **↻** Reload 刷新
- **🌐** Open in external browser 在外部浏览器打开
- **−** Hide window (same as toggling the app off) 隐藏窗口（效果跟再点一次图标一样）
- **✕** Close window 关闭窗口

---

## Tech Stack / 技术栈

What's under the hood / 底层用了啥：

| Ingredient | 配料 | Brand | 品牌 | What It Does | 干啥的 |
|---|---|---|---|---|---|
| 🖥️ Desktop Framework | 桌面框架 | **Tauri v2** (Rust) | **Tauri v2** (Rust) | Handles all the OS grunt work — edge detection, system tray, single-instance lock, smooth animations. | 负责跟 Windows 打交道：贴边检测、系统托盘、单例锁、滑动动画这些脏活累活。 |
| ⚛️ Frontend | 前端框架 | **React 19 + TypeScript** | **React 19 + TypeScript** | The pretty face — icon grid, inline manage mode, add-app modal, all that UI jazz. | 边栏那张脸：图标网格、管理模式、添加弹窗，所有你能看到的 UI。 |
| 🔧 Build Tool | 构建工具 | **Vite** | **Vite** | Faster than Webpack, and faster than my mood swings. | 比 Webpack 快，比我变脸还快。 |
| 🎨 Renderer | 渲染引擎 | **Edge WebView2** | **Edge WebView2** | Yes, I'm using Microsoft's engine to build a replacement for Microsoft's product. The irony is not lost on me. | 没错，我用微软的引擎造了个替代微软产品的玩意。讽刺拉满。 |
| 🦀 Low-level Logic | 底层逻辑 | **Rust + WinAPI** | **Rust + WinAPI** | Multi-monitor detection, mouse trigger zones, slide animations, DWM border compensation — the kind of precision work that would leak memory in any other language. | 多显示器检测、鼠标触发区、滑动动画、DWM 边框补偿……这种精细活在别的语言里第二天就内存泄漏了。 |

---

## Things You Should Know / 你需要知道的

### 🖥️ Multi-Monitor / 多显示器
Multi-monitor support is here, but exotic layouts (2×2 grids, diagonal arrangements) might confuse the bar. Horizontal side-by-side setups work best.  
支持多显示器，但如果你把屏幕摆成 2×2 矩阵或者对角线，边栏可能会懵。左右并排最稳。

### 🖱️ Trigger Zone / 触发区域
Default trigger zone is **12 pixels** from the screen edge. On a 4K display, 12px is basically a hairline, so feel free to crank it up in Manage Mode.  
默认触发区是屏幕边缘往里 **12px**。4K 屏上细得跟头发丝一样，觉得太窄就去管理模式里拉宽。

### 🔒 Single Instance / 单实例
ToriSidebar uses a Windows mutex to ensure only one instance runs. Double-clicking while it's already running will be politely ignored.  
用了 Windows 互斥锁，同时只能跑一个。重复双击会被礼貌地无视。

### 🍪 Login Sessions / 登录状态
Each web app runs in its own independent WebView with isolated cookies. Great for multiple accounts. Password remembering is Windows Credential Manager's job, not mine.  
每个应用都是独立 WebView，Cookie 互相隔离，多账号互不干扰。至于记密码？那是 Windows 凭据管理器的事，不归我管。

### 🐛 Known Quirks / 已知问题
- Vertical taskbar on the right may conflict with the trigger zone. Recommend keeping it at the bottom or left, or reducing trigger width. 任务栏竖着贴在右边可能会和触发区域打架，建议放底下或左边，或者把触发宽度调小。
- Running inside an RDP / remote desktop session is not recommended. WebView2 gets moody in remote sessions. 不建议在远程桌面 / RDP 里用，WebView2 在远程会话里会闹情绪。

---

## Development / 开发

```bash
# Install dependencies
npm install

# Dev mode with hot reload
npm run tauri dev

# Build release binary
npm run tauri build
# Output: src-tauri/target/release/torisidebar.exe
```

Requires Node.js + Rust toolchain. Windows 10/11 ships with WebView2 Runtime.  
需要 Node.js + Rust 环境。Windows 10/11 自带 WebView2 Runtime，不用额外装。

---

## License

MIT + Commons Clause — Use it, modify it, break it, just don't **sell** it. See [LICENSE](./LICENSE) for the full text.  
随便用，随便改，改崩了别找我，但**别拿它卖钱**。

If this tool improves your workflow, toss a ⭐ my way.  
如果这玩意确实帮到了你，赏个 ⭐ 吧，让我知道我不是唯一的受害者。

<p align="center">
  <sub>🐦 Made with spite toward Microsoft and love for the sidebar.</sub>
</p>
