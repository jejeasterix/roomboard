//! Collision sur le contour (DA7) : point dans le polygone (règle pair-impair) ou à moins de `tol` d'une arête.

pub fn point_in_polygon(poly: &[f32], x: f32, y: f32) -> bool {
    let n = poly.len() / 2;
    if n < 3 {
        return false;
    }
    let mut inside = false;
    let mut j = n - 1;
    for i in 0..n {
        let (xi, yi) = (poly[2 * i], poly[2 * i + 1]);
        let (xj, yj) = (poly[2 * j], poly[2 * j + 1]);
        if (yi > y) != (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi {
            inside = !inside;
        }
        j = i;
    }
    inside
}

pub fn dist_point_segment(p: (f32, f32), a: (f32, f32), b: (f32, f32)) -> f32 {
    let (dx, dy) = (b.0 - a.0, b.1 - a.1);
    let l2 = dx * dx + dy * dy;
    let t = if l2 == 0.0 {
        0.0
    } else {
        (((p.0 - a.0) * dx + (p.1 - a.1) * dy) / l2).clamp(0.0, 1.0)
    };
    (p.0 - (a.0 + t * dx)).hypot(p.1 - (a.1 + t * dy))
}

pub fn dist_to_edges(poly: &[f32], x: f32, y: f32) -> f32 {
    let n = poly.len() / 2;
    if n == 0 {
        return f32::INFINITY;
    }
    (0..n)
        .map(|i| {
            let k = (i + 1) % n;
            dist_point_segment(
                (x, y),
                (poly[2 * i], poly[2 * i + 1]),
                (poly[2 * k], poly[2 * k + 1]),
            )
        })
        .fold(f32::INFINITY, f32::min)
}

/// Distance d'un point à une polyligne ouverte (paires x, y) ; un seul point = distance à ce point.
pub fn dist_to_path(path: &[f32], x: f32, y: f32) -> f32 {
    let n = path.len() / 2;
    match n {
        0 => f32::INFINITY,
        1 => (x - path[0]).hypot(y - path[1]),
        _ => (0..n - 1)
            .map(|i| {
                dist_point_segment(
                    (x, y),
                    (path[2 * i], path[2 * i + 1]),
                    (path[2 * i + 2], path[2 * i + 3]),
                )
            })
            .fold(f32::INFINITY, f32::min),
    }
}

/// Points de la polyligne, plus des points intermédiaires tous les `step` au plus.
pub fn sample_path(path: &[f32], step: f32) -> Vec<(f32, f32)> {
    let pts: Vec<(f32, f32)> = path
        .as_chunks::<2>()
        .0
        .iter()
        .map(|c| (c[0], c[1]))
        .collect();
    let mut out = Vec::new();
    for (i, &a) in pts.iter().enumerate() {
        out.push(a);
        if let Some(&b) = pts.get(i + 1) {
            let len = (b.0 - a.0).hypot(b.1 - a.1);
            let k = (len / step.max(1e-3)).ceil() as usize;
            for s in 1..k {
                let t = s as f32 / k as f32;
                out.push((a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t));
            }
        }
    }
    out
}

pub fn hit_outline(poly: &[f32], x: f32, y: f32, tol: f32) -> bool {
    point_in_polygon(poly, x, y) || dist_to_edges(poly, x, y) <= tol
}

/// Le chemin de la gomme d'objet (paires x, y) touche-t-il le contour, à `radius` près ?
pub fn path_hits_outline(poly: &[f32], path: &[f32], radius: f32) -> bool {
    path_hits_outline_by(poly, path, radius, |x, y| hit_outline(poly, x, y, radius))
}

/// Boîte (x0, y0, x1, y1) de paires x, y ; `None` si vide ou si une coordonnée n'est pas finie.
fn finite_box(pairs: &[f32]) -> Option<[f32; 4]> {
    let mut b: Option<[f32; 4]> = None;
    for c in pairs.as_chunks::<2>().0 {
        if !(c[0].is_finite() && c[1].is_finite()) {
            return None;
        }
        b = Some(match b {
            Some([x0, y0, x1, y1]) => [x0.min(c[0]), y0.min(c[1]), x1.max(c[0]), y1.max(c[1])],
            None => [c[0], c[1], c[0], c[1]],
        });
    }
    b
}

/// `path_hits_outline` avec le test de point en paramètre (les tests comptent les points testés).
///
/// Préfiltre exact (D38 : aperçu à chaque image ; DA7 : même résultat qu'un test de chaque point) : un point à plus
/// de `radius` de la boîte du contour n'est ni dedans ni à `radius` d'une arête. La boîte est élargie du rayon plus
/// une marge d'arrondi ; un contour sans boîte finie (séparateur NaN, où la règle pair-impair peut dire « dedans »
/// hors de la boîte), un chemin non fini ou un rayon non fini gardent le test de chaque point.
fn path_hits_outline_by(
    poly: &[f32],
    path: &[f32],
    radius: f32,
    mut test: impl FnMut(f32, f32) -> bool,
) -> bool {
    let step = (radius / 2.0).max(0.25);
    let (Some([x0, y0, x1, y1]), Some([px0, py0, px1, py1]), true) =
        (finite_box(poly), finite_box(path), radius.is_finite())
    else {
        return sample_path(path, step).into_iter().any(|(x, y)| test(x, y));
    };
    let reach = radius.max(0.0);
    let extent = x0.abs().max(y0.abs()).max(x1.abs()).max(y1.abs());
    let pad = reach + (reach + extent) * 1e-4 + 1e-3;
    let (x0, y0, x1, y1) = (x0 - pad, y0 - pad, x1 + pad, y1 + pad);
    if px1 < x0 || px0 > x1 || py1 < y0 || py0 > y1 {
        return false;
    }
    sample_path(path, step)
        .into_iter()
        .filter(|&(x, y)| x >= x0 && x <= x1 && y >= y0 && y <= y1)
        .any(|(x, y)| test(x, y))
}

#[cfg(test)]
mod tests {
    use super::*;

    const SQUARE: [f32; 8] = [0.0, 0.0, 10.0, 0.0, 10.0, 10.0, 0.0, 10.0];

    #[test]
    fn point_inside_square() {
        assert!(point_in_polygon(&SQUARE, 5.0, 5.0));
    }

    #[test]
    fn point_outside_square() {
        assert!(!point_in_polygon(&SQUARE, 15.0, 5.0));
    }

    #[test]
    fn near_edge_hits_within_tolerance_only() {
        assert!(hit_outline(&SQUARE, 12.0, 5.0, 2.5));
        assert!(!hit_outline(&SQUARE, 12.0, 5.0, 1.5));
    }

    #[test]
    fn dist_point_segment_clamps_to_ends() {
        assert!((dist_point_segment((-3.0, 4.0), (0.0, 0.0), (10.0, 0.0)) - 5.0).abs() < 1e-5);
        assert!((dist_point_segment((5.0, 2.0), (0.0, 0.0), (10.0, 0.0)) - 2.0).abs() < 1e-5);
    }

    #[test]
    fn dist_to_single_point_path() {
        assert!((dist_to_path(&[0.0, 0.0], 3.0, 4.0) - 5.0).abs() < 1e-5);
    }

    #[test]
    fn sample_path_spacing_is_at_most_step() {
        let s = sample_path(&[0.0, 0.0, 10.0, 0.0], 2.0);
        assert!(s.len() >= 6);
        for w in s.windows(2) {
            assert!(((w[1].0 - w[0].0).powi(2) + (w[1].1 - w[0].1).powi(2)).sqrt() <= 2.0 + 1e-4);
        }
    }

    #[test]
    fn path_crossing_outline_hits() {
        assert!(path_hits_outline(&SQUARE, &[-20.0, 5.0, 30.0, 5.0], 1.0));
    }

    #[test]
    fn path_far_from_outline_misses() {
        assert!(!path_hits_outline(&SQUARE, &[-20.0, 50.0, 30.0, 50.0], 1.0));
    }

    /// Référence sans préfiltre : chaque point échantillonné testé contre le contour.
    fn naive(poly: &[f32], path: &[f32], radius: f32) -> bool {
        sample_path(path, (radius / 2.0).max(0.25))
            .into_iter()
            .any(|(x, y)| hit_outline(poly, x, y, radius))
    }

    fn tested(poly: &[f32], path: &[f32], radius: f32) -> (bool, usize) {
        let mut n = 0;
        let hit = path_hits_outline_by(poly, path, radius, |x, y| {
            n += 1;
            hit_outline(poly, x, y, radius)
        });
        (hit, n)
    }

    #[test]
    fn far_path_tests_no_sample() {
        let (hit, n) = tested(&SQUARE, &[100.0, 100.0, 200.0, 100.0], 2.0);
        assert!(!hit);
        assert_eq!(
            n, 0,
            "contour loin du chemin : écarté par sa boîte, aucun point testé"
        );
    }

    #[test]
    fn long_path_tests_only_samples_near_the_outline() {
        let (hit, n) = tested(&SQUARE, &[5.0, -1000.0, 5.0, 1000.0], 2.0);
        assert!(hit);
        assert!(
            n <= 4,
            "seuls les points proches de la boîte sont testés : {n}"
        );
    }

    /// DA7 : le préfiltre ne change aucun résultat (aperçu et commande passent par `path_hits_outline`). Bords à
    /// distance exacte du rayon, rayons nul, négatif ou NaN, contour vide, réduit à un point, ou ouvert par un
    /// séparateur NaN (la règle pair-impair dit alors « dedans » hors de la boîte).
    #[test]
    fn prefilter_keeps_the_result() {
        let triangle = [0.0, 0.0, 20.0, 0.0, 10.0, 15.0];
        let open = [0.0, 0.0, 10.0, 0.0, 10.0, 10.0, f32::NAN, f32::NAN];
        assert!(naive(&open, &[-60.0, 5.0, -40.0, 5.0], 1.0));
        let polys: [&[f32]; 5] = [&SQUARE, &triangle, &open, &[3.0, 3.0], &[]];
        let mut cases = 0;
        for poly in polys {
            for radius in [0.5, 2.0, 3.0, 0.0, -1.0, f32::NAN] {
                for off in [
                    -30.0, -12.5, -12.0, -11.0, -2.0, -0.5, 0.0, 5.0, 10.5, 12.0, 12.5, 14.0, 40.0,
                ] {
                    for path in [
                        vec![off, -50.0, off, 50.0],
                        vec![-50.0, off, 50.0, off],
                        vec![-60.0, off, -40.0, off],
                        vec![off, off, off + 3.0, off + 4.0],
                        vec![off - 20.0, off + 20.0, off + 20.0, off - 20.0],
                        vec![off, off],
                    ] {
                        assert_eq!(
                            path_hits_outline(poly, &path, radius),
                            naive(poly, &path, radius),
                            "{poly:?} {path:?} r = {radius}"
                        );
                        cases += 1;
                    }
                }
            }
        }
        assert_eq!(cases, 5 * 6 * 13 * 6);
    }
}
