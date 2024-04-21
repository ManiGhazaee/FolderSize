use jwalk::rayon::iter::{ParallelBridge, ParallelIterator};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    fs::read_dir,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
    time::{Duration, Instant},
};

#[macro_use]
extern crate lazy_static;

lazy_static! {
    pub static ref MAP: Arc<RwLock<HashMap<PathBuf, u64>>> =
        Arc::new(RwLock::new(HashMap::new()));
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

impl Entries {
    pub fn new(root: &PathBuf, size: u64, map: &MAP) -> Self {
        let entries = match read_dir(root) {
            Ok(rd) => rd
                .into_iter()
                .par_bridge()
                .map(|entry| {
                    let path = entry.unwrap().path();
                    let is_file = path.is_file();
                    (*map.read().unwrap().get(&path).unwrap(), path, is_file)
                })
                .collect(),
            _ => Default::default(),
        };
        let mut parent = root.parent().unwrap_or(&Path::new("")).to_path_buf();
        if !MAP.read().unwrap().contains_key(&parent) {
            parent = Path::new("").to_path_buf();
        }
        Self {
            size,
            root: root.to_owned(),
            parent,
            entries,
        }
    }
}
