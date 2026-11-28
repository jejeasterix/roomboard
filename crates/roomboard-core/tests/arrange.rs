//! OG23 (T1, DA-2) : `Command::Arrange` — aligner, répartir, retourner, tourner en une transaction (une étape), groupes
//! entiers ; texte, tableau, média gardent leur matrice (seule leur place suit, H5).
use roomboard_core::arrange::ArrangeHow;
use roomboard_core::commands::{Change, Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle, Transform};
use roomboard_core::linear::{BindInput, LineInit};
use roomboard_core::query::Bounds;
use roomboard_core::shape::ShapeKind;
use yrs::updates::decoder::Decode;
use yrs::{Any, Array, Doc, In, Map, MapPrelim, Out, ReadTxn, StateVector, Transact, Update};

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
        line: LineInit::default(),
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
    assert!(
        close(ta.x0, 2.0 * cx - tb.x1),
        "place du texte : {} contre {}",
        ta.x0,
        2.0 * cx - tb.x1
    );
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
    assert!(
        close(mid_x(&b), mid_x(&b0)) && close(mid_y(&b), mid_y(&b0)),
        "centre gardé"
    );
}

#[test]
fn rotate_ccw_then_cw_restores() {
    let mut d = blank();
    let r = add_rect(&mut d, 30.0, 40.0, 230.0, 90.0);
    let m0 = matrix(&d, &r);
    arrange(&mut d, &[&r], ArrangeHow::RotateCcw).expect("tourner à gauche");
    assert!(
        (0..6).any(|i| !close(matrix(&d, &r)[i], m0[i])),
        "la matrice a changé"
    );
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
    assert!(
        close(mid_x(&ta), nx) && close(mid_y(&ta), ny),
        "centre du tableau tourné"
    );
    assert_eq!(
        matrix(&d, &r)[..4],
        [0.0, 1.0, -1.0, 0.0],
        "rectangle tourné"
    );
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
    assert_eq!(
        d.element(&b).and_then(|e| e.group),
        Some(ga),
        "groupe intact"
    );
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

/// Zone du pot brute (genre `fill`, champs de `fill_element.rs`, `read_fill`) posée sur la première page, comme une
/// autre version l'écrirait : la fonctionnalité `zone` (pot de zone fermée) n'est active que dans `roomboard-wasm`.
fn with_raw_zone(d: &Document, id: &'static str) -> Document {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    {
        let mut txn = raw.transact_mut();
        let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
            panic!("page")
        };
        let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
            panic!("éléments")
        };
        let nums =
            |v: &[f64]| Any::Array(v.iter().copied().map(Any::from).collect::<Vec<_>>().into());
        let ring = nums(&[0.0, 0.0, 200.0, 0.0, 200.0, 200.0, 0.0, 200.0]);
        let fields: Vec<(&'static str, In)> = vec![
            ("id", In::from(id)),
            ("kind", In::from("fill")),
            (
                "transform",
                In::Any(nums(&[1.0, 0.0, 0.0, 1.0, 100.0, 100.0])),
            ),
            ("w", In::from(200.0)),
            ("h", In::from(200.0)),
            ("color", In::from("#ff0000")),
            ("contours", In::Any(Any::Array(vec![ring].into()))),
        ];
        els.push_back(&mut txn, MapPrelim::from_iter(fields));
    }
    let bytes = raw
        .transact()
        .encode_state_as_update_v1(&StateVector::default());
    Document::from_update_v1(&bytes).expect("relecture")
}

