//! OG23 (DA-2) : aligner, répartir, retourner, tourner. Répartir adapte `distributeElements` d'Excalidraw
//! (packages/element/src/distribute.ts), Copyright (c) 2020 Excalidraw, licence MIT ; le retournement suit `actionFlip.ts`
//! (le texte n'est pas inversé : seule sa place suit).
use std::collections::BTreeSet;

use yrs::{Array, Map, MapRef, Out};

use crate::commands::{valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{compose, out_string, out_transform, read_group, transform_to_any, Transform};
use crate::media::MEDIA_KIND;
use crate::model3d::MODEL3D_KIND;
use crate::query::Bounds;
use crate::table::TABLE_KIND;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArrangeHow {
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignTop,
    AlignMiddle,
    AlignBottom,
    DistributeH,
    DistributeV,
    FlipH,
    FlipV,
    RotateCw,
    RotateCcw,
}

const NAMES: [(&str, ArrangeHow); 12] = [
    ("align-left", ArrangeHow::AlignLeft),
    ("align-center", ArrangeHow::AlignCenter),
    ("align-right", ArrangeHow::AlignRight),
    ("align-top", ArrangeHow::AlignTop),
    ("align-middle", ArrangeHow::AlignMiddle),
    ("align-bottom", ArrangeHow::AlignBottom),
    ("distribute-h", ArrangeHow::DistributeH),
    ("distribute-v", ArrangeHow::DistributeV),
    ("flip-h", ArrangeHow::FlipH),
    ("flip-v", ArrangeHow::FlipV),
    ("rotate-cw", ArrangeHow::RotateCw),
    ("rotate-ccw", ArrangeHow::RotateCcw),
];

impl ArrangeHow {
    pub fn parse(s: &str) -> Option<Self> {
        NAMES.iter().find(|(n, _)| *n == s).map(|(_, h)| *h)
    }

    pub fn name(self) -> &'static str {
        NAMES
            .iter()
            .find(|(_, h)| *h == self)
            .map_or("", |(n, _)| n)
    }
}

