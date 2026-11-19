//! Lectures sans écriture (D10, D38) : entrées en coordonnées monde ; points et contours rendus dans le repère local
//! de l'élément (placés par `transform`). Aucune lecture n'ouvre de transaction d'écriture. Les contours viennent du
//! cache du document (`Document::cached_outline`) : calculés une fois par trait, partagés par le rendu, la collision
//! et la gomme d'objet (constat du lot 2 : 194 ms pour 1 000 traits sans cache).

use std::rc::Rc;

use yrs::{Array, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_stroke, world_to_local_path};
use crate::document::Document;
use crate::element::{apply_transform, invert, out_string, out_transform, Transform};
use crate::ink::hit::{hit_outline, path_hits_outline};
use crate::ink::points::InkPoint;
use crate::shape::shape_polygon;

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize)]
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

    /// Géométrie locale d'un élément pour la collision et les bornes : contour en cache (trait), polygone (forme).
    fn element_geom<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Geom> {
        let id = out_string(e.get(txn, "id")).unwrap_or_default();
        if let Some((transform, style, pts)) = read_stroke(txn, e) {
            let outline = self.cached_outline(&id, &style, &pts);
            return Some(Geom {
                id,
                transform,
                outline,
            });
        }
        let transform = out_transform(e.get(txn, "transform"))?;
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

    /// Élément le plus haut sous (x, y) monde, à `tol` près.
    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.geoms(page, false)
            .into_iter()
            .rev()
            .find(|g| {
                invert(&g.transform).is_some_and(|inv| {
                    let (lx, ly) = apply_transform(&inv, x, y);
                    hit_outline(&g.outline, lx as f32, ly as f32, tol)
                })
            })
            .map(|g| g.id)
    }

    /// Traits touchés par un chemin (gomme d'objet, aperçu D38), dans l'ordre d'empilement.
    pub fn hit_test_path(&self, page: &str, path: &[f32], radius: f32) -> Vec<String> {
        self.geoms(page, true)
            .into_iter()
            .filter(|g| {
                world_to_local_path(&g.transform, path)
                    .is_some_and(|lp| path_hits_outline(&g.outline, &lp, radius))
            })
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
}
