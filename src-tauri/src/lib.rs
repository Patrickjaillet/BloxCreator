mod db;
mod error;
mod hashing;
mod models;
mod parser;

use tauri::Manager;

#[tauri::command]
fn get_app_version(app_handle: tauri::AppHandle) -> String {
    app_handle.package_info().version.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("blox_creator.db");
            let conn = db::init_connection(&db_path)?;
            app.manage(db::Db(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![get_app_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
