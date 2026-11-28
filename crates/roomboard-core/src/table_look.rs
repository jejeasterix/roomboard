#[cfg(test)]
mod tests {
    use yrs::{Any, Map, MapRef, Out};

    use super::CellLook;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
    }
    fn table3(d: &mut Document, p: &str) -> String {
        d.apply(Command::AddTable {
            page: p.into(), x: 0.0, y: 0.0, cols: 3, rows: 3, col_width: 240.0, row_height: 64.0,
            color: "#000000".into(), size: 36.0,
        })
        .expect("tableau")
        .ids[0]
            .clone()
    }
    fn view(d: &Document, id: &str) -> crate::table::TableView {
        d.element(id).and_then(|v| v.table).expect("vue")
    }
    fn ids(d: &Document, t: &str, r: usize, c: usize) -> (String, String) {
        let v = view(d, t);
        (v.rows[r].id.clone(), v.cols[c].id.clone())
    }
    fn look(d: &mut Document, t: &str, a: (usize, usize), b: (usize, usize), l: CellLook) -> Result<crate::commands::Change, CommandError> {
        let (from, to) = (ids(d, t, a.0, a.1), ids(d, t, b.0, b.1));
        d.apply(Command::SetTableLook { id: t.into(), from, to, look: l })
    }
    fn shade(d: &mut Document, t: &str, r: usize, c: usize, on: bool) {
        let x = ids(d, t, r, c);
        d.apply(Command::SetTableShade { id: t.into(), from: x.clone(), to: x, shade: on.then(|| "#94a3b8".to_string()) }).expect("ombrage");
    }
    fn meta() -> crate::format::SaveMeta {
        crate::format::SaveMeta { app_version: "0.1.0".into(), now: "2026-11-28T00:00:00Z".into(), created: None }
    }
    /// Tableau 3 × 3 portant les cinq clés : `ha`/`va` sur (0, 0)-(0, 1) (« Lundi » en (0, 0)), bordure en (1, 1),
    /// cache ouvert en (2, 2), `accept` sur la colonne 0.
    fn all_keys(d: &mut Document) -> String {
        let p = first(d);
        let t = table3(d, &p);
        let (r, c) = ids(d, &t, 0, 0);
        d.apply(Command::SetTableCell { id: t.clone(), row: r, col: c, content: "Lundi".into(), row_height: None, spans: None }).expect("texte");
        look(d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("ha");
        look(d, &t, (0, 0), (0, 1), CellLook::Va(Some("bottom".into()))).expect("va");
        look(d, &t, (1, 1), (1, 1), CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into())))).expect("border");
        shade(d, &t, 2, 2, true);
        look(d, &t, (2, 2), (2, 2), CellLook::Open(true)).expect("open");
        look(d, &t, (0, 0), (2, 0), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("accept");
        t
    }

    #[test]
    fn look_ha_va_writes_clears_and_undoes() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let c = look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("plage");
        assert_eq!(c.ids, vec![t.clone()]);
        assert!(view(&d, &t).cells.iter().all(|x| x.ha.as_deref() == Some("center")));
        assert_eq!(view(&d, &t).cells.len(), 2);
        let ver = d.version();
        look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("même");
        assert_eq!(d.version(), ver, "rien ne change : aucune étape");
        look(&mut d, &t, (0, 0), (0, 1), CellLook::Ha(Some("left".into()))).expect("retour");
        assert!(view(&d, &t).cells.is_empty());
        assert!(d.undo());
        assert_eq!(view(&d, &t).cells.len(), 2);
    }

    #[test]
    fn look_refusals() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let a = ids(&d, &t, 0, 0);
        let bad = [
            CellLook::Ha(Some("diagonal".into())),
            CellLook::Va(Some("left".into())),
            CellLook::Border(Some(("#dc2626".into(), 0.0, "solid".into()))),
            CellLook::Border(Some(("#dc2626".into(), 33.0, "solid".into()))),
            CellLook::Border(Some(("#dc2626".into(), 2.0, "wavy".into()))),
            CellLook::Border(Some(("#zzzzzz".into(), 2.0, "solid".into()))),
            CellLook::Accept(vec!["  ".into()]),
            CellLook::Accept((0..65).map(|i| format!("e{i}")).collect()),
        ];
        for l in bad {
            assert_eq!(d.apply(Command::SetTableLook { id: "zz".into(), from: a.clone(), to: a.clone(), look: l.clone() }), Err(CommandError::BadTable), "{l:?} : contrôle avant le tableau");
        }
        assert_eq!(
            d.apply(Command::SetTableLook { id: "zz".into(), from: a.clone(), to: a.clone(), look: CellLook::Ha(Some("right".into())) }),
            Err(CommandError::UnknownElement("zz".into()))
        );
        assert_eq!(
            d.apply(Command::SetTableLook { id: t.clone(), from: ("x".into(), "y".into()), to: a, look: CellLook::Ha(Some("right".into())) }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn look_cell_listed_in_view() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (2, 2), (2, 2), CellLook::Va(Some("bottom".into()))).expect("va");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 1);
        assert_eq!((v.cells[0].text.as_str(), v.cells[0].va.as_deref(), v.cells[0].ha.as_deref()), ("", Some("bottom"), None));
    }

    #[test]
    fn look_border_writes_an_array() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (0, 0), (1, 1), CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into())))).expect("border");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 4);
        assert!(v.cells.iter().all(|c| c.border == Some(("#dc2626".to_string(), 8.0, "dashed".to_string()))));
        {
            let txn = d.read();
            let f = d.find_element(&txn, &t).expect("t");
            let Some(Out::YMap(cells)) = f.element.get(&txn, "cells") else { panic!("cells") };
            let (r, c) = (v.rows[0].id.clone(), v.cols[0].id.clone());
            let Some(Out::YMap(cell)) = cells.get(&txn, &format!("{r}:{c}")) else { panic!("case") };
            assert!(matches!(cell.get(&txn, "border"), Some(Out::Any(Any::Array(_)))), "positionnel, jamais Any::Map (U3)");
        }
        look(&mut d, &t, (0, 0), (1, 1), CellLook::Border(None)).expect("retire");
        assert!(view(&d, &t).cells.is_empty());
    }

    #[test]
    fn look_open_only_on_shaded_and_shade_clears_it() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let ver = d.version();
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("non ombrée");
        assert_eq!(d.version(), ver, "open n'est écrit que sur une case ombrée");
        shade(&mut d, &t, 0, 0, true);
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("ouvre");
        assert!(view(&d, &t).cells[0].open);
        shade(&mut d, &t, 0, 0, true);
        assert!(!view(&d, &t).cells[0].open, "Ombrer de nouveau referme");
        look(&mut d, &t, (0, 0), (0, 0), CellLook::Open(true)).expect("rouvre");
        shade(&mut d, &t, 0, 0, false);
        assert!(view(&d, &t).cells.is_empty(), "Désombrer retire tout");
    }

    #[test]
    fn look_accept_on_columns() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(&mut d, &t, (0, 1), (2, 2), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("accept");
        let v = view(&d, &t);
        assert_eq!(v.cols.iter().map(|c| c.accept.clone()).collect::<Vec<_>>(), vec![None, Some(vec!["chat".into(), "chien".into()]), Some(vec!["chat".into(), "chien".into()])]);
        let ver = d.version();
        look(&mut d, &t, (0, 1), (0, 2), CellLook::Accept(vec!["chat".into(), "chien".into()])).expect("même");
        assert_eq!(d.version(), ver);
        look(&mut d, &t, (0, 0), (0, 2), CellLook::Accept(vec![])).expect("retire");
        assert!(view(&d, &t).cols.iter().all(|c| c.accept.is_none()));
    }

    #[test]
    fn look_reload_keeps_bytes() {
        use crate::format::{load, save};
        let mut d = Document::blank();
        let t = all_keys(&mut d);
        let once = save(&d, &meta()).expect("save");
        let file = save(&load(&once).expect("load 1"), &meta()).expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta()).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(load(&file).expect("load").element(&t), d.element(&t));
    }

    /// S17, G5 : un lecteur d'avant (ici : le document relu, les cinq clés retirées) voit les mêmes cases, les mêmes
    /// textes, les mêmes tailles, sans planter.
    #[test]
    fn old_reader_ignores_look_keys() {
        use crate::format::{load, save};
        let mut d = Document::blank();
        let t = all_keys(&mut d);
        let old = load(&save(&d, &meta()).expect("save")).expect("load");
        {
            let mut txn = old.transact_untracked();
            let f = old.find_element(&txn, &t).expect("t");
            if let Some(Out::YMap(cells)) = f.element.get(&txn, "cells") {
                let maps: Vec<MapRef> = cells.iter(&txn).filter_map(|(_, v)| match v { Out::YMap(m) => Some(m), _ => None }).collect();
                for m in maps {
                    for k in ["ha", "va", "border", "open"] {
                        m.remove(&mut txn, k);
                    }
                }
            }
            if let Some(Out::YArray(cols)) = f.element.get(&txn, "cols") {
                let maps: Vec<MapRef> = cols.iter(&txn).filter_map(|v| match v { Out::YMap(m) => Some(m), _ => None }).collect();
                for m in maps {
                    m.remove(&mut txn, "accept");
                }
            }
        }
        let mut a = view(&d, &t);
        for c in &mut a.cells {
            c.ha = None;
            c.va = None;
            c.border = None;
            c.open = false;
        }
        a.cells.retain(|c| !c.text.is_empty() || c.fill.is_some() || c.shade.is_some() || c.bg.is_some());
        for c in &mut a.cols {
            c.accept = None;
        }
        assert_eq!(a, view(&old, &t));
    }
}
