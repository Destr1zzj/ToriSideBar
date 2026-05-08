# 🗺️ ToriSidebar Roadmap / 开发路线图

> Upcoming features and improvements for ToriSidebar.
> ToriSidebar 的未来功能与改进计划。

---

## 📋 Planned Features / 计划功能

| Priority | Feature (EN) | 功能 (ZH) | Status |
|----------|-------------|-----------|--------|
| 🔴 High | **Drag-and-Drop Sorting** | **拖动排序** | Planned |
| 🟡 Medium | **Subpage / Child Window Support** | **子页面/子窗口支持** | Planned |
| 🟡 Medium | **Gadgets Collection — Sticky Notes** | **小工具合集 — 便签** | Planned |
| 🟢 Low | **AI API Integration** | **AI 接口集成** | Backlog |

---

## 🔴 High Priority / 高优先级

### Drag-and-Drop Sorting / 拖动排序

**Current pain point / 当前痛点:**
- The current sorting method (using ↑/↓ buttons in manage mode) is cumbersome and slow.
- 目前的排序方式（管理模式中的 ↑/↓ 按钮）操作繁琐、效率低下。

**Goal / 目标:**
- Allow users to reorder sidebar apps by simply dragging and dropping icons.
- 允许用户通过拖拽图标直接调整侧边栏应用顺序。

**Technical notes / 技术要点:**
- Implement HTML5 Drag and Drop API or a lightweight DnD library.
- Persist new order to `localStorage` immediately after drop.
- Ensure smooth visual feedback during drag.
- 使用 HTML5 拖放 API 或轻量级 DnD 库实现。
- 拖放完成后立即将新顺序持久化到 `localStorage`。
- 拖拽过程中提供流畅的视觉反馈。

---

## 🟡 Medium Priority / 中优先级

### Subpage / Child Window Support / 子页面/子窗口支持

**Description / 描述:**
- Open secondary pages (e.g., a specific email thread, a chat room) in a child window attached to the main sidebar, rather than spawning a full independent window.
- 在主侧边栏中打开二级页面（例如特定邮件会话、聊天室），而非弹出完全独立的窗口。

**Use cases / 使用场景:**
- Clicking a notification opens a compact reply panel.
- Deep-linking into a specific Notion page without losing the main sidebar context.
- 点击通知后打开紧凑的回复面板。
- 深度链接到特定 Notion 页面，同时保留主侧边栏上下文。

**Technical notes / 技术要点:**
- Tauri WebView windows can be created with a parent-child relationship.
- Child windows should inherit sidebar styling and follow the sidebar across monitors.
- Consider a slide-out panel UI within the sidebar itself as an alternative.
- Tauri WebView 窗口可以创建父子关系。
- 子窗口应继承侧边栏样式，并跟随侧边栏跨显示器移动。
- 也可考虑在侧边栏内部实现滑出面板 UI。

**Sub-feature: Back Navigation / 子功能：返回按钮**
- All app windows (parent + child) are frameless, so a floating nav bar with **back** and **close** buttons will be injected via `initialization_script`.
- Back button (`←`) appears when `history.length > 1` and triggers `window.history.back()`.
- Close button (`×`) closes the current window.
- 所有应用窗口（父窗口 + 子窗口）均无边框，因此通过 `initialization_script` 注入悬浮导航栏，包含**返回**和**关闭**按钮。
- 返回按钮（`←`）在 `history.length > 1` 时显示，触发 `window.history.back()`。
- 关闭按钮（`×`）关闭当前窗口。

---

### Gadgets Collection — Sticky Notes / 小工具合集 — 便签

**Description / 描述:**
- A built-in suite of lightweight utilities living inside the sidebar.
- First gadget: **Sticky Notes** (quick memos, always one click away).
- 一套内置的轻量级工具合集，常驻于侧边栏内。
- 第一款工具：**便签**（快速备忘录，一键可达）。

**Planned gadgets / 计划中的工具:**
- 📝 Sticky Notes / 便签 — Quick text memos with color labels.
- ⏰ Timer / 计时器 — Simple countdown timer.
- 📋 Clipboard History / 剪贴板历史 — *(Future)* Recently copied items.
- 📝 便签 — 带颜色标签的快速文本备忘录。
- ⏰ 计时器 — 简单的倒计时。
- 📋 剪贴板历史 — *(未来)* 最近复制的内容。

**Technical notes / 技术要点:**
- Gadgets are mini React components rendered inside the sidebar (manage mode or a dedicated gadgets panel).
- Data stored in `localStorage` or Tauri persisted store.
- Sticky notes: rich text optional, drag-to-reorder within the notes list.
- 小工具是渲染在侧边栏内部的迷你 React 组件（管理模式或专用小工具面板）。
- 数据存储在 `localStorage` 或 Tauri 持久化存储中。
- 便签：可选富文本，支持在便签列表内拖拽排序。

---

## 🟢 Low Priority / 低优先级

### AI API Integration / AI 接口集成

**Description / 描述:**
- Integrate AI chat / completion APIs directly into the sidebar for quick queries without opening a browser.
- 将 AI 聊天/补全接口直接集成到侧边栏，无需打开浏览器即可快速查询。

**Why low priority? / 为何优先级低?**
- Most AI services (ChatGPT, Claude, etc.) already have excellent web apps that work perfectly as sidebar items.
- 目前大多数 AI 服务（ChatGPT、Claude 等）已有优秀的网页版，作为侧边栏项使用效果已经足够好。

**Future possibilities / 未来可能性:**
- Custom local LLM endpoint (Ollama, LM Studio) for offline use.
- Quick-action AI: summarize selected text, translate, etc.
- 自定义本地 LLM 端点（Ollama、LM Studio）实现离线使用。
- 快捷 AI 操作：总结选中文本、翻译等。

**Status / 状态:** Backlog — will revisit if there is strong demand or a compelling offline use case.

---

## 📅 Release Targets / 发布目标

| Version | Focus / 重点 | ETA |
|---------|-------------|-----|
| v0.2.0 | Drag-and-Drop Sorting + Subpage Support / 拖动排序 + 子页面支持 | TBD |
| v0.3.0 | Gadgets Collection (Sticky Notes) / 小工具合集（便签） | TBD |
| v0.4.0 | AI API Integration / AI 接口集成 | TBD |

---

## 💬 Feedback & Suggestions / 反馈与建议

Have an idea? Open an issue or drop a message.
有想法？欢迎提交 Issue 或留言。

---

<p align="center">
  <sub>🐦 Built with spite toward Microsoft and love for the sidebar.</sub>
</p>
