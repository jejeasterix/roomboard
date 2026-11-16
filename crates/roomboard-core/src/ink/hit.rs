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
    sample_path(path, (radius / 2.0).max(0.25))
        .into_iter()
        .any(|(x, y)| hit_outline(poly, x, y, radius))
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
}
