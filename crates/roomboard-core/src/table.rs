//! Tableau (U32, DAU10, C10a, DAC1 ; C10b, DAB1, DAB3) : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ;
//! `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` =
//! `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill?, shade?, span? }`, cellule absente = vide. Lecture tolérante (T2) :
//! entrée de `cols` / `rows` illisible (id vide ou contenant `:`) ou d'un id déjà vu sautée (gardée dans le document), `text` qui n'est pas un
//! `Y.Text` → vide, `fill` ou `shade` invalide → aucun, aucune ligne ou aucune colonne lisible → `None` : l'appelant se replie sur
//! `element::unknown_view` (jamais invisible). C10b : fusion = `span` `[id de la dernière ligne, id de la dernière colonne]`
//! (`Any::Array` de deux chaînes) sur l'ancre seule ; la couverture se déduit à la lecture par `merges_of` (F2), jamais
//! écrite (aucun `mergedInto`) ; `shade` = couleur d'un ombrage opaque (F8). Aucune `Any::Map`.
use std::collections::{HashMap, HashSet};

use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, GetString, In, Map, MapPrelim, MapRef, Out, ReadTxn,
    TextPrelim, TextRef, TransactionMut,
};

use crate::commands::{valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{
    finite_positive, fits_f32, out_f64, out_string, out_transform, transform_to_any, Transform,
};
use crate::rich_text::{self, valid_color, SpanInput, TextSpanView};
pub const TABLE_KIND: &str = "table";
pub const DEFAULT_TABLE_COLOR: &str = "#000000";
pub const DEFAULT_TABLE_SIZE: f64 = 36.0;
/// Plafond des lignes et des colonnes, à la création et à l'insertion (T4, HC10-9).
pub const MAX_TABLE_LINES: u32 = 64;

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableColView {
    pub id: String,
    pub width: f64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableRowView {
    pub id: String,
    pub height: f64,
}

/// Cellule non vide (texte, remplissage ou ombrage) ; `fill` = remplissage (U32), `shade` = ombrage révélable (F8).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableCellView {
    pub row: String,
    pub col: String,
    pub text: String,
    pub fill: Option<String>,
    pub shade: Option<String>,
    pub spans: Vec<TextSpanView>,
}

/// Zone fusionnée de la vue (F29) : ancre par ids, étendue en rangs, après la règle F2.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableMergeView {
    pub row: String,
    pub col: String,
    pub rows: u32,
    pub cols: u32,
}

/// Vue d'un tableau (T13, F29) : `color` = traits et texte, `size` = taille du texte ; cellules dans l'ordre de lecture ;
/// zones dans l'ordre de lecture de leurs ancres.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableView {
    pub color: String,
    pub size: f64,
    pub cols: Vec<TableColView>,
    pub rows: Vec<TableRowView>,
    pub cells: Vec<TableCellView>,
    pub merges: Vec<TableMergeView>,
}

/// Ligne ou colonne lisible : id, taille, son `Y.Map` et son rang brut dans le `Y.Array` (entrées illisibles
/// comprises) : les commandes (T2) écrivent dans `map` et insèrent ou retirent à `index`.
pub(crate) struct Line {
    pub id: String,
    pub size: f64,
    pub map: MapRef,
    pub index: u32,
}

/// Tableau lu, avec les références que les commandes écrivent.
pub(crate) struct RawTable {
    pub transform: Transform,
    pub color: String,
    pub size: f64,
    pub cols_arr: ArrayRef,
    pub rows_arr: ArrayRef,
    pub cells: Option<MapRef>,
    pub cols: Vec<Line>,
    pub rows: Vec<Line>,
}

/// Cellule lue ; `text` : son `Y.Text` s'il en est un (le `span` se lit par `read_cell_span`, F1).
pub(crate) struct RawCell {
    pub map: MapRef,
    pub text: Option<TextRef>,
    pub content: String,
    pub fill: Option<String>,
    pub shade: Option<String>,
}

pub(crate) fn cell_key(row: &str, col: &str) -> String {
    format!("{row}:{col}")
}

/// Entrées lisibles d'un `Y.Array` de lignes : `Y.Map` avec un `id` texte non vide, sans `:` (la clé de cellule
/// `"<row>:<col>"` reste sans ambiguïté), pas encore vu, et `key` fini > 0.
fn lines<T: ReadTxn>(txn: &T, arr: &ArrayRef, key: &str) -> Vec<Line> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for (i, o) in arr.iter(txn).enumerate() {
        let Out::YMap(map) = o else { continue };
        let Some(id) = out_string(map.get(txn, "id")).filter(|s| !s.is_empty() && !s.contains(':'))
        else {
            continue;
        };
        let Some(size) = out_f64(map.get(txn, key)).filter(|v| finite_positive(*v)) else {
            continue;
        };
        if !seen.insert(id.clone()) {
            continue;
        }
        out.push(Line {
            id,
            size,
            map,
            index: i as u32,
        });
    }
    out
}

/// Tableau bien formé (T2) : `kind` = `"table"`, `transform` lisible, au moins une ligne et une colonne lisibles ;
/// `color` invalide ou absente → `#000000`, `size` absente ou non finie > 0 → 36.
pub(crate) fn read_raw<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<RawTable> {
    if out_string(e.get(txn, "kind")).as_deref() != Some(TABLE_KIND) {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let Some(Out::YArray(cols_arr)) = e.get(txn, "cols") else {
        return None;
    };
    let Some(Out::YArray(rows_arr)) = e.get(txn, "rows") else {
        return None;
    };
    let cols = lines(txn, &cols_arr, "width");
    let rows = lines(txn, &rows_arr, "height");
    if cols.is_empty() || rows.is_empty() {
        return None;
    }
    let cells = match e.get(txn, "cells") {
        Some(Out::YMap(m)) => Some(m),
        _ => None,
    };
    Some(RawTable {
        transform,
        color: out_string(e.get(txn, "color"))
            .filter(|c| valid_color(c))
            .unwrap_or_else(|| DEFAULT_TABLE_COLOR.to_string()),
        size: out_f64(e.get(txn, "size"))
            .filter(|v| finite_positive(*v))
            .unwrap_or(DEFAULT_TABLE_SIZE),
        cols_arr,
        rows_arr,
        cells,
        cols,
        rows,
    })
}

/// `span` lisible (F1) : `Any::Array` de deux chaînes ; toute autre forme → aucun (ignoré, gardé).
fn read_span(o: Option<Out>) -> Option<(String, String)> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    match items.as_ref() {
        [Any::String(r), Any::String(c)] => Some((r.to_string(), c.to_string())),
        _ => None,
    }
}

/// `span` à écrire sur une ancre (F1).
pub(crate) fn span_any(last_row: &str, last_col: &str) -> Any {
    Any::Array(vec![Any::String(last_row.into()), Any::String(last_col.into())].into())
}

/// Cellule `"<row>:<col>"` ; `None` si `cells` manque ou si l'entrée n'est pas un `Y.Map`.
pub(crate) fn read_cell<T: ReadTxn>(
    txn: &T,
    cells: Option<&MapRef>,
    row: &str,
    col: &str,
) -> Option<RawCell> {
    let Some(Out::YMap(map)) = cells?.get(txn, &cell_key(row, col)) else {
        return None;
    };
    let text = match map.get(txn, "text") {
        Some(Out::YText(t)) => Some(t),
        _ => None,
    };
    let content = text.as_ref().map(|t| t.get_string(txn)).unwrap_or_default();
    let fill = out_string(map.get(txn, "fill")).filter(|c| valid_color(c));
    let shade = out_string(map.get(txn, "shade")).filter(|c| valid_color(c));
    Some(RawCell {
        map,
        text,
        content,
        fill,
        shade,
    })
}

/// Clé de cellule posée par `set_on_targets`.
#[derive(Clone, Copy)]
enum PaintKey {
    Fill,
    Shade,
}

impl PaintKey {
    fn name(self) -> &'static str {
        match self {
            PaintKey::Fill => "fill",
            PaintKey::Shade => "shade",
        }
    }
}

/// `span` seul d'une cellule : ni texte ni couleurs lus (parcours des fusions).
fn read_cell_span<T: ReadTxn>(
    txn: &T,
    cells: Option<&MapRef>,
    row: &str,
    col: &str,
) -> Option<(String, String)> {
    let Some(Out::YMap(map)) = cells?.get(txn, &cell_key(row, col)) else {
        return None;
    };
    read_span(map.get(txn, "span"))
}

/// Zone retenue par la règle F2, en rangs des lignes et colonnes lisibles, bornes comprises.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct Merge {
    pub r0: usize,
    pub c0: usize,
    pub r1: usize,
    pub c1: usize,
}

impl Merge {
    pub(crate) fn overlaps(&self, o: &Merge) -> bool {
        self.r0 <= o.r1 && o.r0 <= self.r1 && self.c0 <= o.c1 && o.c0 <= self.c1
    }

    pub(crate) fn contains(&self, r: usize, c: usize) -> bool {
        (self.r0..=self.r1).contains(&r) && (self.c0..=self.c1).contains(&c)
    }

    /// `self` entièrement dans `o`.
    pub(crate) fn inside(&self, o: &Merge) -> bool {
        o.r0 <= self.r0 && self.r1 <= o.r1 && o.c0 <= self.c0 && self.c1 <= o.c1
    }
}

/// Règle de lecture des fusions (F2, DAU10), seule source de la couverture : ancres dans l'ordre de lecture (rang de
/// ligne, puis de colonne) ; un `span` est retenu si ses deux ids désignent une ligne et une colonne lisibles de rang ≥
/// celui de l'ancre, si la zone compte au moins 2 cellules et si elle ne recoupe aucune zone déjà retenue. Sinon il est
/// ignoré (gardé dans le document) et la cellule se lit comme une cellule simple.
pub(crate) fn merges_of<T: ReadTxn>(raw: &RawTable, txn: &T) -> Vec<Merge> {
    let mut out: Vec<Merge> = Vec::new();
    for (r0, r) in raw.rows.iter().enumerate() {
        for (c0, c) in raw.cols.iter().enumerate() {
            let Some((last_row, last_col)) = read_cell_span(txn, raw.cells.as_ref(), &r.id, &c.id)
            else {
                continue;
            };
            let (Some(r1), Some(c1)) = (
                raw.rows.iter().position(|l| l.id == last_row),
                raw.cols.iter().position(|l| l.id == last_col),
            ) else {
                continue;
            };
            if r1 < r0 || c1 < c0 || (r1 == r0 && c1 == c0) {
                continue;
            }
            let m = Merge { r0, c0, r1, c1 };
            if out.iter().any(|o| o.overlaps(&m)) {
                continue;
            }
            out.push(m);
        }
    }
    out
}

impl RawTable {
    pub(crate) fn width(&self) -> f64 {
        self.cols.iter().map(|l| l.size).sum()
    }

    pub(crate) fn height(&self) -> f64 {
        self.rows.iter().map(|l| l.size).sum()
    }

    /// Vue (T13, F29) : cellules non vides (texte, remplissage ou ombrage) dans l'ordre de lecture, sur les seules
    /// lignes et colonnes lisibles ; zones par `merges_of`.
    pub(crate) fn view<T: ReadTxn>(&self, txn: &T) -> TableView {
        let mut cells = Vec::new();
        for r in &self.rows {
            for c in &self.cols {
                let Some(cell) = read_cell(txn, self.cells.as_ref(), &r.id, &c.id) else {
                    continue;
                };
                if cell.content.is_empty() && cell.fill.is_none() && cell.shade.is_none() {
                    continue;
                }
                cells.push(TableCellView {
                    row: r.id.clone(),
                    col: c.id.clone(),
                    text: cell.content,
                    fill: cell.fill,
                    shade: cell.shade,
                    spans: rich_text::cell_spans(txn, cell.text.as_ref()),
                });
            }
        }
        let merges = merges_of(self, txn)
            .into_iter()
            .map(|m| TableMergeView {
                row: self.rows[m.r0].id.clone(),
                col: self.cols[m.c0].id.clone(),
                rows: (m.r1 - m.r0 + 1) as u32,
                cols: (m.c1 - m.c0 + 1) as u32,
            })
            .collect();
        TableView {
            color: self.color.clone(),
            size: self.size,
            cols: self
                .cols
                .iter()
                .map(|l| TableColView {
                    id: l.id.clone(),
                    width: l.size,
                })
                .collect(),
            rows: self
                .rows
                .iter()
                .map(|l| TableRowView {
                    id: l.id.clone(),
                    height: l.size,
                })
                .collect(),
            cells,
            merges,
        }
    }
}

