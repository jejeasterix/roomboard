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
}
