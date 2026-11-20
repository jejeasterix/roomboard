//! Lectures sans écriture (D10, D38) : entrées en coordonnées monde ; points et contours rendus dans le repère local
//! de l'élément (placés par `transform`). Aucune lecture n'ouvre de transaction d'écriture. Les contours viennent du
//! cache du document (`Document::cached_outline`) : calculés une fois par trait, partagés par le rendu, la collision
//! et la gomme d'objet (constat du lot 2 : 194 ms pour 1 000 traits sans cache).

use std::rc::Rc;

use yrs::{Array, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_stroke, read_text, similarity_scale, world_to_local_path};
use crate::document::Document;
use crate::element::{
    apply_transform, out_string, out_transform, read_image, read_unknown, unknown_view, Transform,
};
use crate::ink::hit::{hit_outline, path_hits_outline};
use crate::ink::points::InkPoint;
use crate::shape::{box_polygon, shape_polygon};
use crate::table::{self, TABLE_KIND};

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Bounds {
    pub x0: f64,
    pub y0: f64,
    pub x1: f64,
    pub y1: f64,
}

impl Bounds {
    fn union(self, o: Bounds) -> Bounds {
        Bounds {
            x0: self.x0.min(o.x0),
            y0: self.y0.min(o.y0),
            x1: self.x1.max(o.x1),
            y1: self.y1.max(o.y1),
        }
    }

    fn contains(&self, o: &Bounds) -> bool {
        o.x0 >= self.x0 && o.y0 >= self.y0 && o.x1 <= self.x1 && o.y1 <= self.y1
    }
}

struct Geom {
    id: String,
    transform: Transform,
    outline: Rc<[f32]>,
}

/// Boîte monde d'un contour local ; les sommets non finis (séparateurs éventuels) sont ignorés.
fn world_bounds(t: &Transform, poly: &[f32]) -> Option<Bounds> {
    poly.as_chunks::<2>()
        .0
        .iter()
        .filter(|c| c[0].is_finite() && c[1].is_finite())
        .map(|c| apply_transform(t, f64::from(c[0]), f64::from(c[1])))
        .fold(None, |acc: Option<Bounds>, (x, y)| {
            let b = Bounds {
                x0: x,
                y0: y,
                x1: x,
                y1: y,
            };
            Some(match acc {
                Some(a) => a.union(b),
                None => b,
            })
        })
}

/// Contour local porté en monde ; les sommets non finis (séparateurs) sont recopiés tels quels, pour que la règle
/// pair-impair et la distance aux arêtes les traitent comme dans le repère local.
pub(crate) fn world_outline(t: &Transform, poly: &[f32]) -> Vec<f32> {
    let mut out = Vec::with_capacity(poly.len());
    for c in poly.as_chunks::<2>().0 {
        if c[0].is_finite() && c[1].is_finite() {
            let (x, y) = apply_transform(t, f64::from(c[0]), f64::from(c[1]));
            out.extend([x as f32, y as f32]);
        } else {
            out.extend(c);
        }
    }
    out
}

/// Le chemin monde de la gomme touche-t-il le trait (contour local `outline` placé par `t`) à `radius` monde près (T63) ?
/// Similitude de facteur s : chemin ramené en local, rayon r / s, exact, sur le contour en cache (T17) sans le recopier
/// (mesure du banc de `hit_test_path` inchangée). Autre matrice (échelle anisotrope, cisaillement), où aucun rayon local
/// n'est exact : le contour est porté en monde et la distance s'y mesure, comme `hit_test` (constat 1 de T60).
pub(crate) fn path_hits_stroke(t: &Transform, outline: &[f32], path: &[f32], radius: f32) -> bool {
    match similarity_scale(t) {
        Some(s) => world_to_local_path(t, path)
            .is_some_and(|lp| path_hits_outline(outline, &lp, (f64::from(radius) / s) as f32)),
        None => path_hits_outline(&world_outline(t, outline), path, radius),
    }
}

