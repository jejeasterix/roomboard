//! Gomme partielle (D12) : retire les points de la ligne médiane à moins de `radius + half_width` du chemin de la
//! gomme et interpole les extrémités sur ce cercle. Un trait devient 0, 1 ou plusieurs morceaux.
use super::hit::dist_to_path;
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

/// Point du segment [a, b] où la distance au chemin franchit `reach` (dichotomie, 24 pas).
fn boundary(a: InkPoint, b: InkPoint, path: &[f32], reach: f32) -> InkPoint {
    let inside_a = dist_to_path(path, a.x, a.y) <= reach;
    let (mut lo, mut hi) = (0.0f32, 1.0f32);
    for _ in 0..24 {
        let mid = (lo + hi) / 2.0;
        let m = lerp(a, b, mid);
        if (dist_to_path(path, m.x, m.y) <= reach) == inside_a {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lerp(a, b, (lo + hi) / 2.0)
}

pub fn erase(
    points: &[InkPoint],
    half_width: f32,
    path: &[f32],
    radius: f32,
) -> Option<Vec<Vec<InkPoint>>> {
    let reach = radius + half_width;
    let pts = densify(points, (reach / 2.0).max(0.25));
    let covered = |p: &InkPoint| dist_to_path(path, p.x, p.y) <= reach;
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
                let b = boundary(q, p, path, reach);
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
        assert_eq!(erase(&line(100), 2.0, &[50.0, 40.0, 60.0, 40.0], 5.0), None);
    }

    #[test]
    fn erase_through_middle_gives_two_pieces() {
        let pieces = erase(&line(100), 2.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
        assert!(pieces[0].iter().all(|p| p.x < 50.0));
        assert!(pieces[1].iter().all(|p| p.x > 50.0));
    }

    #[test]
    fn erase_start_gives_one_piece() {
        let pieces = erase(&line(100), 2.0, &[0.0, -20.0, 0.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 1);
        assert!(pieces[0][0].x > 6.9);
    }

    #[test]
    fn erase_everything_gives_no_piece() {
        assert_eq!(erase(&line(10), 2.0, &[5.0, 0.0], 50.0), Some(vec![]));
    }

    #[test]
    fn cut_point_lies_on_reach_circle() {
        let path = [50.0, -20.0, 50.0, 20.0];
        let pieces = erase(&line(100), 2.0, &path, 5.0).expect("touché");
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
        let pieces = erase(&pts, 1.0, &[50.0, -20.0, 50.0, 20.0], 5.0).expect("touché");
        assert_eq!(pieces.len(), 2);
    }
}
