//! OG23 (T1, DA-2) : `Command::Arrange` — aligner, répartir, retourner, tourner en une transaction (une étape), groupes
//! entiers ; texte, tableau, média gardent leur matrice (seule leur place suit, H5).
use roomboard_core::arrange::ArrangeHow;
use roomboard_core::commands::{Change, Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle, Transform};
use roomboard_core::fill::FillTarget;
use roomboard_core::query::Bounds;
use roomboard_core::shape::ShapeKind;

const EPS: f64 = 1e-9;

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

fn blank() -> Document {
    Document::blank() // Document::new() n'a aucune page
}

fn first_page(d: &Document) -> String {
    d.page_ids()[0].clone()
}

fn add_rect_on(d: &mut Document, page: &str, x0: f64, y0: f64, x1: f64, y1: f64) -> String {
    d.apply(Command::AddShape {
        page: page.to_string(),
        shape: ShapeKind::Rect,
        x0,
        y0,
        x1,
        y1,
        style: pen(),
        fill: None,
        look: Look::default(),
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn add_rect(d: &mut Document, x0: f64, y0: f64, x1: f64, y1: f64) -> String {
    let page = first_page(d);
    add_rect_on(d, &page, x0, y0, x1, y1)
}

fn add_text(d: &mut Document, x: f64, y: f64) -> String {
    let page = first_page(d);
    d.apply(Command::SetText {
        page,
        id: None,
        x,
        y,
        content: "abc".into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 200.0,
        box_height: 45.0,
        spans: None,
        look: Look::default(),
    })
    .expect("texte")
    .ids[0]
        .clone()
}

fn add_table(d: &mut Document, x: f64, y: f64) -> String {
    let page = first_page(d);
    d.apply(Command::AddTable {
        page,
        x,
        y,
        cols: 2,
        rows: 2,
        col_width: 240.0,
        row_height: 64.0,
        color: "#000000".into(),
        size: 36.0,
    })
    .expect("tableau")
    .ids[0]
        .clone()
}

fn arrange(d: &mut Document, ids: &[&String], how: ArrangeHow) -> Result<Change, CommandError> {
    d.apply(Command::Arrange {
        ids: ids.iter().map(|s| s.to_string()).collect(),
        how,
    })
}

fn sbox(d: &Document, id: &str) -> Bounds {
    d.snap_box(&[id.to_string()]).expect("boîte")
}

fn matrix(d: &Document, id: &str) -> Transform {
    d.element(id).expect("vue").transform
}

fn close(a: f64, b: f64) -> bool {
    (a - b).abs() < EPS
}

fn mid_x(b: &Bounds) -> f64 {
    (b.x0 + b.x1) / 2.0
}

fn mid_y(b: &Bounds) -> f64 {
    (b.y0 + b.y1) / 2.0
}

/// Discrimine le patron écarté (une `Transform` par élément) : trois éléments bougent, une seule version, et une seule
/// annulation rend les trois positions.
#[test]
fn align_left_one_step() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 40.0);
    let b = add_rect(&mut d, 100.0, 60.0, 180.0, 90.0);
    let c = add_rect(&mut d, 250.0, 120.0, 300.0, 200.0);
    let before: Vec<Bounds> = [&a, &b, &c].iter().map(|id| sbox(&d, id)).collect();
    let v = d.version();
    let change = arrange(&mut d, &[&a, &b, &c], ArrangeHow::AlignLeft).expect("aligner");
    assert_eq!(change.version, v + 1, "une seule version");
    assert_eq!(d.version(), v + 1);
    let mut moved = vec![b.clone(), c.clone()];
    moved.sort();
    assert_eq!(change.ids, moved, "ids bougés, triés");
    for id in [&a, &b, &c] {
        assert!(close(sbox(&d, id).x0, 0.0), "x0 = 0 pour {id}");
    }
    assert!(close(sbox(&d, &b).y0, 60.0), "y inchangé");
    assert!(d.undo());
    let after: Vec<Bounds> = [&a, &b, &c].iter().map(|id| sbox(&d, id)).collect();
    assert_eq!(after, before, "une annulation rend les trois positions");
}

#[test]
fn align_single_unit_noop() {
    let mut d = blank();
    let a = add_rect(&mut d, 10.0, 10.0, 60.0, 60.0);
    let v = d.version();
    let change = arrange(&mut d, &[&a], ArrangeHow::AlignRight).expect("aligner");
    assert!(change.ids.is_empty());
    assert_eq!(change.version, v);
    assert_eq!(d.version(), v);
}

#[test]
fn distribute_h_equal_gaps() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    let b = add_rect(&mut d, 70.0, 0.0, 100.0, 20.0);
    let c = add_rect(&mut d, 400.0, 0.0, 480.0, 20.0);
    let (a0, c0) = (sbox(&d, &a), sbox(&d, &c));
    let v = d.version();
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::DistributeH).expect("répartir");
    assert_eq!(d.version(), v + 1);
    let (ba, bb, bc) = (sbox(&d, &a), sbox(&d, &b), sbox(&d, &c));
    assert_eq!(ba, a0, "extrême gauche immobile");
    assert_eq!(bc, c0, "extrême droit immobile");
    let (g1, g2) = (bb.x0 - ba.x1, bc.x0 - bb.x1);
    assert!(close(g1, g2), "écarts égaux : {g1} et {g2}");
    assert!(close(g1, 160.0));
}

