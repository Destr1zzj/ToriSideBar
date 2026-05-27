use tauri::{AppHandle, Manager};

use crate::state::*;

// ------------------------------------------------------------------
// Trigger width
// ------------------------------------------------------------------

#[tauri::command]
pub async fn set_trigger_width(width: u32) -> Result<(), String> {
    let w = width.max(1).min(200);
    TRIGGER_WIDTH.store(w, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn get_trigger_width() -> Result<u32, String> {
    Ok(TRIGGER_WIDTH.load(std::sync::atomic::Ordering::SeqCst))
}

// ------------------------------------------------------------------
// Dragging state (pauses auto-hide)
// ------------------------------------------------------------------

#[tauri::command]
pub async fn set_dragging(dragging: bool) {
    crate::state::DRAGGING.store(dragging, std::sync::atomic::Ordering::SeqCst);
}

// ------------------------------------------------------------------
// External URL / Exit / Language sync
// ------------------------------------------------------------------

#[tauri::command]
pub async fn open_external_url(url: String) -> Result<(), String> {
    tauri_plugin_opener::open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn exit_app(app: AppHandle) {
    app.exit(0);
}

/// Sync language for all open app windows by updating injected nav bar titles.
#[tauri::command]
pub async fn sync_language(app: AppHandle, lang: String) -> Result<(), String> {
    let script = format!(
        r#"(function() {{
  localStorage.setItem('tori-sidebar-language', '{}');
  const texts = {{
    back: {{ en: 'Back', zh: '返回' }},
    reload: {{ en: 'Reload', zh: '刷新' }},
    openExternal: {{ en: 'Open in browser', zh: '用浏览器打开' }},
    close: {{ en: 'Close', zh: '关闭' }},
  }};
  const bar = document.getElementById('__tori_nav_bar__');
  if (!bar) return;
  const btns = bar.querySelectorAll('button');
  if (btns[0]) btns[0].title = texts.back['{}'] || texts.back['en'];
  if (btns[1]) btns[1].title = texts.reload['{}'] || texts.reload['en'];
  if (btns[2]) btns[2].title = texts.openExternal['{}'] || texts.openExternal['en'];
  if (btns[3]) btns[3].title = texts.close['{}'] || texts.close['en'];
}})();"#,
        lang, lang, lang, lang, lang
    );
    for (label, window) in app.webview_windows() {
        if label.starts_with("app-") {
            let _ = window.eval(&script);
        }
    }
    Ok(())
}

// ------------------------------------------------------------------
// Bar position (left / right)
// ------------------------------------------------------------------

#[tauri::command]
pub fn set_bar_position(position: String) {
    let val = if position == "left" { 0u8 } else { 1u8 };
    crate::state::BAR_POSITION.store(val, std::sync::atomic::Ordering::SeqCst);
}

#[tauri::command]
pub fn get_bar_position() -> String {
    match crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) {
        0 => "left".to_string(),
        _ => "right".to_string(),
    }
}

// ------------------------------------------------------------------
// Toggle bar visible / hidden
// ------------------------------------------------------------------

#[tauri::command]
pub fn toggle_bar_visible() {
    // First-run: dismiss guide on shortcut trigger
    if crate::state::FIRST_RUN_GUIDE_ACTIVE.load(std::sync::atomic::Ordering::SeqCst) {
        crate::state::FIRST_RUN_GUIDE_ACTIVE.store(false, std::sync::atomic::Ordering::SeqCst);
        crate::commands::mark_first_run_seen();
        crate::guide_native::close_guide();
    }

    let locked = crate::state::BAR_LOCKED.load(std::sync::atomic::Ordering::SeqCst);
    if locked {
        // Unlock and hide
        crate::state::BAR_LOCKED.store(false, std::sync::atomic::Ordering::SeqCst);
        crate::state::BAR_TARGET_VISIBLE.store(false, std::sync::atomic::Ordering::SeqCst);
    } else {
        // Show and lock
        crate::state::BAR_LOCKED.store(true, std::sync::atomic::Ordering::SeqCst);
        crate::state::BAR_TARGET_VISIBLE.store(true, std::sync::atomic::Ordering::SeqCst);
    }
}

// ------------------------------------------------------------------
// Read Edge Bar user-generated apps from Edge Preferences
// ------------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct EdgeAppInfo {
    pub title: String,
    pub url: String,
    pub icon_url: Option<String>,
}

