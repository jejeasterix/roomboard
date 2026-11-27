//! Contour à largeur variable (D7, DA7) : la seule géométrie de l'encre, pour le rendu ET la collision.
//! `freedraw` (portage MIT de perfect-freehand) n'est appelé qu'ici.
use freedraw::{
    get_stroke_outline_points, get_stroke_points, get_stroke_radius, InputPoint, StrokeOptions,
    StrokePoint,
};

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

/// Rayon du contour en un point de pression `pressure` : la formule de freedraw (`get_stroke_radius`, sans easing),
/// avec `THINNING`, soit `width × (0,25 + 0,5 × pression)` ; `width / 2` à pression 0,5. La gomme partielle coupe
/// avec ce rayon (OG20). Comme freedraw : pression négative ou NaN lue 0,5 (`get_stroke_points.rs`), rayon d'au moins
/// 0,01 (`get_stroke_outline_points.rs`).
pub fn outline_radius(width: f32, pressure: f32) -> f32 {
    let pressure = if pressure >= 0.0 { pressure } else { 0.5 };
    (get_stroke_radius(f64::from(width), THINNING, f64::from(pressure), None) as f32).max(0.01)
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
    let options = options(style, last);
    // `get_stroke` de freedraw, en deux temps : les points lissés servent à redresser la calotte de départ.
    let stroke = get_stroke_points(&input, &options);
    let mut poly = get_stroke_outline_points(&stroke, &options);
    if poly.len() < 3 {
        return dot(first, style);
    }
    turn_start_cap_backward(&mut poly, &stroke);
    poly.iter()
        .flat_map(|p| [p[0] as f32, p[1] as f32])
        .collect()
}

