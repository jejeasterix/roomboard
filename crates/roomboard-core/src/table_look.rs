//! Réglages de case et de colonne (personnalisation-3, suite OG32, DS1) : une seule commande, `SetTableLook`, pose une
//! clé sur les ancres et cellules simples d'une plage (`ha`, `va`, `border`, `open`) ou sur ses colonnes (`accept`), en
//! une transaction. La page calcule le reste (cadre aligné, dessin, règle d'étiquettes) ; le cœur écrit (DA4). Valeurs
//! positionnelles (U3) : `border` = `[couleur, épaisseur, style]`, `accept` = liste de chaînes ; jamais d'`Any::Map`.
use std::ops::RangeInclusive;

use yrs::{Any, In, Map, MapRef, Out, TransactionMut};

use crate::commands::{Change, CommandError};
use crate::document::Document;
use crate::element::{any_f64, finite_positive};
use crate::rich_text::valid_color;
use crate::table::{cells_map, insert_cell, merges_of, read_cell, targets, RawCell, RawTable};

/// Valeurs écrites de `ha` et `va` (les défauts `left` et `top` ne s'écrivent pas).
pub const HA: [&str; 2] = ["center", "right"];
pub const VA: [&str; 2] = ["middle", "bottom"];
pub const BORDER_STYLES: [&str; 4] = ["solid", "dashed", "dotted", "none"];
pub const MAX_BORDER_WIDTH: f64 = 32.0;
pub const MAX_ACCEPT: usize = 64;
pub const MAX_LABEL_CHARS: usize = 200;

/// Bordure de case (D16) : `(couleur, épaisseur, style)`.
pub type CellBorder = (String, f64, String);

/// Clé posée par `SetTableLook` (DS1).
#[derive(Debug, Clone, PartialEq)]
pub enum CellLook {
    /// `None` ou `"left"` : clé retirée.
    Ha(Option<String>),
    /// `None` ou `"top"` : clé retirée.
    Va(Option<String>),
    /// `None` : réglage retiré (trait du tableau).
    Border(Option<CellBorder>),
    /// Seulement sur une case ombrée (DS3).
    Open(bool),
    /// Colonnes de la plage ; liste vide : clé retirée (DS5).
    Accept(Vec<String>),
}

fn border_ok(c: &str, w: f64, s: &str) -> bool {
    valid_color(c) && finite_positive(w) && w <= MAX_BORDER_WIDTH && BORDER_STYLES.contains(&s)
}

/// `border` lisible : `[couleur, épaisseur, style]` valides ; toute autre forme : aucun (gardée, U3).
pub(crate) fn read_border(o: Option<Out>) -> Option<CellBorder> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    match items.as_ref() {
        [Any::String(c), w, Any::String(s)] => {
            let w = any_f64(w)?;
            border_ok(c, w, s).then(|| (c.to_string(), w, s.to_string()))
        }
        _ => None,
    }
}

/// `accept` lisible : 1 à `MAX_ACCEPT` chaînes ; toute autre forme : aucun (gardée).
pub(crate) fn read_accept(o: Option<Out>) -> Option<Vec<String>> {
    let Some(Out::Any(Any::Array(items))) = o else {
        return None;
    };
    if items.is_empty() || items.len() > MAX_ACCEPT {
        return None;
    }
    items
        .iter()
        .map(|a| match a {
            Any::String(s) => Some(s.to_string()),
            _ => None,
        })
        .collect()
}

/// Valeur admise (contrôle avant la recherche du tableau, comme le faux cœur).
fn check(look: &CellLook) -> Result<(), CommandError> {
    let ok = match look {
        CellLook::Ha(v) => v.as_deref().is_none_or(|x| x == "left" || HA.contains(&x)),
        CellLook::Va(v) => v.as_deref().is_none_or(|x| x == "top" || VA.contains(&x)),
        CellLook::Border(b) => b.as_ref().is_none_or(|(c, w, s)| border_ok(c, *w, s)),
        CellLook::Open(_) => true,
        CellLook::Accept(l) => {
            l.len() <= MAX_ACCEPT
                && l.iter()
                    .all(|s| !s.trim().is_empty() && s.chars().count() <= MAX_LABEL_CHARS)
        }
    };
    if ok {
        Ok(())
    } else {
        Err(CommandError::BadTable)
    }
}

