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

## What's Under the Hood

Our ingredient list, presented in the style of a bubble tea shop menu:

| Ingredient | Brand | What It Does |
|------------|-------|--------------|
| 🖥️ Desktop Framework | **Tauri v2** (Rust) | Handles all the OS grunt work — edge detection, system tray, single-instance lock, smooth animations |
| ⚛️ Frontend | **React 19 + TypeScript** | The pretty face — icon grid, settings panel, modals, all that UI jazz |
| 🔧 Build Tool | **Vite** | Faster than Webpack, and faster than my mood swings |
| 🎨 Renderer | **Edge WebView2** | Yes, I'm using Microsoft's engine to build a replacement for Microsoft's product. The irony is not lost on me. |
| 🦀 Low-level Logic | **Rust + WinAPI** | Multi-monitor detection, mouse trigger zones, slide animations — the kind of precision work that would leak memory in any other language |

Directory layout:

```
edge-sidebar/
├── src/                    # React frontend — responsible for looking good
│   ├── App.tsx             # Main UI: icon list + all the modals
│   ├── App.css             # Dark mode that actually looks decent
│   └── main.tsx            # Entry point. Does entry point things.
├── src-tauri/              # Rust backend — responsible for doing the heavy lifting
│   ├── src/
│   │   └── lib.rs          # Core logic: auto-hide animations, multi-monitor support, tray icon, single-instance enforcement
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # Window config: 64px wide, transparent, frameless, always-on-top
│   └── ...                 # Icons, assets, etc.
├── release/
│   └── ToriSidebar.exe     # The finished product. Double-click and go.
└── README.md               # You're reading it right now
```

---

## Things You Should Know (Aka The Fine Print)

### 🖥️ Multi-Monitor Users

Multi-monitor support is here, but if your setup looks like a mission control center (2×2 grid, diagonal arrangements, that sort of thing), the bar might get confused. **Horizontal arrangements** (side-by-side) work best. If you've got three monitors arranged like a fighter jet cockpit... hey, it'll probably work, but no promises.

### 🖱️ Trigger Zone

Default trigger zone is **30 pixels** from the right edge of your screen. On a 4K display, 30px is basically a hairline, so feel free to crank it up in the settings panel. There's a slider. Drag it until it feels right.

### 🔒 Single Instance

ToriSidebar uses a Windows named mutex to ensure only one instance runs. If you double-click the exe while it's already running, it will **politely ignore you** instead of spawning a second bar. This is not a bug; it's a feature. You're welcome.

### 🍪 Login Sessions

Each web app runs in its own **independent WebView window** with isolated cookies. This means:
- ✅ You can be logged into two different Google accounts simultaneously
- ✅ OAuth / social login works without throwing weird errors
- ⚠️ If you expect it to remember passwords... that's Windows Credential Manager's job, not mine

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

MIT — Use it, modify it, break it, just don't @ me if it breaks.

But if this tool actually improves your workflow, toss a ⭐ my way. It lets me know I'm not the only one who misses that sidebar.

---

<p align="center">
  <sub>🐦 Made with spite toward Microsoft and love for the sidebar.</sub>
</p>
