//! Historique (DA6, D11) : `UndoManager` de yrs 0.28.1 configuré à la main. Sous Wasm, ni `UndoManager::new()` ni
//! `Options::default()` n'existent, et il n'y a pas d'horloge système : horloge `|| 0`, délai 0, origine "local".
//! Une transaction d'origine "local" = un geste = une étape ; tout le reste (page initiale, chargement, distant)
//! n'entre pas dans l'historique.
use std::collections::HashSet;
use std::sync::Arc;

use yrs::undo::Options;
use yrs::{ArrayRef, Doc, MapRef, Origin, UndoManager};

use crate::document::LOCAL;

pub struct History {
    mgr: UndoManager,
}

impl History {
    pub fn new(doc: &Doc, pages: &ArrayRef, meta: &MapRef) -> Self {
        let options = Options {
            capture_timeout_millis: 0,
            tracked_origins: HashSet::from([Origin::from(LOCAL)]),
            capture_transaction: None,
            timestamp: Arc::new(|| 0u64),
            init_undo_stack: Vec::new(),
            init_redo_stack: Vec::new(),
        };
        let mut mgr = UndoManager::with_options(options);
        mgr.expand_scope(doc, pages);
        mgr.expand_scope(doc, meta);
        Self { mgr }
    }

    pub fn undo(&mut self) -> bool {
        self.mgr.undo_blocking()
    }

    pub fn redo(&mut self) -> bool {
        self.mgr.redo_blocking()
    }

    pub fn can_undo(&self) -> bool {
        self.mgr.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.mgr.can_redo()
    }

    pub fn clear(&mut self) {
        self.mgr.clear_all();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Array, Map, Transact};

    fn setup() -> (Doc, ArrayRef, MapRef, History) {
        let doc = Doc::new();
        let pages = doc.get_or_insert_array("pages");
        let meta = doc.get_or_insert_map("meta");
        let h = History::new(&doc, &pages, &meta);
        (doc, pages, meta, h)
    }

    #[test]
    fn untracked_transaction_is_not_undoable() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut(), 1.0);
        assert!(!h.can_undo());
        assert!(!h.undo());
    }

    #[test]
    fn local_transaction_is_undoable() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 1.0);
        assert!(h.can_undo());
        assert!(h.undo());
        assert_eq!(pages.len(&doc.transact()), 0);
        assert!(h.redo());
        assert_eq!(pages.len(&doc.transact()), 1);
    }

    #[test]
    fn two_local_transactions_are_two_steps() {
        let (doc, pages, _m, mut h) = setup();
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 1.0);
        pages.push_back(&mut doc.transact_mut_with(LOCAL), 2.0);
        assert!(h.undo());
        assert_eq!(pages.len(&doc.transact()), 1);
    }

    #[test]
    fn meta_is_in_scope_and_clear_empties_stacks() {
        let (doc, _p, meta, mut h) = setup();
        meta.insert(&mut doc.transact_mut_with(LOCAL), "k", 1.0);
        assert!(h.can_undo());
        h.clear();
        assert!(!h.can_undo() && !h.can_redo());
    }
}
