//! Gomme partielle (D12) : retire les points de la ligne médiane à moins de `radius + r` du chemin de la gomme, où `r`
//! est le rayon du contour au point (pression comprise, OG20), et interpole les extrémités sur ce cercle. La calotte
//! de chaque morceau (rayon `r`) s'arrête alors au bord de la gomme : le trou visible a son diamètre. Un trait devient
//! 0, 1 ou plusieurs morceaux.
use super::hit::dist_to_path;
use super::outline::{outline_radius_with, InkStyle};
use super::points::InkPoint;

fn lerp(a: InkPoint, b: InkPoint, t: f32) -> InkPoint {
    InkPoint {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        pressure: a.pressure + (b.pressure - a.pressure) * t,
    }
}

/// Densifie la ligne médiane : deux points consécutifs à plus de `step` reçoivent des points intermédiaires
/// (un trait rapide aux points espacés est quand même coupé).
fn densify(points: &[InkPoint], step: f32) -> Vec<InkPoint> {
    let mut out = Vec::with_capacity(points.len());
    for (i, &a) in points.iter().enumerate() {
        out.push(a);
        if let Some(&b) = points.get(i + 1) {
            let k = ((b.x - a.x).hypot(b.y - a.y) / step).ceil() as usize;
            for s in 1..k {
                out.push(lerp(a, b, s as f32 / k as f32));
            }
        }
    }
    out
}

