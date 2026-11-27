//! Pot de peinture (C6a, D12, DA1, DA2) : `Command::Fill` et `edge_hit` par l'API publique du cœur.
use std::path::PathBuf;

use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::shape::ShapeKind;

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn setup() -> (Document, String) {
    let d = Document::blank();
    let p = d.page_ids()[0].clone();
    (d, p)
}

fn shape(d: &mut Document, p: &str, kind: ShapeKind, c: [f64; 4]) -> String {
    d.apply(Command::AddShape {
        page: p.to_string(),
        shape: kind,
        x0: c[0],
        y0: c[1],
        x1: c[2],
        y1: c[3],
        style: pen(),
        fill: None,
        look: Look::default(),
    })
    .expect("forme")
    .ids[0]
        .clone()
}

fn stroke(d: &mut Document, p: &str) -> String {
    let points: Vec<f32> = (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, 500.0, 0.5])
        .collect();
    d.apply(Command::CommitStroke {
        page: p.to_string(),
        points,
        style: pen(),
        look: Look::default(),
    })
    .expect("trait")
    .ids[0]
        .clone()
}

fn text(d: &mut Document, p: &str) -> String {
    d.apply(Command::SetText {
        page: p.to_string(),
        id: None,
        x: 400.0,
        y: 400.0,
        content: "abc".into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans: None,
        look: Look::default(),
    })
    .expect("texte")
    .ids[0]
        .clone()
}

fn fill(p: &str, target: FillTarget, color: Option<&str>) -> Command {
    Command::Fill {
        page: p.to_string(),
        target,
        color: color.map(str::to_string),
    }
}

fn inside(id: &str) -> FillTarget {
    FillTarget::Inside { id: id.to_string() }
}

fn edge(id: &str) -> FillTarget {
    FillTarget::Edge { id: id.to_string() }
}

fn fill_of(d: &Document, id: &str) -> Option<String> {
    d.element(id).and_then(|e| e.shape).and_then(|s| s.fill)
}

fn color_of(d: &Document, id: &str) -> String {
    d.element(id)
        .and_then(|e| e.style)
        .map(|s| s.color)
        .unwrap_or_default()
}

fn background(d: &Document, p: &str) -> String {
    d.page(p).expect("page").background
}

#[test]
fn fill_inside_is_one_step_undone_and_redone() {
    // S1 : remplir, annuler en une étape, rétablir.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let v = d.version();
    let c = d.apply(fill(&p, inside(&r), Some("#facc15"))).expect("pot");
    assert_eq!(
        (c.pages.clone(), c.ids.clone()),
        (vec![p.clone()], vec![r.clone()])
    );
    assert!(c.version > v);
    assert_eq!(fill_of(&d, &r).as_deref(), Some("#facc15"));
    assert!(d.undo());
    assert_eq!(fill_of(&d, &r), None);
    assert!(d.redo());
    assert_eq!(fill_of(&d, &r).as_deref(), Some("#facc15"));
}

#[test]
fn fill_edge_writes_color_of_shape_and_stroke() {
    // S2 : contour d'une forme (l'intérieur gardé), trait du stylo.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let s = stroke(&mut d, &p);
    d.apply(fill(&p, inside(&r), Some("#facc15")))
        .expect("intérieur");
    d.apply(fill(&p, edge(&r), Some("#dc2626")))
        .expect("contour");
    assert_eq!(
        (color_of(&d, &r), fill_of(&d, &r).as_deref()),
        ("#dc2626".to_string(), Some("#facc15"))
    );
    d.apply(fill(&p, edge(&s), Some("#dc2626"))).expect("trait");
    assert_eq!(color_of(&d, &s), "#dc2626");
    let l = shape(&mut d, &p, ShapeKind::Line, [100.0, 300.0, 300.0, 300.0]);
    d.apply(fill(&p, edge(&l), Some("#1d4ed8"))).expect("ligne");
    assert_eq!(color_of(&d, &l), "#1d4ed8");
}

#[test]
fn none_removes_fill_but_never_an_edge() {
    // D11 : « Aucune » retire le remplissage ; sur un contour ou un trait, aucune étape (D38).
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Ellipse, [100.0, 100.0, 300.0, 200.0]);
    let s = stroke(&mut d, &p);
    d.apply(fill(&p, inside(&r), Some("#facc15")))
        .expect("intérieur");
    d.apply(fill(&p, inside(&r), None)).expect("aucune");
    assert_eq!(fill_of(&d, &r), None);
    let v = d.version();
    for c in [
        fill(&p, inside(&r), None),
        fill(&p, edge(&r), None),
        fill(&p, edge(&s), None),
    ] {
        let ch = d.apply(c).expect("sans effet");
        assert_eq!(ch.version, v);
    }
    assert_eq!(
        (color_of(&d, &r), color_of(&d, &s)),
        ("#000000".to_string(), "#000000".to_string())
    );
}

