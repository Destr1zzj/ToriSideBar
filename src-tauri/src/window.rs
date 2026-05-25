use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewUrl,
    WebviewWindowBuilder,
};
use tauri::webview::PageLoadEvent;

use crate::inject::INJECT_JS;
use crate::monitor::{get_leftmost_monitor_left, get_rightmost_monitor_right, get_mouse_monitor_work_area, get_window_monitor_work_area};
use crate::state::*;

// ------------------------------------------------------------------
// Child-window helpers
// ------------------------------------------------------------------

/// Close all child windows of a parent and remove from map.
fn close_child_windows_impl(app: &AppHandle, parent_label: &str) {
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

    // Edge offset: WebView2 renders with a small inset inside the client area.
    // Left edge shifts left so content touches the bezel.
    // Right edge shifts right so content touches the bezel (trigger zone unchanged).
    const LEFT_OFFSET: i32 = 5;
    const RIGHT_OFFSET: i32 = 6;

    let (x, y, height) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        let x = leftmost;
        let y = work_top;
        let height = work_bottom - work_top;
        (x, y, height)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
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
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let expanded = 280i32;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let (x, y, height) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        (leftmost, work_top, work_bottom - work_top)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        (rightmost - expanded + 3, work_top, work_bottom - work_top)
    };

    bar.set_position(PhysicalPosition { x, y })
        .map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize {
        width: expanded as u32,
        height: height as u32,
    })
    .map_err(|e| e.to_string())?;
    BAR_EXPANDED.store(true, std::sync::atomic::Ordering::SeqCst);
    BAR_TARGET_X.store(x, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

/// Collapse bar back to narrow.
#[tauri::command]
pub async fn collapse_bar(app: AppHandle) -> Result<(), String> {
    let bar = app.get_webview_window("bar").ok_or("Bar not found")?;
    let narrow = 64i32;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;

    let (x, y, height) = if is_left {
        let leftmost = get_leftmost_monitor_left(&app);
        crate::state::BAR_FIXED_LEFT.store(leftmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        (leftmost, work_top, work_bottom - work_top)
    } else {
        let rightmost = get_rightmost_monitor_right(&app);
        crate::state::BAR_FIXED_RIGHT.store(rightmost, std::sync::atomic::Ordering::SeqCst);
        let (work_left, work_top, _work_right, work_bottom) =
            get_mouse_monitor_work_area(&app);
        (rightmost - narrow + 3, work_top, work_bottom - work_top)
    };

    bar.set_position(PhysicalPosition { x, y })
        .map_err(|e| e.to_string())?;
    bar.set_size(PhysicalSize {
        width: narrow as u32,
        height: height as u32,
    })
    .map_err(|e| e.to_string())?;
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
            // Second click: hide the currently visible window.
            existing.hide().map_err(|e| e.to_string())?;
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
    let bar_pos = bar.outer_position().map_err(|e| e.to_string())?;
    let bar_size = bar.outer_size().map_err(|e| e.to_string())?;

    let app_width: u32 = 520;
    let app_height: u32 = bar_size.height;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;
    let app_x: i32 = if is_left {
        bar_pos.x + bar_size.width as i32
    } else {
        bar_pos.x - app_width as i32
    };
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
    let parent_pos = parent.outer_position().map_err(|e| e.to_string())?;
    let parent_size = parent.outer_size().map_err(|e| e.to_string())?;
    println!(
        "[Tori] parent pos=({},{}) size=({},{})",
        parent_pos.x, parent_pos.y, parent_size.width, parent_size.height
    );

    let child_width: u32 = 480;
    let child_height: u32 = parent_size.height;
    let is_left = crate::state::BAR_POSITION.load(std::sync::atomic::Ordering::SeqCst) == 0;
    let child_x: i32 = if is_left {
        parent_pos.x + parent_size.width as i32
    } else {
        parent_pos.x - child_width as i32
    };
    let child_y: i32 = parent_pos.y;

    // Boundary protection: use parent's monitor, not mouse position.
    let (work_left, work_top, work_right, _work_bottom) =
        get_window_monitor_work_area(&parent);
    println!(
        "[Tori] parent monitor work_area: left={} top={} right={}",
        work_left, work_top, work_right
    );
    let (final_x, final_y) = if child_x < work_left {
        (parent_pos.x + 20, parent_pos.y + 20)
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
