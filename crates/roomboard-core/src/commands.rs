//! Commandes (D10, DA5) : une commande = une transaction "local" = une étape d'annulation (D11). Une commande sans
//! effet (gomme qui ne touche rien) n'ouvre aucune transaction d'écriture : aucune étape vide (D38).
use std::collections::BTreeSet;

use yrs::{
    Any, Array, ArrayRef, GetString, In, Map, MapPrelim, MapRef, Out, ReadTxn, TextPrelim, TextRef,
};

use crate::asset::{is_asset_id, AssetRef};
use crate::document::{insert_page, Document, FoundElement};
use crate::element::{
    apply_transform, compose, finite_positive, fits_f32, invert, out_bytes, out_f64, out_string,
    out_transform, read_backdrop, read_style, style_fields, transform_to_any, StrokeStyle,
    Transform, FIT_WIDTH, IDENTITY,
};
use crate::grid::{self, GridInput};
use crate::ink::erase::erase;
use crate::ink::points::{decode, dedup, encode, from_flat, to_local, InkPoint};
use crate::query::path_hits_stroke;
use crate::rich_text::{self, SpanInput, TextAttr};
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
    SetText {
        page: String,
        id: Option<String>,
        x: f64,
        y: f64,
        content: String,
        color: String,
        size: f32,
        box_width: f64,
        box_height: f64,
        /// C7b (R7) : état voulu des segments, aligné dans la même transaction ; `None` : différence seule (C7).
        spans: Option<Vec<SpanInput>>,
    },
    /// Image (U5, K5) : `w`, `h` = taille source en pixels, boîte locale placée par `matrix`.
    AddImage {
        page: String,
        asset: AssetRef,
        w: f64,
        h: f64,
        matrix: Transform,
    },
    /// Fond de page (U6, K6) ; `None` retire le fond.
    SetBackdrop {
        page: String,
        backdrop: Option<BackdropInput>,
    },
    /// Attributs de plage d'un texte (C7, U27) : `start`, `len` en unités UTF-16 du contenu ; `attrs` = patch (T7) ;
    /// `box_height` : hauteur de boîte mesurée par la page, écrite si elle change.
    FormatText {
        id: String,
        start: u32,
        len: u32,
        attrs: Vec<TextAttr>,
        box_height: Option<f64>,
    },
    /// Grille de page (U31, C9) ; `None` retire la grille. Remplacée en bloc, une étape (G5).
    SetGrid {
        page: String,
        grid: Option<GridInput>,
    },
    /// Tableau (U32, C10a, T3) : `cols` × `rows` (1 à 64), colonnes et lignes à la taille donnée ; coin en (x, y).
    AddTable {
        page: String,
        x: f64,
        y: f64,
        cols: u32,
        rows: u32,
        col_width: f64,
        row_height: f64,
        color: String,
        size: f64,
    },
    /// Texte d'une cellule (`row`, `col` = ids) ; `row_height` : hauteur exigée mesurée par la page, écrite si plus
    /// grande (T5, DAC2).
    SetTableCell {
        id: String,
        row: String,
        col: String,
        content: String,
        row_height: Option<f64>,
        /// C7b (R7) : état voulu des segments de la cellule ; `None` : différence seule (C10a).
        spans: Option<Vec<SpanInput>>,
    },
    /// Ligne ou colonne insérée au rang `at` (0..=n), taille copiée de la voisine `at - 1`, sinon de la première.
    InsertTableLine {
        id: String,
        axis: crate::table::TableAxis,
        at: u32,
    },
    /// Ligne ou colonne `line` (id) retirée avec ses cellules ; refusée s'il n'en reste qu'une.
    RemoveTableLine {
        id: String,
        axis: crate::table::TableAxis,
        line: String,
    },
    /// Uniformiser (T11) : toutes les colonnes à `col_width`, toutes les lignes à `row_height` (peut réduire).
    SetTableSizes {
        id: String,
        col_width: f64,
        row_height: f64,
    },
    /// Remplissage d'une cellule (U32) ; `None` le retire.
    SetTableFill {
        id: String,
        row: String,
        col: String,
        fill: Option<String>,
    },
}