/// Valeur écrite (le défaut ne s'écrit pas).
fn norm<'a>(v: Option<&'a str>, default: &str) -> Option<&'a str> {
    v.filter(|x| *x != default)
}

/// La case lue diffère de la demande (case absente : aucune valeur ; `open` : case ombrée seulement).
fn differs(cell: Option<&RawCell>, look: &CellLook) -> bool {
    match look {
        CellLook::Ha(v) => cell.and_then(|x| x.ha.as_deref()) != norm(v.as_deref(), "left"),
        CellLook::Va(v) => cell.and_then(|x| x.va.as_deref()) != norm(v.as_deref(), "top"),
        CellLook::Border(b) => cell.and_then(|x| x.border.as_ref()) != b.as_ref(),
        CellLook::Open(o) => cell.is_some_and(|x| x.shade.is_some() && x.open != *o),
        CellLook::Accept(_) => false,
    }
}

fn put_str(txn: &mut TransactionMut, map: &MapRef, key: &str, v: Option<&str>) {
    match v {
        Some(x) => {
            map.insert(txn, key, x);
        }
        None => {
            map.remove(txn, key);
        }
    }
}

fn write(txn: &mut TransactionMut, map: &MapRef, look: &CellLook) {
    match look {
        CellLook::Ha(v) => put_str(txn, map, "ha", norm(v.as_deref(), "left")),
        CellLook::Va(v) => put_str(txn, map, "va", norm(v.as_deref(), "top")),
        CellLook::Border(Some((c, w, s))) => {
            let v = Any::Array(
                vec![
                    Any::String(c.as_str().into()),
                    Any::from(*w),
                    Any::String(s.as_str().into()),
                ]
                .into(),
            );
            map.insert(txn, "border", In::Any(v));
        }
        CellLook::Border(None) => {
            map.remove(txn, "border");
        }
        CellLook::Open(true) => {
            map.insert(txn, "open", true);
        }
        CellLook::Open(false) => {
            map.remove(txn, "open");
        }
        CellLook::Accept(_) => {}
    }
}