/// Point du segment [a, b] où `covered` change (dichotomie, 24 pas).
fn boundary(a: InkPoint, b: InkPoint, covered: impl Fn(&InkPoint) -> bool) -> InkPoint {
    let inside_a = covered(&a);
    let (mut lo, mut hi) = (0.0f32, 1.0f32);
    for _ in 0..24 {
        let mid = (lo + hi) / 2.0;
        if covered(&lerp(a, b, mid)) == inside_a {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lerp(a, b, (lo + hi) / 2.0)
}

/// `width` : épaisseur du trait (`InkStyle::width`) dans le repère des points et du chemin.
pub fn erase(
    points: &[InkPoint],
    width: f32,
    path: &[f32],
    radius: f32,
) -> Option<Vec<Vec<InkPoint>>> {
    erase_with(
        points,
        &InkStyle {
            width,
            constant: false,
        },
        path,
        radius,
    )
}

/// `erase` avec le style entier (OG23) : un trait à pression constante est coupé avec le rayon de son contour.
pub fn erase_with(
    points: &[InkPoint],
    style: &InkStyle,
    path: &[f32],
    radius: f32,
) -> Option<Vec<Vec<InkPoint>>> {
    let width = style.width;
    let covered = |p: &InkPoint| {
        dist_to_path(path, p.x, p.y)
            <= radius + outline_radius_with(width, p.pressure, style.constant)
    };
    // Pas d'avant OG20 ((rayon + largeur / 2) / 2) : mêmes points écrits ; il reste sous la plus petite portée
    // (rayon + largeur / 4, pression 0).
    let pts = densify(points, ((radius + width / 2.0) / 2.0).max(0.25));
    if !pts.iter().any(covered) {
        return None;
    }
    let mut pieces: Vec<Vec<InkPoint>> = Vec::new();
    let mut cur: Vec<InkPoint> = Vec::new();
    let mut prev: Option<(InkPoint, bool)> = None;
    for &p in &pts {
        let c = covered(&p);
        if let Some((q, qc)) = prev {
            if qc != c {
                let b = boundary(q, p, covered);
                cur.push(b);
                if c {
                    pieces.push(std::mem::take(&mut cur));
                }
            }
        }
        if !c {
            cur.push(p);
        }
        prev = Some((p, c));
    }
    pieces.push(cur);
    pieces.retain(|piece| piece.len() >= 2);
    Some(pieces)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ink::hit::dist_to_path;
    use crate::ink::outline::{outline, InkStyle};

    fn line(n: usize) -> Vec<InkPoint> {
        (0..=n)
            .map(|i| InkPoint {
                x: i as f32,
                y: 0.0,
                pressure: 0.5,
            })
            .collect()
    }

    #[test]
    fn erase_miss_returns_none() {
        assert_eq!(erase(&line(100), 4.0, &[50.0, 40.0, 60.0, 40.0], 5.0), None);
    }

    #[test]
    fn erase_through_middle_gives_two_pieces() {
        let pieces = erase(&line(100), 4.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
        assert!(pieces[0].iter().all(|p| p.x < 50.0));
        assert!(pieces[1].iter().all(|p| p.x > 50.0));
    }

    #[test]
    fn erase_start_gives_one_piece() {
        let pieces = erase(&line(100), 4.0, &[0.0, -20.0, 0.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 1);
        assert!(pieces[0][0].x > 6.9);
    }

    #[test]
    fn erase_everything_gives_no_piece() {
        assert_eq!(erase(&line(10), 4.0, &[5.0, 0.0], 50.0), Some(vec![]));
    }

    #[test]
    fn cut_point_lies_on_reach_circle() {
        let path = [50.0, -20.0, 50.0, 20.0];
        let pieces = erase(&line(100), 4.0, &path, 5.0).expect("touché");
        let end = *pieces[0].last().expect("point");
        assert!(
            (dist_to_path(&path, end.x, end.y) - 7.0).abs() < 0.01,
            "{end:?}"
        );
    }

    #[test]
    fn cut_interpolates_pressure() {
        let pts: Vec<InkPoint> = (0..=100)
            .map(|i| InkPoint {
                x: i as f32,
                y: 0.0,
                pressure: i as f32 / 100.0,
            })
            .collect();
        let pieces = erase(&pts, 0.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        let end = *pieces[0].last().expect("point");
        assert!((end.pressure - end.x / 100.0).abs() < 0.01, "{end:?}");
    }

    #[test]
    fn fast_sparse_stroke_is_still_cut() {
        let pts = vec![
            InkPoint {
                x: 0.0,
                y: 0.0,
                pressure: 0.5,
            },
            InkPoint {
                x: 100.0,
                y: 0.0,
                pressure: 0.5,
            },
        ];
        let pieces = erase(&pts, 2.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
    }

    /// Trait droit de x = 0 à 100, coupé en travers à x = 50 : trou visible entre les contours réels des deux morceaux
    /// (ceux du rendu).
    fn visible_hole(pressure: impl Fn(f32) -> f32, width: f32, radius: f32) -> f32 {
        let pts: Vec<InkPoint> = (0..=200)
            .map(|i| InkPoint {
                x: i as f32 * 0.5,
                y: 0.0,
                pressure: pressure(i as f32 / 200.0),
            })
            .collect();
        let pieces = erase(&pts, width, &[50.0, -40.0, 50.0, 40.0], radius).expect("touché");
        assert_eq!(pieces.len(), 2, "largeur {width}");
        let xs = |piece: &[InkPoint]| -> Vec<f32> {
            outline(piece, &InkStyle { width, constant: false })
                .as_chunks::<2>()
                .0
                .iter()
                .map(|c| c[0])
                .collect()
        };
        let left = xs(&pieces[0]).into_iter().fold(f32::MIN, f32::max);
        let right = xs(&pieces[1]).into_iter().fold(f32::MAX, f32::min);
        right - left
    }

    /// OG20 : le trou visible vaut le diamètre de la gomme, à toute pression et toute largeur.
    #[test]
    fn visible_hole_matches_eraser_diameter_on_real_outline() {
        let radius = 5.0;
        for width in [2.0f32, 8.0, 24.0] {
            for pressure in [0.2f32, 0.5, 1.0] {
                let hole = visible_hole(|_| pressure, width, radius);
                assert!(
                    (hole - 2.0 * radius).abs() < 0.05 * 2.0 * radius,
                    "largeur {width}, pression {pressure} : trou {hole}, gomme {}",
                    2.0 * radius
                );
            }
        }
    }

    /// OG20 : pression qui varie le long du trait (la coupe interpole la pression) ; chaque calotte prend le rayon de
    /// la pression au point coupé.
    #[test]
    fn visible_hole_with_varying_pressure() {
        let hole = visible_hole(|t| t, 24.0, 5.0);
        assert!((hole - 10.0).abs() < 0.5, "trou {hole}");
    }

    /// Pression invalide (lue 0,5 comme freedraw) : le trait reste coupé.
    #[test]
    fn invalid_pressure_still_cuts() {
        let pts: Vec<InkPoint> = line(100)
            .into_iter()
            .map(|p| InkPoint {
                pressure: -1.0,
                ..p
            })
            .collect();
        assert_eq!(
            erase(&pts, 24.0, &[50.0, -40.0, 50.0, 40.0], 5.0).map(|p| p.len()),
            Some(2)
        );
    }
}
