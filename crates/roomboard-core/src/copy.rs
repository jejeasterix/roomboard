//! Recopie profonde (C3, DAZ1, DAZ2) : une seule routine, bâtie sur `AsPrelim` de yrs (copie des `Y.Map`, `Y.Array`,
//! `Y.Text` avec attributs de plage et embeds), sert l'extraction d'une sélection, l'insertion d'un fragment et
//! l'insertion des pages d'un document. Chaque élément garde tous ses champs (types inconnus compris, U3) ; seuls
//! `id`, `group` (renuméroté par une table commune à l'insertion) et la translation de `transform` sont réécrits.
//! Aucune lecture du `kind`.
//!
//! Jamais l'état d'un document appliqué comme mise à jour Yrs sur la cible (U9) : la cible garderait les ids et
//! l'historique de la source, et la page du fragment avec. Seul `extract` décode un état, celui du document neuf qu'il
//! vient d'écrire.
use std::collections::{BTreeSet, HashMap, HashSet};

use yrs::types::AsPrelim;
use yrs::{
    Any, Array, ArrayPrelim, ArrayRef, Doc, In, Map, MapPrelim, MapRef, Out, ReadTxn, StateVector,
    Transact, TransactionMut,
};

use crate::commands::{Change, CommandError};
use crate::document::{collect_out, insert_page, Document};
use crate::element::{out_string, out_transform, transform_to_any, SCHEMA};

/// Table ancien → neuf des ids de groupe, commune à toute une insertion (Z4).
pub(crate) type IdMap = HashMap<String, String>;

/// Chemin `group` renuméroté ; valeur illisible gardée telle quelle (`None` : ne pas réécrire).
fn renumber(v: &In, ids: &mut IdMap) -> Option<In> {
    let In::Any(Any::Array(items)) = v else {
        return None;
    };
    let mut out = Vec::with_capacity(items.len());
    for a in items.iter() {
        let Any::String(s) = a else { return None };
        let next = ids
            .entry(s.to_string())
            .or_insert_with(|| yrs::uuid_v4().to_string());
        out.push(Any::String(next.as_str().into()));
    }
    Some(In::Any(Any::Array(out.into())))
}

/// Les `Y.Map` d'un tableau, dans l'ordre.
fn maps<T: ReadTxn>(txn: &T, a: &ArrayRef) -> Vec<MapRef> {
    a.iter(txn)
        .filter_map(|o| match o {
            Out::YMap(m) => Some(m),
            _ => None,
        })
        .collect()
}

/// Éléments d'une page, dans l'ordre d'empilement ; aucun si `elements` est illisible.
fn elements_of<T: ReadTxn>(txn: &T, page: &MapRef) -> Vec<MapRef> {
    match page.get(txn, "elements") {
        Some(Out::YArray(a)) => maps(txn, &a),
        _ => Vec::new(),
    }
}

/// Recopie `from` (lus dans `src`) en haut de `into`, dans l'ordre : id neuf, groupes renumérotés par `ids`, translation.
/// Rend les ids neufs.
pub(crate) fn copy_elements<T: ReadTxn>(
    src: &T,
    from: &[MapRef],
    dst: &mut TransactionMut,
    into: &ArrayRef,
    ids: &mut IdMap,
    dx: f64,
    dy: f64,
) -> Vec<String> {
    let mut out = Vec::with_capacity(from.len());
    for e in from {
        let mut prelim = e.as_prelim(src);
        let id = yrs::uuid_v4().to_string();
        prelim.insert("id".into(), In::from(id.as_str()));
        if let Some(g) = prelim.get("group").and_then(|g| renumber(g, ids)) {
            prelim.insert("group".into(), g);
        }
        // Transformation illisible : gardée telle quelle.
        if dx != 0.0 || dy != 0.0 {
            if let Some(mut t) = out_transform(e.get(src, "transform")) {
                t[4] += dx;
                t[5] += dy;
                prelim.insert("transform".into(), In::Any(transform_to_any(&t)));
            }
        }
        let n = into.len(dst);
        into.insert(dst, n, prelim);
        out.push(id);
    }
    out
}