fn extract_edge_apps_from_prefs(content: &str) -> Option<Vec<EdgeAppInfo>> {
    let prefs: serde_json::Value = serde_json::from_str(content).ok()?;
    let user_generated = prefs
        .get("browser")
        .and_then(|b| b.get("hub_app_preferences"))
        .and_then(|h| h.get("user_generated"))
        .and_then(|u| u.as_object())?;

    let mut apps = Vec::new();
    for (_id, value) in user_generated {
        if let Some(obj) = value.as_object() {
            let url = obj
                .get("url")
                .and_then(|u| u.as_str())
                .unwrap_or("")
                .to_string();
            if url.is_empty() {
                continue;
            }

            let url_for_parse = if url.starts_with("http://") || url.starts_with("https://") {
                url.clone()
            } else {
                format!("https://{}", url)
            };

            let title = url::Url::parse(&url_for_parse)
                .ok()
                .and_then(|u| u.host_str().map(|h| h.to_string()))
                .unwrap_or_else(|| "Unknown".to_string());

            let icon_url = obj
                .get("icon_url")
                .and_then(|i| i.as_str())
                .map(|s| s.to_string());

            apps.push(EdgeAppInfo {
                title,
                url: url_for_parse,
                icon_url,
            });
        }
    }

    if apps.is_empty() {
        None
    } else {
        Some(apps)
    }
}

#[tauri::command]
pub fn read_edge_user_apps() -> Result<Vec<EdgeAppInfo>, String> {
    let local_app_data =
        std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA not found".to_string())?;

    // Edge variants: Stable, Beta, Dev, Canary
    let edge_names = ["Edge", "Edge Beta", "Edge Dev", "Edge SxS"];

    let mut all_apps = Vec::new();
    let mut tried_paths = Vec::new();

    for edge_name in &edge_names {
        let user_data_dir = std::path::PathBuf::from(&local_app_data)
            .join("Microsoft")
            .join(edge_name)
            .join("User Data");

        if !user_data_dir.is_dir() {
            continue;
        }

        // Scan all profiles inside User Data
        let entries = std::fs::read_dir(&user_data_dir)
            .map_err(|e| format!("Failed to read directory {:?}: {}", user_data_dir, e))?;

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let prefs_path = path.join("Preferences");
            tried_paths.push(prefs_path.clone());

            if let Ok(content) = std::fs::read_to_string(&prefs_path) {
                if let Some(apps) = extract_edge_apps_from_prefs(&content) {
                    all_apps.extend(apps);
                }
            }
        }
    }

    if all_apps.is_empty() {
        if tried_paths.is_empty() {
            return Err("No Edge installation found".to_string());
        }
        return Err("No user-generated apps found in any Edge profile".to_string());
    }

    Ok(all_apps)
}

// ------------------------------------------------------------------
// Exit confirmation dialog (native, outside the sidebar)
// ------------------------------------------------------------------

use std::sync::atomic::{AtomicBool, Ordering};

static EXIT_DIALOG_OPEN: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn confirm_exit(app: AppHandle, lang: String) -> bool {
    use winapi::um::winuser::{MessageBoxW, MB_YESNO, MB_ICONQUESTION, IDYES, MB_TOPMOST};

    // Prevent multiple concurrent exit dialogs.
    if EXIT_DIALOG_OPEN.swap(true, Ordering::SeqCst) {
        return false;
    }

    let (title, msg) = if lang == "zh" {
        ("确认退出", "确定要退出 ToriSidebar 吗？")
    } else {
        ("Confirm Exit", "Are you sure you want to quit ToriSidebar?")
    };

    let title_w: Vec<u16> = title.encode_utf16().chain(Some(0)).collect();
    let msg_w: Vec<u16> = msg.encode_utf16().chain(Some(0)).collect();

    // Get the bar window handle so the message box is parented and stays on top.
    let hwnd = app
        .get_webview_window("bar")
        .and_then(|w| w.hwnd().ok())
        .map(|h| h.0)
        .unwrap_or(std::ptr::null_mut());

    let result = unsafe {
        MessageBoxW(
            hwnd as _,
            msg_w.as_ptr(),
            title_w.as_ptr(),
            MB_YESNO | MB_ICONQUESTION | MB_TOPMOST,
        )
    };

    EXIT_DIALOG_OPEN.store(false, Ordering::SeqCst);
    result == IDYES
}

// ------------------------------------------------------------------
// First-run guide
// ------------------------------------------------------------------

fn first_run_marker_path() -> std::path::PathBuf {
    std::env::var("APPDATA")
        .map(|p| std::path::PathBuf::from(p).join("ToriSidebar"))
        .unwrap_or_else(|_| std::env::temp_dir().join("ToriSidebar"))
        .join(".first-run-seen")
}