/// Une zone du pot (genre `fill`) sélectionnée avec deux rectangles n'est jamais bougée.
#[test]
fn arrange_fill_zone_unchanged() {
    let mut d = blank();
    add_rect(&mut d, 600.0, 0.0, 650.0, 20.0);
    add_rect(&mut d, 700.0, 40.0, 750.0, 60.0);
    let ids = d.element_ids(&first_page(&d));
    let (a, b) = (ids[0].clone(), ids[1].clone());
    let mut d = with_raw_zone(&d, "zone-brute");
    let zone = "zone-brute".to_string();
    assert_eq!(d.element(&zone).expect("zone").kind, "fill");
    assert!(
        d.snap_box(std::slice::from_ref(&zone)).is_some(),
        "zone lisible, avec sa boîte"
    );
    let zm = matrix(&d, &zone);
    let change = arrange(&mut d, &[&zone, &a, &b], ArrangeHow::AlignRight).expect("aligner");
    assert_eq!(matrix(&d, &zone), zm, "zone immobile");
    assert_eq!(change.ids, vec![a.clone()], "seul a bouge");
    assert!(
        close(sbox(&d, &a).x1, 750.0),
        "la zone ne compte pas dans la boîte de la sélection"
    );
    let change = arrange(&mut d, &[&zone, &a, &b], ArrangeHow::FlipH).expect("retourner");
    assert!(!change.ids.contains(&zone));
    assert_eq!(matrix(&d, &zone), zm, "zone immobile au retournement");
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

fn three_rects(d: &mut Document) -> [String; 3] {
    [
        add_rect(d, 0.0, 0.0, 50.0, 40.0),
        add_rect(d, 100.0, 60.0, 180.0, 90.0),
        add_rect(d, 250.0, 120.0, 300.0, 200.0),
    ]
}

#[test]
fn align_center_on_selection_center() {
    let mut d = blank();
    let [a, b, c] = three_rects(&mut d);
    let (b0, v) = (sbox(&d, &b), d.version());
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::AlignCenter).expect("centrer");
    assert_eq!(d.version(), v + 1);
    for id in [&a, &b, &c] {
        assert!(close(mid_x(&sbox(&d, id)), 150.0), "centre x de {id}");
    }
    assert!(close(sbox(&d, &b).y0, b0.y0), "y inchangé");
}

#[test]
fn align_right_with_effect() {
    let mut d = blank();
    let [a, b, c] = three_rects(&mut d);
    let c0 = sbox(&d, &c);
    let v = d.version();
    let change = arrange(&mut d, &[&a, &b, &c], ArrangeHow::AlignRight).expect("à droite");
    assert_eq!(d.version(), v + 1);
    assert_eq!(change.ids.len(), 2, "le plus à droite ne bouge pas");
    for id in [&a, &b, &c] {
        assert!(close(sbox(&d, id).x1, 300.0), "x1 de {id}");
    }
    assert_eq!(sbox(&d, &c), c0);
    assert!(close(sbox(&d, &a).y0, 0.0), "y inchangé");
}

#[test]
fn align_middle_on_selection_middle() {
    let mut d = blank();
    let [a, b, c] = three_rects(&mut d);
    let a0 = sbox(&d, &a);
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::AlignMiddle).expect("milieu");
    for id in [&a, &b, &c] {
        assert!(close(mid_y(&sbox(&d, id)), 100.0), "centre y de {id}");
    }
    assert!(close(sbox(&d, &a).x0, a0.x0), "x inchangé");
}

#[test]
fn align_bottom_on_selection_bottom() {
    let mut d = blank();
    let [a, b, c] = three_rects(&mut d);
    let a0 = sbox(&d, &a);
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::AlignBottom).expect("en bas");
    for id in [&a, &b, &c] {
        assert!(close(sbox(&d, id).y1, 200.0), "y1 de {id}");
    }
    assert!(close(sbox(&d, &a).x0, a0.x0), "x inchangé");
}

#[test]
fn distribute_v_equal_gaps() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 20.0, 50.0);
    let b = add_rect(&mut d, 0.0, 70.0, 20.0, 100.0);
    let c = add_rect(&mut d, 0.0, 400.0, 20.0, 480.0);
    let (a0, c0) = (sbox(&d, &a), sbox(&d, &c));
    let v = d.version();
    arrange(&mut d, &[&a, &b, &c], ArrangeHow::DistributeV).expect("répartir");
    assert_eq!(d.version(), v + 1);
    let (ba, bb, bc) = (sbox(&d, &a), sbox(&d, &b), sbox(&d, &c));
    assert_eq!((ba, bc), (a0, c0), "extrêmes immobiles");
    let (g1, g2) = (bb.y0 - ba.y1, bc.y0 - bb.y1);
    assert!(close(g1, g2), "écarts égaux : {g1} et {g2}");
    assert!(close(g1, 160.0));
    assert!(close(bb.x0, 0.0), "x inchangé");
}

#[test]
fn flip_v_mirrors_around_selection_center() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 100.0, 50.0);
    let t = add_text(&mut d, 0.0, 300.0);
    let (rb, tb) = (sbox(&d, &r), sbox(&d, &t));
    let cy = (rb.y0.min(tb.y0) + rb.y1.max(tb.y1)) / 2.0;
    let tm = matrix(&d, &t);
    let v = d.version();
    arrange(&mut d, &[&r, &t], ArrangeHow::FlipV).expect("retourner");
    assert_eq!(d.version(), v + 1);
    assert_eq!(matrix(&d, &r)[3], -1.0, "rectangle retourné");
    assert_eq!(matrix(&d, &t)[..4], tm[..4], "texte : translation seule");
    assert!(close(sbox(&d, &r).y0, 2.0 * cy - rb.y1));
    assert!(close(sbox(&d, &t).y0, 2.0 * cy - tb.y1));
    assert!(close(sbox(&d, &t).x0, tb.x0), "x inchangé");
}