/// Retire les entrées `moves` (index courants) puis réinsère leurs recopies, dans l'ordre donné, au rang final `to`
/// du tableau résultant. Même transaction : une étape. Les prélims gardent tous les champs, `id` compris (DA2) :
/// contrairement à `copy_elements`, rien n'est renuméroté.
pub(crate) fn reinsert_kept(
    arr: &ArrayRef,
    txn: &mut TransactionMut,
    moves: Vec<(u32, MapPrelim)>,
    to: u32,
) {
    let mut idx: Vec<u32> = moves.iter().map(|(i, _)| *i).collect();
    idx.sort_unstable_by(|a, b| b.cmp(a));
    for i in idx {
        arr.remove(txn, i);
    }
    for (k, (_, p)) in moves.into_iter().enumerate() {
        arr.insert(txn, to + k as u32, p);
    }
}

/// Ids d'asset cités par `elements` (parcours générique de K4).
fn cited_by<T: ReadTxn>(txn: &T, elements: &[MapRef]) -> Vec<String> {
    let mut acc = BTreeSet::new();
    for e in elements {
        collect_out(txn, &Out::YMap(e.clone()), &mut acc);
    }
    acc.into_iter().collect()
}

/// Recopie dans `dst_assets` le `Y.Map` d'asset de chaque id de `cited` absent de la cible (K3), lu dans
/// `src_assets` : mêmes champs que `insert_asset_meta`, champs inconnus compris. Pas unifié avec lui : il fabrique
/// un `Y.Map` neuf à partir d'un `AssetRef` (trois champs), ici on recopie le `Y.Map` source tel quel ; les fondre
/// ajouterait un second mode à `insert_asset_meta` pour deux lignes communes.
fn copy_asset_meta<T: ReadTxn>(
    src: &T,
    src_assets: &MapRef,
    cited: &[String],
    dst: &mut TransactionMut,
    dst_assets: &MapRef,
) {
    for id in cited {
        if dst_assets.get(dst, id).is_some() {
            continue;
        }
        if let Some(Out::YMap(m)) = src_assets.get(src, id) {
            dst_assets.insert(dst, id.as_str(), m.as_prelim(src));
        }
    }
}

/// Relit un `Doc` brut que l'on vient d'écrire en `Document` neuf (historique vide, D37).
fn decode(doc: &Doc) -> Result<Document, CommandError> {
    let bytes = doc
        .transact()
        .encode_state_as_update_v1(&StateVector::default());
    // Un document que l'on vient d'écrire se relit toujours ; une erreur ici serait un défaut du cœur.
    Document::from_update_v1(&bytes).map_err(|_| CommandError::BadFormat)
}

impl Document {
    /// Éléments `ids` de `page`, dans l'ordre d'empilement (D2) ; premier id absent = `UnknownElement`.
    fn picked<T: ReadTxn>(
        &self,
        txn: &T,
        page: &str,
        ids: &[String],
    ) -> Result<Vec<MapRef>, CommandError> {
        let els = self
            .page_elements(txn, page)
            .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let wanted: HashSet<&str> = ids.iter().map(String::as_str).collect();
        let mut found = HashSet::new();
        let mut out = Vec::new();
        for e in maps(txn, &els) {
            if let Some(id) = out_string(e.get(txn, "id")) {
                if wanted.contains(id.as_str()) {
                    found.insert(id);
                    out.push(e);
                }
            }
        }
        if let Some(missing) = ids.iter().find(|id| !found.contains(*id)) {
            return Err(CommandError::UnknownElement(missing.clone()));
        }
        Ok(out)
    }

    /// Document neuf d'une page qui porte une recopie des éléments `ids` de `page` (Z5) ; métadonnées des assets
    /// cités recopiées ; aucune étape d'annulation (écrit sur un `Doc` brut, puis décodé).
    pub fn extract(&self, page: &str, ids: &[String]) -> Result<Document, CommandError> {
        let src = self.read();
        let picked = self.picked(&src, page, ids)?;
        let doc = Doc::new();
        let meta = doc.get_or_insert_map("meta");
        let pages = doc.get_or_insert_array("pages");
        let assets = doc.get_or_insert_map("assets");
        let cited = cited_by(&src, &picked);
        {
            let mut t = doc.transact_mut();
            meta.insert(&mut t, "schema", f64::from(SCHEMA));
            insert_page(&pages, &mut t, 0, None);
            let Some(Out::YMap(pm)) = pages.get(&t, 0) else {
                return Err(CommandError::BadFormat);
            };
            let Some(Out::YArray(els)) = pm.get(&t, "elements") else {
                return Err(CommandError::BadFormat);
            };
            copy_elements(&src, &picked, &mut t, &els, &mut IdMap::new(), 0.0, 0.0);
            copy_asset_meta(&src, self.assets_ref(), &cited, &mut t, &assets);
        }
        decode(&doc)
    }

