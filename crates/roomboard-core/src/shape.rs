//! Formes (D13) : géométrie locale. Rectangle et ellipse : boîte (0, 0)-(w, h), w et h ≥ 0, `transform` place le coin
//! haut-gauche. Ligne et flèche : segment (0, 0)-(w, h), `transform` place le départ. Miroir TS exact :
//! `apps/web/src/core/shapes.ts` (joué par le contrat, T54).

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ShapeKind {
    Rect,
    Ellipse,
    Line,
    Arrow,
}

impl ShapeKind {
    pub fn parse(s: &str) -> Option<ShapeKind> {
        Some(match s {
            "rect" => ShapeKind::Rect,
            "ellipse" => ShapeKind::Ellipse,
            "line" => ShapeKind::Line,
            "arrow" => ShapeKind::Arrow,
            _ => return None,
        })
    }

    pub fn as_str(self) -> &'static str {
        match self {
            ShapeKind::Rect => "rect",
            ShapeKind::Ellipse => "ellipse",
            ShapeKind::Line => "line",
            ShapeKind::Arrow => "arrow",
        }
    }

    pub fn is_segment(self) -> bool {
        matches!(self, ShapeKind::Line | ShapeKind::Arrow)
    }
}

/// Sommets du polygone inscrit d'une ellipse (CL4-7, constat 5 de T60) ; même nombre dans `shapes.ts`.
pub const ELLIPSE_VERTICES: usize = 64;

/// (tx, ty, w, h) depuis les deux coins du geste (monde).
pub fn normalize(kind: ShapeKind, x0: f64, y0: f64, x1: f64, y1: f64) -> (f64, f64, f64, f64) {
    if kind.is_segment() {
        (x0, y0, x1 - x0, y1 - y0)
    } else {
        (x0.min(x1), y0.min(y1), (x1 - x0).abs(), (y1 - y0).abs())
    }
}

/// Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : toute la surface du rectangle
/// et de l'ellipse (CL4-7), segment épaissi pour la ligne et la flèche.
pub fn shape_polygon(kind: ShapeKind, w: f64, h: f64, width: f32) -> Vec<f32> {
    let half = (f64::from(width) / 2.0).max(1.0);
    let pts: [f64; 8] = if kind.is_segment() {
        let len = w.hypot(h);
        let (ux, uy) = if len > 1e-9 {
            (w / len, h / len)
        } else {
            (1.0, 0.0)
        };
        let (nx, ny) = (-uy * half, ux * half);
        let (bx, by) = (-ux * half, -uy * half);
        let (ex, ey) = (w + ux * half, h + uy * half);
        [
            bx + nx,
            by + ny,
            ex + nx,
            ey + ny,
            ex - nx,
            ey - ny,
            bx - nx,
            by - ny,
        ]
    } else {
        [
            -half,
            -half,
            w + half,
            -half,
            w + half,
            h + half,
            -half,
            h + half,
        ]
    };
    pts.iter().map(|v| *v as f32).collect()
}