// ---------------------------------------------------------------------------------------------------------------------
// OG33 (lot 2b, choix 3) : `Command::Rotate` — angle libre, portée et groupes d'`Arrange`, flèches liées suivies.

fn rotate(d: &mut Document, ids: &[&String], angle: f64) -> Result<Change, CommandError> {
    d.apply(Command::Rotate {
        ids: ids.iter().map(|s| s.to_string()).collect(),
        angle,
    })
}

#[test]
fn rotate_30_keeps_center_one_step() {
    let mut d = blank();
    let r = add_rect(&mut d, 100.0, 100.0, 150.0, 150.0);
    let b0 = sbox(&d, &r);
    let v = d.version();
    rotate(&mut d, &[&r], 30.0).expect("tourner");
    let m = matrix(&d, &r);
    assert!(close(m[0], 30f64.to_radians().cos()) && close(m[1], 30f64.to_radians().sin()));
    let b = sbox(&d, &r);
    assert!(
        close(mid_x(&b), mid_x(&b0)) && close(mid_y(&b), mid_y(&b0)),
        "centre gardé"
    );
    assert_ne!(d.version(), v);
    assert!(d.undo());
    assert_eq!(matrix(&d, &r), [1.0, 0.0, 0.0, 1.0, 100.0, 100.0]);
}

#[test]
fn rotate_90_equals_arrange_rotate_cw() {
    let (mut a, mut b) = (blank(), blank());
    let ra = add_rect(&mut a, 0.0, 0.0, 200.0, 50.0);
    let rb = add_rect(&mut b, 0.0, 0.0, 200.0, 50.0);
    rotate(&mut a, &[&ra], 90.0).expect("Rotate");
    arrange(&mut b, &[&rb], ArrangeHow::RotateCw).expect("Arrange");
    assert_eq!(matrix(&a, &ra), matrix(&b, &rb)); // quart de tour exact
}

/// Discrimine le patron écarté n° 1 (une `Transform` unique de la matrice de rotation, `cmd_transform`) : sous lui, le
/// texte serait tourné ; ici sa matrice reste droite et seule sa place suit (H5 d'OG23).
#[test]
fn rotate_text_keeps_matrix_moves_place() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 100.0, 100.0);
    let t = add_text(&mut d, 300.0, 0.0);
    rotate(&mut d, &[&r, &t], 45.0).expect("tourner");
    let mt = matrix(&d, &t);
    assert_eq!(&mt[..4], &[1.0, 0.0, 0.0, 1.0]);
    assert!(
        !close(mt[4], 300.0) || !close(mt[5], 0.0),
        "la place du texte a tourné"
    );
}

#[test]
fn rotate_zero_and_nan() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 50.0, 50.0);
    let v = d.version();
    assert!(rotate(&mut d, &[&r], 0.0).expect("nul").ids.is_empty());
    assert!(rotate(&mut d, &[&r], 360.0).expect("tour").ids.is_empty());
    assert_eq!(
        rotate(&mut d, &[&r], f64::NAN),
        Err(CommandError::BadMatrix)
    );
    assert_eq!(d.version(), v);
}

/// C5 (constat 3) : matrice arrondie à l'identité (angle quasi nul, `rem_euclid` de -1e-20 compris) : rien à faire (D38).
#[test]
fn rotate_near_zero_no_step() {
    let mut d = blank();
    let r = add_rect(&mut d, 0.0, 0.0, 50.0, 50.0);
    let v = d.version();
    for a in [1e-14, -1e-13, -1e-20] {
        assert!(
            rotate(&mut d, &[&r], a).expect("quasi nul").ids.is_empty(),
            "angle {a}"
        );
    }
    assert_eq!(d.version(), v);
}

/// C5 (constat 3) : texte seul 100 × 30 en (200, 0) tourné sur son centre : translation résiduelle (~1e-14) omise.
#[test]
fn rotate_lone_text_no_step() {
    let mut d = blank();
    let page = first_page(&d);
    let t = d
        .apply(Command::SetText {
            page,
            id: None,
            x: 200.0,
            y: 0.0,
            content: "abc".into(),
            color: "#000000".into(),
            size: 20.0,
            box_width: 100.0,
            box_height: 30.0,
            spans: None,
            look: Look::default(),
        })
        .expect("texte")
        .ids[0]
        .clone();
    let v = d.version();
    let moved: Vec<i32> = (1..360)
        .filter(|a| {
            !rotate(&mut d, &[&t], f64::from(*a))
                .expect("tourner")
                .ids
                .is_empty()
        })
        .collect();
    assert_eq!(moved, Vec::<i32>::new());
    assert_eq!(d.version(), v);
}