/// Fond demandé par `SetBackdrop` : seul `fit: "width"` s'écrit (K6, HK1).
#[derive(Debug, Clone, PartialEq)]
pub struct BackdropInput {
    pub asset: AssetRef,
    pub w: f64,
    pub h: f64,
    pub fit: String,
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
    BadText,
    UnknownElement(String),
    BadAsset,
    BadImage,
    BadFormat,
    BadGrid,
    BadTable,
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
            CommandError::BadText => {
                write!(f, "texte invalide (taille et boîte finies > 0 attendues)")
            }
            CommandError::UnknownElement(id) => write!(f, "élément inconnu : {id}"),
            CommandError::BadAsset => write!(
                f,
                "asset invalide (empreinte SHA-256 en hexadécimal minuscule, type MIME non vide, taille entière ≥ 0 attendus)"
            ),
            CommandError::BadImage => write!(
                f,
                "image invalide (largeur et hauteur finies > 0 attendues, ajustement « width » seul accepté)"
            ),
            CommandError::BadFormat => write!(
                f,
                "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)"
            ),
            CommandError::BadGrid => write!(
                f,
                "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)"
            ),
            CommandError::BadTable => write!(
                f,
                "tableau invalide (1 à 64 lignes et colonnes, tailles finies > 0, couleur valide, ligne ou colonne existante, au moins une ligne et une colonne attendues)"
            ),
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

/// Champs d'un texte (D14) ; `None` si l'élément n'en est pas un. `text` : le `Y.Text` du contenu.
pub(crate) struct TextFields {
    pub color: String,
    pub size: f32,
    pub box_width: f64,
    pub box_height: f64,
    pub content: String,
    pub text: TextRef,
}

pub(crate) fn read_text<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<TextFields> {
    if out_string(e.get(txn, "kind"))? != "text" {
        return None;
    }
    let Some(Out::YText(text)) = e.get(txn, "content") else {
        return None;
    };
    Some(TextFields {
        color: out_string(e.get(txn, "color"))?,
        size: out_f64(e.get(txn, "size"))? as f32,
        box_width: out_f64(e.get(txn, "boxWidth"))?,
        box_height: out_f64(e.get(txn, "boxHeight"))?,
        content: text.get_string(txn),
        text,
    })
}

/// Entrée de `SetText` (évite une fonction à neuf paramètres).
struct TextInput<'a> {
    page: &'a str,
    id: Option<&'a str>,
    x: f64,
    y: f64,
    content: &'a str,
    color: &'a str,
    size: f32,
    box_width: f64,
    box_height: f64,
    spans: Option<&'a [SpanInput]>,
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

/// Facteur d'échelle d'une similitude (rotation, échelle uniforme, symétrie éventuelle), `None` pour toute autre matrice
/// (T63). Sous une similitude de facteur s, toute distance monde vaut s fois la distance locale : un rayon monde r se
/// mesure exactement en local comme r / s. Tolérance relative 1e-9 : une similitude composée garde ses arrondis.
pub(crate) fn similarity_scale(t: &Transform) -> Option<f64> {
    let [a, b, c, d, _, _] = *t;
    let s = a.hypot(b);
    let eps = 1e-9 * s.max(c.hypot(d));
    let direct = (a - d).abs() <= eps && (b + c).abs() <= eps;
    let mirror = (a + d).abs() <= eps && (b - c).abs() <= eps;
    (s.is_finite() && s > 0.0 && (direct || mirror)).then_some(s)
}

/// Plus petite valeur singulière de la partie linéaire de `t` : le plus fort rétrécissement d'une longueur locale
/// (égale au facteur d'une similitude).
fn min_singular(t: &Transform) -> f64 {
    let [a, b, c, d, _, _] = *t;
    let f = a * a + b * b + c * c + d * d;
    let det = (a * d - b * c).abs();
    let max = ((f + (f * f - 4.0 * det * det).max(0.0).sqrt()) / 2.0).sqrt();
    if max > 0.0 {
        det / max
    } else {
        0.0
    }
}

/// Gomme partielle d'un trait placé par `t`, chemin et rayon en unités monde (T63). Similitude de facteur s : mesure en
/// local, rayon r / s, demi-épaisseur locale inchangée (distance monde ≤ r + s · demi-épaisseur, exact ; points gardés
/// tels quels). Autre matrice, où aucun rayon local n'est exact : la ligne médiane est portée en monde et coupée là, avec
/// la plus petite demi-épaisseur monde (plus petite valeur singulière : la gomme ne coupe jamais plus loin que le trait
/// affiché), puis les morceaux reviennent en local (une application affine garde les interpolations).
fn erase_stroke(
    t: &Transform,
    pts: &[InkPoint],
    half_width: f32,
    path: &[f32],
    radius: f32,
) -> Option<Vec<Vec<InkPoint>>> {
    if let Some(s) = similarity_scale(t) {
        let local_path = world_to_local_path(t, path)?;
        return erase(pts, half_width, &local_path, (f64::from(radius) / s) as f32);
    }
    let inv = invert(t)?;
    let map = |m: &Transform, p: &InkPoint| {
        let (x, y) = apply_transform(m, f64::from(p.x), f64::from(p.y));
        InkPoint {
            x: x as f32,
            y: y as f32,
            pressure: p.pressure,
        }
    };
    let world: Vec<InkPoint> = pts.iter().map(|p| map(t, p)).collect();
    let half = (f64::from(half_width) * min_singular(t)) as f32;
    let pieces = erase(&world, half, path, radius)?;
    Some(
        pieces
            .into_iter()
            .map(|piece| piece.iter().map(|p| map(&inv, p)).collect())
            .collect(),
    )
}

/// Matrice de `Transform`, donnée ou composée : six nombres finis, inversible (|dét| ≥ 1e-12, seuil d'`invert`).
fn valid_matrix(m: &Transform) -> bool {
    m.iter().all(|v| v.is_finite()) && invert(m).is_some()
}

/// Référence d'asset : empreinte conforme, type non vide, taille entière finie ≥ 0 (K5).
fn valid_asset(a: &AssetRef) -> bool {
    is_asset_id(&a.id)
        && !a.mime.is_empty()
        && a.size.is_finite()
        && a.size >= 0.0
        && a.size.fract() == 0.0
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

/// Les chaînes données, triées et sans doublon.
fn sorted_unique(items: impl Iterator<Item = String>) -> Vec<String> {
    let mut v: Vec<String> = items.collect();
    v.sort();
    v.dedup();
    v
}

struct Target {
    elements: ArrayRef,
    index: u32,
    page: String,
    id: String,
}

impl Document {
    /// Éléments trouvés pour des ids dédoublonnés (ordre des ids) ; ids inconnus ignorés.
    fn find_unique<T: ReadTxn>(&self, txn: &T, ids: &[String]) -> Vec<(String, FoundElement)> {
        let unique: BTreeSet<&String> = ids.iter().collect();
        unique
            .into_iter()
            .filter_map(|id| Some((id.clone(), self.find_element(txn, id)?)))
            .collect()
    }

    pub(crate) fn page_elements_or_err(&self, page: &str) -> Result<ArrayRef, CommandError> {
        let txn = self.read();
        self.page_elements(&txn, page)
            .ok_or_else(|| CommandError::UnknownPage(page.to_string()))
    }

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
            Command::SetText {
                page,
                id,
                x,
                y,
                content,
                color,
                size,
                box_width,
                box_height,
                spans,
            } => self.cmd_set_text(TextInput {
                page: &page,
                id: id.as_deref(),
                x,
                y,
                content: &content,
                color: &color,
                size,
                box_width,
                box_height,
                spans: spans.as_deref(),
            }),
            Command::AddImage {
                page,
                asset,
                w,
                h,
                matrix,
            } => self.cmd_add_image(&page, &asset, [w, h], &matrix),
            Command::SetBackdrop { page, backdrop } => {
                self.cmd_set_backdrop(&page, backdrop.as_ref())
            }
            Command::FormatText {
                id,
                start,
                len,
                attrs,
                box_height,
            } => self.cmd_format_text(&id, (start, len), &attrs, box_height),
            Command::SetGrid { page, grid } => self.cmd_set_grid(&page, grid.as_ref()),
            Command::AddTable {
                page,
                x,
                y,
                cols,
                rows,
                col_width,
                row_height,
                color,
                size,
            } => self.cmd_add_table(&crate::table::NewTable {
                page: &page,
                x,
                y,
                cols,
                rows,
                col_width,
                row_height,
                color: &color,
                size,
            }),
            Command::SetTableCell {
                id,
                row,
                col,
                content,
                row_height,
                spans,
            } => self.cmd_set_table_cell(
                &id,
                (row.as_str(), col.as_str()),
                &content,
                row_height,
                spans.as_deref(),
            ),
            Command::InsertTableLine { id, axis, at } => self.cmd_insert_table_line(&id, axis, at),
            Command::RemoveTableLine { id, axis, line } => {
                self.cmd_remove_table_line(&id, axis, &line)
            }
            Command::SetTableSizes {
                id,
                col_width,
                row_height,
            } => self.cmd_set_table_sizes(&id, col_width, row_height),
            Command::SetTableFill { id, row, col, fill } => {
                self.cmd_set_table_fill(&id, (row.as_str(), col.as_str()), fill.as_deref())
            }
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
        let [x0, y0, x1, y1] = corners;
        let (tx, ty, w, h) = normalize(kind, x0, y0, x1, y1);
        // Constat 3 de T60 : des coins finis peuvent donner w = inf (x0 = -1e308, x1 = 1e308), ou une géométrie que le
        // polygone (f32) et la liaison ne tiennent pas.
        if !fits_f32(&[tx, ty, w, h]) {
            return Err(CommandError::BadShape);
        }
        if !finite_positive(f64::from(style.width)) {
            return Err(CommandError::BadWidth);
        }
        let elements = self.page_elements_or_err(page)?;
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
        if !valid_matrix(m) {
            return Err(CommandError::BadMatrix);
        }
        let targets: Vec<(MapRef, Transform, String, String)> = {
            let txn = self.read();
            self.find_unique(&txn, ids)
                .into_iter()
                .filter_map(|(id, f)| {
                    let t = out_transform(f.element.get(&txn, "transform"))?;
                    Some((f.element, t, f.page_id, id))
                })
                .collect()
        };
        if targets.is_empty() || *m == IDENTITY {
            return Ok(self.unchanged());
        }
        // Constat 2 de T60 : chaque matrice composée suit la règle de `m` (deux × 1e200 donnent une matrice infinie,
        // cinq × 0,05 un déterminant < 1e-12) ; une seule fautive refuse la commande, avant toute écriture.
        let composed: Vec<Transform> = targets.iter().map(|(_, t, _, _)| compose(m, t)).collect();
        if !composed.iter().all(valid_matrix) {
            return Err(CommandError::BadMatrix);
        }
        {
            let mut txn = self.transact_local();
            for ((e, _, _, _), c) in targets.iter().zip(&composed) {
                e.insert(&mut txn, "transform", transform_to_any(c));
            }
        }
        let pages = sorted_unique(targets.iter().map(|t| t.2.clone()));
        let ids = targets.into_iter().map(|t| t.3).collect();
        Ok(self.done(Change {
            pages,
            ids,
            ..Default::default()
        }))
    }

    /// Une validation de texte = une transaction (D14) ; texte invalide, page ou élément inconnus : erreur sans
    /// écriture ; boîte neuve vide ou texte inchangé : aucune transaction (CL4-6, D38) ; texte existant vidé : élément
    /// retiré. Comme `cmd_erase` : plan sous une lecture fermée, puis au plus une écriture.
    fn cmd_set_text(&mut self, t: TextInput<'_>) -> Result<Change, CommandError> {
        // C7b (R7, PC2) : segments contrôlés en premier, sans écriture ; même ordre que `fake-core.ts`.
        if t.spans
            .is_some_and(|s| !rich_text::valid_spans(t.content, s))
        {
            return Err(CommandError::BadFormat);
        }
        if !finite_positive(f64::from(t.size))
            || !finite_positive(t.box_width)
            || !finite_positive(t.box_height)
            || !t.x.is_finite()
            || !t.y.is_finite()
        {
            return Err(CommandError::BadText);
        }
        let Some(id) = t.id else {
            return self.insert_text(&t);
        };
        let (found, current, spans_same) = {
            let txn = self.read();
            let unknown = || CommandError::UnknownElement(id.to_string());
            let found = self.find_element(&txn, id).ok_or_else(unknown)?;
            let current = read_text(&txn, &found.element).ok_or_else(unknown)?;
            // R7 : une mise en forme seule (texte égal) n'est jamais « inchangée ».
            let spans_same = rich_text::spans_unchanged(&txn, Some(&current.text), t.spans);
            (found, current, spans_same)
        };
        if t.content.is_empty() {
            {
                let mut txn = self.transact_local();
                found.elements.remove(&mut txn, found.index);
            }
            return Ok(self.done(Change {
                pages: vec![found.page_id],
                removed: vec![id.to_string()],
                ..Default::default()
            }));
        }
        let same = current.content == t.content
            && current.color == t.color
            && current.size == t.size
            && current.box_width == t.box_width
            && current.box_height == t.box_height
            && spans_same;
        if same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            // T4, T5, T16 : différence en points de code, héritage du caractère précédent, embeds gardés.
            rich_text::apply_text_diff(&mut txn, &current.text, t.content);
            if let Some(s) = t.spans {
                rich_text::apply_spans(&mut txn, &current.text, s);
            }
            let e = &found.element;
            e.insert(&mut txn, "color", In::from(t.color));
            e.insert(&mut txn, "size", In::Any(Any::from(f64::from(t.size))));
            e.insert(&mut txn, "boxWidth", In::Any(Any::from(t.box_width)));
            e.insert(&mut txn, "boxHeight", In::Any(Any::from(t.box_height)));
        }
        Ok(self.done(Change {
            pages: vec![found.page_id],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }

    fn insert_text(&mut self, t: &TextInput<'_>) -> Result<Change, CommandError> {
        let elements = self.page_elements_or_err(t.page)?;
        if t.content.is_empty() {
            return Ok(self.unchanged());
        }
        let id = yrs::uuid_v4().to_string();
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from("text")),
            (
                "transform",
                In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, t.x, t.y])),
            ),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(f64::from(t.size)))),
            ("boxWidth", In::Any(Any::from(t.box_width))),
            ("boxHeight", In::Any(Any::from(t.box_height))),
            ("content", In::from(TextPrelim::new(t.content))),
        ];
        {
            let mut txn = self.transact_local();
            let el = elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
            // C7b (R7) : attributs posés dans la même transaction, sur le `Y.Text` relu après l'insertion.
            if let (Some(s), Some(Out::YText(text))) = (t.spans, el.get(&txn, "content")) {
                rich_text::apply_spans(&mut txn, &text, s);
            }
        }
        Ok(self.done(Change {
            pages: vec![t.page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// Image (U5, K5) : une étape ; la métadonnée entre dans la même transaction si elle est absente (K3).
    fn cmd_add_image(
        &mut self,
        page: &str,
        asset: &AssetRef,
        size: [f64; 2],
        m: &Transform,
    ) -> Result<Change, CommandError> {
        let [w, h] = size;
        if !valid_asset(asset) {
            return Err(CommandError::BadAsset);
        }
        if !finite_positive(w) || !finite_positive(h) {
            return Err(CommandError::BadImage);
        }
        if !valid_matrix(m) {
            return Err(CommandError::BadMatrix);
        }
        let elements = self.page_elements_or_err(page)?;
        let id = yrs::uuid_v4().to_string();
        let fields = MapPrelim::from([
            ("id", In::from(id.as_str())),
            ("kind", In::from("image")),
            ("transform", In::Any(transform_to_any(m))),
            ("asset", In::from(asset.id.as_str())),
            ("w", In::Any(Any::from(w))),
            ("h", In::Any(Any::from(h))),
        ]);
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields);
            self.insert_asset_meta(&mut txn, asset);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// Fond de page (U6, K6) : une étape ; `None` retire ; même valeur, ou rien à retirer : aucune transaction (D38) ;
    /// seul `fit: "width"` s'écrit ; la taille de la page ne change jamais.
    fn cmd_set_backdrop(
        &mut self,
        page: &str,
        input: Option<&BackdropInput>,
    ) -> Result<Change, CommandError> {
        if let Some(b) = input {
            if !valid_asset(&b.asset) {
                return Err(CommandError::BadAsset);
            }
            if !finite_positive(b.w) || !finite_positive(b.h) || b.fit != FIT_WIDTH {
                return Err(CommandError::BadImage);
            }
        }
        let (page_map, current) = {
            let txn = self.read();
            let (_, m) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let current = read_backdrop(&txn, &m);
            (m, current)
        };
        let same = match (input, &current) {
            (None, None) => true,
            (Some(b), Some(r)) => {
                r.asset.as_deref() == Some(b.asset.id.as_str())
                    && r.kind.as_deref() == Some("image")
                    && r.w == Some(b.w)
                    && r.h == Some(b.h)
                    && r.fit.as_deref() == Some(FIT_WIDTH)
            }
            _ => false,
        };
        // Même fond mais métadonnée d'asset absente : on l'écrit (une étape) au lieu de « inchangé ».
        let meta_missing = same
            && input.is_some_and(|b| {
                let txn = self.read();
                txn.get_map("assets")
                    .is_none_or(|m| m.get(&txn, b.asset.id.as_str()).is_none())
            });
        if same && !meta_missing {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match input {
                Some(b) if same => self.insert_asset_meta(&mut txn, &b.asset),
                None => {
                    page_map.remove(&mut txn, "backdrop");
                }
                Some(b) => {
                    page_map.insert(
                        &mut txn,
                        "backdrop",
                        MapPrelim::from([
                            ("asset", In::from(b.asset.id.as_str())),
                            ("kind", In::from("image")),
                            ("w", In::Any(Any::from(b.w))),
                            ("h", In::Any(Any::from(b.h))),
                            ("fit", In::from(FIT_WIDTH)),
                        ]),
                    );
                    self.insert_asset_meta(&mut txn, &b.asset);
                }
            }
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ..Default::default()
        }))
    }

    pub(crate) fn done(&mut self, mut change: Change) -> Change {
        change.version = self.bump();
        change
    }

    pub(crate) fn unchanged(&self) -> Change {
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
        if !finite_positive(f64::from(style.width)) {
            return Err(CommandError::BadWidth);
        }
        let elements = self.page_elements_or_err(page)?;
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
        if !finite_positive(f64::from(radius)) {
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
                let id = out_string(e.get(&txn, "id")).unwrap_or_default();
                // Chemin et rayon en unités monde (T63) : la conversion vers le repère du trait est faite par
                // `erase_stroke` et `path_hits_stroke`, jamais en appliquant le rayon tel quel en local.
                let pieces = match mode {
                    EraseMode::Partial => {
                        erase_stroke(&transform, &pts, style.width / 2.0, path, radius)
                    }
                    EraseMode::Object => {
                        let poly = self.cached_outline(&id, &style, &pts);
                        path_hits_stroke(&transform, &poly, path, radius).then(Vec::new)
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
        let mut targets: Vec<Target> = {
            let txn = self.read();
            self.find_unique(&txn, ids)
                .into_iter()
                .map(|(id, f)| Target {
                    elements: f.elements,
                    index: f.index,
                    page: f.page_id,
                    id,
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
        let pages = sorted_unique(targets.iter().map(|t| t.page.clone()));
        let removed = targets.into_iter().map(|t| t.id).collect();
        Ok(self.done(Change {
            pages,
            removed,
            ..Default::default()
        }))
    }

    /// `FormatText` (C7, T7) : contrôles dans l'ordre du cadrage, le même que `fake-core.ts` (patch, `box_height`,
    /// élément, bornes) ; rien ne change (plage vide, mêmes attributs, même hauteur) : aucune transaction (D38) ; sinon
    /// une seule, format puis hauteur. Comme `cmd_set_text` : plan sous une lecture fermée, puis au plus une écriture.
    fn cmd_format_text(
        &mut self,
        id: &str,
        range: (u32, u32),
        attrs: &[TextAttr],
        box_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        if !rich_text::valid_attrs(attrs) || box_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadFormat);
        }
        let patch = rich_text::patch_attrs(attrs);
        let (found, current, at, formats) = {
            let txn = self.read();
            let unknown = || CommandError::UnknownElement(id.to_string());
            let found = self.find_element(&txn, id).ok_or_else(unknown)?;
            let current = read_text(&txn, &found.element).ok_or_else(unknown)?;
            let at = rich_text::utf16_range(&txn, &current.text, range.0, range.1)
                .ok_or(CommandError::BadFormat)?;
            let formats = rich_text::format_changes(&txn, &current.text, at, &patch);
            (found, current, at, formats)
        };
        let height = box_height.filter(|h| *h != current.box_height);
        if !formats && height.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            if formats {
                rich_text::apply_format(&mut txn, &current.text, at, patch);
            }
            if let Some(h) = height {
                found
                    .element
                    .insert(&mut txn, "boxHeight", In::Any(Any::from(h)));
            }
        }
        Ok(self.done(Change {
            pages: vec![found.page_id],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }

    /// Grille de page (U31, G5) : validée (`BadGrid`, sans transaction), puis remplacée en bloc en une transaction
    /// `"local"` ; même valeur (comparée champ par champ sur la vue) ou rien à retirer : aucune transaction (D38).
    fn cmd_set_grid(
        &mut self,
        page: &str,
        input: Option<&GridInput>,
    ) -> Result<Change, CommandError> {
        if let Some(g) = input {
            grid::validate(g)?;
        }
        let (page_map, current) = {
            let txn = self.read();
            let (_, m) = self
                .find_page(&txn, page)
                .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
            let current = grid::read(&txn, &m);
            (m, current)
        };
        if current.as_ref() == input {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            grid::write(&mut txn, &page_map, input);
        }
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ..Default::default()
        }))
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::Arc;

    use super::*;
    use crate::element::group_to_any;
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
        assert_eq!(e.style, Some(pen()));
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

    use crate::element::{ShapeView, TextView, IDENTITY};
    use crate::rich_text::{SpanAttrs, TextSpanView};
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
        assert_eq!(e.style, Some(pen()));
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

    /// Constat 3 de T60 : coins finis mais `w`, `h`, `tx` ou `ty` tirés non finis en f32 : BadShape, aucune écriture.
    #[test]
    fn add_shape_rejects_derived_geometry_not_finite_in_f32() {
        let mut d = Document::blank();
        let p = first(&d);
        let n = writes(&d);
        let mut line = rect(&p, [0.0, 0.0, 1e39, 0.0]);
        if let Command::AddShape { shape, .. } = &mut line {
            *shape = crate::shape::ShapeKind::Line;
        }
        for c in [
            rect(&p, [-1e308, 0.0, 1e308, 10.0]),
            rect(&p, [0.0, 0.0, 1e39, 10.0]),
            rect(&p, [0.0, -1e39, 10.0, 0.0]),
            rect(&p, [1e39, 0.0, 1e39, 10.0]),
            line,
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadShape));
        }
        assert_eq!(n.since(), 0);
        assert!(d.element_ids(&p).is_empty());
    }

    /// Constat 2 de T60 : chaque matrice composée est contrôlée (finie, |dét| ≥ 1e-12), toute la commande refusée sinon.
    #[test]
    fn transform_rejects_composed_matrix_overflow_or_collapse() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = commit(&mut d, &p, hline(100.0));
        let b = commit(&mut d, &p, hline(300.0));
        let huge = [1e200, 0.0, 0.0, 1e200, 0.0, 0.0];
        d.apply(Command::Transform {
            ids: vec![a.clone()],
            matrix: huge,
        })
        .expect("première, composée finie");
        let n = writes(&d);
        let before = d.element(&a).expect("a").transform;
        assert_eq!(
            d.apply(Command::Transform {
                ids: vec![a.clone()],
                matrix: huge
            }),
            Err(CommandError::BadMatrix),
            "seconde : composée infinie"
        );
        assert_eq!(d.element(&a).expect("a").transform, before);
        assert_eq!(n.since(), 0);
        let small = [0.05, 0.0, 0.0, 0.05, 0.0, 0.0];
        for _ in 0..4 {
            d.apply(Command::Transform {
                ids: vec![b.clone()],
                matrix: small,
            })
            .expect("dét ≥ 1e-12");
        }
        let b4 = d.element(&b).expect("b").transform;
        let fresh = commit(&mut d, &p, hline(500.0));
        let fresh0 = d.element(&fresh).expect("neuf").transform;
        let n2 = writes(&d);
        assert_eq!(
            d.apply(Command::Transform {
                ids: vec![fresh.clone(), b.clone()],
                matrix: small
            }),
            Err(CommandError::BadMatrix),
            "cinquième réduction : dét < 1e-12, la commande entière est refusée"
        );
        assert_eq!(d.element(&b).expect("b").transform, b4);
        assert_eq!(d.element(&fresh).expect("neuf").transform, fresh0);
        assert_eq!(n2.since(), 0);
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

    fn text_cmd(page: &str, id: Option<String>, content: &str) -> Command {
        Command::SetText {
            page: page.into(),
            id,
            x: 100.0,
            y: 200.0,
            content: content.into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: None,
        }
    }

    #[test]
    fn set_text_creates_text_in_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte");
        assert_eq!(c.pages, vec![p.clone()]);
        let e = d.element(&c.ids[0]).expect("élément");
        assert_eq!(e.kind, "text");
        assert_eq!(e.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 200.0]);
        assert_eq!(
            e.style,
            Some(StrokeStyle {
                color: "#000000".into(),
                width: 0.0
            })
        );
        assert_eq!(
            e.text,
            Some(TextView {
                content: "Bonjour".into(),
                size: 36.0,
                box_width: 600.0,
                box_height: 45.0,
                spans: vec![TextSpanView {
                    text: "Bonjour".into(),
                    attrs: SpanAttrs::default()
                }]
            })
        );
        assert_eq!(e.shape, None);
        assert!(d.undo());
        assert!(d.element_ids(&p).is_empty());
    }

    #[test]
    fn set_text_replaces_content_in_one_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let c = d
            .apply(text_cmd(&p, Some(id.clone()), "Bonsoir"))
            .expect("remplacer");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(
            d.element(&id).and_then(|e| e.text).map(|t| t.content),
            Some("Bonsoir".into())
        );
        assert!(d.undo());
        assert_eq!(
            d.element(&id).and_then(|e| e.text).map(|t| t.content),
            Some("Bonjour".into())
        );
    }

    /// Discrimine le patron écarté (transaction d'écriture ouverte avant de savoir si `SetText` a un effet) : une
    /// transaction vide n'ajoute aucune étape d'annulation, donc un test d'historique resterait vert ; seul le
    /// compteur `writes` la voit (D38).
    #[test]
    fn set_text_unchanged_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let n = writes(&d);
        let v = d.version();
        let c = d
            .apply(text_cmd(&p, Some(id), "Bonjour"))
            .expect("inchangé");
        assert!(c.ids.is_empty() && c.removed.is_empty());
        let c = d.apply(text_cmd(&p, None, "")).expect("boîte neuve vide");
        assert!(c.ids.is_empty() && c.pages.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn set_text_empty_removes_existing() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        let c = d.apply(text_cmd(&p, Some(id.clone()), "")).expect("vider");
        assert_eq!(c.removed, vec![id.clone()]);
        assert_eq!(c.pages, vec![p.clone()]);
        assert!(d.element_ids(&p).is_empty());
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![id]);
    }

    #[test]
    fn set_text_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let stroke = commit(&mut d, &p, hline(100.0));
        let n = writes(&d);
        let mut tiny = text_cmd(&p, None, "x");
        if let Command::SetText { size, .. } = &mut tiny {
            *size = 0.0;
        }
        assert_eq!(d.apply(tiny), Err(CommandError::BadText));
        let mut nan = text_cmd(&p, None, "x");
        if let Command::SetText { box_height, .. } = &mut nan {
            *box_height = f64::NAN;
        }
        assert_eq!(d.apply(nan), Err(CommandError::BadText));
        assert_eq!(
            d.apply(text_cmd(&p, Some("absent".into()), "x")),
            Err(CommandError::UnknownElement("absent".into()))
        );
        assert_eq!(
            d.apply(text_cmd(&p, Some(stroke.clone()), "x")),
            Err(CommandError::UnknownElement(stroke))
        );
        assert_eq!(
            d.apply(text_cmd("absente", None, "x")),
            Err(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn set_text_errors_have_readable_messages() {
        assert_eq!(
            CommandError::BadText.to_string(),
            "texte invalide (taille et boîte finies > 0 attendues)"
        );
        assert_eq!(
            CommandError::UnknownElement("x".into()).to_string(),
            "élément inconnu : x"
        );
    }

    /// Garde l'interdit « plus d'une transaction par `SetText` » en comptant les transactions elles-mêmes, sans
    /// dépendre du réglage de l'historique (délai de capture 0 aujourd'hui, `history.rs`).
    #[test]
    fn set_text_each_effect_is_one_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let n = writes(&d);
        let id = d.apply(text_cmd(&p, None, "Bonjour")).expect("texte").ids[0].clone();
        assert_eq!(n.since(), 1, "créer : une transaction");
        d.apply(text_cmd(&p, Some(id.clone()), "Bonsoir"))
            .expect("remplacer");
        assert_eq!(n.since(), 2, "remplacer : une transaction");
        d.apply(text_cmd(&p, Some(id), "")).expect("vider");
        assert_eq!(n.since(), 3, "vider : une transaction");
    }

    /// T65 : rang 1 à 1e200 partout, déterminant NaN (inf - inf) ; refusée comme par la fausse liaison.
    #[test]
    fn rank_one_huge_matrix_is_refused() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a = commit(&mut d, &p, hline(0.0));
        let n = writes(&d);
        let before = d.element(&a).expect("a").transform;
        assert_eq!(
            d.apply(Command::Transform {
                ids: vec![a.clone()],
                matrix: [1e200; 6]
            }),
            Err(CommandError::BadMatrix)
        );
        assert_eq!(d.element(&a).expect("a").transform, before);
        assert_eq!(n.since(), 0);
    }

    use crate::asset::{AssetInfo, AssetRef};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    fn png() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        }
    }

    fn add_image(
        d: &mut Document,
        page: &str,
        asset: AssetRef,
        matrix: Transform,
    ) -> Result<Change, CommandError> {
        d.apply(Command::AddImage {
            page: page.into(),
            asset,
            w: 640.0,
            h: 480.0,
            matrix,
        })
    }

    #[test]
    fn add_image_is_one_step_and_writes_meta_once() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = add_image(&mut d, &p, png(), [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]).expect("image");
        assert_eq!(c.pages, vec![p.clone()]);
        let a = c.ids[0].clone();
        let v = d.element(&a).expect("vue");
        assert_eq!(
            (v.kind.as_str(), v.transform),
            ("image", [1.0, 0.0, 0.0, 1.0, 10.0, 20.0])
        );
        assert_eq!(
            v.image.map(|i| (i.asset, i.w, i.h)),
            Some((ABC.to_string(), 640.0, 480.0))
        );
        let renamed = AssetRef {
            name: "autre.png".into(),
            ..png()
        };
        let b = add_image(&mut d, &p, renamed, IDENTITY)
            .expect("image 2")
            .ids[0]
            .clone();
        assert_eq!(d.element_ids(&p), vec![a, b]);
        assert_eq!(d.cited_assets(), vec![png()]);
        assert_eq!(d.asset(ABC), Some(png()));
        assert!(d.undo());
        assert!(
            d.can_undo(),
            "l'image et sa métadonnée font une seule étape"
        );
        assert!(d.undo());
        assert!(!d.can_undo());
    }

    #[test]
    fn undo_add_image_removes_new_asset_meta_only() {
        let mut d = Document::blank();
        let p = first(&d);
        add_image(&mut d, &p, png(), IDENTITY).expect("1");
        add_image(&mut d, &p, png(), IDENTITY).expect("2");
        assert!(d.undo());
        assert_eq!(
            d.asset(ABC),
            Some(png()),
            "annuler la seconde garde la métadonnée"
        );
        assert!(d.undo());
        assert_eq!(d.cited_assets(), Vec::<AssetInfo>::new());
        assert_eq!(
            d.asset(ABC),
            Some(AssetInfo::fallback(ABC)),
            "annuler la première la retire"
        );
    }

    #[test]
    fn add_image_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        let bad = [
            (
                AssetRef {
                    id: ABC.to_uppercase(),
                    ..png()
                },
                CommandError::BadAsset,
            ),
            (
                AssetRef {
                    id: ABC[..63].into(),
                    ..png()
                },
                CommandError::BadAsset,
            ),
            (
                AssetRef {
                    mime: String::new(),
                    ..png()
                },
                CommandError::BadAsset,
            ),
            (
                AssetRef {
                    size: -1.0,
                    ..png()
                },
                CommandError::BadAsset,
            ),
            (AssetRef { size: 1.5, ..png() }, CommandError::BadAsset),
            (
                AssetRef {
                    size: f64::NAN,
                    ..png()
                },
                CommandError::BadAsset,
            ),
        ];
        for (asset, err) in bad {
            assert_eq!(add_image(&mut d, &p, asset, IDENTITY), Err(err));
        }
        for (iw, ih) in [(0.0, 1.0), (1.0, f64::INFINITY), (f64::NAN, 1.0)] {
            assert_eq!(
                d.apply(Command::AddImage {
                    page: p.clone(),
                    asset: png(),
                    w: iw,
                    h: ih,
                    matrix: IDENTITY
                }),
                Err(CommandError::BadImage)
            );
        }
        assert_eq!(
            add_image(&mut d, &p, png(), [0.0; 6]),
            Err(CommandError::BadMatrix)
        );
        assert_eq!(
            add_image(&mut d, "nulle-part", png(), IDENTITY),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
        assert!(d.cited_assets().is_empty());
    }

    #[test]
    fn image_moves_hits_and_eraser_ignores_it() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = add_image(&mut d, &p, png(), [1.0, 0.0, 0.0, 1.0, 100.0, 100.0])
            .expect("image")
            .ids[0]
            .clone();
        assert_eq!(d.hit_test(&p, 400.0, 300.0, 0.0), Some(a.clone()));
        let w = writes(&d);
        let e = d
            .apply(Command::Erase {
                page: p.clone(),
                path: vec![100.0, 300.0, 740.0, 300.0],
                radius: 10.0,
                mode: EraseMode::Object,
            })
            .expect("gomme");
        assert!(e.removed.is_empty());
        assert_eq!(w.since(), 0);
        d.apply(Command::Transform {
            ids: vec![a.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
        })
        .expect("transform");
        assert_eq!(
            d.element(&a).expect("vue").transform,
            [1.0, 0.0, 0.0, 1.0, 110.0, 100.0]
        );
        d.apply(Command::Delete { ids: vec![a] }).expect("delete");
        assert_eq!(
            d.asset(ABC),
            Some(png()),
            "supprimer l'image laisse sa métadonnée (K3)"
        );
        assert!(d.cited_assets().is_empty());
    }

    fn backdrop(asset: AssetRef, w: f64, h: f64, fit: &str) -> Option<BackdropInput> {
        Some(BackdropInput {
            asset,
            w,
            h,
            fit: fit.into(),
        })
    }

    /// Fond calé sur la largeur de la page (page à hauteur infinie) : 1000 × 500 sur 1920 de large donne 1920 × 960,
    /// et la page garde sa taille.
    #[test]
    fn set_backdrop_scales_to_page_width() {
        let mut d = Document::blank();
        let p = first(&d);
        let c = d
            .apply(Command::SetBackdrop {
                page: p.clone(),
                backdrop: backdrop(png(), 1000.0, 500.0, "width"),
            })
            .expect("fond");
        assert_eq!(c.pages, vec![p.clone()]);
        let v = d.page(&p).expect("page");
        assert_eq!((v.width, v.height), (1920.0, 1080.0));
        let b = v.backdrop.expect("fond");
        assert_eq!(
            (b.asset.as_str(), b.kind.as_str(), b.fit.as_str()),
            (ABC, "image", "width")
        );
        assert_eq!((b.w, b.h), (Some(1000.0), Some(500.0)));
        assert_eq!(
            b.rect,
            Some(crate::query::Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 1920.0,
                y1: 960.0
            })
        );
        assert_eq!(d.hit_test(&p, 960.0, 480.0, 0.0), None);
        assert!(d.element_ids(&p).is_empty());
        assert_eq!(d.cited_assets(), vec![png()]);
        assert!(d.undo());
        assert_eq!(d.page(&p).expect("page").backdrop, None);
        assert!(!d.can_undo(), "fond et métadonnée : une seule étape");
    }

    #[test]
    fn set_backdrop_same_value_or_none_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: None,
        })
        .expect("rien à retirer");
        assert_eq!(w.since(), 0);
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: backdrop(png(), 1000.0, 500.0, "width"),
        })
        .expect("fond");
        let w = writes(&d);
        let v = d.version();
        let c = d
            .apply(Command::SetBackdrop {
                page: p.clone(),
                backdrop: backdrop(png(), 1000.0, 500.0, "width"),
            })
            .expect("même");
        assert_eq!((c.version, w.since()), (v, 0));
    }

    /// Fond identique mais métadonnée d'asset absente : la métadonnée s'écrit, en une étape annulable.
    #[test]
    fn set_backdrop_same_value_writes_missing_asset_meta() {
        let mut d = Document::blank();
        let p = first(&d);
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: backdrop(png(), 1000.0, 500.0, "width"),
        })
        .expect("fond");
        // Retire `assets/<id>` dans un Doc brut, puis recharge : fond sans métadonnée, historique neuf.
        use yrs::updates::decoder::Decode;
        use yrs::{Transact, Update};
        let raw = yrs::Doc::new();
        raw.transact_mut()
            .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
            .expect("mise à jour");
        let assets = raw.get_or_insert_map("assets");
        assets.remove(&mut raw.transact_mut(), ABC);
        let bytes =
            yrs::ReadTxn::encode_state_as_update_v1(&raw.transact(), &yrs::StateVector::default());
        let mut d = Document::from_update_v1(&bytes).expect("rechargé");
        let p = first(&d);
        assert_eq!(
            d.asset(ABC).map(|a| a.mime),
            Some("application/octet-stream".into())
        );
        assert!(d.page(&p).expect("page").backdrop.is_some());
        assert!(!d.can_undo());
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: backdrop(png(), 1000.0, 500.0, "width"),
        })
        .expect("même fond");
        assert_eq!(d.asset(ABC).map(|a| a.mime), Some(png().mime));
        assert!(d.undo());
        assert_eq!(
            d.asset(ABC).map(|a| a.mime),
            Some("application/octet-stream".into())
        );
        assert!(d.page(&p).expect("page").backdrop.is_some());
        assert!(!d.can_undo(), "métadonnée seule : une seule étape");
    }

    #[test]
    fn remove_backdrop_then_undo_restores_it() {
        let mut d = Document::blank();
        let p = first(&d);
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: backdrop(png(), 1000.0, 500.0, "width"),
        })
        .expect("fond");
        d.apply(Command::SetBackdrop {
            page: p.clone(),
            backdrop: None,
        })
        .expect("retrait");
        assert_eq!(d.page(&p).expect("page").backdrop, None);
        assert!(d.undo());
        assert_eq!(
            d.page(&p)
                .expect("page")
                .backdrop
                .and_then(|b| b.rect)
                .map(|r| r.y1),
            Some(960.0)
        );
    }

    #[test]
    fn set_backdrop_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let w = writes(&d);
        for (b, err) in [
            (
                backdrop(png(), 10.0, 10.0, "contain"),
                CommandError::BadImage,
            ),
            (backdrop(png(), 0.0, 10.0, "width"), CommandError::BadImage),
            (
                backdrop(
                    AssetRef {
                        mime: String::new(),
                        ..png()
                    },
                    10.0,
                    10.0,
                    "width",
                ),
                CommandError::BadAsset,
            ),
        ] {
            assert_eq!(
                d.apply(Command::SetBackdrop {
                    page: p.clone(),
                    backdrop: b
                }),
                Err(err)
            );
        }
        assert_eq!(
            d.apply(Command::SetBackdrop {
                page: "nulle-part".into(),
                backdrop: None
            }),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
    }

    #[test]
    fn new_asset_errors_have_readable_messages() {
        assert!(CommandError::BadAsset
            .to_string()
            .starts_with("asset invalide"));
        assert!(CommandError::BadImage.to_string().contains("« width »"));
    }

    /// G4 : métadonnée, élément image et fond en champs de `Y.Map` ; trente rechargements gardent les octets.
    #[test]
    fn image_and_backdrop_reload_keep_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        add_image(&mut d, &p, png(), IDENTITY).expect("image");
        let jpg = AssetRef {
            id: EMPTY.into(),
            name: "fond.jpg".into(),
            mime: "image/jpeg".into(),
            size: 0.0,
        };
        d.apply(Command::SetBackdrop {
            page: p,
            backdrop: backdrop(jpg, 1000.0, 500.0, "width"),
        })
        .expect("fond");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    // --- C7 : texte riche (FormatText, SetText par différence) ---

    const BAD_FORMAT_MESSAGE: &str = "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";

    fn format_cmd(id: &str, start: u32, len: u32, attrs: Vec<TextAttr>) -> Command {
        Command::FormatText {
            id: id.into(),
            start,
            len,
            attrs,
            box_height: None,
        }
    }

    fn spans_of(d: &Document, id: &str) -> Vec<TextSpanView> {
        d.element(id).and_then(|e| e.text).expect("texte").spans
    }

    fn span(text: &str, attrs: SpanAttrs) -> TextSpanView {
        TextSpanView {
            text: text.into(),
            attrs,
        }
    }

    fn red_bold() -> SpanAttrs {
        SpanAttrs {
            bold: true,
            color: Some("#ff0000".into()),
            ..SpanAttrs::default()
        }
    }

    fn red_bold_patch() -> Vec<TextAttr> {
        vec![
            TextAttr::Color(Some("#ff0000".into())),
            TextAttr::Bold(true),
        ]
    }

    /// S1 : « Le chat noir » avec « chat » (3, 4) rouge et gras.
    fn red_cat(d: &mut Document) -> (String, String) {
        let p = first(d);
        let id = d
            .apply(text_cmd(&p, None, "Le chat noir"))
            .expect("texte")
            .ids[0]
            .clone();
        d.apply(format_cmd(&id, 3, 4, red_bold_patch()))
            .expect("format");
        (p, id)
    }

    #[test]
    fn format_text_is_one_step_and_reads_spans() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d
            .apply(text_cmd(&p, None, "Le chat noir"))
            .expect("texte")
            .ids[0]
            .clone();
        let n = writes(&d);
        let c = d
            .apply(format_cmd(&id, 3, 4, red_bold_patch()))
            .expect("format");
        assert_eq!(
            (c.pages, c.ids, c.removed),
            (vec![p], vec![id.clone()], vec![])
        );
        assert_eq!(n.since(), 1);
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    /// Discrimine le patron écarté (`remove_range(0, len)` puis `insert` dans `cmd_set_text`) : sous lui, « chat »
    /// perdrait son rouge et son gras, et la vue serait un seul segment sans attribut.
    #[test]
    fn set_text_keeps_range_attributes_outside_the_edit() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir"))
            .expect("gros");
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le gros ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    #[test]
    fn set_text_diff_is_one_step() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        let n = writes(&d);
        let c = d
            .apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir"))
            .expect("gros");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(n.since(), 1, "différence et champs : une transaction");
        assert!(d.undo());
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    /// HU2-15 : le texte inséré prend les attributs du caractère qui le précède.
    #[test]
    fn set_text_inserted_text_inherits_previous_char() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir"))
            .expect("gros");
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chats noir"))
            .expect("chats");
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le gros ", SpanAttrs::default()),
                span("chats", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    /// Review Focus 1 (cadrage T5) : un mot formaté remplacé en entier suit le caractère qui le précède (sans attribut).
    #[test]
    fn set_text_replacing_a_whole_range_takes_previous_char_attrs() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le loup noir"))
            .expect("loup");
        assert_eq!(
            spans_of(&d, &id),
            vec![span("Le loup noir", SpanAttrs::default())]
        );
    }

    /// S1 : annuler trois fois rend « Le chat noir » sans attribut ; rétablir trois fois remet tout.
    #[test]
    fn s1_three_undos_restore_plain_text_and_redo_restores_all() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir"))
            .expect("gros");
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chats noir"))
            .expect("chats");
        let full = spans_of(&d, &id);
        assert!(d.undo() && d.undo() && d.undo());
        assert_eq!(
            spans_of(&d, &id),
            vec![span("Le chat noir", SpanAttrs::default())]
        );
        assert!(d.redo() && d.redo() && d.redo());
        assert_eq!(spans_of(&d, &id), full);
    }

    /// T7 : 1) patch, 2) boxHeight, 3) élément, 4) bornes UTF-16 ; aucune transaction sur une erreur. Discrimine le
    /// patron écarté (élément vérifié avant le patch) par la première assertion.
    #[test]
    fn format_text_checks_in_order_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let stroke = commit(&mut d, &p, hline(100.0));
        let id = d
            .apply(text_cmd(&p, None, "Le 🐱 noir"))
            .expect("texte")
            .ids[0]
            .clone();
        let n = writes(&d);
        let bold = || vec![TextAttr::Bold(true)];
        let with_height = |id: &str, h: f64| Command::FormatText {
            id: id.into(),
            start: 0,
            len: 1,
            attrs: vec![],
            box_height: Some(h),
        };
        let bad = Err(CommandError::BadFormat);
        let rgb = vec![TextAttr::Color(Some("rgb(0,0,0)".into()))];
        assert_eq!(
            d.apply(format_cmd("absent", 0, 1, rgb)),
            bad,
            "le patch passe avant l'élément"
        );
        assert_eq!(d.apply(with_height("absent", -1.0)), bad);
        assert_eq!(d.apply(with_height("absent", f64::NAN)), bad);
        assert_eq!(
            d.apply(format_cmd("absent", 0, 1, bold())),
            Err(CommandError::UnknownElement("absent".into()))
        );
        assert_eq!(
            d.apply(format_cmd(&stroke, 0, 1, bold())),
            Err(CommandError::UnknownElement(stroke.clone()))
        );
        // « Le 🐱 noir » : 10 unités UTF-16, le 🐱 en 3-4
        for (start, len) in [(4, 1), (3, 1), (8, 3), (11, 0), (u32::MAX, 1)] {
            assert_eq!(
                d.apply(format_cmd(&id, start, len, bold())),
                bad,
                "bornes {start}, {len}"
            );
        }
        let hex64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
        for attrs in [
            vec![TextAttr::Font(Some(hex64.into()))],
            vec![TextAttr::Color(Some(hex64.into()))],
            vec![TextAttr::Size(Some(0.0))],
            vec![TextAttr::Size(Some(f32::NAN))],
        ] {
            assert_eq!(d.apply(format_cmd(&id, 0, 1, attrs)), bad);
        }
        assert_eq!(n.since(), 0);
    }

    /// D38 : mêmes attributs, plage vide, retrait d'attributs absents, patch vide, même hauteur : aucune transaction.
    /// Discrimine le patron écarté (`transact_local()` ouvert avant de savoir si la commande a un effet).
    #[test]
    fn format_text_no_change_is_no_step() {
        let mut d = Document::blank();
        let (_, id) = red_cat(&mut d);
        let n = writes(&d);
        let v = d.version();
        for cmd in [
            format_cmd(&id, 3, 4, red_bold_patch()),
            format_cmd(&id, 2, 0, vec![TextAttr::Bold(true)]),
            format_cmd(
                &id,
                0,
                3,
                vec![TextAttr::Bold(false), TextAttr::Color(None)],
            ),
            format_cmd(&id, 0, 12, vec![]),
            Command::FormatText {
                id: id.clone(),
                start: 0,
                len: 0,
                attrs: vec![],
                box_height: Some(45.0),
            },
        ] {
            let c = d.apply(cmd).expect("sans effet");
            assert!(c.ids.is_empty() && c.pages.is_empty());
        }
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn format_text_box_height_alone_is_one_step() {
        let mut d = Document::blank();
        let (_, id) = red_cat(&mut d);
        let n = writes(&d);
        let height = |d: &Document| d.element(&id).and_then(|e| e.text).map(|t| t.box_height);
        let c = d
            .apply(Command::FormatText {
                id: id.clone(),
                start: 0,
                len: 0,
                attrs: vec![],
                box_height: Some(60.0),
            })
            .expect("hauteur");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(n.since(), 1);
        assert_eq!(height(&d), Some(60.0));
        d.apply(Command::FormatText {
            id: id.clone(),
            start: 3,
            len: 4,
            attrs: vec![TextAttr::Size(Some(48.0))],
            box_height: Some(75.0),
        })
        .expect("taille et hauteur");
        assert_eq!(n.since(), 2, "format et hauteur : une transaction");
        assert!(d.undo());
        assert_eq!(height(&d), Some(60.0));
        assert_eq!(spans_of(&d, &id)[1], span("chat", red_bold()));
    }

    #[test]
    fn format_text_error_has_readable_message() {
        assert_eq!(CommandError::BadFormat.to_string(), BAD_FORMAT_MESSAGE);
    }

    #[test]
    fn bad_grid_has_readable_message() {
        assert_eq!(
            CommandError::BadGrid.to_string(),
            "grille invalide (pas finis > 0, origine finie, type, couleur et trait non vides, au plus 16 niveaux)"
        );
    }

    fn grid_level(kind: &str, s: f64, color: &str) -> crate::grid::GridLevelView {
        crate::grid::GridLevelView {
            kind: kind.into(),
            spacing_x: s,
            spacing_y: s,
            origin_x: 0.0,
            origin_y: 0.0,
            color: color.into(),
            line: "solid".into(),
            line_width: 1.0,
            snap: true,
            visible: true,
        }
    }

    fn grid_of(levels: Vec<crate::grid::GridLevelView>, snap: bool, above: bool) -> GridInput {
        GridInput {
            visible: true,
            snap,
            above,
            levels,
        }
    }

    fn apply_grid(
        d: &mut Document,
        page: &str,
        grid: Option<GridInput>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetGrid {
            page: page.into(),
            grid,
        })
    }

    fn page_grid(d: &Document, page: &str) -> Option<GridInput> {
        d.page(page).and_then(|v| v.grid)
    }

    /// S1, G5 : une transaction, une étape ; annuler retire la grille, rétablir la remet.
    #[test]
    fn set_grid_is_one_step_then_undo_redo() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![
                grid_level("seyes", 30.24, "#7b68ee"),
                grid_level("dots", 40.0, "#000000"),
            ],
            true,
            true,
        );
        let w = writes(&d);
        let c = apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(w.since(), 1);
        assert_eq!(page_grid(&d, &p), Some(g.clone()));
        assert!(d.undo());
        assert_eq!(page_grid(&d, &p), None);
        assert!(d.redo());
        assert_eq!(page_grid(&d, &p), Some(g));
    }

    /// G5, D38 : même grille, ou rien à retirer : aucune transaction.
    #[test]
    fn set_grid_same_value_or_nothing_to_remove_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(vec![grid_level("squares", 40.0, "#cccccc")], true, false);
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        let v = d.version();
        let w = writes(&d);
        let same = apply_grid(&mut d, &p, Some(g)).expect("même grille");
        assert_eq!((same.pages.len(), same.version), (0, v));
        apply_grid(&mut d, &p, None).expect("retrait");
        let nothing = apply_grid(&mut d, &p, None).expect("rien à retirer");
        assert_eq!(nothing.pages.len(), 0);
        assert_eq!(w.since(), 1, "seul le retrait écrit");
    }

    /// G2 : `BadGrid` sans transaction ; page inconnue ; 16 niveaux et 0 niveau acceptés.
    #[test]
    fn set_grid_rejects_bad_input_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let ok = grid_level("squares", 40.0, "#000000");
        let w = writes(&d);
        for bad in [
            crate::grid::GridLevelView {
                spacing_x: 0.0,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                spacing_y: f64::NAN,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                origin_x: f64::INFINITY,
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                kind: String::new(),
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                color: String::new(),
                ..ok.clone()
            },
            crate::grid::GridLevelView {
                line: String::new(),
                ..ok.clone()
            },
        ] {
            assert_eq!(
                apply_grid(&mut d, &p, Some(grid_of(vec![bad], true, false))),
                Err(CommandError::BadGrid)
            );
        }
        assert_eq!(
            apply_grid(&mut d, &p, Some(grid_of(vec![ok.clone(); 17], true, false))),
            Err(CommandError::BadGrid)
        );
        assert_eq!(
            apply_grid(&mut d, "nulle-part", None),
            Err(CommandError::UnknownPage("nulle-part".into()))
        );
        assert_eq!(w.since(), 0);
        assert!(!d.can_undo());
        assert!(apply_grid(&mut d, &p, Some(grid_of(vec![ok; 16], true, false))).is_ok());
        assert!(apply_grid(&mut d, &p, Some(grid_of(Vec::new(), false, false))).is_ok());
    }

    /// S1 : A (deux niveaux) remplacée par B en un `SetGrid` ; annuler rend A à l'identique, dans l'ordre.
    #[test]
    fn replace_grid_then_undo_restores_both_levels() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = grid_of(
            vec![
                grid_level("squares", 40.0, "#111111"),
                grid_level("dots", 20.0, "#222222"),
            ],
            true,
            false,
        );
        let b = grid_of(vec![grid_level("music", 12.0, "#333333")], false, true);
        apply_grid(&mut d, &p, Some(a.clone())).expect("A");
        apply_grid(&mut d, &p, Some(b.clone())).expect("B");
        assert_eq!(page_grid(&d, &p), Some(b));
        assert!(d.undo());
        assert_eq!(page_grid(&d, &p), Some(a));
    }

    /// G14, S1, GC9 : trente rechargements gardent les octets et la vue (modèle `image_and_backdrop_reload_keep_bytes`).
    #[test]
    fn grid_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![
                grid_level("seyes", 30.24, "#7b68ee"),
                grid_level("dots", 40.0, "#000000"),
            ],
            true,
            true,
        );
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert_eq!(
                page_grid(&r, &p),
                Some(g.clone()),
                "vue au rechargement {i}"
            );
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    /// S3, E1 : `lineWidth` 2 écrit en une étape, relu, gardé par save → load → save (mêmes octets) ; 0, 9, NaN :
    /// `BadGrid` sans transaction.
    #[test]
    fn set_grid_line_width_round_trip_and_bounds() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let ok = crate::grid::GridLevelView {
            line_width: 2.0,
            ..grid_level("squares", 40.0, "#94a3b8")
        };
        let w = writes(&d);
        for bad in [0.0, 9.0, f64::NAN] {
            let level = crate::grid::GridLevelView {
                line_width: bad,
                ..ok.clone()
            };
            assert_eq!(
                apply_grid(&mut d, &p, Some(grid_of(vec![level], true, false))),
                Err(CommandError::BadGrid),
                "{bad}"
            );
        }
        assert_eq!(w.since(), 0);
        let g = grid_of(vec![ok], true, false);
        apply_grid(&mut d, &p, Some(g.clone())).expect("grille");
        assert_eq!(w.since(), 1);
        assert_eq!(page_grid(&d, &p).map(|x| x.levels[0].line_width), Some(2.0));
        let file = save(&d, &meta).expect("save");
        let r = load(&file).expect("load");
        assert_eq!(page_grid(&r, &p), Some(g));
        assert!(
            save(&r, &meta).expect("resave") == file,
            "fichier différent au rechargement"
        );
    }

    /// Effet de bord 1, Review Focus 1 : niveau écrit sans `lineWidth` (fichier de la PR 12) : lu à 1, ses lignes
    /// portent 1, le fichier se réenregistre à l'identique.
    #[test]
    fn grid_level_without_line_width_reads_as_one_and_resaves_identically() {
        use crate::format::{load, save, SaveMeta};
        use crate::query::Bounds;
        use yrs::ArrayPrelim;
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let d = Document::blank();
        let p = first(&d);
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        {
            let mut txn = d.transact_local();
            page.insert(
                &mut txn,
                "grid",
                MapPrelim::from([(
                    "levels",
                    In::Array(ArrayPrelim::from(vec![In::Map(MapPrelim::from([
                        ("kind", In::from("squares")),
                        ("spacingX", In::Any(Any::from(40.0))),
                        ("spacingY", In::Any(Any::from(40.0))),
                    ]))])),
                )]),
            );
        }
        let g = page_grid(&d, &p).expect("grille lisible");
        assert_eq!(g.levels[0].line_width, 1.0);
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0,
        };
        let lines = d.grid_lines(&p, r, 4.0, 8.0).expect("visible");
        assert_eq!(lines.levels[0].line_width, 1.0);
        let file = save(&d, &meta).expect("save");
        let back = load(&file).expect("load");
        assert_eq!(page_grid(&back, &p), Some(g));
        assert!(
            save(&back, &meta).expect("resave") == file,
            "relu puis réenregistré : mêmes octets"
        );
    }

    /// DAE1, S3 : `grid_lines_of` d'une grille non enregistrée = `grid_lines` après `SetGrid` de la même grille ; page
    /// inconnue → `None` ; rien n'est écrit.
    #[test]
    fn grid_lines_of_matches_grid_lines_after_set_grid() {
        let mut d = Document::blank();
        let p = first(&d);
        let g = grid_of(
            vec![
                grid_level("seyes", 30.24, "#7b68ee"),
                crate::grid::GridLevelView {
                    line_width: 3.0,
                    ..grid_level("dots", 40.0, "#000000")
                },
            ],
            true,
            false,
        );
        let r = crate::query::Bounds {
            x0: -13.3,
            y0: 1_000_007.0,
            x1: 786.7,
            y1: 1_000_607.0,
        };
        let w = writes(&d);
        let preview = d.grid_lines_of(&p, &g, r, 4.0, 8.0).expect("lignes");
        assert_eq!(w.since(), 0);
        assert_eq!(d.grid_lines(&p, r, 4.0, 8.0), None);
        assert_eq!(d.grid_lines_of("nulle-part", &g, r, 4.0, 8.0), None);
        apply_grid(&mut d, &p, Some(g)).expect("grille");
        assert_eq!(d.grid_lines(&p, r, 4.0, 8.0), Some(preview));
    }

    /// S2, G4, G14 : niveau `hexagon` et clé inconnue écrits par yrs (version plus récente) : page lisible, gardés aux
    /// octets près, ni ligne ni accroche ; un `SetGrid` d'un niveau `hexagon` l'écrit aussi.
    #[test]
    fn newer_grid_kind_is_kept_drawn_nowhere_and_never_snaps() {
        use crate::format::{load, save, SaveMeta};
        use crate::query::Bounds;
        use yrs::ArrayPrelim;
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let page = {
            let txn = d.read();
            d.find_page(&txn, &p).expect("page").1
        };
        {
            let mut txn = d.transact_local();
            page.insert(
                &mut txn,
                "grid",
                MapPrelim::from([
                    ("snap", In::Any(Any::Bool(true))),
                    ("futur", In::from("gardé")),
                    (
                        "levels",
                        In::Array(ArrayPrelim::from(vec![In::Map(MapPrelim::from([
                            ("kind", In::from("hexagon")),
                            ("spacingX", In::Any(Any::from(40.0))),
                            ("spacingY", In::Any(Any::from(40.0))),
                            ("rayon", In::Any(Any::from(3.0))),
                        ]))])),
                    ),
                ]),
            );
        }
        let g = page_grid(&d, &p).expect("grille lisible");
        assert_eq!(g.levels.len(), 1);
        assert_eq!(g.levels[0].kind, "hexagon");
        assert_eq!((g.visible, g.snap, g.above), (true, true, false));
        let all = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 1920.0,
            y1: 1080.0,
        };
        assert_eq!(
            d.grid_lines(&p, all, 0.0, 0.0).map(|l| l.levels.len()),
            Some(0)
        );
        assert_eq!(d.snap_point(&p, 13.0, 17.0), None);
        let file = save(&d, &meta).expect("save");
        let r = load(&file).expect("load");
        assert!(
            save(&r, &meta).expect("resave") == file,
            "le niveau inconnu change les octets"
        );
        assert_eq!(page_grid(&r, &p), Some(g));
        let hex = grid_of(vec![grid_level("hexagon", 40.0, "#123456")], true, false);
        apply_grid(&mut d, &p, Some(hex.clone())).expect("hexagon écrit");
        assert_eq!(page_grid(&d, &p), Some(hex.clone()));
        assert_eq!(d.snap_point(&p, 13.0, 17.0), None);
        assert_eq!(
            d.grid_lines(&p, all, 0.0, 0.0).map(|l| l.levels.len()),
            Some(0)
        );
        // S2 complet (relecture finale) : niveau `hexagon` écrit par SetGrid sur une page neuve, puis save → load →
        // resave : mêmes octets (G14), même vue, ni ligne ni accroche. Page neuve : remplacer une grille déjà écrite
        // change les octets du premier rechargement, comme deux SetBackdrop (encodage yrs du contenu remplacé).
        let mut fresh = Document::blank();
        let q = first(&fresh);
        apply_grid(&mut fresh, &q, Some(hex.clone())).expect("hexagon écrit");
        let file = save(&fresh, &meta).expect("save après SetGrid");
        let r = load(&file).expect("load après SetGrid");
        assert!(
            save(&r, &meta).expect("resave après SetGrid") == file,
            "le niveau hexagon écrit par SetGrid change les octets"
        );
        assert_eq!(page_grid(&r, &q), Some(hex));
        assert_eq!(
            r.grid_lines(&q, all, 0.0, 0.0).map(|l| l.levels.len()),
            Some(0)
        );
        assert_eq!(r.snap_point(&q, 13.0, 17.0), None);
    }

    /// G5, HG4 : une page neuve n'a pas de grille ; retirer une page retire la sienne, annuler la remet.
    #[test]
    fn new_page_has_no_grid_and_removed_page_takes_its_grid() {
        let mut d = Document::blank();
        let p = first(&d);
        apply_grid(
            &mut d,
            &p,
            Some(grid_of(
                vec![grid_level("squares", 40.0, "#cccccc")],
                true,
                false,
            )),
        )
        .expect("grille");
        let q = d
            .apply(Command::AddPage {
                after: Some(p.clone()),
            })
            .expect("page")
            .pages[0]
            .clone();
        assert_eq!(page_grid(&d, &q), None);
        d.apply(Command::RemovePage { page: p.clone() })
            .expect("retrait");
        assert!(d.page(&p).is_none());
        assert!(d.undo());
        assert!(page_grid(&d, &p).is_some());
    }

    /// G7, HG6, S3 côté cœur : boîte géométrique (forme sans épaisseur) ; brut sans grille, sans élément, coupé.
    #[test]
    fn grid_snap_delta_uses_geometric_box() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = d.apply(rect(&p, [13.0, 17.0, 113.0, 77.0])).expect("a").ids[0].clone();
        let b = d
            .apply(Command::AddShape {
                page: p.clone(),
                shape: ShapeKind::Rect,
                x0: 0.0,
                y0: 0.0,
                x1: 100.0,
                y1: 60.0,
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 10.0,
                },
                fill: None,
            })
            .expect("b")
            .ids[0]
            .clone();
        assert_eq!(
            d.snap_delta(&p, std::slice::from_ref(&a), 52.0, 31.0),
            (52.0, 31.0),
            "sans grille"
        );
        apply_grid(
            &mut d,
            &p,
            Some(grid_of(
                vec![grid_level("squares", 40.0, "#cccccc")],
                true,
                false,
            )),
        )
        .expect("grille");
        assert_eq!(
            d.snap_delta(&p, std::slice::from_ref(&a), 52.0, 31.0),
            (57.0, 33.0)
        );
        assert_eq!(
            d.snap_delta(&p, std::slice::from_ref(&b), 2.0, 3.0),
            (0.0, 0.0),
            "boîte (0, 0)-(100, 60), pas le contour épaissi (−5, −5)-(105, 65)"
        );
        assert_eq!(d.snap_delta(&p, &[], 52.0, 31.0), (52.0, 31.0));
        apply_grid(
            &mut d,
            &p,
            Some(grid_of(
                vec![grid_level("squares", 40.0, "#cccccc")],
                false,
                false,
            )),
        )
        .expect("coupé");
        assert_eq!(d.snap_delta(&p, &[a], 52.0, 31.0), (52.0, 31.0));
    }

    // ---- C3 : groupes (Z1) ----

    fn rect_at(d: &mut Document, p: &str, x: f64) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0: x,
            y0: 100.0,
            x1: x + 50.0,
            y1: 150.0,
            style: pen(),
            fill: None,
        })
        .expect("forme")
        .ids[0]
            .clone()
    }

    fn group_of(d: &Document, id: &str) -> Option<Vec<String>> {
        d.element(id).expect("vue").group
    }

    fn raw_group(d: &Document, id: &str) -> Option<Out> {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        f.element.get(&txn, "group")
    }

    fn write_raw_group(d: &Document, id: &str, v: Any) {
        let mut txn = d.transact_local();
        let f = d.find_element(&txn, id).expect("élément");
        f.element.insert(&mut txn, "group", v);
    }

    #[test]
    fn element_view_exposes_group() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        assert_eq!(group_of(&d, &a), None);
        write_raw_group(&d, &a, group_to_any(&["g1".into(), "g2".into()]));
        assert_eq!(
            group_of(&d, &a),
            Some(vec!["g1".to_string(), "g2".to_string()])
        );
    }

    #[test]
    fn unreadable_group_reads_as_none_and_is_kept() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        for v in [
            Any::from(3.0),
            Any::Array(Vec::<Any>::new().into()),
            Any::Array(vec![Any::from(1.0)].into()),
        ] {
            write_raw_group(&d, &a, v.clone());
            assert_eq!(group_of(&d, &a), None);
            assert_eq!(raw_group(&d, &a), Some(Out::Any(v)));
        }
    }

    #[test]
    fn group_writes_new_outer_id_on_each_element() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = d
            .apply(Command::Group {
                ids: vec![b.clone(), a.clone()],
            })
            .expect("group");
        let mut both = vec![a.clone(), b.clone()];
        both.sort();
        assert_eq!(c.ids, both);
        assert_eq!(c.pages, vec![p.clone()]);
        let ga = group_of(&d, &a).expect("groupe a");
        assert_eq!(ga.len(), 1);
        assert_eq!(group_of(&d, &b), Some(ga.clone()));
        assert_ne!(ga[0], a);
        assert_ne!(ga[0], b);
    }

    #[test]
    fn group_refuses_unknown_id_other_page_or_single_unit() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let q = d
            .apply(Command::AddPage {
                after: Some(p.clone()),
            })
            .expect("page")
            .pages[0]
            .clone();
        let c = rect_at(&mut d, &q, 0.0);
        let w = writes(&d);
        for ids in [
            vec![a.clone(), "absent".to_string()],
            vec![a.clone(), c.clone()],
            vec![a.clone()],
            vec![a.clone(), a.clone()],
            vec![],
        ] {
            assert_eq!(d.apply(Command::Group { ids }), Err(CommandError::BadGroup));
        }
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("group");
        // a et b forment désormais une seule unité : la regrouper seule est refusé.
        assert_eq!(
            d.apply(Command::Group {
                ids: vec![a.clone(), b.clone()]
            }),
            Err(CommandError::BadGroup)
        );
        assert_eq!(w.since(), 1);
        assert_eq!(
            CommandError::BadGroup.to_string(),
            "groupe invalide (au moins deux objets ou groupes d'une même page, ids connus attendus)"
        );
    }

    #[test]
    fn group_of_group_and_element_nests_paths() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("g1");
        let inner = group_of(&d, &a).expect("g1")[0].clone();
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone(), c.clone()],
        })
        .expect("g2");
        let ga = group_of(&d, &a).expect("a");
        assert_eq!(ga.len(), 2);
        assert_eq!(ga[1], inner);
        assert_eq!(group_of(&d, &b), Some(ga.clone()));
        assert_eq!(group_of(&d, &c), Some(vec![ga[0].clone()]));
    }

    #[test]
    fn group_is_one_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("group");
        assert!(d.undo());
        assert_eq!((group_of(&d, &a), group_of(&d, &b)), (None, None));
        assert_eq!(d.element_ids(&p), vec![a, b]);
    }

    #[test]
    fn ungroup_removes_outer_level_only() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("g1");
        let inner = group_of(&d, &a).expect("g1");
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone(), c.clone()],
        })
        .expect("g2");
        let ch = d
            .apply(Command::Ungroup {
                ids: vec![a.clone(), b.clone(), c.clone()],
            })
            .expect("ungroup");
        assert_eq!(ch.ids.len(), 3);
        assert_eq!(group_of(&d, &a), Some(inner.clone()));
        assert_eq!(group_of(&d, &b), Some(inner));
        assert_eq!(group_of(&d, &c), None);
        assert_eq!(raw_group(&d, &c), None, "chemin vide : champ retiré");
        assert!(d.undo());
        assert_eq!(group_of(&d, &c).map(|g| g.len()), Some(1));
    }

    #[test]
    fn ungroup_without_group_is_no_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let v = d.version();
        let w = writes(&d);
        let ch = d
            .apply(Command::Ungroup {
                ids: vec![a.clone(), "absent".into()],
            })
            .expect("ungroup");
        assert!(ch.ids.is_empty() && ch.pages.is_empty());
        assert_eq!(d.version(), v);
        assert_eq!(w.since(), 0);
    }

    #[test]
    fn partial_erase_keeps_group() {
        let mut d = Document::blank();
        let (p, [_, b, c]) = three(&mut d);
        d.apply(Command::Group {
            ids: vec![b.clone(), c.clone()],
        })
        .expect("group");
        let gb = group_of(&d, &b).expect("groupe");
        let ch = d.apply(cut_second(&p)).expect("erase");
        assert_eq!(ch.removed, vec![b]);
        assert!(!ch.ids.is_empty());
        for id in &ch.ids {
            assert_eq!(group_of(&d, id), Some(gb.clone()), "morceau {id}");
        }
    }

    /// Correction de cadrage : un groupe partiel est étendu au groupe extérieur entier de chaque id touché.
    #[test]
    fn group_partial_selection_extends_to_whole_outer_group() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("g1");
        let inner = group_of(&d, &a).expect("g1")[0].clone();
        // `a` seul (membre partiel de g1) avec `c` : b suit a.
        let ch = d
            .apply(Command::Group {
                ids: vec![a.clone(), c.clone()],
            })
            .expect("g2");
        let mut all = vec![a.clone(), b.clone(), c.clone()];
        all.sort();
        assert_eq!(ch.ids, all);
        let ga = group_of(&d, &a).expect("a");
        assert_eq!(ga.len(), 2);
        assert_eq!(ga[1], inner);
        assert_eq!(group_of(&d, &b), Some(ga.clone()));
        assert_eq!(group_of(&d, &c), Some(vec![ga[0].clone()]));
        // Un seul membre d'un groupe n'est pas deux unités.
        let mut d2 = Document::blank();
        let p2 = first(&d2);
        let x = rect_at(&mut d2, &p2, 0.0);
        let y = rect_at(&mut d2, &p2, 100.0);
        d2.apply(Command::Group {
            ids: vec![x.clone(), y.clone()],
        })
        .expect("g");
        assert_eq!(
            d2.apply(Command::Group { ids: vec![x] }),
            Err(CommandError::BadGroup)
        );
    }

    /// U3 : recharger un document dont des éléments portent `group` donne les mêmes octets et les mêmes vues.
    #[test]
    fn group_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect_at(&mut d, &p, 0.0);
        let b = rect_at(&mut d, &p, 100.0);
        let c = rect_at(&mut d, &p, 200.0);
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone()],
        })
        .expect("g1");
        d.apply(Command::Group {
            ids: vec![a.clone(), b.clone(), c.clone()],
        })
        .expect("g2");
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            for id in [&a, &b, &c] {
                assert_eq!(group_of(&r, id), group_of(&d, id), "groupe {id} au tour {i}");
            }
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }
}
