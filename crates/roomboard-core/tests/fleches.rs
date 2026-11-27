//! OG12 (lot 1) : flèche et ligne. T1 : points intérieurs, courbe, liaisons écrites, `SetLinePoints`, style ; T4 : suivi,
//! rupture, copie, route coudée, `AddLinked`. Cadrage : docs/plans/personnalisation-2-outils-cadrage.md.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::linear::{BindInput, LineInit};
use roomboard_core::shape::ShapeKind;
use roomboard_core::style::StylePatch;

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-27T00:00:00Z".into(), created: None }
}
fn pen() -> StrokeStyle {
    StrokeStyle { color: "#000000".into(), width: 4.0 }
}
fn page(d: &Document) -> String {
    d.page_ids()[0].clone()
}
fn shape(d: &mut Document, kind: ShapeKind, c: [f64; 4], line: LineInit) -> Result<String, CommandError> {
    let page = page(d);
    let ch = d.apply(Command::AddShape {
        page,
        shape: kind,
        x0: c[0],
        y0: c[1],
        x1: c[2],
        y1: c[3],
        style: pen(),
        fill: None,
        look: Look::default(),
        line,
    })?;
    Ok(ch.ids[0].clone())
}
fn rect(d: &mut Document, x: f64, y: f64) -> String {
    shape(d, ShapeKind::Rect, [x, y, x + 100.0, y + 50.0], LineInit::default()).expect("rectangle")
}
fn bind(id: &str, fx: f64, fy: f64) -> Option<BindInput> {
    Some(BindInput { id: id.into(), fx, fy })
}
/// Vue JSON d'un élément (ce que voient la page et la CLI).
fn view(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}
/// Points monde d'une ligne : départ = translation, puis points intérieurs et (w, h), transform appliquée.
fn world(d: &Document, id: &str) -> Vec<(f64, f64)> {
    let v = view(d, id);
    let t: Vec<f64> = v["transform"].as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect();
    let s = &v["shape"];
    let mut local = vec![(0.0, 0.0)];
    if let Some(p) = s["points"].as_array() {
        let p: Vec<f64> = p.iter().map(|x| x.as_f64().unwrap()).collect();
        local.extend(p.chunks(2).map(|c| (c[0], c[1])));
    }
    local.push((s["w"].as_f64().unwrap(), s["h"].as_f64().unwrap()));
    local.iter().map(|(x, y)| (t[0] * x + t[2] * y + t[4], t[1] * x + t[3] * y + t[5])).collect()
}
fn near(a: (f64, f64), b: (f64, f64)) -> bool {
    (a.0 - b.0).abs() < 1e-6 && (a.1 - b.1).abs() < 1e-6
}

/// S6, n° 4, 5 : extrémités liées au contour, projetées avec l'écart 5 + épaisseur / 2 ; points intérieurs gardés.
#[test]
fn arrow_with_inner_points_and_bindings_reads_back() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0); // boîte (0,0)-(100,50)
    let b = rect(&mut d, 400.0, 0.0); // boîte (400,0)-(500,50)
    let line = LineInit { points: vec![250.0, -60.0], start: bind(&a, 1.0, 0.5), end: bind(&b, 0.0, 0.5) };
    let id = shape(&mut d, ShapeKind::Arrow, [110.0, 25.0, 390.0, 25.0], line).expect("flèche");
    let w = world(&d, &id);
    assert_eq!(w.len(), 3);
    assert!(near(w[0], (107.0, 25.0)), "départ à 5 + 4/2 du côté droit de A : {:?}", w[0]);
    assert!(near(w[1], (250.0, -60.0)));
    assert!(near(w[2], (393.0, 25.0)), "fin à 7 du côté gauche de B : {:?}", w[2]);
    let v = view(&d, &id);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert_eq!(v["shape"]["end"]["fx"], 0.0);
}

/// S2, S5 : une `SetLinePoints` = une étape ; annuler rend la forme d'avant.
#[test]
fn set_line_points_rewrites_geometry_in_one_step() {
    let mut d = Document::blank();
    let id = shape(&mut d, ShapeKind::Line, [0.0, 0.0, 200.0, 0.0], LineInit::default()).expect("ligne");
    let before = view(&d, &id);
    d.apply(Command::SetLinePoints { id: id.clone(), points: vec![0.0, 0.0, 100.0, 80.0, 200.0, 0.0], start: None, end: None })
        .expect("points");
    assert!(near(world(&d, &id)[1], (100.0, 80.0)));
    assert!(d.undo());
    assert_eq!(view(&d, &id), before, "un seul annuler rend la forme d'avant : une étape");
}

/// S5, n° 12 b : refus sans écriture, dans l'ordre du cadrage.
#[test]
fn set_line_points_refusals() {
    let mut d = Document::blank();
    let r = rect(&mut d, 0.0, 0.0);
    let l = shape(&mut d, ShapeKind::Line, [0.0, 100.0, 200.0, 100.0], LineInit::default()).expect("ligne");
    let v0 = d.version();
    let set = |id: &str, points: Vec<f64>, end: Option<BindInput>| Command::SetLinePoints { id: id.into(), points, start: None, end };
    assert_eq!(d.apply(set(&l, vec![1.0, 2.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![1.0, 2.0, 3.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![0.0; 2 * 515], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, f64::NAN, 1.0], None)), Err(CommandError::BadPoints));
    assert_eq!(d.apply(set("absent", vec![0.0, 0.0, 1.0, 1.0], None)), Err(CommandError::UnknownElement("absent".into())));
    assert_eq!(d.apply(set(&r, vec![0.0, 0.0, 1.0, 1.0], None)), Err(CommandError::BadShape));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind("absent", 0.0, 0.5))), Err(CommandError::BadShape));
    assert_eq!(d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind(&l, 0.0, 0.5))), Err(CommandError::BadShape), "ligne non accrochable");
    let lr = LineInit { points: vec![10.0, 10.0], ..LineInit::default() };
    assert_eq!(shape(&mut d, ShapeKind::Rect, [0.0, 0.0, 10.0, 10.0], lr), Err(CommandError::BadShape));
    let odd = LineInit { points: vec![10.0], ..LineInit::default() };
    assert_eq!(shape(&mut d, ShapeKind::Line, [0.0, 0.0, 10.0, 10.0], odd), Err(CommandError::BadPoints));
    assert_eq!(d.version(), v0, "rien d'écrit");
}