    /// Document neuf d'une page qui recopie `page` entière (C3) : tous ses champs (fond, grille, mode, champs inconnus)
    /// par `as_prelim` sauf `elements`, recopiés par `copy_elements` ; métadonnées des assets cités recopiées ; aucune
    /// étape d'annulation (écrit sur un `Doc` brut, puis décodé).
    pub fn extract_page(&self, page: &str) -> Result<Document, CommandError> {
        let src = self.read();
        let (_, sp) = self
            .find_page(&src, page)
            .ok_or_else(|| CommandError::UnknownPage(page.to_string()))?;
        let from = elements_of(&src, &sp);
        let cited = cited_by(&src, &from);
        let doc = Doc::new();
        let meta = doc.get_or_insert_map("meta");
        let pages = doc.get_or_insert_array("pages");
        let assets = doc.get_or_insert_map("assets");
        {
            let mut t = doc.transact_mut();
            meta.insert(&mut t, "schema", f64::from(SCHEMA));
            let mut prelim: MapPrelim = sp
                .iter(&src)
                .filter(|(key, _)| *key != "elements")
                .map(|(key, v)| (key, v.as_prelim(&src)))
                .collect();
            prelim.insert(
                "elements".into(),
                In::Array(ArrayPrelim::from(Vec::<In>::new())),
            );
            pages.insert(&mut t, 0, prelim);
            let Some(Out::YMap(pm)) = pages.get(&t, 0) else {
                return Err(CommandError::BadFormat);
            };
            let Some(Out::YArray(els)) = pm.get(&t, "elements") else {
                return Err(CommandError::BadFormat);
            };
            copy_elements(&src, &from, &mut t, &els, &mut IdMap::new(), 0.0, 0.0);
            copy_asset_meta(&src, self.assets_ref(), &cited, &mut t, &assets);
        }
        decode(&doc)
    }

    /// Recopie les éléments de la première page de `src` en haut de `page`, translatés de (dx, dy) ; une transaction
    /// `"local"` (une étape) ; source sans élément : aucune étape (D38).
    pub fn insert_fragment(
        &mut self,
        src: &Document,
        page: &str,
        dx: f64,
        dy: f64,
    ) -> Result<Change, CommandError> {
        if !dx.is_finite() || !dy.is_finite() {
            return Err(CommandError::BadMatrix);
        }
        let into = self.page_elements_or_err(page)?;
        let st = src.read();
        let from = match maps(&st, src.pages_ref()).first() {
            Some(pm) => elements_of(&st, pm),
            None => Vec::new(),
        };
        if from.is_empty() {
            return Ok(self.unchanged());
        }
        // Seuls les assets cités par la page recopiée (la première) viennent avec le fragment.
        let cited = cited_by(&st, &from);
        let assets = self.assets_ref().clone();
        let ids = {
            let mut t = self.transact_local();
            let ids = copy_elements(&st, &from, &mut t, &into, &mut IdMap::new(), dx, dy);
            copy_asset_meta(&st, src.assets_ref(), &cited, &mut t, &assets);
            ids
        };
        Ok(self.done(Change {
            pages: vec![page.to_string()],
            ids,
            ..Default::default()
        }))
    }

    /// Recopie chaque page de `src` en entier (fond, grille, champs inconnus) avec un id neuf, à la suite de `after` ;
    /// une transaction `"local"` ; une table de groupes commune à toutes les pages (Z4).
    pub fn insert_pages(&mut self, src: &Document, after: &str) -> Result<Change, CommandError> {
        let at = {
            let txn = self.read();
            self.find_page(&txn, after)
                .map(|(i, _)| i + 1)
                .ok_or_else(|| CommandError::UnknownPage(after.to_string()))?
        };
        let st = src.read();
        let src_pages = maps(&st, src.pages_ref());
        if src_pages.is_empty() {
            return Ok(self.unchanged());
        }
        let cited: Vec<String> = src.cited_assets().into_iter().map(|a| a.id).collect();
        let mut change = Change::default();
        {
            let pages = self.pages_ref().clone();
            let assets = self.assets_ref().clone();
            let mut t = self.transact_local();
            let mut groups = IdMap::new();
            for (k, sp) in src_pages.iter().enumerate() {
                let index = at + k as u32;
                // Tous les champs de la page sauf ses éléments, recopiés à part (ids neufs, groupes renumérotés).
                let mut prelim: MapPrelim = sp
                    .iter(&st)
                    .filter(|(key, _)| *key != "elements")
                    .map(|(key, v)| (key, v.as_prelim(&st)))
                    .collect();
                let id = yrs::uuid_v4().to_string();
                prelim.insert("id".into(), In::from(id.as_str()));
                prelim.insert(
                    "elements".into(),
                    In::Array(ArrayPrelim::from(Vec::<In>::new())),
                );
                pages.insert(&mut t, index, prelim);
                let Some(Out::YMap(pm)) = pages.get(&t, index) else {
                    continue;
                };
                let Some(Out::YArray(into)) = pm.get(&t, "elements") else {
                    continue;
                };
                let from = elements_of(&st, sp);
                change.ids.extend(copy_elements(
                    &st,
                    &from,
                    &mut t,
                    &into,
                    &mut groups,
                    0.0,
                    0.0,
                ));
                change.pages.push(id);
            }
            copy_asset_meta(&st, src.assets_ref(), &cited, &mut t, &assets);
        }
        Ok(self.done(change))
    }
}

