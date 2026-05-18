use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    PhysicalPosition, PhysicalSize,
};
use tauri::webview::PageLoadEvent;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicI32, AtomicU32, Ordering};
use std::sync::{Mutex, LazyLock};
use std::thread;
use std::time::Duration;

static BAR_EXPANDED: AtomicBool = AtomicBool::new(false);
static TRIGGER_WIDTH: AtomicU32 = AtomicU32::new(30);
/// Whether the bar has been "unlocked" by entering the trigger zone.
static TRIGGER_ACTIVE: AtomicBool = AtomicBool::new(false);
/// Target visibility state set by the decision thread, read by the animation thread.
static BAR_TARGET_VISIBLE: AtomicBool = AtomicBool::new(false);
/// Target x position for animation thread (set by expand/collapse to avoid jump).
static BAR_TARGET_X: AtomicI32 = AtomicI32::new(0);
/// Current monitor's work_area right edge (set by decision thread, read by animation thread).
static BAR_SCREEN_RIGHT: AtomicI32 = AtomicI32::new(0);
/// Current monitor's work_area top edge (set by decision thread, read by animation thread).
static BAR_SCREEN_TOP: AtomicI32 = AtomicI32::new(0);

/// Parent -> child window label mapping.
static CHILD_WINDOWS: LazyLock<Mutex<HashMap<String, Vec<String>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// Ensure only one instance is running (Windows named mutex)
fn ensure_single_instance() -> Option<winapi::shared::ntdef::HANDLE> {
    use winapi::um::synchapi::CreateMutexW;
    use winapi::um::handleapi::CloseHandle;
    use winapi::um::errhandlingapi::GetLastError;
    use winapi::shared::winerror::ERROR_ALREADY_EXISTS;

    let name: Vec<u16> = "ToriSidebar_SingleInstance_Mutex\0".encode_utf16().collect();
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

/// Get global mouse position via WinAPI
fn get_mouse_pos() -> Option<(i32, i32)> {
    use winapi::um::winuser::GetCursorPos;
    use winapi::shared::windef::POINT;
    let mut point = POINT { x: 0, y: 0 };
    unsafe {
        if GetCursorPos(&mut point) != 0 {
            Some((point.x, point.y))
        } else {
            None
        }
    }
}

/// Get work area of the monitor that currently contains the mouse.
/// Returns (left, top, right, bottom) in screen coordinates.
fn get_mouse_monitor_work_area(app_handle: &tauri::AppHandle) -> (i32, i32, i32, i32) {
    let mouse = get_mouse_pos().unwrap_or((0, 0));

    // Try Tauri's available_monitors first (more reliable with DPI awareness)
    if let Ok(monitors) = app_handle.available_monitors() {
        for monitor in monitors {
            let work = monitor.work_area();
            let left = work.position.x;
            let top = work.position.y;
            let right = work.position.x + work.size.width as i32;
            let bottom = work.position.y + work.size.height as i32;
            if mouse.0 >= left && mouse.0 <= right && mouse.1 >= top && mouse.1 <= bottom {
                return (left, top, right, bottom);
            }
        }
    }

    // Fallback to WinAPI MonitorFromPoint
    use winapi::um::winuser::{MonitorFromPoint, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use winapi::shared::windef::POINT;
    unsafe {
        let point = POINT { x: mouse.0, y: mouse.1 };
        let hmonitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        if !hmonitor.is_null() {
            let mut info: MONITORINFO = std::mem::zeroed();
            info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(hmonitor, &mut info) != 0 {
                return (info.rcWork.left, info.rcWork.top, info.rcWork.right, info.rcWork.bottom);
            }
        }
    }

    // Ultimate fallback: assume single 1920x1080 at (0,0)
    (0, 0, 1920, 1080)
}

const INJECT_JS: &str = r#"(function() {
  if (window.__TORI_INJECTED__) return;
  window.__TORI_INJECTED__ = true;

  const WINDOW_LABEL = "__WINDOW_LABEL__";

  function tauriInvoke(cmd, args) {
    try {
      const tauri = window.__TAURI__ || window.__TAURI_INTERNALS__;
      if (tauri?.invoke) {
        return tauri.invoke(cmd, args);
      }
      if (tauri?.core?.invoke) {
        return tauri.core.invoke(cmd, args);
      }
    } catch(e) {}
    console.warn('[Tori] invoke unavailable:', cmd);
    return Promise.reject('Tauri not ready');
  }

  function shouldOpenInternally(url) {
    try {
      const resolved = new URL(url, document.baseURI);
      const target = resolved.hostname;
      const current = location.hostname;
      const result = target === current;
      console.log('[Tori] shouldOpenInternally:', { url, resolved: resolved.href, target, current, result });
      return result;
    } catch (e) {
      console.log('[Tori] shouldOpenInternally failed:', url, e.message);
      return false;
    }
  }

  function resolveUrl(url) {
    try {
      return new URL(url, document.baseURI).href;
    } catch {
      return url;
    }
  }

  // Intercept window.open
  const origOpen = window.open;
  window.open = function(url, target, features) {
    if (!url) return origOpen.apply(this, arguments);
    const internal = shouldOpenInternally(url);
    console.log('[Tori] window.open intercepted:', url, 'internal?', internal);
    if (internal) {
      tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(url), title: target || document.title || '' })
        .then(r => console.log('[Tori] open_child_window ok:', r))
        .catch(e => console.error('[Tori] open_child_window failed:', e));
      return { closed: false, close: function(){}, focus: function(){}, blur: function(){} };
    } else {
      tauriInvoke('open_external_url', { url: resolveUrl(url) })
        .then(() => console.log('[Tori] open_external_url ok'))
        .catch(e => console.error('[Tori] open_external_url failed:', e));
      return null;
    }
  };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    let el = e.target;
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
      if (!el || el === document.body) return;
    }
    if (el.tagName !== 'A') return;
    const href = el.getAttribute('href');
    const target = el.getAttribute('target');
    if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (target === '_blank' || target === '_new') {
      e.preventDefault();
      e.stopPropagation();
      const internal = shouldOpenInternally(href);
      console.log('[Tori] link click intercepted:', href, 'target:', target, 'internal?', internal);
      if (internal) {
        tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(href), title: el.textContent || '' })
          .then(r => console.log('[Tori] open_child_window ok:', r))
          .catch(e => console.error('[Tori] open_child_window failed:', e));
      } else {
        tauriInvoke('open_external_url', { url: resolveUrl(href) })
          .then(() => console.log('[Tori] open_external_url ok'))
          .catch(e => console.error('[Tori] open_external_url failed:', e));
      }
    }
  }, true);

  // Intercept form submit
  document.addEventListener('submit', function(e) {
    const form = e.target;
    if (form.tagName !== 'FORM') return;
    const target = form.getAttribute('target');
    const action = form.getAttribute('action');
    if ((target === '_blank' || target === '_new') && action) {
      e.preventDefault();
      if (shouldOpenInternally(action)) {
        tauriInvoke('open_child_window', { parentLabel: WINDOW_LABEL, url: resolveUrl(action), title: '' });
      } else {
        tauriInvoke('open_external_url', { url: resolveUrl(action) });
      }
    }
  }, true);

  // Floating nav bar
  function mountBar() {
    if (document.getElementById('__tori_nav_bar__')) return;
    if (!document.body) { setTimeout(mountBar, 50); return; }

    const bar = document.createElement('div');
    bar.id = '__tori_nav_bar__';
    bar.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;gap:8px;padding:6px 12px;border-radius:20px;background:rgba(30,30,34,0.5);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 4px 12px rgba(0,0,0,0.2);border:1px solid rgba(255,255,255,0.08);transition:opacity 0.3s ease;opacity:0.3;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    bar.onmouseenter = function() { bar.style.opacity = '1'; };
    bar.onmouseleave = function() { bar.style.opacity = '0.3'; };

    const btnStyle = 'width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,0.1);color:white;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;padding:0;line-height:1';

    const back = document.createElement('button');
    back.innerHTML = '←';
    back.title = '返回';
    back.style.cssText = btnStyle;
    back.onclick = function(e) { e.stopPropagation(); history.back(); };
    bar.appendChild(back);

    const reload = document.createElement('button');
    reload.innerHTML = '↻';
    reload.title = '刷新';
    reload.style.cssText = btnStyle;
    reload.onclick = function(e) { e.stopPropagation(); location.reload(); };
    bar.appendChild(reload);

    const openExternal = document.createElement('button');
    openExternal.innerHTML = '↗';
    openExternal.title = '用浏览器打开';
    openExternal.style.cssText = btnStyle;
    openExternal.onclick = function(e) { e.stopPropagation(); tauriInvoke('open_external_url', { url: location.href }); };
    bar.appendChild(openExternal);

    const close = document.createElement('button');
    close.innerHTML = '×';
    close.title = '关闭';
    close.style.cssText = 'width:28px;height:28px;border-radius:50%;border:none;background:rgba(239,68,68,0.8);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;padding:0;line-height:1';
    close.onclick = function(e) { e.stopPropagation(); tauriInvoke('close_app_window', { label: WINDOW_LABEL }); };
    bar.appendChild(close);

    document.body.appendChild(bar);
  }
  mountBar();
})();"#;

