//! Contour à largeur variable (D7, DA7) : la seule géométrie de l'encre, pour le rendu ET la collision.
//! `freedraw` (portage MIT de perfect-freehand) n'est appelé qu'ici.
use freedraw::{get_stroke, InputPoint, StrokeOptions};

use super::points::InkPoint;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InkStyle {
    pub width: f32,
}

/// Réglages fixés au lot 2 (H2-12), revus après l'essai ENI. Streamline bas : moins de traînée sur l'encre vive.
pub const THINNING: f64 = 0.5;
pub const SMOOTHING: f64 = 0.5;
pub const STREAMLINE: f64 = 0.3;

/// `simulate_pressure` coupé : freedraw l'active par défaut et recalcule alors la pression depuis la vitesse
/// (`get_stroke_outline_points.rs:27,134`), contraire à D8.
fn options(style: &InkStyle, last: bool) -> StrokeOptions {
    StrokeOptions {
        size: Some(f64::from(style.width)),
        thinning: Some(THINNING),
        smoothing: Some(SMOOTHING),
        streamline: Some(STREAMLINE),
        simulate_pressure: Some(false),
        last: Some(last),
        ..Default::default()
    }
}

/// Contour d'un trait terminé : polygone fermé, x, y alternés, dans le repère des points.
pub fn outline(points: &[InkPoint], style: &InkStyle) -> Vec<f32> {
    outline_with(points, style, true)
}

/// `last = false` pendant le geste (la fin du trait n'est pas encore connue).
pub(crate) fn outline_with(points: &[InkPoint], style: &InkStyle, last: bool) -> Vec<f32> {
    let Some(first) = points.first() else {
        return Vec::new();
    };
    let input: Vec<InputPoint> = points
        .iter()
        .map(|p| InputPoint::Struct {
            x: f64::from(p.x),
            y: f64::from(p.y),
            pressure: Some(f64::from(p.pressure)),
        })
        .collect();
    let poly = get_stroke(&input, &options(style, last));
    if poly.len() < 3 {
        return dot(first, style);
    }
    poly.iter()
        .flat_map(|p| [p[0] as f32, p[1] as f32])
        .collect()
}

/// Repli pour un point isolé : disque à 16 côtés de diamètre `width`.
fn dot(p: &InkPoint, style: &InkStyle) -> Vec<f32> {
    let r = (style.width / 2.0).max(0.5);
    (0..16)
        .flat_map(|i| {
            let a = i as f32 * std::f32::consts::TAU / 16.0;
            [p.x + r * a.cos(), p.y + r * a.sin()]
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(n: usize, pressure: f32) -> Vec<InkPoint> {
        (0..n)
            .map(|i| InkPoint {
                x: i as f32 * 2.0,
                y: 0.0,
                pressure,
            })
            .collect()
    }

    fn height(poly: &[f32]) -> f32 {
        let ys: Vec<f32> = poly.as_chunks::<2>().0.iter().map(|c| c[1]).collect();
        ys.iter().cloned().fold(f32::MIN, f32::max) - ys.iter().cloned().fold(f32::MAX, f32::min)
    }

    /// Hauteur des seuls sommets de la moitié centrale (en x) : hors calottes, que freedraw calcule toujours avec
    /// la pression brute, même quand il simule la pression.
    fn mid_height(poly: &[f32]) -> f32 {
        let (lo, hi) = poly
            .as_chunks::<2>()
            .0
            .iter()
            .fold((f32::MAX, f32::MIN), |(lo, hi), c| {
                (lo.min(c[0]), hi.max(c[0]))
            });
        let (a, b) = (lo + (hi - lo) / 4.0, hi - (hi - lo) / 4.0);
        let ys: Vec<f32> = poly
            .as_chunks::<2>()
            .0
            .iter()
            .filter(|c| c[0] > a && c[0] < b)
            .map(|c| c[1])
            .collect();
        assert!(
            ys.len() >= 4,
            "trop peu de sommets au milieu : {}",
            ys.len()
        );
        ys.iter().cloned().fold(f32::MIN, f32::max) - ys.iter().cloned().fold(f32::MAX, f32::min)
    }

    #[test]
    fn outline_is_a_polygon_of_xy_pairs() {
        let o = outline(&line(30, 0.5), &InkStyle { width: 8.0 });
        assert!(
            o.len() >= 6 && o.len().is_multiple_of(2),
            "longueur {}",
            o.len()
        );
        assert!(o.iter().all(|v| v.is_finite()));
    }

    #[test]
    fn empty_points_give_empty_outline() {
        assert!(outline(&[], &InkStyle { width: 8.0 }).is_empty());
    }

    #[test]
    fn single_point_gives_a_dot() {
        let o = outline(&line(1, 0.5), &InkStyle { width: 8.0 });
        assert!(o.len() >= 6);
    }

    #[test]
    fn wider_style_gives_wider_outline() {
        let thin = height(&outline(&line(30, 0.5), &InkStyle { width: 4.0 }));
        let thick = height(&outline(&line(30, 0.5), &InkStyle { width: 16.0 }));
        assert!(thick > thin * 2.0, "{thin} {thick}");
    }

    #[test]
    fn higher_pressure_gives_wider_outline() {
        let light = height(&outline(&line(30, 0.1), &InkStyle { width: 8.0 }));
        let heavy = height(&outline(&line(30, 1.0), &InkStyle { width: 8.0 }));
        assert!(heavy > light, "{light} {heavy}");
    }

    #[test]
    fn outline_is_deterministic() {
        let s = InkStyle { width: 8.0 };
        assert_eq!(outline(&line(50, 0.5), &s), outline(&line(50, 0.5), &s));
    }

    /// D8 : la largeur vient de la pression reçue, jamais de la vitesse. Avec `simulate_pressure` au défaut de
    /// freedraw, le trait lent (pas de 1) gonfle vers 11 et le rapide (pas de 20) maigrit vers 4.
    #[test]
    fn speed_does_not_change_width() {
        let s = InkStyle { width: 8.0 };
        let spaced = |step: f32| -> Vec<InkPoint> {
            (0..200)
                .map(|i| InkPoint {
                    x: i as f32 * step,
                    y: 0.0,
                    pressure: 0.5,
                })
                .collect()
        };
        let slow = mid_height(&outline(&spaced(1.0), &s));
        let fast = mid_height(&outline(&spaced(20.0), &s));
        assert!((slow - fast).abs() < 0.4, "lent {slow}, rapide {fast}");
        assert!(
            (fast - 8.0).abs() < 0.8,
            "pression 0,5 : largeur {fast}, attendu 8"
        );
    }
}
