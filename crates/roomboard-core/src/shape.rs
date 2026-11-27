//! Formes (D13) : géométrie locale. Rectangle et ellipse : boîte (0, 0)-(w, h), w et h ≥ 0, `transform` place le coin
//! haut-gauche. Ligne et flèche : (0, 0), points intérieurs facultatifs, (w, h) (OG12, DA-1), `transform` place le départ. Miroir TS exact :
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

/// Pointe de flèche (D13), même calcul que le rendu (`arrowHead` de `canvas2d.ts`) : extrémités des deux ailes,
/// longueur max(12, 3 × épaisseur) à ±25° derrière la fin du segment ; `None` pour un segment nul.
pub fn arrow_wings(w: f64, h: f64, width: f32) -> Option<[f64; 4]> {
    if w.hypot(h) < 1e-9 {
        return None;
    }
    let l = (3.0 * f64::from(width)).max(12.0);
    let back = (-h).atan2(-w);
    let a = 25.0 * std::f64::consts::PI / 180.0;
    Some([
        w + l * (back + a).cos(),
        h + l * (back + a).sin(),
        w + l * (back - a).cos(),
        h + l * (back - a).sin(),
    ])
}

/// Sommets de l'ellipse, départ à l'angle π ; `dir` = +1 (sens direct) ou −1 (sens inverse, trou).
fn ellipse_points(cx: f64, cy: f64, rx: f64, ry: f64, dir: f64) -> Vec<f64> {
    (0..ELLIPSE_VERTICES)
        .flat_map(|k| {
            let t = std::f64::consts::PI
                + dir * 2.0 * std::f64::consts::PI * k as f64 / ELLIPSE_VERTICES as f64;
            [cx + rx * t.cos(), cy + ry * t.sin()]
        })
        .collect()
}

/// Géométrie locale d'une forme (OG12) : `path` = points intérieurs à plat (ligne, flèche), `curve` = courbe de
/// Catmull-Rom (`roundness: "round"` hors coudée). `plain` : forme du socle.
#[derive(Debug, Clone, Copy)]
pub struct ShapeGeom<'a> {
    pub kind: ShapeKind,
    pub w: f64,
    pub h: f64,
    pub path: &'a [f64],
    pub curve: bool,
}

impl ShapeGeom<'static> {
    pub fn plain(kind: ShapeKind, w: f64, h: f64) -> ShapeGeom<'static> {
        ShapeGeom {
            kind,
            w,
            h,
            path: &[],
            curve: false,
        }
    }
}

/// Polygone local de collision et de bornes, élargi de la demi-épaisseur (au moins 1) : rectangle entier, ellipse
/// entière en `ELLIPSE_VERTICES` sommets inscrits (CL4-7), segment épaissi pour la ligne ; la flèche y ajoute sa pointe
/// (constat 4 de T60) : pied de chaque aile sur le bord du fût, puis son extrémité.
pub fn shape_polygon(s: &ShapeGeom<'_>, width: f32) -> Vec<f32> {
    let (kind, w, h) = (s.kind, s.w, s.h);
    if kind.is_segment() {
        let pts = crate::linear::flatten(&crate::linear::path_of(w, h, s.path), s.curve);
        if pts.len() > 2 {
            return band_polygon(&pts, width, kind == ShapeKind::Arrow);
        }
    }
    let half = (f64::from(width) / 2.0).max(1.0);
    let pts: Vec<f64> = match kind {
        ShapeKind::Rect => vec![
            -half,
            -half,
            w + half,
            -half,
            w + half,
            h + half,
            -half,
            h + half,
        ],
        ShapeKind::Ellipse => {
            // Départ à l'angle π, n multiple de 4 : les quatre extrêmes sont des sommets, les bornes restent exactes.
            let (cx, cy, rx, ry) = (w / 2.0, h / 2.0, w / 2.0 + half, h / 2.0 + half);
            ellipse_points(cx, cy, rx, ry, 1.0)
        }
        ShapeKind::Line | ShapeKind::Arrow => {
            let len = w.hypot(h);
            let (ux, uy) = if len > 1e-9 {
                (w / len, h / len)
            } else {
                (1.0, 0.0)
            };
            let (nx, ny) = (-uy * half, ux * half);
            let (bx, by) = (-ux * half, -uy * half);
            let (ex, ey) = (w + ux * half, h + uy * half);
            match arrow_wings(w, h, width).filter(|_| kind == ShapeKind::Arrow && len > 1e-9) {
                // Aile `back + a` du côté −n, aile `back − a` du côté +n ; pied = projection de l'extrémité sur l'axe,
                // jamais en deçà du départ élargi.
                Some([x1, y1, x2, y2]) => {
                    let k = (x2 * ux + y2 * uy).max(-half);
                    let (kx, ky) = (k * ux, k * uy);
                    vec![
                        bx + nx,
                        by + ny,
                        kx + nx,
                        ky + ny,
                        x2,
                        y2,
                        ex + nx,
                        ey + ny,
                        ex - nx,
                        ey - ny,
                        x1,
                        y1,
                        kx - nx,
                        ky - ny,
                        bx - nx,
                        by - ny,
                    ]
                }
                None => vec![
                    bx + nx,
                    by + ny,
                    ex + nx,
                    ey + ny,
                    ex - nx,
                    ey - ny,
                    bx - nx,
                    by - ny,
                ],
            }
        }
    };
    pts.iter().map(|v| *v as f32).collect()
}

