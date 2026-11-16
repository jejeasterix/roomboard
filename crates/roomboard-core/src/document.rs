//! Document CRDT (yrs), schéma D2 : racine `meta` {schema}, racine `pages` = tableau de pages `Y.Map`
//! {id, width, height, background, elements: Y.Array de Y.Map}. L'ordre de `elements` est l'ordre d'empilement.
use yrs::updates::decoder::Decode;
use yrs::{
    Array, ArrayPrelim, ArrayRef, Doc, In, Map, MapPrelim, MapRef, Out, ReadTxn, StateVector,
    Transact, Transaction, TransactionMut, Update,
};

use crate::element::{
    out_f64, out_string, out_transform, read_style, ElementView, PageView, DEFAULT_BACKGROUND,
    PAGE_HEIGHT, PAGE_WIDTH, SCHEMA,
};
use crate::history::History;

/// Origine des transactions d'un geste local : seules celles-ci s'annulent (D11).
pub const LOCAL: &str = "local";

#[derive(Debug, Clone, PartialEq)]
pub enum DecodeError {
    Update(String),
    Schema { found: Option<f64> },
}

pub struct Document {
    doc: Doc,
    meta: MapRef,
    pages: ArrayRef,
    history: History,
    version: u64,
}

#[allow(dead_code)] // appelée par commands.rs / format (lot 2)
pub(crate) struct FoundElement {
    pub page_id: String,
    pub elements: ArrayRef,
    pub index: u32,
    pub element: MapRef,
}

fn roots(doc: &Doc) -> (MapRef, ArrayRef) {
    (
        doc.get_or_insert_map("meta"),
        doc.get_or_insert_array("pages"),
    )
}

pub(crate) fn insert_page(pages: &ArrayRef, txn: &mut TransactionMut, index: u32) -> String {
    let id = yrs::uuid_v4();
    let page = MapPrelim::from([
        ("id", In::from(id.clone())),
        ("width", In::from(PAGE_WIDTH)),
        ("height", In::from(PAGE_HEIGHT)),
        ("background", In::from(DEFAULT_BACKGROUND)),
        ("elements", In::Array(ArrayPrelim::from(Vec::<In>::new()))),
    ]);
    pages.insert(txn, index, page);
    id.to_string()
}