#[cfg(test)]
mod tests {
    use crate::element::Look;
    use yrs::{Any, Array, Map, Out};

    use crate::asset::AssetRef;
    use crate::commands::{Command, CommandError};
    use crate::document::Document;
    use crate::element::{PageLayout, StrokeStyle, PORTRAIT_HEIGHT};
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
            look: Look::default(),
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
            look: Look::default(),
            line: crate::linear::LineInit::default(),
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
    impl Document {
        fn assets_has(&self, id: &str) -> bool {
            let txn = self.read();
            self.assets_ref().get(&txn, id).is_some()
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
            d.extract("absente", std::slice::from_ref(&a)).err(),
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
                look: Look::default(),
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
        assert_eq!(
            f.element(&got[0]).unwrap().text,
            d.element(&t).unwrap().text
        );
        assert_eq!(
            f.element(&got[1]).unwrap().table,
            d.element(&tb).unwrap().table
        );
    }

    #[test]
    fn insert_fragment_copies_only_assets_cited_by_the_first_page() {
        let mut d = Document::blank();
        let p = first(&d);
        let i1 = image(&mut d, &p, A1, "a.png");
        d.apply(Command::add_page(None)).expect("page");
        let p2 = d.page_ids()[1].clone();
        image(&mut d, &p2, A2, "b.png");
        let _ = i1;
        let mut target = Document::blank();
        let tp = first(&target);
        target.insert_fragment(&d, &tp, 0.0, 0.0).expect("insert");
        assert!(target.assets_has(A1));
        assert!(!target.assets_has(A2), "asset d'une autre page recopié");
    }