/// Close all child windows of a parent and remove from map.
fn close_child_windows_impl(app: &tauri::AppHandle, parent_label: &str) {
    let to_close: Vec<String> = {
        let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
        map.remove(parent_label).unwrap_or_default()
    };
    for child_label in to_close {
        if let Some(window) = app.get_webview_window(&child_label) {
            let _ = window.close();
        }
    }
}

/// Remove a child label from all parent mappings.
fn remove_from_child_map(child_label: &str) {
    let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
    for children in map.values_mut() {
        children.retain(|l| l != child_label);
    }
}

/// Get work area (screen minus taskbar) via bar's monitor
fn get_work_area(bar: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    if let Ok(Some(monitor)) = bar.current_monitor() {
        let work = monitor.work_area();
        (work.position.x, work.position.y, work.size.width as i32, work.size.height as i32)
    } else {
        (0, 0, 1920, 1080)
    }
}

/// Get work area of the monitor that contains the given window.
fn get_window_monitor_work_area(window: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    if let Ok(Some(monitor)) = window.current_monitor() {
        let work = monitor.work_area();
        let left = work.position.x;
        let top = work.position.y;
        let right = work.position.x + work.size.width as i32;
        let bottom = work.position.y + work.size.height as i32;
        (left, top, right, bottom)
    } else {
        (0, 0, 1920, 1080)
    }
}

