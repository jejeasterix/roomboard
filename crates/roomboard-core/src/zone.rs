//! Zone fermée du pot (C8, U28 P3, DA-Z1, DA-Z2) : les murs de la page sont rastérisés sur la vue (1 cellule = 1 px de la
//! vue = `tol / 2` en monde), dilatés d'une cellule (voisinage 8 : les écarts ≤ 2 px se ferment), puis le clic diffuse
//! en 4-connexité. Bord de l'emprise atteint : zone ouverte. Sinon, la région agrandie de 2 cellules, moins les polygones
//! exacts des murs (`i_overlay`), donne la forme qui contient le clic. `closed_zone` est pure : le Worker du repli DA-Z5
//! n'aura qu'à l'appeler. Mémoire : un seul masque `u8` (2²² cellules au plus), rendu à la fin (Q20).

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::Command;
    use crate::element::StrokeStyle;
    use crate::fill::FillTarget;
    use crate::fill_element::read_fill;
    use crate::shape::ShapeKind;

    fn rect_wall(x0: f32, y0: f32, x1: f32, y1: f32) -> Wall {
        Wall::new(vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]], false).expect("mur")
    }
    /// Carré (100, 100)-(500, 500), murs de 4 ; le mur de gauche commence `gap` sous le mur du haut.
    fn square(gap: f32) -> Vec<Wall> {
        vec![
            rect_wall(100.0, 100.0, 500.0, 104.0),
            rect_wall(496.0, 100.0, 500.0, 500.0),
            rect_wall(100.0, 496.0, 500.0, 500.0),
            rect_wall(100.0, 104.0 + gap, 104.0, 500.0),
        ]
    }
    fn ring_box(r: &[f64]) -> [f64; 4] {
        r.chunks_exact(2).fold(
            [f64::INFINITY, f64::INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY],
            |b, p| [b[0].min(p[0]), b[1].min(p[1]), b[2].max(p[0]), b[3].max(p[1])],
        )
    }
    fn near(a: [f64; 4], b: [f64; 4]) -> bool {
        a.iter().zip(b).all(|(x, y)| (x - y).abs() <= 1e-3)
    }

    /// Q6 : une cellule est un mur si son centre est dans le mur ; non-nul (anneau intérieur de même sens : plein) et
    /// pair-impair (trou).
    #[test]
    fn paint_marks_cell_centres_nonzero_and_even_odd() {
        let g = Grid { w: 20, h: 20, cell: 1.0, origin: [0.0, 0.0] };
        let count = |m: &Mask| m.cells.iter().filter(|c| **c == WALL).count();
        let mut m = Mask::new(g);
        m.paint(&rect_wall(2.0, 2.0, 12.0, 12.0));
        assert_eq!(count(&m), 100);
        let ring = |eo| {
            Wall::new(
                vec![vec![2.0, 2.0, 12.0, 2.0, 12.0, 12.0, 2.0, 12.0], vec![5.0, 5.0, 9.0, 5.0, 9.0, 9.0, 5.0, 9.0]],
                eo,
            )
            .expect("anneau")
        };
        let mut m = Mask::new(g);
        m.paint(&ring(true));
        assert_eq!(count(&m), 84);
        let mut m = Mask::new(g);
        m.paint(&ring(false));
        assert_eq!(count(&m), 100);
    }

    /// U28 (« tolérance de fermeture 2 px ») : à `tol` = 2 (cellule 1), un écart de 1 ou 2 se ferme, 3 fuit.
    #[test]
    fn square_gap_1px_closes_3px_leaks() {
        assert!(matches!(closed_zone(&square(1.0), 300.0, 300.0, 2.0), Zone::Closed(_)));
        assert!(matches!(closed_zone(&square(2.0), 300.0, 300.0, 2.0), Zone::Closed(_)));
        assert_eq!(closed_zone(&square(3.0), 300.0, 300.0, 2.0), Zone::Open);
    }

    /// Q10 : hors de la boîte des murs agrandie : `Outside` ; dans un mur ou dans sa dilatation : `OnWall` ; sans mur : `Outside`.
    #[test]
    fn outside_box_and_on_wall() {
        assert_eq!(closed_zone(&square(0.0), 900.0, 900.0, 2.0), Zone::Outside);
        assert_eq!(closed_zone(&square(0.0), 102.0, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&square(0.0), 104.3, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&[], 300.0, 300.0, 2.0), Zone::Outside);
    }

    /// Q9, HC8-3 : bords exacts sur les murs ; un îlot est un trou exact.
    #[test]
    fn closed_zone_edges_follow_walls_and_islands_are_holes() {
        let mut walls = square(0.0);
        walls.push(rect_wall(250.0, 250.0, 270.0, 270.0));
        let Zone::Closed(rings) = closed_zone(&walls, 300.0, 300.0, 2.0) else {
            panic!("zone fermée attendue");
        };
        assert_eq!(rings.len(), 2);
        assert!(near(ring_box(&rings[0]), [104.0, 104.0, 496.0, 496.0]), "{:?}", ring_box(&rings[0]));
        assert!(near(ring_box(&rings[1]), [250.0, 250.0, 270.0, 270.0]), "{:?}", ring_box(&rings[1]));
    }

    /// Q20, HC8-11 : au-delà de 2²² cellules, la cellule double (puis quadruple) ; au-delà, aucune grille (fond).
    #[test]
    fn fit_doubles_cells_then_gives_up() {
        let corners = |s: f32| vec![rect_wall(0.0, 0.0, 1.0, 1.0), rect_wall(s - 1.0, s - 1.0, s, s)];
        let g = fit(&corners(2000.0), 2.0).expect("grille");
        assert_eq!((g.w, g.h, g.cell), (2004, 2004, 1.0));
        let g = fit(&corners(3000.0), 2.0).expect("grille");
        assert_eq!((g.w, g.h, g.cell, g.origin), (1504, 1504, 2.0, [-4.0, -4.0]));
        assert_eq!(fit(&corners(20000.0), 2.0), None);
        assert_eq!(closed_zone(&corners(20000.0), 10.0, 10.0, 2.0), Zone::Open);
    }

    fn pen() -> StrokeStyle {
        StrokeStyle { color: "#000000".into(), width: 4.0 }
    }
    /// Trait de `a` à `b`, un point tous les 10, pression 0,5.
    fn stroke(d: &mut Document, p: &str, a: [f64; 2], b: [f64; 2]) -> String {
        let n = ((b[0] - a[0]).hypot(b[1] - a[1]) / 10.0).ceil().max(1.0) as usize;
        let points: Vec<f32> = (0..=n)
            .flat_map(|i| {
                let t = i as f64 / n as f64;
                [(a[0] + (b[0] - a[0]) * t) as f32, (a[1] + (b[1] - a[1]) * t) as f32, 0.5]
            })
            .collect();
        d.apply(Command::CommitStroke { page: p.to_string(), points, style: pen() }).expect("trait").ids[0].clone()
    }
    fn zone(p: &str, x: f64, y: f64, color: Option<&str>) -> Command {
        Command::Fill { page: p.to_string(), target: FillTarget::Zone { x, y, tol: 2.0 }, color: color.map(str::to_string) }
    }
    fn triangle(d: &mut Document, p: &str, end_y: f64) {
        stroke(d, p, [100.0, 100.0], [500.0, 100.0]);
        stroke(d, p, [500.0, 100.0], [100.0, 500.0]);
        stroke(d, p, [100.0, 500.0], [100.0, end_y]);
    }
    fn fill_of(d: &Document, id: &str) -> crate::fill_element::FillFields {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        read_fill(&txn, &f.element).expect("fill lisible")
    }
    /// Boîte monde de l'anneau extérieur d'un `fill` (anneaux locaux, translation de `transform`).
    fn world_box(f: &crate::fill_element::FillFields) -> [f64; 4] {
        let [x0, y0, x1, y1] = ring_box(&f.rings[0]);
        let (tx, ty) = (f.transform[4], f.transform[5]);
        [x0 + tx, y0 + ty, x1 + tx, y1 + ty]
    }

    /// S1 : trois traits, écart de 1 au dernier sommet : un `fill` en haut de la page, bord au-delà de l'axe du trait
    /// et dans son épaisseur ; annuler, refaire : une étape.
    #[test]
    fn triangle_of_strokes_1px_gap_inserts_one_fill_on_top() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        let c = d.apply(zone(&p, 200.0, 200.0, Some("#facc15"))).expect("zone");
        assert_eq!(c.ids.len(), 1);
        let ids = d.element_ids(&p);
        assert_eq!((ids.len(), ids.last()), (4, c.ids.first()));
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!(f.color, "#facc15");
        let min_x = f.rings[0].chunks_exact(2).map(|q| q[0] + f.transform[4]).fold(f64::INFINITY, f64::min);
        assert!(min_x > 100.0 && min_x < 104.0, "{min_x}");
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 4);
    }

    /// S2 : écart de 12 au sommet (≥ 8 entre les contours) : la diffusion fuit, le fond change, aucun `fill`.
    #[test]
    fn triangle_of_strokes_12px_gap_changes_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 112.0);
        let c = d.apply(zone(&p, 200.0, 200.0, Some("#facc15"))).expect("zone");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#facc15");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// Q10 : hors de la boîte des murs : le fond ; sur un trait : aucune étape.
    #[test]
    fn outside_walls_is_background_and_on_stroke_is_no_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(zone(&p, 900.0, 900.0, Some("#16a34a"))).expect("hors");
        assert_eq!(d.page(&p).expect("page").background, "#16a34a");
        let v = d.version();
        d.apply(zone(&p, 100.0, 300.0, Some("#dc2626"))).expect("sur le trait");
        assert_eq!((d.version(), d.element_ids(&p).len()), (v, 3));
    }

    /// HC8-6 : « Aucune » dans une zone fermée : fond `#ffffff`, aucun `fill`.
    #[test]
    fn none_in_closed_zone_sets_white_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(Command::Fill { page: p.clone(), target: FillTarget::Background, color: Some("#1d4ed8".into()) })
            .expect("fond");
        let c = d.apply(zone(&p, 200.0, 200.0, None)).expect("aucune");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#ffffff");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// S4, HC8-1 : une image ferme par sa boîte ; le bord du `fill` longe la boîte de l'image.
    #[test]
    fn image_box_closes_zone() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.apply(Command::AddImage {
            page: p.clone(),
            asset: AssetRef {
                id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                name: "a.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 200.0,
            matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 100.0],
        })
        .expect("image");
        stroke(&mut d, &p, [298.0, 100.0], [500.0, 100.0]);
        stroke(&mut d, &p, [500.0, 100.0], [500.0, 300.0]);
        stroke(&mut d, &p, [500.0, 300.0], [298.0, 300.0]);
        let c = d.apply(zone(&p, 400.0, 200.0, Some("#facc15"))).expect("zone");
        assert_eq!(c.ids.len(), 1);
        let f = fill_of(&d, &c.ids[0]);
        let min_x = f.rings[0].chunks_exact(2).map(|q| q[0] + f.transform[4]).fold(f64::INFINITY, f64::min);
        assert!((min_x - 300.0).abs() < 1e-3, "{min_x}");
    }

    /// Garde du patron écarté (`element_geom`, `query.rs:136-210`, parcouru par `geoms`, `query.rs:211-226`) : un
    /// rectangle non rempli est un anneau pair-impair (Q8), pas le polygone plein `shape_polygon` ; un clic dedans pose
    /// un `fill` bordé par le côté intérieur du trait (−½ épaisseur). Sous ce patron, le clic tomberait dans le polygone
    /// plein : `OnWall`, aucune étape. Un rectangle rempli, lui, reste un bloc plein : clic dedans, aucune étape.
    #[test]
    fn unfilled_rect_is_a_ring_wall_not_a_solid_block() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let shape = |x0, y0, x1, y1, fill: Option<&str>| Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: pen(),
            fill: fill.map(str::to_string),
        };
        d.apply(shape(100.0, 100.0, 500.0, 500.0, None)).expect("rectangle vide");
        d.apply(shape(600.0, 100.0, 900.0, 400.0, Some("#dc2626"))).expect("rectangle plein");
        let c = d.apply(zone(&p, 300.0, 300.0, Some("#facc15"))).expect("zone");
        assert_eq!(c.ids.len(), 1, "zone fermée attendue dans le rectangle vide, pas OnWall");
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!(f.rings.len(), 1);
        assert!(near(world_box(&f), [102.0, 102.0, 498.0, 498.0]), "{:?}", world_box(&f));
        let v = d.version();
        d.apply(zone(&p, 750.0, 250.0, Some("#16a34a"))).expect("dans le rectangle plein");
        assert_eq!((d.version(), d.element_ids(&p).len()), (v, 3));
    }

    /// Garde du même patron : un `fill` à trou est un mur par ses anneaux pair-impair (Q8), pas par sa boîte (celle
    /// qu'`element_geom` lui donnerait par `read_unknown`) ; un clic dans le trou pose un `fill` exactement sur le trou.
    #[test]
    fn hole_of_a_fill_is_a_closed_zone_not_its_box() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let outer = vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0];
        let hole = vec![250.0, 250.0, 250.0, 350.0, 350.0, 350.0, 350.0, 250.0];
        d.insert_fill(&p, &[outer, hole], "#facc15").expect("fill à trou");
        let c = d.apply(zone(&p, 300.0, 300.0, Some("#dc2626"))).expect("zone");
        assert_eq!(c.ids.len(), 1, "zone fermée attendue dans le trou, pas OnWall");
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!((f.rings.len(), f.color.as_str()), (1, "#dc2626"));
        assert!(near(world_box(&f), [250.0, 250.0, 350.0, 350.0]), "{:?}", world_box(&f));
    }

    /// Q18 : `zone_cells` compte le masque du clic ; 0 sans mur ou à `tol` invalide.
    #[test]
    fn zone_cells_counts_the_mask() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.zone_cells(&p, 2.0), 0);
        triangle(&mut d, &p, 101.0);
        let g = fit(&d.zone_walls(&p), 2.0).expect("grille");
        assert_eq!(d.zone_cells(&p, 2.0) as usize, g.w * g.h);
        assert_eq!(d.zone_cells(&p, 0.0), 0);
    }

    /// Témoin de durée (Q18, S6), pas une porte :
    /// `cargo test -p roomboard-core --features zone --release s6_ -- --ignored --nocapture`.
    #[test]
    #[ignore = "témoin de durée, lancé à la main"]
    fn s6_worst_case_timing_witness() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        stroke(&mut d, &p, [-700.0, -700.0], [1300.0, -700.0]);
        stroke(&mut d, &p, [1300.0, -700.0], [-700.0, 1300.0]);
        stroke(&mut d, &p, [-700.0, 1300.0], [-700.0, -700.0]);
        for i in 0..20 {
            for j in 0..15 {
                let (x, y) = (-600.0 + 40.0 * f64::from(i), -600.0 + 40.0 * f64::from(j));
                stroke(&mut d, &p, [x, y], [x + 15.0, y]);
            }
        }
        assert!(d.zone_cells(&p, 2.0) >= 4_000_000);
        let t = std::time::Instant::now();
        let c = d.apply(zone(&p, 100.0, 100.0, Some("#facc15"))).expect("zone");
        eprintln!("S6 natif : {} ms, {} cellules", t.elapsed().as_millis(), d.zone_cells(&p, 2.0));
        assert_eq!(c.ids.len(), 1);
    }
}
