## v1.4.0 — Sticky Notes / 桌面便签

### What's New / 新功能

**📝 Sticky Notes / 桌面便签**

- Add standalone sticky-note windows with file-based `.md` persistence / 新增独立便签窗口，内容以 `.md` 文件持久化保存
- Integrate Vditor IR mode for Typora-like Markdown editing / 集成 Vditor IR 模式，实现类似 Typora 的实时预览式 Markdown 编辑
- Note title is auto-extracted from the first line of content / 便签标题自动取自内容第一行
- Support common Markdown syntax: headings, lists, task lists, bold/italic, code, links, tables / 支持常用 Markdown 语法：标题、列表、任务列表、粗体斜体、代码、链接、表格等
- Add note opacity slider in widget settings / 边栏小工具设置中新增便签透明度调节滑块
- Add pin/unpin and quick todo insertion buttons in note titlebar / 便签标题栏新增置顶/取消置顶和快速插入待办按钮
- New custom icons for tools, pin, and unpin / 新增小工具、置顶、取消置顶三套图标
- Note window and titlebar are transparent to show desktop wallpaper / 便签窗口和标题栏均支持透明，可透出桌面壁纸
- Migrate legacy localStorage notes to `.md` files / 自动将旧版 localStorage 便签迁移为 `.md` 文件

### Version Bump / 版本更新

- `package.json`: `1.3.0` → `1.4.0`
- `Cargo.toml`: `1.3.0` → `1.4.0`
- `tauri.conf.json`: `1.3.0` → `1.4.0`
