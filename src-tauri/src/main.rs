#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};

use folder_size::{open, Details, Folder, FolderSize, MAP};
use tauri::{Manager, Runtime};

#[tauri::command]
async fn folder_size<R: Runtime>(window: tauri::Window<R>, path: String) -> u64 {
    let path_buf = Path::new(&path).to_path_buf();
    let size = FolderSize::run(path_buf, window);

    size
}

#[tauri::command]
async fn search<R: Runtime>(window: tauri::Window<R>, pat: String, path: String) -> Folder {
    let mut entries: Vec<(u64, PathBuf, bool)> = Vec::new();
    let cancel = Arc::new(RwLock::new(false));
    let cancel_clone = cancel.clone();
    window.listen_global("cancel-search", move |_ev| {
        *cancel_clone.write().unwrap() = true;
    });
    for i in MAP.read().unwrap().iter() {
        if *cancel.read().unwrap() {
            return Default::default();
        }
        if !i.0.to_string_lossy().contains(&path) {
            continue;
        }
        let file_name = i.0.file_name().unwrap_or_default().to_string_lossy();
        if file_name.contains(&pat) {
            entries.push((*i.1, i.0.to_path_buf(), i.0.is_file()));
        };
    }
    let mut ret = Folder {
        entries,
        ..Default::default()
    };
    ret.sort();
    ret
}

#[tauri::command]
async fn reveal(path: String) {
    let p = Path::new(&path);
    if p.is_file() {
        if let Some(p) = p.to_path_buf().parent() {
            open(p.to_string_lossy());
        }
    } else {
        open(path);
    }
}

#[tauri::command]
async fn details(path: String) -> Details {
    Details::new(&path)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            folder_size,
            reveal,
            search,
            details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
