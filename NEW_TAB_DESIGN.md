# ToriSidebar 新标签页打开方案设计文档

> 方案：C — 独立子窗口（Child Window）
> 状态：设计阶段，待实现

---

## 1. 问题背景

当前 ToriSidebar 的每个应用以独立 `WebviewWindow` 承载外部网页。当页面内存在以下行为时：

- `<a href="..." target="_blank">`
- `window.open(url)`
- JavaScript 动态触发的新窗口

WebView2 默认缺乏可控的新窗口处理机制，导致用户点击后**无响应**或**行为不可预期**。这在 Gmail、Notion、微信网页版等场景高频出现，严重影响可用性。

---

## 2. 设计目标

| 优先级 | 目标 |
|--------|------|
| P0 | 拦截所有新窗口请求，不再出现"点不动" |
| P0 | 同域名/同应用内链接在 ToriSidebar 生态内打开 |
| P1 | 子窗口与父应用保持视觉和空间关联 |
| P1 | 父应用关闭时级联清理子窗口 |
| P2 | 外部/异域名链接降级到系统浏览器 |
| P2 | 多显示器场景下子窗口位置正确 |

---

## 3. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         屏幕边缘                              │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │Sidebar  │  │ 父应用窗口    │  │ 子窗口 #1    │           │
│  │ 64px    │  │ App-Notion   │  │ Notion-Page  │  ...      │
│  │         │  │ 480px        │  │ 480px        │           │
│  │ [📧][📝]│  │              │  │              │           │
│  └─────────┘  └──────────────┘  └──────────────┘           │
│                                                             │
│  层级关系：Sidebar → 父应用（左侧紧贴）→ 子窗口（再向左延伸）       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 核心机制

### 4.1 统一注入脚本（JS Injection）

**所有应用窗口**（父窗口 + 子窗口）创建时，都通过 `WebviewWindowBuilder::initialization_script()` 注入统一的前置脚本包，在页面任何业务脚本执行前完成初始化。脚本包包含两个功能模块：

**模块 A：新窗口拦截**

| 目标 | 拦截方式 |
|------|----------|
| `window.open` | 重写全局函数，捕获 URL 和目标名 |
| `target="_blank"` 链接 | 事件捕获阶段监听 `click`，阻止默认行为 |
| `target="_new"` 等 | 同样纳入拦截 |
| `window.location = ...` | **不拦截**（属于当前页导航，非新窗口） |
| `<form target="_blank">` | 监听 `submit` 事件拦截 |

**模块 B：悬浮导航栏（返回 + 关闭）**