#[test]
fn distribute_needs_three_units() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    let b = add_rect(&mut d, 300.0, 0.0, 330.0, 20.0);
    let v = d.version();
    for how in [ArrangeHow::DistributeH, ArrangeHow::DistributeV] {
        let change = arrange(&mut d, &[&a, &b], how).expect("répartir");
        assert!(change.ids.is_empty());
    }
    assert_eq!(d.version(), v);
}

/// Somme des largeurs (100 + 120 + 100) plus grande que l'étendue (250) : répartition par les centres (Excalidraw).
#[test]
fn distribute_overlapping_uses_centers() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 100.0, 20.0);
    let b = add_rect(&mut d, 20.0, 30.0, 140.0, 50.0);
    let c = add_rect(&mut d, 150.0, 60.0, 250.0, 80.0);
    let (a0, c0) = (sbox(&d, &a), sbox(&d, &c));
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::DistributeH).expect("répartir");
    let (ba, bb, bc) = (sbox(&d, &a), sbox(&d, &b), sbox(&d, &c));
    assert_eq!(ba, a0, "extrême gauche immobile");
    assert_eq!(bc, c0, "extrême droit immobile");
    let (s1, s2) = (mid_x(&bb) - mid_x(&ba), mid_x(&bc) - mid_x(&bb));
    assert!(close(s1, s2), "centres équidistants : {s1} et {s2}");
    assert!(close(mid_x(&bb), 125.0));
    assert!(close(bb.y0, 30.0), "y inchangé");
}

/// Discrimine le patron écarté (la matrice de miroir appliquée au texte) : le rectangle est retourné, le texte garde
/// sa matrice et seule sa place suit.
#[test]
fn flip_h_text_moves_box_keeps_matrix() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 100.0, 50.0);
    let t = add_text(&mut d, 300.0, 0.0);
    let (rb, tb) = (sbox(&d, &r), sbox(&d, &t));
    let cx = (rb.x0.min(tb.x0) + rb.x1.max(tb.x1)) / 2.0;
    let tm = matrix(&d, &t);
    let v = d.version();
    arrange(&mut d, &[&r, &t], ArrangeHow::FlipH).expect("retourner");
    assert_eq!(d.version(), v + 1);
    assert_eq!(matrix(&d, &r)[0], -1.0, "rectangle retourné");
    let after = matrix(&d, &t);
    assert_eq!(after[0], 1.0, "texte jamais inversé");
    assert_eq!(after[..4], tm[..4], "matrice du texte : translation seule");
    let ta = sbox(&d, &t);
    assert!(close(ta.x0, 2.0 * cx - tb.x1), "place du texte : {} contre {}", ta.x0, 2.0 * cx - tb.x1);
    assert!(close(ta.y0, tb.y0));
    let ra = sbox(&d, &r);
    assert!(close(ra.x0, 2.0 * cx - rb.x1));
}