/// Tableau bien formé : transform et vue ; `None` sinon (l'appelant prend `element::unknown_view`, T2).
pub(crate) fn read<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, TableView)> {
    let raw = read_raw(txn, e)?;
    Some((raw.transform, raw.view(txn)))
}

/// Axe d'une insertion ou d'une suppression.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TableAxis {
    Row,
    Col,
}

/// Entrée d'`AddTable` (évite une fonction à neuf paramètres).
pub(crate) struct NewTable<'a> {
    pub page: &'a str,
    pub x: f64,
    pub y: f64,
    pub cols: u32,
    pub rows: u32,
    pub col_width: f64,
    pub row_height: f64,
    pub color: &'a str,
    pub size: f64,
}

/// Corps d'écriture commun d'`AddTable` et d'`ImportTable` (DAB3), entrées déjà contrôlées.
pub(crate) struct NewTableSpec<'a> {
    pub page: &'a str,
    pub matrix: Transform,
    pub col_widths: Vec<f64>,
    pub row_heights: Vec<f64>,
    /// `rows × cols` textes en rangées bout à bout ; vide : aucune cellule écrite.
    pub cells: &'a [String],
    /// `[rang de ligne, rang de colonne, lignes, colonnes]`, contrôlées (dans le tableau, sans recouvrement).
    pub merges: &'a [[u32; 4]],
    pub color: &'a str,
    pub size: f64,
}

/// Entrée d'`ImportTable` (F18) : collage HTML ou classeur, déjà mesuré et placé par la page.
pub(crate) struct ImportedTable<'a> {
    pub page: &'a str,
    pub matrix: Transform,
    pub col_width: f64,
    pub row_heights: &'a [f64],
    pub cols: u32,
    pub cells: &'a [String],
    pub merges: &'a [[u32; 4]],
    pub color: &'a str,
    pub size: f64,
}

/// Fusions d'un import (F18) : au moins 2 cellules, dans le tableau, sans recouvrement.
fn merges_ok(merges: &[[u32; 4]], rows: u32, cols: u32) -> bool {
    let mut seen: Vec<Merge> = Vec::new();
    for &[r, c, nr, nc] in merges {
        let (r, c, nr, nc) = (u64::from(r), u64::from(c), u64::from(nr), u64::from(nc));
        if nr == 0 || nc == 0 || nr * nc < 2 || r + nr > u64::from(rows) || c + nc > u64::from(cols)
        {
            return false;
        }
        let m = Merge {
            r0: r as usize,
            c0: c as usize,
            r1: (r + nr - 1) as usize,
            c1: (c + nc - 1) as usize,
        };
        if seen.iter().any(|o| o.overlaps(&m)) {
            return false;
        }
        seen.push(m);
    }
    true
}

fn lines_ok(n: u32) -> bool {
    (1..=MAX_TABLE_LINES).contains(&n)
}

fn size_key(axis: TableAxis) -> &'static str {
    match axis {
        TableAxis::Row => "height",
        TableAxis::Col => "width",
    }
}

fn line_prelim(id: &str, key: &'static str, size: f64) -> MapPrelim {
    MapPrelim::from([("id", In::from(id)), (key, In::Any(Any::from(size)))])
}

/// Clé `"<row>:<col>"` dans la ligne (ou colonne) `line` ; découpe au premier `:` (ids lisibles sans `:`, `lines`).
fn in_line(key: &str, axis: TableAxis, line: &str) -> bool {
    key.split_once(':').is_some_and(|(r, c)| match axis {
        TableAxis::Row => r == line,
        TableAxis::Col => c == line,
    })
}

/// `cells` du tableau : le `Y.Map` lu, sinon un neuf posé sur l'élément (PC12 de C10a). Une fois par transaction.
fn cells_map(txn: &mut TransactionMut, e: &MapRef, cells: Option<&MapRef>) -> MapRef {
    match cells {
        Some(m) => m.clone(),
        None => e.insert(txn, "cells", MapPrelim::default()),
    }
}

/// Cellule absente posée en `Y.Map{ text, …fields }`.
fn insert_cell(
    txn: &mut TransactionMut,
    cells: &MapRef,
    key: String,
    text: &str,
    fields: Vec<(&str, In)>,
) -> MapRef {
    let mut all: Vec<(&str, In)> = vec![("text", In::from(TextPrelim::new(text)))];
    all.extend(fields);
    cells.insert(txn, key, all.into_iter().collect::<MapPrelim>())
}

/// Ancres et cellules simples du rectangle, dans l'ordre de lecture, sans doublon (F9, F15, PC11) ; la couverture
/// vient des zones de `merges_of` (GC11).
fn targets(rect: &Merge, merges: &[Merge]) -> Vec<(usize, usize)> {
    let mut out = Vec::new();
    for r in rect.r0..=rect.r1 {
        for c in rect.c0..=rect.c1 {
            let a = merges
                .iter()
                .find(|m| m.contains(r, c))
                .map_or((r, c), |m| (m.r0, m.c0));
            if !out.contains(&a) {
                out.push(a);
            }
        }
    }
    out
}

/// Report d'une zone au retrait de lignes (F6), calculé avant la transaction.
enum SpanMove {
    Set {
        key: String,
        last_row: String,
        last_col: String,
    },
    Clear {
        key: String,
    },
}

/// F6 : pour chaque zone touchée par le retrait des rangs `a..=b` de l'axe : ancre retirée → `span` sur la première
/// ligne restante ; fin retirée → `span` ramené ; une seule cellule restante → `span` retiré ; tout retiré → rien.
fn span_moves(
    raw: &RawTable,
    merges: &[Merge],
    axis: TableAxis,
    a: usize,
    b: usize,
) -> Vec<SpanMove> {
    let gone = |i: usize| (a..=b).contains(&i);
    let mut out = Vec::new();
    for m in merges {
        let (s, t, across) = match axis {
            TableAxis::Row => (m.r0, m.r1, m.c1 - m.c0 + 1),
            TableAxis::Col => (m.c0, m.c1, m.r1 - m.r0 + 1),
        };
        if t < a || s > b {
            continue;
        }
        let left: Vec<usize> = (s..=t).filter(|i| !gone(*i)).collect();
        let (Some(&first), Some(&last)) = (left.first(), left.last()) else {
            continue;
        };
        let size = left.len() * across;
        let ((ar, ac), (lr, lc)) = match axis {
            TableAxis::Row => ((first, m.c0), (last, m.c1)),
            TableAxis::Col => ((m.r0, first), (m.r1, last)),
        };
        let set = |key: String| SpanMove::Set {
            key,
            last_row: raw.rows[lr].id.clone(),
            last_col: raw.cols[lc].id.clone(),
        };
        if gone(s) {
            if size >= 2 {
                out.push(set(raw.key(ar, ac)));
            }
        } else if size < 2 {
            out.push(SpanMove::Clear {
                key: raw.key(m.r0, m.c0),
            });
        } else if gone(t) {
            out.push(set(raw.key(m.r0, m.c0)));
        }
    }
    out
}

impl RawTable {
    fn axis(&self, axis: TableAxis) -> (&[Line], &ArrayRef) {
        match axis {
            TableAxis::Row => (&self.rows, &self.rows_arr),
            TableAxis::Col => (&self.cols, &self.cols_arr),
        }
    }

    /// Rangs de la ligne `row` et de la colonne `col`, si elles sont lisibles.
    fn ranks(&self, (row, col): (&str, &str)) -> Option<(usize, usize)> {
        Some((
            self.rows.iter().position(|l| l.id == row)?,
            self.cols.iter().position(|l| l.id == col)?,
        ))
    }

    /// Rectangle normalisé par les rangs de deux coins.
    fn rect(&self, from: (&str, &str), to: (&str, &str)) -> Option<Merge> {
        let (ra, ca) = self.ranks(from)?;
        let (rb, cb) = self.ranks(to)?;
        Some(Merge {
            r0: ra.min(rb),
            c0: ca.min(cb),
            r1: ra.max(rb),
            c1: ca.max(cb),
        })
    }

    fn key(&self, r: usize, c: usize) -> String {
        cell_key(&self.rows[r].id, &self.cols[c].id)
    }
}

impl Document {
    /// Tableau `id` : page, `Y.Map` de l'élément, lecture brute ; absent ou pas un tableau lisible : `UnknownElement`.
    fn table_of(&self, id: &str) -> Result<(String, MapRef, RawTable), CommandError> {
        let txn = self.read();
        let unknown = || CommandError::UnknownElement(id.to_string());
        let found = self.find_element(&txn, id).ok_or_else(unknown)?;
        let raw = read_raw(&txn, &found.element).ok_or_else(unknown)?;
        Ok((found.page_id, found.element, raw))
    }

