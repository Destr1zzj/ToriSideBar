use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl,
    WebviewWindowBuilder,
};
use tauri::webview::PageLoadEvent;
use winapi::um::winuser::{GetWindowRect, GetClientRect, ClientToScreen};
use winapi::shared::windef::{RECT, POINT};

use crate::inject::INJECT_JS;
use crate::monitor::{get_leftmost_monitor_left, get_rightmost_monitor_right, get_mouse_monitor_work_area, get_window_monitor_work_area};
use crate::state::*;

// WebView2 content inset compensation (pixels).
// Windows transparent WebView2 renders with a ~6px inset on the left side
// of the client area.  For the right bar we shift the window left so the
// content still touches the right bezel.
const WEBVIEW2_RIGHT_INSET: i32 = 6;
const RIGHT_OFFSET: i32 = -WEBVIEW2_RIGHT_INSET;

/// Get the true window rectangle via WinAPI GetWindowRect.
/// Returns (left, top, right, bottom) in screen coordinates.
fn get_window_rect_raw(window: &tauri::WebviewWindow) -> Option<(i32, i32, i32, i32)> {
    unsafe {
        let hwnd = window.hwnd().ok()?;
        let mut rect: RECT = std::mem::zeroed();
        if GetWindowRect(hwnd.0 as _, &mut rect) != 0 {
            println!("[Tori] get_window_rect_raw: left={} top={} right={} bottom={} (w={} h={})", rect.left, rect.top, rect.right, rect.bottom, rect.right - rect.left, rect.bottom - rect.top);
            Some((rect.left, rect.top, rect.right, rect.bottom))
        } else {
            None
        }
    }
}

/// Get the client area's left or right edge in screen coordinates.
/// `right_edge=true` returns the right edge, `false` returns the left edge.
fn get_client_edge(window: &tauri::WebviewWindow, right_edge: bool) -> Option<i32> {
    unsafe {
        let hwnd = window.hwnd().ok()?;
        let mut client_rect: RECT = std::mem::zeroed();
        GetClientRect(hwnd.0 as _, &mut client_rect);
        let mut pt = POINT {
            x: if right_edge { client_rect.right } else { client_rect.left },
            y: 0,
        };
        ClientToScreen(hwnd.0 as _, &mut pt);
        println!("[Tori] get_client_edge: right_edge={} client_rect=({},{},{},{}) pt.x={}", right_edge, client_rect.left, client_rect.top, client_rect.right, client_rect.bottom, pt.x);
        Some(pt.x)
    }
}

// ------------------------------------------------------------------
// Child-window helpers
// ------------------------------------------------------------------