#[test]
fn rotate_cw_wide_rect_becomes_tall() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 200.0, 50.0);
    let b0 = sbox(&d, &r);
    arrange(&mut d, &[&r], ArrangeHow::RotateCw).expect("tourner");
    let b = sbox(&d, &r);
    assert!(close(b.x1 - b.x0, 50.0), "largeur {}", b.x1 - b.x0);
    assert!(close(b.y1 - b.y0, 200.0), "hauteur {}", b.y1 - b.y0);
    assert!(close(mid_x(&b), mid_x(&b0)) && close(mid_y(&b), mid_y(&b0)), "centre gardé");
}

#[test]
fn rotate_ccw_then_cw_restores() {
    let mut d = blank();
    let r = add_rect(&mut d, 30.0, 40.0, 230.0, 90.0);
    let m0 = matrix(&d, &r);
    arrange(&mut d, &[&r], ArrangeHow::RotateCcw).expect("tourner à gauche");
    assert!((0..6).any(|i| !close(matrix(&d, &r)[i], m0[i])), "la matrice a changé");
    arrange(&mut d, &[&r], ArrangeHow::RotateCw).expect("tourner à droite");
    let m = matrix(&d, &r);
    for i in 0..6 {
        assert!(close(m[i], m0[i]), "m[{i}] : {} contre {}", m[i], m0[i]);
    }
}

#[test]
fn rotate_cw_table_center_follows() {
    let mut d = blank();
    let t = add_table(&mut d, 600.0, 100.0);
    let r = add_rect(&mut d, 0.0, 0.0, 100.0, 50.0);
    let (tb, rb) = (sbox(&d, &t), sbox(&d, &r));
    let (cx, cy) = (
        (tb.x0.min(rb.x0) + tb.x1.max(rb.x1)) / 2.0,
        (tb.y0.min(rb.y0) + tb.y1.max(rb.y1)) / 2.0,
    );
    let tm = matrix(&d, &t);
    arrange(&mut d, &[&t, &r], ArrangeHow::RotateCw).expect("tourner");
    let m = matrix(&d, &t);
    assert_eq!(m[..4], tm[..4], "tableau : translation pure");
    assert_eq!(m[..4], [1.0, 0.0, 0.0, 1.0]);
    let (px, py) = (mid_x(&tb), mid_y(&tb));
    let (nx, ny) = (cx - (py - cy), cy + (px - cx));
    let ta = sbox(&d, &t);
    assert!(close(mid_x(&ta), nx) && close(mid_y(&ta), ny), "centre du tableau tourné");
    assert_eq!(matrix(&d, &r)[..4], [0.0, 1.0, -1.0, 0.0], "rectangle tourné");
}

/// Discrimine le patron écarté (seuls les ids demandés) : un membre d'un groupe désigné, tout le groupe bouge du même dx.
#[test]
fn arrange_extends_partial_group() {
    let mut d = blank();
    let a = add_rect(&mut d, 100.0, 0.0, 150.0, 20.0);
    let b = add_rect(&mut d, 200.0, 40.0, 250.0, 60.0);
    let c = add_rect(&mut d, 0.0, 80.0, 50.0, 100.0);
    d.apply(Command::Group {
        ids: vec![a.clone(), b.clone()],
    })
    .expect("groupe");
    let (a0, b0, c0) = (sbox(&d, &a), sbox(&d, &b), sbox(&d, &c));
    let v = d.version();
    let change = arrange(&mut d, &[&a, &c], ArrangeHow::AlignLeft).expect("aligner");
    assert_eq!(d.version(), v + 1);
    let (da, db) = (sbox(&d, &a).x0 - a0.x0, sbox(&d, &b).x0 - b0.x0);
    assert!(close(da, -100.0), "a : dx {da}");
    assert!(close(db, da), "b suit a : {db} contre {da}");
    assert_eq!(sbox(&d, &c), c0, "c déjà à gauche");
    let mut moved = vec![a.clone(), b.clone()];
    moved.sort();
    assert_eq!(change.ids, moved);
    let ga = d.element(&a).and_then(|e| e.group).expect("groupe de a");
    assert_eq!(d.element(&b).and_then(|e| e.group), Some(ga), "groupe intact");
}

