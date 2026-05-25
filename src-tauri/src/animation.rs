use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition};

use crate::monitor::{get_mouse_monitor_work_area, get_mouse_pos};
use crate::state::*;

const BAR_WIDTH: i32 = 64;

/// Animation thread: smoothly slides the bar in/out from the configured edge.
/// Runs at ~60fps (16ms interval).
pub fn animate_bar(app_handle: AppHandle) {
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

            let is_left = BAR_POSITION.load(Ordering::SeqCst) == 0;
            let screen_left = if is_left {
                BAR_FIXED_LEFT.load(Ordering::SeqCst)
            } else {
                BAR_SCREEN_LEFT.load(Ordering::SeqCst)
            };
            let screen_right = if is_left {
                BAR_SCREEN_RIGHT.load(Ordering::SeqCst)
            } else {
                BAR_FIXED_RIGHT.load(Ordering::SeqCst)
            };
            let screen_top = BAR_SCREEN_TOP.load(Ordering::SeqCst);
            if !crate::state::MONITOR_INFO_READY.load(Ordering::SeqCst) {
                continue;
            }

            // Determine target x:
            // - If BAR_TARGET_X was explicitly set (expand/collapse), use it
            // - Otherwise derive from visibility state
            let target_x = {
                let explicit = BAR_TARGET_X.load(Ordering::SeqCst);
                if explicit != 0 {
                    // Clear explicit target after reading once
                    BAR_TARGET_X.store(0, Ordering::SeqCst);
                    explicit
                } else {
                    if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                        if is_left { screen_left } else { screen_right - BAR_WIDTH }
                    } else {
                        if is_left { screen_left - BAR_WIDTH } else { screen_right }
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
                let partially_on_screen = if is_left {
                    current_x + BAR_WIDTH > screen_left
                } else {
                    current_x < screen_right
                };
                if partially_on_screen {
                    let _ = bar.show();
                }

                // Fully off-screen and target is hidden -> hide() to stop intercepting mouse
                let fully_off_screen = if is_left {
                    current_x + BAR_WIDTH <= screen_left + 1 && !BAR_TARGET_VISIBLE.load(Ordering::SeqCst)
                } else {
                    current_x >= screen_right - 1 && !BAR_TARGET_VISIBLE.load(Ordering::SeqCst)
                };
                if fully_off_screen {
                    let _ = bar.hide();
                }
            } else {
                // Even if x/y haven't changed, ensure visibility matches target
                let is_visible = bar.is_visible().unwrap_or(false);
                if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) && !is_visible {
                    let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                    let _ = bar.show();
                } else if !BAR_TARGET_VISIBLE.load(Ordering::SeqCst) && is_visible {
                    let fully_off = if is_left {
                        current_x + BAR_WIDTH <= screen_left + 1
                    } else {
                        current_x >= screen_right - 1
                    };
                    if fully_off {
                        let _ = bar.hide();
                    }
                }
            }
        }
    });
}

/// Decision thread: detects mouse position and decides target visibility.
/// Runs every 150ms.
pub fn start_auto_hide(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut was_over = true;

        loop {
            thread::sleep(Duration::from_millis(150));

            let bar = match app_handle.get_webview_window("bar") {
                Some(w) => w,
                None => continue,
            };

            // Settings panel open or drag-sort in progress: force visible
            if BAR_EXPANDED.load(Ordering::SeqCst)
                || DRAGGING.load(Ordering::SeqCst)
            {
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
            let (work_left, work_top, work_right, _work_bottom) =
                get_mouse_monitor_work_area(&app_handle);
            BAR_SCREEN_LEFT.store(work_left, Ordering::SeqCst);
            BAR_SCREEN_RIGHT.store(work_right, Ordering::SeqCst);
            BAR_SCREEN_TOP.store(work_top, Ordering::SeqCst);
            crate::state::MONITOR_INFO_READY.store(true, Ordering::SeqCst);

            let over_bar = mouse.0 >= bar_pos.x
                && mouse.0 <= bar_pos.x + bar_size.width as i32
                && mouse.1 >= bar_pos.y
                && mouse.1 <= bar_pos.y + bar_size.height as i32;

            let mut over_app = false;
            let mut any_app_visible = false;
            for (label, window) in app_handle.webview_windows() {
                if label.starts_with("app-") {
                    if let Ok(visible) = window.is_visible() {
                        if visible {
                            any_app_visible = true;
                            if let (Ok(pos), Ok(size)) =
                                (window.outer_position(), window.outer_size())
                            {
                                if mouse.0 >= pos.x
                                    && mouse.0 <= pos.x + size.width as i32
                                    && mouse.1 >= pos.y
                                    && mouse.1 <= pos.y + size.height as i32
                                {
                                    over_app = true;
                                }
                            }
                        }
                    }
                }
            }

            let is_left = BAR_POSITION.load(Ordering::SeqCst) == 0;
            let trigger = TRIGGER_WIDTH.load(Ordering::SeqCst) as i32;
            // Trigger zone is measured from the monitor's configured edge.
            // For left-docked bar, use the fixed leftmost edge across all displays.
            let near_edge = if is_left {
                let fixed_left = BAR_FIXED_LEFT.load(Ordering::SeqCst);
                mouse.0 <= fixed_left + trigger
            } else {
                let fixed_right = BAR_FIXED_RIGHT.load(Ordering::SeqCst);
                mouse.0 >= fixed_right - trigger
            };

            let trigger_active = TRIGGER_ACTIVE.load(Ordering::SeqCst);
            let should_show = if trigger_active {
                over_bar || over_app || near_edge || any_app_visible
            } else {
                // Even before trigger is "unlocked", keep bar visible if mouse is over it
                over_bar || near_edge || any_app_visible
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
