#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{path::Path, time::Instant};

use file_size::X;
use tauri::Runtime;

#[tauri::command]
async fn folder_size<R: Runtime>(window: tauri::Window<R>, path: String) -> u64 {
    let inst = Instant::now();

    let size = X::run(Path::new(&path).to_path_buf(), window);

    dbg!(inst.elapsed());

    size
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![folder_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