在每个窗口顶部注入一条极简悬浮导航栏，提供浏览器级的基础导航能力。详见 [6.2 节](#62-应用窗口的导航栏)。

**通信协议**：

```typescript
// 拦截模块中的调用方式
window.__TAURI_INTERNALS__.invoke("open_child_window", {
  parent_label: "app-notion",     // 父窗口标识，注入时硬编码
  url: "https://www.notion.so/page-id",
  title: "可选的页面标题",         // window.open 的第二个参数
});
```

> **注意**：`__TAURI_INTERNALS__` 的具体 API 路径需在实现时根据 Tauri v2 实际暴露通道确认，可能需调整为 `window.__TAURI__.core.invoke` 或其他形式。

### 4.2 父子窗口关系管理（Rust 端）

Rust 端维护一个全局映射表，记录每个父应用对应的子窗口列表。

```rust
// 伪代码示意
static CHILD_WINDOWS: Mutex<HashMap<String, Vec<String>>> = ...;
// Key:   父窗口 label（如 "app-notion"）
// Value: 子窗口 label 列表（如 ["app-notion-tab-1715062800", ...]）
```

**生命周期规则**：

| 操作 | 父窗口行为 | 子窗口行为 |
|------|-----------|-----------|
| 父窗口 `hide()`（点击图标切换）| 隐藏 | **保持现状**（不隐藏，不关闭）|
| 父窗口 `close()`（管理模式下删除或重置）| 关闭 | **级联关闭全部子窗口** |
| 子窗口 `close()` | 无影响 | 从映射表中移除自身 |
| ESC 键（当前逻辑）| 关闭最后活跃应用 | 扩展：先关闭该应用的最上层子窗口 |
| 应用退出 | 全部关闭 | 全部关闭 |

### 4.3 子窗口创建策略

**Label 命名**：
```
{parent_label}-tab-{timestamp_ms}
// 例如：app-notion-tab-1715062800123
```

**尺寸与位置计算**：

```rust
let child_width: u32 = 480;
let child_height: u32 = parent_size.height;
let child_x: i32 = parent_pos.x - child_width as i32;
let child_y: i32 = parent_pos.y;
```

**边界保护（多显示器/屏幕边缘）**：

创建子窗口前，计算目标位置是否落在有效显示器工作区内。若 `child_x < work_area_left`，则：

- **策略 A**：子窗口向右偏移，层叠在父窗口上方（x = parent_pos.x + 20, y = parent_pos.y + 20）
- **策略 B**：子窗口贴靠屏幕左边缘，高度适当缩小避免溢出
- **默认采用策略 A**，实现简单且用户能感知层级关系。

**窗口样式**：

```rust
WebviewWindowBuilder::new(&app, &child_label, WebviewUrl::External(parsed_url))
    .title(&title)
    .inner_size(child_width as f64, child_height as f64)
    .position(child_x as f64, child_y as f64)
    .decorations(false)          // 无边框
    .always_on_top(true)         // 保持最前
    .skip_taskbar(false)         // 任务栏显示，方便用户找到
    .resizable(true)             // 允许用户拖拽调整
    .maximizable(false)
    .minimizable(false)
    .closable(true)
    .visible(true)
    .build()
```

> `skip_taskbar(false)` 与父窗口不同：子窗口在任务栏可见，避免用户"找不到窗口"。

### 4.4 URL 路由策略（同域 vs 外域）

注入脚本中简单判断：

```javascript
function shouldOpenInternally(url) {
  try {
    const target = new URL(url).hostname;
    const current = window.location.hostname;
    // 同域名，或已知可信子域名（如 mail.google.com vs google.com）
    return target === current || target.endsWith('.' + current);
  } catch {
    return false;
  }
}
```

| 场景 | 处理方式 |
|------|----------|
| 同域名 | 调用 `open_child_window`，内部子窗口打开 |
| 外域名 / 协议不安全 | 调用 `opener::open_url()`，系统浏览器打开 |
| URL 为空 / JavaScript 伪协议 | 忽略 |

---

## 5. 新增/修改的 Rust 命令

```rust
// 创建子窗口
#[tauri::command]
async fn open_child_window(
    app: tauri::AppHandle,
    parent_label: String,
    url: String,
    title: Option<String>,
) -> Result<String, String>;
// 返回：子窗口的 label

// 关闭指定父应用的所有子窗口（供父窗口关闭时调用）
#[tauri::command]
async fn close_child_windows(
    app: tauri::AppHandle,
    parent_label: String,
) -> Result<(), String>;
```

**已有命令的影响范围**：

| 现有命令 | 需调整内容 |
|----------|-----------|
| `toggle_app_window` | 父窗口 `hide()` 时不触达子窗口；父窗口需关闭时先调用 `close_child_windows` |
| `close_app_window` | 关闭父窗口前，先级联关闭其子窗口 |
| `close_all_app_windows` | 遍历所有 `app-*` 窗口时，连带清理各自的子窗口映射 |
| `exit_app` | 无需特别调整，进程退出自动销毁所有窗口 |

---

## 6. 交互细节

### 6.1 ESC 键扩展

当前行为：ESC 关闭最后活跃的应用窗口。

新行为：
1. 若该应用存在可见的子窗口，关闭**最后创建的那个子窗口**（从映射表尾部 pop）
2. 若无子窗口，执行原逻辑（关闭父应用）

### 6.2 应用窗口的导航栏（返回 + 关闭）

所有应用窗口（父窗口 + 子窗口）都是无装饰的（`decorations: false`），因此每个窗口都需要自行提供浏览器级的基础导航能力。通过统一注入脚本（4.1 节）在每个窗口顶部渲染一条极简悬浮导航栏。

**布局**：
```
┌────────────────────────────────────┐
│ ←  │         页面内容区域        │ × │
│    │                             │   │
└────────────────────────────────────┘
```

- **返回按钮**（左上角 `←`）：当 `history.length > 1` 时显示，点击调用 `window.history.back()`
- **关闭按钮**（右上角 `×`）：固定显示，点击关闭当前窗口（父窗口或子窗口都通过 `close_app_window` 命令关闭）

**注入脚本示例**：

```javascript
(function() {
  const bar = document.createElement('div');
  bar.id = '__tori_nav_bar__';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;height:32px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;z-index:999999;pointer-events:none;font-family:sans-serif;';

  // 返回按钮
  const back = document.createElement('div');
  back.innerHTML = '←';
  back.style.cssText = 'width:28px;height:28px;border-radius:6px;background:rgba(0,0,0,0.4);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;cursor:pointer;pointer-events:auto;backdrop-filter:blur(4px);opacity:0;transition:opacity 0.2s;';
  back.onclick = () => window.history.back();
  bar.appendChild(back);

  // 关闭按钮
  const close = document.createElement('div');
  close.innerHTML = '×';
  close.style.cssText = 'width:28px;height:28px;border-radius:6px;background:rgba(239,68,68,0.8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;pointer-events:auto;';
  close.onclick = () => window.__TAURI_INTERNALS__.invoke('close_app_window', { label: '__WINDOW_LABEL__' });
  bar.appendChild(close);

  document.body.appendChild(bar);

  // 监听历史栈变化，控制返回按钮显隐
  const updateBack = () => {
    back.style.opacity = window.history.length > 1 ? '1' : '0';
    back.style.pointerEvents = window.history.length > 1 ? 'auto' : 'none';
  };
  updateBack();
  window.addEventListener('popstate', updateBack);
  // 兜底：定时轮询（应对 SPA 路由变化不触发 popstate 的情况）
  setInterval(updateBack, 500);
})();
```

> `__WINDOW_LABEL__` 需在注入时由 Rust 模板替换为实际窗口 label（父窗口如 `app-notion`，子窗口如 `app-notion-tab-1715062800`）。

**设计细节**：
- 导航栏背景透明 + `pointer-events: none`，不遮挡页面内容的点击和滚动
- 按钮单独开启 `pointer-events: auto`，确保可点击
- 返回按钮在无历史可回时隐藏（`opacity: 0`），避免视觉干扰
- 对于强 SPA（如 Gmail、Notion），`history.length` 可能不可靠，后续可考虑接入 WebView2 原生 `CanGoBack` API 作为更精确的判断依据

**父窗口的特殊考量**：
- 父窗口目前通过 `toggle_app_window` 创建，需补充 `initialization_script` 参数注入上述脚本包
- 关闭父窗口时，前端调用 `close_app_window` → Rust 端先级联关闭其子窗口，再关闭父窗口本身

---

## 7. 多显示器考量

子窗口创建时：

1. 通过 `get_mouse_monitor_work_area`（复用现有函数）获取当前鼠标所在显示器的工作区
2. 若 `child_x < work_left` 或 `child_x + child_width > work_right`，触发边界保护策略
3. 子窗口的 `always_on_top` 和父窗口同级，不会跨显示器时被其他窗口遮挡

---

## 8. 降级与兜底

| 异常情况 | 兜底行为 |
|----------|----------|
| JS 注入失败（页面 CSP 限制）| 无拦截，表现与现在一致（不可控）|
| Rust 创建子窗口失败 | 调用 `opener::open_url()` 在系统浏览器打开 |
| 子窗口位置计算溢出屏幕 | 层叠在父窗口上方（策略 A）|
| 注入脚本与页面脚本冲突 | 使用 `try/catch` 包裹，确保不阻断页面主逻辑 |

---

## 9. 实现顺序建议

```
Step 1: 父窗口注入脚本 + open_child_window 命令（同域内开子窗口）
Step 2: 父子映射表 + 级联关闭逻辑
Step 3: 子窗口导航栏注入（返回 + 关闭按钮）+ ESC 键扩展
Step 4: 外域链接降级到系统浏览器
Step 5: 多显示器边界保护 + 位置层叠策略
Step 6: QA 测试（Gmail、Notion、GitHub、微信等典型场景）
```

---

## 10. 风险与注意事项

1. **Tauri v2 API 变动**：`initialization_script` 和 `__TAURI_INTERNALS__` 的具体调用方式需在实现时对照官方文档确认。
2. ** Shadow DOM 链接**：标准的事件捕获可以穿透 Shadow DOM，但如果页面使用自定义元素完全重写了点击分发，可能存在漏网之鱼。
3. **性能**：每个子窗口都是独立 WebView 进程，同应用开 5+ 个子窗口时内存占用会线性增长。这是可预期的限制，非 bug。
4. **窗口焦点**：子窗口获得焦点时，父窗口不应失焦到后台（`always_on_top` 已保障）。
5. **与现有动画线程的隔离**：子窗口不参与 `animate_bar` 和 `start_auto_hide` 的自动隐藏逻辑，它们是常驻可见的，除非用户主动关闭。

---

## 附录：文件预计改动清单

| 文件 | 动作 | 说明 |
|------|------|------|
| `src-tauri/src/lib.rs` | 修改 | 新增命令、父子映射表、窗口创建/关闭逻辑 |
| `src/App.tsx` | 可能修改 | ESC 键逻辑扩展（或移至 Rust 端统一处理）|
| `src-tauri/Cargo.toml` | 确认 | 确保 `opener` 插件已启用（当前已有）|
| `src-tauri/tauri.conf.json` | 可能修改 | 如有新增权限需声明 |

---

*文档版本：v1.0*
*创建日期：2026-05-07*
