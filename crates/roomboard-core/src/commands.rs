//! Commandes (D10, DA5) : une commande = une transaction "local" = une étape d'annulation (D11). Une commande sans
//! effet (gomme qui ne touche rien) n'ouvre aucune transaction d'écriture : aucune étape vide (D38).
use std::collections::BTreeSet;

use yrs::{Any, Array, ArrayRef, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::document::{insert_page, Document};
use crate::element::{
    apply_transform, compose, invert, out_bytes, out_f64, out_string, out_transform, read_style,
    style_fields, transform_to_any, StrokeStyle, Transform, IDENTITY,
};
use crate::ink::erase::erase;
use crate::ink::hit::path_hits_outline;
use crate::ink::points::{decode, dedup, encode, from_flat, to_local, InkPoint};
use crate::shape::{normalize, ShapeKind};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EraseMode {
    Partial,
    Object,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Command {
    AddPage {
        after: Option<String>,
    },
    RemovePage {
        page: String,
    },
    CommitStroke {
        page: String,
        points: Vec<f32>,
        style: StrokeStyle,
    },
    Erase {
        page: String,
        path: Vec<f32>,
        radius: f32,
        mode: EraseMode,
    },
    Delete {
        ids: Vec<String>,
    },
    AddShape {
        page: String,
        shape: ShapeKind,
        x0: f64,
        y0: f64,
        x1: f64,
        y1: f64,
        style: StrokeStyle,
        fill: Option<String>,
    },
    Transform {
        ids: Vec<String>,
        matrix: Transform,
    },
}

/// Ce qu'une commande a touché ; `full` = tout invalider (annuler, rétablir).
#[derive(Debug, Clone, PartialEq, Default, serde::Serialize)]
pub struct Change {
    pub pages: Vec<String>,
    pub ids: Vec<String>,
    pub removed: Vec<String>,
    pub full: bool,
    pub version: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum CommandError {
    UnknownPage(String),
    LastPage,
    BadPoints,
    BadRadius,
    BadWidth,
    BadShape,
    BadMatrix,
}

impl std::fmt::Display for CommandError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CommandError::UnknownPage(id) => write!(f, "page inconnue : {id}"),
            CommandError::LastPage => write!(f, "la dernière page ne se supprime pas"),
            CommandError::BadPoints => {
                write!(
                    f,
                    "points invalides (triplets x, y, pression ou paires x, y finis attendus)"
                )
            }
            CommandError::BadRadius => {
                write!(f, "rayon de gomme invalide (nombre fini > 0 attendu)")
            }
            CommandError::BadWidth => {
                write!(f, "épaisseur de trait invalide (nombre fini > 0 attendu)")
            }
            CommandError::BadShape => write!(
                f,
                "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)"
            ),
            CommandError::BadMatrix => {
                write!(f, "matrice invalide (six nombres finis, inversible)")
            }
        }
    }
}

impl std::error::Error for CommandError {}

pub(crate) fn read_stroke<T: ReadTxn>(
    txn: &T,
    e: &MapRef,
) -> Option<(Transform, StrokeStyle, Vec<InkPoint>)> {
    if out_string(e.get(txn, "kind"))? != "stroke" {
        return None;
    }
    Some((
        out_transform(e.get(txn, "transform"))?,
        read_style(txn, e)?,
        decode(&out_bytes(e.get(txn, "points"))?)?,
    ))
}

/// Champs d'une forme (D13) ; `None` si l'élément n'en est pas une.
pub(crate) struct ShapeFields {
    pub kind: ShapeKind,
    pub w: f64,
    pub h: f64,
    pub style: StrokeStyle,
    pub fill: Option<String>,
}

pub(crate) fn read_shape<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<ShapeFields> {
    if out_string(e.get(txn, "kind"))? != "shape" {
        return None;
    }
    Some(ShapeFields {
        kind: ShapeKind::parse(&out_string(e.get(txn, "shape"))?)?,
        w: out_f64(e.get(txn, "w"))?,
        h: out_f64(e.get(txn, "h"))?,
        style: read_style(txn, e)?,
        fill: out_string(e.get(txn, "fill")),
    })
}