impl Document {
    /// `SetTableLook` (DS1) : valeur contrôlée d'abord, puis tableau et plage ; seulement les cases (ou colonnes) qui
    /// changent ; rien ne change : aucune étape.
    pub(crate) fn cmd_set_table_look(
        &mut self,
        id: &str,
        from: (&str, &str),
        to: (&str, &str),
        look: &CellLook,
    ) -> Result<Change, CommandError> {
        check(look)?;
        let (page, e, raw) = self.table_of(id)?;
        let rect = raw.rect(from, to).ok_or(CommandError::BadTable)?;
        if let CellLook::Accept(labels) = look {
            return self.set_accept(page, id, &raw, rect.c0..=rect.c1, labels);
        }
        let todo: Vec<((usize, usize), Option<RawCell>)> = {
            let txn = self.read();
            let merges = merges_of(&raw, &txn);
            targets(&rect, &merges)
                .into_iter()
                .filter_map(|(r, c)| {
                    let cell =
                        read_cell(&txn, raw.cells.as_ref(), &raw.rows[r].id, &raw.cols[c].id);
                    differs(cell.as_ref(), look).then_some(((r, c), cell))
                })
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
            for ((r, c), cell) in todo {
                let map = match cell {
                    Some(x) => x.map,
                    None => insert_cell(&mut txn, &cells, raw.key(r, c), "", Vec::new()),
                };
                write(&mut txn, &map, look);
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `accept` sur les colonnes `cols` (DS5) ; liste vide : retirée ; valeur illisible gardée si rien n'est demandé.
    fn set_accept(
        &mut self,
        page: String,
        id: &str,
        raw: &RawTable,
        cols: RangeInclusive<usize>,
        labels: &[String],
    ) -> Result<Change, CommandError> {
        let todo: Vec<MapRef> = {
            let txn = self.read();
            raw.cols[cols]
                .iter()
                .filter(|l| {
                    read_accept(l.map.get(&txn, "accept"))
                        .as_deref()
                        .unwrap_or(&[])
                        != labels
                })
                .map(|l| l.map.clone())
                .collect()
        };
        if todo.is_empty() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            for m in todo {
                if labels.is_empty() {
                    m.remove(&mut txn, "accept");
                } else {
                    let v = Any::Array(
                        labels
                            .iter()
                            .map(|s| Any::String(s.as_str().into()))
                            .collect::<Vec<_>>()
                            .into(),
                    );
                    m.insert(&mut txn, "accept", In::Any(v));
                }
            }
        }
        Ok(self.table_done(page, id))
    }
}

#[cfg(test)]
mod tests {
    use yrs::{Any, Array, Map, MapRef, Out};

    use super::CellLook;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;

    fn first(d: &Document) -> String {
        d.page_ids()[0].clone()
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
    fn ids(d: &Document, t: &str, r: usize, c: usize) -> (String, String) {
        let v = view(d, t);
        (v.rows[r].id.clone(), v.cols[c].id.clone())
    }
    fn look(
        d: &mut Document,
        t: &str,
        a: (usize, usize),
        b: (usize, usize),
        l: CellLook,
    ) -> Result<crate::commands::Change, CommandError> {
        let (from, to) = (ids(d, t, a.0, a.1), ids(d, t, b.0, b.1));
        d.apply(Command::SetTableLook {
            id: t.into(),
            from,
            to,
            look: l,
        })
    }
    fn shade(d: &mut Document, t: &str, r: usize, c: usize, on: bool) {
        let x = ids(d, t, r, c);
        d.apply(Command::SetTableShade {
            id: t.into(),
            from: x.clone(),
            to: x,
            shade: on.then(|| "#94a3b8".to_string()),
        })
        .expect("ombrage");
    }
    fn meta() -> crate::format::SaveMeta {
        crate::format::SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-28T00:00:00Z".into(),
            created: None,
        }
    }
    /// Tableau 3 × 3 portant les cinq clés : `ha`/`va` sur (0, 0)-(0, 1) (« Lundi » en (0, 0)), bordure en (1, 1),
    /// cache ouvert en (2, 2), `accept` sur la colonne 0.
    fn all_keys(d: &mut Document) -> String {
        let p = first(d);
        let t = table3(d, &p);
        let (r, c) = ids(d, &t, 0, 0);
        d.apply(Command::SetTableCell {
            id: t.clone(),
            row: r,
            col: c,
            content: "Lundi".into(),
            row_height: None,
            spans: None,
        })
        .expect("texte");
        look(d, &t, (0, 0), (0, 1), CellLook::Ha(Some("center".into()))).expect("ha");
        look(d, &t, (0, 0), (0, 1), CellLook::Va(Some("bottom".into()))).expect("va");
        look(
            d,
            &t,
            (1, 1),
            (1, 1),
            CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into()))),
        )
        .expect("border");
        shade(d, &t, 2, 2, true);
        look(d, &t, (2, 2), (2, 2), CellLook::Open(true)).expect("open");
        look(
            d,
            &t,
            (0, 0),
            (2, 0),
            CellLook::Accept(vec!["chat".into(), "chien".into()]),
        )
        .expect("accept");
        t
    }

    #[test]
    fn look_ha_va_writes_clears_and_undoes() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let c = look(
            &mut d,
            &t,
            (0, 0),
            (0, 1),
            CellLook::Ha(Some("center".into())),
        )
        .expect("plage");
        assert_eq!(c.ids, vec![t.clone()]);
        assert!(view(&d, &t)
            .cells
            .iter()
            .all(|x| x.ha.as_deref() == Some("center")));
        assert_eq!(view(&d, &t).cells.len(), 2);
        let ver = d.version();
        look(
            &mut d,
            &t,
            (0, 0),
            (0, 1),
            CellLook::Ha(Some("center".into())),
        )
        .expect("même");
        assert_eq!(d.version(), ver, "rien ne change : aucune étape");
        look(
            &mut d,
            &t,
            (0, 0),
            (0, 1),
            CellLook::Ha(Some("left".into())),
        )
        .expect("retour");
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
            assert_eq!(
                d.apply(Command::SetTableLook {
                    id: "zz".into(),
                    from: a.clone(),
                    to: a.clone(),
                    look: l.clone()
                }),
                Err(CommandError::BadTable),
                "{l:?} : contrôle avant le tableau"
            );
        }
        assert_eq!(
            d.apply(Command::SetTableLook {
                id: "zz".into(),
                from: a.clone(),
                to: a.clone(),
                look: CellLook::Ha(Some("right".into()))
            }),
            Err(CommandError::UnknownElement("zz".into()))
        );
        assert_eq!(
            d.apply(Command::SetTableLook {
                id: t.clone(),
                from: ("x".into(), "y".into()),
                to: a,
                look: CellLook::Ha(Some("right".into()))
            }),
            Err(CommandError::BadTable)
        );
    }

    #[test]
    fn look_cell_listed_in_view() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(
            &mut d,
            &t,
            (2, 2),
            (2, 2),
            CellLook::Va(Some("bottom".into())),
        )
        .expect("va");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 1);
        assert_eq!(
            (
                v.cells[0].text.as_str(),
                v.cells[0].va.as_deref(),
                v.cells[0].ha.as_deref()
            ),
            ("", Some("bottom"), None)
        );
    }

    #[test]
    fn look_border_writes_an_array() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        look(
            &mut d,
            &t,
            (0, 0),
            (1, 1),
            CellLook::Border(Some(("#dc2626".into(), 8.0, "dashed".into()))),
        )
        .expect("border");
        let v = view(&d, &t);
        assert_eq!(v.cells.len(), 4);
        assert!(v
            .cells
            .iter()
            .all(|c| c.border == Some(("#dc2626".to_string(), 8.0, "dashed".to_string()))));
        {
            let txn = d.read();
            let f = d.find_element(&txn, &t).expect("t");
            let Some(Out::YMap(cells)) = f.element.get(&txn, "cells") else {
                panic!("cells")
            };
            let (r, c) = (v.rows[0].id.clone(), v.cols[0].id.clone());
            let Some(Out::YMap(cell)) = cells.get(&txn, &format!("{r}:{c}")) else {
                panic!("case")
            };
            assert!(
                matches!(cell.get(&txn, "border"), Some(Out::Any(Any::Array(_)))),
                "positionnel, jamais Any::Map (U3)"
            );
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
        look(
            &mut d,
            &t,
            (0, 1),
            (2, 2),
            CellLook::Accept(vec!["chat".into(), "chien".into()]),
        )
        .expect("accept");
        let v = view(&d, &t);
        assert_eq!(
            v.cols.iter().map(|c| c.accept.clone()).collect::<Vec<_>>(),
            vec![
                None,
                Some(vec!["chat".into(), "chien".into()]),
                Some(vec!["chat".into(), "chien".into()])
            ]
        );
        let ver = d.version();
        look(
            &mut d,
            &t,
            (0, 1),
            (0, 2),
            CellLook::Accept(vec!["chat".into(), "chien".into()]),
        )
        .expect("même");
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
                let maps: Vec<MapRef> = cells
                    .iter(&txn)
                    .filter_map(|(_, v)| match v {
                        Out::YMap(m) => Some(m),
                        _ => None,
                    })
                    .collect();
                for m in maps {
                    for k in ["ha", "va", "border", "open"] {
                        m.remove(&mut txn, k);
                    }
                }
            }
            if let Some(Out::YArray(cols)) = f.element.get(&txn, "cols") {
                let maps: Vec<MapRef> = cols
                    .iter(&txn)
                    .filter_map(|v| match v {
                        Out::YMap(m) => Some(m),
                        _ => None,
                    })
                    .collect();
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
        a.cells.retain(|c| {
            !c.text.is_empty() || c.fill.is_some() || c.shade.is_some() || c.bg.is_some()
        });
        for c in &mut a.cols {
            c.accept = None;
        }
        assert_eq!(a, view(&old, &t));
    }
}
