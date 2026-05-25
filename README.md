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

It started as a quick hack to fill the void. But then... multi-monitor support, background session persistence, automatic favicon fetching, random emoji icons — one thing led to another, and now it's somehow better than the original.

The name "Tori" (鳥) means "bird" in Japanese 🐦, because this thing behaves like one: quietly perched at the edge of your screen, invisible until you need it, then *whoosh* — there it is.

---

## Features / 功能亮点

| Feature | Description / 描述 |
|---------|--------------------|
| 🖱️ **Drag-to-Sort** | Drag icons to reorder apps directly — no manage panel needed. 直接拖动图标排序，无需管理面板。 |
| ✨ **Live Drag Animation** | Dragged item follows cursor with scale-up; others slide out of the way. 被拖动项放大跟随光标，其他项平滑让位。 |
| 📜 **Auto-Scroll List** | List auto-scrolls when dragging near top/bottom edges. 靠近顶部/底部边缘时列表自动滚动。 |
| 🖥️ **Multi-Monitor** | Bar teleports smoothly between monitors as you move the mouse. 鼠标跨显示器时边栏平滑跟随。 |
| 🌐 **Bilingual** | Full English / 简体中文 support, synced across all windows. 完整的英语 / 简体中文支持，全窗口同步。 |
| 🔙 **Smart Back Button** | Nav bar back button hides when `history.length <= 1`. 历史记录只有一页时自动隐藏返回按钮。 |
| 🍪 **Isolated Sessions** | Each app runs in its own WebView — multiple Google accounts, no problem. 每个应用独立 WebView，多账号无冲突。 |

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
│   └── ToriSidebar.exe         # The finished product. Double-click and go. / 成品，双击即用
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

### 🏗️ Development

If you want to tinker:

```bash
# 1. Install dependencies
npm install

# 2. Dev mode with hot reload
npm run tauri dev

# 3. Build release binary
npm run build
cd src-tauri && cargo build --release
# Output: src-tauri/target/release/torisidebar.exe
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
