mod animation;
mod commands;
mod guide_native;
mod inject;
mod monitor;
mod state;
mod window;
mod window_state;

use std::sync::atomic::Ordering;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Attach to parent console when launched from terminal so eprintln! is visible
    unsafe {
        winapi::um::wincon::AttachConsole(winapi::um::wincon::ATTACH_PARENT_PROCESS);
    }

    // Panic hook: write to log file so users can report crashes
    let log_dir = std::env::var("APPDATA")
        .map(|p| std::path::PathBuf::from(p).join("ToriSidebar"))
        .unwrap_or_else(|_| std::env::temp_dir().join("ToriSidebar"));
    let _ = std::fs::create_dir_all(&log_dir);
    let panic_log = log_dir.join("panic.log");
    std::panic::set_hook(Box::new(move |info| {
        let secs = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let payload = info.payload().downcast_ref::<&str>().unwrap_or(&"unknown");
        let location = info.location().map(|l| format!("{}:{}", l.file(), l.line())).unwrap_or_default();
        let message = format!("[{}] PANIC: {} at {}\n", secs, payload, location);
        eprintln!("{}", message);
        let _ = std::fs::write(&panic_log, &message);
    }));

    let _mutex = commands::ensure_single_instance();
    if _mutex.is_none() {
        eprintln!("ToriSidebar is already running.");
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            window::position_bar,
            window::expand_bar,
            window::collapse_bar,
            commands::set_trigger_width,
            commands::get_trigger_width,
            window::toggle_app_window,
            window::close_app_window,
            window::minimize_app_window,
            window::close_all_app_windows,
            window::open_child_window,
            window::close_child_windows,
            window::handle_esc,
            commands::set_dragging,
            commands::open_external_url,
            commands::exit_app,
            commands::sync_language,
            commands::read_edge_user_apps,
            commands::confirm_exit,
            commands::set_bar_position,
            commands::get_bar_position,
            commands::toggle_bar_visible,
            commands::get_app_version,
            commands::export_config,
            commands::check_update,
            commands::show_guide_window,
            commands::close_guide_window,
            commands::reset_first_run,
            commands::reset_window_states,
            commands::reset_window_state,
        ])
        .setup(|app| {
            // System tray icon with right-click menu
            let quit_i =
                tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
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
            let is_first = commands::is_first_run();

            if is_first {
                // First run: keep bar hidden, show edge glow until user triggers the bar
                state::BAR_TARGET_VISIBLE.store(false, Ordering::SeqCst);
                state::FIRST_RUN_GUIDE_ACTIVE.store(true, Ordering::SeqCst);
                let _ = commands::show_guide_window(app_handle.clone());
            } else {
                state::BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);
            }

            let should_show_bar = !is_first;
            tauri::async_runtime::spawn(async move {
                let _ = window::position_bar(app_handle.clone()).await;
                if should_show_bar {
                    if let Some(bar) = app_handle.get_webview_window("bar") {
                        let _ = bar.show();
                    }
                }
            });

            animation::start_auto_hide(app.handle().clone());
            animation::animate_bar(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