#[test]
fn arrange_mixed_pages_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    d.apply(Command::AddPage {
        after: None,
        mode: None,
    })
    .expect("page");
    let p2 = d.page_ids()[1].clone();
    let z = add_rect_on(&mut d, &p2, 100.0, 0.0, 150.0, 20.0);
    let v = d.version();
    assert_eq!(
        arrange(&mut d, &[&a, &z], ArrangeHow::AlignLeft),
        Err(CommandError::MixedPages)
    );
    assert_eq!(d.version(), v);
    assert!(close(sbox(&d, &z).x0, 100.0), "aucune écriture");
}

#[test]
fn arrange_unknown_id_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    let nope = "inconnu".to_string();
    let v = d.version();
    assert_eq!(
        arrange(&mut d, &[&a, &nope], ArrangeHow::AlignTop),
        Err(CommandError::UnknownElement(nope.clone()))
    );
    assert_eq!(d.version(), v);
}

#[test]
fn arrange_empty_ids_no_step() {
    let mut d = blank();
    let v = d.version();
    let change = arrange(&mut d, &[], ArrangeHow::FlipV).expect("vide");
    assert!(change.ids.is_empty());
    assert_eq!(d.version(), v);
}

/// Une zone du pot (genre `fill`) sélectionnée avec deux rectangles n'est jamais bougée.
#[test]
fn arrange_fill_zone_unchanged() {
    let mut d = blank();
    let page = first_page(&d);
    let frame = add_rect(&mut d, 100.0, 100.0, 300.0, 300.0);
    let c = d
        .apply(Command::Fill {
            page: page.clone(),
            target: FillTarget::Zone {
                x: 200.0,
                y: 200.0,
                tol: 2.0,
            },
            color: Some("#ff0000".into()),
        })
        .expect("pot");
    let zone = c
        .ids
        .iter()
        .find(|id| d.element(id).is_some_and(|e| e.kind == "fill"))
        .expect("zone remplie")
        .clone();
    let a = add_rect(&mut d, 400.0, 0.0, 450.0, 20.0);
    let b = add_rect(&mut d, 500.0, 40.0, 550.0, 60.0);
    let zm = matrix(&d, &zone);
    let change = arrange(&mut d, &[&zone, &a, &b], ArrangeHow::AlignRight).expect("aligner");
    assert_eq!(matrix(&d, &zone), zm, "zone immobile");
    assert!(!change.ids.contains(&zone));
    assert_eq!(change.ids, vec![a.clone()], "seul a bouge");
    assert!(close(sbox(&d, &a).x1, 550.0));
    let _ = frame;
}

#[test]
fn parse_names_roundtrip() {
    use ArrangeHow::*;
    let all = [
        AlignLeft,
        AlignCenter,
        AlignRight,
        AlignTop,
        AlignMiddle,
        AlignBottom,
        DistributeH,
        DistributeV,
        FlipH,
        FlipV,
        RotateCw,
        RotateCcw,
    ];
    for h in all {
        assert_eq!(ArrangeHow::parse(h.name()), Some(h), "{}", h.name());
    }
    assert_eq!(AlignLeft.name(), "align-left");
    assert_eq!(DistributeV.name(), "distribute-v");
    assert_eq!(RotateCcw.name(), "rotate-ccw");
    assert_eq!(ArrangeHow::parse("spin"), None);
}
