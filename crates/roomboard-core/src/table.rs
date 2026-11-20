//! Tableau (U32, DAU10, C10a, DAC1) : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ;
//! `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` =
//! `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill? }`, cellule absente = vide. Lecture tolérante (T2) :
//! entrée de `cols` / `rows` illisible (id vide ou contenant `:`) ou d'un id déjà vu sautée (gardée dans le document), `text` qui n'est pas un
//! `Y.Text` → vide, `fill` invalide → aucun, aucune ligne ou aucune colonne lisible → `None` : l'appelant se replie sur
//! `element::unknown_view` (jamais invisible). C10a n'écrit jamais `shade`, `span`, `mergedInto` (place gardée pour
//! C10b) ; aucune `Any::Map`.
use std::collections::HashSet;

use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, GetString, In, Map, MapPrelim, MapRef, Out, ReadTxn,
    TextPrelim, TextRef, TransactionMut,
};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{
    finite_positive, fits_f32, out_f64, out_string, out_transform, transform_to_any, Transform,
};
use crate::rich_text::{self, valid_color};
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

/// Cellule non vide (texte ou remplissage) ; `fill` = remplissage (U32), distinct de l'ombrage de C10b.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableCellView {
    pub row: String,
    pub col: String,
    pub text: String,
    pub fill: Option<String>,
}

/// Vue d'un tableau (T13) : `color` = traits et texte, `size` = taille du texte ; cellules dans l'ordre de lecture.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TableView {
    pub color: String,
    pub size: f64,
    pub cols: Vec<TableColView>,
    pub rows: Vec<TableRowView>,
    pub cells: Vec<TableCellView>,
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

/// Cellule lue ; `text` : son `Y.Text` s'il en est un.
pub(crate) struct RawCell {
    pub map: MapRef,
    pub text: Option<TextRef>,
    pub content: String,
    pub fill: Option<String>,
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
    Some(RawCell {
        map,
        text,
        content,
        fill,
    })
}

impl RawTable {
    pub(crate) fn width(&self) -> f64 {
        self.cols.iter().map(|l| l.size).sum()
    }

    pub(crate) fn height(&self) -> f64 {
        self.rows.iter().map(|l| l.size).sum()
    }

