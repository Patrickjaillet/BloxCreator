mod commands;
mod db;
mod error;
mod hashing;
mod models;
mod parser;

use tauri::Manager;

use commands::blocks::{
    check_duplicate, compute_hash_preview, create_block, delete_block, get_blocks,
    get_genres_and_categories, rename_function_in_block, search_blocks, update_block,
};
use commands::import::{
    confirm_fragment_import, decompose_monaco_content, import_markdown_content,
    import_markdown_file, import_seed_library_if_empty,
};
use commands::shaders::{
    assemble_shader_preview, delete_shader, export_shader_as_glsl, list_shaders, load_shader,
    save_shader,
};

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
            import_seed_library_if_empty(&conn)?;
            app.manage(db::Db(std::sync::Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            import_markdown_file,
            import_markdown_content,
            decompose_monaco_content,
            confirm_fragment_import,
            get_genres_and_categories,
            get_blocks,
            search_blocks,
            create_block,
            update_block,
            delete_block,
            compute_hash_preview,
            check_duplicate,
            assemble_shader_preview,
            save_shader,
            list_shaders,
            load_shader,
            delete_shader,
            export_shader_as_glsl,
            rename_function_in_block,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
