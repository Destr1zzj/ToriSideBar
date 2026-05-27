use tauri::AppHandle;
use winapi::shared::windef::POINT;
use winapi::um::winuser::{
    GetCursorPos, MonitorFromPoint, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTONEAREST,
    EnumDisplayMonitors,
};
use winapi::shared::windef::{RECT, HMONITOR};
use winapi::shared::minwindef::{LPARAM, BOOL, TRUE};

struct EnumData {
    min_left: i32,
    max_right: i32,
}

unsafe extern "system" fn enum_monitor_proc(hmon: HMONITOR, _hdc: *mut winapi::shared::windef::HDC__, _lprc: *mut RECT, lparam: LPARAM) -> BOOL {
    let data = &mut *(lparam as *mut EnumData);
    let mut info: MONITORINFO = std::mem::zeroed();
    info.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
    if GetMonitorInfoW(hmon, &mut info) != 0 {
        if info.rcMonitor.left < data.min_left { data.min_left = info.rcMonitor.left; }
        if info.rcMonitor.right > data.max_right { data.max_right = info.rcMonitor.right; }
    }
    TRUE
}

fn get_display_bounds_winapi() -> (i32, i32) {
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

/// WebView2 renders with a content inset on the left side of the client area.
/// Windows: ~5 px.  This is compensated in left-docked bar positioning.
pub const WEBVIEW2_LEFT_INSET: i32 = 5;

/// Find the leftmost physical edge across all available monitors.
/// Uses WinAPI EnumDisplayMonitors (more authoritative on Windows) and
/// subtracts the WebView2 content inset to keep content flush with the bezel.
pub fn get_leftmost_monitor_left(_app_handle: &tauri::AppHandle) -> i32 {
    let (min_left, _max_right) = get_display_bounds_winapi();
    let result = min_left - WEBVIEW2_LEFT_INSET;
    println!("[Tori] get_leftmost_monitor_left: min_left={} inset={} result={}", min_left, WEBVIEW2_LEFT_INSET, result);
    result
}

/// Find the rightmost physical edge across all available monitors.
/// Uses WinAPI EnumDisplayMonitors.  Trigger zone stays at the true edge;
/// the 3 px window-position offset is applied separately in window.rs.
pub fn get_rightmost_monitor_right(_app_handle: &tauri::AppHandle) -> i32 {
    let (_min_left, max_right) = get_display_bounds_winapi();
    max_right
}
