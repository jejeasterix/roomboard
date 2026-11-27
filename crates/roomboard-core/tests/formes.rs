//! OG12 (lot 2a) : losange (n° 33) et ligne fermée par `ShapeToPolygon` (n° 34, H5). Cadrage :
//! docs/plans/personnalisation-2-outils-cadrage.md.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::fill::FillTarget;
use roomboard_core::linear::{BindInput, LineInit, LinkDir};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}
fn page(d: &Document) -> String {
    d.page_ids()[0].clone()
}
fn add(
    d: &mut Document,
    kind: ShapeKind,
    c: [f64; 4],
    fill: Option<String>,
    look: Look,
    line: LineInit,
) -> Result<String, CommandError> {
    let page = page(d);
    let ch = d.apply(Command::AddShape {
        page,
        shape: kind,
        x0: c[0],
        y0: c[1],
        x1: c[2],
        y1: c[3],
        style: pen(),
        fill,
        look,
        line,
    })?;
    Ok(ch.ids[0].clone())
}
fn plain(d: &mut Document, kind: ShapeKind, c: [f64; 4]) -> String {
    add(d, kind, c, None, Look::default(), LineInit::default()).expect("forme")
}
fn view(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}
/// Sommets monde : départ, points intérieurs, (w, h).
fn world(d: &Document, id: &str) -> Vec<(f64, f64)> {
    let v = view(d, id);
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
fn to_polygon(d: &mut Document, id: &str) -> Result<(), CommandError> {
    d.apply(Command::ShapeToPolygon { id: id.into() })
        .map(|_| ())
}

/// S7, n° 33 : le losange se lit, se touche dedans, pas dans les coins de sa boîte.
#[test]
fn diamond_hits_inside_not_box_corners() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 100.0]);
    assert_eq!(view(&d, &id)["shape"]["shape"], "diamond");
    let p = page(&d);
    assert_eq!(
        d.hit_test(&p, 50.0, 50.0, 0.0).as_deref(),
        Some(id.as_str())
    );
    assert_eq!(
        d.hit_test(&p, 8.0, 8.0, 0.0),
        None,
        "coin de la boîte hors du losange"
    );
}

/// S7, n° 5, 17 : une flèche se lie au sommet haut du losange, pointe à 5 + 4/2 du contour.
#[test]
fn arrow_binds_to_diamond_outline_with_gap() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 100.0]);
    let hit = d.bind_target(&page(&d), 50.0, -3.0, 15.0).expect("cible");
    assert_eq!(hit.id, id);
    assert!(hit.on_outline);
    let line = LineInit {
        points: vec![],
        start: None,
        end: Some(BindInput {
            id: id.clone(),
            fx: 0.5,
            fy: 0.0,
        }),
    };
    let a = add(
        &mut d,
        ShapeKind::Arrow,
        [50.0, -200.0, 50.0, -3.0],
        None,
        Look::default(),
        line,
    )
    .expect("flèche");
    let w = world(&d, &a);
    assert!(
        near(*w.last().unwrap(), (50.0, -7.0)),
        "sommet haut (50, 0) écarté de 7 : {w:?}"
    );
}

/// H10 levée au lot 2a : `AddLinked` copie un losange.
#[test]
fn add_linked_accepts_diamond() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 60.0]);
    let ch = d
        .apply(Command::AddLinked {
            id,
            dir: LinkDir::Right,
        })
        .expect("relié");
    assert_eq!(view(&d, &ch.ids[0])["shape"]["shape"], "diamond");
}

