//! Recopie profonde (C3, DAZ1, DAZ2) : une seule routine, bâtie sur `AsPrelim` de yrs (copie des `Y.Map`, `Y.Array`,
//! `Y.Text` avec attributs de plage et embeds), sert l'extraction d'une sélection, l'insertion d'un fragment et
//! l'insertion des pages d'un document. Chaque élément garde tous ses champs (types inconnus compris, U3) ; seuls
//! `id`, `group` (renuméroté par une table commune à l'insertion) et la translation de `transform` sont réécrits.
//! Aucune lecture du `kind`.

#[cfg(test)]
mod tests {
    use yrs::{Any, Array, Map, Out};

    use crate::asset::AssetRef;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;
    use crate::element::StrokeStyle;
    use crate::grid::{GridLevelView, GridView};
    use crate::shape::ShapeKind;

    const A1: &str = "1111111111111111111111111111111111111111111111111111111111111111";
    const A2: &str = "2222222222222222222222222222222222222222222222222222222222222222";

    fn pen() -> StrokeStyle {
        StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        }
    }
    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn stroke(d: &mut Document, p: &str, y: f32) -> String {
        let points: Vec<f32> = (0..=10)
            .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
            .collect();
        d.apply(Command::CommitStroke {
            page: p.into(),
            points,
            style: pen(),
        })
        .expect("trait")
        .ids[0]
            .clone()
    }
    fn rect(d: &mut Document, p: &str, x: f64) -> String {
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
    fn image(d: &mut Document, p: &str, asset: &str, name: &str) -> String {
        d.apply(Command::AddImage {
            page: p.into(),
            asset: AssetRef {
                id: asset.into(),
                name: name.into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 10.0,
            h: 10.0,
            matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
        })
        .expect("image")
        .ids[0]
            .clone()
    }
    /// Chemin `group` écrit à la main (T1 n'est pas dans la base de cette tâche).
    fn set_group(d: &Document, id: &str, path: &[&str]) {
        let mut txn = d.transact_local();
        let f = d.find_element(&txn, id).expect("élément");
        let v = Any::Array(path.iter().map(|s| Any::String((*s).into())).collect());
        f.element.insert(&mut txn, "group", v);
    }
    fn group(d: &Document, id: &str) -> Option<Vec<String>> {
        let txn = d.read();
        let f = d.find_element(&txn, id)?;
        match f.element.get(&txn, "group") {
            Some(Out::Any(Any::Array(items))) => Some(
                items
                    .iter()
                    .map(|a| match a {
                        Any::String(s) => s.to_string(),
                        _ => String::new(),
                    })
                    .collect(),
            ),
            _ => None,
        }
    }
    fn ids_of(d: &Document) -> Vec<String> {
        d.element_ids(&first(d))
    }

    #[test]
    fn extract_copies_elements_with_new_ids_in_stack_order() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = stroke(&mut d, &p, 100.0);
        let _b = rect(&mut d, &p, 300.0);
        let c = rect(&mut d, &p, 500.0);
        let f = d.extract(&p, &[c.clone(), a.clone()]).expect("extract");
        assert_eq!(f.page_count(), 1);
        let got = ids_of(&f);
        assert_eq!(got.len(), 2);
        assert!(!got.contains(&a) && !got.contains(&c));
        let (va, vc) = (d.element(&a).unwrap(), d.element(&c).unwrap());
        let (fa, fc) = (f.element(&got[0]).unwrap(), f.element(&got[1]).unwrap());
        assert_eq!(
            (fa.kind.as_str(), fa.transform, fa.style),
            ("stroke", va.transform, va.style)
        );
        assert_eq!(
            (fc.kind.as_str(), fc.transform, fc.shape),
            ("shape", vc.transform, vc.shape)
        );
        assert_eq!(f.outline(&got[0]), d.outline(&a));
    }

    #[test]
    fn extract_unknown_page_or_element_is_refused() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        assert_eq!(
            d.extract("absente", &[a.clone()]).err(),
            Some(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(
            d.extract(&p, &[a, "x".into()]).err(),
            Some(CommandError::UnknownElement("x".into()))
        );
    }

    #[test]
    fn extract_has_no_undo_step() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        let f = d.extract(&p, &[a]).expect("extract");
        assert!(!f.can_undo());
        assert_eq!(f.schema(), Some(1.0));
    }

    #[test]
    fn extract_keeps_text_spans_and_table_cells() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = d
            .apply(Command::SetText {
                page: p.clone(),
                id: None,
                x: 10.0,
                y: 10.0,
                content: "Bonjour".into(),
                color: "#000000".into(),
                size: 36.0,
                box_width: 400.0,
                box_height: 45.0,
                spans: None,
            })
            .expect("texte")
            .ids[0]
            .clone();
        d.apply(Command::FormatText {
            id: t.clone(),
            start: 0,
            len: 3,
            attrs: vec![crate::rich_text::TextAttr::Bold(true)],
            box_height: None,
        })
        .expect("gras");
        let tb = d
            .apply(Command::AddTable {
                page: p.clone(),
                x: 0.0,
                y: 300.0,
                cols: 2,
                rows: 2,
                col_width: 100.0,
                row_height: 40.0,
                color: "#000000".into(),
                size: 24.0,
            })
            .expect("tableau")
            .ids[0]
            .clone();
        let view = d.element(&tb).unwrap().table.unwrap();
        d.apply(Command::SetTableCell {
            id: tb.clone(),
            row: view.rows[0].id.clone(),
            col: view.cols[1].id.clone(),
            content: "B1".into(),
            row_height: None,
            spans: None,
        })
        .expect("cellule");
        let f = d.extract(&p, &[t.clone(), tb.clone()]).expect("extract");
        let got = ids_of(&f);
        assert_eq!(f.element(&got[0]).unwrap().text, d.element(&t).unwrap().text);
        assert_eq!(f.element(&got[1]).unwrap().table, d.element(&tb).unwrap().table);
    }

    #[test]
    fn extract_copies_cited_asset_meta_only() {
        let mut d = Document::blank();
        let p = first(&d);
        let i1 = image(&mut d, &p, A1, "a.png");
        let _i2 = image(&mut d, &p, A2, "b.png");
        let f = d.extract(&p, &[i1]).expect("extract");
        let cited = f.cited_assets();
        assert_eq!(cited.len(), 1);
        assert_eq!(
            (cited[0].id.as_str(), cited[0].name.as_str(), cited[0].mime.as_str()),
            (A1, "a.png", "image/png")
        );
    }

    #[test]
    fn groups_are_renumbered_consistently() {
        let mut d = Document::blank();
        let p = first(&d);
        let a = rect(&mut d, &p, 0.0);
        let b = rect(&mut d, &p, 100.0);
        let c = rect(&mut d, &p, 200.0);
        set_group(&d, &a, &["g1"]);
        set_group(&d, &b, &["g1", "g2"]);
        set_group(&d, &c, &["g1", "g2"]);
        let f = d.extract(&p, &[a, b, c]).expect("extract");
        let got = ids_of(&f);
        let (ga, gb, gc) = (
            group(&f, &got[0]).unwrap(),
            group(&f, &got[1]).unwrap(),
            group(&f, &got[2]).unwrap(),
        );
        assert_eq!((ga.len(), gb.len(), gc.len()), (1, 2, 2));
        assert!(ga[0] != "g1" && gb[1] != "g2");
        assert_eq!(
            (gb[0].as_str(), gc[0].as_str()),
            (ga[0].as_str(), ga[0].as_str())
        );
        assert_eq!(gb[1], gc[1]);
        assert_ne!(gb[0], gb[1]);
    }

    #[test]
    fn insert_fragment_appends_on_top_translated_one_step() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let f = src.extract(&sp, &[a.clone()]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        let old = stroke(&mut d, &p, 500.0);
        let ch = d.insert_fragment(&f, &p, 10.0, 20.0).expect("insert");
        assert_eq!(ch.pages, vec![p.clone()]);
        let ids = d.element_ids(&p);
        assert_eq!(ids.len(), 2);
        assert_eq!(ids[0], old);
        assert_eq!(ch.ids, vec![ids[1].clone()]);
        let t0 = src.element(&a).unwrap().transform;
        let t1 = d.element(&ids[1]).unwrap().transform;
        assert_eq!((t1[4], t1[5]), (t0[4] + 10.0, t0[5] + 20.0));
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![old]);
    }

    /// Garde U9 : la recopie élément par élément n'apporte ni la page du fragment ni ses ids. Appliquer l'état du
    /// fragment comme mise à jour Yrs sur la cible ajouterait sa page, garderait ses ids, et la seconde application
    /// serait sans effet (mêmes horloges).
    #[test]
    fn insert_fragment_brings_no_page_nor_fragment_ids() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let f = src.extract(&sp, &[a]).expect("extract");
        let fids = ids_of(&f);
        let mut d = Document::blank();
        let p = first(&d);
        let c1 = d.insert_fragment(&f, &p, 0.0, 0.0).expect("1");
        assert_eq!(d.page_ids(), vec![p.clone()]);
        assert_eq!(c1.ids.len(), 1);
        assert!(fids.iter().all(|id| !d.element_ids(&p).contains(id)));
        let c2 = d.insert_fragment(&f, &p, 0.0, 0.0).expect("2");
        assert_eq!(d.element_ids(&p).len(), 2);
        assert_ne!(c1.ids, c2.ids);
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), c1.ids);
    }

    #[test]
    fn insert_twice_gives_distinct_ids_and_groups() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let b = rect(&mut src, &sp, 100.0);
        set_group(&src, &a, &["g"]);
        set_group(&src, &b, &["g"]);
        let f = src.extract(&sp, &[a, b]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        let c1 = d.insert_fragment(&f, &p, 0.0, 0.0).expect("1");
        let c2 = d.insert_fragment(&f, &p, 24.0, 24.0).expect("2");
        assert!(c1.ids.iter().all(|id| !c2.ids.contains(id)));
        let g1 = group(&d, &c1.ids[0]).unwrap();
        let g2 = group(&d, &c2.ids[0]).unwrap();
        assert_ne!(g1, g2);
        assert_eq!(group(&d, &c1.ids[1]), Some(g1));
        assert_eq!(group(&d, &c2.ids[1]), Some(g2));
    }

    #[test]
    fn insert_fragment_copies_missing_asset_meta_and_undo_removes_it() {
        let mut src = Document::blank();
        let sp = first(&src);
        let i = image(&mut src, &sp, A1, "a.png");
        let f = src.extract(&sp, &[i]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        d.insert_fragment(&f, &p, 0.0, 0.0).expect("insert");
        assert_eq!(d.asset(A1).unwrap().name, "a.png");
        assert!(d.undo());
        assert_eq!(
            d.asset(A1).unwrap().name,
            A1,
            "métadonnée retirée avec l'étape"
        );
    }

    #[test]
    fn insert_fragment_refusals_and_empty_source() {
        let mut src = Document::blank();
        let sp = first(&src);
        let a = rect(&mut src, &sp, 0.0);
        let f = src.extract(&sp, &[a]).expect("extract");
        let mut d = Document::blank();
        let p = first(&d);
        assert_eq!(
            d.insert_fragment(&f, "absente", 0.0, 0.0).err(),
            Some(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!(
            d.insert_fragment(&f, &p, f64::NAN, 0.0).err(),
            Some(CommandError::BadMatrix)
        );
        let empty = src.extract(&sp, &[]).expect("vide");
        let v = d.version();
        let ch = d.insert_fragment(&empty, &p, 0.0, 0.0).expect("vide");
        assert!(ch.ids.is_empty() && !d.can_undo() && d.version() == v);
    }

    #[test]
    fn insert_pages_after_page_copies_backdrop_grid_and_elements() {
        let mut src = Document::blank();
        let s0 = first(&src);
        let s1 = src
            .apply(Command::AddPage {
                after: Some(s0.clone()),
            })
            .unwrap()
            .pages[0]
            .clone();
        image(&mut src, &s0, A1, "a.png");
        rect(&mut src, &s1, 0.0);
        let grid = GridView {
            visible: true,
            snap: true,
            above: false,
            levels: vec![GridLevelView {
                kind: "squares".into(),
                spacing_x: 40.0,
                spacing_y: 40.0,
                origin_x: 0.0,
                origin_y: 0.0,
                color: "#cccccc".into(),
                line: "solid".into(),
                line_width: 1.0,
                snap: true,
                visible: true,
            }],
        };
        src.apply(Command::SetGrid {
            page: s1.clone(),
            grid: Some(grid.clone()),
        })
        .unwrap();
        let mut d = Document::blank();
        let t0 = first(&d);
        let t1 = d
            .apply(Command::AddPage {
                after: Some(t0.clone()),
            })
            .unwrap()
            .pages[0]
            .clone();
        let ch = d.insert_pages(&src, &t0).expect("insert");
        let pages = d.page_ids();
        assert_eq!(pages.len(), 4);
        assert_eq!(
            (pages[0].as_str(), pages[3].as_str()),
            (t0.as_str(), t1.as_str())
        );
        assert_eq!(ch.pages, vec![pages[1].clone(), pages[2].clone()]);
        assert!(!pages.contains(&s0) && !pages.contains(&s1));
        assert_eq!(d.page(&pages[2]).unwrap().grid, Some(grid));
        assert_eq!(d.element_ids(&pages[1]).len(), 1);
        assert_eq!(d.element_ids(&pages[2]).len(), 1);
        assert_eq!(ch.ids.len(), 2);
        assert_eq!(d.asset(A1).unwrap().name, "a.png");
        assert!(d.undo());
        assert_eq!(d.page_ids(), vec![t0, t1]);
        assert_eq!(d.asset(A1).unwrap().name, A1);
    }

    #[test]
    fn insert_pages_unknown_after_is_refused() {
        let src = Document::blank();
        let mut d = Document::blank();
        assert_eq!(
            d.insert_pages(&src, "absente").err(),
            Some(CommandError::UnknownPage("absente".into()))
        );
    }

    #[test]
    fn unknown_kind_element_is_copied_with_its_fields() {
        let mut d = Document::blank();
        let p = first(&d);
        {
            let mut txn = d.transact_local();
            let els = d.page_elements(&txn, &p).unwrap();
            els.insert(
                &mut txn,
                0,
                yrs::MapPrelim::from([
                    ("id", yrs::In::from("inconnu")),
                    ("kind", yrs::In::from("sticker")),
                    (
                        "transform",
                        yrs::In::Any(crate::element::transform_to_any(&[
                            1.0, 0.0, 0.0, 1.0, 5.0, 5.0,
                        ])),
                    ),
                    ("foo", yrs::In::from("bar")),
                ]),
            );
        }
        let f = d.extract(&p, &["inconnu".into()]).expect("extract");
        let id = ids_of(&f)[0].clone();
        let txn = f.read();
        let e = f.find_element(&txn, &id).unwrap().element;
        assert_eq!(e.get(&txn, "foo"), Some(Out::Any(Any::String("bar".into()))));
        assert_eq!(
            e.get(&txn, "kind"),
            Some(Out::Any(Any::String("sticker".into())))
        );
    }
}
