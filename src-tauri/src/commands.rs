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
    std::process::Command::new("cmd")
        .args(&["/c", "start", "", &url])
        .spawn()
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
// Read Edge Bar user-generated apps from Edge Preferences
// ------------------------------------------------------------------

#[derive(serde::Serialize)]
pub struct EdgeAppInfo {
    pub title: String,
    pub url: String,
    pub icon_url: Option<String>,
}

#[tauri::command]
pub fn read_edge_user_apps() -> Result<Vec<EdgeAppInfo>, String> {
    let local_app_data =
        std::env::var("LOCALAPPDATA").map_err(|_| "LOCALAPPDATA not found".to_string())?;

    let prefs_path = std::path::PathBuf::from(local_app_data)
        .join("Microsoft")
        .join("Edge")
        .join("User Data")
        .join("Default")
        .join("Preferences");

    let content = std::fs::read_to_string(&prefs_path)
        .map_err(|e| format!("Failed to read Edge Preferences: {}", e))?;

    let prefs: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse Preferences: {}", e))?;

    let user_generated = prefs
        .get("browser")
        .and_then(|b| b.get("hub_app_preferences"))
        .and_then(|h| h.get("user_generated"))
        .and_then(|u| u.as_object())
        .ok_or_else(|| "No user_generated apps found in Edge Preferences".to_string())?;

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

    Ok(apps)
}

// ------------------------------------------------------------------
// Exit confirmation dialog (native, outside the sidebar)
// ------------------------------------------------------------------

#[tauri::command]
pub fn confirm_exit(lang: String) -> bool {
    use winapi::um::winuser::{MessageBoxW, MB_YESNO, MB_ICONQUESTION, IDYES};

    let (title, msg) = if lang == "zh" {
        ("确认退出", "确定要退出 ToriSidebar 吗？")
    } else {
        ("Confirm Exit", "Are you sure you want to quit ToriSidebar?")
    };

    let title_w: Vec<u16> = title.encode_utf16().chain(Some(0)).collect();
    let msg_w: Vec<u16> = msg.encode_utf16().chain(Some(0)).collect();

    unsafe {
        let result = MessageBoxW(
            std::ptr::null_mut(),
            msg_w.as_ptr(),
            title_w.as_ptr(),
            MB_YESNO | MB_ICONQUESTION,
        );
        result == IDYES
    }
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