/// S8, n° 34, DA-1 : rectangle rempli converti en place, une étape ; fermeture implicite (dernier ≠ départ).
/// Discrimine le patron d'Excalidraw (premier point répété en fin) : il donnerait 5 sommets et (w, h) = (0, 0).
#[test]
fn shape_to_polygon_rect_in_one_step_undo_restores() {
    let mut d = Document::blank();
    let id = add(
        &mut d,
        ShapeKind::Rect,
        [10.0, 20.0, 110.0, 70.0],
        Some("#ff0000".into()),
        Look::default(),
        LineInit::default(),
    )
    .expect("rect");
    let before = view(&d, &id);
    to_polygon(&mut d, &id).expect("conversion");
    let v = view(&d, &id);
    assert_eq!(v["id"], id.as_str(), "même id");
    assert_eq!(v["shape"]["shape"], "line");
    assert_eq!(v["shape"]["polygon"], true);
    assert_eq!(v["shape"]["fill"], "#ff0000");
    let w = world(&d, &id);
    assert_eq!(w.len(), 4, "fermeture implicite : {w:?}");
    assert!(!near(w[0], w[3]), "DA-1 : dernier sommet ≠ départ");
    for (p, q) in w
        .iter()
        .zip([(10.0, 20.0), (110.0, 20.0), (110.0, 70.0), (10.0, 70.0)])
    {
        assert!(near(*p, q), "{w:?}");
    }
    assert!(d.undo());
    assert_eq!(view(&d, &id), before, "une seule étape");
}

/// S8 : losange 4 sommets (haut, droite, bas, gauche) ; ellipse 16 sommets.
#[test]
fn shape_to_polygon_diamond_and_ellipse_vertices() {
    let mut d = Document::blank();
    let dm = plain(&mut d, ShapeKind::Diamond, [0.0, 0.0, 100.0, 60.0]);
    to_polygon(&mut d, &dm).expect("losange");
    let w = world(&d, &dm);
    assert_eq!(w.len(), 4);
    assert!(
        near(w[0], (50.0, 0.0))
            && near(w[1], (100.0, 30.0))
            && near(w[2], (50.0, 60.0))
            && near(w[3], (0.0, 30.0)),
        "{w:?}"
    );
    let el = plain(&mut d, ShapeKind::Ellipse, [0.0, 0.0, 100.0, 60.0]);
    to_polygon(&mut d, &el).expect("ellipse");
    let w = world(&d, &el);
    assert_eq!(w.len(), 16);
    assert!(near(w[0], (50.0, 0.0)), "départ en haut : {w:?}");
}

/// H5 : un rectangle arrondi converti perd `roundness` (sinon courbe ouverte).
#[test]
fn rounded_rect_converted_reads_straight() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    d.apply(Command::SetStyle {
        ids: vec![id.clone()],
        patch: StylePatch {
            roundness: Some(Some("round".into())),
            ..Default::default()
        },
    })
    .expect("arrondi");
    to_polygon(&mut d, &id).expect("conversion");
    assert!(
        view(&d, &id)["look"]["roundness"].is_null(),
        "roundness retiré"
    );
}

/// n° 1 : une ligne fermée se touche dedans, ses bornes valent celles du rectangle.
#[test]
fn polygon_hits_inside_like_the_rect() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let b0 = d.bounds(std::slice::from_ref(&id)).expect("bornes");
    to_polygon(&mut d, &id).expect("conversion");
    assert_eq!(
        d.hit_test(&page(&d), 50.0, 25.0, 0.0).as_deref(),
        Some(id.as_str())
    );
    let b1 = d.bounds(std::slice::from_ref(&id)).expect("bornes");
    assert_eq!(b0, b1);
}

/// n° 12 b : sur une ligne fermée, liaisons refusées, moins de 3 sommets refusés ; ligne ou flèche : pas de conversion.
#[test]
fn polygon_refuses_bindings_and_fewer_than_3_points() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let other = plain(&mut d, ShapeKind::Rect, [300.0, 0.0, 400.0, 50.0]);
    to_polygon(&mut d, &id).expect("conversion");
    let two = Command::SetLinePoints {
        id: id.clone(),
        points: vec![0.0, 0.0, 100.0, 0.0],
        start: None,
        end: None,
    };
    assert_eq!(d.apply(two).unwrap_err(), CommandError::BadPoints);
    let bound = Command::SetLinePoints {
        id: id.clone(),
        points: vec![0.0, 0.0, 100.0, 0.0, 100.0, 50.0],
        start: Some(BindInput {
            id: other,
            fx: 0.0,
            fy: 0.5,
        }),
        end: None,
    };
    assert_eq!(d.apply(bound).unwrap_err(), CommandError::BadShape);
    let line = plain(&mut d, ShapeKind::Line, [0.0, 0.0, 50.0, 50.0]);
    assert_eq!(
        to_polygon(&mut d, &line).unwrap_err(),
        CommandError::BadShape
    );
}