/// Position the bar window at the right edge, respecting taskbar
#[tauri::command]
async fn position_bar(app: tauri::AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let (wx, wy, ww, wh) = get_work_area(&bar);
    let bar_width = 64i32;
    let x = wx + ww - bar_width;
    let y = wy;
    bar.set_position(PhysicalPosition { x, y }).map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize { width: bar_width as u32, height: wh as u32 }).map_err(|e| e.to_string())?;
    Ok(())
}

/// Expand bar width for settings panel
#[tauri::command]
async fn expand_bar(app: tauri::AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let (wx, wy, ww, wh) = get_work_area(&bar);
    let expanded = 280i32;
    let x = wx + ww - expanded;
    bar.set_position(PhysicalPosition { x, y: wy }).map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize { width: expanded as u32, height: wh as u32 }).map_err(|e| e.to_string())?;
    BAR_EXPANDED.store(true, Ordering::SeqCst);
    BAR_TARGET_X.store(x, Ordering::SeqCst);
    Ok(())
}

/// Collapse bar back to narrow
#[tauri::command]
async fn collapse_bar(app: tauri::AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let (wx, wy, ww, wh) = get_work_area(&bar);
    let narrow = 64i32;
    let x = wx + ww - narrow;
    bar.set_position(PhysicalPosition { x, y: wy }).map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize { width: narrow as u32, height: wh as u32 }).map_err(|e| e.to_string())?;
    BAR_EXPANDED.store(false, Ordering::SeqCst);
    BAR_TARGET_X.store(x, Ordering::SeqCst);
    Ok(())
}

