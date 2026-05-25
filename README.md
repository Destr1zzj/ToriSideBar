# 🐦 ToriSidebar

> Microsoft killed Edge's sidebar. So I built my own.
>
> — A regular user who's been gaslit by big tech one too many times

---

## Why Does This Exist?

Here's the thing: Microsoft Edge had this neat little sidebar feature. You know the one — tucked away at the edge of your screen, slides out when your mouse gets close, keeps your favorite web apps within a pixel's reach. Peak productivity (and peak procrastination).

Then Microsoft killed it.

Just like that. One day it's there, the next day it's on the chopping block. Meanwhile, the Copilot button is permanently glued to your toolbar like an unwanted houseguest who doesn't understand subtle hints.

**So I decided to build my own.**

It started as a quick hack to fill the void. But then... multi-monitor support, background session persistence, automatic favicon fetching, drag-to-sort, one-click Edge import — one thing led to another, and now it's somehow better than the original.

The name "Tori" (鳥) means "bird" in Japanese 🐦, because this thing behaves like one: quietly perched at the edge of your screen, invisible until you need it, then *whoosh* — there it is.

---

## Quick Start / 快速开始

Too impatient to read? I respect that.

1. Go to [**Releases**](https://github.com/Destr1zzj/ToriSideBar/releases) and grab `ToriSidebar_new.exe`.
2. Double-click it. That's it. No installer, no registry keys, no "would you like to install Bing Bar?"
3. Move your mouse to the **right edge** of your screen. The sidebar slides out like a shy cat.

去 [**Releases**](https://github.com/Destr1zzj/ToriSideBar/releases) 下载 `ToriSidebar_new.exe`，双击运行。把鼠标滑到屏幕**右边缘**，边栏就会像害羞的猫一样探出来。

---

## Features / 功能亮点

| Feature | Description / 描述 |
|---------|--------------------|
| 📥 **Edge Bar Import** | One-click import your custom apps from Edge sidebar (Stable / Beta / Dev / Canary, all profiles). 一键从 Edge 侧边栏导入自定义应用（支持正式版 / Beta / Dev / Canary 及所有用户配置）。 |
| 🖱️ **Drag-to-Sort** | Drag icons to reorder apps directly — no manage panel needed. 直接拖动图标排序，无需打开管理面板。 |
| ✨ **Live Drag Animation** | Dragged item follows cursor with scale-up; others slide out of the way. 被拖动项放大跟随光标，其他项平滑让位。 |
| 📜 **Auto-Scroll List** | List auto-scrolls when dragging near top/bottom edges. 靠近顶部/底部边缘时列表自动滚动。 |
| 🖥️ **Multi-Monitor** | Bar teleports smoothly between monitors as you move the mouse. 鼠标跨显示器时边栏平滑跟随。 |
| 🌐 **Bilingual** | Full English / 简体中文 support, synced across all windows. 完整的英语 / 简体中文支持，全窗口同步。 |
| ➕ **Add Custom Apps** | Type a URL, pick a favicon or random emoji, done. 输入网址，选一个图标或随机 emoji，搞定。 |
| 🛠️ **Manage Mode** | Expand the bar to adjust trigger width, reset apps, or import from Edge. 展开边栏调整触发宽度、重置应用或从 Edge 导入。 |
| 👁️ **Auto-Hide** | Sidebar hides when you're not looking, slides out when you are. 你不看它的时候它藏起来，你看它的时候它出现。 |
| 🧭 **Floating Nav Bar** | Every app window gets a mini nav bar: back, reload, open in browser, close. 每个应用窗口自带悬浮导航栏：返回、刷新、浏览器打开、关闭。 |
| 🔙 **Smart Back Button** | Back button auto-hides when `history.length <= 1`. 历史记录只有一页时自动隐藏返回按钮。 |
| 🗂️ **Child Windows** | Same-domain links open in a child window instead of a new browser tab. 同域链接在子窗口打开，不弹浏览器标签页。 |
| 🍪 **Isolated Sessions** | Each app runs in its own WebView — multiple Google accounts, no problem. 每个应用独立 WebView，多账号无冲突。 |
| 🎭 **Emoji Icon Fallback** | When favicon fails to load, automatically falls back to a random emoji. Favicon 加载失败时自动回退到随机 emoji。 |

---

## How to Use / 使用指南

### 🖱️ Trigger the Sidebar / 触发边栏
Move your mouse to the **right edge** of your screen (within 12px by default). The sidebar slides out. Move away, it hides. Like a well-trained butler.

把鼠标移到屏幕**右边缘**（默认 12px 范围内），边栏滑出。移开，它藏起来。像个训练有素的管家。

### ➕ Add an App / 添加应用
1. Hover over the sidebar to expand it.
2. Click the **➕** button at the bottom.
3. Enter a name and URL, pick a favicon source or random emoji.
4. Click **Add**. It's now in your sidebar.

1. 鼠标悬停展开边栏。
2. 点击底部 **➕** 按钮。
3. 输入名称和网址，选择图标来源或随机 emoji。
4. 点击**添加**。

### 📥 Import from Edge / 从 Edge 导入
Already spent hours curating your Edge sidebar? Don't let that work go to waste.

1. Click the **⚙️** button to enter **Manage Mode**.
2. Click **"Import from Edge"**.
3. ToriSidebar scans your Edge installation(s) — Stable, Beta, Dev, Canary, all profiles — and shows your custom apps.
4. Select the ones you want (or hit **Select All**), then click **Import**.

已经在 Edge 侧边栏里花 hours 整理过应用了？别浪费。

1. 点击 **⚙️** 进入**管理模式**。
2. 点击**"从 Edge 导入"**。
3. ToriSidebar 会扫描你电脑上的所有 Edge 版本（正式版 / Beta / Dev / Canary）及所有用户配置，列出你的自定义应用。
4. 勾选想要的（或点**全选**），然后点击**导入**。

### 🛠️ Manage Mode / 管理模式
Click the **⚙️** gear icon to expand the sidebar into manage mode. Here you can:
- **Drag the ⋮⋮ handle** to reorder apps.
- **Click 🗑️** to delete an app.
- **Adjust trigger width** with the slider.
- **Switch language** between English and 简体中文.
- **Reset to defaults** if you mess things up.
- **Import from Edge** as described above.

点击 **⚙️** 进入管理模式。在这里你可以：
- **拖动 ⋮⋮ 把手**排序应用。
- **点击 🗑️** 删除应用。
- **调整触发宽度**滑块。
- **切换语言**。
- **恢复默认**设置。
- **从 Edge 导入**应用。

Click **✓ Done** to collapse back to the slim sidebar.

点击 **✓ 完成** 收起边栏。

### 🖱️ Drag-to-Sort / 拖动排序
In **normal mode**, long-press any app icon and drag it to a new position. Other icons slide out of the way like they're afraid of you. Release to drop.

在**正常模式**下，长按任意应用图标并拖动到新位置。其他图标会像怕你一样自动让开。松手即放置。

### 🧭 App Window Navigation / 应用窗口导航
Every app opens in its own window with a floating nav bar at the top:
- **←** Back (hides itself on the first page)
- **↻** Reload
- **🌐** Open in external browser
- **✕** Close window

每个应用在独立窗口中打开，顶部有悬浮导航栏：
- **←** 返回（首页自动隐藏）
- **↻** 刷新
- **🌐** 用浏览器打开
- **✕** 关闭窗口

---

## What's Under the Hood

Our ingredient list, presented in the style of a bubble tea shop menu:

| Ingredient | Brand | What It Does |
|------------|-------|--------------|
| 🖥️ Desktop Framework | **Tauri v2** (Rust) | Handles all the OS grunt work — edge detection, system tray, single-instance lock, smooth animations |
| ⚛️ Frontend | **React 19 + TypeScript** | The pretty face — icon grid, inline manage mode, add-app modal, all that UI jazz |
| 🔧 Build Tool | **Vite** | Faster than Webpack, and faster than my mood swings |
| 🎨 Renderer | **Edge WebView2** | Yes, I'm using Microsoft's engine to build a replacement for Microsoft's product. The irony is not lost on me. |
| 🦀 Low-level Logic | **Rust + WinAPI** | Multi-monitor detection, mouse trigger zones, slide animations — the kind of precision work that would leak memory in any other language |

Directory layout / 项目结构：

```
edge-sidebar/
├── src/                        # React frontend
│   ├── components/             # Reusable UI components / 可复用 UI 组件
│   ├── hooks/                  # Custom React hooks / 自定义 Hooks
│   ├── types/                  # Shared TypeScript types / 共享类型
│   ├── utils/                  # Utility functions / 工具函数
│   ├── locales/                # i18n translations / 国际化翻译
│   ├── App.tsx                 # Main UI composition / 主界面组合
│   ├── App.css                 # Dark mode styling / 暗黑主题样式
│   └── main.tsx                # Entry point / 入口
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Entry: plugin setup, tray, invoke handler / 入口
│   │   ├── state.rs            # Global atomic variables / 全局原子变量
│   │   ├── monitor.rs          # Mouse & screen utilities / 鼠标与屏幕工具
│   │   ├── inject.rs           # JS injection constant / JS 注入常量
│   │   ├── animation.rs        # Auto-hide & slide threads / 自动隐藏与滑动线程
│   │   ├── window.rs           # Window management commands / 窗口管理命令
│   │   └── commands.rs         # Misc commands + single-instance lock / 杂项命令
│   ├── inject/
│   │   └── navbar.js           # Floating nav bar script / 悬浮导航栏脚本
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── ...
├── release/
│   └── ToriSidebar_new.exe     # The finished product. Double-click and go. / 成品，双击即用
└── README.md
```

---

## Things You Should Know (Aka The Fine Print)

### 🖥️ Multi-Monitor Users

Multi-monitor support is here, but if your setup looks like a mission control center (2×2 grid, diagonal arrangements, that sort of thing), the bar might get confused. **Horizontal arrangements** (side-by-side) work best. If you've got three monitors arranged like a fighter jet cockpit... hey, it'll probably work, but no promises.

### 🖱️ Trigger Zone

Default trigger zone is **12 pixels** from the right edge of your screen. On a 4K display, 12px is basically a hairline, so feel free to crank it up in manage mode. There's a slider. Drag it until it feels right.

### 🔒 Single Instance

ToriSidebar uses a Windows named mutex to ensure only one instance runs. If you double-click the exe while it's already running, it will **politely ignore you** instead of spawning a second bar. This is not a bug; it's a feature. You're welcome.

### 🍪 Login Sessions

Each web app runs in its own **independent WebView window** with isolated cookies. This means:
- ✅ You can be logged into two different Google accounts simultaneously
- ✅ OAuth / social login works without throwing weird errors
- ⚠️ If you expect it to remember passwords... that's Windows Credential Manager's job, not mine

### 🌐 Language

ToriSidebar is now fully bilingual. The default language is **English**. To switch to Chinese:

1. Click the ⚙️ button to enter manage mode.
2. Select your preferred language in the **Language** section.
3. Your choice is saved automatically.

The setting applies to the sidebar UI, all modals, the tray menu, and even the floating navigation bar inside app windows.

### 🐛 Known Quirks

- Occasionally when teleporting across monitors, the bar might flash for a split second. This is a Windows window manager thing. I don't make the rules, I just work around them.
- If your taskbar is vertically docked on the right side, the trigger zone and taskbar will have a territorial dispute. Recommend keeping the taskbar at the bottom or left, or reducing the trigger width.
- Running inside an RDP / remote desktop session is not recommended. WebView2 gets moody in remote sessions.

---

## Development

If you want to tinker:

```bash
# 1. Install dependencies
npm install

# 2. Dev mode with hot reload
npm run tauri dev

# 3. Build release binary
npm run tauri build
# Output: src-tauri/target/release/edge-sidebar.exe
```

Requires Node.js + Rust toolchain. Windows 10/11 ships with WebView2 Runtime, so no extra installs needed.

---

## License

MIT + Commons Clause — Use it, modify it, break it, just don't **sell** it. See [LICENSE](./LICENSE) for the full text.

But if this tool actually improves your workflow, toss a ⭐ my way. It lets me know I'm not the only one who misses that sidebar.

---

<p align="center">
  <sub>🐦 Made with spite toward Microsoft and love for the sidebar.</sub>
</p>