#[test]
fn same_value_is_no_step() {
    // D38 : même valeur, aucune étape.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(fill(&p, inside(&r), Some("#facc15")))
        .expect("intérieur");
    let v = d.version();
    assert_eq!(
        d.apply(fill(&p, inside(&r), Some("#facc15")))
            .expect("même")
            .version,
        v
    );
    assert_eq!(
        d.apply(fill(&p, edge(&r), Some("#000000")))
            .expect("même contour")
            .version,
        v
    );
    assert_eq!(
        d.apply(fill(&p, FillTarget::Background, Some("#ffffff")))
            .expect("même fond")
            .version,
        v
    );
    assert_eq!(
        d.apply(fill(&p, FillTarget::Background, None))
            .expect("blanc")
            .version,
        v
    );
}

#[test]
fn background_is_written_and_none_means_white() {
    // S4, D10, D11 : fond écrit ; « Aucune » = #ffffff ; annuler rend le bleu.
    let (mut d, p) = setup();
    let c = d
        .apply(fill(&p, FillTarget::Background, Some("#1d4ed8")))
        .expect("fond");
    assert_eq!((c.pages.clone(), c.ids.len()), (vec![p.clone()], 0));
    assert_eq!(background(&d, &p), "#1d4ed8");
    d.apply(fill(&p, FillTarget::Background, None))
        .expect("aucune");
    assert_eq!(background(&d, &p), "#ffffff");
    assert!(d.undo());
    assert_eq!(background(&d, &p), "#1d4ed8");
}

#[test]
fn bad_fill_is_refused_in_core_order_without_step() {
    // D12, PC1 à PC3 : couleur, page, élément (sur la page), cible ; aucune étape.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let l = shape(&mut d, &p, ShapeKind::Arrow, [100.0, 300.0, 300.0, 300.0]);
    let s = stroke(&mut d, &p);
    let t = text(&mut d, &p);
    let p2 = d.apply(Command::add_page(None)).expect("page").pages[0].clone();
    let v = d.version();
    let cases = [
        (fill("nope", inside(&r), Some("#12")), CommandError::BadFill),
        (
            fill("nope", inside(&r), Some("#facc15")),
            CommandError::UnknownPage("nope".into()),
        ),
        (
            fill(&p, inside("nope"), Some("#facc15")),
            CommandError::UnknownElement("nope".into()),
        ),
        (
            fill(&p2, inside(&r), Some("#facc15")),
            CommandError::UnknownElement(r.clone()),
        ),
        (fill(&p, inside(&l), Some("#facc15")), CommandError::BadFill),
        (fill(&p, inside(&s), Some("#facc15")), CommandError::BadFill),
        (fill(&p, edge(&t), Some("#facc15")), CommandError::BadFill),
        (fill(&p, inside(&t), None), CommandError::BadFill),
    ];
    for (cmd, err) in cases {
        assert_eq!(d.apply(cmd.clone()), Err(err), "{cmd:?}");
    }
    assert_eq!(d.version(), v);
}

#[test]
fn bad_fill_message_is_readable() {
    assert_eq!(
        CommandError::BadFill.to_string(),
        "remplissage invalide (couleur valide, contour d'une forme ou d'un trait, intérieur d'un rectangle ou d'une ellipse attendus)"
    );
}

#[test]
fn edge_hit_band_is_tolerance_plus_half_width() {
    // D5, HC6-10 : tracé élargi d'une unité (x = 99), bande = tol + demi-épaisseur (6 + 2).
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let e = shape(&mut d, &p, ShapeKind::Ellipse, [100.0, 300.0, 300.0, 400.0]);
    let l = shape(&mut d, &p, ShapeKind::Line, [100.0, 500.0, 300.0, 500.0]);
    let s = stroke(&mut d, &p);
    assert!(d.edge_hit(&r, 103.0, 150.0, 6.0));
    assert!(d.edge_hit(&r, 107.0, 150.0, 6.0));
    assert!(!d.edge_hit(&r, 110.0, 150.0, 6.0));
    assert!(!d.edge_hit(&r, 200.0, 150.0, 6.0));
    assert!(d.edge_hit(&e, 104.0, 350.0, 6.0));
    assert!(!d.edge_hit(&e, 200.0, 350.0, 6.0));
    assert!(!d.edge_hit(&l, 200.0, 500.0, 6.0));
    assert!(!d.edge_hit(&s, 200.0, 500.0, 6.0));
    assert!(!d.edge_hit("nope", 103.0, 150.0, 6.0));
}