/// Review Focus 1, n° 9 : flèche liée au rectangle converti : lue libre, l'annulation la rend liée.
#[test]
fn bound_arrow_reads_free_after_polygon() {
    let mut d = Document::blank();
    let r = plain(&mut d, ShapeKind::Rect, [0.0, 0.0, 100.0, 50.0]);
    let line = LineInit {
        points: vec![],
        start: None,
        end: Some(BindInput {
            id: r.clone(),
            fx: 0.0,
            fy: 0.5,
        }),
    };
    let a = add(
        &mut d,
        ShapeKind::Arrow,
        [-200.0, 25.0, -7.0, 25.0],
        None,
        Look::default(),
        line,
    )
    .expect("flèche");
    to_polygon(&mut d, &r).expect("conversion");
    assert!(view(&d, &a)["shape"]["end"].is_null(), "lue libre");
    assert!(d.undo());
    assert_eq!(view(&d, &a)["shape"]["end"]["id"], r.as_str());
}

fn fill(d: &mut Document, target: FillTarget, color: Option<&str>) -> Result<(), CommandError> {
    let p = page(d);
    d.apply(Command::Fill {
        page: p,
        target,
        color: color.map(str::to_string),
    })
    .map(|_| ())
}

/// C4a : le pot remplit l'intérieur d'une ligne fermée comme celui du rectangle (prédicat « remplissable » :
/// `!is_segment() || polygon`), son trait gardé ; `edge_hit` mesure son tracé fermé, arête de fermeture comprise.
#[test]
fn polygon_fills_inside_like_the_rect() {
    let mut d = Document::blank();
    let id = plain(&mut d, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
    to_polygon(&mut d, &id).expect("conversion");
    let inside = || FillTarget::Inside { id: id.clone() };
    fill(&mut d, inside(), Some("#facc15")).expect("intérieur");
    let v = view(&d, &id);
    assert_eq!(
        (&v["shape"]["fill"], &v["style"]["color"]),
        (&serde_json::json!("#facc15"), &serde_json::json!("#000000"))
    );
    let hits: Vec<bool> = [
        (103.0, 150.0),
        (200.0, 103.0),
        (297.0, 150.0),
        (200.0, 197.0),
        (200.0, 150.0),
    ]
    .iter()
    .map(|&(x, y)| d.edge_hit(&id, x, y, 6.0))
    .collect();
    assert_eq!(hits, [true, true, true, true, false]);
    fill(&mut d, inside(), None).expect("aucune");
    assert_eq!(view(&d, &id)["shape"]["fill"], serde_json::Value::Null);
}

/// C4a : un clic de zone dans une ligne fermée non remplie se remplit comme dans le rectangle (anneau, jamais `OnWall`).
#[cfg(feature = "zone")]
#[test]
fn zone_inside_polygon_fills_like_the_rect() {
    let zone_in = |convert: bool| {
        let mut d = Document::blank();
        let id = plain(&mut d, ShapeKind::Rect, [100.0, 100.0, 300.0, 200.0]);
        if convert {
            to_polygon(&mut d, &id).expect("conversion");
        }
        let target = FillTarget::Zone {
            x: 200.0,
            y: 150.0,
            tol: 2.0,
        };
        fill(&mut d, target, Some("#facc15")).expect("zone");
        d.element_ids(&page(&d)).len()
    };
    assert_eq!((zone_in(false), zone_in(true)), (2, 2));
}
