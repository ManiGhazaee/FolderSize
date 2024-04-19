// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#![allow(dead_code)]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command

use std::{fs::read_dir, mem, os::windows::fs::MetadataExt, path::Path, time::Instant};

use file_size::index::Tree;
use jwalk::rayon::iter::{ParallelBridge, ParallelIterator};
use tauri::{Manager, Runtime};

static mut TREE: Option<Tree> = None;

#[tauri::command]
async fn folder_size<R: Runtime>(window: tauri::Window<R>, path: String) -> String {
    let inst = Instant::now();
    let path_str = Path::new(&path).to_string_lossy().to_string();
    let mut tree = Tree::new((path_str.clone(), 0, false));
    let size = recurse_size_tree(&window, Path::new(&path), &mut tree);
    dbg!(inst.elapsed());
    unsafe {
        tree.set_current_to_root();
        *tree.current_mut() = (path_str, size, false);
        let _ = mem::replace(&mut TREE, Some(tree));
        if let Some(tree) = &TREE {
            window.emit_all("folder-size", tree).unwrap();
        }
    }

    convert_size(size)
}

fn recurse_size_tree<'a, R: Runtime>(
    app: &tauri::Window<R>,
    path: &Path,
    tree: &'a mut Tree,
) -> u64 {
    if path.is_file() {
        let size = file_size(path);
        size
    } else if path.is_dir() {
        let size = match read_dir(path) {
            Ok(rd) => rd
                .into_iter()
                .map(|entry| {
                    let path = entry.unwrap().path();
                    let path_str = path.to_string_lossy().to_string();
                    let is_file = path.is_file();

                    tree.push_child((path_str.clone(), 0, is_file));
                    tree.set_current_by_val(&path_str);

                    let size = recurse_size_tree(app, &path, tree);

                    tree.set_current_by_val(&path_str);
                    *tree.current_mut() = (path_str, size, is_file);
                    tree.set_current_to_parent();

                    size
                })
                .sum(),
            _ => 0,
        };

        *tree.current_mut() = (tree.current().0.clone(), size, tree.current().2);
        tree.set_current_to_parent();

        size
    } else {
        0
    }
}

fn recurse_size(path: &Path) -> u64 {
    if path.is_file() {
        return file_size(path);
    } else if path.is_dir() {
        return match read_dir(path) {
            Ok(rd) => rd
                .into_iter()
                .par_bridge()
                .map(|entry| {
                    let path = entry.unwrap().path();
                    return recurse_size(&path);
                })
                .sum(),
            _ => return 0,
        };
    } else {
        0
    }
}

fn file_size(path: &Path) -> u64 {
    match path.metadata() {
        Ok(m) => m.file_size(),
        _ => 0,
    }
}

fn convert_size(bytes: u64) -> String {
    let string = bytes.to_string();
    let bytes = bytes as f32;
    match string.len() {
        0..=3 => format!("{}{}", string, "B"),
        4..=6 => format!("{:.2}{}", bytes / iec(1), "KB"),
        7..=9 => format!("{:.2}{}", bytes / iec(2), "MB"),
        10..=12 => format!("{:.2}{}", bytes / iec(3), "GB"),
        13..=15 => format!("{:.2}{}", bytes / iec(4), "GB"),
        16..=21 => format!("{:.2}{}", bytes / iec(5), "TB"),
        _ => "0B".to_string(),
    }
}

fn iec(pow: u32) -> f32 {
    (1024 as u32).pow(pow) as f32
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();
            window.open_devtools();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![folder_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