/// Polyligne épaissie (OG12) : côté gauche à l'aller, côté droit au retour, onglets bornés à 4 demi-épaisseurs, bouts
/// prolongés d'une demi-épaisseur comme le segment ; la flèche ajoute la pointe de son dernier segment (`arrow_wings`).
fn band_polygon(raw: &[(f64, f64)], width: f32, arrow: bool) -> Vec<f32> {
    let half = (f64::from(width) / 2.0).max(1.0);
    let mut pts: Vec<(f64, f64)> = Vec::with_capacity(raw.len());
    for p in raw {
        if pts
            .last()
            .is_none_or(|q| (q.0 - p.0).hypot(q.1 - p.1) > 1e-9)
        {
            pts.push(*p);
        }
    }
    if pts.len() < 2 {
        let (x, y) = raw.first().copied().unwrap_or((0.0, 0.0));
        return [
            x - half,
            y - half,
            x + half,
            y - half,
            x + half,
            y + half,
            x - half,
            y + half,
        ]
        .iter()
        .map(|v| *v as f32)
        .collect();
    }
    let n = pts.len();
    let dir = |i: usize| {
        let (a, b) = (pts[i], pts[i + 1]);
        let l = (b.0 - a.0).hypot(b.1 - a.1);
        ((b.0 - a.0) / l, (b.1 - a.1) / l)
    };
    let mut left = Vec::with_capacity(n);
    let mut right = Vec::with_capacity(n);
    for i in 0..n {
        let (p, off) = if i == 0 {
            let (ux, uy) = dir(0);
            (
                (pts[0].0 - ux * half, pts[0].1 - uy * half),
                (-uy * half, ux * half),
            )
        } else if i == n - 1 {
            let (ux, uy) = dir(n - 2);
            (
                (pts[i].0 + ux * half, pts[i].1 + uy * half),
                (-uy * half, ux * half),
            )
        } else {
            let (ax, ay) = dir(i - 1);
            let (bx, by) = dir(i);
            let (mx, my) = (-(ay + by), ax + bx);
            let ml = mx.hypot(my);
            let (mx, my) = if ml < 1e-9 {
                (-ay, ax)
            } else {
                (mx / ml, my / ml)
            };
            let cos = (mx * -ay + my * ax).max(0.25);
            (pts[i], (mx * half / cos, my * half / cos))
        };
        left.push((p.0 + off.0, p.1 + off.1));
        right.push((p.0 - off.0, p.1 - off.1));
    }
    let (lx, ly) = pts[n - 2];
    let (ex, ey) = pts[n - 1];
    let wings = if arrow {
        arrow_wings(ex - lx, ey - ly, width).map(|w| [w[0] + lx, w[1] + ly, w[2] + lx, w[3] + ly])
    } else {
        None
    };
    let mut out: Vec<(f64, f64)> = Vec::with_capacity(2 * n + 4);
    match wings {
        // Aile `back − a` (x2, y2) du côté gauche (+n), aile `back + a` du côté droit, comme le segment du socle.
        Some([x1, y1, x2, y2]) => {
            let (ux, uy) = dir(n - 2);
            let len = (ex - lx).hypot(ey - ly);
            let k = ((x2 - lx) * ux + (y2 - ly) * uy).clamp(0.0, len);
            let (fx, fy) = (lx + k * ux, ly + k * uy);
            let (nx, ny) = (-uy * half, ux * half);
            out.extend_from_slice(&left[..n - 1]);
            out.extend([
                (fx + nx, fy + ny),
                (x2, y2),
                left[n - 1],
                right[n - 1],
                (x1, y1),
                (fx - nx, fy - ny),
            ]);
            out.extend(right[..n - 1].iter().rev());
        }
        None => {
            out.extend_from_slice(&left);
            out.extend(right.iter().rev());
        }
    }
    out.iter()
        .flat_map(|(x, y)| [*x as f32, *y as f32])
        .collect()
}
/// Anneau d'un rectangle ou d'une ellipse non remplis (C8, Q8 : murs d'une zone) : extérieur = `shape_polygon` (+½
/// épaisseur, au moins 1), intérieur à −½ épaisseur parcouru en sens inverse (pair-impair comme non-nul) ; intérieur vide
/// si la forme est plus fine que deux demi-épaisseurs ; `None` pour une ligne ou une flèche.
pub fn shape_ring(kind: ShapeKind, w: f64, h: f64, width: f32) -> Option<(Vec<f32>, Vec<f32>)> {
    if kind.is_segment() {
        return None;
    }
    let outer = shape_polygon(&ShapeGeom::plain(kind, w, h), width);
    let half = (f64::from(width) / 2.0).max(1.0);
    if w <= 2.0 * half || h <= 2.0 * half {
        return Some((outer, Vec::new()));
    }
    let inner: Vec<f64> = match kind {
        ShapeKind::Rect => vec![
            half,
            half,
            half,
            h - half,
            w - half,
            h - half,
            w - half,
            half,
        ],
        _ => {
            let (cx, cy, rx, ry) = (w / 2.0, h / 2.0, w / 2.0 - half, h / 2.0 - half);
            ellipse_points(cx, cy, rx, ry, -1.0)
        }
    };
    Some((outer, inner.into_iter().map(|v| v as f32).collect()))
}