#[test]
fn rotate_unknown_id_refused() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 50.0, 20.0);
    let nope = "inconnu".to_string();
    let v = d.version();
    assert_eq!(
        rotate(&mut d, &[&a, &nope], 15.0),
        Err(CommandError::UnknownElement(nope.clone()))
    );
    assert_eq!(d.version(), v);
}

/// Flèche de (100, 25) à (400, 25), départ lié au bord droit de `a`, fin au bord gauche de `b` (patron de
/// `linked_arrow` de tests/fleches.rs).
fn add_bound_arrow(d: &mut Document, a: &str, b: &str) -> String {
    let page = first_page(d);
    d.apply(Command::AddShape {
        page,
        shape: ShapeKind::Arrow,
        x0: 100.0,
        y0: 25.0,
        x1: 400.0,
        y1: 25.0,
        style: pen(),
        fill: None,
        look: Look::default(),
        line: LineInit {
            points: vec![],
            start: Some(BindInput {
                id: a.into(),
                fx: 1.0,
                fy: 0.5,
            }),
            end: Some(BindInput {
                id: b.into(),
                fx: 0.0,
                fy: 0.5,
            }),
        },
    })
    .expect("flèche")
    .ids[0]
        .clone()
}

fn json(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}

/// Points monde d'une ligne (copie de `world` de tests/fleches.rs) : départ, points intérieurs, fin.
fn line_world(d: &Document, id: &str) -> Vec<(f64, f64)> {
    let v = json(d, id);
    let t: Vec<f64> = v["transform"]
        .as_array()
        .unwrap()
        .iter()
        .map(|x| x.as_f64().unwrap())
        .collect();
    let s = &v["shape"];
    let mut local = vec![(0.0, 0.0)];
    if let Some(p) = s["points"].as_array() {
        let p: Vec<f64> = p.iter().map(|x| x.as_f64().unwrap()).collect();
        local.extend(p.chunks(2).map(|c| (c[0], c[1])));
    }
    local.push((s["w"].as_f64().unwrap(), s["h"].as_f64().unwrap()));
    local
        .iter()
        .map(|(x, y)| (t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5]))
        .collect()
}

fn near(a: (f64, f64), b: (f64, f64)) -> bool {
    (a.0 - b.0).abs() < 1e-6 && (a.1 - b.1).abs() < 1e-6
}

/// Discrimine le patron écarté n° 2 (`cmd_arrange` tel quel, sans `linear::follow`) : sous lui, la `Change` ne cite que
/// B et la fin de la flèche reste à (393, 25), hors du rectangle tourné (x ≥ 425) ; ici elle suit son contour dans la
/// même transaction, et une seule annulation rend B et la flèche.
#[test]
fn rotate_bound_arrow_follows() {
    let mut d = blank();
    let a = add_rect(&mut d, 0.0, 0.0, 100.0, 50.0);
    let b = add_rect(&mut d, 400.0, 0.0, 500.0, 50.0);
    let f = add_bound_arrow(&mut d, &a, &b);
    let w0 = line_world(&d, &f);
    assert!(near(w0[w0.len() - 1], (393.0, 25.0)), "fin liée : {w0:?}");
    let (f_before, b_before) = (json(&d, &f), json(&d, &b));
    let v = d.version();
    let ch = rotate(&mut d, &[&b], 90.0).expect("tourner");
    assert!(
        ch.ids.contains(&f),
        "flèche suivie dans la Change : {:?}",
        ch.ids
    );
    assert_ne!(d.version(), v);
    let w = line_world(&d, &f);
    let end = w[w.len() - 1];
    let rb = sbox(&d, &b); // 425..475 × −25..75 après le quart de tour
    assert!(
        end.0 > rb.x0 - 10.0
            && end.0 < rb.x1 + 10.0
            && end.1 > rb.y0 - 10.0
            && end.1 < rb.y1 + 10.0,
        "fin sur le contour tourné : {end:?}, boîte {rb:?}"
    );
    assert!(near(w[0], w0[0]), "départ inchangé : {:?}", w[0]);
    assert!(d.undo());
    assert_eq!(
        json(&d, &f),
        f_before,
        "une seule annulation rend la flèche"
    );
    assert_eq!(json(&d, &b), b_before, "et le rectangle");
}
