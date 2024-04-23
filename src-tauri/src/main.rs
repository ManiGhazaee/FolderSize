#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{path::Path, time::Instant};

use file_size::{open, FolderSize};
use tauri::Runtime;

#[tauri::command]
async fn folder_size<R: Runtime>(window: tauri::Window<R>, path: String) -> u64 {
    let inst = Instant::now();

    let path_buf = Path::new(&path).to_path_buf();
    let size = FolderSize::run(path_buf, window);

    dbg!(inst.elapsed());

    size
}

#[tauri::command]
async fn reveal(path: String, is_file: bool) {
    if is_file {
        if let Some(path) = Path::new(&path).to_path_buf().parent() {
            open(path.to_string_lossy());
        }
    } else {
        open(path);
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![folder_size, reveal])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
