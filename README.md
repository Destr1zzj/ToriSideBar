# Edge Sidebar

基于 **Tauri v2 + React + TypeScript** 开发的桌面边栏应用，替代 Microsoft Edge 即将停用的 Sidebar 功能。

## 功能特性

- **贴边悬浮边栏** — 64px 窄条固定在屏幕右侧，无边框、透明背景、始终置顶
- **独立 WebView 窗口** — 点击图标在边栏内侧展开 480px 窗口，原生 WebView2 渲染
- **后台保活** — 隐藏窗口后 WebView 会话保持，再次打开秒开不重新加载
- **自动缩回** — 鼠标离开边栏区域后自动隐藏，靠近屏幕右边缘自动呼出
- **触发像素可调** — 在设置中自定义触发边栏弹出的像素宽度
- **自动获取 Favicon** — 添加应用时自动从网页获取图标
- **任务栏展示** — 打开的应用窗口在 Windows 任务栏中显示
- **社交登录兼容** — 网页应用独立窗口运行，Cookie/登录状态正常
- **深色主题** — 近似 Edge Sidebar 的视觉风格

## 项目结构

```
edge-sidebar/
├── src/                    # React 前端源码
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── src-tauri/             # Rust 后端源码
│   ├── src/
│   │   └── lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── ...
├── release/               # 发行产物
│   ├── EdgeSidebar.exe    # 可执行文件
│   └── README.md          # 使用说明
├── start.bat              # 启动脚本
├── start.vbs
├── package.json
└── README.md
```

## 开发环境

### 要求

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install)
- Windows 10/11（已内置 WebView2 Runtime）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

### 构建发行版

```bash
npm run build
cd src-tauri
cargo build --release
```

构建完成后，将 `src-tauri/target/release/edge-sidebar.exe` 复制到 `release/` 目录。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| 桌面框架 | Tauri v2 (Rust) |
| 渲染引擎 | Microsoft Edge WebView2 |

## License

MIT