pub fn is_first_run() -> bool {
    !first_run_marker_path().exists()
}

pub fn mark_first_run_seen() {
    let path = first_run_marker_path();
    let _ = std::fs::create_dir_all(path.parent().unwrap());
    let _ = std::fs::write(&path, b"1");
}

#[tauri::command]
pub fn show_guide_window(app: tauri::AppHandle) -> Result<(), String> {
    use crate::monitor::{get_leftmost_monitor_left, get_rightmost_monitor_right, get_mouse_monitor_work_area};

    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let width = 80;
    let (x, y, height) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        let (_work_left, work_top, _work_right, work_bottom) = get_mouse_monitor_work_area(&app);
        // Center the glow on the screen edge so half spills outside
        (leftmost - width / 2, work_top, work_bottom - work_top)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        let (_work_left, work_top, _work_right, work_bottom) = get_mouse_monitor_work_area(&app);
        (rightmost - width / 2, work_top, work_bottom - work_top)
    };

    crate::guide_native::show_guide(x, y, width, height);
    Ok(())
}

#[tauri::command]
pub fn close_guide_window(_app: tauri::AppHandle) {
    crate::guide_native::close_guide();
}

#[tauri::command]
pub fn reset_first_run() {
    let _ = std::fs::remove_file(first_run_marker_path());
}

#[tauri::command]
pub fn reset_window_states() {
    crate::window_state::reset_all();
}

#[tauri::command]
pub fn reset_window_state(label: String) {
    crate::window_state::reset_one(&label);
}

// ------------------------------------------------------------------
// App version & update check
// ------------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub release_url: String,
}

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn export_config(content: String) -> Result<String, String> {
    let downloads = std::env::var("USERPROFILE")
        .map(|p| std::path::PathBuf::from(p).join("Downloads"))
        .unwrap_or_else(|_| std::env::temp_dir());
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let filename = format!("torisidebar-config-{}.json", ts);
    let path = downloads.join(&filename);
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

fn compare_version(a: &str, b: &str) -> std::cmp::Ordering {
    let parse = |s: &str| {
        s.trim_start_matches('v')
            .split('.')
            .map(|p| p.parse::<u32>().unwrap_or(0))
            .collect::<Vec<u32>>()
    };
    let av = parse(a);
    let bv = parse(b);
    for i in 0..av.len().max(bv.len()) {
        let ai = av.get(i).copied().unwrap_or(0);
        let bi = bv.get(i).copied().unwrap_or(0);
        match ai.cmp(&bi) {
            std::cmp::Ordering::Equal => continue,
            other => return other,
        }
    }
    std::cmp::Ordering::Equal
}

#[tauri::command]
pub async fn check_update() -> Result<UpdateInfo, String> {
    let current = env!("CARGO_PKG_VERSION").to_string();
    let api_url = "https://api.github.com/repos/Destr1zzj/ToriSideBar/releases/latest";

    let response = ureq::get(api_url)
        .set("User-Agent", "ToriSidebar/").call()
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let json: serde_json::Value = response
        .into_json()
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let tag_name = json
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let release_url = json
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://github.com/Destr1zzj/ToriSideBar/releases")
        .to_string();

    let latest = tag_name.trim_start_matches('v').to_string();
    let has_update = compare_version(&latest, &current) == std::cmp::Ordering::Greater;

    Ok(UpdateInfo {
        current_version: current,
        latest_version: tag_name.to_string(),
        has_update,
        release_url,
    })
}

// ------------------------------------------------------------------
// Single-instance guard (Windows)
// ------------------------------------------------------------------

/// Ensure only one instance is running (Windows named mutex).
pub fn ensure_single_instance() -> Option<winapi::shared::ntdef::HANDLE> {
    use winapi::shared::winerror::ERROR_ALREADY_EXISTS;
    use winapi::um::errhandlingapi::GetLastError;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::synchapi::CreateMutexW;

    let name: Vec<u16> = "ToriSidebar_SingleInstance_Mutex\0"
        .encode_utf16()
        .collect();
    unsafe {
        let mutex = CreateMutexW(std::ptr::null_mut(), 0, name.as_ptr());
        if mutex.is_null() {
            return None;
        }
        let err = GetLastError();
        if err == ERROR_ALREADY_EXISTS {
            CloseHandle(mutex);
            return None;
        }
        Some(mutex)
    }
}


