//! Document CRDT (yrs), schéma D2 : racine `meta` {schema}, racine `pages` = tableau de pages `Y.Map`
//! {id, width, height, background, elements: Y.Array de Y.Map}. L'ordre de `elements` est l'ordre d'empilement.
use std::cell::{Cell, RefCell};
use std::collections::{BTreeSet, HashMap};
use std::rc::Rc;

use yrs::types::text::YChange;
use yrs::updates::decoder::Decode;
use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, Doc, In, Map, MapPrelim, MapRef, Out, ReadTxn, StateVector,
    Text, Transact, Transaction, TransactionMut, Update,
};

use crate::asset::{is_asset_id, AssetInfo, AssetRef};
use crate::commands::{read_shape, read_text};
#[cfg(test)]
use crate::element::ImageView;
use crate::element::{
    backdrop_view, out_f64, out_string, out_transform, read_backdrop, read_image, read_style,
    read_unknown, unknown_view, ElementView, PageView, ShapeView, StrokeStyle, TextView,
    DEFAULT_BACKGROUND, PAGE_HEIGHT, PAGE_WIDTH, SCHEMA,
};
use crate::grid::{self, GridLines, GridView};
use crate::history::History;
use crate::ink::outline::{outline as ink_outline, InkStyle};
use crate::ink::points::InkPoint;
use crate::query::Bounds;

/// Origine des transactions d'un geste local : seules celles-ci s'annulent (D11).
pub const LOCAL: &str = "local";

#[derive(Debug, Clone, PartialEq)]
pub enum DecodeError {
    Update(String),
    Schema { found: Option<f64> },
}

/// Contour local d'un trait en cache (D7, DA7). Les points d'un trait sont immuables (DA4) ; la largeur et le nombre
/// de points gardent quand même l'entrée : un écart force le recalcul.
struct CachedOutline {
    width_bits: u32,
    points: usize,
    outline: Rc<[f32]>,
}

pub struct Document {
    doc: Doc,
    meta: MapRef,
    pages: ArrayRef,
    /// Racine `assets` (K3) : empreinte → `Y.Map{ name, mime, size }`.
    assets: MapRef,
    history: History,
    version: u64,
    outlines: RefCell<HashMap<String, CachedOutline>>,
    outline_misses: Cell<u64>,
}

#[allow(dead_code)] // appelée par commands.rs / format (lot 2)
pub(crate) struct FoundElement {
    pub page_id: String,
    pub elements: ArrayRef,
    pub index: u32,
    pub element: MapRef,
}