/// Boîte locale (0, 0)-(w, h) d'un texte.
pub fn box_polygon(w: f64, h: f64) -> Vec<f32> {
    vec![0.0, 0.0, w as f32, 0.0, w as f32, h as f32, 0.0, h as f32]
}

#[cfg(test)]
mod tests {
    use super::*;

    /// C8 (Q8) : anneau d'un rectangle non rempli : extérieur `shape_polygon`, intérieur à −½ épaisseur en sens inverse ;
    /// ligne et flèche : `None` ; forme plus fine que son trait : intérieur vide.
    #[test]
    fn shape_ring_rect_has_reversed_inner_at_half_width() {
        let (outer, inner) = shape_ring(ShapeKind::Rect, 50.0, 40.0, 4.0).expect("anneau");
        assert_eq!(
            outer,
            shape_polygon(&ShapeGeom::plain(ShapeKind::Rect, 50.0, 40.0), 4.0)
        );
        assert_eq!(inner, vec![2.0, 2.0, 2.0, 38.0, 48.0, 38.0, 48.0, 2.0]);
        let (_, e) = shape_ring(ShapeKind::Ellipse, 50.0, 40.0, 4.0).expect("ellipse");
        assert_eq!(e.len(), 2 * ELLIPSE_VERTICES);
        assert_eq!(shape_ring(ShapeKind::Line, 50.0, 40.0, 4.0), None);
        assert_eq!(shape_ring(ShapeKind::Arrow, 50.0, 40.0, 4.0), None);
        assert_eq!(
            shape_ring(ShapeKind::Rect, 3.0, 40.0, 4.0).map(|r| r.1),
            Some(Vec::new())
        );
    }

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
            shape_polygon(&ShapeGeom::plain(ShapeKind::Rect, 200.0, 100.0), 4.0),
            vec![-2.0, -2.0, 202.0, -2.0, 202.0, 102.0, -2.0, 102.0]
        );
        // demi-épaisseur au moins 1
        assert_eq!(
            shape_polygon(&ShapeGeom::plain(ShapeKind::Ellipse, 10.0, 10.0), 0.5)[0],
            -1.0
        );
        assert_eq!(
            box_polygon(600.0, 45.0),
            vec![0.0, 0.0, 600.0, 0.0, 600.0, 45.0, 0.0, 45.0]
        );
    }

    #[test]
    fn polygon_of_segment_covers_its_ends() {
        let p = shape_polygon(&ShapeGeom::plain(ShapeKind::Line, 100.0, 0.0), 4.0);
        assert_eq!(p, vec![-2.0, 2.0, 102.0, 2.0, 102.0, -2.0, -2.0, -2.0]);
        assert_eq!(
            shape_polygon(&ShapeGeom::plain(ShapeKind::Line, 0.0, 0.0), 4.0).len(),
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
        let p = shape_polygon(&ShapeGeom::plain(ShapeKind::Arrow, 100.0, 0.0), 4.0);
        let v = vertices(&p);
        let (lx, ly) = (
            100.0 - 12.0 * 25f64.to_radians().cos(),
            12.0 * 25f64.to_radians().sin(),
        );
        for (wx, wy) in [(lx, ly), (lx, -ly)] {
            assert!(
                v.iter()
                    .any(|(x, y)| (x - wx).abs() < 1e-4 && (y - wy).abs() < 1e-4),
                "aile ({wx}, {wy}) absente de {v:?}"
            );
        }
        assert!(crate::ink::hit::point_in_polygon(&p, 90.0, 4.5));
        assert!(!crate::ink::hit::point_in_polygon(&p, 50.0, 4.5));
        let thick = vertices(&shape_polygon(
            &ShapeGeom::plain(ShapeKind::Arrow, 0.0, 200.0),
            10.0,
        ));
        assert!(
            thick
                .iter()
                .any(|(x, y)| (x - 30.0 * 25f64.to_radians().sin()).abs() < 1e-4
                    && (y - (200.0 - 30.0 * 25f64.to_radians().cos())).abs() < 1e-4),
            "longueur 3 × épaisseur : {thick:?}"
        );
        assert_eq!(
            shape_polygon(&ShapeGeom::plain(ShapeKind::Line, 100.0, 0.0), 4.0).len(),
            8
        );
        assert_eq!(
            shape_polygon(&ShapeGeom::plain(ShapeKind::Arrow, 0.0, 0.0), 4.0).len(),
            8
        );
    }

    /// Constat 5 de T60 (HL4-4, CL4-7 « surface de l'ellipse ») : polygone inscrit de `ELLIPSE_VERTICES` sommets sur
    /// l'ellipse élargie ; les coins de la boîte n'en sont plus, les extrêmes (bornes) restent exacts.
    #[test]
    fn polygon_of_ellipse_follows_the_ellipse() {
        let p = shape_polygon(&ShapeGeom::plain(ShapeKind::Ellipse, 100.0, 50.0), 4.0);
        assert_eq!(p.len(), 2 * ELLIPSE_VERTICES);
        let v = vertices(&p);
        for (x, y) in &v {
            let r = ((x - 50.0) / 52.0).powi(2) + ((y - 25.0) / 27.0).powi(2);
            assert!((r - 1.0).abs() < 1e-5, "({x}, {y}) hors de l'ellipse : {r}");
        }
        let (x0, x1) = v.iter().fold((f64::MAX, f64::MIN), |(a, b), (x, _)| {
            (a.min(*x), b.max(*x))
        });
        let (y0, y1) = v.iter().fold((f64::MAX, f64::MIN), |(a, b), (_, y)| {
            (a.min(*y), b.max(*y))
        });
        assert_eq!((x0, y0, x1, y1), (-2.0, -2.0, 102.0, 52.0));
        assert!(crate::ink::hit::point_in_polygon(&p, 50.0, 25.0));
        assert!(
            !crate::ink::hit::hit_outline(&p, 1.0, 1.0, 1.0),
            "coin de la boîte"
        );
    }

    /// OG12 (DA-1) : un chemin vide et sans courbe rend le polygone du socle, à l'identique.
    #[test]
    fn polygon_of_two_point_path_is_unchanged() {
        let plain = shape_polygon(&ShapeGeom::plain(ShapeKind::Arrow, 100.0, 0.0), 4.0);
        let empty = shape_polygon(
            &ShapeGeom {
                kind: ShapeKind::Arrow,
                w: 100.0,
                h: 0.0,
                path: &[],
                curve: true,
            },
            4.0,
        );
        assert_eq!(plain, empty, "deux points : la courbe reste droite");
    }

    /// OG12 (n° 1, 3) : la polyligne (0,0)-(50,-80)-(100,0) touche son point intérieur, pas la corde.
    #[test]
    fn polygon_of_polyline_covers_inner_point() {
        let inner = [50.0, -80.0];
        let p = shape_polygon(
            &ShapeGeom {
                kind: ShapeKind::Line,
                w: 100.0,
                h: 0.0,
                path: &inner,
                curve: false,
            },
            4.0,
        );
        assert!(crate::ink::hit::hit_outline(&p, 50.0, -79.0, 1.0));
        assert!(
            !crate::ink::hit::hit_outline(&p, 50.0, 0.0, 1.0),
            "milieu de la corde"
        );
        let c = shape_polygon(
            &ShapeGeom {
                kind: ShapeKind::Arrow,
                w: 100.0,
                h: 0.0,
                path: &inner,
                curve: true,
            },
            4.0,
        );
        assert!(
            crate::ink::hit::hit_outline(&c, 50.0, -79.0, 1.0),
            "la courbe passe par le point"
        );
        let v = vertices(&c);
        let tip = v
            .iter()
            .any(|(x, y)| (x - 100.0).abs() < 3.0 && y.abs() < 3.0);
        assert!(tip, "bout prolongé près de (100, 0) : {v:?}");
    }
}