/// Chemin monde (paires x, y) ramené au repère local par l'inverse de `t` ; `None` si `t` n'est pas inversible.
pub(crate) fn world_to_local_path(t: &Transform, path: &[f32]) -> Option<Vec<f32>> {
    let inv = invert(t)?;
    Some(
        path.as_chunks::<2>()
            .0
            .iter()
            .flat_map(|c| {
                let (x, y) = apply_transform(&inv, f64::from(c[0]), f64::from(c[1]));
                [x as f32, y as f32]
            })
            .collect(),
    )
}

/// Rayon de gomme ou épaisseur de trait : fini et strictement positif (NaN refusé).
fn positive(v: f32) -> bool {
    v.is_finite() && v > 0.0
}

fn stroke_prelim(
    id: &str,
    transform: &Transform,
    style: &StrokeStyle,
    points: &[InkPoint],
) -> MapPrelim {
    let [color, width, tool] = style_fields(style);
    MapPrelim::from([
        ("id", In::from(id)),
        ("kind", In::from("stroke")),
        ("transform", In::Any(transform_to_any(transform))),
        color,
        width,
        tool,
        ("points", In::Any(Any::Buffer(encode(points).into()))),
    ])
}

/// Trait touché par la gomme : retiré, puis remplacé à sa place par `pieces` (vide en gomme d'objet).
struct Cut {
    index: u32,
    id: String,
    transform: Transform,
    style: StrokeStyle,
    pieces: Vec<Vec<InkPoint>>,
}

struct Target {
    elements: ArrayRef,
    index: u32,
    page: String,
    id: String,
}

impl Document {
    pub fn apply(&mut self, cmd: Command) -> Result<Change, CommandError> {
        let change = match cmd {
            Command::AddPage { after } => self.cmd_add_page(after.as_deref()),
            Command::RemovePage { page } => self.cmd_remove_page(&page),
            Command::CommitStroke {
                page,
                points,
                style,
            } => self.cmd_commit_stroke(&page, &points, &style),
            Command::Erase {
                page,
                path,
                radius,
                mode,
            } => self.cmd_erase(&page, &path, radius, mode),
            Command::Delete { ids } => self.cmd_delete(&ids),
            Command::AddShape {
                page,
                shape,
                x0,
                y0,
                x1,
                y1,
                style,
                fill,
            } => self.cmd_add_shape(&page, shape, [x0, y0, x1, y1], &style, fill.as_deref()),
            Command::Transform { ids, matrix } => self.cmd_transform(&ids, &matrix),
        }?;
        self.forget_outlines(&change.removed);
        Ok(change)
    }