/// Racines prises une fois. Une racine vide n'est pas encodée : un document sans asset garde ses octets.
fn roots(doc: &Doc) -> (MapRef, ArrayRef, MapRef) {
    (
        doc.get_or_insert_map("meta"),
        doc.get_or_insert_array("pages"),
        doc.get_or_insert_map("assets"),
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
    fn bare() -> (Doc, MapRef, ArrayRef, MapRef) {
        let doc = Doc::new();
        let (meta, pages, assets) = roots(&doc);
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "schema", f64::from(SCHEMA));
        }
        (doc, meta, pages, assets)
    }

    /// `History` est créée en dernier : rien de ce qui précède ne s'annule (D37).
    fn assemble(doc: Doc, meta: MapRef, pages: ArrayRef, assets: MapRef) -> Self {
        let history = History::new(&doc, &pages, &meta, &assets);
        Self {
            doc,
            meta,
            pages,
            assets,
            history,
            version: 0,
            outlines: RefCell::new(HashMap::new()),
            outline_misses: Cell::new(0),
        }
    }

    pub fn new() -> Self {
        let (doc, meta, pages, assets) = Self::bare();
        Self::assemble(doc, meta, pages, assets)
    }

    /// Document de démarrage : une page, créée sans origine avant `History` (D37).
    pub fn blank() -> Self {
        let (doc, meta, pages, assets) = Self::bare();
        {
            let mut txn = doc.transact_mut();
            insert_page(&pages, &mut txn, 0);
        }
        Self::assemble(doc, meta, pages, assets)
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

    /// Vue de page ; un fond illisible donne `backdrop: None`, jamais une page illisible (K9).
    pub fn page(&self, id: &str) -> Option<PageView> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, id)?;
        let width = out_f64(m.get(&txn, "width"))?;
        Some(PageView {
            id: id.to_string(),
            width,
            height: out_f64(m.get(&txn, "height"))?,
            background: out_string(m.get(&txn, "background"))?,
            backdrop: read_backdrop(&txn, &m).and_then(|r| backdrop_view(r, width)),
            grid: grid::read(&txn, &m),
        })
    }

    /// Assets cités par le document (K4, DAK2) : toute chaîne conforme de `pages`, à toute profondeur ; sans doublon,
    /// triés ; métadonnée de `assets` ou défauts, rendus sans écrire (D38).
    pub fn cited_assets(&self) -> Vec<AssetInfo> {
        let txn = self.doc.transact();
        let mut ids = BTreeSet::new();
        collect_out(&txn, &Out::YArray(self.pages.clone()), &mut ids);
        ids.iter().map(|id| self.asset_info(&txn, id)).collect()
    }

    /// Métadonnée d'un asset ; `None` si l'id n'est pas conforme ; défauts si l'entrée est absente ou mal formée.
    pub fn asset(&self, id: &str) -> Option<AssetInfo> {
        if !is_asset_id(id) {
            return None;
        }
        let txn = self.doc.transact();
        Some(self.asset_info(&txn, id))
    }

    /// Défauts champ par champ (K4) : `name` chaîne, `mime` chaîne non vide, `size` nombre fini ≥ 0.
    fn asset_info<T: ReadTxn>(&self, txn: &T, id: &str) -> AssetInfo {
        let mut info = AssetInfo::fallback(id);
        if let Some(Out::YMap(m)) = self.assets.get(txn, id) {
            if let Some(name) = out_string(m.get(txn, "name")) {
                info.name = name;
            }
            if let Some(mime) = out_string(m.get(txn, "mime")).filter(|s| !s.is_empty()) {
                info.mime = mime;
            }
            if let Some(size) = out_f64(m.get(txn, "size")).filter(|v| v.is_finite() && *v >= 0.0) {
                info.size = size;
            }
        }
        info
    }

    /// Métadonnée écrite seulement si absente (K3), dans la transaction de la commande qui cite l'asset : champs
    /// scalaires d'un `Y.Map`, jamais `Any::Map` (G4).
    pub(crate) fn insert_asset_meta(&self, txn: &mut TransactionMut, a: &AssetRef) {
        if self.assets.get(txn, &a.id).is_none() {
            self.assets.insert(
                txn,
                a.id.as_str(),
                MapPrelim::from([
                    ("name", In::from(a.name.as_str())),
                    ("mime", In::from(a.mime.as_str())),
                    ("size", In::Any(Any::from(a.size))),
                ]),
            );
        }
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
        match out_string(e.get(&txn, "kind")).as_deref() {
            Some("stroke") => Some(ElementView {
                style: Some(read_style(&txn, e)?),
                ..ElementView::bare(id, "stroke", out_transform(e.get(&txn, "transform"))?)
            }),
            Some("shape") => {
                let transform = out_transform(e.get(&txn, "transform"))?;
                let s = read_shape(&txn, e)?;
                Some(ElementView {
                    style: Some(s.style),
                    shape: Some(ShapeView {
                        shape: s.kind.as_str().to_string(),
                        w: s.w,
                        h: s.h,
                        fill: s.fill,
                    }),
                    ..ElementView::bare(id, "shape", transform)
                })
            }
            Some("text") => {
                let transform = out_transform(e.get(&txn, "transform"))?;
                let t = read_text(&txn, e)?;
                let spans = crate::rich_text::read_spans(&txn, &t.text);
                Some(ElementView {
                    style: Some(StrokeStyle {
                        color: t.color,
                        width: 0.0,
                    }),
                    text: Some(TextView {
                        content: t.content,
                        size: t.size,
                        box_width: t.box_width,
                        box_height: t.box_height,
                        spans,
                    }),
                    ..ElementView::bare(id, "text", transform)
                })
            }
            Some("image") => {
                let (transform, image) = read_image(&txn, e)?;
                Some(ElementView {
                    image: Some(image),
                    ..ElementView::bare(id, "image", transform)
                })
            }
            Some(crate::table::TABLE_KIND) => Some(match crate::table::read(&txn, e) {
                Some((transform, table)) => ElementView {
                    table: Some(table),
                    ..ElementView::bare(id, "table", transform)
                },
                // T2 : tableau mal formé → cadre inconnu, jamais `None`.
                None => {
                    let (transform, unknown) = unknown_view(&txn, e)?;
                    ElementView {
                        unknown: Some(unknown),
                        ..ElementView::bare(id, "unknown", transform)
                    }
                }
            }),
            _ => {
                let (transform, unknown) = read_unknown(&txn, e)?;
                Some(ElementView {
                    unknown: Some(unknown),
                    ..ElementView::bare(id, "unknown", transform)
                })
            }
        }
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
            self.retain_present_outlines();
            self.bump();
        }
        done
    }

    pub fn redo(&mut self) -> bool {
        let done = self.history.redo();
        if done {
            self.retain_present_outlines();
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
        let (meta, pages, assets) = roots(&doc);
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
        Ok(Self::assemble(doc, meta, pages, assets))
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

    /// Contour local d'un trait, calculé une fois par (id, largeur, nombre de points) puis servi depuis le cache :
    /// rendu, collision et gomme d'objet voient le même polygone (DA7) sans le recalculer à chaque image (D38).
    pub(crate) fn cached_outline(
        &self,
        id: &str,
        style: &StrokeStyle,
        pts: &[InkPoint],
    ) -> Rc<[f32]> {
        let width_bits = style.width.to_bits();
        if let Some(c) = self.outlines.borrow().get(id) {
            if c.width_bits == width_bits && c.points == pts.len() {
                return Rc::clone(&c.outline);
            }
        }
        self.outline_misses.set(self.outline_misses.get() + 1);
        let outline: Rc<[f32]> = ink_outline(pts, &InkStyle { width: style.width }).into();
        self.outlines.borrow_mut().insert(
            id.to_string(),
            CachedOutline {
                width_bits,
                points: pts.len(),
                outline: Rc::clone(&outline),
            },
        );
        outline
    }

    /// Oublie les contours des ids retirés par une commande (mémoire bornée aux traits présents ; un trait rendu par
    /// annuler est recalculé une fois).
    pub(crate) fn forget_outlines(&self, removed: &[String]) {
        let mut cache = self.outlines.borrow_mut();
        for id in removed {
            cache.remove(id);
        }
    }

    /// Après annuler ou rétablir : ne garde que les contours des traits encore présents (mémoire bornée).
    fn retain_present_outlines(&self) {
        let present: std::collections::HashSet<String> = self
            .page_ids()
            .iter()
            .flat_map(|p| self.element_ids(p))
            .collect();
        self.outlines
            .borrow_mut()
            .retain(|id, _| present.contains(id));
    }

    /// Contours calculés depuis la création du document (mesure du cache).
    pub fn outline_cache_misses(&self) -> u64 {
        self.outline_misses.get()
    }

    /// Contours actuellement en cache.
    pub fn outline_cache_len(&self) -> usize {
        self.outlines.borrow().len()
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

    /// Grille et largeur d'une page ; `None` si la page est inconnue ou sans grille lisible.
    fn page_grid(&self, page: &str) -> Option<(GridView, f64)> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, page)?;
        let width = out_f64(m.get(&txn, "width"))?;
        Some((grid::read(&txn, &m)?, width))
    }

    /// Point aimanté de la page (G6) ; `None` sans grille, magnétisme coupé ou aucun niveau qui accroche.
    pub fn snap_point(&self, page: &str, x: f64, y: f64) -> Option<(f64, f64)> {
        let (g, width) = self.page_grid(page)?;
        grid::snap_point(&g, width, (x, y))
    }

    /// Déplacement aimanté (G7), toujours calculé depuis le déplacement brut ; brut sans grille ou sans boîte.
    pub fn snap_delta(&self, page: &str, ids: &[String], dx: f64, dy: f64) -> (f64, f64) {
        let Some((g, width)) = self.page_grid(page) else {
            return (dx, dy);
        };
        let Some(b) = self.snap_box(ids) else {
            return (dx, dy);
        };
        grid::snap_delta(&g, width, b, (dx, dy))
    }

    /// Largeur d'une page ; `None` si la page est inconnue ou sans largeur lisible.
    fn page_width(&self, page: &str) -> Option<f64> {
        let txn = self.doc.transact();
        let (_, m) = self.find_page(&txn, page)?;
        out_f64(m.get(&txn, "width"))
    }

    /// Lignes visibles d'une grille non enregistrée sur la page (C9 éditeur, DAE1) : même `grid::lines` que la grille
    /// enregistrée (DAG1), sur la largeur de la page ; rien n'est écrit. `None` : page inconnue ou grille invisible.
    pub fn grid_lines_of(
        &self,
        page: &str,
        grid: &GridView,
        rect: Bounds,
        min_step: f64,
        min_dot_step: f64,
    ) -> Option<GridLines> {
        let width = self.page_width(page)?;
        grid::lines(grid, width, rect, min_step, min_dot_step)
    }

    /// Lignes visibles de la grille de la page (G9) ; `None` sans grille ou grille invisible.
    pub fn grid_lines(
        &self,
        page: &str,
        rect: Bounds,
        min_step: f64,
        min_dot_step: f64,
    ) -> Option<GridLines> {
        let (g, _) = self.page_grid(page)?;
        self.grid_lines_of(page, &g, rect, min_step, min_dot_step)
    }
}