#[test]
fn edge_hit_scales_half_width_with_transform() {
    // Similitude × 2 : contour monde x = 198, bande 6 + 2 × 2 = 10 ; échelle (2, 1) : racine du déterminant, √2.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(Command::Transform {
        ids: vec![r.clone()],
        matrix: [2.0, 0.0, 0.0, 2.0, 0.0, 0.0],
    })
    .expect("échelle");
    assert!(d.edge_hit(&r, 190.0, 300.0, 6.0));
    assert!(!d.edge_hit(&r, 186.0, 300.0, 6.0));
    let q = shape(&mut d, &p, ShapeKind::Rect, [100.0, 600.0, 300.0, 700.0]);
    d.apply(Command::Transform {
        ids: vec![q.clone()],
        matrix: [2.0, 0.0, 0.0, 1.0, 0.0, 0.0],
    })
    .expect("anisotrope");
    assert!(d.edge_hit(&q, 190.0, 650.0, 6.0));
    assert!(!d.edge_hit(&q, 189.0, 650.0, 6.0));
}

#[test]
fn fill_survives_save_and_load() {
    // S5, D21 : valeurs de champs existants, gardées à l'aller-retour.
    let (mut d, p) = setup();
    let r = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    d.apply(fill(&p, inside(&r), Some("#facc15")))
        .expect("intérieur");
    d.apply(fill(&p, edge(&r), Some("#dc2626")))
        .expect("contour");
    d.apply(fill(&p, FillTarget::Background, Some("#1d4ed8")))
        .expect("fond");
    let back = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(fill_of(&back, &r).as_deref(), Some("#facc15"));
    assert_eq!(color_of(&back, &r), "#dc2626");
    assert_eq!(background(&back, &p), "#1d4ed8");
    assert_eq!(back.schema(), Some(1.0));
}

#[test]
fn socle_fixture_opens_white_and_takes_a_fill() {
    // S5, D21 : un fichier d'avant C6a s'ouvre, fond blanc, et le pot y colore le fond.
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/socle-v1.roomboard");
    let mut d = load(&std::fs::read(path).expect("fixture")).expect("load");
    let p = d.page_ids()[0].clone();
    assert_eq!(background(&d, &p), "#ffffff");
    d.apply(fill(&p, FillTarget::Background, Some("#1d4ed8")))
        .expect("fond");
    assert_eq!(background(&d, &p), "#1d4ed8");
}

/// D4, D25 : un objet groupé se colore seul ; le pot vise l'élément touché, jamais son groupe (la remontée au groupe
/// extérieur de C3 vit dans `select.ts`). Groupe de groupe ((a, b), c) ; b est le membre du milieu : un pot étendu au
/// groupe colorerait a, b et c, un pot ramené au premier ou au dernier membre colorerait a ou c.
#[test]
fn grouped_object_fills_alone() {
    let (mut d, p) = setup();
    let a = shape(&mut d, &p, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    let b = shape(&mut d, &p, ShapeKind::Rect, [400.0, 100.0, 600.0, 200.0]);
    let c = shape(&mut d, &p, ShapeKind::Rect, [700.0, 100.0, 900.0, 200.0]);
    d.apply(Command::Group {
        ids: vec![a.clone(), b.clone()],
    })
    .expect("groupe");
    d.apply(Command::Group {
        ids: vec![a.clone(), c.clone()],
    })
    .expect("groupe de groupe");
    let paths = |d: &Document| -> Vec<Option<Vec<String>>> {
        [&a, &b, &c]
            .iter()
            .map(|id| d.element(id).and_then(|e| e.group))
            .collect()
    };
    let before = paths(&d);
    assert_eq!(
        before[1].as_ref().map(Vec::len),
        Some(2),
        "b dans un groupe de groupe"
    );
    assert_eq!(
        d.hit_test(&p, 500.0, 150.0, 6.0).as_deref(),
        Some(b.as_str())
    );

    let ch = d
        .apply(fill(&p, inside(&b), Some("#facc15")))
        .expect("intérieur");
    assert_eq!(ch.ids, vec![b.clone()]);
    assert_eq!(
        [fill_of(&d, &a), fill_of(&d, &b), fill_of(&d, &c)],
        [None, Some("#facc15".to_string()), None]
    );
    let ch = d
        .apply(fill(&p, edge(&b), Some("#dc2626")))
        .expect("contour");
    assert_eq!(ch.ids, vec![b.clone()]);
    assert_eq!(
        [color_of(&d, &a), color_of(&d, &b), color_of(&d, &c)],
        ["#000000", "#dc2626", "#000000"]
    );
    assert_eq!(paths(&d), before, "le pot ne touche pas aux groupes");
}