/// Set trigger width for auto-hide
#[tauri::command]
async fn set_trigger_width(width: u32) -> Result<(), String> {
    let w = width.max(1).min(200);
    TRIGGER_WIDTH.store(w, Ordering::SeqCst);
    Ok(())
}

/// Get current trigger width
#[tauri::command]
async fn get_trigger_width() -> Result<u32, String> {
    Ok(TRIGGER_WIDTH.load(Ordering::SeqCst))
}

/// Toggle app window: show if hidden, hide if visible, create if not exists
#[tauri::command]
async fn toggle_app_window(
    app: tauri::AppHandle,
    label: String,
    title: String,
    url: String,
) -> Result<bool, String> {
    // 辅助：隐藏除指定标签外的所有可见 app 窗口
    let hide_others = |exclude: &str| {
        for (l, window) in app.webview_windows() {
            if l.starts_with("app-") && l != exclude {
                if let Ok(visible) = window.is_visible() {
                    if visible {
                        let _ = window.hide();
                    }
                }
            }
        }
    };

    if let Some(existing) = app.get_webview_window(&label) {
        let is_visible = existing.is_visible().map_err(|e| e.to_string())?;
        if is_visible {
            // 二次点击：关闭当前前台的展示页面（隐藏）
            existing.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        } else {
            // 从后台恢复：先隐藏其他前台应用，再显示自己，并重新注入工具栏
            hide_others(&label);
            existing.show().map_err(|e| e.to_string())?;
            existing.set_focus().map_err(|e| e.to_string())?;
            let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
            let _ = existing.eval(&script);
            return Ok(true);
        }
    }

    // 新建窗口：先隐藏其他所有前台应用
    hide_others("");

    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let bar_pos = bar.outer_position().map_err(|e| e.to_string())?;
    let bar_size = bar.outer_size().map_err(|e| e.to_string())?;

    let app_width: u32 = 520;
    let app_height: u32 = bar_size.height;
    let app_x: i32 = bar_pos.x - app_width as i32;
    let app_y: i32 = bar_pos.y;

    let parsed_url: url::Url = url.parse().map_err(|_| "Invalid URL".to_string())?;

    let _window = WebviewWindowBuilder::new(&app, &label, WebviewUrl::External(parsed_url))
        .title(&title)
        .inner_size(app_width as f64, app_height as f64)
        .position(app_x as f64, app_y as f64)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(false)
        .resizable(true)
        .maximizable(false)
        .minimizable(false)
        .closable(true)
        .visible(true)
        .devtools(true)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let script = INJECT_JS.replace("__WINDOW_LABEL__", &window.label());
                let _ = window.eval(&script);
            }
        })
        .build()
        .map_err(|e| e.to_string())?;

    let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
    let _ = _window.eval(&script);

    Ok(true)
}

/// Close a specific app window by label
#[tauri::command]
async fn close_app_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    // 父窗口关闭时级联关闭子窗口；子窗口关闭时从映射表移除
    let is_parent = label.starts_with("app-") && !label.contains("-tab-");
    if is_parent {
        close_child_windows_impl(&app, &label);
    } else {
        remove_from_child_map(&label);
    }
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Close all app windows
#[tauri::command]
async fn close_all_app_windows(app: tauri::AppHandle) -> Result<(), String> {
    // 先清空所有子窗口映射并关闭子窗口
    let _all_parents: Vec<String> = {
        let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
        let keys: Vec<String> = map.keys().cloned().collect();
        for parent in &keys {
            if let Some(children) = map.remove(parent) {
                for child in children {
                    if let Some(window) = app.get_webview_window(&child) {
                        let _ = window.close();
                    }
                }
            }
        }
        keys
    };
    // 再关闭所有父窗口
    for (label, window) in app.webview_windows() {
        if label.starts_with("app-") && !label.contains("-tab-") {
            let _ = window.close();
        }
    }
    Ok(())
}

