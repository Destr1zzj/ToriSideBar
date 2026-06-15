use std::collections::HashMap;
use tauri::{AppHandle, Manager};

const STATE_FILE: &str = "window-states.json";

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct WindowState {
    pub y: i32,
    pub width: u32,
    pub height: u32,
    #[serde(default)]
    pub x: i32,
}

fn state_path() -> std::path::PathBuf {
    std::env::var("APPDATA")
        .map(|p| std::path::PathBuf::from(p).join("ToriSidebar"))
        .unwrap_or_else(|_| std::env::temp_dir().join("ToriSidebar"))
        .join(STATE_FILE)
}

pub fn load_all() -> HashMap<String, WindowState> {
    let path = state_path();
    if !path.exists() {
        return HashMap::new();
    }
    std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_all(states: &HashMap<String, WindowState>) {
    let path = state_path();
    let _ = std::fs::create_dir_all(path.parent().unwrap());
    if let Ok(json) = serde_json::to_string_pretty(states) {
        let _ = std::fs::write(&path, json);
    }
}

pub fn get(label: &str) -> Option<WindowState> {
    load_all().get(label).cloned()
}

pub fn get_note(label: &str) -> Option<WindowState> {
    load_all().get(label).cloned()
}

pub fn save(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.inner_size()) {
            let mut all = load_all();
            all.insert(
                label.to_string(),
                WindowState {
                    y: pos.y,
                    width: size.width,
                    height: 0, // height is always derived from sidebar, never saved
                    x: 0,
                },
            );
            save_all(&all);
        }
    }
}

pub fn save_note(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if let (Ok(pos), Ok(size)) = (window.outer_position(), window.inner_size()) {
            let mut all = load_all();
            all.insert(
                label.to_string(),
                WindowState {
                    x: pos.x,
                    y: pos.y,
                    width: size.width,
                    height: size.height,
                },
            );
            save_all(&all);
        }
    }
}

pub fn reset_all() {
    let path = state_path();
    let _ = std::fs::remove_file(&path);
}

pub fn reset_one(label: &str) {
    let mut all = load_all();
    if all.remove(label).is_some() {
        save_all(&all);
    }
}
