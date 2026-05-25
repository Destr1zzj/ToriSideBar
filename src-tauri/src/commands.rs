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