/// Open a child window for the same-domain link.
/// Each parent is allowed at most one child window at a time.
#[tauri::command]
async fn open_child_window(
    app: tauri::AppHandle,
    parent_label: String,
    url: String,
    title: Option<String>,
) -> Result<String, String> {
    println!("[Tori] open_child_window called: parent={}, url={}", parent_label, url);

    // Close any existing child windows for this parent before opening a new one
    close_child_windows_impl(&app, &parent_label);

    let parsed_url: url::Url = url.parse().map_err(|e| {
        eprintln!("[Tori] URL parse failed: {}", e);
        "Invalid URL".to_string()
    })?;

    let parent = app.get_webview_window(&parent_label).ok_or("Parent window not found")?;
    let parent_pos = parent.outer_position().map_err(|e| e.to_string())?;
    let parent_size = parent.outer_size().map_err(|e| e.to_string())?;
    println!("[Tori] parent pos=({},{}) size=({},{})", parent_pos.x, parent_pos.y, parent_size.width, parent_size.height);

    let child_width: u32 = 480;
    let child_height: u32 = parent_size.height;
    let child_x: i32 = parent_pos.x - child_width as i32;
    let child_y: i32 = parent_pos.y;

    // Boundary protection: use parent's monitor, not mouse position
    let (work_left, work_top, work_right, _work_bottom) = get_window_monitor_work_area(&parent);
    println!("[Tori] parent monitor work_area: left={} top={} right={}", work_left, work_top, work_right);
    let (final_x, final_y) = if child_x < work_left {
        (parent_pos.x + 20, parent_pos.y + 20)
    } else {
        (child_x, child_y)
    };
    println!("[Tori] child target pos=({},{}) raw_child_x={}", final_x, final_y, child_x);

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let child_label = format!("{}-tab-{}", parent_label, timestamp);

    let child_title = title.filter(|t| !t.is_empty()).unwrap_or_else(|| "New Tab".to_string());

    println!("[Tori] creating child window: label={} pos=({},{}) size=({},{}) title={}", child_label, final_x, final_y, child_width, child_height, child_title);

    let _window = WebviewWindowBuilder::new(&app, &child_label, WebviewUrl::External(parsed_url))
        .title(&child_title)
        .inner_size(child_width as f64, child_height as f64)
        .position(final_x as f64, final_y as f64)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(false)
        .resizable(true)
        .maximizable(false)
        .minimizable(false)
        .closable(true)
        .visible(true)
        .devtools(true)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                let script = INJECT_JS.replace("__WINDOW_LABEL__", &window.label());
                let _ = window.eval(&script);
            }
        })
        .build()
        .map_err(|e| {
            eprintln!("[Tori] failed to build child window: {}", e);
            e.to_string()
        })?;

    println!("[Tori] child window created successfully: {}", child_label);

    let script = INJECT_JS.replace("__WINDOW_LABEL__", &child_label);
    let _ = _window.eval(&script);

    let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
    map.entry(parent_label).or_default().push(child_label.clone());

    Ok(child_label)
}

/// Close all child windows of a given parent.
#[tauri::command]
async fn close_child_windows(app: tauri::AppHandle, parent_label: String) -> Result<(), String> {
    close_child_windows_impl(&app, &parent_label);
    Ok(())
}