/// Close all child windows of a parent and remove from map.
pub(crate) fn close_child_windows_impl(app: &AppHandle, parent_label: &str) {
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

// ------------------------------------------------------------------
// Commands
// ------------------------------------------------------------------

/// Position the bar window at the configured edge, respecting taskbar.
/// Right edge follows the mouse monitor; left edge is pinned to the
/// leftmost monitor across all displays.
#[tauri::command]
pub async fn position_bar(app: AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;
    let is_expanded = BAR_EXPANDED.load(std::sync::atomic::Ordering::SeqCst);
    let bar_width = if is_expanded { 280i32 } else { 64i32 };

    // Left edge is already compensated in monitor.rs (min_left - 5).
    // Right edge uses module-level RIGHT_OFFSET.

    let (x, y, height) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        let x = leftmost;
        let y = work_top;
        let height = work_bottom - work_top;
        println!("[Tori] position_bar LEFT: x={} y={} height={} bar_width={}", x, y, height, bar_width);
        (x, y, height)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        let x = rightmost - bar_width + RIGHT_OFFSET;
        let y = work_top;
        let height = work_bottom - work_top;
        (x, y, height)
    };

    bar.set_position(PhysicalPosition { x, y })
        .map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize {
        width: bar_width as u32,
        height: height as u32,
    })
    .map_err(|e| e.to_string())?;
    // Clear explicit target so animation thread re-derives from visibility state
    BAR_TARGET_X.store(0, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

/// Expand bar width for settings panel.
#[tauri::command]
pub async fn expand_bar(app: AppHandle) -> Result<(), String> {
    // Hide all visible app windows (parents and children) before expanding
    for (label, window) in app.webview_windows() {
        if label.starts_with("app-") {
            if let Ok(visible) = window.is_visible() {
                if visible {
                    let _ = window.hide();
                }
            }
        }
    }
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let (x, y) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, _work_bottom) =
            get_mouse_monitor_work_area(&app);
        println!("[Tori] expand_bar LEFT: x={} y={}", leftmost, work_top);
        (leftmost, work_top)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, _work_bottom) =
            get_mouse_monitor_work_area(&app);
        let current_width = bar.outer_size().map_err(|e| e.to_string())?.width as i32;
        (rightmost - current_width + RIGHT_OFFSET, work_top)
    };

    bar.set_position(PhysicalPosition { x, y })
        .map_err(|e| e.to_string())?;
    // Width is animated by animate_bar thread; do NOT set_size here
    BAR_EXPANDED.store(true, std::sync::atomic::Ordering::SeqCst);
    BAR_TARGET_X.store(x, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

/// Collapse bar back to narrow.
#[tauri::command]
pub async fn collapse_bar(app: AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let (x, y) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, _work_bottom) =
            get_mouse_monitor_work_area(&app);
        println!("[Tori] collapse_bar LEFT: x={} y={}", leftmost, work_top);
        (leftmost, work_top)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (_work_left, work_top, _work_right, _work_bottom) =
            get_mouse_monitor_work_area(&app);
        let current_width = bar.outer_size().map_err(|e| e.to_string())?.width as i32;
        (rightmost - current_width + RIGHT_OFFSET, work_top)
    };

    bar.set_position(PhysicalPosition { x, y })
        .map_err(|e| e.to_string())?;
    // Width is animated by animate_bar thread; do NOT set_size here
    BAR_EXPANDED.store(false, std::sync::atomic::Ordering::SeqCst);
    BAR_TARGET_X.store(x, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

/// Toggle app window: show if hidden, hide if visible, create if not exists.
#[tauri::command]
pub async fn toggle_app_window(
    app: AppHandle,
    label: String,
    title: String,
    url: String,
    lang: String,
) -> Result<bool, String> {
    // Helper: hide all visible app windows except the given label.
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
            // Second click: hide the parent window and all its children.
            existing.hide().map_err(|e| e.to_string())?;
            let child_labels = {
                let map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
                map.get(&label).cloned().unwrap_or_default()
            };
            for child_label in child_labels {
                if let Some(child) = app.get_webview_window(&child_label) {
                    let _ = child.hide();
                }
            }
            return Ok(false);
        } else {
            // Restore from background: hide others, show self, re-inject nav bar.
            hide_others(&label);
            existing.show().map_err(|e| e.to_string())?;
            existing.set_focus().map_err(|e| e.to_string())?;
            let init_lang = format!(
                r#"localStorage.setItem('tori-sidebar-language', '{}');"#,
                lang
            );
            let _ = existing.eval(&init_lang);
            let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
            let _ = existing.eval(&script);
            return Ok(true);
        }
    }

    // New window: hide all other foreground apps first.
    hide_others("");

    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    // Left/right use different edge strategies:
    // - Left:  GetClientRect+ClientToScreen gives the visible content edge;
    //          +1px micro-adjust eliminates the remaining 1px gap.
    // - Right: outer_position has been verified to produce zero overlap.
    let bar_inner = bar.inner_size().map_err(|e| e.to_string())?;
    let bar_outer = bar.outer_size().map_err(|e| e.to_string())?;
    let bar_pos = bar.outer_position().map_err(|e| e.to_string())?;
    println!("[Tori] toggle_app_window BAR dims: outer_pos=({},{}) outer_size=({},{}) inner_size=({},{})",
        bar_pos.x, bar_pos.y, bar_outer.width, bar_outer.height, bar_inner.width, bar_inner.height);

    let (bar_edge, bar_top, bar_inner_height) = if is_left {
        let edge = get_client_edge(&bar, true)
            .ok_or("Failed to get bar client edge")?;
        let (_, top, _, _) =
            get_window_rect_raw(&bar).ok_or("Failed to get bar window rect")?;
        // Both bar and app windows are WebView2 windows with the same DWM borders.
        // .position() sets the OUTER position, so we must subtract the DWM border
        // width so the app window's CLIENT left edge aligns with the bar's CLIENT
        // right edge.
        let dwm_border = (bar_outer.width - bar_inner.width) as i32 / 2;
        let edge_adj = edge - dwm_border;
        println!("[Tori] toggle_app_window LEFT calc: client_edge={} bar_outer_w={} bar_inner_w={} dwm={} adjusted_edge={}", edge, bar_outer.width, bar_inner.width, dwm_border, edge_adj);
        (edge_adj, top, bar_inner.height)
    } else {
        println!("[Tori] toggle_app_window RIGHT calc: bar_pos.x={} bar_pos.y={} bar_inner_h={}", bar_pos.x, bar_pos.y, bar_inner.height);
        (bar_pos.x, bar_pos.y, bar_inner.height)
    };

    // Base position from sidebar.
    let default_width: u32 = 520;
    let base_y: i32 = bar_top;
    let base_height: u32 = bar_inner_height;

    // Try to restore saved window size and y-position; x is always recalculated
    // based on current sidebar edge and actual window width.
    let (app_width, app_height, app_x, app_y) =
        if let Some(saved) = crate::window_state::get(&label) {
            let w = saved.width;
            let x = if is_left {
                bar_edge
            } else {
                bar_edge - w as i32
            };
            if is_left {
                println!("[Tori] toggle_app_window LEFT (saved): bar_edge={} app_x={} app_y={} app_w={} app_h={}", bar_edge, x, saved.y, w, saved.height);
            }
            (w, saved.height, x, saved.y)
        } else {
            let x = if is_left {
                bar_edge
            } else {
                bar_edge - default_width as i32
            };
            if is_left {
                println!("[Tori] toggle_app_window LEFT (new): bar_edge={} app_x={} app_y={} app_w={} app_h={}", bar_edge, x, base_y, default_width, base_height);
            }
            (default_width, base_height, x, base_y)
        };

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
                let label = window.label();
                if let (Ok(pos), Ok(outer), Ok(inner)) = (window.outer_position(), window.outer_size(), window.inner_size()) {
                    println!("[Tori] APP '{}' created dims: outer_pos=({},{}) outer_size=({},{}) inner_size=({},{})",
                        label, pos.x, pos.y, outer.width, outer.height, inner.width, inner.height);
                }
                let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
                let _ = window.eval(&script);
            }
        })
        .build()
        .map_err(|e| e.to_string())?;

    let init_lang = format!(
        r#"localStorage.setItem('tori-sidebar-language', '{}');"#,
        lang
    );
    let _ = _window.eval(&init_lang);
    let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
    let _ = _window.eval(&script);

    Ok(true)
}

