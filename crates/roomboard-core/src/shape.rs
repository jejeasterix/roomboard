//! Formes (D13) : géométrie locale. Rectangle et ellipse : boîte (0, 0)-(w, h), w et h ≥ 0, `transform` place le coin
//! haut-gauche. Ligne et flèche : segment (0, 0)-(w, h), `transform` place le départ. Miroir TS exact :
//! `apps/web/src/core/shapes.ts` (joué par le contrat, T54).

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_round_trip() {
        for k in [ShapeKind::Rect, ShapeKind::Ellipse, ShapeKind::Line, ShapeKind::Arrow] {
            assert_eq!(ShapeKind::parse(k.as_str()), Some(k));
        }
        assert_eq!(ShapeKind::parse("triangle"), None);
    }

    #[test]
    fn normalize_rect_takes_min_corner() {
        assert_eq!(normalize(ShapeKind::Rect, 300.0, 200.0, 100.0, 50.0), (100.0, 50.0, 200.0, 150.0));
        assert_eq!(normalize(ShapeKind::Ellipse, 10.0, 10.0, 30.0, 5.0), (10.0, 5.0, 20.0, 5.0));
    }

    #[test]
    fn normalize_line_keeps_direction() {
        assert_eq!(normalize(ShapeKind::Arrow, 300.0, 200.0, 100.0, 50.0), (300.0, 200.0, -200.0, -150.0));
    }

    #[test]
    fn polygon_of_rect_is_widened_by_half_width() {
        assert_eq!(
            shape_polygon(ShapeKind::Rect, 200.0, 100.0, 4.0),
            vec![-2.0, -2.0, 202.0, -2.0, 202.0, 102.0, -2.0, 102.0]
        );
        // demi-épaisseur au moins 1
        assert_eq!(shape_polygon(ShapeKind::Ellipse, 10.0, 10.0, 0.5)[0], -1.0);
        assert_eq!(box_polygon(600.0, 45.0), vec![0.0, 0.0, 600.0, 0.0, 600.0, 45.0, 0.0, 45.0]);
    }

    #[test]
    fn polygon_of_segment_covers_its_ends() {
        let p = shape_polygon(ShapeKind::Line, 100.0, 0.0, 4.0);
        assert_eq!(p, vec![-2.0, 2.0, 102.0, 2.0, 102.0, -2.0, -2.0, -2.0]);
        assert_eq!(shape_polygon(ShapeKind::Line, 0.0, 0.0, 4.0).len(), 8, "segment nul : carré autour du point");
    }
}