/// Handle ESC key: close the top-most visible child window if any, otherwise signal frontend.
#[tauri::command]
async fn handle_esc(app: tauri::AppHandle) -> Result<bool, String> {
    let mut target: Option<(String, String)> = None;

    {
        let map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
        for (parent_label, children) in map.iter() {
            for child_label in children.iter().rev() {
                if let Some(window) = app.get_webview_window(child_label) {
                    if let Ok(visible) = window.is_visible() {
                        if visible {
                            target = Some((parent_label.clone(), child_label.clone()));
                            break;
                        }
                    }
                }
            }
            if target.is_some() {
                break;
            }
        }
    }

    if let Some((parent, child)) = target {
        if let Some(window) = app.get_webview_window(&child) {
            let _ = window.close();
        }
        let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(children) = map.get_mut(&parent) {
            children.retain(|l| l != &child);
        }
        return Ok(true);
    }

    Ok(false)
}

/// Open an external URL in the system browser.
#[tauri::command]
async fn open_external_url(url: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(&["/c", "start", "", &url])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Exit the entire application
#[tauri::command]
async fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

/// Animation thread: smoothly slides the bar in/out from the right edge.
/// Runs at ~60fps (16ms interval).
fn animate_bar(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let mut current_x: i32 = 0;
        let mut current_y: i32 = 0;
        let mut initialized = false;

        loop {
            thread::sleep(Duration::from_millis(16));

            let bar = match app_handle.get_webview_window("bar") {
                Some(w) => w,
                None => continue,
            };

            // When settings panel is open, animation is paused.
            // We sync current_x to the actual position so no jump happens on close.
            if BAR_EXPANDED.load(Ordering::SeqCst) {
                if let Ok(pos) = bar.outer_position() {
                    current_x = pos.x;
                    current_y = pos.y;
                }
                initialized = true;
                continue;
            }

            let screen_right = BAR_SCREEN_RIGHT.load(Ordering::SeqCst);
            let screen_top = BAR_SCREEN_TOP.load(Ordering::SeqCst);
            if screen_right == 0 {
                continue;
            }

            // Determine target x:
            // - If BAR_TARGET_X was explicitly set (expand/collapse), use it
            // - Otherwise derive from visibility state
            let target_x = {
                let explicit = BAR_TARGET_X.load(Ordering::SeqCst);
                if explicit > 0 {
                    // Clear explicit target after reading once
                    BAR_TARGET_X.store(0, Ordering::SeqCst);
                    explicit
                } else {
                    if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                        screen_right - 64
                    } else {
                        screen_right
                    }
                }
            };
            let target_y = screen_top;

            if !initialized {
                current_x = target_x;
                current_y = target_y;
                initialized = true;
                let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                    let _ = bar.show();
                }
                continue;
            }

            let mut moved = false;

            if current_x != target_x {
                let diff = target_x - current_x;

                // Multi-monitor teleport: if the distance is very large (>500px),
                // the user moved to a different monitor. Teleport instantly to avoid
                // the bar flying across the desktop gap.
                if diff.abs() > 500 {
                    current_x = target_x;
                } else {
                    // Normal smooth slide: 24px per frame (~1440px/sec)
                    let step = diff.signum() * diff.abs().min(24);
                    current_x += step;

                    // Snap to target when very close
                    if (target_x - current_x).abs() <= step.abs() {
                        current_x = target_x;
                    }
                }
                moved = true;
            }

            if current_y != target_y {
                // Y changes happen instantly (monitor switch vertical alignment)
                current_y = target_y;
                moved = true;
            }

            if moved {
                // Position FIRST, then show — prevents flash at old location
                let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });

                // Show window as soon as any part is on-screen
                if current_x < screen_right {
                    let _ = bar.show();
                }

                // Fully off-screen and target is hidden -> hide() to stop intercepting mouse
                if current_x >= screen_right - 1 && !BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                    let _ = bar.hide();
                }
            } else {
                // Even if x/y haven't changed, ensure visibility matches target
                let is_visible = bar.is_visible().unwrap_or(false);
                if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) && !is_visible {
                    let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                    let _ = bar.show();
                } else if !BAR_TARGET_VISIBLE.load(Ordering::SeqCst) && is_visible && current_x >= screen_right - 1 {
                    let _ = bar.hide();
                }
            }
        }
    });
}