    fn cmd_add_shape(
        &mut self,
        page: &str,
        kind: ShapeKind,
        corners: [f64; 4],
        style: &StrokeStyle,
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if corners.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadShape);
        }
        if !positive(style.width) {
            return Err(CommandError::BadWidth);
        }
        let elements = {
            let txn = self.read();
            self.page_elements(&txn, page)
        }
        .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let [x0, y0, x1, y1] = corners;
        let (tx, ty, w, h) = normalize(kind, x0, y0, x1, y1);
        let id = yrs::uuid_v4().to_string();
        let mut fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from("shape")),
            ("shape", In::from(kind.as_str())),
            (
                "transform",
                In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, tx, ty])),
            ),
            ("color", In::from(style.color.as_str())),
            ("width", In::Any(Any::from(f64::from(style.width)))),
            ("w", In::Any(Any::from(w))),
            ("h", In::Any(Any::from(h))),
        ];
        if let Some(f) = fill {
            fields.push(("fill", In::from(f)));
        }
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// Compose `m` à gauche de la transformation de chaque élément trouvé (CL4-8) ; ids inconnus ignorés ; rien trouvé
    /// ou identité : aucune transaction (D38).
    fn cmd_transform(&mut self, ids: &[String], m: &Transform) -> Result<Change, CommandError> {
        if m.iter().any(|v| !v.is_finite()) || invert(m).is_none() {
            return Err(CommandError::BadMatrix);
        }
        let unique: BTreeSet<&String> = ids.iter().collect();
        let targets: Vec<(MapRef, Transform, String, String)> = {
            let txn = self.read();
            unique
                .into_iter()
                .filter_map(|id| {
                    let f = self.find_element(&txn, id)?;
                    let t = out_transform(f.element.get(&txn, "transform"))?;
                    Some((f.element, t, f.page_id, id.clone()))
                })
                .collect()
        };
        if targets.is_empty() || *m == IDENTITY {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for (e, t, _, _) in &targets {
                e.insert(&mut txn, "transform", transform_to_any(&compose(m, t)));
            }
        }
        let mut pages: Vec<String> = targets.iter().map(|t| t.2.clone()).collect();
        pages.sort();
        pages.dedup();
        let ids = targets.into_iter().map(|t| t.3).collect();
        Ok(self.done(Change {
            pages,
            ids,
            ..Default::default()
        }))
    }

    fn done(&mut self, mut change: Change) -> Change {
        change.version = self.bump();
        change
    }

    fn unchanged(&self) -> Change {
        Change {
            version: self.version(),
            ..Default::default()
        }
    }

    fn cmd_add_page(&mut self, after: Option<&str>) -> Result<Change, CommandError> {
        let index = match after {
            Some(a) => {
                self.page_index(a)
                    .ok_or_else(|| CommandError::UnknownPage(a.to_string()))?
                    + 1
            }
            None => self.page_count(),
        };
        let id = {
            let mut txn = self.transact_local();
            insert_page(self.pages_ref(), &mut txn, index)
        };
        Ok(self.done(Change {
            pages: vec![id],
            ..Default::default()
        }))
    }

    /// La dernière page ne se supprime pas : `Err(LastPage)` (écart assumé au cadrage, qui disait « sans effet »).
    fn cmd_remove_page(&mut self, page: &str) -> Result<Change, CommandError> {
        let index = self
            .page_index(page)
            .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        if self.page_count() <= 1 {
            return Err(CommandError::LastPage);
        }
        let removed = self.element_ids(page);
        {
            let mut txn = self.transact_local();
            self.pages_ref().remove(&mut txn, index);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            removed,
            ..Default::default()
        }))
    }

    fn cmd_commit_stroke(
        &mut self,
        page: &str,
        flat: &[f32],
        style: &StrokeStyle,
    ) -> Result<Change, CommandError> {
        if flat.len() < 3 || !flat.len().is_multiple_of(3) || flat.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadPoints);
        }
        if !positive(style.width) {
            return Err(CommandError::BadWidth);
        }
        let elements = {
            let txn = self.read();
            self.page_elements(&txn, page)
        }
        .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let (local, (ox, oy)) = to_local(&dedup(&from_flat(flat)));
        let id = yrs::uuid_v4().to_string();
        {
            let mut txn = self.transact_local();
            elements.push_back(
                &mut txn,
                stroke_prelim(&id, &[1.0, 0.0, 0.0, 1.0, ox, oy], style, &local),
            );
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    fn cmd_erase(
        &mut self,
        page: &str,
        path: &[f32],
        radius: f32,
        mode: EraseMode,
    ) -> Result<Change, CommandError> {
        if path.len() < 2 || !path.len().is_multiple_of(2) || path.iter().any(|v| !v.is_finite()) {
            return Err(CommandError::BadPoints);
        }
        if !positive(radius) {
            return Err(CommandError::BadRadius);
        }
        // 1. Plan, sous une transaction de lecture, fermée avant toute écriture.
        let (elements, cuts) = {
            let txn = self.read();
            let elements = self
                .page_elements(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let mut cuts = Vec::new();
            for (i, o) in elements.iter(&txn).enumerate() {
                let Out::YMap(e) = o else { continue };
                let Some((transform, style, pts)) = read_stroke(&txn, &e) else {
                    continue;
                };
                let Some(local_path) = world_to_local_path(&transform, path) else {
                    continue;
                };
                let id = out_string(e.get(&txn, "id")).unwrap_or_default();
                let pieces = match mode {
                    EraseMode::Partial => erase(&pts, style.width / 2.0, &local_path, radius),
                    EraseMode::Object => {
                        let poly = self.cached_outline(&id, &style, &pts);
                        path_hits_outline(&poly, &local_path, radius).then(Vec::new)
                    }
                };
                if let Some(pieces) = pieces {
                    cuts.push(Cut {
                        index: i as u32,
                        id,
                        transform,
                        style,
                        pieces,
                    });
                }
            }
            (elements, cuts)
        };
        if cuts.is_empty() {
            return Ok(self.unchanged());
        }
        // 2. Écriture : une seule transaction (une étape), indices décroissants (les suivants ne glissent pas).
        let mut change = Change {
            pages: vec![page.to_string()],
            ..Default::default()
        };
        {
            let mut txn = self.transact_local();
            for cut in cuts.iter().rev() {
                elements.remove(&mut txn, cut.index);
                for (k, piece) in cut.pieces.iter().enumerate() {
                    let id = yrs::uuid_v4().to_string();
                    elements.insert(
                        &mut txn,
                        cut.index + k as u32,
                        stroke_prelim(&id, &cut.transform, &cut.style, piece),
                    );
                    change.ids.push(id);
                }
                change.removed.push(cut.id.clone());
            }
        }
        Ok(self.done(change))
    }

    fn cmd_delete(&mut self, ids: &[String]) -> Result<Change, CommandError> {
        let unique: BTreeSet<&String> = ids.iter().collect();
        let mut targets: Vec<Target> = {
            let txn = self.read();
            unique
                .into_iter()
                .filter_map(|id| {
                    self.find_element(&txn, id).map(|f| Target {
                        elements: f.elements,
                        index: f.index,
                        page: f.page_id,
                        id: id.clone(),
                    })
                })
                .collect()
        };
        if targets.is_empty() {
            return Ok(self.unchanged());
        }
        // Indices décroissants tous tableaux confondus : dans un même tableau, le plus grand part d'abord.
        targets.sort_by_key(|t| std::cmp::Reverse(t.index));
        {
            let mut txn = self.transact_local();
            for t in &targets {
                t.elements.remove(&mut txn, t.index);
            }
        }
        let mut pages: Vec<String> = targets.iter().map(|t| t.page.clone()).collect();
        pages.sort();
        pages.dedup();
        let removed = targets.into_iter().map(|t| t.id).collect();
        Ok(self.done(Change {
            pages,
            removed,
            ..Default::default()
        }))
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    use super::*;
    use crate::ink::points::{to_flat, InkPoint};

    fn pen() -> StrokeStyle {
        StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        }
    }

    fn hline(y: f32) -> Vec<f32> {
        (0..=40)
            .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
            .collect()
    }

    fn commit(d: &mut Document, page: &str, pts: Vec<f32>) -> String {
        d.apply(Command::CommitStroke {
            page: page.into(),
            points: pts,
            style: pen(),
        })
        .expect("commit")
        .ids[0]
            .clone()
    }

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }

    fn three(d: &mut Document) -> (String, [String; 3]) {
        let p = first(d);
        let a = commit(d, &p, hline(100.0));
        let b = commit(d, &p, hline(200.0));
        let c = commit(d, &p, hline(300.0));
        (p, [a, b, c])
    }

    fn cut_second(p: &str) -> Command {
        Command::Erase {
            page: p.into(),
            path: vec![300.0, 150.0, 300.0, 250.0],
            radius: 10.0,
            mode: EraseMode::Partial,
        }
    }

    /// Comparaison bit à bit : jamais `assert_eq!` sur des `f32` qui peuvent porter des NaN.
    fn bits(pts: &Option<Vec<InkPoint>>) -> Option<Vec<u32>> {
        pts.as_ref()
            .map(|p| to_flat(p).iter().map(|v| v.to_bits()).collect())
    }

    /// Compte les transactions d'écriture validées sur le `Doc` à partir de maintenant. Une transaction d'écriture
    /// vide n'ajoute pas d'étape d'annulation (`UndoManager::should_skip`) : seul ce compteur la voit. L'abonnement
    /// déclenche lui-même un appel (constaté sous yrs 0.28.1) : la base est prise après lui.
    pub(crate) struct Writes {
        n: Arc<AtomicUsize>,
        base: usize,
    }

    impl Writes {
        pub(crate) fn since(&self) -> usize {
            self.n.load(Ordering::SeqCst) - self.base
        }
    }

    pub(crate) fn writes(d: &Document) -> Writes {
        let doc = d.transact_local().doc().clone();
        let n = Arc::new(AtomicUsize::new(0));
        let m = Arc::clone(&n);
        doc.observe_after_transaction("compteur-ecritures", move |_| {
            m.fetch_add(1, Ordering::SeqCst);
        })
        .expect("abonnement");
        let base = n.load(Ordering::SeqCst);
        Writes { n, base }
    }

    #[test]
    fn commit_stroke_adds_element_with_local_points() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = commit(&mut d, &p, vec![10.0, 20.0, 0.5, 30.0, 40.0, 0.7]);
        assert_eq!(d.element_ids(&p), vec![id.clone()]);
        let e = d.element(&id).expect("élément");
        assert_eq!(e.kind, "stroke");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]);
        assert_eq!(e.style, pen());
        let pts = d.stroke_points(&id).expect("points");
        assert_eq!((pts[1].x, pts[1].y, pts[1].pressure), (20.0, 20.0, 0.7));
    }

    #[test]
    fn commit_stroke_is_one_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        commit(&mut d, &p, hline(100.0));
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 1);
    }

    #[test]
    fn commit_rejects_bad_points() {
        let mut d = Document::blank();
        let p = first(&d);
        let bad = |points: Vec<f32>| Command::CommitStroke {
            page: p.clone(),
            points,
            style: pen(),
        };
        assert_eq!(d.apply(bad(vec![1.0, 2.0])), Err(CommandError::BadPoints));
        assert_eq!(
            d.apply(bad(vec![1.0, f32::NAN, 0.5])),
            Err(CommandError::BadPoints)
        );
        assert!(!d.can_undo());
    }

    #[test]
    fn bad_radius_or_width_is_refused_without_transaction() {
        let mut d = Document::blank();
        let (p, _) = three(&mut d);
        let w = writes(&d);
        for radius in [0.0, -1.0, f32::NAN, f32::INFINITY] {
            for mode in [EraseMode::Partial, EraseMode::Object] {
                let r = d.apply(Command::Erase {
                    page: p.clone(),
                    path: vec![300.0, 150.0, 300.0, 250.0],
                    radius,
                    mode,
                });
                assert_eq!(r, Err(CommandError::BadRadius), "rayon {radius}");
            }
        }
        for width in [0.0, -2.0, f32::NAN, f32::NEG_INFINITY] {
            let r = d.apply(Command::CommitStroke {
                page: p.clone(),
                points: hline(400.0),
                style: StrokeStyle {
                    color: "#000000".into(),
                    width,
                },
            });
            assert_eq!(r, Err(CommandError::BadWidth), "épaisseur {width}");
        }
        assert_eq!(w.since(), 0, "aucune transaction");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    #[test]
    fn commit_on_unknown_page_fails() {
        let mut d = Document::blank();
        let r = d.apply(Command::CommitStroke {
            page: "nope".into(),
            points: hline(1.0),
            style: pen(),
        });
        assert_eq!(r, Err(CommandError::UnknownPage("nope".into())));
    }

    #[test]
    fn add_page_after_inserts_next() {
        let mut d = Document::blank();
        let p0 = first(&d);
        let last = d
            .apply(Command::AddPage { after: None })
            .expect("ajout")
            .pages[0]
            .clone();
        let mid = d
            .apply(Command::AddPage {
                after: Some(p0.clone()),
            })
            .expect("ajout")
            .pages[0]
            .clone();
        assert_eq!(d.page_ids(), vec![p0, mid, last]);
    }

    #[test]
    fn remove_page_then_undo_restores_its_stroke() {
        let mut d = Document::blank();
        let p1 = d
            .apply(Command::AddPage { after: None })
            .expect("ajout")
            .pages[0]
            .clone();
        let id = commit(&mut d, &p1, hline(100.0));
        let before = bits(&d.stroke_points(&id));
        let c = d
            .apply(Command::RemovePage { page: p1.clone() })
            .expect("suppression");
        assert_eq!(c.removed, vec![id.clone()]);
        assert_eq!(d.page_count(), 1);
        assert!(d.undo());
        assert_eq!(d.page_ids()[1], p1);
        assert_eq!(d.element_ids(&p1), vec![id.clone()]);
        assert!(before.is_some());
        assert_eq!(bits(&d.stroke_points(&id)), before);
    }

    /// Écart assumé au cadrage (« commande sans effet ») : le plan rend `Err(LastPage)`.
    #[test]
    fn remove_last_page_is_refused() {
        let mut d = Document::blank();
        let p = first(&d);
        assert_eq!(
            d.apply(Command::RemovePage { page: p }),
            Err(CommandError::LastPage)
        );
        assert_eq!(d.page_count(), 1);
        assert!(!d.can_undo());
    }

    #[test]
    fn erase_through_middle_splits_in_two() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let ch = d.apply(cut_second(&p)).expect("gomme");
        assert_eq!(ch.removed, vec![b.clone()]);
        assert_eq!(ch.ids.len(), 2);
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 4);
        assert!(ids.contains(&a) && ids.contains(&c) && !ids.contains(&b));
    }

    #[test]
    fn erase_is_one_undo_step() {
        let mut d = Document::blank();
        let (p, [_, b, _]) = three(&mut d);
        d.apply(cut_second(&p)).expect("gomme");
        assert!(d.undo());
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 3);
        assert!(ids.contains(&b));
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 4);
    }

    #[test]
    fn erase_miss_adds_no_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        commit(&mut d, &p, hline(100.0));
        let v = d.version();
        let far = Command::Erase {
            page: p.clone(),
            path: vec![900.0, 900.0, 950.0, 950.0],
            radius: 10.0,
            mode: EraseMode::Partial,
        };
        let ch = d.apply(far).expect("gomme");
        assert!(ch.removed.is_empty() && ch.ids.is_empty());
        assert_eq!(ch.version, v);
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
    }

    /// Discrimine le patron (1) : une transaction d'écriture ouverte avant de savoir si la commande a un effet ne
    /// pousse aucune étape (transaction vide ignorée par l'`UndoManager`), donc `erase_miss_adds_no_undo_step`
    /// reste vert ; seul le compteur de transactions d'écriture la voit (D38 : rien n'est écrit sans effet).
    #[test]
    fn command_without_effect_opens_no_write_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        for mode in [EraseMode::Partial, EraseMode::Object] {
            let far = Command::Erase {
                page: p.clone(),
                path: vec![900.0, 900.0, 950.0, 950.0],
                radius: 10.0,
                mode,
            };
            assert!(d.apply(far).expect("gomme").removed.is_empty());
        }
        assert!(d
            .apply(Command::Delete {
                ids: vec!["absent".into()]
            })
            .expect("suppression")
            .removed
            .is_empty());
        assert!(d.apply(Command::RemovePage { page: p.clone() }).is_err());
        assert!(d
            .apply(Command::RemovePage {
                page: "nope".into()
            })
            .is_err());
        assert!(d
            .apply(Command::AddPage {
                after: Some("nope".into())
            })
            .is_err());
        assert!(d
            .apply(Command::CommitStroke {
                page: "nope".into(),
                points: hline(1.0),
                style: pen()
            })
            .is_err());
        assert!(d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: vec![1.0],
                style: pen()
            })
            .is_err());
        let bad_path = Command::Erase {
            page: p.clone(),
            path: vec![1.0, 2.0, 3.0],
            radius: 1.0,
            mode: EraseMode::Partial,
        };
        assert!(d.apply(bad_path).is_err());
        assert_eq!(n.since(), 0, "transaction d'écriture ouverte sans effet");
        assert_eq!(d.element_ids(&p), vec![id]);
    }

    /// Discrimine le patron (2) (une transaction par trait coupé) et, avec deux traits voisins, le patron (3).
    #[test]
    fn erase_across_two_strokes_is_one_transaction_and_one_step() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let n = writes(&d);
        let path = vec![300.0, 90.0, 300.0, 210.0];
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path,
                radius: 10.0,
                mode: EraseMode::Partial,
            })
            .expect("gomme");
        assert_eq!(n.since(), 1, "une gomme = une transaction");
        let mut removed = ch.removed.clone();
        removed.sort();
        let mut expected = vec![a.clone(), b.clone()];
        expected.sort();
        assert_eq!(removed, expected);
        assert_eq!(ch.ids.len(), 4);
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 5);
        assert_eq!(ids[4], c);
        assert!(!ids.contains(&a) && !ids.contains(&b));
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![a, b, c]);
        assert!(d.can_undo(), "les trois traits restent annulables");
    }

    /// Les morceaux prennent la place du trait coupé dans l'empilement, sous de nouveaux ids (DA4, patron (4)).
    #[test]
    fn erase_pieces_take_the_cut_stroke_place() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let ch = d.apply(cut_second(&p)).expect("gomme");
        let mut expected = vec![a];
        expected.extend(ch.ids.iter().cloned());
        expected.push(c);
        assert_eq!(d.element_ids(&p), expected);
        assert!(!ch.ids.contains(&b));
        let tb = d.element(&ch.ids[0]).expect("morceau").transform;
        assert_eq!(
            tb,
            [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
            "le morceau garde le transform d'origine"
        );
    }

    /// Un seul morceau restant : le trait est quand même retiré et remplacé, jamais réécrit (DA4).
    #[test]
    fn erase_end_replaces_stroke_by_a_new_one() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let path = vec![100.0, 150.0, 100.0, 250.0];
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path,
                radius: 10.0,
                mode: EraseMode::Partial,
            })
            .expect("gomme");
        assert_eq!(ch.removed, vec![b.clone()]);
        assert_eq!(ch.ids.len(), 1);
        assert_ne!(ch.ids[0], b);
        assert_eq!(d.element_ids(&p), vec![a, ch.ids[0].clone(), c]);
        assert!(d.stroke_points(&b).is_none());
    }

    #[test]
    fn object_erase_removes_whole_stroke() {
        let mut d = Document::blank();
        let (p, [_, b, _]) = three(&mut d);
        let cmd = Command::Erase {
            page: p.clone(),
            path: vec![300.0, 190.0, 300.0, 210.0],
            radius: 5.0,
            mode: EraseMode::Object,
        };
        let ch = d.apply(cmd).expect("gomme");
        assert_eq!(ch.removed, vec![b.clone()]);
        assert!(ch.ids.is_empty());
        assert_eq!(d.element_ids(&p).len(), 2);
    }

    #[test]
    fn delete_removes_each_element_once() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let ch = d
            .apply(Command::Delete {
                ids: vec![a.clone(), a.clone(), c.clone()],
            })
            .expect("suppression");
        assert_eq!(ch.removed.len(), 2);
        assert_eq!(d.element_ids(&p), vec![b]);
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// Discrimine le patron (3) : par indices croissants, retirer 0 puis 1 retire `a` puis `c`.
    #[test]
    fn delete_adjacent_elements_in_one_transaction() {
        let mut d = Document::blank();
        let (p, [a, b, c]) = three(&mut d);
        let n = writes(&d);
        let ch = d
            .apply(Command::Delete {
                ids: vec![a.clone(), b.clone()],
            })
            .expect("suppression");
        assert_eq!(n.since(), 1);
        assert_eq!(ch.pages, vec![p.clone()]);
        assert_eq!(d.element_ids(&p), vec![c]);
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    #[test]
    fn change_version_increases() {
        let mut d = Document::blank();
        let p = first(&d);
        let c1 = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: hline(1.0),
                style: pen(),
            })
            .expect("commit");
        assert_eq!(c1.version, 1);
        let c2 = d.apply(Command::AddPage { after: None }).expect("ajout");
        assert_eq!(c2.version, 2);
    }

    #[test]
    fn thousand_strokes_undo_all() {
        let mut d = Document::blank();
        let p = first(&d);
        for i in 0..1000 {
            let y = (i % 50) as f32 * 20.0;
            let pts: Vec<f32> = (0..20)
                .flat_map(|k| [k as f32 * 5.0, y + k as f32, 0.5])
                .collect();
            commit(&mut d, &p, pts);
        }
        let size = d.encode_v1().len();
        eprintln!("1000 traits : {size} octets");
        assert!(size < 50 * 1024 * 1024);
        for _ in 0..1000 {
            assert!(d.undo());
        }
        assert!(d.element_ids(&p).is_empty());
        assert!(!d.can_undo());
    }

    use crate::element::{ShapeView, IDENTITY};
    use crate::shape::ShapeKind;

    fn rect(page: &str, corners: [f64; 4]) -> Command {
        let [x0, y0, x1, y1] = corners;
        Command::AddShape {
            page: page.into(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: pen(),
            fill: None,
        }
    }

    #[test]
    fn transform_moves_elements_in_one_step() {
        let mut d = Document::blank();
        let (p, [a, b, _]) = three(&mut d);
        let before = d.element(&a).expect("a").transform;
        let c = d
            .apply(Command::Transform {
                ids: vec![b.clone(), a.clone(), a.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 50.0],
            })
            .expect("transform");
        let mut want = vec![a.clone(), b.clone()];
        want.sort();
        assert_eq!(c.ids, want);
        assert_eq!(c.pages, vec![p]);
        assert_eq!(
            d.element(&a).expect("a").transform,
            [1.0, 0.0, 0.0, 1.0, before[4] + 100.0, before[5] + 50.0]
        );
        assert!(d.undo());
        assert_eq!(d.element(&a).expect("a").transform, before);
        assert!(
            d.can_undo(),
            "une seule étape défaite : les trois traits restent"
        );
    }

    #[test]
    fn transform_composes_on_the_left() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0)); // [1, 0, 0, 1, 100, 100]
        d.apply(Command::Transform {
            ids: vec![a.clone()],
            matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0],
        })
        .expect("échelle");
        d.apply(Command::Transform {
            ids: vec![a.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
        })
        .expect("translation");
        assert_eq!(
            d.element(&a).expect("a").transform,
            [2.0, 0.0, 0.0, 2.0, 210.0, 200.0]
        );
    }

    #[test]
    fn transform_rejects_bad_matrix_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        for m in [
            [f64::NAN, 0.0, 0.0, 1.0, 0.0, 0.0],
            [0.0; 6],
            [1.0, 2.0, 2.0, 4.0, 0.0, 0.0],
        ] {
            assert_eq!(
                d.apply(Command::Transform {
                    ids: vec![a.clone()],
                    matrix: m
                }),
                Err(CommandError::BadMatrix)
            );
        }
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn transform_unknown_ids_or_identity_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        let v = d.version();
        let c = d
            .apply(Command::Transform {
                ids: vec!["absent".into()],
                matrix: [1.0, 0.0, 0.0, 1.0, 5.0, 5.0],
            })
            .expect("inconnu");
        assert!(c.ids.is_empty() && c.pages.is_empty());
        let c = d
            .apply(Command::Transform {
                ids: vec![a],
                matrix: IDENTITY,
            })
            .expect("identité");
        assert!(c.ids.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn add_shape_rect_normalizes_and_is_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d
            .apply(rect(&p, [300.0, 200.0, 100.0, 50.0]))
            .expect("rect");
        assert_eq!(c.pages, vec![p.clone()]);
        let e = d.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "shape");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert_eq!(e.style, pen());
        assert_eq!(
            e.shape,
            Some(ShapeView {
                shape: "rect".into(),
                w: 200.0,
                h: 150.0,
                fill: None
            })
        );
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn add_shape_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let n = writes(&d);
        assert_eq!(
            d.apply(rect(&p, [f64::NAN, 0.0, 10.0, 10.0])),
            Err(CommandError::BadShape)
        );
        let mut thin = rect(&p, [0.0, 0.0, 10.0, 10.0]);
        if let Command::AddShape { style, .. } = &mut thin {
            style.width = 0.0;
        }
        assert_eq!(d.apply(thin), Err(CommandError::BadWidth));
        assert_eq!(
            d.apply(rect("absente", [0.0, 0.0, 10.0, 10.0])),
            Err(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn erase_and_delete_on_shapes() {
        let mut d = Document::blank();
        let p = first(&d);
        let arrow = d
            .apply(Command::AddShape {
                page: p.clone(),
                shape: ShapeKind::Arrow,
                x0: 300.0,
                y0: 200.0,
                x1: 100.0,
                y1: 50.0,
                style: pen(),
                fill: Some("#ff0000".into()),
            })
            .expect("flèche")
            .ids[0]
            .clone();
        let e = d.element(&arrow).expect("flèche");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 300.0, 200.0]);
        assert_eq!(
            e.shape,
            Some(ShapeView {
                shape: "arrow".into(),
                w: -200.0,
                h: -150.0,
                fill: Some("#ff0000".into())
            })
        );
        let id = d
            .apply(rect(&p, [100.0, 300.0, 300.0, 500.0]))
            .expect("rect")
            .ids[0]
            .clone();
        for mode in [EraseMode::Partial, EraseMode::Object] {
            let c = d
                .apply(Command::Erase {
                    page: p.clone(),
                    path: vec![100.0, 400.0, 300.0, 400.0],
                    radius: 20.0,
                    mode,
                })
                .expect("gomme");
            assert!(
                c.removed.is_empty(),
                "la gomme n'agit que sur les traits (D12)"
            );
        }
        assert_eq!(
            d.apply(Command::Delete {
                ids: vec![id.clone()]
            })
            .expect("suppression")
            .removed,
            vec![id]
        );
    }

    #[test]
    fn new_errors_have_readable_messages() {
        assert_eq!(
            CommandError::BadShape.to_string(),
            "forme invalide (rect, ellipse, line ou arrow, coins finis attendus)"
        );
        assert_eq!(
            CommandError::BadMatrix.to_string(),
            "matrice invalide (six nombres finis, inversible)"
        );
    }
}
