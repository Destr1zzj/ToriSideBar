use tauri::{
    Manager, WebviewUrl, WebviewWindowBuilder,
    PhysicalPosition, PhysicalSize,
};
use std::sync::atomic::{AtomicBool, AtomicI32, AtomicU32, Ordering};
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

/// Get work area (screen minus taskbar) via bar's monitor
fn get_work_area(bar: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    if let Ok(Some(monitor)) = bar.current_monitor() {
        let work = monitor.work_area();
        (work.position.x, work.position.y, work.size.width as i32, work.size.height as i32)
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
    if let Some(existing) = app.get_webview_window(&label) {
        let is_visible = existing.is_visible().map_err(|e| e.to_string())?;
        if is_visible {
            existing.hide().map_err(|e| e.to_string())?;
            return Ok(false);
        } else {
            existing.show().map_err(|e| e.to_string())?;
            existing.set_focus().map_err(|e| e.to_string())?;
            return Ok(true);
        }
    }

    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let bar_pos = bar.outer_position().map_err(|e| e.to_string())?;
    let bar_size = bar.outer_size().map_err(|e| e.to_string())?;

    let app_width: u32 = 480;
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
        .build()
        .map_err(|e| e.to_string())?;

    Ok(true)
}

/// Close a specific app window by label
#[tauri::command]
async fn close_app_window(app: tauri::AppHandle, label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Close all app windows
#[tauri::command]
async fn close_all_app_windows(app: tauri::AppHandle) -> Result<(), String> {
    for (label, window) in app.webview_windows() {
        if label.starts_with("app-") {
            let _ = window.close();
        }
    }
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