fn collect_any(a: &Any, acc: &mut BTreeSet<String>) {
    match a {
        Any::String(s) if is_asset_id(s) => {
            acc.insert(s.to_string());
        }
        Any::Array(items) => items.iter().for_each(|i| collect_any(i, acc)),
        Any::Map(m) => m.values().for_each(|v| collect_any(v, acc)),
        _ => {}
    }
}

/// Parcours générique (K4) : `Y.Map`, `Y.Array`, valeurs `Any`, embeds et attributs des `Y.Text` ; le texte lui-même
/// (morceaux `Any::String` insérés) n'est pas balayé.
fn collect_out<T: ReadTxn>(txn: &T, o: &Out, acc: &mut BTreeSet<String>) {
    match o {
        Out::Any(a) => collect_any(a, acc),
        Out::YMap(m) => {
            for (_, v) in m.iter(txn) {
                collect_out(txn, &v, acc);
            }
        }
        Out::YArray(a) => {
            for v in a.iter(txn) {
                collect_out(txn, &v, acc);
            }
        }
        Out::YText(t) => {
            for d in t.diff(txn, YChange::identity) {
                if !matches!(d.insert, Out::Any(Any::String(_))) {
                    collect_out(txn, &d.insert, acc);
                }
                if let Some(attrs) = d.attributes {
                    attrs.values().for_each(|v| collect_any(v, acc));
                }
            }
        }
        _ => {}
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

    fn stroke(d: &mut Document, page: &str, y: f32) -> String {
        let points: Vec<f32> = (0..=20)
            .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
            .collect();
        d.apply(crate::commands::Command::CommitStroke {
            page: page.to_string(),
            points,
            style: crate::element::StrokeStyle {
                color: "#000000".into(),
                width: 4.0,
            },
        })
        .expect("commit")
        .ids[0]
            .clone()
    }

    /// Second patron écarté (T17) : une clé par id seul rendrait l'ancien contour à une autre largeur ou à un autre
    /// nombre de points. L'entrée garde les deux ; un écart force le recalcul, exact au bit près.
    #[test]
    fn cached_outline_recomputes_when_width_or_point_count_differ() {
        use crate::ink::outline::{outline as ink_outline, InkStyle};
        let bits = |v: &[f32]| v.iter().map(|x| x.to_bits()).collect::<Vec<u32>>();
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a = stroke(&mut d, &p, 100.0);
        let pts = d.stroke_points(&a).expect("points");
        let thin = StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        };
        let thick = StrokeStyle {
            color: "#000000".into(),
            width: 12.0,
        };
        let m = d.outline_cache_misses();
        let o4 = d.cached_outline(&a, &thin, &pts);
        assert_eq!(d.outline_cache_misses(), m + 1);
        let o4_again = d.cached_outline(&a, &thin, &pts);
        assert_eq!(d.outline_cache_misses(), m + 1, "même clé : servi du cache");
        assert_eq!(bits(&o4_again), bits(&o4));
        let o12 = d.cached_outline(&a, &thick, &pts);
        assert_eq!(d.outline_cache_misses(), m + 2, "autre largeur : recalcul");
        assert_eq!(
            bits(&o12),
            bits(&ink_outline(&pts, &InkStyle { width: 12.0 }))
        );
        let short = &pts[..pts.len() - 5];
        let o_short = d.cached_outline(&a, &thick, short);
        assert_eq!(
            d.outline_cache_misses(),
            m + 3,
            "autre nombre de points : recalcul"
        );
        assert_eq!(
            bits(&o_short),
            bits(&ink_outline(short, &InkStyle { width: 12.0 }))
        );
        assert_eq!(d.outline_cache_len(), 1, "une entrée par id");
    }

    /// Le cache ne se vide pas à l'annulation (patron écarté : `outlines.clear()` de la liaison à chaque annuler ou
    /// rétablir) : un trait que l'étape ne touche pas n'est jamais recalculé.
    #[test]
    fn undo_and_redo_keep_untouched_outlines() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a = stroke(&mut d, &p, 100.0);
        assert!(d.outline(&a).is_some());
        let m = d.outline_cache_misses();
        let b = stroke(&mut d, &p, 300.0);
        assert!(d.undo());
        assert!(d.outline(&a).is_some());
        assert!(d.outline(&b).is_none(), "b annulé");
        assert_eq!(
            d.outline_cache_misses(),
            m,
            "annuler : a n'est pas recalculé"
        );
        assert!(d.redo());
        assert!(d.outline(&a).is_some());
        assert!(d.outline(&b).is_some());
        assert_eq!(
            d.outline_cache_misses(),
            m + 1,
            "rétablir : seul b est calculé, une fois"
        );
    }

    /// Annuler ou rétablir ne laisse pas dans le cache le contour d'un trait qui n'existe plus.
    #[test]
    fn undo_drops_the_outline_of_the_undone_stroke() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a = stroke(&mut d, &p, 100.0);
        assert!(d.outline(&a).is_some());
        assert_eq!(d.outline_cache_len(), 1);
        assert!(d.undo());
        assert_eq!(d.outline_cache_len(), 0, "trait annulé : plus en cache");
        assert!(d.redo());
        assert!(d.outline(&a).is_some());
        assert_eq!(d.outline_cache_len(), 1);
    }

    #[test]
    fn invert_undoes_a_translation_and_scale() {
        let t = [2.0, 0.0, 0.0, 2.0, 10.0, 20.0];
        let i = crate::element::invert(&t).expect("inversible");
        let (x, y) = crate::element::apply_transform(&t, 3.0, 4.0);
        let (bx, by) = crate::element::apply_transform(&i, x, y);
        assert!((bx - 3.0).abs() < 1e-9 && (by - 4.0).abs() < 1e-9);
    }

    use yrs::{Any, In, MapPrelim};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    /// Pousse un élément brut sur la première page, hors historique (fichier lu, pas un geste).
    fn push_raw(d: &Document, fields: Vec<(&str, In)>) {
        let els = {
            let txn = d.read();
            d.page_elements(&txn, &d.page_ids()[0]).expect("éléments")
        };
        els.push_back(
            &mut d.doc.transact_mut(),
            fields.into_iter().collect::<MapPrelim>(),
        );
    }

    fn translate(x: f64, y: f64) -> In {
        In::Any(crate::element::transform_to_any(&[
            1.0, 0.0, 0.0, 1.0, x, y,
        ]))
    }

    #[test]
    fn image_view_reads_fields_without_style() {
        let d = Document::blank();
        push_raw(
            &d,
            vec![
                ("id", In::from("i1")),
                ("kind", In::from("image")),
                ("transform", translate(10.0, 20.0)),
                ("asset", In::from(ABC)),
                ("w", In::Any(Any::from(640.0))),
                ("h", In::Any(Any::from(480.0))),
            ],
        );
        let v = d.element("i1").expect("vue");
        assert_eq!(v.kind, "image");
        assert_eq!(v.style, None);
        assert_eq!(
            v.image,
            Some(ImageView {
                asset: ABC.into(),
                w: 640.0,
                h: 480.0
            })
        );
        assert_eq!(
            d.hit_test(&d.page_ids()[0], 20.0, 30.0, 0.0),
            Some("i1".into())
        );
    }

    #[test]
    fn malformed_image_has_no_view() {
        let d = Document::blank();
        push_raw(
            &d,
            vec![
                ("id", In::from("i2")),
                ("kind", In::from("image")),
                ("transform", translate(0.0, 0.0)),
                ("asset", In::from(ABC.to_uppercase().as_str())),
                ("w", In::Any(Any::from(10.0))),
                ("h", In::Any(Any::from(10.0))),
            ],
        );
        assert_eq!(d.element("i2"), None);
    }

    #[test]
    fn element_without_id_has_no_geometry() {
        let d = Document::blank();
        push_raw(&d, vec![("kind", In::from("hologram"))]);
        let p = d.page_ids()[0].clone();
        assert_eq!(d.hit_test(&p, 50.0, 50.0, 0.0), None);
        assert!(d
            .ids_in_rect(
                &p,
                crate::query::Bounds {
                    x0: -1.0,
                    y0: -1.0,
                    x1: 500.0,
                    y1: 500.0
                }
            )
            .is_empty());
    }

    use std::sync::Arc;

    use crate::asset::AssetInfo;
    use yrs::{Text, TextPrelim};

    const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const ZERO: &str = "0000000000000000000000000000000000000000000000000000000000000000";
    const TWO: &str = "2222222222222222222222222222222222222222222222222222222222222222";
    const THREE: &str = "3333333333333333333333333333333333333333333333333333333333333333";

    /// Patron écarté (K4, DAK2) : lire seulement le champ `asset` des images et du fond. Ici aucun élément n'est une
    /// image : les ids sont rangés dans un `Y.Map` imbriqué, un `Any::Array`, un `Any::Map` lu, un attribut et un
    /// embed de `Y.Text` ; ce lecteur-là rendrait une liste vide.
    #[test]
    fn cited_assets_scans_any_depth() {
        let d = Document::blank();
        let nested = MapPrelim::from([(
            "deep",
            In::Array(ArrayPrelim::from(vec![
                In::from(ZERO),
                In::from("pas-un-asset"),
            ])),
        )]);
        push_raw(
            &d,
            vec![
                ("id", In::from("u1")),
                ("kind", In::from("model3d")),
                ("nested", In::Map(nested)),
                (
                    "refs",
                    In::Any(Any::Array(vec![Any::from(ABC), Any::from(ABC)].into())),
                ),
                (
                    "legacy",
                    In::Any(Any::Map(Arc::new(HashMap::from([(
                        "src".to_string(),
                        Any::from(EMPTY),
                    )])))),
                ),
                ("content", In::from(TextPrelim::new(""))),
            ],
        );
        let text = {
            let txn = d.read();
            let found = d.find_element(&txn, "u1").expect("u1");
            match found.element.get(&txn, "content") {
                Some(Out::YText(t)) => t,
                _ => panic!("texte"),
            }
        };
        {
            let mut txn = d.doc.transact_mut();
            let other = "1111111111111111111111111111111111111111111111111111111111111111";
            text.insert(&mut txn, 0, other); // le texte lui-même n'est pas balayé
            let attrs = HashMap::from([(Arc::from("href"), Any::from(TWO))]);
            text.insert_with_attributes(&mut txn, 64, "lien", attrs);
            let embed = Any::Map(Arc::new(HashMap::from([(
                "src".to_string(),
                Any::from(THREE),
            )])));
            text.insert_embed(&mut txn, 68, embed);
        }
        let before = d.encode_v1();
        let ids: Vec<String> = d.cited_assets().into_iter().map(|a| a.id).collect();
        assert_eq!(
            ids,
            vec![
                ZERO.to_string(),
                TWO.to_string(),
                THREE.to_string(),
                ABC.to_string(),
                EMPTY.to_string(),
            ]
        );
        assert!(d.encode_v1() == before, "une lecture n'écrit rien");
    }

    #[test]
    fn cited_assets_malformed_meta_falls_back_without_writing() {
        let d = Document::blank();
        push_raw(
            &d,
            vec![
                ("id", In::from("u1")),
                ("kind", In::from("x")),
                ("a", In::from(ABC)),
                ("b", In::from(EMPTY)),
                ("c", In::from(ZERO)),
            ],
        );
        {
            let mut txn = d.doc.transact_mut();
            d.assets.insert(&mut txn, ABC, "pas une map");
            d.assets.insert(
                &mut txn,
                EMPTY,
                MapPrelim::from([
                    ("name", In::from("fond.jpg")),
                    ("mime", In::from("")),
                    ("size", In::from("12")),
                ]),
            );
            d.assets.insert(
                &mut txn,
                "CLE-NON-CONFORME",
                MapPrelim::from([("name", In::from("x"))]),
            );
        }
        let before = d.encode_v1();
        let cited = d.cited_assets();
        assert_eq!(cited[0], AssetInfo::fallback(ZERO));
        assert_eq!(cited[1], AssetInfo::fallback(ABC));
        assert_eq!(
            cited[2],
            AssetInfo {
                name: "fond.jpg".into(),
                ..AssetInfo::fallback(EMPTY)
            }
        );
        assert_eq!(
            cited.len(),
            3,
            "une clé non conforme de `assets` n'est jamais citée"
        );
        assert_eq!(d.asset("CLE-NON-CONFORME"), None);
        assert_eq!(d.asset(ZERO), Some(AssetInfo::fallback(ZERO)));
        assert!(d.encode_v1() == before, "une lecture n'écrit rien");
    }

    fn first_page_map(d: &Document) -> (String, MapRef) {
        let p = d.page_ids()[0].clone();
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        (p, page)
    }

    #[test]
    fn unreadable_backdrop_keeps_page_readable() {
        let d = Document::blank();
        let (p, page) = first_page_map(&d);
        let set = |v: In| page.insert(&mut d.doc.transact_mut(), "backdrop", v);
        set(In::Map(MapPrelim::from([
            ("kind", In::from("image")),
            ("w", In::from(10.0)),
            ("h", In::from(10.0)),
        ])));
        assert_eq!(d.page(&p).expect("page lisible").backdrop, None);
        set(In::from("pas une map"));
        assert_eq!(d.page(&p).expect("page lisible").backdrop, None);
        set(In::Map(MapPrelim::from([
            ("asset", In::from(ABC.to_uppercase().as_str())),
            ("kind", In::from("image")),
        ])));
        assert_eq!(d.page(&p).expect("page lisible").backdrop, None);
        set(In::Map(MapPrelim::from([
            ("asset", In::from(ABC)),
            ("kind", In::from("pdf-page")),
            ("fit", In::from("contain")),
            ("w", In::from(1000.0)),
            ("h", In::from(500.0)),
        ])));
        let b = d
            .page(&p)
            .expect("page")
            .backdrop
            .expect("fond d'une version plus récente");
        assert_eq!((b.kind.as_str(), b.fit.as_str()), ("pdf-page", "contain"));
        assert_eq!(b.rect.map(|r| r.y1), Some(960.0));
        set(In::Map(MapPrelim::from([
            ("asset", In::from(ABC)),
            ("kind", In::from("image")),
        ])));
        let b = d.page(&p).expect("page").backdrop.expect("fond sans boîte");
        assert_eq!((b.w, b.h, b.rect), (None, None, None));
    }

    /// Le fond suit la largeur lue de la page (page à hauteur infinie), pas la largeur par défaut ni la hauteur : une
    /// image haute dépasse la hauteur de la page au lieu d'y être contenue.
    #[test]
    fn backdrop_rect_follows_page_width_not_height() {
        let d = Document::blank();
        let (p, page) = first_page_map(&d);
        {
            let mut txn = d.doc.transact_mut();
            page.insert(&mut txn, "width", 960.0);
            page.insert(
                &mut txn,
                "backdrop",
                MapPrelim::from([
                    ("asset", In::from(ABC)),
                    ("kind", In::from("image")),
                    ("w", In::from(500.0)),
                    ("h", In::from(1000.0)),
                    ("fit", In::from("width")),
                ]),
            );
        }
        let v = d.page(&p).expect("page");
        assert_eq!((v.width, v.height), (960.0, 1080.0));
        assert_eq!(
            v.backdrop.and_then(|b| b.rect),
            Some(crate::query::Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 960.0,
                y1: 1920.0
            })
        );
    }

    /// I3 (constat `architecture-constats.md:10`) : chaque `kind` de `KNOWN_KINDS` a une vue de son `kind` (jamais
    /// `unknown`) et une boîte ; un `kind` ajouté sans fabrique fait paniquer ce test.
    #[test]
    fn every_known_kind_has_view_and_geom() {
        use crate::asset::AssetRef;
        use crate::commands::Command;
        use crate::element::{StrokeStyle, KNOWN_KINDS};
        use crate::shape::ShapeKind;
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let pen = StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        };
        for kind in KNOWN_KINDS {
            let cmd = match kind {
                "stroke" => Command::CommitStroke {
                    page: p.clone(),
                    points: vec![10.0, 10.0, 0.5, 60.0, 60.0, 0.5],
                    style: pen.clone(),
                },
                "shape" => Command::AddShape {
                    page: p.clone(),
                    shape: ShapeKind::Rect,
                    x0: 0.0,
                    y0: 0.0,
                    x1: 50.0,
                    y1: 40.0,
                    style: pen.clone(),
                    fill: None,
                },
                "text" => Command::SetText {
                    page: p.clone(),
                    id: None,
                    x: 0.0,
                    y: 0.0,
                    content: "a".into(),
                    color: "#000000".into(),
                    size: 36.0,
                    box_width: 600.0,
                    box_height: 45.0,
                },
                "image" => Command::AddImage {
                    page: p.clone(),
                    asset: AssetRef {
                        id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                        name: "a.png".into(),
                        mime: "image/png".into(),
                        size: 3.0,
                    },
                    w: 64.0,
                    h: 48.0,
                    matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
                },
                "table" => Command::AddTable {
                    page: p.clone(),
                    x: 0.0,
                    y: 0.0,
                    cols: 2,
                    rows: 2,
                    col_width: 240.0,
                    row_height: 64.0,
                    color: "#000000".into(),
                    size: 36.0,
                },
                other => panic!("kind sans fabrique : {other} (ajouter sa commande ici, son bras dans element() et element_geom)"),
            };
            let id = d.apply(cmd).expect(kind).ids[0].clone();
            assert_eq!(
                d.element(&id).map(|v| v.kind),
                Some(kind.to_string()),
                "vue de {kind}"
            );
            assert!(d.bounds(&[id]).is_some(), "boîte de {kind}");
        }
    }
}
