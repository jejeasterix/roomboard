//! Lectures sans écriture (D10, D38) : entrées en coordonnées monde ; points et contours rendus dans le repère local
//! de l'élément (placés par `transform`). Aucune lecture n'ouvre de transaction d'écriture.

use yrs::{Array, Map, Out};

use crate::commands::{read_stroke, world_to_local_path};
use crate::document::Document;
use crate::element::{apply_transform, invert, out_string, Transform};
use crate::ink::hit::{hit_outline, path_hits_outline};
use crate::ink::outline::{outline as ink_outline, InkStyle};
use crate::ink::points::InkPoint;

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

struct StrokeGeom {
    id: String,
    transform: Transform,
    outline: Vec<f32>,
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
        Some(ink_outline(&pts, &InkStyle { width: style.width }))
    }

    /// Traits de la page, du dessous vers le dessus. Recalcule chaque contour à chaque appel (coût mesuré par
    /// `hit_test_path_cost_for_thousand_strokes`, non optimisé au lot 2).
    fn stroke_geoms(&self, page: &str) -> Vec<StrokeGeom> {
        let txn = self.read();
        let Some(elements) = self.page_elements(&txn, page) else {
            return Vec::new();
        };
        let mut out = Vec::new();
        for o in elements.iter(&txn) {
            let Out::YMap(e) = o else { continue };
            let Some((transform, style, pts)) = read_stroke(&txn, &e) else {
                continue;
            };
            out.push(StrokeGeom {
                id: out_string(e.get(&txn, "id")).unwrap_or_default(),
                transform,
                outline: ink_outline(&pts, &InkStyle { width: style.width }),
            });
        }
        out
    }

    /// Élément le plus haut sous (x, y) monde, à `tol` près.
    pub fn hit_test(&self, page: &str, x: f64, y: f64, tol: f32) -> Option<String> {
        self.stroke_geoms(page)
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
        self.stroke_geoms(page)
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
        self.stroke_geoms(page)
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
            let Some((t, style, pts)) = read_stroke(&txn, &found.element) else {
                continue;
            };
            if let Some(b) = world_bounds(&t, &ink_outline(&pts, &InkStyle { width: style.width }))
            {
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
    use crate::commands::Command;
    use crate::element::StrokeStyle;

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

    /// Mesure (relecture T12) : `hit_test_path` recalcule le contour de chaque trait à chaque appel. Non optimisé au
    /// lot 2 ; `cargo test -p roomboard-core --lib -- --ignored --nocapture hit_test_path_cost` affiche le temps.
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
        eprintln!(
            "hit_test_path, 1000 traits : {:?} ({} touchés)",
            start.elapsed(),
            hits.len()
        );
    }
}