/// `Matrix` : trait, forme, image (la matrice entière) ; `Place` : texte, tableau, média, objet 3D (translation seule, H5).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Reach {
    Matrix,
    Place,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Member {
    pub id: String,
    pub reach: Reach,
    pub bounds: Bounds,
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct Unit {
    pub members: Vec<Member>,
}

fn box_of(u: &Unit) -> Option<Bounds> {
    u.members.iter().fold(None, |acc, m| {
        Some(acc.map_or(m.bounds, |a| a.union(m.bounds)))
    })
}

const fn shift(dx: f64, dy: f64) -> Transform {
    [1.0, 0.0, 0.0, 1.0, dx, dy]
}

/// Translation d'une unité entière (tous ses membres du même pas) ; pas nul omis.
fn push_unit(u: &Unit, dx: f64, dy: f64, out: &mut Vec<(String, Transform)>) {
    if dx != 0.0 || dy != 0.0 {
        for m in &u.members {
            out.push((m.id.clone(), shift(dx, dy)));
        }
    }
}

/// Matrice à composer à gauche de la transformation de chaque élément ; identité omise. Vide : rien ne bouge (D38).
pub(crate) fn plan(units: &[Unit], how: ArrangeHow) -> Vec<(String, Transform)> {
    let boxes: Vec<Bounds> = units.iter().filter_map(box_of).collect();
    if boxes.len() != units.len() || boxes.is_empty() {
        return Vec::new();
    }
    let sel = boxes.iter().skip(1).fold(boxes[0], |a, b| a.union(*b));
    let (cx, cy) = ((sel.x0 + sel.x1) / 2.0, (sel.y0 + sel.y1) / 2.0);
    let mut out: Vec<(String, Transform)> = Vec::new();
    use ArrangeHow::*;
    match how {
        AlignLeft | AlignCenter | AlignRight | AlignTop | AlignMiddle | AlignBottom => {
            if units.len() < 2 {
                return Vec::new();
            }
            for (u, b) in units.iter().zip(&boxes) {
                let (dx, dy) = match how {
                    AlignLeft => (sel.x0 - b.x0, 0.0),
                    AlignCenter => (cx - (b.x0 + b.x1) / 2.0, 0.0),
                    AlignRight => (sel.x1 - b.x1, 0.0),
                    AlignTop => (0.0, sel.y0 - b.y0),
                    AlignMiddle => (0.0, cy - (b.y0 + b.y1) / 2.0),
                    _ => (0.0, sel.y1 - b.y1),
                };
                push_unit(u, dx, dy, &mut out);
            }
        }
        DistributeH | DistributeV => {
            if units.len() < 3 {
                return Vec::new();
            }
            let h = how == DistributeH;
            let start = |b: &Bounds| if h { b.x0 } else { b.y0 };
            let end = |b: &Bounds| if h { b.x1 } else { b.y1 };
            let mid = |b: &Bounds| (start(b) + end(b)) / 2.0;
            let mut order: Vec<usize> = (0..units.len()).collect();
            order.sort_by(|&a, &b| mid(&boxes[a]).total_cmp(&mid(&boxes[b])));
            let span: f64 = boxes.iter().map(|b| end(b) - start(b)).sum();
            let n = units.len() as f64;
            let step = (end(&sel) - start(&sel) - span) / (n - 1.0);
            let mv = |d: f64| if h { (d, 0.0) } else { (0.0, d) };
            if step < 0.0 {
                // Excalidraw : écart négatif, répartition par les centres ; les boîtes des deux extrêmes ne bougent pas.
                let Some(i0) = order.iter().position(|&i| start(&boxes[i]) == start(&sel)) else {
                    return Vec::new();
                };
                let Some(i1) = order.iter().position(|&i| end(&boxes[i]) == end(&sel)) else {
                    return Vec::new();
                };
                let s = (mid(&boxes[order[i1]]) - mid(&boxes[order[i0]])) / (n - 1.0);
                let mut pos = mid(&boxes[order[i0]]);
                for (k, &i) in order.iter().enumerate() {
                    if k != i0 && k != i1 {
                        pos += s;
                        let (dx, dy) = mv(pos - mid(&boxes[i]));
                        push_unit(&units[i], dx, dy, &mut out);
                    }
                }
            } else {
                let mut pos = start(&sel);
                for &i in &order {
                    let (dx, dy) = mv(pos - start(&boxes[i]));
                    push_unit(&units[i], dx, dy, &mut out);
                    pos += step + end(&boxes[i]) - start(&boxes[i]);
                }
            }
        }
        FlipH | FlipV | RotateCw | RotateCcw => {
            let full: Transform = match how {
                FlipH => [-1.0, 0.0, 0.0, 1.0, 2.0 * cx, 0.0],
                FlipV => [1.0, 0.0, 0.0, -1.0, 0.0, 2.0 * cy],
                // Écran à y vers le bas : (x, y) → (cx − (y − cy), cy + (x − cx)).
                RotateCw => [0.0, 1.0, -1.0, 0.0, cx + cy, cy - cx],
                _ => [0.0, -1.0, 1.0, 0.0, cx - cy, cy + cx],
            };
            for m in units.iter().flat_map(|u| &u.members) {
                match m.reach {
                    Reach::Matrix => out.push((m.id.clone(), full)),
                    Reach::Place => {
                        let (px, py) = (
                            (m.bounds.x0 + m.bounds.x1) / 2.0,
                            (m.bounds.y0 + m.bounds.y1) / 2.0,
                        );
                        let (nx, ny) = (
                            full[0] * px + full[2] * py + full[4],
                            full[1] * px + full[3] * py + full[5],
                        );
                        if nx != px || ny != py {
                            out.push((m.id.clone(), shift(nx - px, ny - py)));
                        }
                    }
                }
            }
        }
    }
    out
}

/// Genre lu : trait, forme, image → matrice entière ; texte, tableau, média, objet 3D → place seule ; tout autre genre
/// (`fill`, inconnu) n'est jamais bougé.
fn reach_of(kind: Option<&str>) -> Option<Reach> {
    match kind? {
        "stroke" | "shape" | "image" => Some(Reach::Matrix),
        k if k == "text" || k == TABLE_KIND || k == MEDIA_KIND || k == MODEL3D_KIND => {
            Some(Reach::Place)
        }
        _ => None,
    }
}

/// Élément retenu à la lecture : id, groupe extérieur, portée, `Y.Map`, transformation lue.
struct Picked {
    id: String,
    outer: Option<String>,
    reach: Reach,
    element: MapRef,
    transform: Transform,
}

impl Document {
    /// OG23 (DA-2, déc. 21-22) : une disposition sur les `ids` (une même page), groupes extérieurs touchés en partie
    /// étendus à tous leurs membres de la page (règle de `cmd_group`), en une transaction : une étape. Ids dédoublonnés ;
    /// premier id inconnu : `UnknownElement` ; aucun id : aucune étape ; pages mêlées : `MixedPages` ; composée
    /// invalide : `BadMatrix` avant toute écriture (règle de `cmd_transform`). `Change.ids` : les ids bougés, triés.
    pub fn cmd_arrange(&mut self, ids: &[String], how: ArrangeHow) -> Result<Change, CommandError> {
        // 1-2. Lecture, fermée avant toute écriture.
        let (page, picked) = {
            let txn = self.read();
            let mut seen = BTreeSet::new();
            let mut found = Vec::with_capacity(ids.len());
            for id in ids.iter().filter(|id| seen.insert(id.as_str())) {
                let f = self
                    .find_element(&txn, id)
                    .ok_or_else(|| CommandError::UnknownElement(id.clone()))?;
                found.push(f);
            }
            let Some(head) = found.first() else {
                return Ok(self.unchanged());
            };
            let page = head.page_id.clone();
            if found.iter().any(|f| f.page_id != page) {
                return Err(CommandError::MixedPages);
            }
            let outers: BTreeSet<String> = found
                .iter()
                .filter_map(|f| read_group(&txn, &f.element)?.into_iter().next())
                .collect();
            let mut picked = Vec::new();
            // Un seul passage sur la page, dans l'ordre de la pile (patron de `cmd_group`).
            if let Some(els) = self.page_elements(&txn, &page) {
                for o in els.iter(&txn) {
                    let Out::YMap(element) = o else { continue };
                    let Some(id) = out_string(element.get(&txn, "id")) else {
                        continue;
                    };
                    let outer = read_group(&txn, &element).and_then(|p| p.into_iter().next());
                    let touched = outer.as_ref().is_some_and(|o| outers.contains(o));
                    if !seen.contains(id.as_str()) && !touched {
                        continue;
                    }
                    let Some(reach) = reach_of(out_string(element.get(&txn, "kind")).as_deref())
                    else {
                        continue;
                    };
                    let Some(transform) = out_transform(element.get(&txn, "transform")) else {
                        continue;
                    };
                    picked.push(Picked {
                        id,
                        outer,
                        reach,
                        element,
                        transform,
                    });
                }
            }
            (page, picked)
        };
        // 3. Boîtes d'accroche, puis unités par groupe extérieur (sinon l'id seul), dans l'ordre de première apparition.
        let mut units: Vec<(String, Unit)> = Vec::new();
        for p in &picked {
            let Some(bounds) = self.snap_box(std::slice::from_ref(&p.id)) else {
                continue;
            };
            let key = p.outer.clone().unwrap_or_else(|| p.id.clone());
            let member = Member {
                id: p.id.clone(),
                reach: p.reach,
                bounds,
            };
            match units.iter_mut().find(|(k, _)| *k == key) {
                Some((_, u)) => u.members.push(member),
                None => units.push((
                    key,
                    Unit {
                        members: vec![member],
                    },
                )),
            }
        }
        let units: Vec<Unit> = units.into_iter().map(|(_, u)| u).collect();
        // 4. Plan, composées contrôlées avant toute écriture.
        let moves = plan(&units, how);
        if moves.is_empty() {
            return Ok(self.unchanged());
        }
        let mut writes: Vec<(&Picked, Transform)> = Vec::with_capacity(moves.len());
        for (id, m) in &moves {
            let Some(p) = picked.iter().find(|p| p.id == *id) else {
                continue;
            };
            let c = compose(m, &p.transform);
            if !valid_matrix(&c) {
                return Err(CommandError::BadMatrix);
            }
            writes.push((p, c));
        }
        // 5. Une seule transaction : une étape.
        {
            let mut txn = self.transact_local();
            for (p, c) in &writes {
                p.element.insert(&mut txn, "transform", transform_to_any(c));
            }
        }
        let mut moved: Vec<String> = writes.iter().map(|(p, _)| p.id.clone()).collect();
        moved.sort();
        moved.dedup();
        Ok(self.done(Change {
            pages: vec![page],
            ids: moved,
            ..Default::default()
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Toute variante a son nom : la liste ci-dessous est exhaustive par construction (le `match` ne compile plus si
    /// une variante s'ajoute), et `NAMES` doit la suivre dans le même ordre, sans doublon.
    #[test]
    fn names_cover_every_variant() {
        use ArrangeHow::*;
        let all = [
            AlignLeft,
            AlignCenter,
            AlignRight,
            AlignTop,
            AlignMiddle,
            AlignBottom,
            DistributeH,
            DistributeV,
            FlipH,
            FlipV,
            RotateCw,
            RotateCcw,
        ];
        for h in all {
            match h {
                AlignLeft | AlignCenter | AlignRight | AlignTop | AlignMiddle | AlignBottom
                | DistributeH | DistributeV | FlipH | FlipV | RotateCw | RotateCcw => {}
            }
        }
        assert_eq!(NAMES.len(), all.len());
        for (i, h) in all.iter().enumerate() {
            assert_eq!(NAMES[i].1, *h, "variante {i}");
        }
        let mut names: Vec<&str> = NAMES.iter().map(|(n, _)| *n).collect();
        names.sort_unstable();
        names.dedup();
        assert_eq!(names.len(), NAMES.len(), "noms uniques");
    }
}