    fn table_done(&mut self, page: String, id: &str) -> Change {
        self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        })
    }

    /// Écrit un tableau neuf en une transaction (DAB3) : ids neufs ; textes vides et cellules couvertes non écrits ;
    /// une fusion = `span` sur son ancre (F1). Page inconnue : `UnknownPage`.
    fn write_table(&mut self, t: &NewTableSpec<'_>) -> Result<Change, CommandError> {
        let elements = self.page_elements_or_err(t.page)?;
        let id = yrs::uuid_v4().to_string();
        let col_ids: Vec<String> = t
            .col_widths
            .iter()
            .map(|_| yrs::uuid_v4().to_string())
            .collect();
        let row_ids: Vec<String> = t
            .row_heights
            .iter()
            .map(|_| yrs::uuid_v4().to_string())
            .collect();
        let cols: Vec<In> = col_ids
            .iter()
            .zip(&t.col_widths)
            .map(|(i, w)| In::Map(line_prelim(i, "width", *w)))
            .collect();
        let rows: Vec<In> = row_ids
            .iter()
            .zip(&t.row_heights)
            .map(|(i, h)| In::Map(line_prelim(i, "height", *h)))
            .collect();
        let ncols = col_ids.len();
        let mut covered = vec![false; t.cells.len()];
        let mut anchors: HashMap<usize, (usize, usize)> = HashMap::new();
        for m in t.merges {
            let [r, c, nr, nc] = m.map(|v| v as usize);
            anchors.insert(r * ncols + c, (r + nr - 1, c + nc - 1));
            for rr in r..r + nr {
                for cc in c..c + nc {
                    if (rr, cc) != (r, c) {
                        covered[rr * ncols + cc] = true;
                    }
                }
            }
        }
        let mut cells: Vec<(String, In)> = Vec::new();
        for (i, text) in t.cells.iter().enumerate() {
            let span = anchors.get(&i);
            if covered[i] || (text.is_empty() && span.is_none()) {
                continue;
            }
            let mut fields: Vec<(&str, In)> =
                vec![("text", In::from(TextPrelim::new(text.as_str())))];
            if let Some(&(lr, lc)) = span {
                fields.push(("span", In::Any(span_any(&row_ids[lr], &col_ids[lc]))));
            }
            cells.push((
                cell_key(&row_ids[i / ncols], &col_ids[i % ncols]),
                In::Map(fields.into_iter().collect::<MapPrelim>()),
            ));
        }
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(TABLE_KIND)),
            ("transform", In::Any(transform_to_any(&t.matrix))),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(t.size))),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(cells.into_iter().collect::<MapPrelim>())),
        ];
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.table_done(t.page.to_string(), &id))
    }

    /// `AddTable` (T3) : refus `BadTable` avant la page, x, y et la boîte bornés en f32 comme une forme ; une
    /// transaction, cellules vides (`cells` = `Y.Map` vide).
    pub(crate) fn cmd_add_table(&mut self, t: &NewTable<'_>) -> Result<Change, CommandError> {
        let valid = lines_ok(t.cols)
            && lines_ok(t.rows)
            && finite_positive(t.col_width)
            && finite_positive(t.row_height)
            && finite_positive(t.size)
            && fits_f32(&[
                t.x,
                t.y,
                f64::from(t.cols) * t.col_width,
                f64::from(t.rows) * t.row_height,
            ])
            && valid_color(t.color);
        if !valid {
            return Err(CommandError::BadTable);
        }
        self.write_table(&NewTableSpec {
            page: t.page,
            matrix: [1.0, 0.0, 0.0, 1.0, t.x, t.y],
            col_widths: vec![t.col_width; t.cols as usize],
            row_heights: vec![t.row_height; t.rows as usize],
            cells: &[],
            merges: &[],
            color: t.color,
            size: t.size,
        })
    }

    /// `ImportTable` (F18) : refus `BadTable` avant la page (dimensions 1..=64, `cells` = `rows × cols`, tailles finies
    /// > 0, couleur, matrice finie inversible et bornée en f32 avec la boîte, fusions valides) ; une transaction.
    pub(crate) fn cmd_import_table(
        &mut self,
        t: &ImportedTable<'_>,
    ) -> Result<Change, CommandError> {
        let rows = u32::try_from(t.row_heights.len()).unwrap_or(u32::MAX);
        let valid = lines_ok(t.cols)
            && lines_ok(rows)
            && t.cells.len() as u64 == u64::from(t.cols) * u64::from(rows)
            && finite_positive(t.col_width)
            && t.row_heights.iter().all(|h| finite_positive(*h))
            && finite_positive(t.size)
            && valid_color(t.color)
            && valid_matrix(&t.matrix)
            && fits_f32(&t.matrix)
            && fits_f32(&[f64::from(t.cols) * t.col_width, t.row_heights.iter().sum()])
            && merges_ok(t.merges, rows, t.cols);
        if !valid {
            return Err(CommandError::BadTable);
        }
        self.write_table(&NewTableSpec {
            page: t.page,
            matrix: t.matrix,
            col_widths: vec![t.col_width; t.cols as usize],
            row_heights: t.row_heights.to_vec(),
            cells: t.cells,
            merges: t.merges,
            color: t.color,
            size: t.size,
        })
    }

    /// `SetTableCell` (T3, T5, C7b R7) : segments contrôlés d'abord ; texte par différence (`apply_text_diff`), puis
    /// attributs alignés dans la même transaction (`apply_spans`) ; hauteur écrite seulement si plus grande, la hauteur
    /// du tableau restant bornée en f32 ; même texte, mêmes segments, sans hauteur plus grande : aucune transaction.
    pub(crate) fn cmd_set_table_cell(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        content: &str,
        row_height: Option<f64>,
        spans: Option<&[SpanInput]>,
    ) -> Result<Change, CommandError> {
        // C7b (R7, PC2) : segments contrôlés en premier, sans écriture ; même ordre que `fake-core.ts`.
        if spans.is_some_and(|s| !rich_text::valid_spans(content, s)) {
            return Err(CommandError::BadFormat);
        }
        if row_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let (r, c) = raw.ranks((row, col)).ok_or(CommandError::BadTable)?;
        let (cell, merges, spans_same) = {
            let txn = self.read();
            let cell = read_cell(&txn, raw.cells.as_ref(), row, col);
            let same = rich_text::spans_unchanged(
                &txn,
                cell.as_ref().and_then(|x| x.text.as_ref()),
                spans,
            );
            (cell, merges_of(&raw, &txn), same)
        };
        // F7 : sur une ancre de plusieurs lignes, la hauteur exigée vaut pour la zone ; sa dernière ligne grandit.
        let (z0, z1) = merges
            .iter()
            .find(|m| m.r0 == r && m.c0 == c)
            .map_or((r, r), |m| (m.r0, m.r1));
        let zone: f64 = raw.rows[z0..=z1].iter().map(|l| l.size).sum();
        let last = &raw.rows[z1];
        let grow =
            row_height
                .filter(|h| *h > zone)
                .map(|h| if z0 == z1 { h } else { last.size + (h - zone) });
        if grow.is_some_and(|g| !fits_f32(&[raw.height() - last.size + g])) {
            return Err(CommandError::BadTable);
        }
        let current = cell.as_ref().map_or("", |x| x.content.as_str());
        if current == content && grow.is_none() && spans_same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let text = if current != content {
                match &cell {
                    Some(RawCell { text: Some(t), .. }) => {
                        rich_text::apply_text_diff(&mut txn, t, content);
                        Some(t.clone())
                    }
                    Some(x) => Some(x.map.insert(&mut txn, "text", TextPrelim::new(content))),
                    None => {
                        let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
                        let m = insert_cell(&mut txn, &cells, cell_key(row, col), content, vec![]);
                        match m.get(&txn, "text") {
                            Some(Out::YText(t)) => Some(t),
                            _ => None,
                        }
                    }
                }
            } else {
                cell.as_ref().and_then(|x| x.text.clone())
            };
            // C7b (R7) : alignement dans la même transaction, sur le `TextRef` relu après une création.
            if let (Some(s), Some(t)) = (spans, &text) {
                rich_text::apply_spans(&mut txn, t, s);
            }
            if let Some(h) = grow {
                last.map.insert(&mut txn, "height", In::Any(Any::from(h)));
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `InsertTableLine` (T3, T15) : `at` ∈ 0..=n, plafond 64 ; inséré au rang brut de la `at`-ième ligne lisible ;
    /// le total de l'axe, taille voisine copiée comprise, reste borné en f32 (même garde que `SetTableCell`).
    pub(crate) fn cmd_insert_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        at: u32,
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let n = lines.len() as u32;
        if at > n || n >= MAX_TABLE_LINES {
            return Err(CommandError::BadTable);
        }
        let size = lines[at.saturating_sub(1) as usize].size;
        let total: f64 = lines.iter().map(|l| l.size).sum();
        if !fits_f32(&[total + size]) {
            return Err(CommandError::BadTable);
        }
        let index = if at == n {
            let txn = self.read();
            arr.len(&txn)
        } else {
            lines[at as usize].index
        };
        let line_id = yrs::uuid_v4().to_string();
        {
            let mut txn = self.transact_local();
            arr.insert(&mut txn, index, line_prelim(&line_id, size_key(axis), size));
        }
        Ok(self.table_done(page, id))
    }

    /// `RemoveTableLine` (T3, F6) : les lignes `line..=to` et leurs cellules dans la même transaction que le report des
    /// zones touchées ; refus s'il ne resterait aucune ligne, ou si `line` / `to` est inconnue.
    pub(crate) fn cmd_remove_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        line: &str,
        to: Option<&str>,
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let rank = |l: &str| lines.iter().position(|x| x.id == l);
        let ia = rank(line).ok_or(CommandError::BadTable)?;
        let ib = match to {
            Some(t) => rank(t).ok_or(CommandError::BadTable)?,
            None => ia,
        };
        let (a, b) = (ia.min(ib), ia.max(ib));
        if b - a + 1 >= lines.len() {
            return Err(CommandError::BadTable);
        }
        let removed: Vec<&str> = lines[a..=b].iter().map(|l| l.id.as_str()).collect();
        // Clés et zones lues avant la transaction ; le report (F6) s'écrit dans la même que le retrait.
        let (keys, merges) = {
            let txn = self.read();
            let keys: Vec<String> = match &raw.cells {
                Some(cells) => cells
                    .keys(&txn)
                    .filter(|k| removed.iter().any(|l| in_line(k, axis, l)))
                    .map(str::to_string)
                    .collect(),
                None => Vec::new(),
            };
            (keys, merges_of(&raw, &txn))
        };
        let moves = span_moves(&raw, &merges, axis, a, b);
        {
            let mut txn = self.transact_local();
            for l in lines[a..=b].iter().rev() {
                arr.remove(&mut txn, l.index);
            }
            if let Some(cells) = &raw.cells {
                for k in &keys {
                    cells.remove(&mut txn, k);
                }
            }
            if !moves.is_empty() {
                let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
                for mv in moves {
                    match mv {
                        SpanMove::Clear { key } => {
                            if let Some(Out::YMap(cell)) = cells.get(&txn, &key) {
                                cell.remove(&mut txn, "span");
                            }
                        }
                        SpanMove::Set {
                            key,
                            last_row,
                            last_col,
                        } => {
                            let span = In::Any(span_any(&last_row, &last_col));
                            match cells.get(&txn, &key) {
                                Some(Out::YMap(cell)) => {
                                    cell.insert(&mut txn, "span", span);
                                }
                                _ => {
                                    insert_cell(&mut txn, &cells, key, "", vec![("span", span)]);
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetTableSizes` (T11) : largeur et hauteur totales bornées en f32 ; écrit seulement les tailles qui changent ;
    /// déjà uniforme : aucune transaction.
    pub(crate) fn cmd_set_table_sizes(
        &mut self,
        id: &str,
        col_width: f64,
        row_height: f64,
    ) -> Result<Change, CommandError> {
        if !finite_positive(col_width) || !finite_positive(row_height) {
            return Err(CommandError::BadTable);
        }
        let (page, _, raw) = self.table_of(id)?;
        if !fits_f32(&[
            raw.cols.len() as f64 * col_width,
            raw.rows.len() as f64 * row_height,
        ]) {
            return Err(CommandError::BadTable);
        }
        let cols: Vec<&Line> = raw.cols.iter().filter(|l| l.size != col_width).collect();
        let rows: Vec<&Line> = raw.rows.iter().filter(|l| l.size != row_height).collect();
        if cols.is_empty() && rows.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for l in cols {
                l.map
                    .insert(&mut txn, "width", In::Any(Any::from(col_width)));
            }
            for l in rows {
                l.map
                    .insert(&mut txn, "height", In::Any(Any::from(row_height)));
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `key` (`fill` ou `shade`) posé ou retiré sur les ancres et cellules simples du rectangle (F9, F15) ; rien à
    /// changer : aucune transaction (D38).
    fn set_on_targets(
        &mut self,
        (page, id, e): (String, &str, &MapRef),
        raw: &RawTable,
        rect: &Merge,
        key: PaintKey,
        value: Option<&str>,
    ) -> Result<Change, CommandError> {
        let todo: Vec<((usize, usize), Option<RawCell>)> = {
            let txn = self.read();
            let merges = merges_of(raw, &txn);
            targets(rect, &merges)
                .into_iter()
                .filter_map(|(r, c)| {
                    let cell =
                        read_cell(&txn, raw.cells.as_ref(), &raw.rows[r].id, &raw.cols[c].id);
                    let current = cell.as_ref().and_then(|x| match key {
                        PaintKey::Fill => x.fill.clone(),
                        PaintKey::Shade => x.shade.clone(),
                    });
                    (current.as_deref() != value).then_some(((r, c), cell))
                })
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, e, raw.cells.as_ref());
            for ((r, c), cell) in todo {
                match (value, cell) {
                    (Some(v), Some(x)) => {
                        x.map.insert(&mut txn, key.name(), In::from(v));
                    }
                    (Some(v), None) => {
                        insert_cell(
                            &mut txn,
                            &cells,
                            raw.key(r, c),
                            "",
                            vec![(key.name(), In::from(v))],
                        );
                    }
                    (None, Some(x)) => {
                        x.map.remove(&mut txn, key.name());
                    }
                    (None, None) => {}
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetTableFill` (T12, F15) : la cellule, ou la plage jusqu'à `to` ; une couverte vaut pour son ancre.
    pub(crate) fn cmd_set_table_fill(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: Option<(&str, &str)>,
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if fill.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw
            .rect(from, to.unwrap_or(from))
            .ok_or(CommandError::BadTable)?;
        self.set_on_targets((page, id, &e), &raw, &rect, PaintKey::Fill, fill)
    }

    /// `SetTableShade` (F9) : ombrer, retirer l'ombrage, révéler (F10, F12 : une étape par appel).
    pub(crate) fn cmd_set_table_shade(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        shade: Option<&str>,
    ) -> Result<Change, CommandError> {
        if shade.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        self.set_on_targets((page, id, &e), &raw, &rect, PaintKey::Shade, shade)
    }

    /// `MergeTableCells` (F3) : zones dedans dissoutes, couvertes retirées de `cells` (texte, `fill`, `shade`),
    /// `span` posé sur l'ancre ; zone identique sans couverte à vider : aucune étape (PC10).
    pub(crate) fn cmd_merge_table_cells(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        if (rect.r1 - rect.r0 + 1) * (rect.c1 - rect.c0 + 1) < 2 {
            return Err(CommandError::BadTable);
        }
        let (merges, covered) = {
            let txn = self.read();
            let merges = merges_of(&raw, &txn);
            let mut covered = Vec::new();
            if let Some(cells) = &raw.cells {
                for r in rect.r0..=rect.r1 {
                    for c in rect.c0..=rect.c1 {
                        let k = raw.key(r, c);
                        if (r, c) != (rect.r0, rect.c0) && cells.get(&txn, &k).is_some() {
                            covered.push(k);
                        }
                    }
                }
            }
            (merges, covered)
        };
        if merges.iter().any(|m| m.overlaps(&rect) && !m.inside(&rect)) {
            return Err(CommandError::BadTable);
        }
        let inner: Vec<Merge> = merges.into_iter().filter(|m| m.inside(&rect)).collect();
        if inner.as_slice() == [rect] && covered.is_empty() {
            return Ok(self.unchanged());
        }
        let anchor = raw.key(rect.r0, rect.c0);
        let span = span_any(&raw.rows[rect.r1].id, &raw.cols[rect.c1].id);
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
            for k in &covered {
                cells.remove(&mut txn, k);
            }
            match cells.get(&txn, &anchor) {
                Some(Out::YMap(a)) => {
                    a.insert(&mut txn, "span", In::Any(span));
                }
                _ => {
                    insert_cell(&mut txn, &cells, anchor, "", vec![("span", In::Any(span))]);
                }
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SplitTableCell` (F4) : « diviser = défusionner » ; le contenu reste dans la cellule en haut à gauche.
    pub(crate) fn cmd_split_table_cell(
        &mut self,
        id: &str,
        cell: (&str, &str),
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (r, c) = raw.ranks(cell).ok_or(CommandError::BadTable)?;
        let anchor = {
            let txn = self.read();
            if !merges_of(&raw, &txn).iter().any(|m| m.r0 == r && m.c0 == c) {
                return Err(CommandError::BadTable);
            }
            read_cell(&txn, raw.cells.as_ref(), cell.0, cell.1).ok_or(CommandError::BadTable)?
        };
        {
            let mut txn = self.transact_local();
            anchor.map.remove(&mut txn, "span");
        }
        Ok(self.table_done(page, id))
    }
}

#[cfg(test)]
pub(crate) mod tests {
    use crate::element::Look;
    use yrs::{Any, ArrayPrelim, Doc, In, MapPrelim, StateVector, TextPrelim, Transact};

    use super::*;
    use crate::document::Document;
    use crate::element::IDENTITY;
    use crate::query::Bounds;

    /// Document d'une page `p1` dont l'unique élément est `element` (état yrs brut, patron `hologram_ybin`).
    pub(crate) fn doc_with(element: MapPrelim) -> Document {
        let doc = Doc::with_client_id(7);
        let meta = doc.get_or_insert_map("meta");
        let pages = doc.get_or_insert_array("pages");
        {
            let mut txn = doc.transact_mut();
            meta.insert(&mut txn, "schema", 1.0);
            let page = MapPrelim::from([
                ("id", In::from("p1")),
                ("width", In::from(1920.0)),
                ("height", In::from(1080.0)),
                ("background", In::from("#ffffff")),
                (
                    "elements",
                    In::Array(ArrayPrelim::from(vec![In::Map(element)])),
                ),
            ]);
            pages.push_back(&mut txn, page);
        }
        let bytes = doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        Document::from_update_v1(&bytes).expect("état")
    }

    pub(crate) fn line(id: &str, key: &str, v: f64) -> In {
        In::Map(MapPrelim::from([("id", In::from(id)), (key, In::from(v))]))
    }

    fn translate(x: f64, y: f64) -> In {
        let t: Vec<Any> = [1.0, 0.0, 0.0, 1.0, x, y]
            .into_iter()
            .map(Any::from)
            .collect();
        In::Any(Any::Array(t.into()))
    }

    /// Tableau `t1` en (100, 50), sans `color` ni `size` (défauts lus) ; `extra` ajoute ou remplace des champs.
    fn table_prelim(
        cols: Vec<In>,
        rows: Vec<In>,
        cells: MapPrelim,
        extra: Vec<(&'static str, In)>,
    ) -> MapPrelim {
        let mut fields: Vec<(&str, In)> = vec![
            ("id", In::from("t1")),
            ("kind", In::from("table")),
            ("transform", translate(100.0, 50.0)),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(cells)),
        ];
        fields.extend(extra);
        fields.into_iter().collect()
    }

    /// Colonnes `c1` (240), `c2` (100) ; lignes `r1` (64), `r2` (64).
    fn two_by_two(cells: MapPrelim, extra: Vec<(&'static str, In)>) -> MapPrelim {
        table_prelim(
            vec![line("c1", "width", 240.0), line("c2", "width", 100.0)],
            vec![line("r1", "height", 64.0), line("r2", "height", 64.0)],
            cells,
            extra,
        )
    }

    fn cell(text: In, more: Vec<(&'static str, In)>) -> In {
        let mut f: Vec<(&str, In)> = vec![("text", text)];
        f.extend(more);
        In::Map(f.into_iter().collect())
    }

    #[test]
    fn table_view_reads_lines_cells_and_defaults() {
        let cells = MapPrelim::from([
            ("r1:c1", cell(In::from(TextPrelim::new("Lundi")), vec![])),
            (
                "r2:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("fill", In::from("#fef08a"))],
                ),
            ),
            ("r2:c1", cell(In::from(TextPrelim::new("")), vec![])),
        ]);
        let d = doc_with(two_by_two(cells, vec![]));
        let before = d.encode_v1();
        let v = d.element("t1").expect("vue");
        assert_eq!(v.kind, "table");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert_eq!(v.style, None);
        let t = v.table.expect("tableau");
        assert_eq!((t.color.as_str(), t.size), ("#000000", 36.0));
        assert_eq!(
            t.cols,
            vec![
                TableColView {
                    id: "c1".into(),
                    width: 240.0
                },
                TableColView {
                    id: "c2".into(),
                    width: 100.0
                },
            ]
        );
        assert_eq!(
            t.rows.iter().map(|r| r.id.as_str()).collect::<Vec<_>>(),
            vec!["r1", "r2"]
        );
        assert_eq!(
            t.cells,
            vec![
                TableCellView {
                    row: "r1".into(),
                    col: "c1".into(),
                    text: "Lundi".into(),
                    fill: None,
                    shade: None,
                    spans: plain_spans("Lundi")
                },
                TableCellView {
                    row: "r2".into(),
                    col: "c2".into(),
                    text: String::new(),
                    fill: Some("#fef08a".into()),
                    shade: None,
                    spans: plain_spans("")
                },
            ]
        );
        assert!(
            d.encode_v1() == before,
            "la lecture a écrit dans le document"
        );
        assert!(!d.can_undo());
    }

    #[test]
    fn unreadable_lines_are_skipped_and_kept() {
        let cols = vec![
            In::from(5.0),
            In::Map(MapPrelim::from([("width", In::from(240.0))])),
            line("c-neg", "width", -1.0),
            line("", "width", 240.0),
            line("c-ok", "width", 240.0),
            line("c-ok", "width", 120.0),
        ];
        let d = doc_with(table_prelim(
            cols,
            vec![line("r1", "height", 64.0)],
            MapPrelim::default(),
            vec![],
        ));
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.cols,
            vec![TableColView {
                id: "c-ok".into(),
                width: 240.0
            }]
        );
        let txn = d.read();
        let e = d.find_element(&txn, "t1").expect("élément").element;
        let Some(Out::YArray(raw)) = e.get(&txn, "cols") else {
            panic!("cols")
        };
        assert_eq!(
            raw.len(&txn),
            6,
            "entrées illisibles gardées dans le document"
        );
    }

    /// Patron écarté (`read_image`, `None` pour un `kind` connu mal formé) : le tableau disparaîtrait de la page ;
    /// le repli sur la vue « inconnu » le garde visible, sélectionnable et borné.
    #[test]
    fn table_without_readable_line_falls_back_to_unknown() {
        let d = doc_with(table_prelim(
            vec![line("c1", "width", 240.0)],
            vec![In::from("pas une ligne")],
            MapPrelim::default(),
            vec![],
        ));
        let v = d.element("t1").expect("jamais invisible");
        assert_eq!(v.kind, "unknown");
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        let u = v.unknown.expect("inconnu");
        assert_eq!((u.source_kind.as_str(), u.w, u.h), ("table", 100.0, 100.0));
        assert_eq!(
            d.bounds(&["t1".to_string()]),
            Some(Bounds {
                x0: 100.0,
                y0: 50.0,
                x1: 200.0,
                y1: 150.0
            })
        );
        assert_eq!(d.hit_test("p1", 150.0, 100.0, 0.0), Some("t1".to_string()));
    }

    #[test]
    fn table_without_transform_is_an_identity_box() {
        let mut p = two_by_two(MapPrelim::default(), vec![]);
        p.remove("transform");
        let d = doc_with(p);
        let v = d.element("t1").expect("jamais invisible");
        assert_eq!((v.kind.as_str(), v.transform), ("unknown", IDENTITY));
        assert_eq!(v.unknown.map(|u| (u.w, u.h)), Some((100.0, 100.0)));
    }

    #[test]
    fn table_geometry_is_its_box() {
        let d = doc_with(two_by_two(MapPrelim::default(), vec![]));
        let id = vec!["t1".to_string()];
        assert_eq!(
            d.bounds(&id),
            Some(Bounds {
                x0: 100.0,
                y0: 50.0,
                x1: 440.0,
                y1: 178.0
            })
        );
        assert_eq!(d.hit_test("p1", 400.0, 170.0, 0.0), Some("t1".to_string()));
        assert_eq!(d.hit_test("p1", 450.0, 170.0, 0.0), None);
        assert_eq!(d.snap_box(&id), d.bounds(&id));
    }

    /// Formes invalides (`span` nombre, `shade` booléen, `mergedInto`) : ignorées et gardées ; la lecture n'écrit rien (F30).
    #[test]
    fn c10b_keys_are_ignored_and_kept() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from(TextPrelim::new("A")),
                    vec![("span", In::from(2.0)), ("shade", In::Any(Any::Bool(true)))],
                ),
            ),
            (
                "r1:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("mergedInto", In::from("r1:c1"))],
                ),
            ),
        ]);
        let d = doc_with(two_by_two(cells, vec![("shade", In::Any(Any::Bool(true)))]));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            (
                t.cells.len(),
                t.cells[0].text.as_str(),
                t.cells[0].shade.as_deref()
            ),
            (1, "A", None)
        );
        assert!(t.merges.is_empty());
        assert!(
            d.encode_v1() == before,
            "la lecture a écrit dans le document"
        );
    }

    /// F1, F2, F8 : `span` lisible sur l'ancre → zone (ancre par ids, étendue en rangs) ; `shade` lu, cellule listée.
    #[test]
    fn spans_become_merges_and_shades_are_read() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from(TextPrelim::new("Lundi")),
                    vec![
                        ("span", In::Any(span_any("r1", "c2"))),
                        ("shade", In::from("#94a3b8")),
                    ],
                ),
            ),
            (
                "r2:c2",
                cell(
                    In::from(TextPrelim::new("")),
                    vec![("shade", In::from("#94a3b8"))],
                ),
            ),
        ]);
        let d = doc_with(two_by_two(cells, vec![]));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: "r1".into(),
                col: "c1".into(),
                rows: 1,
                cols: 2
            }]
        );
        assert_eq!(
            t.cells
                .iter()
                .map(|c| (
                    c.row.as_str(),
                    c.col.as_str(),
                    c.text.as_str(),
                    c.shade.as_deref()
                ))
                .collect::<Vec<_>>(),
            vec![
                ("r1", "c1", "Lundi", Some("#94a3b8")),
                ("r2", "c2", "", Some("#94a3b8"))
            ]
        );
        assert!(
            d.encode_v1() == before,
            "la lecture a écrit dans le document"
        );
    }

    /// Colonnes `c1`..`c3` (100), lignes `r1`..`r3` (64).
    fn three_by_three(cells: MapPrelim) -> MapPrelim {
        table_prelim(
            vec![
                line("c1", "width", 100.0),
                line("c2", "width", 100.0),
                line("c3", "width", 100.0),
            ],
            vec![
                line("r1", "height", 64.0),
                line("r2", "height", 64.0),
                line("r3", "height", 64.0),
            ],
            cells,
            vec![],
        )
    }

    /// F2, S5 : `span` qui recoupe une zone déjà retenue, dont un id manque, qui remonte, d'une seule cellule ou mal
    /// formé : ignoré, gardé dans le document ; une seule zone retenue.
    #[test]
    fn bad_or_overlapping_spans_are_ignored_and_kept() {
        let s = |r: &str, c: &str| vec![("span", In::Any(span_any(r, c)))];
        let empty = || In::from(TextPrelim::new(""));
        let cells = MapPrelim::from([
            ("r1:c1", cell(In::from(TextPrelim::new("A")), s("r2", "c2"))),
            ("r1:c2", cell(empty(), s("r3", "c3"))),
            ("r2:c3", cell(empty(), s("r9", "c3"))),
            ("r3:c2", cell(empty(), s("r2", "c1"))),
            ("r3:c3", cell(empty(), s("r3", "c3"))),
            ("r3:c1", cell(empty(), vec![("span", In::from(2.0))])),
        ]);
        let d = doc_with(three_by_three(cells));
        let before = d.encode_v1();
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: "r1".into(),
                col: "c1".into(),
                rows: 2,
                cols: 2
            }]
        );
        assert!(d.encode_v1() == before, "rien d'écrit à la lecture");
    }

    fn import(
        d: &mut Document,
        merges: Vec<[u32; 4]>,
        cells: Vec<String>,
        heights: Vec<f64>,
        cols: u32,
    ) -> Result<Change, CommandError> {
        let p = d.page_ids()[0].clone();
        d.apply(Command::ImportTable {
            page: p,
            matrix: [0.5, 0.0, 0.0, 0.5, 300.0, 100.0],
            col_width: 240.0,
            row_heights: heights,
            cols,
            cells,
            merges,
            color: "#1d4ed8".into(),
            size: 36.0,
        })
    }

    /// F18 : une transaction ; ids neufs ; textes vides et couverts non écrits ; fusion en `span` sur l'ancre ; matrice
    /// reçue telle quelle ; annuler retire le tableau entier (F17).
    #[test]
    fn import_table_writes_texts_spans_and_matrix_in_one_step() {
        let mut d = Document::blank();
        let texts: Vec<String> = ["Titre", "caché", "a", "b"].map(String::from).to_vec();
        let c = import(&mut d, vec![[0, 0, 1, 2]], texts, vec![64.0, 80.0], 2).expect("import");
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!(v.transform, [0.5, 0.0, 0.0, 0.5, 300.0, 100.0]);
        let t = v.table.expect("tableau");
        assert_eq!(
            (
                t.color.as_str(),
                t.cols.len(),
                t.rows.iter().map(|r| r.height).collect::<Vec<_>>()
            ),
            ("#1d4ed8", 2, vec![64.0, 80.0])
        );
        assert!(t.cols.iter().all(|c| c.width == 240.0));
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: t.rows[0].id.clone(),
                col: t.cols[0].id.clone(),
                rows: 1,
                cols: 2
            }]
        );
        assert_eq!(
            t.cells.iter().map(|c| c.text.as_str()).collect::<Vec<_>>(),
            vec!["Titre", "a", "b"],
            "texte couvert ignoré"
        );
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
                panic!("cells")
            };
            assert_eq!(cells.len(&txn), 3, "textes vides et couverts non écrits");
            for k in cells.keys(&txn) {
                let Some(Out::YMap(m)) = cells.get(&txn, k) else {
                    panic!("cellule")
                };
                assert!(m.get(&txn, "mergedInto").is_none());
            }
        }
        assert!(d.undo());
        assert!(d.element(&id).is_none(), "une seule étape");
    }

    /// F18 : dimensions hors 1..=64, longueurs incohérentes, tailles non finies, couleur, matrice (PC1), fusion d'une
    /// cellule, hors du tableau ou qui en recoupe une autre : `BadTable` avant la page, aucune transaction.
    #[test]
    fn import_table_refuses_bad_input_without_writing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id6 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        let imp = |cols: u32,
                   heights: Vec<f64>,
                   n: usize,
                   merges: Vec<[u32; 4]>,
                   col_width: f64,
                   matrix: [f64; 6],
                   color: &str| Command::ImportTable {
            page: p.clone(),
            matrix,
            col_width,
            row_heights: heights,
            cols,
            cells: vec![String::new(); n],
            merges,
            color: color.into(),
            size: 36.0,
        };
        let w = writes(&d);
        for c in [
            imp(0, vec![64.0], 0, vec![], 240.0, id6, "#000000"),
            imp(65, vec![64.0], 65, vec![], 240.0, id6, "#000000"),
            imp(2, vec![], 0, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0; 65], 130, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 3, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, f64::NAN], 4, vec![], 240.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![], 0.0, id6, "#000000"),
            imp(2, vec![64.0, 64.0], 4, vec![], 240.0, id6, "!!"),
            imp(2, vec![64.0, 64.0], 4, vec![], 240.0, [0.0; 6], "#000000"),
            imp(
                2,
                vec![64.0, 64.0],
                4,
                vec![[0, 0, 1, 1]],
                240.0,
                id6,
                "#000000",
            ),
            imp(
                2,
                vec![64.0, 64.0],
                4,
                vec![[1, 1, 2, 1]],
                240.0,
                id6,
                "#000000",
            ),
            imp(
                2,
                vec![64.0, 64.0],
                4,
                vec![[0, 0, 2, 1], [1, 0, 1, 2]],
                240.0,
                id6,
                "#000000",
            ),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(!d.can_undo());
        let mut unknown = imp(2, vec![64.0, 64.0], 4, vec![], 240.0, id6, "#000000");
        if let Command::ImportTable { page, .. } = &mut unknown {
            *page = "zz".into();
        }
        assert_eq!(
            d.apply(unknown),
            Err(CommandError::UnknownPage("zz".into()))
        );
        assert!(d
            .apply(imp(
                2,
                vec![64.0, 64.0],
                4,
                vec![[0, 0, 2, 2]],
                240.0,
                id6,
                "#000000"
            ))
            .is_ok());
    }

    /// F18, constat T13 : ancre de zone vide : la cellule est écrite pour porter le `span`, la vue liste la fusion.
    #[test]
    fn import_table_keeps_a_merge_whose_anchor_is_empty() {
        let mut d = Document::blank();
        let texts: Vec<String> = ["", "caché", "a", "b"].map(String::from).to_vec();
        let c = import(&mut d, vec![[0, 0, 1, 2]], texts, vec![64.0, 64.0], 2).expect("import");
        let t = d.element(&c.ids[0]).and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.merges,
            vec![TableMergeView {
                row: t.rows[0].id.clone(),
                col: t.cols[0].id.clone(),
                rows: 1,
                cols: 2
            }]
        );
    }

    /// F18, constat T13 : taille non positive, translation `NaN`, matrice hors f32 (1e39), boîte hors f32 (largeur ou
    /// hauteur totale) : `BadTable` avant la page, aucune transaction ; mêmes cas dans `fake-core.test.ts`.
    #[test]
    fn import_table_refuses_size_nan_and_out_of_f32() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id6 = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        let imp = |size: f64, matrix: [f64; 6], col_width: f64, height: f64| Command::ImportTable {
            page: p.clone(),
            matrix,
            col_width,
            row_heights: vec![height; 2],
            cols: 2,
            cells: vec![String::new(); 4],
            merges: vec![],
            color: "#000000".into(),
            size,
        };
        let w = writes(&d);
        for (what, c) in [
            ("taille nulle", imp(0.0, id6, 240.0, 64.0)),
            ("taille négative", imp(-1.0, id6, 240.0, 64.0)),
            (
                "translation NaN",
                imp(36.0, [1.0, 0.0, 0.0, 1.0, f64::NAN, 0.0], 240.0, 64.0),
            ),
            (
                "matrice hors f32",
                imp(36.0, [1e39, 0.0, 0.0, 1.0, 0.0, 0.0], 240.0, 64.0),
            ),
            ("largeur hors f32", imp(36.0, id6, 2e38, 64.0)),
            ("hauteur hors f32", imp(36.0, id6, 240.0, 2e38)),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable), "{what}");
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(d.apply(imp(36.0, id6, 240.0, 64.0)).is_ok());
    }

    /// Clés de `cells` du tableau `id`, triées.
    fn cell_keys(d: &Document, id: &str) -> Vec<String> {
        let txn = d.read();
        let e = d.find_element(&txn, id).expect("élément").element;
        let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
            panic!("cells")
        };
        let mut keys: Vec<String> = cells.keys(&txn).map(str::to_string).collect();
        keys.sort();
        keys
    }

    /// Test qui discrimine (DAB1, F1, F5) : une ligne insérée entre l'ancre et la fin d'une zone l'agrandit, sans code
    /// et sans écriture de couverture. Patron écarté : `mergedInto` écrit sur les cellules couvertes (ou couverture
    /// recalculée par commande) — l'import écrirait `r1:c0`, l'insertion n'en poserait pas sur la ligne neuve (zone
    /// trouée, donnée dérivée fausse) ou en écrirait une de plus ; ici seules les clés écrites par l'import restent, et
    /// la zone se relit en 3 lignes par `merges_of`.
    #[test]
    fn merge_grows_with_a_row_inserted_inside_it() {
        let mut d = Document::blank();
        let texts: Vec<String> = ["Lundi", "x", "", "y", "", "z"].map(String::from).to_vec();
        let id = import(&mut d, vec![[0, 0, 2, 1]], texts, vec![64.0; 3], 2)
            .expect("import")
            .ids[0]
            .clone();
        let t = view(&d, &id);
        let (r, c) = (
            t.rows.iter().map(|l| l.id.clone()).collect::<Vec<_>>(),
            t.cols.iter().map(|l| l.id.clone()).collect::<Vec<_>>(),
        );
        let zone = |rows: u32| {
            vec![TableMergeView {
                row: r[0].clone(),
                col: c[0].clone(),
                rows,
                cols: 1,
            }]
        };
        assert_eq!(t.merges, zone(2));
        let mut written = vec![
            cell_key(&r[0], &c[0]),
            cell_key(&r[0], &c[1]),
            cell_key(&r[1], &c[1]),
            cell_key(&r[2], &c[1]),
        ];
        written.sort();
        assert_eq!(
            cell_keys(&d, &id),
            written,
            "aucune cellule couverte écrite"
        );
        d.apply(Command::InsertTableLine {
            id: id.clone(),
            axis: TableAxis::Row,
            at: 1,
        })
        .expect("ligne dans la zone");
        let t = view(&d, &id);
        assert_eq!(t.rows.len(), 4);
        assert_eq!(t.merges, zone(3), "zone agrandie, déduite à la lecture");
        assert_eq!(cell_keys(&d, &id), written, "aucune couverture écrite");
    }

    #[test]
    fn text_not_ytext_is_empty_and_bad_fill_is_none() {
        let cells = MapPrelim::from([
            (
                "r1:c1",
                cell(
                    In::from("brut"),
                    vec![("fill", In::from("pas une couleur !"))],
                ),
            ),
            ("r1:c2", In::from(3.0)),
        ]);
        let d = doc_with(two_by_two(
            cells,
            vec![("color", In::from("!!")), ("size", In::from(-2.0))],
        ));
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert!(t.cells.is_empty());
        assert_eq!((t.color.as_str(), t.size), ("#000000", 36.0));
    }

    use crate::commands::tests::writes;
    use crate::commands::{Change, Command, CommandError};
    use crate::element::StrokeStyle;

    fn add(d: &mut Document, cols: u32, rows: u32) -> String {
        let p = d.page_ids()[0].clone();
        d.apply(Command::AddTable {
            page: p,
            x: 100.0,
            y: 200.0,
            cols,
            rows,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }

    fn view(d: &Document, id: &str) -> TableView {
        d.element(id).and_then(|v| v.table).expect("tableau")
    }

    fn set(
        d: &mut Document,
        id: &str,
        row: &str,
        col: &str,
        content: &str,
        h: Option<f64>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetTableCell {
            id: id.into(),
            row: row.into(),
            col: col.into(),
            content: content.into(),
            row_height: h,
            spans: None,
        })
    }

    /// Segments d'une cellule sans attribut (C7b, R16).
    fn plain_spans(t: &str) -> Vec<crate::rich_text::TextSpanView> {
        vec![crate::rich_text::TextSpanView {
            text: t.into(),
            attrs: crate::rich_text::SpanAttrs::default(),
        }]
    }

    #[test]
    fn add_table_writes_its_shape_in_one_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d
            .apply(Command::AddTable {
                page: p.clone(),
                x: 100.0,
                y: 200.0,
                cols: 4,
                rows: 3,
                col_width: 240.0,
                row_height: 64.0,
                color: "#1d4ed8".into(),
                size: 36.0,
            })
            .expect("tableau");
        assert_eq!(c.pages, vec![p]);
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!(
            (v.kind.as_str(), v.transform),
            ("table", [1.0, 0.0, 0.0, 1.0, 100.0, 200.0])
        );
        let t = v.table.expect("tableau");
        assert_eq!(
            (t.color.as_str(), t.size, t.cols.len(), t.rows.len()),
            ("#1d4ed8", 36.0, 4, 3)
        );
        assert!(t.cols.iter().all(|c| c.width == 240.0) && t.rows.iter().all(|r| r.height == 64.0));
        assert!(t.cells.is_empty());
        assert_eq!(
            d.bounds(std::slice::from_ref(&id)),
            Some(Bounds {
                x0: 100.0,
                y0: 200.0,
                x1: 1060.0,
                y1: 392.0
            })
        );
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            for k in ["shade", "span", "mergedInto"] {
                assert!(e.get(&txn, k).is_none(), "{k} jamais écrit par C10a");
            }
            assert!(matches!(e.get(&txn, "cells"), Some(Out::YMap(_))));
        }
        assert!(d.can_undo());
        assert!(d.undo());
        assert!(d.element(&id).is_none());
    }

    #[test]
    fn add_table_refuses_bad_input_without_writing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let cmd = |cols: u32, rows: u32, sizes: [f64; 3], color: &str, x: f64| Command::AddTable {
            page: p.clone(),
            x,
            y: 0.0,
            cols,
            rows,
            col_width: sizes[0],
            row_height: sizes[1],
            color: color.into(),
            size: sizes[2],
        };
        let ok = [240.0, 64.0, 36.0];
        let w = writes(&d);
        for c in [
            cmd(0, 2, ok, "#000000", 0.0),
            cmd(65, 2, ok, "#000000", 0.0),
            cmd(2, 0, ok, "#000000", 0.0),
            cmd(2, 65, ok, "#000000", 0.0),
            cmd(2, 2, [f64::NAN, 64.0, 36.0], "#000000", 0.0),
            cmd(2, 2, [240.0, 0.0, 36.0], "#000000", 0.0),
            cmd(2, 2, [240.0, 64.0, -1.0], "#000000", 0.0),
            cmd(2, 2, ok, "!!", 0.0),
            cmd(2, 2, ok, "#000000", f64::INFINITY),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(!d.can_undo());
        assert_eq!(
            d.apply(Command::AddTable {
                page: "zz".into(),
                x: 0.0,
                y: 0.0,
                cols: 2,
                rows: 2,
                col_width: 240.0,
                row_height: 64.0,
                color: "#000000".into(),
                size: 36.0,
            }),
            Err(CommandError::UnknownPage("zz".into()))
        );
        assert!(d.apply(cmd(64, 64, ok, "#000000", 0.0)).is_ok());
    }

    #[test]
    fn set_cell_writes_text_and_grows_only_its_row() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r0, r1, c0) = (
            t.rows[0].id.clone(),
            t.rows[1].id.clone(),
            t.cols[0].id.clone(),
        );
        set(&mut d, &id, &r0, &c0, "Lundi", Some(61.0)).expect("texte");
        let t = view(&d, &id);
        assert_eq!(
            (t.cells.len(), t.cells[0].text.as_str(), t.rows[0].height),
            (1, "Lundi", 64.0)
        );
        let c =
            set(&mut d, &id, &r0, &c0, "Lundi et un long texte", Some(150.0)).expect("plus haut");
        assert_eq!(c.ids, vec![id.clone()]);
        let t = view(&d, &id);
        assert_eq!((t.rows[0].height, t.rows[1].height), (150.0, 64.0));
        let w = writes(&d);
        let v = d.version();
        assert_eq!(
            set(&mut d, &id, &r0, &c0, "Lundi et un long texte", Some(100.0))
                .expect("inchangé")
                .version,
            v
        );
        assert_eq!(
            set(&mut d, &id, &r1, &c0, "", None).expect("vide").version,
            v
        );
        assert_eq!(w.since(), 0, "aucune transaction sans effet (D38)");
        assert!(d.undo());
        let t = view(&d, &id);
        assert_eq!(
            (t.cells[0].text.as_str(), t.rows[0].height),
            ("Lundi", 64.0)
        );
    }

    #[test]
    fn set_cell_keeps_its_unknown_keys() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r, &c, "Lundi", None).expect("texte");
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
                panic!("cells")
            };
            let Some(Out::YMap(cell)) = cells.get(&txn, &cell_key(&r, &c)) else {
                panic!("cellule")
            };
            cell.insert(&mut txn, "shade", In::Any(Any::Bool(true)));
        }
        set(&mut d, &id, &r, &c, "Lundi soir", None).expect("texte");
        assert_eq!(view(&d, &id).cells[0].text, "Lundi soir");
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
            panic!("cells")
        };
        let Some(Out::YMap(cell)) = cells.get(&txn, &cell_key(&r, &c)) else {
            panic!("cellule")
        };
        assert!(
            matches!(cell.get(&txn, "shade"), Some(Out::Any(Any::Bool(true)))),
            "clé C10b gardée"
        );
        assert!(matches!(cell.get(&txn, "text"), Some(Out::YText(_))));
    }

    /// C7b : cellule dont le `text` n'est pas un `Y.Text` (pair ancien ou hostile) : un `Y.Text` neuf est posé, ses
    /// segments appliqués par la même commande, une clé inconnue de la cellule gardée.
    #[test]
    fn set_cell_replaces_a_text_that_is_not_a_ytext() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r, &c, "Lundi", None).expect("texte");
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
                panic!("cells")
            };
            let Some(Out::YMap(cell)) = cells.get(&txn, &cell_key(&r, &c)) else {
                panic!("cellule")
            };
            cell.insert(&mut txn, "text", In::Any(Any::from("vieux")));
            cell.insert(&mut txn, "pair", In::Any(Any::from("gardé")));
        }
        assert!(
            view(&d, &id).cells.iter().all(|x| x.text.is_empty()),
            "texte illisible : cellule vide"
        );
        use crate::rich_text::SpanAttrs;
        let bold = SpanAttrs {
            bold: true,
            ..SpanAttrs::default()
        };
        let spans = [
            SpanInput {
                text: "Mar".into(),
                attrs: bold.clone(),
            },
            SpanInput {
                text: "di".into(),
                attrs: SpanAttrs::default(),
            },
        ];
        d.apply(Command::SetTableCell {
            id: id.clone(),
            row: r.clone(),
            col: c.clone(),
            content: "Mardi".into(),
            row_height: None,
            spans: Some(spans.to_vec()),
        })
        .expect("texte neuf");
        let cell = view(&d, &id).cells[0].clone();
        assert_eq!(cell.text, "Mardi");
        assert_eq!(
            cell.spans,
            vec![
                TextSpanView {
                    text: "Mar".into(),
                    attrs: bold
                },
                TextSpanView {
                    text: "di".into(),
                    attrs: SpanAttrs::default()
                },
            ]
        );
        let txn = d.read();
        let e = d.find_element(&txn, &id).expect("élément").element;
        let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
            panic!("cells")
        };
        let Some(Out::YMap(raw)) = cells.get(&txn, &cell_key(&r, &c)) else {
            panic!("cellule")
        };
        assert!(matches!(raw.get(&txn, "text"), Some(Out::YText(_))));
        assert_eq!(out_string(raw.get(&txn, "pair")).as_deref(), Some("gardé"));
    }

    #[test]
    fn set_cell_refuses_unknown_line_and_non_table() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (row, col) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        let p = d.page_ids()[0].clone();
        let s = d
            .apply(Command::CommitStroke {
                page: p,
                points: vec![10.0, 10.0, 0.5, 20.0, 20.0, 0.5],
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                look: Look::default(),
            })
            .expect("trait")
            .ids[0]
            .clone();
        assert_eq!(
            set(&mut d, &id, "absente", &col, "x", None),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            set(&mut d, &id, &row, "absente", "x", None),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            set(&mut d, &id, &row, &col, "x", Some(0.0)),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            set(&mut d, &s, &row, &col, "x", None),
            Err(CommandError::UnknownElement(s.clone()))
        );
        assert_eq!(
            set(&mut d, "nulle-part", &row, &col, "x", None),
            Err(CommandError::UnknownElement("nulle-part".into()))
        );
    }

    #[test]
    fn insert_line_copies_its_neighbour_and_respects_bounds() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r0, c0) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        set(&mut d, &id, &r0, &c0, "haut", Some(150.0)).expect("haut");
        let ins = |d: &mut Document, axis: TableAxis, at: u32| {
            d.apply(Command::InsertTableLine {
                id: id.clone(),
                axis,
                at,
            })
        };
        assert_eq!(
            ins(&mut d, TableAxis::Row, 0).expect("en tête").ids,
            vec![id.clone()]
        );
        let t = view(&d, &id);
        assert_eq!(
            t.rows.iter().map(|r| r.height).collect::<Vec<_>>(),
            vec![150.0, 150.0, 64.0]
        );
        assert_eq!(t.rows[1].id, r0);
        ins(&mut d, TableAxis::Col, 2).expect("à droite");
        let t = view(&d, &id);
        assert_eq!(
            t.cols.iter().map(|c| c.width).collect::<Vec<_>>(),
            vec![240.0, 240.0, 240.0]
        );
        assert_eq!(t.cells.len(), 1, "les cellules suivent leurs ids");
        assert_eq!(ins(&mut d, TableAxis::Row, 4), Err(CommandError::BadTable));
        let full = add(&mut d, 1, 64);
        assert_eq!(
            d.apply(Command::InsertTableLine {
                id: full,
                axis: TableAxis::Row,
                at: 64
            }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn remove_line_drops_its_cells_and_keeps_the_last_one() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        for r in &t.rows {
            for c in &t.cols {
                set(
                    &mut d,
                    &id,
                    &r.id,
                    &c.id,
                    &format!("{}{}", r.id, c.id),
                    None,
                )
                .expect("texte");
            }
        }
        let rm = |d: &mut Document, axis: TableAxis, line: &str| {
            d.apply(Command::RemoveTableLine {
                id: id.clone(),
                axis,
                line: line.into(),
                to: None,
            })
        };
        rm(&mut d, TableAxis::Row, &t.rows[0].id).expect("ligne");
        let v = view(&d, &id);
        assert_eq!((v.rows.len(), v.cells.len()), (1, 2));
        assert!(v.cells.iter().all(|c| c.row == t.rows[1].id));
        {
            let txn = d.read();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let Some(Out::YMap(cells)) = e.get(&txn, "cells") else {
                panic!("cells")
            };
            assert_eq!(cells.len(&txn), 2, "clés de la ligne retirée effacées");
        }
        assert_eq!(
            rm(&mut d, TableAxis::Row, &t.rows[1].id),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            rm(&mut d, TableAxis::Col, "absente"),
            Err(CommandError::BadTable)
        );
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: t.rows[1].id.clone(),
            col: t.cols[1].id.clone(),
            to: None,
            fill: Some("#fef08a".into()),
        })
        .expect("jaune");
        let before = view(&d, &id);
        assert!(before
            .cells
            .iter()
            .any(|c| c.col == t.cols[1].id && !c.text.is_empty() && c.fill.is_some()));
        rm(&mut d, TableAxis::Col, &t.cols[1].id).expect("colonne");
        assert_eq!(view(&d, &id).cells.len(), 1);
        assert!(d.undo());
        assert_eq!(
            view(&d, &id),
            before,
            "colonne, texte et remplissage de ses cellules restaurés"
        );
    }

    #[test]
    fn set_sizes_uniforms_and_skips_when_uniform() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let t = view(&d, &id);
        set(&mut d, &id, &t.rows[0].id, &t.cols[0].id, "x", Some(150.0)).expect("haut");
        d.apply(Command::SetTableSizes {
            id: id.clone(),
            col_width: 200.0,
            row_height: 107.0,
        })
        .expect("uniforme");
        let v = view(&d, &id);
        assert!(
            v.cols.iter().all(|c| c.width == 200.0) && v.rows.iter().all(|r| r.height == 107.0)
        );
        let w = writes(&d);
        let ver = d.version();
        assert_eq!(
            d.apply(Command::SetTableSizes {
                id: id.clone(),
                col_width: 200.0,
                row_height: 107.0
            })
            .expect("même")
            .version,
            ver
        );
        assert_eq!(w.since(), 0);
        assert_eq!(
            d.apply(Command::SetTableSizes {
                id,
                col_width: 0.0,
                row_height: 64.0
            }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn set_fill_sets_skips_and_clears() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[1].id.clone(), t.cols[1].id.clone());
        let fill = |d: &mut Document, f: Option<&str>| {
            d.apply(Command::SetTableFill {
                id: id.clone(),
                row: r.clone(),
                col: c.clone(),
                to: None,
                fill: f.map(str::to_string),
            })
        };
        fill(&mut d, Some("#fef08a")).expect("jaune");
        assert_eq!(
            view(&d, &id).cells,
            vec![TableCellView {
                row: r.clone(),
                col: c.clone(),
                text: String::new(),
                fill: Some("#fef08a".into()),
                shade: None,
                spans: plain_spans("")
            }]
        );
        let w = writes(&d);
        let v = d.version();
        assert_eq!(fill(&mut d, Some("#fef08a")).expect("même").version, v);
        assert_eq!(w.since(), 0);
        fill(&mut d, None).expect("aucun");
        assert!(view(&d, &id).cells.is_empty());
        assert_eq!(
            fill(&mut d, Some("pas une couleur !")),
            Err(CommandError::BadTable)
        );
    }

    /// S3 : enregistrer, recharger, réenregistrer : mêmes octets, même vue (patron `grid_reload_keeps_bytes`).
    #[test]
    fn table_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let id = add(&mut d, 4, 3);
        let t = view(&d, &id);
        for (i, r) in t.rows.iter().enumerate() {
            for (j, c) in t.cols.iter().enumerate() {
                set(&mut d, &id, &r.id, &c.id, &format!("L{i}C{j}"), None).expect("texte");
            }
        }
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: t.rows[0].id.clone(),
            col: t.cols[0].id.clone(),
            to: None,
            fill: Some("#bbf7d0".into()),
        })
        .expect("vert");
        d.apply(Command::InsertTableLine {
            id: id.clone(),
            axis: TableAxis::Col,
            at: 4,
        })
        .expect("colonne");
        let want = view(&d, &id);
        let file =
            save(&load(&save(&d, &meta).expect("save")).expect("load"), &meta).expect("resave");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert_eq!(view(&r, &id), want, "vue au rechargement {i}");
            assert!(
                save(&r, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    #[test]
    fn one_command_is_one_undo_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let before = view(&d, &id);
        d.apply(Command::InsertTableLine {
            id: id.clone(),
            axis: TableAxis::Row,
            at: 2,
        })
        .expect("ligne");
        let after = view(&d, &id);
        assert!(d.undo());
        assert_eq!(view(&d, &id), before);
        assert!(d.redo());
        assert_eq!(view(&d, &id), after);
    }

    /// Texte et hauteur de ligne d'un même `SetTableCell` : une seule étape d'annulation, cellule absente ou déjà écrite.
    #[test]
    fn set_cell_growing_its_row_is_one_undo_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r, c) = (t.rows[0].id.clone(), t.cols[0].id.clone());
        for (content, h) in [
            ("Lundi", 150.0),
            ("Lundi et un texte bien plus long", 300.0),
        ] {
            let before = view(&d, &id);
            set(&mut d, &id, &r, &c, content, Some(h)).expect("plus haut");
            let after = view(&d, &id);
            assert_eq!(
                (after.rows[0].height, after.cells[0].text.as_str()),
                (h, content)
            );
            assert!(d.undo());
            assert_eq!(view(&d, &id), before, "texte et hauteur annulés ensemble");
            assert!(d.redo());
            assert_eq!(view(&d, &id), after);
        }
    }

    /// Patron écarté : borner chaque entrée en f32 (`col_width` = 1e37 y tient) laisse passer une largeur totale de
    /// 6,4e38 > `f32::MAX` (polygone infini, tableau non touchable) ; la garde des formes (`fits_f32`) vaut pour x, y
    /// et les sommes des largeurs et des hauteurs.
    #[test]
    fn add_table_refuses_geometry_beyond_f32() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let cmd = |[x, y]: [f64; 2], [cols, rows]: [u32; 2], [col_width, row_height]: [f64; 2]| {
            Command::AddTable {
                page: p.clone(),
                x,
                y,
                cols,
                rows,
                col_width,
                row_height,
                color: "#000000".into(),
                size: 36.0,
            }
        };
        let w = writes(&d);
        for c in [
            cmd([0.0, 0.0], [64, 1], [1e37, 64.0]),
            cmd([0.0, 0.0], [1, 64], [240.0, 1e37]),
            cmd([1e39, 0.0], [2, 2], [240.0, 64.0]),
            cmd([0.0, -1e39], [2, 2], [240.0, 64.0]),
            cmd([0.0, 0.0], [1, 1], [1e39, 64.0]),
        ] {
            assert_eq!(d.apply(c), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert!(!d.can_undo());
        assert!(
            d.apply(cmd([0.0, 0.0], [64, 64], [1e36, 1e36])).is_ok(),
            "6,4e37 tient en f32"
        );
    }

    #[test]
    fn set_sizes_refuses_a_total_beyond_f32() {
        let mut d = Document::blank();
        let id = add(&mut d, 64, 2);
        let before = view(&d, &id);
        let w = writes(&d);
        for (col_width, row_height) in [(1e37, 64.0), (240.0, 2e38)] {
            assert_eq!(
                d.apply(Command::SetTableSizes {
                    id: id.clone(),
                    col_width,
                    row_height
                }),
                Err(CommandError::BadTable)
            );
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert_eq!(view(&d, &id), before);
        d.apply(Command::SetTableSizes {
            id: id.clone(),
            col_width: 1e36,
            row_height: 1e38,
        })
        .expect("6,4e37 et 2e38 tiennent en f32");
    }

    #[test]
    fn set_cell_refuses_a_row_growth_beyond_f32() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 2);
        let t = view(&d, &id);
        let (r0, r1, c0) = (
            t.rows[0].id.clone(),
            t.rows[1].id.clone(),
            t.cols[0].id.clone(),
        );
        set(&mut d, &id, &r0, &c0, "haut", Some(2e38)).expect("2e38 + 64 tient en f32");
        let before = view(&d, &id);
        let w = writes(&d);
        assert_eq!(
            set(&mut d, &id, &r1, &c0, "trop", Some(2e38)),
            Err(CommandError::BadTable)
        );
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert_eq!(view(&d, &id), before);
    }

    /// Patron écarté : copier la taille voisine sans borner le nouveau total (34 × 1e37 = 3,4e38 tient en f32, une
    /// colonne de plus donne 3,5e38 > `f32::MAX`, tableau intouchable) ; même garde que `SetTableCell` : le total
    /// après l'insertion, sur l'axe inséré seulement.
    #[test]
    fn insert_line_refuses_a_total_beyond_f32() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let wide = d
            .apply(Command::AddTable {
                page: p,
                x: 0.0,
                y: 0.0,
                cols: 34,
                rows: 1,
                col_width: 1e37,
                row_height: 64.0,
                color: "#000000".into(),
                size: 36.0,
            })
            .expect("3,4e38 tient en f32")
            .ids[0]
            .clone();
        let tall = add(&mut d, 2, 2);
        d.apply(Command::SetTableSizes {
            id: tall.clone(),
            col_width: 240.0,
            row_height: 1.7e38,
        })
        .expect("3,4e38 tient en f32");
        let ins = |d: &mut Document, id: &str, axis: TableAxis, at: u32| {
            d.apply(Command::InsertTableLine {
                id: id.to_string(),
                axis,
                at,
            })
        };
        let before = (view(&d, &wide), view(&d, &tall));
        let w = writes(&d);
        for (id, axis, at) in [
            (&wide, TableAxis::Col, 34),
            (&wide, TableAxis::Col, 0),
            (&tall, TableAxis::Row, 2),
            (&tall, TableAxis::Row, 1),
        ] {
            assert_eq!(ins(&mut d, id, axis, at), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0, "aucune transaction sur un refus");
        assert_eq!((view(&d, &wide), view(&d, &tall)), before);
        ins(&mut d, &wide, TableAxis::Row, 1).expect("l'autre axe reste libre");
        ins(&mut d, &tall, TableAxis::Col, 2).expect("l'autre axe reste libre");
    }

    /// Clé `"<row>:<col>"` : un id contenant `:` la rendrait ambiguë (`r:1` + `c` = `r` + `1:c`) ; une telle ligne est
    /// illisible comme les autres (sautée, gardée) et, s'il n'en reste aucune, le tableau se lit « inconnu ».
    #[test]
    fn line_ids_with_a_colon_are_unreadable() {
        let cells = MapPrelim::from([
            ("r1:c:1", cell(In::from(TextPrelim::new("A")), vec![])),
            ("r1:c2", cell(In::from(TextPrelim::new("B")), vec![])),
        ]);
        let d = doc_with(table_prelim(
            vec![line("c:1", "width", 240.0), line("c2", "width", 100.0)],
            vec![line("r1", "height", 64.0)],
            cells,
            vec![],
        ));
        let t = d.element("t1").and_then(|v| v.table).expect("tableau");
        assert_eq!(
            t.cols,
            vec![TableColView {
                id: "c2".into(),
                width: 100.0
            }]
        );
        assert_eq!(
            t.cells.iter().map(|c| c.text.as_str()).collect::<Vec<_>>(),
            vec!["B"]
        );
        let d = doc_with(table_prelim(
            vec![line("c1", "width", 240.0)],
            vec![line("r:1", "height", 64.0)],
            MapPrelim::default(),
            vec![],
        ));
        let v = d.element("t1").expect("jamais invisible");
        assert_eq!(v.kind, "unknown");
        assert_eq!(v.unknown.map(|u| u.source_kind), Some("table".to_string()));
    }

    fn ids(t: &TableView) -> (Vec<String>, Vec<String>) {
        (
            t.rows.iter().map(|r| r.id.clone()).collect(),
            t.cols.iter().map(|c| c.id.clone()).collect(),
        )
    }

    fn merge(
        d: &mut Document,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
    ) -> Result<Change, CommandError> {
        d.apply(Command::MergeTableCells {
            id: id.into(),
            from: (from.0.into(), from.1.into()),
            to: (to.0.into(), to.1.into()),
        })
    }

    fn shade(
        d: &mut Document,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        s: Option<&str>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::SetTableShade {
            id: id.into(),
            from: (from.0.into(), from.1.into()),
            to: (to.0.into(), to.1.into()),
            shade: s.map(str::to_string),
        })
    }

    fn rm_rows(
        d: &mut Document,
        id: &str,
        line: &str,
        to: Option<&str>,
    ) -> Result<Change, CommandError> {
        d.apply(Command::RemoveTableLine {
            id: id.into(),
            axis: TableAxis::Row,
            line: line.into(),
            to: to.map(str::to_string),
        })
    }

    fn mv(row: &str, col: &str, rows: u32, cols: u32) -> TableMergeView {
        TableMergeView {
            row: row.into(),
            col: col.into(),
            rows,
            cols,
        }
    }

    /// F3 : « le contenu en haut à gauche reste » ; texte et remplissage des couvertes retirés ; une étape (F17).
    #[test]
    fn merge_keeps_the_top_left_content_in_one_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        for (i, row) in r.iter().enumerate() {
            for (j, col) in c.iter().enumerate() {
                set(&mut d, &id, row, col, &format!("L{i}C{j}"), None).expect("texte");
            }
        }
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: r[0].clone(),
            col: c[1].clone(),
            to: None,
            fill: Some("#fef08a".into()),
        })
        .expect("jaune");
        let before = view(&d, &id);
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[1])).expect("fusion");
        let t = view(&d, &id);
        assert_eq!(t.merges, vec![mv(&r[0], &c[0], 2, 2)]);
        assert_eq!(
            t.cells.iter().map(|x| x.text.as_str()).collect::<Vec<_>>(),
            vec!["L0C0", "L0C2", "L1C2"]
        );
        assert!(
            t.cells.iter().all(|x| x.fill.is_none()),
            "remplissage couvert retiré"
        );
        assert!(d.undo());
        assert_eq!(
            view(&d, &id),
            before,
            "une étape : l'annulation rend les couvertes"
        );
    }

    /// F3 : moins de 2 cellules, ligne inconnue, recouvrement partiel d'une zone : `BadTable`, aucune écriture.
    #[test]
    fn merge_refuses_one_cell_unknown_lines_and_partial_overlap() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone verticale");
        let w = writes(&d);
        type Corner<'a> = (&'a str, &'a str);
        let cases: [(Corner, Corner); 3] = [
            ((&r[2], &c[2]), (&r[2], &c[2])),
            ((&r[0], &c[1]), ("absente", &c[2])),
            ((&r[1], &c[0]), (&r[2], &c[1])),
        ];
        for (from, to) in cases {
            assert_eq!(merge(&mut d, &id, from, to), Err(CommandError::BadTable));
        }
        assert_eq!(w.since(), 0);
    }

    /// F3, PC10 : une zone entièrement dedans est dissoute ; la même zone redemandée sans couverte à vider : aucune étape.
    #[test]
    fn merge_dissolves_inner_merges_and_an_identical_merge_is_no_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        let w = writes(&d);
        let v = d.version();
        assert_eq!(
            merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1]))
                .expect("même")
                .version,
            v
        );
        assert_eq!(w.since(), 0);
        merge(&mut d, &id, (&r[1], &c[2]), (&r[0], &c[0])).expect("plus grande");
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 2, 3)]);
    }

    /// F4, HB-21 : diviser retire le `span` ; le texte reste en haut à gauche ; une cellule qui n'est pas une ancre : refus.
    #[test]
    fn split_removes_the_span_and_refuses_a_non_anchor() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Lundi", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        let split = |d: &mut Document, row: &str, col: &str| {
            d.apply(Command::SplitTableCell {
                id: id.clone(),
                row: row.into(),
                col: col.into(),
            })
        };
        assert_eq!(split(&mut d, &r[0], &c[1]), Err(CommandError::BadTable));
        assert_eq!(split(&mut d, &r[1], &c[2]), Err(CommandError::BadTable));
        split(&mut d, &r[0], &c[0]).expect("division");
        let t = view(&d, &id);
        assert!(t.merges.is_empty());
        assert_eq!(
            t.cells
                .iter()
                .map(|x| (x.col.as_str(), x.text.as_str()))
                .collect::<Vec<_>>(),
            vec![(c[0].as_str(), "Lundi")]
        );
        assert!(d.undo());
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 1, 2)]);
    }

    /// F9, F12, S1 : ombrer une colonne (trois cellules) ; une zone dans la plage : son ancre seule ; rien à changer :
    /// aucune étape ; révéler une cellule : une étape, l'annulation la remet ; couleur invalide : refus.
    #[test]
    fn shade_sets_the_anchors_of_a_range_and_reveal_is_one_step() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8")).expect("colonne");
        shade(&mut d, &id, (&r[0], &c[1]), (&r[0], &c[1]), Some("#94a3b8")).expect("zone");
        let shaded = |d: &Document| {
            view(d, &id)
                .cells
                .iter()
                .filter(|x| x.shade.is_some())
                .map(|x| (x.row.clone(), x.col.clone()))
                .collect::<Vec<_>>()
        };
        assert_eq!(
            shaded(&d),
            vec![
                (r[0].clone(), c[0].clone()),
                (r[0].clone(), c[2].clone()),
                (r[1].clone(), c[2].clone()),
                (r[2].clone(), c[2].clone())
            ]
        );
        let w = writes(&d);
        let v = d.version();
        assert_eq!(
            shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8"))
                .expect("même")
                .version,
            v
        );
        assert_eq!(w.since(), 0);
        shade(&mut d, &id, (&r[0], &c[2]), (&r[0], &c[2]), None).expect("révélée");
        assert_eq!(shaded(&d).len(), 3);
        assert!(d.undo());
        assert_eq!(shaded(&d).len(), 4, "annuler : il revient (S11)");
        assert_eq!(
            shade(
                &mut d,
                &id,
                (&r[0], &c[2]),
                (&r[0], &c[2]),
                Some("pas une couleur !")
            ),
            Err(CommandError::BadTable)
        );
    }

    /// F15 : une pastille sur une plage remplit les ancres et les cellules simples, en une étape.
    #[test]
    fn fill_range_paints_anchors_and_simple_cells() {
        let mut d = Document::blank();
        let id = add(&mut d, 3, 2);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        d.apply(Command::SetTableFill {
            id: id.clone(),
            row: r[0].clone(),
            col: c[0].clone(),
            to: Some((r[1].clone(), c[1].clone())),
            fill: Some("#bbf7d0".into()),
        })
        .expect("vert");
        let filled: Vec<(String, String)> = view(&d, &id)
            .cells
            .iter()
            .filter(|x| x.fill.is_some())
            .map(|x| (x.row.clone(), x.col.clone()))
            .collect();
        assert_eq!(
            filled,
            vec![
                (r[0].clone(), c[0].clone()),
                (r[0].clone(), c[1].clone()),
                (r[1].clone(), c[1].clone())
            ]
        );
        assert!(d.undo());
        assert!(view(&d, &id).cells.iter().all(|x| x.fill.is_none()));
    }

    /// F6, S5, HB-20 : ligne d'ancrage retirée → la zone glisse sur la première ligne restante (le contenu de l'ancre
    /// part avec sa ligne) ; dernière ligne retirée → zone ramenée ; une seule cellule restante → plus de zone ; plage
    /// de deux lignes = une étape ; tout retirer : refus. Même règle pour les colonnes.
    #[test]
    fn remove_lines_moves_or_trims_the_merges_they_touch() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 4);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Haut", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[2], &c[0])).expect("zone");
        rm_rows(&mut d, &id, &r[0], None).expect("ligne d'ancrage");
        let t = view(&d, &id);
        assert_eq!(t.merges, vec![mv(&r[1], &c[0], 2, 1)]);
        assert!(t.cells.iter().all(|x| x.text != "Haut"));
        rm_rows(&mut d, &id, &r[2], None).expect("fin de zone");
        assert!(
            view(&d, &id).merges.is_empty(),
            "une seule cellule : plus de zone"
        );
        assert!(d.undo() && d.undo());
        let before = view(&d, &id);
        rm_rows(&mut d, &id, &r[2], Some(r[1].as_str())).expect("plage");
        let t = view(&d, &id);
        assert_eq!(
            t.rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
            vec![r[0].clone(), r[3].clone()]
        );
        assert!(t.merges.is_empty());
        assert!(d.undo());
        assert_eq!(view(&d, &id), before, "plage de deux lignes : une étape");
        rm_rows(&mut d, &id, &r[0], Some(r[2].as_str())).expect("zone entière");
        assert!(view(&d, &id).merges.is_empty());
        assert_eq!(
            rm_rows(&mut d, &id, &r[3], Some(r[3].as_str())).map(|_| ()),
            Err(CommandError::BadTable),
            "plus aucune ligne"
        );
        assert_eq!(
            rm_rows(&mut d, &id, &r[3], Some("absente")),
            Err(CommandError::BadTable)
        );
        let id2 = add(&mut d, 4, 1);
        let (r2, c2) = ids(&view(&d, &id2));
        merge(&mut d, &id2, (&r2[0], &c2[0]), (&r2[0], &c2[2])).expect("zone large");
        d.apply(Command::RemoveTableLine {
            id: id2.clone(),
            axis: TableAxis::Col,
            line: c2[0].clone(),
            to: None,
        })
        .expect("colonne d'ancrage");
        assert_eq!(view(&d, &id2).merges, vec![mv(&r2[0], &c2[1], 1, 2)]);
    }

    /// F5, S5 : une ligne insérée entre l'ancre et la fin d'une zone l'agrandit (aucun code : plage par ids).
    #[test]
    fn insert_line_inside_a_merge_grows_it() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        d.apply(Command::InsertTableLine {
            id: id.clone(),
            axis: TableAxis::Row,
            at: 1,
        })
        .expect("ligne");
        assert_eq!(view(&d, &id).merges, vec![mv(&r[0], &c[0], 3, 1)]);
    }

    /// F7 : sur une ancre de deux lignes, la hauteur exigée vaut pour la zone, la dernière ligne grandit ; plus petite :
    /// rien ; cellule simple : comme C10a.
    #[test]
    fn set_cell_on_a_tall_merge_grows_its_last_row() {
        let mut d = Document::blank();
        let id = add(&mut d, 2, 3);
        let (r, c) = ids(&view(&d, &id));
        merge(&mut d, &id, (&r[0], &c[0]), (&r[1], &c[0])).expect("zone");
        set(&mut d, &id, &r[0], &c[0], "long", Some(200.0)).expect("haute");
        let h = |d: &Document| {
            view(d, &id)
                .rows
                .iter()
                .map(|x| x.height)
                .collect::<Vec<_>>()
        };
        assert_eq!(h(&d), vec![64.0, 136.0, 64.0]);
        let v = d.version();
        assert_eq!(
            set(&mut d, &id, &r[0], &c[0], "long", Some(100.0))
                .expect("plus petite")
                .version,
            v
        );
        set(&mut d, &id, &r[2], &c[1], "x", Some(90.0)).expect("simple");
        assert_eq!(h(&d), vec![64.0, 136.0, 90.0]);
    }

    /// S3, F30 : enregistrer, recharger, réenregistrer un tableau avec fusion et ombrage : mêmes octets, même vue.
    #[test]
    fn c10b_table_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let id = add(&mut d, 4, 3);
        let (r, c) = ids(&view(&d, &id));
        set(&mut d, &id, &r[0], &c[0], "Lundi", None).expect("texte");
        merge(&mut d, &id, (&r[0], &c[0]), (&r[0], &c[1])).expect("zone");
        shade(&mut d, &id, (&r[0], &c[2]), (&r[2], &c[2]), Some("#94a3b8")).expect("ombre");
        let want = view(&d, &id);
        assert_eq!(
            (
                want.merges.len(),
                want.cells.iter().filter(|x| x.shade.is_some()).count()
            ),
            (1, 3)
        );
        let file =
            save(&load(&save(&d, &meta).expect("save")).expect("load"), &meta).expect("resave");
        for i in 0..30 {
            let back = load(&file).expect("load");
            assert_eq!(view(&back, &id), want, "vue au rechargement {i}");
            assert!(
                save(&back, &meta).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    /// Test qui discrimine (GC11, F2) : chaque commande lit la couverture par `merges_of`, comme la vue que l'écran lit.
    /// Patron écarté : une boucle « cellule couverte ? » par commande sur les `span` bruts (ou un `mergedInto` sur les
    /// couvertes) ; elle prendrait pour zones les `span` que la règle F2 ignore (`r1:c2` recoupe la zone retenue,
    /// `r2:c3` vise une ligne absente, `r3:c3` d'une seule cellule) : diviser `r1:c2` réussirait, ombrer `r1:c3`
    /// ombrerait `r1:c2`, fusionner `r2:c3`–`r3:c3` serait refusé, retirer `r1` reporterait le `span` ignoré de
    /// `r1:c2` sur une clé `r2:c2` neuve ; un `mergedInto` garderait la couverte `r3:c3`.
    #[test]
    fn commands_read_coverage_through_merges_of_only() {
        let s = |r: &str, c: &str| vec![("span", In::Any(span_any(r, c)))];
        let empty = || In::from(TextPrelim::new(""));
        let fresh = || {
            doc_with(three_by_three(MapPrelim::from([
                ("r1:c1", cell(In::from(TextPrelim::new("A")), s("r2", "c2"))),
                ("r1:c2", cell(empty(), s("r3", "c3"))),
                ("r2:c3", cell(empty(), s("r9", "c3"))),
                ("r3:c3", cell(empty(), s("r3", "c3"))),
            ])))
        };
        let zone = mv("r1", "c1", 2, 2);
        let mut d = fresh();
        assert_eq!(
            view(&d, "t1").merges,
            vec![zone.clone()],
            "référence : la vue (F2)"
        );
        let w = writes(&d);
        for (row, col) in [("r1", "c2"), ("r2", "c3"), ("r3", "c3")] {
            assert_eq!(
                d.apply(Command::SplitTableCell {
                    id: "t1".into(),
                    row: row.into(),
                    col: col.into(),
                }),
                Err(CommandError::BadTable),
                "{row}:{col} n'est pas une ancre pour la vue"
            );
        }
        assert_eq!(w.since(), 0, "aucune écriture sur un refus");
        shade(&mut d, "t1", ("r1", "c3"), ("r1", "c3"), Some("#94a3b8")).expect("cellule simple");
        let shaded: Vec<(String, String)> = view(&d, "t1")
            .cells
            .iter()
            .filter(|x| x.shade.is_some())
            .map(|x| (x.row.clone(), x.col.clone()))
            .collect();
        assert_eq!(shaded, vec![("r1".to_string(), "c3".to_string())]);
        merge(&mut d, "t1", ("r2", "c3"), ("r3", "c3")).expect("hors de la zone retenue");
        assert_eq!(view(&d, "t1").merges, vec![zone, mv("r2", "c3", 2, 1)]);
        assert_eq!(
            cell_keys(&d, "t1"),
            vec!["r1:c1", "r1:c2", "r1:c3", "r2:c3"],
            "couverte retirée, jamais marquée"
        );
        let mut d = fresh();
        rm_rows(&mut d, "t1", "r1", None).expect("ligne d'ancrage");
        assert_eq!(view(&d, "t1").merges, vec![mv("r2", "c1", 1, 2)]);
        assert_eq!(
            cell_keys(&d, "t1"),
            vec!["r2:c1", "r2:c3", "r3:c3"],
            "seule la zone retenue est reportée"
        );
    }
}
