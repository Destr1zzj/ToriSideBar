## v1.4.2 — Sticky Note Task List Backspace Fix / 便签任务列表退格修复

### Fixed / 修复

- 🐛 **Task list backspace stuck** — In the sticky note editor, pressing `Backspace` inside an empty task-list item (created by pressing `Enter` on a checkbox line) no longer gets stuck. The empty item is now removed correctly. 修复便签编辑器中，任务列表空项按退格键无法删除、光标卡死的问题。

### Version Bump / 版本更新

- `package.json`: `1.4.1` → `1.4.2`
- `Cargo.toml`: `1.4.1` → `1.4.2`
- `tauri.conf.json`: `1.4.1` → `1.4.2`