/// Review Focus 1, n° 14 : un fichier sans champ neuf se réenregistre octet pour octet et n'en gagne aucun.
#[test]
fn old_file_keeps_bytes() {
    let mut d = Document::blank();
    rect(&mut d, 0.0, 0.0);
    let id = shape(&mut d, ShapeKind::Arrow, [0.0, 100.0, 200.0, 150.0], LineInit::default()).expect("flèche");
    let v = view(&d, &id).to_string();
    for key in ["points", "start", "end", "elbowed"] {
        assert!(!v.contains(&format!("\"{key}\"")), "{key} absent de {v}");
    }
    let a = save(&d, &meta()).expect("save");
    let b = save(&load(&a).expect("load"), &meta()).expect("save 2");
    assert_eq!(a, b);
}

/// S2 : points, courbe et liaisons survivent à l'enregistrement.
#[test]
fn line_fields_survive_save_and_load() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let line = LineInit { points: vec![150.0, 200.0], start: bind(&a, 0.5, 1.0), end: None };
    let id = shape(&mut d, ShapeKind::Arrow, [50.0, 60.0, 300.0, 60.0], line).expect("flèche");
    d.apply(Command::SetStyle { ids: vec![id.clone()], patch: StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() } })
        .expect("courbe");
    let back = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(view(&back, &id), view(&d, &id));
    assert_eq!(view(&back, &id)["look"]["roundness"], "round");
}

/// n° 2, 12 c, 13 : roundness sur ligne et flèche ; elbowed sur flèche seule, vide les points intérieurs ; pointes neuves.
#[test]
fn style_roundness_elbowed_and_new_heads() {
    let mut d = Document::blank();
    let l = shape(&mut d, ShapeKind::Line, [0.0, 0.0, 100.0, 0.0], LineInit::default()).expect("ligne");
    let line = LineInit { points: vec![50.0, 40.0], ..LineInit::default() };
    let a = shape(&mut d, ShapeKind::Arrow, [0.0, 100.0, 100.0, 100.0], line).expect("flèche");
    let style = |d: &mut Document, ids: &[&String], patch: StylePatch| d.apply(Command::SetStyle { ids: ids.iter().map(|s| (*s).clone()).collect(), patch });
    style(&mut d, &[&l], StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() }).expect("arrondi");
    assert_eq!(view(&d, &l)["look"]["roundness"], "round");
    let v = d.version();
    style(&mut d, &[&l], StylePatch { elbowed: Some(Some(true)), ..StylePatch::default() }).expect("sans effet");
    assert_eq!(d.version(), v, "elbowed inapplicable à la ligne : aucune étape");
    style(&mut d, &[&a], StylePatch { elbowed: Some(Some(true)), ..StylePatch::default() }).expect("coudée");
    assert_eq!(view(&d, &a)["look"]["elbowed"], true);
    style(&mut d, &[&a], StylePatch { elbowed: Some(None), ..StylePatch::default() }).expect("droite");
    assert!(view(&d, &a)["look"].get("elbowed").is_none());
    assert!(view(&d, &a)["shape"].get("points").is_none(), "quitter la coudée garde les deux extrémités seules");
    for head in ["bar", "circle", "circle_outline"] {
        style(&mut d, &[&a], StylePatch { end_arrowhead: Some(Some(head.into())), ..StylePatch::default() }).expect("pointe");
        assert_eq!(view(&d, &a)["look"]["endArrowhead"], head);
    }
    assert_eq!(
        style(&mut d, &[&a], StylePatch { end_arrowhead: Some(Some("diamond".into())), ..StylePatch::default() }),
        Err(CommandError::BadStyle),
        "diamond : lot 2"
    );
}

/// Effet de bord 5, n° 3 : une flèche courbe touche sa courbe, pas sa corde (collision et mur du pot passent par
/// `shape_polygon`).
#[test]
fn curved_arrow_hit_follows_the_curve() {
    let mut d = Document::blank();
    let line = LineInit { points: vec![100.0, -80.0], ..LineInit::default() };
    let id = shape(&mut d, ShapeKind::Arrow, [0.0, 0.0, 200.0, 0.0], line).expect("flèche");
    d.apply(Command::SetStyle { ids: vec![id.clone()], patch: StylePatch { roundness: Some(Some("round".into())), ..StylePatch::default() } })
        .expect("courbe");
    let p = page(&d);
    assert_eq!(d.hit_test(&p, 100.0, -79.0, 2.0).as_deref(), Some(id.as_str()));
    assert_eq!(d.hit_test(&p, 100.0, 0.0, 2.0), None, "corde");
    let b = d.bounds(&[id]).expect("bornes");
    assert!(b.y0 < -78.0, "bornes suivent la courbe : {b:?}");
}
