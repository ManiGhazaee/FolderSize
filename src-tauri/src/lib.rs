use jwalk::rayon::iter::{ParallelBridge, ParallelIterator};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::read_dir,
    os::windows::fs::MetadataExt,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, RwLock},
    time::{Duration, Instant},
};
use tauri::{Runtime, Window};

#[macro_use]
extern crate lazy_static;

lazy_static! {
    pub static ref MAP: Arc<RwLock<HashMap<PathBuf, u64>>> = Arc::new(RwLock::new(HashMap::new()));
}

pub struct Timer {
    dur: Duration,
    last: Instant,
    left: Duration,
}

impl Timer {
    pub fn new(duration: Duration) -> Self {
        Self {
            dur: duration,
            last: Instant::now(),
            left: duration,
        }
    }
    pub fn tick(&mut self) -> bool {
        let now = Instant::now();
        let elpsd = now - self.last;
        self.last = now;
        if self.left <= elpsd {
            self.left = self.dur - (Self::rem(elpsd, self.dur));
            true
        } else {
            self.left -= elpsd;
            false
        }
    }
    fn rem(mut d1: Duration, d2: Duration) -> Duration {
        while d1 >= d2 {
            d1 -= d2;
        }
        d1
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct Entries {
    size: u64,
    root: PathBuf,
    parent: PathBuf,
    entries: Vec<(u64, PathBuf, bool)>,
}

pub struct X<R: Runtime> {
    root: PathBuf,
    timer: Arc<Mutex<Timer>>,
    size: Arc<RwLock<u64>>,
    window: Arc<Window<R>>,
    map: &'static MAP,
}

impl<R: Runtime> X<R> {
    pub fn run(root: PathBuf, window: Window<R>) -> u64 {
        let s = Self {
            root: root.clone(),
            timer: Arc::new(Mutex::new(Timer::new(Duration::from_millis(400)))),
            size: Arc::new(RwLock::new(0)),
            window: Arc::new(window),
            map: &MAP,
        };
        *s.size.write().unwrap() = s.recurse(&root);
        let entries = s.entries();
        s.window.emit("entries", entries).unwrap();
        let x = *s.size.read().unwrap();
        x
    }
    fn recurse(&self, path: &Path) -> u64 {
        if path.is_file() {
            let size = size_of(path);
            *self.size.write().unwrap() += size;
            if self.timer.lock().unwrap().tick() {
                self.window
                    .emit("sum-size", *self.size.read().unwrap())
                    .unwrap();
            }
            size
        } else if path.is_dir() {
            let path_buf = path.to_path_buf();
            if self.map.read().unwrap().contains_key(&path_buf) {
                *self.map.read().unwrap().get(&path_buf).unwrap()
            } else {
                let size = match read_dir(path) {
                    Ok(rd) => rd
                        .into_iter()
                        .par_bridge()
                        .map(|entry| {
                            let path = entry.unwrap().path();
                            if self.map.read().unwrap().contains_key(&path) {
                                *self.map.read().unwrap().get(&path).unwrap()
                            } else {
                                let size = self.recurse(&path);
                                self.map.write().unwrap().insert(path, size);
                                size
                            }
                        })
                        .sum(),
                    _ => 0,
                };
                self.map.write().unwrap().insert(path_buf, size);
                size
            }
        } else {
            0
        }
    }
    pub fn entries(&self) -> Entries {
        let entries = match read_dir(self.root.clone()) {
            Ok(rd) => rd
                .into_iter()
                .par_bridge()
                .map(|entry| {
                    let path = entry.unwrap().path();
                    let is_file = path.is_file();
                    (*self.map.read().unwrap().get(&path).unwrap(), path, is_file)
                })
                .collect(),
            _ => Default::default(),
        };
        let mut parent = self.root.parent().unwrap_or(&Path::new("")).to_path_buf();
        if !MAP.read().unwrap().contains_key(&parent) {
            parent = Path::new("").to_path_buf();
        }
        Entries {
            size: *self.size.read().unwrap(),
            root: self.root.to_owned(),
            parent,
            entries,
        }
    }
}

pub fn size_of(path: &Path) -> u64 {
    match path.metadata() {
        Ok(m) => m.file_size(),
        _ => 0,
    }
}
