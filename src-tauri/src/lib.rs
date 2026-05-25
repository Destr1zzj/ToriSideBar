mod animation;
mod commands;
mod inject;
mod monitor;
mod state;
mod window;

use std::sync::atomic::Ordering;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _mutex = commands::ensure_single_instance();
    if _mutex.is_none() {
        eprintln!("ToriSidebar is already running.");
        std::process::exit(0);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            window::position_bar,
            window::expand_bar,
            window::collapse_bar,
            commands::set_trigger_width,
            commands::get_trigger_width,
            window::toggle_app_window,
            window::close_app_window,
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
            tauri::async_runtime::spawn(async move {
                let _ = window::position_bar(app_handle.clone()).await;
                if let Some(bar) = app_handle.get_webview_window("bar") {
                    let _ = bar.show();
                }
            });

            // Bar starts visible
            state::BAR_TARGET_VISIBLE.store(true, Ordering::SeqCst);

            animation::start_auto_hide(app.handle().clone());
            animation::animate_bar(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
