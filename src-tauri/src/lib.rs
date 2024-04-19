#[allow(invalid_reference_casting)]
pub mod index {
    use std::collections::HashMap;

    use serde::{Deserialize, Serialize};

    type Val = (String, u64, bool);

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub(super) struct Node {
        pub(super) val: Val,
        pub(super) parent: Option<usize>,
        pub(super) children: Vec<usize>,
    }

    impl Node {
        pub(super) fn new(val: Val, parent: Option<usize>) -> Self {
            Self {
                val,
                parent,
                children: Vec::new(),
            }
        }
    }

    #[derive(Clone, Debug, Serialize, Deserialize)]
    pub struct Tree {
        pub(super) map: HashMap<String, usize>,
        pub(super) vals: Vec<Node>,
        pub(super) current: usize,
    }

    impl Tree {
        pub fn new(root_val: Val) -> Self {
            let mut ret = Self {
                map: HashMap::new(),
                vals: Vec::new(),
                current: 0,
            };
            ret.vals.push(Node::new(root_val.clone(), None));
            ret.map.insert(root_val.0, 0);
            ret
        }
        pub fn current(&self) -> &Val {
            self.val(self.current)
        }
        pub fn current_mut(&mut self) -> &mut Val {
            self.val_mut(self.current)
        }
        #[inline]
        fn val(&self, index: usize) -> &Val {
            unsafe { &self.vals.get_unchecked(index).val }
        }
        #[inline]
        fn val_mut(&mut self, index: usize) -> &mut Val {
            unsafe { &mut self.vals.get_unchecked_mut(index).val }
        }
        pub fn push_child(&mut self, val: Val) {
            self.vals.push(Node::new(val.clone(), Some(self.current)));
            let len = self.vals.len();
            self.vals[self.current].children.push(len - 1);
            self.map.insert(val.0, len - 1);
        }
        pub fn is_root(&self) -> bool {
            self.vals[self.current].parent.is_none()
        }
        pub fn set_current_to_parent(&mut self) {
            if self.is_root() {
                return;
            }
            self.current = self.vals[self.current].parent.unwrap();
        }
        pub fn set_current_to_root(&mut self) {
            if self.vals.is_empty() {
                return;
            }
            self.current = 0;
        }
        pub fn set_current_by_val(&mut self, val: &String) {
            let i = self.map.get(val).unwrap();
            self.current = *i;
        }
    }
}
