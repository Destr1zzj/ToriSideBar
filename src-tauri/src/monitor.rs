use tauri::AppHandle;
use winapi::shared::windef::POINT;
use winapi::um::winuser::{
    GetCursorPos, MonitorFromPoint, GetMonitorInfoW, MONITORINFO, MONITOR_DEFAULTTONEAREST,
};

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

/// Find the leftmost edge across all available monitors.
/// This is used when the bar is docked to the left, so it stays
/// at the true left edge of the desktop regardless of which
/// monitor the mouse is currently on.
pub fn get_leftmost_monitor_left(app_handle: &tauri::AppHandle) -> i32 {
    let mut min_left: i32 = 0;
    if let Ok(monitors) = app_handle.available_monitors() {
        for monitor in monitors {
            let left = monitor.work_area().position.x;
            if left < min_left {
                min_left = left;
            }
        }
    }
    min_left
}