impl Document {
    /// Doc neuf, racines prises une fois, `meta.schema` écrit sans origine (hors historique).
    fn bare() -> (Doc, MapRef, ArrayRef) {
        let doc = Doc::new();
        let (meta, pages) = roots(&doc);
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "schema", f64::from(SCHEMA));
        }
        (doc, meta, pages)
    }

    /// `History` est créée en dernier : rien de ce qui précède ne s'annule (D37).
    fn assemble(doc: Doc, meta: MapRef, pages: ArrayRef) -> Self {
        let history = History::new(&doc, &pages, &meta);
        Self {
            doc,
            meta,
            pages,
            history,
            version: 0,
        }
    }

    pub fn new() -> Self {
        let (doc, meta, pages) = Self::bare();
        Self::assemble(doc, meta, pages)
    }

    /// Document de démarrage : une page, créée sans origine avant `History` (D37).
    pub fn blank() -> Self {
        let (doc, meta, pages) = Self::bare();
        {
            let mut txn = doc.transact_mut();
            insert_page(&pages, &mut txn, 0);
        }
        Self::assemble(doc, meta, pages)
    }

    pub fn add_page(&mut self) -> String {
        let n = self.page_count();
        self.insert_page_at(n)
    }

    /// Insère une page à `index` ; un indice au-delà de la fin ajoute en dernière position (jamais de panique yrs).
    pub fn insert_page_at(&mut self, index: u32) -> String {
        let index = index.min(self.page_count());
        let id = {
            let mut txn = self.doc.transact_mut_with(LOCAL);
            insert_page(&self.pages, &mut txn, index)
        };
        self.bump();
        id
    }

    pub fn page_count(&self) -> u32 {
        let txn = self.doc.transact();
        self.pages.len(&txn)
    }

    pub fn page_ids(&self) -> Vec<String> {
        let txn = self.doc.transact();
        self.pages
            .iter(&txn)
            .filter_map(|o| match o {
                Out::YMap(m) => out_string(m.get(&txn, "id")),
                _ => None,
            })
            .collect()
    }

    pub fn page(&self, id: &str) -> Option<PageView> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, id)?;
        Some(PageView {
            id: id.to_string(),
            width: out_f64(m.get(&txn, "width"))?,
            height: out_f64(m.get(&txn, "height"))?,
            background: out_string(m.get(&txn, "background"))?,
        })
    }

    pub fn page_index(&self, id: &str) -> Option<u32> {
        let txn = self.doc.transact();
        self.find_page(&txn, id).map(|(i, _)| i)
    }

    pub fn element_ids(&self, page: &str) -> Vec<String> {
        let txn = self.doc.transact();
        match self.page_elements(&txn, page) {
            Some(els) => els
                .iter(&txn)
                .filter_map(|o| match o {
                    Out::YMap(e) => out_string(e.get(&txn, "id")),
                    _ => None,
                })
                .collect(),
            None => Vec::new(),
        }
    }

    pub fn element(&self, id: &str) -> Option<ElementView> {
        let txn = self.doc.transact();
        let found = self.find_element(&txn, id)?;
        let e = &found.element;
        Some(ElementView {
            id: id.to_string(),
            kind: out_string(e.get(&txn, "kind"))?,
            transform: out_transform(e.get(&txn, "transform"))?,
            style: read_style(&txn, e)?,
        })
    }

    pub fn schema(&self) -> Option<f64> {
        let txn = self.doc.transact();
        out_f64(self.meta.get(&txn, "schema"))
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn undo(&mut self) -> bool {
        let done = self.history.undo();
        if done {
            self.bump();
        }
        done
    }

    pub fn redo(&mut self) -> bool {
        let done = self.history.redo();
        if done {
            self.bump();
        }
        done
    }

    pub fn can_undo(&self) -> bool {
        self.history.can_undo()
    }

    pub fn can_redo(&self) -> bool {
        self.history.can_redo()
    }

    /// État complet en mise à jour binaire v1 depuis un vecteur d'état vide (D24).
    pub fn encode_v1(&self) -> Vec<u8> {
        self.doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default())
    }

    /// Décode un état v1 ; `History` est recréée après : rien de chargé ne s'annule (D37).
    pub fn from_update_v1(bytes: &[u8]) -> Result<Self, DecodeError> {
        let update = Update::decode_v1(bytes).map_err(|e| DecodeError::Update(format!("{e:?}")))?;
        let doc = Doc::new();
        let (meta, pages) = roots(&doc);
        {
            let mut txn = doc.transact_mut();
            txn.apply_update(update)
                .map_err(|e| DecodeError::Update(format!("{e:?}")))?;
        }
        let found = {
            let txn = doc.transact();
            out_f64(meta.get(&txn, "schema"))
        };
        if found != Some(f64::from(SCHEMA)) {
            return Err(DecodeError::Schema { found });
        }
        Ok(Self::assemble(doc, meta, pages))
    }

    #[allow(dead_code)] // appelée par commands.rs / format (lot 2)
    pub(crate) fn transact_local(&self) -> TransactionMut<'_> {
        self.doc.transact_mut_with(LOCAL)
    }

    #[allow(dead_code)] // appelée par commands.rs / format (lot 2)
    pub(crate) fn read(&self) -> Transaction<'_> {
        self.doc.transact()
    }

    pub(crate) fn bump(&mut self) -> u64 {
        self.version += 1;
        self.version
    }

    #[allow(dead_code)] // appelée par commands.rs / format (lot 2)
    pub(crate) fn pages_ref(&self) -> &ArrayRef {
        &self.pages
    }

    pub(crate) fn find_page<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<(u32, MapRef)> {
        self.pages.iter(txn).enumerate().find_map(|(i, o)| match o {
            Out::YMap(m) if out_string(m.get(txn, "id")).as_deref() == Some(id) => {
                Some((i as u32, m))
            }
            _ => None,
        })
    }

    pub(crate) fn page_elements<T: ReadTxn>(&self, txn: &T, page: &str) -> Option<ArrayRef> {
        let (_, m) = self.find_page(txn, page)?;
        match m.get(txn, "elements") {
            Some(Out::YArray(a)) => Some(a),
            _ => None,
        }
    }

    pub(crate) fn find_element<T: ReadTxn>(&self, txn: &T, id: &str) -> Option<FoundElement> {
        for page in self.pages.iter(txn) {
            let Out::YMap(pm) = page else { continue };
            let Some(Out::YArray(els)) = pm.get(txn, "elements") else {
                continue;
            };
            let page_id = out_string(pm.get(txn, "id")).unwrap_or_default();
            for (i, o) in els.iter(txn).enumerate() {
                if let Out::YMap(e) = o {
                    if out_string(e.get(txn, "id")).as_deref() == Some(id) {
                        return Some(FoundElement {
                            page_id,
                            elements: els.clone(),
                            index: i as u32,
                            element: e,
                        });
                    }
                }
            }
        }
        None
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_document_has_no_page() {
        assert_eq!(Document::new().page_count(), 0);
    }

    #[test]
    fn add_page_increments_count() {
        let mut d = Document::new();
        d.add_page();
        d.add_page();
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn blank_has_one_page() {
        assert_eq!(Document::blank().page_count(), 1);
    }

    #[test]
    fn blank_page_is_not_undoable() {
        let mut d = Document::blank();
        assert!(!d.can_undo());
        assert!(!d.undo());
        assert_eq!(d.page_count(), 1);
    }

    #[test]
    fn new_document_cannot_undo_schema() {
        let mut d = Document::new();
        assert!(!d.undo());
        assert_eq!(d.schema(), Some(1.0));
    }

    #[test]
    fn page_has_id_and_default_size() {
        let d = Document::blank();
        let id = d.page_ids()[0].clone();
        assert_eq!(id.len(), 36);
        let p = d.page(&id).expect("page");
        assert_eq!((p.width, p.height), (1920.0, 1080.0));
        assert_eq!(p.background, "#ffffff");
    }

    #[test]
    fn page_ids_are_distinct() {
        let mut d = Document::blank();
        d.add_page();
        let ids = d.page_ids();
        assert_eq!(ids.len(), 2);
        assert_ne!(ids[0], ids[1]);
    }

    #[test]
    fn add_page_is_undoable_and_redoable() {
        let mut d = Document::blank();
        d.add_page();
        assert!(d.undo());
        assert_eq!(d.page_count(), 1);
        assert!(d.redo());
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn each_local_transaction_is_one_step() {
        let mut d = Document::blank();
        d.add_page();
        d.add_page();
        assert!(d.undo());
        assert_eq!(d.page_count(), 2);
    }

    #[test]
    fn insert_page_at_out_of_bounds_appends() {
        let mut d = Document::blank();
        let first = d.page_ids()[0].clone();
        let last = d.insert_page_at(99);
        assert_eq!(d.page_ids(), vec![first, last]);
    }

    #[test]
    fn insert_page_at_keeps_order() {
        let mut d = Document::blank();
        let last = d.add_page();
        let mid = d.insert_page_at(1);
        assert_eq!(d.page_ids()[1], mid);
        assert_eq!(d.page_ids()[2], last);
        assert_eq!(d.page_index(&last), Some(2));
    }

    #[test]
    fn version_increases_on_change_and_undo() {
        let mut d = Document::blank();
        assert_eq!(d.version(), 0);
        d.add_page();
        assert_eq!(d.version(), 1);
        d.undo();
        assert_eq!(d.version(), 2);
        d.undo();
        assert_eq!(d.version(), 2);
    }

    #[test]
    fn element_ids_of_unknown_page_is_empty() {
        let d = Document::blank();
        assert!(d.element_ids("nope").is_empty());
        assert!(d.element("nope").is_none());
    }

    #[test]
    fn encode_decode_keeps_pages() {
        let mut d = Document::blank();
        d.add_page();
        let e = Document::from_update_v1(&d.encode_v1()).expect("décodage");
        assert_eq!(e.page_ids(), d.page_ids());
        assert_eq!(e.schema(), Some(1.0));
    }

    #[test]
    fn decoded_document_has_no_history() {
        let mut d = Document::blank();
        d.add_page();
        let mut e = Document::from_update_v1(&d.encode_v1()).expect("décodage");
        assert!(!e.can_undo());
        assert!(!e.undo());
        assert_eq!(e.page_count(), 2);
    }

    #[test]
    fn decode_rejects_garbage() {
        assert!(matches!(
            Document::from_update_v1(&[0xff, 0x00, 0x13]),
            Err(DecodeError::Update(_))
        ));
    }

    #[test]
    fn decode_rejects_other_schema() {
        let doc = Doc::new();
        let meta = doc.get_or_insert_map("meta");
        meta.insert(&mut doc.transact_mut(), "schema", 2.0);
        let bytes = doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        assert!(matches!(
            Document::from_update_v1(&bytes),
            Err(DecodeError::Schema { found: Some(f) }) if f == 2.0
        ));
    }

    #[test]
    fn invert_undoes_a_translation_and_scale() {
        let t = [2.0, 0.0, 0.0, 2.0, 10.0, 20.0];
        let i = crate::element::invert(&t).expect("inversible");
        let (x, y) = crate::element::apply_transform(&t, 3.0, 4.0);
        let (bx, by) = crate::element::apply_transform(&i, x, y);
        assert!((bx - 3.0).abs() < 1e-9 && (by - 4.0).abs() < 1e-9);
    }
}
