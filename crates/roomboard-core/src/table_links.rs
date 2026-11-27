#[cfg(test)]
mod tests {
    use std::collections::HashSet;

    use yrs::{Any, In, Map, MapPrelim};

    use super::*;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;
    use crate::element::{read_cell_link, Look, StrokeStyle, IDENTITY};
    use crate::shape::ShapeKind;
    use crate::table::TableAxis;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn rect(d: &mut Document, p: &str, x0: f64, y0: f64, x1: f64, y1: f64) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: StrokeStyle {
                color: "#000000".into(),
                width: 4.0,
            },
            fill: None,
            look: Look::default(),
        })
        .expect("forme")
        .ids[0]
            .clone()
    }
    fn table3(d: &mut Document, p: &str) -> String {
        d.apply(Command::AddTable {
            page: p.into(),
            x: 0.0,
            y: 0.0,
            cols: 3,
            rows: 3,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }
    fn view(d: &Document, id: &str) -> crate::table::TableView {
        d.element(id).and_then(|v| v.table).expect("vue")
    }
    fn link(d: &Document, t: &str, r: usize, c: usize) -> [String; 3] {
        let v = view(d, t);
        [t.to_string(), v.rows[r].id.clone(), v.cols[c].id.clone()]
    }
    fn tx(d: &Document, id: &str) -> [f64; 6] {
        d.element(id).expect("élément").transform
    }
    fn raw_link(d: &Document, id: &str) -> Option<[String; 3]> {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        read_cell_link(&txn, &f.element)
    }
    /// Loge `obj` en (1, 1) d'un 3 × 3 : colonne 1 à 416, ligne 1 à 316, objet posé à (248, 72).
    fn place11(d: &mut Document, t: &str, obj: &str) -> crate::commands::Change {
        let v = view(d, t);
        let at = tx(d, obj);
        d.apply(Command::PlaceInCell {
            ids: vec![obj.to_string()],
            matrix: [1.0, 0.0, 0.0, 1.0, 248.0 - at[4], 72.0 - at[5]],
            cell: Some(link(d, t, 1, 1)),
            sizes: vec![
                LineSize {
                    table: t.into(),
                    axis: TableAxis::Col,
                    line: v.cols[1].id.clone(),
                    size: 416.0,
                },
                LineSize {
                    table: t.into(),
                    axis: TableAxis::Row,
                    line: v.rows[1].id.clone(),
                    size: 316.0,
                },
            ],
        })
        .expect("logé")
    }

    // S1 (cœur) : tailles, matrice et lien en une étape ; Ctrl+Z ramène tout.
    #[test]
    fn place_in_cell_grows_and_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1400.0, 1300.0);
        let before = tx(&d, &o);
        let c = place11(&mut d, &t, &o);
        let mut want = vec![t.clone(), o.clone()];
        want.sort();
        assert_eq!(c.ids, want, "ids triés : objet placé et tableau des tailles");
        let v = view(&d, &t);
        assert_eq!(
            v.cols.iter().map(|c| c.width).collect::<Vec<_>>(),
            vec![240.0, 416.0, 240.0]
        );
        assert_eq!(
            v.rows.iter().map(|r| r.height).collect::<Vec<_>>(),
            vec![64.0, 316.0, 64.0]
        );
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 1, 1)));
        assert_eq!((tx(&d, &o)[4], tx(&d, &o)[5]), (248.0, 72.0));
        assert!(d.undo());
        assert_eq!(view(&d, &t).cols[1].width, 240.0, "un seul Ctrl+Z");
        assert_eq!(view(&d, &t).rows[1].height, 64.0);
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert_eq!(tx(&d, &o), before);
    }

    // S18, D35, D36 : refus sans écriture.
    #[test]
    fn place_in_cell_refuses_table_and_closed_shade() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let t2 = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let v0 = d.version();
        let table_in = d.apply(Command::PlaceInCell {
            ids: vec![t2.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 0, 0)),
            sizes: vec![],
        });
        assert_eq!(table_in, Err(CommandError::BadTable));
        assert_eq!(d.version(), v0, "refus sans étape");
        let l = link(&d, &t, 0, 0);
        d.apply(Command::SetTableShade {
            id: t.clone(),
            from: (l[1].clone(), l[2].clone()),
            to: (l[1].clone(), l[2].clone()),
            shade: Some("#94a3b8".into()),
        })
        .expect("ombre");
        let v1 = d.version();
        let shaded = d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(l),
            sizes: vec![],
        });
        assert_eq!(shaded, Err(CommandError::BadTable));
        assert_eq!(d.version(), v1);
        assert!(v1 > v0);
        assert_eq!(raw_link(&d, &o), None);
    }

    // S16, D5 : une ligne insérée en tête fait descendre l'objet de 64. Le lien vise des ids : la case glisse au rang 2,
    // le lien ne change pas. Le suivi est dans la transaction de la commande : un seul Ctrl+Z retire la ligne ET remonte
    // l'objet (sous une seconde transaction, ce Ctrl+Z remonterait l'objet en laissant la ligne).
    #[test]
    fn insert_line_moves_linked_object() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let linked = link(&d, &t, 1, 1);
        let y = tx(&d, &o)[5];
        let c = d
            .apply(Command::InsertTableLine {
                id: t.clone(),
                axis: TableAxis::Row,
                at: 0,
            })
            .expect("ligne");
        assert_eq!(tx(&d, &o)[5], y + 64.0);
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(d.element(&o).expect("o").cell, Some(linked.clone()), "lien par ids");
        assert_eq!(link(&d, &t, 2, 1), linked, "la case a glissé au rang 2");
        assert!(d.undo());
        assert_eq!(view(&d, &t).rows.len(), 3, "un seul Ctrl+Z retire la ligne");
        assert_eq!(tx(&d, &o)[5], y, "et remonte l'objet");
        assert_eq!(d.element(&o).expect("o").cell, Some(linked));
    }

    // H22 : ligne retirée, lien retiré (du document, pas seulement de la vue), objet laissé en place ; une étape.
    #[test]
    fn remove_line_unlinks_object() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let linked = link(&d, &t, 1, 1);
        let at = tx(&d, &o);
        let row = view(&d, &t).rows[1].id.clone();
        let c = d
            .apply(Command::RemoveTableLine {
                id: t.clone(),
                axis: TableAxis::Row,
                line: row,
                to: None,
            })
            .expect("retrait");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert_eq!(raw_link(&d, &o), None, "lien retiré du document");
        assert_eq!(tx(&d, &o), at);
        assert!(d.undo());
        assert_eq!(view(&d, &t).rows.len(), 3, "un seul Ctrl+Z rend la ligne");
        assert_eq!(d.element(&o).expect("o").cell, Some(linked), "et le lien");
    }

    // D5 : Uniformiser et une cellule qui grandit déplacent les objets des lignes et colonnes suivantes.
    #[test]
    fn set_table_sizes_and_cell_follow() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        let v = view(&d, &t);
        d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 2, 2)),
            sizes: vec![],
        })
        .expect("logé");
        let at = tx(&d, &o);
        let c = d
            .apply(Command::SetTableSizes {
                id: t.clone(),
                col_width: 300.0,
                row_height: 80.0,
            })
            .expect("uniforme");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(
            (tx(&d, &o)[4], tx(&d, &o)[5]),
            (at[4] + 120.0, at[5] + 32.0)
        );
        d.apply(Command::SetTableCell {
            id: t.clone(),
            row: v.rows[0].id.clone(),
            col: v.cols[0].id.clone(),
            content: "haut".into(),
            row_height: Some(180.0),
            spans: None,
        })
        .expect("cellule");
        assert_eq!(tx(&d, &o)[5], at[5] + 32.0 + 100.0);
        assert!(d.undo());
        assert_eq!(tx(&d, &o)[5], at[5] + 32.0, "un seul Ctrl+Z par commande");
        assert_eq!(view(&d, &t).rows[0].height, 80.0);
    }

    // D4 : tailles ligne par ligne, suivi, une étape ; id inconnu refusé ; mêmes tailles : aucune étape.
    #[test]
    fn set_table_line_sizes_writes_and_follows() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 1, 1)),
            sizes: vec![],
        })
        .expect("logé");
        let v = view(&d, &t);
        let at = tx(&d, &o);
        let c = d
            .apply(Command::SetTableLineSizes {
                id: t.clone(),
                cols: vec![(v.cols[0].id.clone(), 340.0)],
                rows: vec![],
            })
            .expect("tailles");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(tx(&d, &o)[4], at[4] + 100.0);
        assert_eq!(
            d.apply(Command::SetTableLineSizes {
                id: t.clone(),
                cols: vec![("zz".into(), 10.0)],
                rows: vec![],
            }),
            Err(CommandError::BadTable)
        );
        let ver = d.version();
        d.apply(Command::SetTableLineSizes {
            id: t.clone(),
            cols: vec![(v.cols[0].id.clone(), 340.0)],
            rows: vec![],
        })
        .expect("même");
        assert_eq!(d.version(), ver);
        assert!(d.undo());
        assert_eq!(view(&d, &t).cols[0].width, 240.0, "un seul Ctrl+Z");
        assert_eq!(tx(&d, &o)[4], at[4]);
    }

    // S17, U3 : `cell` illisible = objet libre, valeur gardée ; `cell` sur un tableau ignoré (D36).
    #[test]
    fn cell_link_unreadable_is_free_and_kept() {
        let bad = MapPrelim::from([
            ("id", In::from("s1")),
            ("kind", In::from("shape")),
            (
                "transform",
                In::Any(crate::element::transform_to_any(&IDENTITY)),
            ),
            ("shape", In::from("rect")),
            ("w", In::from(10.0)),
            ("h", In::from(10.0)),
            ("color", In::from("#000000")),
            ("width", In::from(4.0)),
            (
                "cell",
                In::Any(Any::Array(vec![Any::from("t"), Any::from(2.0)].into())),
            ),
        ]);
        let d = crate::table::tests::doc_with(bad);
        assert_eq!(d.element("s1").map(|v| v.cell), Some(None));
        let txn = d.read();
        let f = d.find_element(&txn, "s1").expect("s1");
        assert!(matches!(
            f.element.get(&txn, "cell"),
            Some(yrs::Out::Any(Any::Array(_)))
        ));
        drop(txn);
        // D36 : un tableau qui porte un `cell` lisible ne le publie pas.
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let t2 = table3(&mut d, &p);
        let l = link(&d, &t, 0, 0);
        {
            let mut txn = d.transact_untracked();
            let f = d.find_element(&txn, &t2).expect("t2");
            f.element
                .insert(&mut txn, "cell", crate::element::cell_link_to_any(&l));
        }
        assert_eq!(raw_link(&d, &t2), Some(l));
        assert_eq!(d.element(&t2).expect("t2").cell, None);
    }

    // D1 : un lien vers un tableau absent (supprimé ailleurs) n'est pas publié ; la valeur reste dans le document.
    #[test]
    fn cell_link_to_absent_target_is_free() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        d.apply(Command::Delete {
            ids: vec![t.clone()],
        })
        .expect("tableau supprimé");
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert!(raw_link(&d, &o).is_some());
    }

    // S17 (U3) : un lecteur qui ignore les clés neuves (ici : `cell` retirée du document relu) voit les mêmes éléments
    // aux mêmes places.
    #[test]
    fn old_reader_ignores_new_keys() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-27T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let old = load(&save(&d, &meta).expect("save")).expect("load");
        {
            let mut txn = old.transact_untracked();
            let f = old.find_element(&txn, &o).expect("o");
            f.element.remove(&mut txn, "cell");
        }
        assert!(d.element(&o).expect("o").cell.is_some());
        for id in d.element_ids(&p) {
            let mut a = d.element(&id).expect("a");
            let b = old.element(&id).expect("b");
            a.cell = None;
            assert_eq!(a, b, "élément {id}");
        }
    }

    #[test]
    fn cell_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-27T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let once = save(&d, &meta).expect("save");
        let file = save(&load(&once).expect("load 1"), &meta).expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(
            load(&file).expect("load").element(&o).expect("o").cell,
            Some(link(&d, &t, 1, 1))
        );
    }

    // Sans T5 : une copie n'est jamais liée au tableau d'origine.
    #[test]
    fn copy_drops_cell_link() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        let c = d
            .apply(Command::DuplicatePage { page: p.clone() })
            .expect("dup");
        let p2 = c
            .pages
            .iter()
            .find(|x| **x != p)
            .cloned()
            .unwrap_or_else(|| d.page_ids()[1].clone());
        let ids = d.element_ids(&p2);
        assert_eq!(ids.len(), 2, "tableau et objet copiés");
        let linked: HashSet<_> = ids
            .iter()
            .filter_map(|id| d.element(id).and_then(|v| v.cell))
            .collect();
        assert!(linked.iter().all(|l| l[0] != t));
        assert_eq!(raw_link(&d, &o), Some(link(&d, &t, 1, 1)), "l'original garde son lien");
    }
}
