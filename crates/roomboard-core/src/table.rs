//! Tableau (U32, DAU10, C10a, DAC1) : élément `Y.Map{ id, kind: "table", transform, color, size, cols, rows, cells }` ;
//! `cols` = `Y.Array<Y.Map{ id, width }>`, `rows` = `Y.Array<Y.Map{ id, height }>`, ids `yrs::uuid_v4` ; `cells` =
//! `Y.Map` clé `"<rowId>:<colId>"` → `Y.Map{ text: Y.Text, fill? }`, cellule absente = vide. Lecture tolérante (T2) :
//! entrée de `cols` / `rows` illisible ou d'un id déjà vu sautée (gardée dans le document), `text` qui n'est pas un
//! `Y.Text` → vide, `fill` invalide → aucun, aucune ligne ou aucune colonne lisible → `None` : l'appelant se replie sur
//! `element::unknown_view` (jamais invisible). C10a n'écrit jamais `shade`, `span`, `mergedInto` (place gardée pour
//! C10b) ; aucune `Any::Map`.
use std::collections::HashSet;

use yrs::{Array, ArrayRef, GetString, Map, MapRef, Out, ReadTxn, TextRef};

use crate::element::{finite_positive, out_f64, out_string, out_transform, Transform};
use crate::rich_text::valid_color;

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
#[allow(dead_code)] // `map`, `index` : lus par les commandes (T2)
pub(crate) struct Line {
    pub id: String,
    pub size: f64,
    pub map: MapRef,
    pub index: u32,
}

/// Tableau lu, avec les références que les commandes écrivent.
#[allow(dead_code)] // `cols_arr`, `rows_arr` : lus par les commandes (T2)
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
#[allow(dead_code)] // `map`, `text` : lus par les commandes (T2)
pub(crate) struct RawCell {
    pub map: MapRef,
    pub text: Option<TextRef>,
    pub content: String,
    pub fill: Option<String>,
}

pub(crate) fn cell_key(row: &str, col: &str) -> String {
    format!("{row}:{col}")
}

/// Entrées lisibles d'un `Y.Array` de lignes : `Y.Map` avec un `id` texte non vide pas encore vu et `key` fini > 0.
fn lines<T: ReadTxn>(txn: &T, arr: &ArrayRef, key: &str) -> Vec<Line> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for (i, o) in arr.iter(txn).enumerate() {
        let Out::YMap(map) = o else { continue };
        let Some(id) = out_string(map.get(txn, "id")).filter(|s| !s.is_empty()) else {
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
}