    /// Vue (T13) : cellules non vides dans l'ordre de lecture, sur les seules lignes et colonnes lisibles.
    pub(crate) fn view<T: ReadTxn>(&self, txn: &T) -> TableView {
        let mut cells = Vec::new();
        for r in &self.rows {
            for c in &self.cols {
                let Some(cell) = read_cell(txn, self.cells.as_ref(), &r.id, &c.id) else {
                    continue;
                };
                if cell.content.is_empty() && cell.fill.is_none() {
                    continue;
                }
                cells.push(TableCellView {
                    row: r.id.clone(),
                    col: c.id.clone(),
                    text: cell.content,
                    fill: cell.fill,
                });
            }
        }
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

/// Cellule absente `(row, col)` posée en `Y.Map{ text, fill? }` ; `cells` posé neuf s'il manque ou n'est pas un
/// `Y.Map` (PC12).
fn insert_cell(
    txn: &mut TransactionMut,
    e: &MapRef,
    cells: Option<&MapRef>,
    (row, col): (&str, &str),
    text: &str,
    fill: Option<&str>,
) {
    let cells = match cells {
        Some(m) => m.clone(),
        None => e.insert(txn, "cells", MapPrelim::default()),
    };
    let mut fields: Vec<(&str, In)> = vec![("text", In::from(TextPrelim::new(text)))];
    if let Some(f) = fill {
        fields.push(("fill", In::from(f)));
    }
    cells.insert(
        txn,
        cell_key(row, col),
        fields.into_iter().collect::<MapPrelim>(),
    );
}

impl RawTable {
    fn axis(&self, axis: TableAxis) -> (&[Line], &ArrayRef) {
        match axis {
            TableAxis::Row => (&self.rows, &self.rows_arr),
            TableAxis::Col => (&self.cols, &self.cols_arr),
        }
    }

    /// Ligne de la cellule `(row, col)`, si sa ligne et sa colonne sont lisibles.
    fn cell_row(&self, row: &str, col: &str) -> Option<&Line> {
        self.rows
            .iter()
            .find(|l| l.id == row)
            .filter(|_| self.cols.iter().any(|l| l.id == col))
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
        let elements = self.page_elements_or_err(t.page)?;
        let id = yrs::uuid_v4().to_string();
        let cols: Vec<In> = (0..t.cols)
            .map(|_| In::Map(line_prelim(&yrs::uuid_v4(), "width", t.col_width)))
            .collect();
        let rows: Vec<In> = (0..t.rows)
            .map(|_| In::Map(line_prelim(&yrs::uuid_v4(), "height", t.row_height)))
            .collect();
        let fields: Vec<(&str, In)> = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(TABLE_KIND)),
            (
                "transform",
                In::Any(transform_to_any(&[1.0, 0.0, 0.0, 1.0, t.x, t.y])),
            ),
            ("color", In::from(t.color)),
            ("size", In::Any(Any::from(t.size))),
            ("cols", In::Array(ArrayPrelim::from(cols))),
            ("rows", In::Array(ArrayPrelim::from(rows))),
            ("cells", In::Map(MapPrelim::default())),
        ];
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, fields.into_iter().collect::<MapPrelim>());
        }
        Ok(self.table_done(t.page.to_string(), &id))
    }

    /// `SetTableCell` (T3, T5) : texte par différence (`apply_text_diff`) ; hauteur écrite seulement si plus grande,
    /// la hauteur du tableau restant bornée en f32 ; même texte sans hauteur plus grande : aucune transaction (D38).
    pub(crate) fn cmd_set_table_cell(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        content: &str,
        row_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        if row_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let line = raw.cell_row(row, col).ok_or(CommandError::BadTable)?;
        let cell = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), row, col)
        };
        let current = cell.as_ref().map_or("", |c| c.content.as_str());
        let grow = row_height.filter(|h| *h > line.size);
        if grow.is_some_and(|h| !fits_f32(&[raw.height() - line.size + h])) {
            return Err(CommandError::BadTable);
        }
        if current == content && grow.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            if current != content {
                match &cell {
                    Some(RawCell { text: Some(t), .. }) => {
                        rich_text::apply_text_diff(&mut txn, t, content)
                    }
                    Some(c) => {
                        c.map.insert(&mut txn, "text", TextPrelim::new(content));
                    }
                    None => {
                        insert_cell(&mut txn, &e, raw.cells.as_ref(), (row, col), content, None)
                    }
                }
            }
            if let Some(h) = grow {
                line.map.insert(&mut txn, "height", In::Any(Any::from(h)));
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `InsertTableLine` (T3) : `at` ∈ 0..=n, plafond 64 ; inséré au rang brut de la `at`-ième ligne lisible.
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

    /// `RemoveTableLine` (T3) : la ligne et ses cellules dans la même transaction ; dernière ligne refusée.
    pub(crate) fn cmd_remove_table_line(
        &mut self,
        id: &str,
        axis: TableAxis,
        line: &str,
    ) -> Result<Change, CommandError> {
        let (page, _, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let target = lines
            .iter()
            .find(|l| l.id == line)
            .ok_or(CommandError::BadTable)?;
        if lines.len() <= 1 {
            return Err(CommandError::BadTable);
        }
        let keys: Vec<String> = match &raw.cells {
            Some(cells) => {
                let txn = self.read();
                cells
                    .keys(&txn)
                    .filter(|k| in_line(k, axis, line))
                    .map(str::to_string)
                    .collect()
            }
            None => Vec::new(),
        };
        {
            let mut txn = self.transact_local();
            arr.remove(&mut txn, target.index);
            if let Some(cells) = &raw.cells {
                for k in &keys {
                    cells.remove(&mut txn, k);
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

    /// `SetTableFill` (T12) : clé `fill` seule posée ou retirée ; cellule absente : `Y.Map{ text: "", fill }`.
    pub(crate) fn cmd_set_table_fill(
        &mut self,
        id: &str,
        (row, col): (&str, &str),
        fill: Option<&str>,
    ) -> Result<Change, CommandError> {
        if fill.is_some_and(|c| !valid_color(c)) {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        if raw.cell_row(row, col).is_none() {
            return Err(CommandError::BadTable);
        }
        let cell = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), row, col)
        };
        if cell.as_ref().and_then(|c| c.fill.as_deref()) == fill {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match (fill, &cell) {
                (Some(f), Some(c)) => {
                    c.map.insert(&mut txn, "fill", In::from(f));
                }
                (Some(f), None) => {
                    insert_cell(&mut txn, &e, raw.cells.as_ref(), (row, col), "", Some(f))
                }
                (None, Some(c)) => {
                    c.map.remove(&mut txn, "fill");
                }
                (None, None) => {}
            }
        }
        Ok(self.table_done(page, id))
    }
}

#[cfg(test)]
pub(crate) mod tests {
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
                    fill: None
                },
                TableCellView {
                    row: "r2".into(),
                    col: "c2".into(),
                    text: String::new(),
                    fill: Some("#fef08a".into())
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
        assert_eq!(t.cells.len(), 1);
        assert_eq!(t.cells[0].text, "A");
        assert!(
            d.encode_v1() == before,
            "la lecture a écrit dans le document"
        );
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
        })
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
                fill: Some("#fef08a".into())
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
}