/// Boîte locale (0, 0)-(w, h) d'un texte.
pub fn box_polygon(w: f64, h: f64) -> Vec<f32> {
    vec![0.0, 0.0, w as f32, 0.0, w as f32, h as f32, 0.0, h as f32]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_round_trip() {
        for k in [
            ShapeKind::Rect,
            ShapeKind::Ellipse,
            ShapeKind::Line,
            ShapeKind::Arrow,
        ] {
            assert_eq!(ShapeKind::parse(k.as_str()), Some(k));
        }
        assert_eq!(ShapeKind::parse("triangle"), None);
    }

    #[test]
    fn normalize_rect_takes_min_corner() {
        assert_eq!(
            normalize(ShapeKind::Rect, 300.0, 200.0, 100.0, 50.0),
            (100.0, 50.0, 200.0, 150.0)
        );
        assert_eq!(
            normalize(ShapeKind::Ellipse, 10.0, 10.0, 30.0, 5.0),
            (10.0, 5.0, 20.0, 5.0)
        );
    }

    #[test]
    fn normalize_line_keeps_direction() {
        assert_eq!(
            normalize(ShapeKind::Arrow, 300.0, 200.0, 100.0, 50.0),
            (300.0, 200.0, -200.0, -150.0)
        );
    }

    #[test]
    fn polygon_of_rect_is_widened_by_half_width() {
        assert_eq!(
            shape_polygon(ShapeKind::Rect, 200.0, 100.0, 4.0),
            vec![-2.0, -2.0, 202.0, -2.0, 202.0, 102.0, -2.0, 102.0]
        );
        // demi-épaisseur au moins 1
        assert_eq!(shape_polygon(ShapeKind::Ellipse, 10.0, 10.0, 0.5)[0], -1.0);
        assert_eq!(
            box_polygon(600.0, 45.0),
            vec![0.0, 0.0, 600.0, 0.0, 600.0, 45.0, 0.0, 45.0]
        );
    }

    #[test]
    fn polygon_of_segment_covers_its_ends() {
        let p = shape_polygon(ShapeKind::Line, 100.0, 0.0, 4.0);
        assert_eq!(p, vec![-2.0, 2.0, 102.0, 2.0, 102.0, -2.0, -2.0, -2.0]);
        assert_eq!(
            shape_polygon(ShapeKind::Line, 0.0, 0.0, 4.0).len(),
            8,
            "segment nul : carré autour du point"
        );
    }

    fn vertices(p: &[f32]) -> Vec<(f64, f64)> {
        p.as_chunks::<2>()
            .0
            .iter()
            .map(|c| (f64::from(c[0]), f64::from(c[1])))
            .collect()
    }

    /// Constat 4 de T60 : les extrémités des ailes dessinées (`canvas2d.ts`, `arrowHead` : longueur max(12, 3 ×
    /// épaisseur), ±25° derrière la fin) sont des sommets du polygone ; la ligne et la flèche nulle n'en ont pas.
    #[test]
    fn polygon_of_arrow_includes_its_wing_ends() {
        let p = shape_polygon(ShapeKind::Arrow, 100.0, 0.0, 4.0);
        let v = vertices(&p);
        let (lx, ly) = (100.0 - 12.0 * 25f64.to_radians().cos(), 12.0 * 25f64.to_radians().sin());
        for (wx, wy) in [(lx, ly), (lx, -ly)] {
            assert!(
                v.iter().any(|(x, y)| (x - wx).abs() < 1e-4 && (y - wy).abs() < 1e-4),
                "aile ({wx}, {wy}) absente de {v:?}"
            );
        }
        assert!(crate::ink::hit::point_in_polygon(&p, 90.0, 4.5));
        assert!(!crate::ink::hit::point_in_polygon(&p, 50.0, 4.5));
        let thick = vertices(&shape_polygon(ShapeKind::Arrow, 0.0, 200.0, 10.0));
        assert!(
            thick
                .iter()
                .any(|(x, y)| (x - 30.0 * 25f64.to_radians().sin()).abs() < 1e-4
                    && (y - (200.0 - 30.0 * 25f64.to_radians().cos())).abs() < 1e-4),
            "longueur 3 × épaisseur : {thick:?}"
        );
        assert_eq!(shape_polygon(ShapeKind::Line, 100.0, 0.0, 4.0).len(), 8);
        assert_eq!(shape_polygon(ShapeKind::Arrow, 0.0, 0.0, 4.0).len(), 8);
    }

    /// Constat 5 de T60 (HL4-4, CL4-7 « surface de l'ellipse ») : polygone inscrit de `ELLIPSE_VERTICES` sommets sur
    /// l'ellipse élargie ; les coins de la boîte n'en sont plus, les extrêmes (bornes) restent exacts.
    #[test]
    fn polygon_of_ellipse_follows_the_ellipse() {
        let p = shape_polygon(ShapeKind::Ellipse, 100.0, 50.0, 4.0);
        assert_eq!(p.len(), 2 * ELLIPSE_VERTICES);
        let v = vertices(&p);
        for (x, y) in &v {
            let r = ((x - 50.0) / 52.0).powi(2) + ((y - 25.0) / 27.0).powi(2);
            assert!((r - 1.0).abs() < 1e-5, "({x}, {y}) hors de l'ellipse : {r}");
        }
        let (x0, x1) = v.iter().fold((f64::MAX, f64::MIN), |(a, b), (x, _)| (a.min(*x), b.max(*x)));
        let (y0, y1) = v.iter().fold((f64::MAX, f64::MIN), |(a, b), (_, y)| (a.min(*y), b.max(*y)));
        assert_eq!((x0, y0, x1, y1), (-2.0, -2.0, 102.0, 52.0));
        assert!(crate::ink::hit::point_in_polygon(&p, 50.0, 25.0));
        assert!(!crate::ink::hit::hit_outline(&p, 1.0, 1.0, 1.0), "coin de la boîte");
    }
}