/// Close a specific app window by label.
#[tauri::command]
pub async fn close_app_window(app: AppHandle, label: String) -> Result<(), String> {
    // Save window state before closing.
    if label.starts_with("app-") {
        crate::window_state::save(&app, &label);
    }
    // Parent window closes cascade to children; child window closes remove from map.
    let is_parent = label.starts_with("app-") && !label.contains("-tab-");
    if is_parent {
        close_child_windows_impl(&app, &label);
    } else {
        remove_from_child_map(&label);
    }
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    let _ = app.emit("app-closed", label);
    Ok(())
}

/// Hide a specific app window by label (same effect as toggling it off).
/// Does NOT emit app-closed so the active indicator stays lit.
#[tauri::command]
pub async fn minimize_app_window(app: AppHandle, label: String) -> Result<(), String> {
    if label.starts_with("app-") {
        crate::window_state::save(&app, &label);
    }
    if let Some(window) = app.get_webview_window(&label) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Close all app windows.
#[tauri::command]
pub async fn close_all_app_windows(app: AppHandle) -> Result<(), String> {
    // Close all child windows first.
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
    // Then close all parent windows.
    for (label, window) in app.webview_windows() {
        if label.starts_with("app-") && !label.contains("-tab-") {
            let _ = window.close();
            let _ = app.emit("app-closed", label);
        }
    }
    Ok(())
}

/// Open a child window for the same-domain link.
/// Each parent is allowed at most one child window at a time.
#[tauri::command]
pub async fn open_child_window(
    app: AppHandle,
    parent_label: String,
    url: String,
    title: Option<String>,
    lang: String,
) -> Result<String, String> {
    println!(
        "[Tori] open_child_window called: parent={}, url={}",
        parent_label, url
    );

    // Close any existing child windows for this parent before opening a new one.
    close_child_windows_impl(&app, &parent_label);

    let parsed_url: url::Url = url.parse().map_err(|e| {
        eprintln!("[Tori] URL parse failed: {}", e);
        "Invalid URL".to_string()
    })?;

    let parent = app
        .get_webview_window(&parent_label)
        .ok_or("Parent window not found")?;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let parent_inner = parent.inner_size().map_err(|e| e.to_string())?;
    let parent_outer = parent.outer_size().map_err(|e| e.to_string())?;
    let parent_pos = parent.outer_position().map_err(|e| e.to_string())?;
    println!("[Tori] open_child_window PARENT dims: outer_pos=({},{}) outer_size=({},{}) inner_size=({},{})",
        parent_pos.x, parent_pos.y, parent_outer.width, parent_outer.height, parent_inner.width, parent_inner.height);

    // Same left/right split as toggle_app_window.
    let (parent_edge, parent_top, parent_inner_height, parent_left) = if is_left {
        let edge = get_client_edge(&parent, true)
            .ok_or("Failed to get parent client edge")?;
        let (left, top, _, _) =
            get_window_rect_raw(&parent).unwrap_or((0, 0, 1920, 1080));
        // Same DWM-border compensation as toggle_app_window.
        let dwm_border = (parent_outer.width - parent_inner.width) as i32 / 2;
        let edge_adj = edge - dwm_border;
        println!("[Tori] open_child_window LEFT calc: client_edge={} parent_outer_w={} parent_inner_w={} dwm={} adjusted_edge={}", edge, parent_outer.width, parent_inner.width, dwm_border, edge_adj);
        (edge_adj, top, parent_inner.height, left)
    } else {
        println!("[Tori] open_child_window RIGHT calc: parent_pos.x={} parent_pos.y={} parent_inner_h={}", parent_pos.x, parent_pos.y, parent_inner.height);
        (parent_pos.x, parent_pos.y, parent_inner.height, parent_pos.x)
    };
    println!(
        "[Tori] parent_edge={} parent_top={} parent_inner_height={} parent_left={}",
        parent_edge, parent_top, parent_inner_height, parent_left
    );

    let child_width: u32 = 480;
    let child_height: u32 = parent_inner_height;
    let child_x: i32 = if is_left {
        parent_edge
    } else {
        parent_edge - child_width as i32
    };
    let child_y: i32 = parent_top;
    if is_left {
        println!("[Tori] open_child_window LEFT: parent_edge={} child_x={} child_y={} child_w={} child_h={}", parent_edge, child_x, child_y, child_width, child_height);
    }

    // Boundary protection: use parent's monitor, not mouse position.
    let (work_left, work_top, work_right, _work_bottom) =
        get_window_monitor_work_area(&parent);
    println!(
        "[Tori] parent monitor work_area: left={} top={} right={}",
        work_left, work_top, work_right
    );
    let (final_x, final_y) = if child_x < work_left {
        (parent_left + 20, parent_top + 20)
    } else {
        (child_x, child_y)
    };
    println!(
        "[Tori] child target pos=({},{}) raw_child_x={}",
        final_x, final_y, child_x
    );

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let child_label = format!("{}-tab-{}", parent_label, timestamp);

    let child_title = title
        .filter(|t| !t.is_empty())
        .unwrap_or_else(|| "New Tab".to_string());

    println!(
        "[Tori] creating child window: label={} pos=({},{}) size=({},{}) title={}",
        child_label, final_x, final_y, child_width, child_height, child_title
    );

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
                let label = window.label();
                if let (Ok(pos), Ok(outer), Ok(inner)) = (window.outer_position(), window.outer_size(), window.inner_size()) {
                    println!("[Tori] CHILD '{}' created dims: outer_pos=({},{}) outer_size=({},{}) inner_size=({},{})",
                        label, pos.x, pos.y, outer.width, outer.height, inner.width, inner.height);
                }
                let script = INJECT_JS.replace("__WINDOW_LABEL__", &label);
                let _ = window.eval(&script);
            }
        })
        .build()
        .map_err(|e| {
            eprintln!("[Tori] failed to build child window: {}", e);
            e.to_string()
        })?;

    println!("[Tori] child window created successfully: {}", child_label);

    let init_lang = format!(
        r#"localStorage.setItem('tori-sidebar-language', '{}');"#,
        lang
    );
    let _ = _window.eval(&init_lang);
    let script = INJECT_JS.replace("__WINDOW_LABEL__", &child_label);
    let _ = _window.eval(&script);

    let mut map = CHILD_WINDOWS.lock().unwrap_or_else(|e| e.into_inner());
    map.entry(parent_label)
        .or_default()
        .push(child_label.clone());

    Ok(child_label)
}

/// Close all child windows of a given parent.
#[tauri::command]
pub async fn close_child_windows(app: AppHandle, parent_label: String) -> Result<(), String> {
    close_child_windows_impl(&app, &parent_label);
    Ok(())
}

/// Handle ESC key: close the top-most visible child window if any,
/// otherwise signal frontend.
#[tauri::command]
pub async fn handle_esc(app: AppHandle) -> Result<bool, String> {
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
