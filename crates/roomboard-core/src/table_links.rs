//! Objets logés dans une case (personnalisation-3, DA1, DA2) : lien `cell = [tableId, rowId, colId]` sur l'élément ; la
//! page calcule tailles et matrice, le cœur les écrit (`PlaceInCell`, `SetTableLineSizes`) et fait suivre les objets
//! liés quand une ligne ou une colonne bouge (`follow_in`), dans la transaction de la commande : une étape. Le lien vise
//! des ids de ligne et de colonne, jamais des rangs : une ligne insérée avant ne change pas la case.
use std::collections::{HashMap, HashSet};

use yrs::types::AsPrelim;
use yrs::{Any, Array, In, Map, MapPrelim, MapRef, Out, ReadTxn, TransactionMut};

use crate::commands::{valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{
    apply_transform, cell_link_to_any, compose, finite_positive, fits_f32, invert, out_string,
    out_transform, read_cell_link, transform_to_any, Transform, IDENTITY,
};
use crate::table::{
    cell_key, cells_map, insert_cell, merges_of, read_cell, read_raw, Line, RawTable, TableAxis,
    TABLE_KIND,
};

/// Taille d'une ligne ou d'une colonne écrite par `PlaceInCell` (D3).
#[derive(Debug, Clone, PartialEq)]
pub struct LineSize {
    pub table: String,
    pub axis: TableAxis,
    pub line: String,
    pub size: f64,
}

/// Décalage de chaque ligne et colonne lisible depuis le coin du tableau (repère local), par id.
pub(crate) struct Offsets {
    pub cols: HashMap<String, f64>,
    pub rows: HashMap<String, f64>,
    /// Largeur et hauteur totales : un tableau dont la boîte change fait suivre ses lignes liées (OG12, C1, C3).
    pub size: (f64, f64),
}

fn run(lines: &[Line]) -> HashMap<String, f64> {
    let mut acc = 0.0;
    let mut out = HashMap::with_capacity(lines.len());
    for l in lines {
        out.insert(l.id.clone(), acc);
        acc += l.size;
    }
    out
}

pub(crate) fn offsets(raw: &RawTable) -> Offsets {
    Offsets {
        cols: run(&raw.cols),
        rows: run(&raw.rows),
        size: (
            raw.cols.iter().map(|l| l.size).sum(),
            raw.rows.iter().map(|l| l.size).sum(),
        ),
    }
}

fn lines_of(raw: &RawTable, axis: TableAxis) -> (&[Line], &'static str) {
    (raw.axis(axis).0, crate::table::size_key(axis))
}

/// Entrée unique du contrôle des tailles, pour `SetTableLineSizes` et `PlaceInCell` : aucune ligne citée deux fois
/// (le contrôle lirait la dernière taille, l'écriture la première différente), chaque ligne existe, taille finie > 0,
/// total de chaque axe borné en f32 (même garde que T15).
pub(crate) fn line_sizes_ok(raw: &RawTable, sizes: &[(TableAxis, String, f64)]) -> bool {
    if repeats_line(sizes) {
        return false;
    }
    let known = sizes
        .iter()
        .all(|(a, id, s)| finite_positive(*s) && lines_of(raw, *a).0.iter().any(|l| &l.id == id));
    let total = |axis: TableAxis| -> f64 {
        lines_of(raw, axis)
            .0
            .iter()
            .map(|l| {
                sizes
                    .iter()
                    .rev()
                    .find(|(a, id, _)| *a == axis && *id == l.id)
                    .map_or(l.size, |(_, _, s)| *s)
            })
            .sum()
    };
    known && fits_f32(&[total(TableAxis::Row), total(TableAxis::Col)])
}

/// Vrai si une ligne ou une colonne est citée deux fois.
fn repeats_line(sizes: &[(TableAxis, String, f64)]) -> bool {
    let mut seen = HashSet::with_capacity(sizes.len());
    !sizes
        .iter()
        .all(|(a, id, _)| seen.insert((*a == TableAxis::Row, id.as_str())))
}

/// Vrai si chaque taille demandée vaut déjà la taille lue.
pub(crate) fn line_sizes_same(raw: &RawTable, sizes: &[(TableAxis, String, f64)]) -> bool {
    sizes.iter().all(|(a, id, s)| {
        lines_of(raw, *a)
            .0
            .iter()
            .any(|l| &l.id == id && l.size == *s)
    })
}

/// Écrit les tailles qui changent (contrôlées avant par `line_sizes_ok`), dans `Line.map`.
pub(crate) fn write_line_sizes(
    txn: &mut TransactionMut,
    raw: &RawTable,
    sizes: &[(TableAxis, String, f64)],
) {
    for (axis, id, size) in sizes {
        let (lines, key) = lines_of(raw, *axis);
        if let Some(l) = lines.iter().find(|l| &l.id == id && l.size != *size) {
            l.map.insert(txn, key, In::Any(Any::from(*size)));
        }
    }
}

/// Rectangle local `(x0, y0, x1, y1)` de la case `row`, `col` (celui de sa zone si elle en couvre une).
pub(crate) fn cell_rect<T: ReadTxn>(
    raw: &RawTable,
    txn: &T,
    row: &str,
    col: &str,
) -> Option<(f64, f64, f64, f64)> {
    let (r, c) = raw.ranks((row, col))?;
    let (r0, c0, r1, c1) = merges_of(raw, txn)
        .into_iter()
        .find(|m| m.r0 <= r && r <= m.r1 && m.c0 <= c && c <= m.c1)
        .map_or((r, c, r, c), |m| (m.r0, m.c0, m.r1, m.c1));
    let at = |lines: &[Line], i: usize| -> f64 { lines[..i].iter().map(|l| l.size).sum() };
    Some((
        at(&raw.cols, c0),
        at(&raw.rows, r0),
        at(&raw.cols, c1 + 1),
        at(&raw.rows, r1 + 1),
    ))
}

/// Tailles d'un tableau de `PlaceInCell` : id, `Y.Map`, lecture brute, tailles demandées.
type TableSizes = (String, MapRef, RawTable, Vec<(TableAxis, String, f64)>);

impl Document {
    /// D6 : ajoute aux cibles d'une `Transform` les objets liés aux tableaux qu'elles contiennent (l'emport vit dans le
    /// cœur : la CLI pilote `Transform` sans moteur).
    pub(crate) fn with_linked<T: ReadTxn>(
        &self,
        txn: &T,
        targets: &mut Vec<(MapRef, Transform, String, String)>,
    ) {
        let tables: Vec<(String, String)> = targets
            .iter()
            .filter(|(e, _, _, _)| out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND))
            .map(|(_, _, page, id)| (page.clone(), id.clone()))
            .collect();
        for (page, tid) in tables {
            let Some(elements) = self.page_elements(txn, &page) else {
                continue;
            };
            for o in elements.iter(txn) {
                let Out::YMap(e) = o else { continue };
                let Some(link) = read_cell_link(txn, &e) else {
                    continue;
                };
                let Some(id) = out_string(e.get(txn, "id")) else {
                    continue;
                };
                let is_table = out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND);
                if link[0] != tid || is_table || targets.iter().any(|t| t.3 == id) {
                    continue;
                }
                let Some(t) = out_transform(e.get(txn, "transform")) else {
                    continue;
                };
                targets.push((e, t, page.clone(), id));
            }
        }
    }

    /// D6 : ids des cibles liées dont le tableau ne bouge pas et dont le centre de la boîte, après `m`, sort de la case
    /// (bord compris dedans). Tableau absent ou illisible : lien laissé tel quel ; case disparue : lien retiré.
    pub(crate) fn leaving_cells<T: ReadTxn>(
        &self,
        txn: &T,
        targets: &[(MapRef, Transform, String, String)],
        m: &Transform,
    ) -> HashSet<String> {
        let moving: HashSet<&str> = targets.iter().map(|t| t.3.as_str()).collect();
        let mut out = HashSet::new();
        for (e, _, _, id) in targets {
            let Some(link) = read_cell_link(txn, e) else {
                continue;
            };
            if moving.contains(link[0].as_str()) {
                continue;
            }
            let Some(b) = self.element_bounds(txn, e) else {
                continue;
            };
            let (nx, ny) = apply_transform(m, (b.x0 + b.x1) / 2.0, (b.y0 + b.y1) / 2.0);
            let Some(f) = self.find_element(txn, &link[0]) else {
                continue;
            };
            let Some(raw) = read_raw(txn, &f.element) else {
                continue;
            };
            let Some(inv) = invert(&raw.transform) else {
                continue;
            };
            let (lx, ly) = apply_transform(&inv, nx, ny);
            let inside = cell_rect(&raw, txn, &link[1], &link[2])
                .is_some_and(|(x0, y0, x1, y1)| lx >= x0 && lx <= x1 && ly >= y0 && ly <= y1);
            if !inside {
                out.insert(id.clone());
            }
        }
        out
    }

    /// Suivi (D5) dans la transaction ouverte : chaque objet lié au tableau `table_id`, hors `skip`, est translaté du
    /// déplacement du coin de sa case, lu par ids (partie linéaire de la matrice du tableau) ; sa ligne ou sa colonne a
    /// disparu : lien retiré, objet laissé en place (H22). Puis, dans la même transaction (une étape), les lignes liées
    /// (OG12, `linear::follow`) au tableau si sa boîte a changé et aux objets translatés, relus à leur place neuve : une
    /// flèche liée à un objet logé dont la case a bougé suit. Jamais avant la translation (la flèche viserait l'ancienne
    /// place), jamais l'objet seulement délié (resté en place : une ligne déliée garderait ses liaisons). Rend les ids
    /// touchés, dans l'ordre de la pile.
    pub(crate) fn follow_in(
        &self,
        txn: &mut TransactionMut,
        page: &str,
        table: &MapRef,
        table_id: &str,
        before: &Offsets,
        skip: &HashSet<String>,
    ) -> Vec<String> {
        let (touched, mut moved, size) = self.move_linked(txn, page, table, table_id, before, skip);
        if size != before.size {
            moved.insert(0, table_id.to_string());
        }
        if !moved.is_empty() {
            crate::linear::follow(self, txn, &moved, None);
        }
        touched
    }

    /// Translation des objets liés de `follow_in` : (ids touchés, ids translatés, taille du tableau après).
    fn move_linked(
        &self,
        txn: &mut TransactionMut,
        page: &str,
        table: &MapRef,
        table_id: &str,
        before: &Offsets,
        skip: &HashSet<String>,
    ) -> (Vec<String>, Vec<String>, (f64, f64)) {
        let Some(after_raw) = read_raw(&*txn, table) else {
            return (Vec::new(), Vec::new(), before.size);
        };
        let after = offsets(&after_raw);
        let [a, b, c, d, _, _] = after_raw.transform;
        let Some(elements) = self.page_elements(&*txn, page) else {
            return (Vec::new(), Vec::new(), after.size);
        };
        let linked: Vec<(MapRef, String, [String; 3], Option<Transform>)> = elements
            .iter(&*txn)
            .filter_map(|o| {
                let Out::YMap(m) = o else { return None };
                let link = read_cell_link(&*txn, &m)?;
                let id = out_string(m.get(&*txn, "id"))?;
                let is_table = out_string(m.get(&*txn, "kind")).as_deref() == Some(TABLE_KIND);
                if link[0] != table_id || skip.contains(&id) || is_table {
                    return None;
                }
                let t = out_transform(m.get(&*txn, "transform"));
                Some((m, id, link, t))
            })
            .collect();
        let mut touched = Vec::new();
        let mut moved = Vec::new();
        for (m, id, link, t) in linked {
            // Lien déjà sans case avant la commande (D1) : laissé tel quel.
            let (Some(c0), Some(r0)) = (before.cols.get(&link[2]), before.rows.get(&link[1]))
            else {
                continue;
            };
            match (after.cols.get(&link[2]), after.rows.get(&link[1])) {
                (Some(c1), Some(r1)) => {
                    let (dx, dy) = (c1 - c0, r1 - r0);
                    let Some(mut t) = t else { continue };
                    if dx == 0.0 && dy == 0.0 {
                        continue;
                    }
                    t[4] += a * dx + c * dy;
                    t[5] += b * dx + d * dy;
                    m.insert(txn, "transform", transform_to_any(&t));
                    moved.push(id.clone());
                    touched.push(id);
                }
                _ => {
                    m.remove(txn, "cell");
                    touched.push(id);
                }
            }
        }
        (touched, moved, after.size)
    }

    /// Changement d'une commande de tableau : le tableau, puis les objets suivis (ordre de la pile).
    pub(crate) fn table_done_with(&mut self, page: String, id: &str, moved: Vec<String>) -> Change {
        let mut ids = vec![id.to_string()];
        ids.extend(moved.into_iter().filter(|m| m != id));
        self.done(Change {
            pages: vec![page],
            ids,
            ..Default::default()
        })
    }

    /// `SetTableLineSizes` (D4) : tailles par id, objets liés suivis, une étape ; mêmes tailles : aucune étape.
    pub(crate) fn cmd_set_table_line_sizes(
        &mut self,
        id: &str,
        cols: &[(String, f64)],
        rows: &[(String, f64)],
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        let sizes: Vec<(TableAxis, String, f64)> = cols
            .iter()
            .map(|(l, s)| (TableAxis::Col, l.clone(), *s))
            .chain(rows.iter().map(|(l, s)| (TableAxis::Row, l.clone(), *s)))
            .collect();
        if !line_sizes_ok(&raw, &sizes) {
            return Err(CommandError::BadTable);
        }
        if line_sizes_same(&raw, &sizes) {
            return Ok(self.unchanged());
        }
        let before = offsets(&raw);
        let moved = {
            let mut txn = self.transact_local();
            write_line_sizes(&mut txn, &raw, &sizes);
            self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())
        };
        Ok(self.table_done_with(page, id, moved))
    }

    /// `ReorderTableLines` (D18) : `order` = permutation des ids lisibles de l'axe. Les places brutes des entrées
    /// lisibles (`Line.index`, lues avant la transaction) reçoivent, dans l'ordre demandé, une recopie de chaque entrée
    /// prise avant toute écriture (`as_prelim` : clés inconnues gardées) ; une place = `remove` puis `insert` au même
    /// rang, la longueur du `Y.Array` ne bouge pas et aucune place ne glisse. Entrées illisibles laissées à leur place ;
    /// cellules (par ids) inchangées ; une zone ne peut pas être coupée ni retournée ; objets liés suivis dans la même
    /// transaction (`follow_in`, comme `cmd_set_table_line_sizes`) ; ordre inchangé : aucune étape.
    pub(crate) fn cmd_reorder_table_lines(
        &mut self,
        id: &str,
        axis: TableAxis,
        order: &[String],
    ) -> Result<Change, CommandError> {
        // La valeur seule d'abord, avant la recherche du tableau (comme `cmd_set_table_look`) : vide ou id cité deux
        // fois. `order` n'est pas borné : doublon par tri d'une copie des références puis voisins comparés, en
        // O(n log n) (G4 : aucun code de hachage neuf).
        let mut sorted: Vec<&String> = order.iter().collect();
        sorted.sort_unstable();
        let repeated = sorted.windows(2).any(|w| w[0] == w[1]);
        if order.is_empty() || repeated {
            return Err(CommandError::BadTable);
        }
        let (page, e, raw) = self.table_of(id)?;
        let (lines, arr) = raw.axis(axis);
        let pos = |id: &str| order.iter().position(|o| o == id);
        if order.len() != lines.len() || lines.iter().any(|l| pos(&l.id).is_none()) {
            return Err(CommandError::BadTable);
        }
        if lines.iter().zip(order).all(|(l, o)| &l.id == o) {
            return Ok(self.unchanged());
        }
        {
            let txn = self.read();
            for m in merges_of(&raw, &txn) {
                let (a, b) = match axis {
                    TableAxis::Row => (m.r0, m.r1),
                    TableAxis::Col => (m.c0, m.c1),
                };
                let start = pos(&lines[a].id);
                if (a..=b).any(|k| pos(&lines[k].id) != start.map(|s| s + (k - a))) {
                    return Err(CommandError::BadTable);
                }
            }
        }
        let before = offsets(&raw);
        let moved = {
            let mut txn = self.transact_local();
            let copies: Vec<MapPrelim> = order
                .iter()
                .filter_map(|o| lines.iter().find(|l| &l.id == o))
                .map(|l| l.map.as_prelim(&txn))
                .collect();
            for (l, copy) in lines.iter().zip(copies) {
                arr.remove(&mut txn, l.index);
                arr.insert(&mut txn, l.index, copy);
            }
            self.follow_in(&mut txn, &page, &e, id, &before, &HashSet::new())
        };
        Ok(self.table_done_with(page, id, moved))
    }

    /// `SetTableOptions` (T7) : `fit` et `header`, seulement ce qui change ; une étape ; rien ne change : aucune étape.
    pub(crate) fn cmd_set_table_options(
        &mut self,
        id: &str,
        fit: Option<&str>,
        header: Option<bool>,
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        if !matches!(fit, None | Some("grow" | "shrink")) {
            return Err(CommandError::BadTable);
        }
        let shrink = fit
            .map(|f| f == "shrink")
            .filter(|s| *s != raw.fit.is_some());
        let head = header.filter(|h| *h != raw.header);
        if shrink.is_none() && head.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            match shrink {
                Some(true) => {
                    e.insert(&mut txn, "fit", "shrink");
                }
                Some(false) => {
                    e.remove(&mut txn, "fit");
                }
                None => {}
            }
            match head {
                Some(true) => {
                    e.insert(&mut txn, "header", true);
                }
                Some(false) => {
                    e.remove(&mut txn, "header");
                }
                None => {}
            }
        }
        Ok(self.table_done(page, id))
    }

    /// `SetCellImage` (T9) : `Some(image)` : l'image logée dans cette case devient son fond `bg` (asset de l'image, image
    /// retirée de la page), une étape ; image non logée dans cette case : `BadTable`. `None` : `bg` retiré, aucune étape
    /// s'il n'y en avait pas.
    pub(crate) fn cmd_set_cell_image(
        &mut self,
        id: &str,
        row: &str,
        col: &str,
        from: Option<&str>,
    ) -> Result<Change, CommandError> {
        let (page, e, raw) = self.table_of(id)?;
        if !raw.rows.iter().any(|l| l.id == row) || !raw.cols.iter().any(|l| l.id == col) {
            return Err(CommandError::BadTable);
        }
        let current = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), row, col)
        };
        let Some(image) = from else {
            let Some(cell) = current.filter(|c| c.bg.is_some()) else {
                return Ok(self.unchanged());
            };
            {
                let mut txn = self.transact_local();
                cell.map.remove(&mut txn, "bg");
            }
            return Ok(self.table_done(page, id));
        };
        let (asset, elements, index) = {
            let txn = self.read();
            let f = self
                .find_element(&txn, image)
                .ok_or_else(|| CommandError::UnknownElement(image.to_string()))?;
            let linked = read_cell_link(&txn, &f.element)
                .is_some_and(|l| l[0] == id && l[1] == row && l[2] == col);
            let asset =
                out_string(f.element.get(&txn, "asset")).filter(|a| crate::asset::is_asset_id(a));
            let is_image = out_string(f.element.get(&txn, "kind")).as_deref() == Some("image");
            match asset {
                Some(a) if linked && is_image && f.page_id == page => (a, f.elements, f.index),
                _ => return Err(CommandError::BadTable),
            }
        };
        {
            let mut txn = self.transact_local();
            match current {
                Some(c) => {
                    c.map.insert(&mut txn, "bg", In::from(asset.as_str()));
                }
                None => {
                    let cells = cells_map(&mut txn, &e, raw.cells.as_ref());
                    insert_cell(
                        &mut txn,
                        &cells,
                        cell_key(row, col),
                        "",
                        vec![("bg", In::from(asset.as_str()))],
                    );
                }
            }
            elements.remove(&mut txn, index);
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            removed: vec![image.to_string()],
            ..Default::default()
        }))
    }

    /// T5 : retire les éléments `ids` placés sous le tableau `table` de `page` et les réinsère juste au-dessus de lui,
    /// dans l'ordre de la pile (`reinsert_kept`, même transaction : une étape).
    fn lift_above(&self, txn: &mut TransactionMut, page: &str, table: &str, ids: &HashSet<String>) {
        let Some(elements) = self.page_elements(&*txn, page) else {
            return;
        };
        let at = |want: &dyn Fn(&str) -> bool| -> Vec<(u32, MapRef)> {
            elements
                .iter(&*txn)
                .enumerate()
                .filter_map(|(i, o)| match o {
                    Out::YMap(m) => out_string(m.get(&*txn, "id"))
                        .filter(|id| want(id))
                        .map(|_| (i as u32, m)),
                    _ => None,
                })
                .collect()
        };
        let Some(ti) = at(&|id| id == table).first().map(|(i, _)| *i) else {
            return;
        };
        let moves: Vec<(u32, MapPrelim)> = at(&|id| ids.contains(id))
            .into_iter()
            .filter(|(i, _)| *i < ti)
            .map(|(i, m)| (i, m.as_prelim(&*txn)))
            .collect();
        if moves.is_empty() {
            return;
        }
        let to = ti + 1 - moves.len() as u32;
        crate::copy::reinsert_kept(&elements, txn, moves, to);
    }

    /// Case visée (D35) : tableau connu, même page, ligne et colonne connues, case sans `shade` ; sinon `BadTable`.
    pub(crate) fn check_cell_target(
        &self,
        page: &str,
        l: &[String; 3],
    ) -> Result<(), CommandError> {
        let (tpage, _, raw) = self.table_of(&l[0])?;
        if tpage != page {
            return Err(CommandError::BadTable);
        }
        raw.ranks((l[1].as_str(), l[2].as_str()))
            .ok_or(CommandError::BadTable)?;
        let shaded = {
            let txn = self.read();
            read_cell(&txn, raw.cells.as_ref(), &l[1], &l[2]).is_some_and(|x| x.shade.is_some())
        };
        if shaded {
            return Err(CommandError::BadTable);
        }
        Ok(())
    }

    /// `PlaceInCell` (D3) : refus dans l'ordre du plan (T1a) ; puis une transaction : tailles et suivi des autres objets
    /// liés, matrice composée sur `ids`, `cell` posé ou retiré.
    pub(crate) fn cmd_place_in_cell(
        &mut self,
        ids: &[String],
        m: &Transform,
        cell: Option<&[String; 3]>,
        sizes: &[LineSize],
    ) -> Result<Change, CommandError> {
        // 1. Matrice invalide.
        if !valid_matrix(m) {
            return Err(CommandError::BadMatrix);
        }
        // 2. Un tableau parmi les ids (D36).
        let (found, same_links) = {
            let txn = self.read();
            let found = self.find_unique(&txn, ids);
            if found.iter().any(|(_, f)| {
                out_string(f.element.get(&txn, "kind")).as_deref() == Some(TABLE_KIND)
            }) {
                return Err(CommandError::BadTable);
            }
            // Comme `Transform` : un objet au transform illisible est écarté (ni matrice, ni lien).
            let found: Vec<_> = found
                .into_iter()
                .filter(|(_, f)| out_transform(f.element.get(&txn, "transform")).is_some())
                .collect();
            let same = found
                .iter()
                .all(|(_, f)| read_cell_link(&txn, &f.element).as_ref() == cell);
            (found, same)
        };
        // 3. Aucun id trouvé : aucune étape. 4. Plusieurs pages.
        let Some(page) = found.first().map(|(_, f)| f.page_id.clone()) else {
            return Ok(self.unchanged());
        };
        if found.iter().any(|(_, f)| f.page_id != page) {
            return Err(CommandError::BadTable);
        }
        // 5. Case visée : tableau connu, même page, ligne et colonne connues, case sans `shade` (D35).
        if let Some(l) = cell {
            self.check_cell_target(&page, l)?;
        }
        // 6. Tableaux des tailles, dans l'ordre d'apparition.
        let mut tables: Vec<TableSizes> = Vec::new();
        for s in sizes {
            if !tables.iter().any(|t| t.0 == s.table) {
                let (tpage, e, raw) = self.table_of(&s.table)?;
                if tpage != page {
                    return Err(CommandError::BadTable);
                }
                tables.push((s.table.clone(), e, raw, Vec::new()));
            }
            if let Some(t) = tables.iter_mut().find(|t| t.0 == s.table) {
                t.3.push((s.axis, s.line.clone(), s.size));
            }
        }
        if !tables
            .iter()
            .all(|(_, _, raw, list)| line_sizes_ok(raw, list))
        {
            return Err(CommandError::BadTable);
        }
        // 7. Matrice composée invalide.
        let composed: Vec<Transform> = {
            let txn = self.read();
            found
                .iter()
                .filter_map(|(_, f)| {
                    out_transform(f.element.get(&txn, "transform")).map(|t| compose(m, &t))
                })
                .collect()
        };
        if !composed.iter().all(valid_matrix) {
            return Err(CommandError::BadMatrix);
        }
        // 8. Rien ne change : aucune étape.
        if *m == IDENTITY
            && same_links
            && tables
                .iter()
                .all(|(_, _, raw, list)| line_sizes_same(raw, list))
        {
            return Ok(self.unchanged());
        }
        let skip: HashSet<String> = found.iter().map(|(id, _)| id.clone()).collect();
        let mut touched: Vec<String> = skip.iter().cloned().collect();
        {
            let mut txn = self.transact_local();
            for (tid, e, raw, list) in &tables {
                let before = offsets(raw);
                write_line_sizes(&mut txn, raw, list);
                touched.push(tid.clone());
                touched.extend(self.follow_in(&mut txn, &page, e, tid, &before, &skip));
            }
            for ((_, f), c) in found.iter().zip(&composed) {
                if *m != IDENTITY {
                    f.element.insert(&mut txn, "transform", transform_to_any(c));
                }
                match cell {
                    Some(l) => {
                        f.element.insert(&mut txn, "cell", cell_link_to_any(l));
                    }
                    None => {
                        f.element.remove(&mut txn, "cell");
                    }
                }
            }
            // T5 : les objets logés situés sous le tableau visé montent juste au-dessus de lui, ordre gardé. Après
            // l'écriture de `matrix` et `cell` : la recopie de `reinsert_kept` emporte tous les champs, lien compris.
            if let Some(l) = cell {
                self.lift_above(&mut txn, &page, &l[0], &skip);
            }
            // OG12 (n° 7, 8), comme `cmd_transform` : objets placés déplacés par `m`, leurs lignes liées suivent (rupture
            // pour une ligne placée), après l'écriture des matrices, même étape. Sans déplacement : aucun suivi.
            if *m != IDENTITY {
                let placed: Vec<String> = found.iter().map(|(id, _)| id.clone()).collect();
                touched.extend(crate::linear::follow(self, &mut txn, &placed, Some(m)));
            }
        }
        crate::order::sort_stable_by(&mut touched, String::cmp);
        touched.dedup();
        Ok(self.done(Change {
            pages: vec![page],
            ids: touched,
            ..Default::default()
        }))
    }
}

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
            line: crate::linear::LineInit::default(),
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
        assert_eq!(
            c.ids, want,
            "ids triés : objet placé et tableau des tailles"
        );
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
        assert_eq!(
            d.element(&o).expect("o").cell,
            Some(linked.clone()),
            "lien par ids"
        );
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
    fn set_table_options_writes_fit_and_header() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        d.apply(Command::SetTableOptions {
            id: t.clone(),
            fit: Some("shrink".into()),
            header: Some(true),
        })
        .expect("options");
        assert_eq!(view(&d, &t).fit.as_deref(), Some("shrink"));
        assert!(view(&d, &t).header);
        let v = d.version();
        d.apply(Command::SetTableOptions {
            id: t.clone(),
            fit: Some("shrink".into()),
            header: None,
        })
        .expect("même");
        assert_eq!(d.version(), v);
        assert_eq!(
            d.apply(Command::SetTableOptions {
                id: t.clone(),
                fit: Some("zz".into()),
                header: None
            }),
            Err(CommandError::BadTable)
        );
        d.apply(Command::SetTableOptions {
            id: t.clone(),
            fit: Some("grow".into()),
            header: Some(false),
        })
        .expect("retour");
        assert_eq!(view(&d, &t).fit, None);
        assert!(!view(&d, &t).header);
    }

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

    // T5 : une copie n'est jamais liée au tableau d'origine (elle vise le tableau copié).
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
        assert_eq!(
            raw_link(&d, &o),
            Some(link(&d, &t, 1, 1)),
            "l'original garde son lien"
        );
    }

    // D6 : un tableau déplacé emporte ses objets liés, dans le cœur (la CLI pilote `Transform` sans moteur) ; une
    // seule étape d'annulation (G12).
    #[test]
    fn transform_table_carries_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 0, 0)),
            sizes: vec![],
        })
        .expect("logé");
        let at = tx(&d, &o);
        let c = d
            .apply(Command::Transform {
                ids: vec![t.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 50.0, 20.0],
            })
            .expect("déplacé");
        assert_eq!((tx(&d, &o)[4], tx(&d, &o)[5]), (at[4] + 50.0, at[5] + 20.0));
        assert_eq!(raw_link(&d, &o), Some(link(&d, &t, 0, 0)), "lien gardé");
        let mut want = vec![t.clone(), o.clone()];
        want.sort();
        assert_eq!(c.ids, want);
        assert!(d.undo());
        assert_eq!(tx(&d, &o), at, "une annulation ramène l'objet");
        assert_eq!(tx(&d, &t)[4], 0.0, "et le tableau, dans la même étape");
    }

    // G9 : sans objet lié, la `Transform` d'un tableau est celle d'aujourd'hui.
    #[test]
    fn transform_table_without_links_unchanged() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1050.0, 1040.0);
        let at = tx(&d, &o);
        let c = d
            .apply(Command::Transform {
                ids: vec![t.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 50.0, 20.0],
            })
            .expect("déplacé");
        assert_eq!(c.ids, vec![t.clone()]);
        assert_eq!(tx(&d, &o), at);
    }

    // D6, H24 : objet lié déplacé seul : lien gardé si son centre reste dans sa case, retiré sinon, dans la transaction
    // de la `Transform` (jamais par une seconde commande) : une annulation rend position et lien.
    #[test]
    fn transform_out_of_cell_unlinks() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 10.0, 10.0, 50.0, 40.0);
        d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 0, 0)),
            sizes: vec![],
        })
        .expect("logé");
        d.apply(Command::Transform {
            ids: vec![o.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 0.0],
        })
        .expect("dedans");
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 0, 0)));
        let inside = tx(&d, &o);
        let c = d
            .apply(Command::Transform {
                ids: vec![o.clone()],
                matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 500.0],
            })
            .expect("dehors");
        assert_eq!(d.element(&o).expect("o").cell, None);
        assert_eq!(raw_link(&d, &o), None, "clé retirée");
        assert_eq!(c.ids, vec![o.clone()]);
        assert!(d.undo());
        assert_eq!(tx(&d, &o), inside, "une annulation rend la position");
        assert_eq!(
            raw_link(&d, &o),
            Some(link(&d, &t, 0, 0)),
            "et le lien, dans la même étape"
        );
    }

    // T5 : la copie d'une page relie l'objet copié au tableau copié (mêmes ids de ligne et de colonne).
    #[test]
    fn duplicate_page_keeps_cell_links() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        place11(&mut d, &t, &o);
        d.apply(Command::DuplicatePage { page: p.clone() })
            .expect("dup");
        let p2 = d.page_ids().into_iter().find(|x| *x != p).expect("page 2");
        let ids = d.element_ids(&p2);
        let t2 = ids
            .iter()
            .find(|id| d.element(id).is_some_and(|v| v.kind == "table"))
            .expect("t2")
            .clone();
        let o2 = ids
            .iter()
            .find(|id| d.element(id).is_some_and(|v| v.kind == "shape"))
            .expect("o2")
            .clone();
        let l = d.element(&o2).and_then(|v| v.cell).expect("lien copié");
        assert_eq!(l[0], t2);
        assert_eq!(&l[1..], &link(&d, &t, 1, 1)[1..]);
    }

    // T5, patron écarté : un objet passé sous son tableau est recopié avant lui ; renuméroter au fil de la recopie
    // perdrait le lien (id neuf du tableau pas encore connu).
    #[test]
    fn object_below_its_table_is_relinked() {
        let mut d = Document::blank();
        let p = first(&d);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let t = table3(&mut d, &p);
        d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: IDENTITY,
            cell: Some(link(&d, &t, 0, 0)),
            sizes: vec![],
        })
        .expect("logé");
        d.apply(Command::Restack {
            ids: vec![o.clone()],
            to: 0,
        })
        .expect("dessous");
        assert_eq!(d.element_ids(&p), vec![o.clone(), t.clone()]);
        d.apply(Command::DuplicatePage { page: p.clone() })
            .expect("dup");
        let p2 = d.page_ids().into_iter().find(|x| *x != p).expect("page 2");
        let ids = d.element_ids(&p2);
        let t2 = ids
            .iter()
            .find(|id| d.element(id).is_some_and(|v| v.kind == "table"))
            .expect("t2")
            .clone();
        assert_eq!(
            d.element(&ids[0])
                .and_then(|v| v.cell)
                .map(|l| l[0].clone()),
            Some(t2)
        );
    }

    // T5 : la mise en case monte l'objet posé avant le tableau juste au-dessus de lui, lien gardé ; une étape.
    #[test]
    fn place_in_cell_lifts_object_above_table() {
        let mut d = Document::blank();
        let p = first(&d);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1100.0);
        let t = table3(&mut d, &p);
        place11(&mut d, &t, &o);
        let ids = d.element_ids(&p);
        assert_eq!(ids, vec![t.clone(), o.clone()]);
        assert_eq!(d.element(&o).expect("o").cell, Some(link(&d, &t, 1, 1)));
        assert!(d.undo());
        assert_eq!(d.element_ids(&p), vec![o, t]);
    }

    // Défaut T2a : une ligne citée deux fois était contrôlée sur sa dernière taille mais écrite avec la première
    // différente ; la liste est refusée, rien d'écrit, aucune étape.
    #[test]
    fn set_table_line_sizes_refuses_repeated_line() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let v = view(&d, &t);
        let (c0, r0) = (v.cols[0].id.clone(), v.rows[0].id.clone());
        let ver = d.version();
        type Lines = Vec<(String, f64)>;
        let cases: [(Lines, Lines); 3] = [
            (vec![(c0.clone(), 400.0), (c0.clone(), 240.0)], vec![]),
            (vec![(c0.clone(), 1e39), (c0.clone(), 240.0)], vec![]),
            (vec![], vec![(r0.clone(), 100.0), (r0.clone(), 64.0)]),
        ];
        for (cols, rows) in cases {
            assert_eq!(
                d.apply(Command::SetTableLineSizes {
                    id: t.clone(),
                    cols,
                    rows,
                }),
                Err(CommandError::BadTable)
            );
        }
        assert_eq!(view(&d, &t).cols[0].width, 240.0);
        assert_eq!(view(&d, &t).rows[0].height, 64.0);
        assert_eq!(d.version(), ver);
    }
    // Constat C2-1 : `PlaceInCell` contrôlait la dernière taille d'une ligne citée deux fois, l'écriture posait la
    // première différente ; la liste est refusée comme pour `SetTableLineSizes`, rien d'écrit.
    #[test]
    fn place_in_cell_refuses_repeated_line() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 10.0, 10.0, 50.0, 50.0);
        let c0 = view(&d, &t).cols[0].id.clone();
        let ver = d.version();
        for (a, b) in [(400.0, 240.0), (1e39, 240.0)] {
            let size = |size: f64| LineSize {
                table: t.clone(),
                axis: TableAxis::Col,
                line: c0.clone(),
                size,
            };
            assert_eq!(
                d.apply(Command::PlaceInCell {
                    ids: vec![o.clone()],
                    matrix: IDENTITY,
                    cell: Some(link(&d, &t, 0, 0)),
                    sizes: vec![size(a), size(b)],
                }),
                Err(CommandError::BadTable)
            );
        }
        assert_eq!(view(&d, &t).cols[0].width, 240.0);
        assert_eq!(d.version(), ver);
    }

    // Constat C2-3 : un objet au transform illisible est écarté, comme par `Transform` ; ni matrice, ni lien écrits.
    #[test]
    fn place_in_cell_ignores_unreadable_transform() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 10.0, 10.0, 50.0, 50.0);
        {
            let mut txn = d.transact_untracked();
            let f = d.find_element(&txn, &o).expect("objet");
            f.element.insert(&mut txn, "transform", "illisible");
        }
        let ver = d.version();
        let r = d.apply(Command::PlaceInCell {
            ids: vec![o.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 5.0, 5.0],
            cell: Some(link(&d, &t, 0, 0)),
            sizes: vec![],
        });
        assert!(r.is_ok());
        assert_eq!(raw_link(&d, &o), None);
        assert_eq!(d.version(), ver);
    }

    #[test]
    fn commit_stroke_with_cell() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let l = link(&d, &t, 1, 0);
        let c = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: vec![20.0, 90.0, 0.5, 100.0, 100.0, 0.5, 180.0, 95.0, 0.5],
                style: StrokeStyle {
                    color: "#000000".into(),
                    width: 4.0,
                },
                look: Look::default(),
                cell: Some(l.clone()),
            })
            .expect("trait");
        let s = c.ids[0].clone();
        assert_eq!(raw_link(&d, &s), Some(l));
        let y = tx(&d, &s)[5];
        d.apply(Command::InsertTableLine {
            id: t.clone(),
            axis: TableAxis::Row,
            at: 1,
        })
        .expect("ligne");
        assert_eq!(tx(&d, &s)[5], y + 64.0);
    }

    #[test]
    fn commit_stroke_with_bad_cell_is_refused() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let mut l = link(&d, &t, 1, 0);
        l[1] = "inconnue".into();
        let r = d.apply(Command::CommitStroke {
            page: p.clone(),
            points: vec![20.0, 90.0, 0.5, 100.0, 100.0, 0.5],
            style: StrokeStyle {
                color: "#000000".into(),
                width: 4.0,
            },
            look: Look::default(),
            cell: Some(l),
        });
        assert!(matches!(r, Err(CommandError::BadTable)));
    }

    // T9 (aide) : image 1 × 1 libre sur la page, asset de test.
    fn add_png_image(d: &mut Document, p: &str) -> String {
        use crate::asset::AssetRef;
        d.apply(Command::AddImage {
            page: p.into(),
            asset: AssetRef {
                id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                name: "photo.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 100.0,
            h: 100.0,
            matrix: IDENTITY,
        })
        .expect("image")
        .ids[0]
            .clone()
    }

    // S5 (cœur) : l'image logée devient le fond de sa case, une étape ; Ctrl+Z la rend.
    #[test]
    fn set_cell_image_takes_asset_and_removes_image() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let img = add_png_image(&mut d, &p);
        place11(&mut d, &t, &img);
        let l = link(&d, &t, 1, 1);
        d.apply(Command::SetCellImage {
            id: t.clone(),
            row: l[1].clone(),
            col: l[2].clone(),
            from: Some(img.clone()),
        })
        .expect("fond");
        assert!(d.element(&img).is_none());
        assert!(view(&d, &t)
            .cells
            .iter()
            .any(|c| c.row == l[1] && c.col == l[2] && c.bg.is_some()));
        assert!(d.undo());
        assert!(d.element(&img).is_some());
        assert_eq!(d.element(&img).expect("image").cell, Some(l.clone()));
        assert!(view(&d, &t).cells.iter().all(|c| c.bg.is_none()));
        // `None` retire le fond ; sans fond : aucune étape.
        d.apply(Command::SetCellImage {
            id: t.clone(),
            row: l[1].clone(),
            col: l[2].clone(),
            from: Some(img.clone()),
        })
        .expect("fond");
        d.apply(Command::SetCellImage {
            id: t.clone(),
            row: l[1].clone(),
            col: l[2].clone(),
            from: None,
        })
        .expect("retrait");
        assert!(view(&d, &t).cells.iter().all(|c| c.bg.is_none()));
        let v = d.version();
        d.apply(Command::SetCellImage {
            id: t,
            row: l[1].clone(),
            col: l[2].clone(),
            from: None,
        })
        .expect("rien");
        assert_eq!(d.version(), v);
    }

    #[test]
    fn set_cell_image_refuses_unlinked() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let img = add_png_image(&mut d, &p);
        let l = link(&d, &t, 1, 1);
        assert_eq!(
            d.apply(Command::SetCellImage {
                id: t,
                row: l[1].clone(),
                col: l[2].clone(),
                from: Some(img)
            }),
            Err(CommandError::BadTable)
        );
    }

    // U3 : l'asset de `bg` reste cité, donc gardé à l'enregistrement et au rechargement.
    #[test]
    fn cell_image_asset_kept_on_save() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-27T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let img = add_png_image(&mut d, &p);
        place11(&mut d, &t, &img);
        let l = link(&d, &t, 1, 1);
        d.apply(Command::SetCellImage {
            id: t.clone(),
            row: l[1].clone(),
            col: l[2].clone(),
            from: Some(img),
        })
        .expect("fond");
        assert_eq!(d.cited_assets().len(), 1);
        let back = load(&save(&d, &meta).expect("save")).expect("load");
        assert_eq!(back.cited_assets().len(), 1);
        assert!(view(&back, &t).cells.iter().any(|c| c.bg.is_some()));
    }

    fn reorder(id: &str, order: Vec<String>) -> Command {
        Command::ReorderTableLines {
            id: id.into(),
            axis: TableAxis::Row,
            order,
        }
    }
    fn row_ids(d: &Document, t: &str) -> Vec<String> {
        view(d, t).rows.iter().map(|x| x.id.clone()).collect()
    }

    // personnalisation-3 (D18, G7) : une étape ; même ordre : aucune ; annuler rend l'ordre d'origine.
    #[test]
    fn reorder_table_lines_rows_and_undo() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let c = d
            .apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()]))
            .expect("ordre");
        assert_eq!(c.ids, vec![t.clone()]);
        assert_eq!(
            row_ids(&d, &t),
            vec![r[2].clone(), r[0].clone(), r[1].clone()]
        );
        let v = d.version();
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()]))
            .expect("même");
        assert_eq!(d.version(), v);
        assert!(d.undo());
        assert_eq!(row_ids(&d, &t), r);
    }

    // D18 : permutation fausse : `BadTable` ; la valeur est refusée avant la recherche du tableau (doublon sur un
    // tableau inconnu : `BadTable`) ; ordre valable sur un tableau inconnu : `UnknownElement`.
    #[test]
    fn reorder_refuses_bad_order() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let v = d.version();
        for o in [
            vec![r[0].clone(), r[1].clone()],
            vec![r[0].clone(), r[0].clone(), r[1].clone()],
            vec![r[0].clone(), r[1].clone(), "zz".into()],
            vec![],
        ] {
            assert_eq!(d.apply(reorder(&t, o)), Err(CommandError::BadTable));
        }
        assert_eq!(d.version(), v);
        assert_eq!(
            d.apply(reorder("zz", vec![r[0].clone(), r[0].clone()])),
            Err(CommandError::BadTable)
        );
        assert_eq!(
            d.apply(reorder("zz", r)),
            Err(CommandError::UnknownElement("zz".into()))
        );
    }

    // C1 : doublon cherché par tri d'une copie des références puis voisins comparés (`windows(2)`), plus en O(n²) :
    // 20 000 ids au long préfixe commun, le doublon en dernier (le pire cas de la recherche linéaire), refusé vite.
    #[test]
    fn reorder_refuses_long_order_with_duplicate_fast() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let mut o: Vec<String> = (0..20_000)
            .map(|i| format!("{}{i}", "ligne-".repeat(20)))
            .collect();
        o[19_999] = o[0].clone();
        let v = d.version();
        let start = std::time::Instant::now();
        assert_eq!(d.apply(reorder(&t, o)), Err(CommandError::BadTable));
        assert!(start.elapsed() < std::time::Duration::from_secs(2));
        assert_eq!(d.version(), v);
    }

    // S11 : une zone coupée est refusée sans écriture ; la zone entière déplacée (même ordre interne) passe.
    #[test]
    fn reorder_refuses_cut_merge() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let c0 = view(&d, &t).cols[0].id.clone();
        d.apply(Command::MergeTableCells {
            id: t.clone(),
            from: (r[0].clone(), c0.clone()),
            to: (r[1].clone(), c0),
        })
        .expect("fusion");
        let ver = d.version();
        for o in [
            vec![r[0].clone(), r[2].clone(), r[1].clone()],
            vec![r[1].clone(), r[0].clone(), r[2].clone()],
        ] {
            assert_eq!(d.apply(reorder(&t, o)), Err(CommandError::BadTable));
        }
        assert_eq!(d.version(), ver);
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()]))
            .expect("zone entière déplacée");
        assert_eq!(
            row_ids(&d, &t),
            vec![r[2].clone(), r[0].clone(), r[1].clone()]
        );
    }

    // D5 : l'objet logé en (1, 1) suit sa ligne, dans la même transaction.
    #[test]
    fn reorder_moves_linked_objects() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let o = rect(&mut d, &p, 1000.0, 1000.0, 1100.0, 1050.0);
        place11(&mut d, &t, &o);
        let y0 = tx(&d, &o)[5];
        let h0 = view(&d, &t).rows[0].height;
        let r = row_ids(&d, &t);
        let c = d
            .apply(reorder(&t, vec![r[1].clone(), r[0].clone(), r[2].clone()]))
            .expect("ordre");
        assert_eq!(c.ids, vec![t.clone(), o.clone()]);
        assert_eq!(tx(&d, &o)[5], y0 - h0);
        assert!(d.undo());
        assert_eq!(tx(&d, &o)[5], y0);
    }

    // S17 (U3) : l'ordre écrit se relit, et un enregistrement relu redonne les mêmes octets.
    #[test]
    fn reorder_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-28T00:00:00Z".into(),
            created: None,
        };
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        d.apply(reorder(&t, vec![r[2].clone(), r[1].clone(), r[0].clone()]))
            .expect("ordre");
        let file = save(
            &load(&save(&d, &meta).expect("save")).expect("load 1"),
            &meta,
        )
        .expect("resave 1");
        let again = save(&load(&file).expect("load 2"), &meta).expect("resave 2");
        assert_eq!(file, again);
        assert_eq!(
            row_ids(&load(&file).expect("load"), &t),
            vec![r[2].clone(), r[1].clone(), r[0].clone()]
        );
    }

    // Patron écarté (T4) : les places brutes (`Line.index`, entrées illisibles comprises) reçoivent les recopies
    // `as_prelim`, pas les rangs lisibles ; une entrée illisible en tête reste à sa place, une clé inconnue suit sa
    // ligne ; annuler rend le `Y.Array` d'origine.
    #[test]
    fn reorder_keeps_raw_slots_and_unknown_keys() {
        let mut d = Document::blank();
        let p = first(&d);
        let t = table3(&mut d, &p);
        let r = row_ids(&d, &t);
        let rows_arr = |d: &Document| {
            let txn = d.read();
            let f = d.find_element(&txn, &t).expect("t");
            match f.element.get(&txn, "rows") {
                Some(yrs::Out::YArray(a)) => a,
                _ => panic!("rows"),
            }
        };
        let raw = |d: &Document| -> Vec<(Option<String>, Option<String>)> {
            let a = rows_arr(d);
            let txn = d.read();
            a.iter(&txn)
                .map(|o| match o {
                    yrs::Out::YMap(m) => (
                        crate::element::out_string(m.get(&txn, "id")),
                        crate::element::out_string(m.get(&txn, "zz")),
                    ),
                    _ => (None, None),
                })
                .collect()
        };
        {
            let a = rows_arr(&d);
            let mut txn = d.transact_untracked();
            let Some(yrs::Out::YMap(m)) = a.get(&txn, 2) else {
                panic!("ligne 2")
            };
            m.insert(&mut txn, "zz", "garde");
            a.insert(&mut txn, 0, MapPrelim::from([("height", In::from(10.0))]));
        }
        let before = raw(&d);
        assert_eq!(before.len(), 4);
        assert_eq!(before[0], (None, None));
        assert_eq!(row_ids(&d, &t), r);
        d.apply(reorder(&t, vec![r[2].clone(), r[0].clone(), r[1].clone()]))
            .expect("ordre");
        assert_eq!(
            raw(&d),
            vec![
                (None, None),
                (Some(r[2].clone()), Some("garde".into())),
                (Some(r[0].clone()), None),
                (Some(r[1].clone()), None),
            ]
        );
        assert!(d.undo());
        assert_eq!(raw(&d), before);
    }
}