/// OF45 : freedraw 1.0.4 tourne la calotte de départ vers l'intérieur du trait (`get_stroke_outline_points.rs` :
/// `start_right` tourné de π à 0 autour du premier point, la formule de la calotte de fin). Le début de chaque trait
/// montre une encoche en demi-disque de rayon r. Le polygone commence par `start_left`, puis l'arc en 5 sommets
/// (`start_left` répété … `start_right`) quand il y a au moins deux points lissés. Les 3 sommets intérieurs de l'arc
/// sont reflétés par la droite `start_left`–`start_right` : même demi-cercle, tourné vers l'arrière.
/// Rien ne bouge si l'arc bombe déjà vers l'arrière (freedraw corrigé un jour) ou si la forme attendue manque :
/// l'opération est donc idempotente.
fn turn_start_cap_backward(poly: &mut [[f64; 2]], stroke: &[StrokePoint]) {
    if stroke.len() < 2 || poly.len() < 6 {
        return;
    }
    let (a, b) = (poly[0], poly[5]);
    let (nx, ny) = (b[0] - a[0], b[1] - a[1]);
    let n2 = nx * nx + ny * ny;
    // `poly[1]` est `start_left` tourné de FIXED_PI (π + 0,0001) : égal à `poly[0]` à 1e-4 × diamètre près.
    let (ex, ey) = (poly[1][0] - a[0], poly[1][1] - a[1]);
    if n2 <= f64::EPSILON || ex * ex + ey * ey > 1e-6 * n2 {
        return;
    }
    let c = [(a[0] + b[0]) / 2.0, (a[1] + b[1]) / 2.0];
    // `poly[5]` doit être diamétralement opposé à `poly[0]` autour du premier point lissé (arc à 4 pas de freedraw
    // 1.0.4) : sinon la forme a changé et rien ne bouge.
    let p0 = stroke[0].point;
    let (dx, dy) = (c[0] - p0[0], c[1] - p0[1]);
    if dx * dx + dy * dy > 1e-6 * n2 {
        return;
    }
    // Sens du trait : freedraw oriente les calottes par `vector`, qui pointe vers le point précédent.
    let dir = [-stroke[0].vector[0], -stroke[0].vector[1]];
    let ahead = |q: [f64; 2]| (q[0] - c[0]) * dir[0] + (q[1] - c[1]) * dir[1];
    if ahead(poly[3]) <= 0.0 {
        return;
    }
    for q in &mut poly[2..5] {
        // Réflexion par la droite (c, n) : on retire deux fois la composante perpendiculaire à n.
        let (vx, vy) = (q[0] - c[0], q[1] - c[1]);
        let k = (vx * nx + vy * ny) / n2;
        let (px, py) = (vx - k * nx, vy - k * ny);
        *q = [q[0] - 2.0 * px, q[1] - 2.0 * py];
    }
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
    use crate::ink::hit::point_in_polygon;

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

    /// OF45 : redresser deux fois ne change rien (garde « l'arc bombe déjà vers l'arrière »).
    #[test]
    fn turning_start_cap_is_idempotent() {
        let pts: Vec<InkPoint> = (0..20)
            .map(|i| InkPoint {
                x: i as f32 * 2.0,
                y: i as f32,
                pressure: 0.7,
            })
            .collect();
        let input: Vec<InputPoint> = pts
            .iter()
            .map(|p| InputPoint::Struct {
                x: f64::from(p.x),
                y: f64::from(p.y),
                pressure: Some(f64::from(p.pressure)),
            })
            .collect();
        let opts = options(&InkStyle { width: 10.0 }, true);
        let stroke = get_stroke_points(&input, &opts);
        let mut poly = get_stroke_outline_points(&stroke, &opts);
        let raw = poly.clone();
        turn_start_cap_backward(&mut poly, &stroke);
        assert_ne!(poly, raw, "le premier passage redresse l'arc");
        let once = poly.clone();
        turn_start_cap_backward(&mut poly, &stroke);
        assert_eq!(poly, once);
    }

    /// OF45 : la calotte de départ bombe vers l'arrière, comme celle de la fin bombe vers l'avant. freedraw 1.0.4
    /// la tourne vers l'intérieur du trait : encoche en demi-disque de rayon r au début de chaque trait.
    #[test]
    fn start_cap_bulges_backward() {
        let s = InkStyle { width: 8.0 };
        for pressure in [0.15f32, 0.5, 1.0] {
            // Rayon de freedraw : taille × (0,25 + 0,5 × pression) pour thinning 0,5.
            let r = 8.0 * (0.25 + 0.5 * pressure);
            for (dx, dy) in [(2.0f32, 0.0f32), (0.0, -3.0), (-1.5, 1.5)] {
                let pts: Vec<InkPoint> = (0..30)
                    .map(|i| InkPoint {
                        x: 100.0 + i as f32 * dx,
                        y: 50.0 + i as f32 * dy,
                        pressure,
                    })
                    .collect();
                let len = (dx * dx + dy * dy).sqrt();
                let (ux, uy) = (dx / len, dy / len);
                for o in [outline(&pts, &s), outline_with(&pts, &s, false)] {
                    // Avance de chaque sommet le long du trait, depuis le premier point.
                    let back = o
                        .as_chunks::<2>()
                        .0
                        .iter()
                        .map(|c| (c[0] - 100.0) * ux + (c[1] - 50.0) * uy)
                        .fold(f32::MAX, f32::min);
                    assert!(
                        back < -0.9 * r && back > -1.1 * r,
                        "pression {pressure}, sens ({dx}, {dy}) : le contour recule de {back}, attendu {}",
                        -r
                    );
                    // Plus d'encoche : le début du trait, sur l'axe, est plein (un demi-rayon avant et après p0).
                    for t in [-0.5 * r, 0.25 * r, 0.5 * r, 0.9 * r] {
                        assert!(
                            point_in_polygon(&o, 100.0 + t * ux, 50.0 + t * uy),
                            "pression {pressure}, sens ({dx}, {dy}) : trou à {t} du premier point"
                        );
                    }
                }
            }
        }
    }
}
