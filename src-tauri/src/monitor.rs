use tauri::AppHandle;
use winapi::shared::windef::{POINT, RECT, HMONITOR};
use winapi::shared::minwindef::{LPARAM, BOOL, TRUE};
use winapi::um::winuser::{
    GetCursorPos, MonitorFromPoint, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    EnumDisplayMonitors,
};

/// Diagnostic helper: write a line to %TEMP%\torisidebar_edge_diag.log
pub fn diag_log(msg: &str) {
    use std::fs::OpenOptions;
    use std::io::Write;
    let path = std::env::temp_dir().join("torisidebar_edge_diag.log");
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs_f64();
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = writeln!(f, "[{:.3}] {}", now, msg);
    }
}

/// Callback data for EnumDisplayMonitors
struct EnumData {
    min_left: i32,
    max_right: i32,
}

unsafe extern "system" fn enum_monitor_proc(hmon: HMONITOR, _hdc: *mut winapi::shared::windef::HDC__, _lprc: *mut RECT, lparam: LPARAM) -> BOOL {
    let data = &mut *(lparam as *mut EnumData);
    let mut info: MONITORINFO = std::mem::zeroed();
    info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
    if GetMonitorInfoW(hmon, &mut info) != 0 {
        let left = info.rcMonitor.left;
        let right = info.rcMonitor.right;
        diag_log(&format!("WinAPI monitor: rcMonitor=({}, {}, {}, {})", left, info.rcMonitor.top, right, info.rcMonitor.bottom));
        if left < data.min_left { data.min_left = left; }
        if right > data.max_right { data.max_right = right; }
    }
    TRUE
}

/// Enumerate all displays via raw WinAPI and return (min_left, max_right) from rcMonitor.
pub fn get_display_bounds_winapi() -> (i32, i32) {
    let mut data = EnumData { min_left: 0, max_right: 0 };
    unsafe {
        EnumDisplayMonitors(
            std::ptr::null_mut(),
            std::ptr::null(),
            Some(enum_monitor_proc),
            &mut data as *mut _ as LPARAM,
        );
    }
    (data.min_left, data.max_right)
}

/// Get global mouse position via WinAPI.
pub fn get_mouse_pos() -> Option<(i32, i32)> {
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
/// Returns `(left, top, right, bottom)` in screen coordinates.
pub fn get_mouse_monitor_work_area(app_handle: &AppHandle) -> (i32, i32, i32, i32) {
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
    unsafe {
        let point = POINT { x: mouse.0, y: mouse.1 };
        let hmonitor = MonitorFromPoint(point, MONITOR_DEFAULTTONEAREST);
        if !hmonitor.is_null() {
            let mut info: MONITORINFO = std::mem::zeroed();
            info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if GetMonitorInfoW(hmonitor, &mut info) != 0 {
                return (
                    info.rcWork.left,
                    info.rcWork.top,
                    info.rcWork.right,
                    info.rcWork.bottom,
                );
            }
        }
    }

    // Ultimate fallback: assume single 1920x1080 at (0,0)
    (0, 0, 1920, 1080)
}

/// Get work area (screen minus taskbar) via bar's monitor.
pub fn get_work_area(bar: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
    if let Ok(Some(monitor)) = bar.current_monitor() {
        let work = monitor.work_area();
        (
            work.position.x,
            work.position.y,
            work.size.width as i32,
            work.size.height as i32,
        )
    } else {
        (0, 0, 1920, 1080)
    }
}

/// Get work area of the monitor that contains the given window.
pub fn get_window_monitor_work_area(window: &tauri::WebviewWindow) -> (i32, i32, i32, i32) {
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

/// Find the leftmost physical edge across all available monitors.
/// Compares Tauri API vs WinAPI and logs both for diagnostics.
pub fn get_leftmost_monitor_left(app_handle: &tauri::AppHandle) -> i32 {
    let mut min_left_tauri: i32 = 0;
    if let Ok(monitors) = app_handle.available_monitors() {
        for (i, monitor) in monitors.iter().enumerate() {
            let left = monitor.position().x;
            let right = monitor.position().x + monitor.size().width as i32;
            diag_log(&format!(
                "Tauri monitor[{}]: position=({}, {}) size=({}x{})  => left={} right={}",
                i, monitor.position().x, monitor.position().y,
                monitor.size().width, monitor.size().height,
                left, right
            ));
            if left < min_left_tauri {
                min_left_tauri = left;
            }
        }
    }
    let (min_left_winapi, max_right_winapi) = get_display_bounds_winapi();
    diag_log(&format!(
        "COMPARE tauri_left={}  winapi_left={}  tauri_right={}  winapi_right={}",
        min_left_tauri, min_left_winapi,
        get_rightmost_monitor_right_tauri(app_handle), max_right_winapi
    ));
    // Use WinAPI value (more authoritative on Windows).
    // Subtract 5 px to compensate for the WebView2 content inset that sits
    // inside the client area on the left edge.
    min_left_winapi - 5
}

fn get_rightmost_monitor_right_tauri(app_handle: &tauri::AppHandle) -> i32 {
    let mut max_right: i32 = 0;
    if let Ok(monitors) = app_handle.available_monitors() {
        for monitor in monitors {
            let right = monitor.position().x + monitor.size().width as i32;
            if right > max_right {
                max_right = right;
            }
        }
    }
    max_right
}

/// Find the rightmost physical edge across all available monitors.
pub fn get_rightmost_monitor_right(_app_handle: &tauri::AppHandle) -> i32 {
    let (_min_left, max_right) = get_display_bounds_winapi();
    // Add 5 px to compensate for the WebView2 content inset on the right edge.
    max_right + 5
}