/// Decision thread: detects mouse position and decides target visibility.
/// Runs every 150ms.
fn start_auto_hide(app_handle: tauri::AppHandle) {
    thread::spawn(move || {
        let mut was_over = true;

        loop {
            thread::sleep(Duration::from_millis(150));

            let bar = match app_handle.get_webview_window("bar") {
                Some(w) => w,
                None => continue,
            };

            // Settings panel open: force visible
            if BAR_EXPANDED.load(Ordering::SeqCst) {
                if !was_over {
                    BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);
                    was_over = true;
                }
                continue;
            }

            let bar_pos = match bar.outer_position() {
                Ok(p) => p,
                Err(_) => continue,
            };
            let bar_size = match bar.outer_size() {
                Ok(s) => s,
                Err(_) => continue,
            };

            let mouse = match get_mouse_pos() {
                Some(m) => m,
                None => continue,
            };

            // Get the monitor where the mouse currently is
            let (_work_left, work_top, work_right, _work_bottom) = get_mouse_monitor_work_area(&app_handle);
            BAR_SCREEN_RIGHT.store(work_right, Ordering::SeqCst);
            BAR_SCREEN_TOP.store(work_top, Ordering::SeqCst);

            let over_bar = mouse.0 >= bar_pos.x && mouse.0 <= bar_pos.x + bar_size.width as i32
                && mouse.1 >= bar_pos.y && mouse.1 <= bar_pos.y + bar_size.height as i32;

            let mut over_app = false;
            let mut any_app_visible = false;
            for (label, window) in app_handle.webview_windows() {
                if label.starts_with("app-") {
                    if let Ok(visible) = window.is_visible() {
                        if visible {
                            any_app_visible = true;
                            if let (Ok(pos), Ok(size)) = (window.outer_position(), window.outer_size()) {
                                if mouse.0 >= pos.x && mouse.0 <= pos.x + size.width as i32
                                    && mouse.1 >= pos.y && mouse.1 <= pos.y + size.height as i32 {
                                    over_app = true;
                                }
                            }
                        }
                    }
                }
            }

            let trigger = TRIGGER_WIDTH.load(Ordering::SeqCst) as i32;
            // Trigger zone is measured from the monitor's right edge
            let near_edge = mouse.0 >= work_right - trigger;

            let trigger_active = TRIGGER_ACTIVE.load(Ordering::SeqCst);
            let should_show = if trigger_active {
                over_bar || over_app || near_edge || any_app_visible
            } else {
                near_edge || any_app_visible
            };

            if should_show && !was_over {
                TRIGGER_ACTIVE.store(true, Ordering::SeqCst);
                BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);
                was_over = true;
            } else if !should_show && was_over {
                TRIGGER_ACTIVE.store(false, Ordering::SeqCst);
                BAR_TARGET_VISIBLE.store(false, Ordering::SeqCst);
                was_over = false;
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _mutex = ensure_single_instance();
    if _mutex.is_none() {
        eprintln!("ToriSidebar is already running.");
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            position_bar,
            expand_bar,
            collapse_bar,
            set_trigger_width,
            get_trigger_width,
            toggle_app_window,
            close_app_window,
            close_all_app_windows,
            open_child_window,
            close_child_windows,
            handle_esc,
            open_external_url,
            exit_app,
        ])
        .setup(|app| {
            // System tray icon with right-click menu
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&quit_i])?;
            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("ToriSidebar")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = position_bar(app_handle.clone()).await;
                if let Some(bar) = app_handle.get_webview_window("bar") {
                    let _ = bar.show();
                }
            });

            // Bar starts visible
            BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);

            start_auto_hide(app.handle().clone());
            animate_bar(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