impl Document {
    pub fn stroke_points(&self, id: &str) -> Option<Vec<InkPoint>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        read_stroke(&txn, &found.element).map(|(_, _, p)| p)
    }

    pub fn outline(&self, id: &str) -> Option<Vec<f32>> {
        let txn = self.read();
        let found = self.find_element(&txn, id)?;
        let (_, style, pts) = read_stroke(&txn, &found.element)?;
        Some(self.cached_outline(id, &style, &pts).to_vec())
    }

    /// Géométrie locale pour la collision et les bornes : contour en cache (trait), polygone (forme), boîte (texte,
    /// image, tableau, élément inconnu). Un élément inconnu sans `id` lisible n'a pas de géométrie (K8).
    fn element_geom<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Geom> {
        let raw_id = out_string(e.get(txn, "id"));
        let id = raw_id.clone().unwrap_or_default();
        if let Some((transform, style, pts)) = read_stroke(txn, e) {
            let outline = self.cached_outline(&id, &style, &pts);
            return Some(Geom {
                id,
                transform,
                outline,
            });
        }
        if out_string(e.get(txn, "kind")).as_deref() == Some(TABLE_KIND) {
            // Boîte (0, 0)-(Σ largeurs, Σ hauteurs) ; tableau mal formé : la boîte inconnue (T2).
            let (transform, w, h) = match table::read_raw(txn, e) {
                Some(t) => (t.transform, t.width(), t.height()),
                None => {
                    let (transform, u) = unknown_view(txn, e)?;
                    (transform, u.w, u.h)
                }
            };
            return Some(Geom {
                id: raw_id?,
                transform,
                outline: box_polygon(w, h).into(),
            });
        }
        if let Some((transform, u)) = read_unknown(txn, e) {
            return Some(Geom {
                id: raw_id?,
                transform,
                outline: box_polygon(u.w, u.h).into(),
            });
        }
        if let Some((transform, i)) = read_image(txn, e) {
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(i.w, i.h).into(),
            });
        }
        let transform = out_transform(e.get(txn, "transform"))?;
        if let Some(t) = read_text(txn, e) {
            return Some(Geom {
                id,
                transform,
                outline: box_polygon(t.box_width, t.box_height).into(),
            });
        }
        let s = read_shape(txn, e)?;
        Some(Geom {
            id,
            transform,
            outline: shape_polygon(s.kind, s.w, s.h, s.style.width).into(),
        })
    }

    /// Éléments de la page, du dessous vers le dessus ; `strokes_only` : traits seuls (gomme, D12).
    fn geoms(&self, page: &str, strokes_only: bool) -> Vec<Geom> {
        let txn = self.read();
        let Some(elements) = self.page_elements(&txn, page) else {
            return Vec::new();
        };
        elements
            .iter(&txn)
            .filter_map(|o| match o {
                Out::YMap(e) => Some(e),
                _ => None,
            })
            .filter(|e| {
                !strokes_only || out_string(e.get(&txn, "kind")).as_deref() == Some("stroke")
            })
            .filter_map(|e| self.element_geom(&txn, &e))
            .collect()
    }

    /// Élément le plus haut sous (x, y) monde, à `tol` près, `tol` en unités monde comme dans la fausse liaison
    /// (constat 1 de T60) : le contour est porté en monde et la distance aux arêtes s'y mesure, exacte pour toute
    /// matrice (échelle anisotrope, cisaillement), là où diviser `tol` par un seul facteur d'échelle ne l'est pas. Le
    /// test « dedans » (pair-impair) ne dépend pas du repère.
    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.geoms(page, false)
            .into_iter()
            .rev()
            .find(|g| {
                hit_outline(
                    &world_outline(&g.transform, &g.outline),
                    x as f32,
                    y as f32,
                    tol,
                )
            })
            .map(|g| g.id)
    }

    /// Traits touchés par un chemin (gomme d'objet, aperçu D38), dans l'ordre d'empilement ; chemin et `radius` en
    /// unités monde (T63), comme `Erase`.
    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String> {
        self.geoms(page, true)
            .into_iter()
            .filter(|g| path_hits_stroke(&g.transform, &g.outline, path, radius))
            .map(|g| g.id)
            .collect()
    }

    /// Éléments entièrement inclus dans le rectangle monde (D15).
    pub fn ids_in_rect(&self, page: &str, rect: Bounds) -> Vec<String> {
        self.geoms(page, false)
            .into_iter()
            .filter(|g| world_bounds(&g.transform, &g.outline).is_some_and(|b| rect.contains(&b)))
            .map(|g| g.id)
            .collect()
    }

    /// Boîte monde englobant les contours des éléments ; ids inconnus ignorés, `None` si aucun.
    pub fn bounds(&self, ids: &[String]) -> Option<Bounds> {
        let txn = self.read();
        let mut acc: Option<Bounds> = None;
        for id in ids {
            let Some(found) = self.find_element(&txn, id) else {
                continue;
            };
            let Some(g) = self.element_geom(&txn, &found.element) else {
                continue;
            };
            if let Some(b) = world_bounds(&g.transform, &g.outline) {
                acc = Some(match acc {
                    Some(a) => a.union(b),
                    None => b,
                });
            }
        }
        acc
    }

    /// Boîte d'accroche (G7, HG6) : comme `bounds`, mais une forme compte sa boîte géométrique (0, 0)-(w, h) placée par
    /// sa transformation, sans l'épaisseur du trait ; texte, image, élément inconnu : leur boîte ; trait : son contour.
    pub fn snap_box(&self, ids: &[String]) -> Option<Bounds> {
        let txn = self.read();
        let mut acc: Option<Bounds> = None;
        for id in ids {
            let Some(found) = self.find_element(&txn, id) else {
                continue;
            };
            let e = &found.element;
            let b = match (read_shape(&txn, e), out_transform(e.get(&txn, "transform"))) {
                (Some(s), Some(t)) => world_bounds(&t, &box_polygon(s.w, s.h)),
                _ => self
                    .element_geom(&txn, e)
                    .and_then(|g| world_bounds(&g.transform, &g.outline)),
            };
            if let Some(b) = b {
                acc = Some(acc.map_or(b, |a| a.union(b)));
            }
        }
        acc
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::{Command, EraseMode};
    use crate::element::StrokeStyle;
    use crate::ink::outline::{outline as ink_outline, InkStyle};

    fn pen() -> StrokeStyle {
        StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        }
    }

    /// a : horizontale y = 100, x de 100 à 500 ; b (au-dessus) : verticale x = 300, y de 50 à 150.
    fn setup() -> (Document, String, String, String) {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let a: Vec<f32> = (0..=40)
            .flat_map(|i| [100.0 + i as f32 * 10.0, 100.0, 0.5])
            .collect();
        let b: Vec<f32> = (0..=10)
            .flat_map(|i| [300.0, 50.0 + i as f32 * 10.0, 0.5])
            .collect();
        let ia = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: a,
                style: pen(),
            })
            .expect("a")
            .ids[0]
            .clone();
        let ib = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: b,
                style: pen(),
            })
            .expect("b")
            .ids[0]
            .clone();
        (d, p, ia, ib)
    }

    #[test]
    fn hit_test_returns_topmost() {
        let (d, p, _a, b) = setup();
        assert_eq!(d.hit_test(&p, 300.0, 100.0, 2.0), Some(b));
    }

    #[test]
    fn hit_test_misses_empty_area() {
        let (d, p, _a, _b) = setup();
        assert_eq!(d.hit_test(&p, 900.0, 900.0, 6.0), None);
    }

    #[test]
    fn hit_test_path_lists_touched() {
        let (d, p, a, _b) = setup();
        assert_eq!(
            d.hit_test_path(&p, &[150.0, 90.0, 150.0, 110.0], 3.0),
            vec![a]
        );
    }

    #[test]
    fn hit_test_on_unknown_page_is_empty() {
        let (d, _p, _a, _b) = setup();
        assert_eq!(d.hit_test("nope", 300.0, 100.0, 2.0), None);
        assert!(d
            .hit_test_path("nope", &[150.0, 90.0, 150.0, 110.0], 3.0)
            .is_empty());
    }

    #[test]
    fn ids_in_rect_requires_full_inclusion() {
        let (d, p, a, b) = setup();
        let all = d.ids_in_rect(
            &p,
            Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 1000.0,
                y1: 1000.0,
            },
        );
        assert_eq!(all, vec![a, b.clone()]);
        assert_eq!(
            d.ids_in_rect(
                &p,
                Bounds {
                    x0: 250.0,
                    y0: 0.0,
                    x1: 350.0,
                    y1: 200.0
                }
            ),
            vec![b]
        );
        assert!(d
            .ids_in_rect(
                &p,
                Bounds {
                    x0: 0.0,
                    y0: 0.0,
                    x1: 350.0,
                    y1: 120.0
                }
            )
            .is_empty());
    }

    #[test]
    fn bounds_covers_strokes() {
        let (d, _p, a, _b) = setup();
        let bx = d.bounds(&[a]).expect("boîte");
        assert!(bx.x0 <= 100.0 && bx.x1 >= 495.0, "{bx:?}");
        assert!(bx.y0 < 100.0 && bx.y1 > 100.0, "{bx:?}");
        assert!(
            bx.x0 > 80.0 && bx.x1 < 520.0 && bx.y0 > 80.0 && bx.y1 < 120.0,
            "boîte trop large : {bx:?}"
        );
        assert_eq!(d.bounds(&[]), None);
    }

    #[test]
    fn outline_and_points_are_local() {
        let (d, _p, a, _b) = setup();
        let pts = d.stroke_points(&a).expect("points");
        assert_eq!((pts[0].x, pts[0].y), (0.0, 0.0));
        let o = d.outline(&a).expect("contour");
        let finite: Vec<&[f32; 2]> = o
            .as_chunks::<2>()
            .0
            .iter()
            .filter(|c| c[0].is_finite())
            .collect();
        assert!(!finite.is_empty());
        assert!(
            finite.iter().all(|c| c[0] > -20.0 && c[0] < 420.0),
            "contour hors du repère local"
        );
    }

    #[test]
    fn reads_open_no_write_transaction() {
        let (d, p, a, b) = setup();
        let n = crate::commands::tests::writes(&d);
        let _ = d.stroke_points(&a);
        let _ = d.outline(&a);
        let _ = d.hit_test(&p, 300.0, 100.0, 2.0);
        let _ = d.hit_test_path(&p, &[150.0, 90.0, 150.0, 110.0], 3.0);
        let _ = d.ids_in_rect(
            &p,
            Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 1000.0,
                y1: 1000.0,
            },
        );
        let _ = d.bounds(&[a, b]);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn hit_test_path_computes_each_outline_once() {
        let (d, p, a, _b) = setup();
        let before = d.outline_cache_misses();
        let path = [150.0, 90.0, 150.0, 110.0];
        assert_eq!(d.hit_test_path(&p, &path, 3.0), vec![a.clone()]);
        assert_eq!(
            d.outline_cache_misses() - before,
            2,
            "un calcul par trait au premier appel"
        );
        for _ in 0..5 {
            assert_eq!(d.hit_test_path(&p, &path, 3.0), vec![a.clone()]);
        }
        assert_eq!(
            d.outline_cache_misses() - before,
            2,
            "aucun recalcul aux appels suivants (aperçu D38 à chaque image)"
        );
    }

    #[test]
    fn outline_hit_test_and_bounds_share_the_cache() {
        let (d, p, a, b) = setup();
        let o = d.outline(&a).expect("contour");
        let _ = d.outline(&b);
        let m = d.outline_cache_misses();
        assert_eq!(m, 2);
        let _ = d.hit_test(&p, 300.0, 100.0, 2.0);
        let _ = d.ids_in_rect(
            &p,
            Bounds {
                x0: 0.0,
                y0: 0.0,
                x1: 1000.0,
                y1: 1000.0,
            },
        );
        let _ = d.bounds(&[a.clone(), b]);
        assert_eq!(
            d.outline_cache_misses(),
            m,
            "rendu, collision et boîte lisent le même cache"
        );
        let pts = d.stroke_points(&a).expect("points");
        let exact = ink_outline(&pts, &InkStyle { width: 4.0 });
        let bits = |v: &[f32]| v.iter().map(|x| x.to_bits()).collect::<Vec<u32>>();
        assert_eq!(
            bits(&o),
            bits(&exact),
            "le cache rend le contour exact (bit à bit)"
        );
    }

    #[test]
    fn cache_follows_partial_erase_and_undo_redo() {
        let (mut d, p, a, _b) = setup();
        let left_probe = [150.0, 90.0, 150.0, 110.0];
        let cut_probe = [200.0, 95.0, 200.0, 105.0];
        assert_eq!(d.hit_test_path(&p, &left_probe, 3.0), vec![a.clone()]);
        assert_eq!(d.hit_test_path(&p, &cut_probe, 1.0), vec![a.clone()]);
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path: vec![200.0, 80.0, 200.0, 120.0],
                radius: 5.0,
                mode: EraseMode::Partial,
            })
            .expect("gomme partielle");
        assert_eq!(ch.removed, vec![a.clone()]);
        assert_eq!(ch.ids.len(), 2, "a coupé en deux morceaux");
        let left = d.hit_test_path(&p, &left_probe, 3.0);
        assert_eq!(left.len(), 1);
        assert!(
            ch.ids.contains(&left[0]),
            "le morceau gauche, jamais l'ancien trait : {left:?}"
        );
        assert!(
            d.hit_test_path(&p, &cut_probe, 1.0).is_empty(),
            "plus rien sous la coupe"
        );
        assert!(d.undo());
        assert_eq!(d.hit_test_path(&p, &left_probe, 3.0), vec![a.clone()]);
        assert_eq!(
            d.hit_test_path(&p, &cut_probe, 1.0),
            vec![a.clone()],
            "annuler : le trait entier revient"
        );
        assert!(d.redo());
        assert!(
            d.hit_test_path(&p, &cut_probe, 1.0).is_empty(),
            "rétablir : la coupe revient"
        );
    }

    #[test]
    fn removed_ids_leave_the_cache() {
        let (mut d, p, a, _b) = setup();
        let _ = d.hit_test_path(&p, &[0.0, 0.0, 1000.0, 1000.0], 3.0);
        assert_eq!(d.outline_cache_len(), 2);
        d.apply(Command::Delete { ids: vec![a] })
            .expect("suppression");
        assert_eq!(d.outline_cache_len(), 1);
    }

    #[test]
    fn object_erase_uses_the_cache() {
        let (mut d, p, a, _b) = setup();
        let path = vec![150.0, 90.0, 150.0, 110.0];
        let _ = d.hit_test_path(&p, &path, 3.0);
        let m = d.outline_cache_misses();
        let ch = d
            .apply(Command::Erase {
                page: p.clone(),
                path,
                radius: 3.0,
                mode: EraseMode::Object,
            })
            .expect("gomme d'objet");
        assert_eq!(ch.removed, vec![a]);
        assert_eq!(
            d.outline_cache_misses(),
            m,
            "la commande reprend les contours de l'aperçu"
        );
    }

    /// Mesure (relecture T12, cache T17) : premier appel (contours calculés) et suivant (servis par le cache) ;
    /// `cargo test -p roomboard-core --release --lib -- --ignored --nocapture hit_test_path_cost` affiche les temps.
    #[test]
    #[ignore = "mesure de coût, lancée à la main"]
    fn hit_test_path_cost_for_thousand_strokes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        for i in 0..1000 {
            let y = (i % 50) as f32 * 20.0;
            let pts: Vec<f32> = (0..20)
                .flat_map(|k| [k as f32 * 5.0, y + k as f32, 0.5])
                .collect();
            d.apply(Command::CommitStroke {
                page: p.clone(),
                points: pts,
                style: pen(),
            })
            .expect("commit");
        }
        let start = std::time::Instant::now();
        let hits = d.hit_test_path(&p, &[50.0, 0.0, 50.0, 1000.0], 5.0);
        let first = start.elapsed();
        let start = std::time::Instant::now();
        let again = d.hit_test_path(&p, &[60.0, 0.0, 60.0, 1000.0], 5.0);
        eprintln!(
            "hit_test_path, 1000 traits : premier appel {first:?} ({} touchés), suivant {:?} ({} touchés)",
            hits.len(),
            start.elapsed(),
            again.len()
        );
    }

    use crate::shape::ShapeKind;

    fn rect_at(d: &mut Document, p: &str, c: [f64; 4]) -> String {
        d.apply(Command::AddShape {
            page: p.into(),
            shape: ShapeKind::Rect,
            x0: c[0],
            y0: c[1],
            x1: c[2],
            y1: c[3],
            style: pen(),
            fill: None,
        })
        .expect("rect")
        .ids[0]
            .clone()
    }

    #[test]
    fn hit_test_finds_shape_interior() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert_eq!(
            d.hit_test(&p, 700.0, 650.0, 1.0),
            Some(id),
            "intérieur sans remplissage (CL4-7)"
        );
        assert_eq!(d.hit_test(&p, 900.0, 650.0, 1.0), None);
    }

    fn scaled(d: &mut Document, p: &str, kind: ShapeKind, c: [f64; 4], m: Transform) -> String {
        let id = d
            .apply(Command::AddShape {
                page: p.into(),
                shape: kind,
                x0: c[0],
                y0: c[1],
                x1: c[2],
                y1: c[3],
                style: pen(),
                fill: None,
            })
            .expect("forme")
            .ids[0]
            .clone();
        d.apply(Command::Transform {
            ids: vec![id.clone()],
            matrix: m,
        })
        .expect("échelle");
        id
    }

    /// Constat 1 de T60 : `tol` est en unités monde, comme dans la fausse liaison. Le patron écarté (point ramené en
    /// local, `tol` appliquée en local) prendrait le clic à 20 du bord à ×4 et raterait la ligne à 2,9 à ×0,05.
    #[test]
    fn hit_test_tolerance_is_in_world_units_under_scale() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let big = scaled(
            &mut d,
            &p,
            ShapeKind::Rect,
            [0.0, 0.0, 100.0, 50.0],
            [4.0, 0.0, 0.0, 4.0, 0.0, 0.0],
        );
        assert_eq!(d.hit_test(&p, 412.0, 100.0, 6.0), Some(big.clone()));
        assert_eq!(d.hit_test(&p, 428.0, 100.0, 6.0), None, "20 du bord à ×4");
        d.apply(Command::Delete { ids: vec![big] })
            .expect("retrait");
        let thin = scaled(
            &mut d,
            &p,
            ShapeKind::Line,
            [0.0, 0.0, 1000.0, 0.0],
            [0.05, 0.0, 0.0, 0.05, 0.0, 0.0],
        );
        assert_eq!(
            d.hit_test(&p, 25.0, 3.0, 6.0),
            Some(thin.clone()),
            "ligne à ×0,05 prise à 2,9"
        );
        assert_eq!(d.hit_test(&p, 25.0, 10.0, 6.0), None);
        d.apply(Command::Delete { ids: vec![thin] })
            .expect("retrait");
        let flat = scaled(
            &mut d,
            &p,
            ShapeKind::Rect,
            [0.0, 0.0, 100.0, 50.0],
            [4.0, 0.0, 0.0, 0.25, 0.0, 0.0],
        );
        assert_eq!(
            d.hit_test(&p, 200.0, 18.0, 6.0),
            Some(flat.clone()),
            "anisotrope : 5 au-dessus du bord monde"
        );
        assert_eq!(
            d.hit_test(&p, 428.0, 6.0, 6.0),
            None,
            "anisotrope : 20 à droite"
        );
    }

    /// Trait horizontal y = 0, x de 100 à 500 (un point tous les 10), épaisseur 4, puis la matrice `m`.
    fn scaled_stroke(m: Transform) -> (Document, String, String) {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let pts: Vec<f32> = (0..=40)
            .flat_map(|i| [100.0 + i as f32 * 10.0, 0.0, 0.5])
            .collect();
        let id = d
            .apply(Command::CommitStroke {
                page: p.clone(),
                points: pts,
                style: pen(),
            })
            .expect("trait")
            .ids[0]
            .clone();
        d.apply(Command::Transform {
            ids: vec![id.clone()],
            matrix: m,
        })
        .expect("échelle");
        (d, p, id)
    }

    /// T63 : le rayon de `hit_test_path` et de la gomme (d'objet et partielle) est en unités monde, l'épaisseur du trait
    /// suit sa matrice. Le patron écarté (chemin ramené en local, rayon appliqué en local) mordrait à 20 du trait à ×4
    /// (5 en local) et raterait le trait à 4 à ×0,05 (80 en local).
    #[test]
    fn eraser_radius_is_in_world_units_under_scale() {
        let cases: [(Transform, f32, f32, f32); 2] = [
            ([4.0, 0.0, 0.0, 4.0, 0.0, 0.0], 1200.0, 9.0, 20.0),
            ([0.05, 0.0, 0.0, 0.05, 0.0, 0.0], 15.0, 4.0, 6.0),
        ];
        for (m, x, near, far) in cases {
            for (y, touched) in [(near, true), (far, false)] {
                let (d, p, id) = scaled_stroke(m);
                let want = if touched { vec![id.clone()] } else { vec![] };
                assert_eq!(
                    d.hit_test_path(&p, &[x, y], 5.0),
                    want,
                    "hit_test_path ×{} à {y}",
                    m[0]
                );
                for mode in [EraseMode::Object, EraseMode::Partial] {
                    let (mut d, p, id) = scaled_stroke(m);
                    let c = d
                        .apply(Command::Erase {
                            page: p,
                            path: vec![x, y],
                            radius: 5.0,
                            mode,
                        })
                        .expect("gomme");
                    let want = if touched { vec![id] } else { vec![] };
                    assert_eq!(c.removed, want, "Erase ×{} à {y}", m[0]);
                }
            }
        }
    }

    /// T63 : sous une matrice anisotrope, aucun rayon local n'est exact ; `hit_test_path` mesure en monde, sur le contour
    /// porté en monde (comme `hit_test`). Trait à [4, 0, 0, 0,25] : demi-épaisseur monde verticale ≤ 0,5. Diviser le rayon
    /// par la racine du déterminant (1) ou par la plus grande valeur singulière raterait le trait à 5 ; la gomme partielle
    /// coupe avec la plus petite demi-épaisseur monde (0,25 × 2) : touché à 5, pas à 5,6.
    #[test]
    fn eraser_measures_in_world_under_anisotropic_scale() {
        let m = [4.0, 0.0, 0.0, 0.25, 0.0, 0.0];
        let (d, p, id) = scaled_stroke(m);
        assert_eq!(d.hit_test_path(&p, &[1200.0, 5.0], 5.0), vec![id.clone()]);
        assert_eq!(
            d.hit_test_path(&p, &[1200.0, 5.6], 5.0),
            Vec::<String>::new()
        );
        for (y, touched) in [(5.0, true), (5.6, false)] {
            let (mut d, p, id) = scaled_stroke(m);
            let c = d
                .apply(Command::Erase {
                    page: p,
                    path: vec![1200.0, y],
                    radius: 5.0,
                    mode: EraseMode::Partial,
                })
                .expect("gomme");
            assert_eq!(c.removed.is_empty(), !touched, "partielle à {y}");
            if touched {
                assert_eq!(c.removed, vec![id]);
            }
        }
    }

    /// T65 : la gomme partielle sous échelle anisotrope ramène les morceaux en local par `inv` ; leur position MONDE
    /// reste celle du trait d'origine (un oubli de `inv` les porterait à ×4 en x). Trait monde x de 400 à 2000, gommé
    /// en 1200 (rayon 5) : le morceau de gauche finit près de 1195, celui de droite commence près de 1205.
    #[test]
    fn partial_erase_keeps_pieces_in_place_under_anisotropic_scale() {
        let (mut d, p, id) = scaled_stroke([4.0, 0.0, 0.0, 0.25, 0.0, 0.0]);
        let c = d
            .apply(Command::Erase {
                page: p,
                path: vec![1200.0, 0.0],
                radius: 5.0,
                mode: EraseMode::Partial,
            })
            .expect("gomme");
        assert_eq!(c.removed, vec![id]);
        assert_eq!(c.ids.len(), 2, "deux morceaux");
        let mut bs: Vec<Bounds> = c
            .ids
            .iter()
            .map(|i| d.bounds(std::slice::from_ref(i)).expect("bornes"))
            .collect();
        bs.sort_by(|a, b| a.x0.partial_cmp(&b.x0).unwrap());
        let (left, right) = (&bs[0], &bs[1]);
        assert!((left.x0 - 400.0).abs() < 10.0, "{left:?}");
        assert!((left.x1 - 1195.0).abs() < 10.0, "{left:?}");
        assert!((right.x0 - 1205.0).abs() < 10.0, "{right:?}");
        assert!((right.x1 - 2000.0).abs() < 10.0, "{right:?}");
    }

    /// Constats 4 et 5 de T60 : la pointe de flèche est prise et bornée, l'ellipse n'est plus sa boîte.
    #[test]
    fn hit_test_and_bounds_follow_arrow_head_and_ellipse() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let one = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];
        let arrow = scaled(&mut d, &p, ShapeKind::Arrow, [0.0, 0.0, 100.0, 0.0], one);
        assert_eq!(d.hit_test(&p, 90.0, 4.5, 0.1), Some(arrow.clone()));
        let b = d.bounds(std::slice::from_ref(&arrow)).expect("bornes");
        assert!(
            b.y1 > 5.0 && b.y1 < 5.2 && b.y0 < -5.0 && b.y0 > -5.2,
            "{b:?}"
        );
        d.apply(Command::Delete { ids: vec![arrow] })
            .expect("retrait");
        let ellipse = scaled(&mut d, &p, ShapeKind::Ellipse, [0.0, 0.0, 100.0, 50.0], one);
        assert_eq!(d.hit_test(&p, 1.0, 1.0, 1.0), None, "coin de la boîte");
        assert_eq!(d.hit_test(&p, 50.0, 25.0, 1.0), Some(ellipse.clone()));
        assert_eq!(
            d.bounds(&[ellipse]),
            Some(Bounds {
                x0: -2.0,
                y0: -2.0,
                x1: 102.0,
                y1: 52.0
            })
        );
    }

    #[test]
    fn ids_in_rect_and_bounds_include_shapes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert_eq!(
            d.bounds(std::slice::from_ref(&id)),
            Some(Bounds {
                x0: 598.0,
                y0: 598.0,
                x1: 802.0,
                y1: 702.0
            })
        );
        assert_eq!(
            d.ids_in_rect(
                &p,
                Bounds {
                    x0: 590.0,
                    y0: 590.0,
                    x1: 810.0,
                    y1: 710.0
                }
            ),
            vec![id]
        );
        assert!(d
            .ids_in_rect(
                &p,
                Bounds {
                    x0: 600.0,
                    y0: 600.0,
                    x1: 810.0,
                    y1: 710.0
                }
            )
            .is_empty());
    }

    #[test]
    fn hit_test_path_ignores_shapes() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        assert!(d
            .hit_test_path(&p, &[600.0, 650.0, 800.0, 650.0], 10.0)
            .is_empty());
    }

    #[test]
    fn bounds_follow_transform() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = rect_at(&mut d, &p, [600.0, 600.0, 800.0, 700.0]);
        d.apply(Command::Transform {
            ids: vec![id.clone()],
            matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0],
        })
        .expect("échelle");
        assert_eq!(
            d.bounds(&[id]),
            Some(Bounds {
                x0: 1196.0,
                y0: 1196.0,
                x1: 1604.0,
                y1: 1404.0
            })
        );
    }

    #[test]
    fn hit_test_and_bounds_include_text() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .apply(Command::SetText {
                page: p.clone(),
                id: None,
                x: 100.0,
                y: 200.0,
                content: "Bonjour".into(),
                color: "#000000".into(),
                size: 36.0,
                box_width: 600.0,
                box_height: 45.0,
                spans: None,
            })
            .expect("texte")
            .ids[0]
            .clone();
        assert_eq!(d.hit_test(&p, 300.0, 220.0, 1.0), Some(id.clone()));
        assert_eq!(
            d.bounds(&[id]),
            Some(Bounds {
                x0: 100.0,
                y0: 200.0,
                x1: 700.0,
                y1: 245.0
            })
        );
    }
}
