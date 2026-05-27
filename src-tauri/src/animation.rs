use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize};

use crate::monitor::{get_mouse_monitor_work_area, get_mouse_pos};
use crate::state::*;

// Edge offset to compensate for WebView2 content inset.
const RIGHT_OFFSET: i32 = -6;

/// Animation thread: smoothly slides the bar in/out from the configured edge.
/// Runs at ~60fps (16ms interval).
pub fn animate_bar(app_handle: AppHandle) {
    thread::spawn(move || {
        let mut current_x: i32 = 0;
        let mut current_y: i32 = 0;
        let mut current_width: u32 = 64;
        let mut current_height: u32 = 0;
        let mut initialized = false;

        loop {
            thread::sleep(Duration::from_millis(16));

            let bar = match app_handle.get_webview_window("bar") {
                Some(w) => w,
                None => continue,
            };

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

            // Width animation (always runs, even when expanded)
            let target_width = if BAR_EXPANDED.load(Ordering::SeqCst) {
                280u32
            } else {
                64u32
            };

            if !initialized {
                if let Ok(pos) = bar.outer_position() {
                    current_x = pos.x;
                    current_y = pos.y;
                }
                if let Ok(size) = bar.outer_size() {
                    current_width = size.width;
                    current_height = size.height;
                }
                let is_left = BAR_POSITION.load(Ordering::SeqCst) == 0;
                println!("[Tori] animate_bar init: is_left={} current_x={} current_y={} current_w={} current_h={}", is_left, current_x, current_y, current_width, current_height);
                initialized = true;
                let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                let _ = bar.set_size(PhysicalSize {
                    width: current_width,
                    height: current_height,
                });
                if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                    let _ = bar.show();
                }
                continue;
            }

            let mut moved = false;

            // Width transition (no teleport — always ease-out frame by frame)
            if current_width != target_width {
                let diff = target_width as f32 - current_width as f32;
                let step = (diff * 0.15).round() as i32;
                let step = diff.signum() as i32 * step.abs().clamp(1, 16);
                current_width = (current_width as i32 + step) as u32;
                if (target_width as i32 - current_width as i32).abs() <= step.abs() {
                    current_width = target_width;
                }
                moved = true;
            }

            // Position logic
            if BAR_EXPANDED.load(Ordering::SeqCst) {
                // When expanded: keep bar visible and sync position for width changes
                let target_x = if is_left {
                    screen_left
                } else {
                    let explicit = BAR_TARGET_X.load(Ordering::SeqCst);
                    if explicit != 0 {
                        BAR_TARGET_X.store(0, Ordering::SeqCst);
                        explicit
                    } else {
                        screen_right - current_width as i32 + RIGHT_OFFSET
                    }
                };
                let target_y = screen_top;

                if current_x != target_x || current_y != target_y {
                    current_x = target_x;
                    current_y = target_y;
                    moved = true;
                } else if let Ok(pos) = bar.outer_position() {
                    // Only sync when we didn't just write a new target,
                    // otherwise outer_position() may race with set_position
                    // and return the old coordinate.
                    current_x = pos.x;
                    current_y = pos.y;
                }
            } else {
                // Normal position animation (sliding in/out)
                let target_x = {
                    let explicit = BAR_TARGET_X.load(Ordering::SeqCst);
                    if explicit != 0 {
                        BAR_TARGET_X.store(0, Ordering::SeqCst);
                        explicit
                    } else {
                        if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) {
                            if is_left { screen_left } else { screen_right - current_width as i32 + RIGHT_OFFSET }
                        } else {
                            if is_left { screen_left - current_width as i32 } else { screen_right + RIGHT_OFFSET }
                        }
                    }
                };
                let target_y = screen_top;

                if current_x != target_x {
                    let diff = target_x - current_x;
                    if diff.abs() > 500 {
                        current_x = target_x;
                    } else {
                        let step = ((diff as f32) * 0.18).round() as i32;
                        let step = diff.signum() * step.abs().clamp(2, 32);
                        current_x += step;
                        if (target_x - current_x).abs() <= step.abs() {
                            current_x = target_x;
                        }
                    }
                    moved = true;
                }

                if current_y != target_y {
                    current_y = target_y;
                    moved = true;
                }
            }

            if moved {
                if is_left {
                    println!("[Tori] animate_bar LEFT: current_x={} target_x={} current_w={} target_w={} screen_left={}", current_x, if BAR_EXPANDED.load(Ordering::SeqCst) { screen_left } else { if BAR_TARGET_VISIBLE.load(Ordering::SeqCst) { screen_left } else { screen_left - current_width as i32 } }, current_width, target_width, screen_left);
                }
                let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                let _ = bar.set_size(PhysicalSize {
                    width: current_width,
                    height: current_height,
                });

                let partially_on_screen = if is_left {
                    current_x + current_width as i32 > screen_left
                } else {
                    current_x < screen_right
                };
                if partially_on_screen {
                    let _ = bar.show();
                }

                let fully_off_screen = if is_left {
                    current_x + current_width as i32 <= screen_left + 1
                        && !BAR_TARGET_VISIBLE.load(Ordering::SeqCst)
                        && !BAR_EXPANDED.load(Ordering::SeqCst)
                } else {
                    current_x >= screen_right
                        && !BAR_TARGET_VISIBLE.load(Ordering::SeqCst)
                        && !BAR_EXPANDED.load(Ordering::SeqCst)
                };
                if fully_off_screen {
                    let _ = bar.hide();
                }
            } else {
                let is_visible = bar.is_visible().unwrap_or(false);
                if (BAR_TARGET_VISIBLE.load(Ordering::SeqCst) || BAR_EXPANDED.load(Ordering::SeqCst))
                    && !is_visible
                {
                    let _ = bar.set_position(PhysicalPosition { x: current_x, y: current_y });
                    let _ = bar.set_size(PhysicalSize {
                        width: current_width,
                        height: current_height,
                    });
                    let _ = bar.show();
                } else if !BAR_TARGET_VISIBLE.load(Ordering::SeqCst)
                    && !BAR_EXPANDED.load(Ordering::SeqCst)
                    && is_visible
                {
                    let fully_off = if is_left {
                        current_x + current_width as i32 <= screen_left + 1
                    } else {
                        current_x >= screen_right
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

            // Locked by global shortcut: force visible, unlock on click outside
            if BAR_LOCKED.load(Ordering::SeqCst) {
                if !over_bar && !over_app {
                    unsafe {
                        let lbutton = winapi::um::winuser::GetAsyncKeyState(
                            winapi::um::winuser::VK_LBUTTON,
                        );
                        if lbutton != 0 {
                            BAR_LOCKED.store(false, Ordering::SeqCst);
                            BAR_TARGET_VISIBLE.store(false, Ordering::SeqCst);
                            TRIGGER_ACTIVE.store(false, Ordering::SeqCst);
                            was_over = false;
                            continue;
                        }
                    }
                }
                if !was_over {
                    BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);
                    was_over = true;
                }
                continue;
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
                // First-run: dismiss guide on first trigger (mouse edge or shortcut)
                if FIRST_RUN_GUIDE_ACTIVE.load(Ordering::SeqCst) {
                    FIRST_RUN_GUIDE_ACTIVE.store(false, Ordering::SeqCst);
                    crate::commands::mark_first_run_seen();
                    crate::guide_native::close_guide();
                }
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
