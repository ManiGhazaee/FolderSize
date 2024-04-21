#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::read_dir,
    os::windows::fs::MetadataExt,
    path::Path,
    sync::{Arc, Mutex, RwLock},
    time::{Duration, Instant},
};

use file_size::{Entries, Timer, MAP};
use jwalk::rayon::iter::{ParallelBridge, ParallelIterator};
use tauri::Runtime;

#[tauri::command]
async fn folder_size<R: Runtime>(window: tauri::Window<R>, path: String) -> u64 {
    let inst = Instant::now();
    let path_str = Path::new(&path).to_path_buf();
    let timer = Arc::new(Mutex::new(Timer::new(Duration::from_millis(400))));
    let sum_size: Arc<RwLock<u64>> = Arc::new(RwLock::new(0));
    let window = Arc::new(window);
    let size = recurse_size_map(Arc::clone(&window), &path_str, &MAP, sum_size, timer);

    let entries = Entries::new(&path_str, size, &MAP);

    window.emit("entries", entries).unwrap();

    dbg!(inst.elapsed());

    size
}

fn recurse_size_map<'a, R: Runtime>(
    window: Arc<tauri::Window<R>>,
    path: &Path,
    map: &MAP,
    sum_size: Arc<RwLock<u64>>,
    timer: Arc<Mutex<Timer>>,
) -> u64 {
    if path.is_file() {
        let size = file_size(path);

        *sum_size.write().unwrap() += size;

        if timer.lock().unwrap().tick() {
            window.emit("sum-size", *sum_size.read().unwrap()).unwrap();
        }

        size
    } else if path.is_dir() {
        let path_buf = path.to_path_buf();
        if map.read().unwrap().contains_key(&path_buf) {
            *map.read().unwrap().get(&path_buf).unwrap()
        } else {
            let size = match read_dir(path) {
                Ok(rd) => rd
                    .into_iter()
                    .par_bridge()
                    .map(|entry| {
                        let path = entry.unwrap().path();
                        if map.read().unwrap().contains_key(&path) {
                            *map.read().unwrap().get(&path).unwrap()
                        } else {
                            let size = recurse_size_map(
                                Arc::clone(&window),
                                &path,
                                &map,
                                Arc::clone(&sum_size),
                                Arc::clone(&timer),
                            );
                            map.write().unwrap().insert(path, size);
                            size
                        }
                    })
                    .sum(),
                _ => 0,
            };
            map.write().unwrap().insert(path_buf, size);
            size
        }
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

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![folder_size])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