    #[test]
    fn table_with_merge_and_fill_is_copied() {
        let mut d = Document::blank();
        let p = first(&d);
        let tb = d
            .apply(Command::AddTable {
                page: p.clone(),
                x: 0.0,
                y: 0.0,
                cols: 3,
                rows: 3,
                col_width: 100.0,
                row_height: 40.0,
                color: "#000000".into(),
                size: 24.0,
            })
            .expect("tableau")
            .ids[0]
            .clone();
        let v = d.element(&tb).unwrap().table.unwrap();
        let (r0, r1) = (v.rows[0].id.clone(), v.rows[1].id.clone());
        let (c0, c1) = (v.cols[0].id.clone(), v.cols[1].id.clone());
        d.apply(Command::MergeTableCells {
            id: tb.clone(),
            from: (r0.clone(), c0.clone()),
            to: (r1, c1),
        })
        .expect("fusion");
        d.apply(Command::SetTableFill {
            id: tb.clone(),
            row: r0,
            col: c0,
            to: None,
            fill: Some("#ff0000".into()),
        })
        .expect("remplissage");
        let before = d.element(&tb).unwrap().table.unwrap();
        assert_eq!(before.merges.len(), 1);
        let f = d.extract(&p, std::slice::from_ref(&tb)).expect("extract");
        let got = ids_of(&f);
        assert_eq!(f.element(&got[0]).unwrap().table, Some(before.clone()));
        let mut t = Document::blank();
        let tp = first(&t);
        t.insert_fragment(&f, &tp, 5.0, 5.0).expect("insert");
        let ids = ids_of(&t);
        assert_eq!(t.element(&ids[0]).unwrap().table, Some(before));
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
        assert!(
            f.assets_has(A1) && !f.assets_has(A2),
            "asset non cité recopié"
        );
        assert_eq!(
            (
                cited[0].id.as_str(),
                cited[0].name.as_str(),
                cited[0].mime.as_str()
            ),
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
        let f = src.extract(&sp, std::slice::from_ref(&a)).expect("extract");
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
            .apply(Command::add_page(Some(s0.clone())))
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
        let t1 = d.apply(Command::add_page(Some(t0.clone()))).unwrap().pages[0].clone();
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

    /// Valeur brute d'un champ de page.
    fn raw_page_field(d: &Document, page: &str, key: &str) -> Option<String> {
        let txn = d.read();
        let (_, m) = d.find_page(&txn, page)?;
        crate::element::out_string(m.get(&txn, key))
    }

    #[test]
    fn duplicate_page_new_ids_after_source() {
        let mut d = Document::blank();
        let p0 = first(&d);
        let p1 = d.apply(Command::add_page(Some(p0.clone()))).unwrap().pages[0].clone();
        let src_ids = vec![stroke(&mut d, &p0, 100.0), stroke(&mut d, &p0, 300.0)];
        let grid = GridView {
            visible: true,
            snap: false,
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
                snap: false,
                visible: true,
            }],
        };
        d.apply(Command::SetGrid {
            page: p0.clone(),
            grid: Some(grid.clone()),
        })
        .unwrap();
        for mode in [PageLayout::Portrait, PageLayout::Infinite] {
            d.apply(Command::SetPageMode {
                page: p0.clone(),
                mode,
            })
            .unwrap();
        }
        let n = crate::commands::tests::writes(&d);
        let ch = d
            .apply(Command::DuplicatePage { page: p0.clone() })
            .expect("duplication");
        assert_eq!(n.since(), 1, "une duplication = une transaction");
        let pages = d.page_ids();
        assert_eq!(pages.len(), 3);
        let copy = pages[1].clone();
        assert_eq!(
            (pages[0].as_str(), pages[2].as_str()),
            (p0.as_str(), p1.as_str())
        );
        assert_ne!(copy, p0);
        assert_eq!(ch.pages, vec![copy.clone()]);
        let copy_ids = d.element_ids(&copy);
        assert_eq!(copy_ids.len(), 2);
        assert!(
            copy_ids.iter().all(|id| !src_ids.contains(id)),
            "ids d'éléments neufs"
        );
        assert_eq!(ch.ids, copy_ids);
        assert_eq!(d.element_ids(&p0), src_ids, "source intacte");
        assert_eq!(d.outline(&copy_ids[0]), d.outline(&src_ids[0]));
        let v = d.page(&copy).unwrap();
        assert_eq!(v.grid, Some(grid));
        assert_eq!((v.mode.as_str(), v.height), ("infinite", PORTRAIT_HEIGHT));
        assert!(d.undo());
        assert_eq!(d.page_ids(), vec![p0, p1]);
    }

    #[test]
    fn duplicate_page_unknown_is_refused() {
        let mut d = Document::blank();
        let n = crate::commands::tests::writes(&d);
        assert_eq!(
            d.apply(Command::DuplicatePage {
                page: "absente".into()
            })
            .err(),
            Some(CommandError::UnknownPage("absente".into()))
        );
        assert_eq!((n.since(), d.page_count()), (0, 1));
        assert!(!d.can_undo());
    }

    #[test]
    fn duplicate_page_keeps_unknown_fields() {
        let mut d = Document::blank();
        let p = first(&d);
        {
            let mut txn = d.transact_untracked();
            let (_, m) = d.find_page(&txn, &p).unwrap();
            m.insert(&mut txn, "zzz", "garde");
        }
        let copy = d
            .apply(Command::DuplicatePage { page: p.clone() })
            .expect("duplication")
            .pages[0]
            .clone();
        assert_eq!(raw_page_field(&d, &copy, "zzz").as_deref(), Some("garde"));
        assert_eq!(
            raw_page_field(&d, &copy, "background").as_deref(),
            Some("#ffffff")
        );
        assert_ne!(raw_page_field(&d, &copy, "id"), Some(p));
    }

    #[test]
    fn unknown_kind_element_is_copied_with_its_fields() {
        let d = Document::blank();
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
        assert_eq!(
            e.get(&txn, "foo"),
            Some(Out::Any(Any::String("bar".into())))
        );
        assert_eq!(
            e.get(&txn, "kind"),
            Some(Out::Any(Any::String("sticker".into())))
        );
    }
}
