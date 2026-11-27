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
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-27T00:00:00Z".into(),
        created: None,
    }
}
fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#000000".into(),
        width: 4.0,
    }
}
fn page(d: &Document) -> String {
    d.page_ids()[0].clone()
}
fn shape(
    d: &mut Document,
    kind: ShapeKind,
    c: [f64; 4],
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
        fill: None,
        look: Look::default(),
        line,
    })?;
    Ok(ch.ids[0].clone())
}
fn rect(d: &mut Document, x: f64, y: f64) -> String {
    shape(
        d,
        ShapeKind::Rect,
        [x, y, x + 100.0, y + 50.0],
        LineInit::default(),
    )
    .expect("rectangle")
}
fn bind(id: &str, fx: f64, fy: f64) -> Option<BindInput> {
    Some(BindInput {
        id: id.into(),
        fx,
        fy,
    })
}
/// Vue JSON d'un élément (ce que voient la page et la CLI).
fn view(d: &Document, id: &str) -> serde_json::Value {
    serde_json::to_value(d.element(id).expect("élément")).expect("json")
}
/// Points monde d'une ligne : départ = translation, puis points intérieurs et (w, h), transform appliquée.
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

/// S6, n° 4, 5 : extrémités liées au contour, projetées avec l'écart 5 + épaisseur / 2 ; points intérieurs gardés.
#[test]
fn arrow_with_inner_points_and_bindings_reads_back() {
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0); // boîte (0,0)-(100,50)
    let b = rect(&mut d, 400.0, 0.0); // boîte (400,0)-(500,50)
    let line = LineInit {
        points: vec![250.0, -60.0],
        start: bind(&a, 1.0, 0.5),
        end: bind(&b, 0.0, 0.5),
    };
    let id = shape(&mut d, ShapeKind::Arrow, [110.0, 25.0, 390.0, 25.0], line).expect("flèche");
    let w = world(&d, &id);
    assert_eq!(w.len(), 3);
    assert!(
        near(w[0], (107.0, 25.0)),
        "départ à 5 + 4/2 du côté droit de A : {:?}",
        w[0]
    );
    assert!(near(w[1], (250.0, -60.0)));
    assert!(
        near(w[2], (393.0, 25.0)),
        "fin à 7 du côté gauche de B : {:?}",
        w[2]
    );
    let v = view(&d, &id);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert_eq!(v["shape"]["end"]["fx"], 0.0);
}

/// S2, S5 : une `SetLinePoints` = une étape ; annuler rend la forme d'avant.
#[test]
fn set_line_points_rewrites_geometry_in_one_step() {
    let mut d = Document::blank();
    let id = shape(
        &mut d,
        ShapeKind::Line,
        [0.0, 0.0, 200.0, 0.0],
        LineInit::default(),
    )
    .expect("ligne");
    let before = view(&d, &id);
    d.apply(Command::SetLinePoints {
        id: id.clone(),
        points: vec![0.0, 0.0, 100.0, 80.0, 200.0, 0.0],
        start: None,
        end: None,
    })
    .expect("points");
    assert!(near(world(&d, &id)[1], (100.0, 80.0)));
    assert!(d.undo());
    assert_eq!(
        view(&d, &id),
        before,
        "un seul annuler rend la forme d'avant : une étape"
    );
}

/// S5, n° 12 b : refus sans écriture, dans l'ordre du cadrage.
#[test]
fn set_line_points_refusals() {
    let mut d = Document::blank();
    let r = rect(&mut d, 0.0, 0.0);
    let l = shape(
        &mut d,
        ShapeKind::Line,
        [0.0, 100.0, 200.0, 100.0],
        LineInit::default(),
    )
    .expect("ligne");
    let v0 = d.version();
    let set = |id: &str, points: Vec<f64>, end: Option<BindInput>| Command::SetLinePoints {
        id: id.into(),
        points,
        start: None,
        end,
    };
    assert_eq!(
        d.apply(set(&l, vec![1.0, 2.0], None)),
        Err(CommandError::BadPoints)
    );
    assert_eq!(
        d.apply(set(&l, vec![1.0, 2.0, 3.0], None)),
        Err(CommandError::BadPoints)
    );
    assert_eq!(
        d.apply(set(&l, vec![0.0; 2 * 515], None)),
        Err(CommandError::BadPoints)
    );
    assert_eq!(
        d.apply(set(&l, vec![0.0, 0.0, f64::NAN, 1.0], None)),
        Err(CommandError::BadPoints)
    );
    assert_eq!(
        d.apply(set("absent", vec![0.0, 0.0, 1.0, 1.0], None)),
        Err(CommandError::UnknownElement("absent".into()))
    );
    assert_eq!(
        d.apply(set(&r, vec![0.0, 0.0, 1.0, 1.0], None)),
        Err(CommandError::BadShape)
    );
    assert_eq!(
        d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind("absent", 0.0, 0.5))),
        Err(CommandError::BadShape)
    );
    assert_eq!(
        d.apply(set(&l, vec![0.0, 0.0, 1.0, 1.0], bind(&l, 0.0, 0.5))),
        Err(CommandError::BadShape),
        "ligne non accrochable"
    );
    let lr = LineInit {
        points: vec![10.0, 10.0],
        ..LineInit::default()
    };
    assert_eq!(
        shape(&mut d, ShapeKind::Rect, [0.0, 0.0, 10.0, 10.0], lr),
        Err(CommandError::BadShape)
    );
    let odd = LineInit {
        points: vec![10.0],
        ..LineInit::default()
    };
    assert_eq!(
        shape(&mut d, ShapeKind::Line, [0.0, 0.0, 10.0, 10.0], odd),
        Err(CommandError::BadPoints)
    );
    assert_eq!(d.version(), v0, "rien d'écrit");
}

/// Review Focus 1, n° 14 : un fichier sans champ neuf se réenregistre octet pour octet et n'en gagne aucun.
#[test]
fn old_file_keeps_bytes() {
    let mut d = Document::blank();
    rect(&mut d, 0.0, 0.0);
    let id = shape(
        &mut d,
        ShapeKind::Arrow,
        [0.0, 100.0, 200.0, 150.0],
        LineInit::default(),
    )
    .expect("flèche");
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
    let line = LineInit {
        points: vec![150.0, 200.0],
        start: bind(&a, 0.5, 1.0),
        end: None,
    };
    let id = shape(&mut d, ShapeKind::Arrow, [50.0, 60.0, 300.0, 60.0], line).expect("flèche");
    d.apply(Command::SetStyle {
        ids: vec![id.clone()],
        patch: StylePatch {
            roundness: Some(Some("round".into())),
            ..StylePatch::default()
        },
    })
    .expect("courbe");
    let back = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(view(&back, &id), view(&d, &id));
    assert_eq!(view(&back, &id)["look"]["roundness"], "round");
}

/// n° 2, 12 c, 13 : roundness sur ligne et flèche ; elbowed sur flèche seule, vide les points intérieurs ; pointes neuves.
#[test]
fn style_roundness_elbowed_and_new_heads() {
    let mut d = Document::blank();
    let l = shape(
        &mut d,
        ShapeKind::Line,
        [0.0, 0.0, 100.0, 0.0],
        LineInit::default(),
    )
    .expect("ligne");
    let line = LineInit {
        points: vec![50.0, 40.0],
        ..LineInit::default()
    };
    let a = shape(&mut d, ShapeKind::Arrow, [0.0, 100.0, 100.0, 100.0], line).expect("flèche");
    let style = |d: &mut Document, ids: &[&String], patch: StylePatch| {
        d.apply(Command::SetStyle {
            ids: ids.iter().map(|s| (*s).clone()).collect(),
            patch,
        })
    };
    style(
        &mut d,
        &[&l],
        StylePatch {
            roundness: Some(Some("round".into())),
            ..StylePatch::default()
        },
    )
    .expect("arrondi");
    assert_eq!(view(&d, &l)["look"]["roundness"], "round");
    let v = d.version();
    style(
        &mut d,
        &[&l],
        StylePatch {
            elbowed: Some(Some(true)),
            ..StylePatch::default()
        },
    )
    .expect("sans effet");
    assert_eq!(
        d.version(),
        v,
        "elbowed inapplicable à la ligne : aucune étape"
    );
    style(
        &mut d,
        &[&a],
        StylePatch {
            elbowed: Some(Some(true)),
            ..StylePatch::default()
        },
    )
    .expect("coudée");
    assert_eq!(view(&d, &a)["look"]["elbowed"], true);
    style(
        &mut d,
        &[&a],
        StylePatch {
            elbowed: Some(None),
            ..StylePatch::default()
        },
    )
    .expect("droite");
    assert!(view(&d, &a)["look"].get("elbowed").is_none());
    assert!(
        view(&d, &a)["shape"].get("points").is_none(),
        "quitter la coudée garde les deux extrémités seules"
    );
    for head in ["bar", "circle", "circle_outline"] {
        style(
            &mut d,
            &[&a],
            StylePatch {
                end_arrowhead: Some(Some(head.into())),
                ..StylePatch::default()
            },
        )
        .expect("pointe");
        assert_eq!(view(&d, &a)["look"]["endArrowhead"], head);
    }
    assert_eq!(
        style(
            &mut d,
            &[&a],
            StylePatch {
                end_arrowhead: Some(Some("diamond".into())),
                ..StylePatch::default()
            }
        ),
        Err(CommandError::BadStyle),
        "diamond : lot 2"
    );
}

/// Effet de bord 5, n° 3 : une flèche courbe touche sa courbe, pas sa corde (collision et mur du pot passent par
/// `shape_polygon`).
#[test]
fn curved_arrow_hit_follows_the_curve() {
    let mut d = Document::blank();
    let line = LineInit {
        points: vec![100.0, -80.0],
        ..LineInit::default()
    };
    let id = shape(&mut d, ShapeKind::Arrow, [0.0, 0.0, 200.0, 0.0], line).expect("flèche");
    d.apply(Command::SetStyle {
        ids: vec![id.clone()],
        patch: StylePatch {
            roundness: Some(Some("round".into())),
            ..StylePatch::default()
        },
    })
    .expect("courbe");
    let p = page(&d);
    assert_eq!(
        d.hit_test(&p, 100.0, -79.0, 2.0).as_deref(),
        Some(id.as_str())
    );
    assert_eq!(d.hit_test(&p, 100.0, 0.0, 2.0), None, "corde");
    let b = d.bounds(&[id]).expect("bornes");
    assert!(b.y0 < -78.0, "bornes suivent la courbe : {b:?}");
}

// ---------------------------------------------------------------------------------------------------------------------
// T4 : suivi, rupture, copie, `bind_target`, route coudée, `AddLinked`.

fn mv(d: &mut Document, ids: &[&String], dx: f64, dy: f64) {
    d.apply(Command::Transform {
        ids: ids.iter().map(|s| (*s).clone()).collect(),
        matrix: [1.0, 0.0, 0.0, 1.0, dx, dy],
    })
    .expect("déplacer");
}
fn linked_arrow(d: &mut Document) -> (String, String, String) {
    let a = rect(d, 0.0, 0.0);
    let b = rect(d, 400.0, 0.0);
    let line = LineInit {
        points: vec![],
        start: bind(&a, 1.0, 0.5),
        end: bind(&b, 0.0, 0.5),
    };
    let f = shape(d, ShapeKind::Arrow, [100.0, 25.0, 400.0, 25.0], line).expect("flèche");
    (a, b, f)
}
fn orthogonal(w: &[(f64, f64)]) -> bool {
    w.windows(2)
        .all(|s| (s[0].0 - s[1].0).abs() < 1e-9 || (s[0].1 - s[1].1).abs() < 1e-9)
}

/// S1, effet de bord 2 : B déplacé de 200 : la fin suit à 7 du contour ; annuler une fois rend B et la flèche.
/// Discrimine le patron interdit (suivi dans une seconde transaction ou commande) : la `Change` du `Transform` cite la
/// flèche, et une seule annulation rend aussi B (sous le mauvais patron, elle ne défait que le suivi : B resterait
/// déplacé).
#[test]
fn moving_target_moves_bound_end_in_one_step() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    let before = view(&d, &f);
    let b_before = view(&d, &b);
    let ch = d
        .apply(Command::Transform {
            ids: vec![b.clone()],
            matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 200.0],
        })
        .expect("déplacer");
    assert_eq!(ch.ids, vec![b.clone(), f.clone()], "déplacés puis suivis");
    let w = world(&d, &f);
    assert!(near(w[1], (393.0, 225.0)), "fin suivie : {:?}", w[1]);
    assert!(near(w[0], (107.0, 25.0)), "départ inchangé");
    assert!(d.undo());
    assert_eq!(view(&d, &f), before);
    assert_eq!(view(&d, &b), b_before, "une seule annulation rend aussi B");
}

/// Effet de bord 3, n° 8 : flèche seule : rompue aux deux bouts ; flèche + A : fin rompue, départ gardé ; flèche + A + B :
/// tout gardé.
#[test]
fn moving_arrow_alone_unbinds_end_by_end() {
    let mut d = Document::blank();
    let (a, b, f) = linked_arrow(&mut d);
    mv(&mut d, &[&f, &a], 0.0, 50.0);
    let v = view(&d, &f);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert!(v["shape"].get("end").is_none());
    d.undo();
    mv(&mut d, &[&f, &a, &b], 30.0, 0.0);
    let v = view(&d, &f);
    assert!(v["shape"].get("start").is_some() && v["shape"].get("end").is_some());
    d.undo();
    mv(&mut d, &[&f], 0.0, 80.0);
    let v = view(&d, &f);
    assert!(v["shape"].get("start").is_none() && v["shape"].get("end").is_none());
}

/// Review Focus 2, n° 9 : cible supprimée : lue libre, forme gardée, rien d'écrit sur la flèche ; annuler : liée.
#[test]
fn deleted_target_reads_free_and_undo_restores() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    let w0 = world(&d, &f);
    d.apply(Command::Delete {
        ids: vec![b.clone()],
    })
    .expect("supprimer");
    let v = view(&d, &f);
    assert!(v["shape"].get("end").is_none());
    assert_eq!(world(&d, &f), w0);
    d.undo();
    assert_eq!(view(&d, &f)["shape"]["end"]["id"], b.as_str());
}

/// S4, effet de bord 6, n° 10 : copie avec ses deux cibles liée aux copies ; copie seule libre.
#[test]
fn duplicate_with_targets_rebinds_to_copies_alone_frees() {
    let mut d = Document::blank();
    let (a, b, f) = linked_arrow(&mut d);
    let p = page(&d);
    let frag = d
        .extract(&p, &[a.clone(), b.clone(), f.clone()])
        .expect("extrait");
    let ch = d.insert_fragment(&frag, &p, 10.0, 10.0).expect("coller");
    let [ca, cb, cf] = [&ch.ids[0], &ch.ids[1], &ch.ids[2]];
    let v = view(&d, cf);
    assert_eq!(v["shape"]["start"]["id"], ca.as_str());
    assert_eq!(v["shape"]["end"]["id"], cb.as_str());
    let alone = d
        .extract(&p, std::slice::from_ref(&f))
        .expect("extrait seul");
    let ch = d
        .insert_fragment(&alone, &p, 10.0, 10.0)
        .expect("coller seul");
    let v = view(&d, &ch.ids[0]);
    assert!(v["shape"].get("start").is_none() && v["shape"].get("end").is_none());
}

/// Carte d'impact 3.1 : la duplication de page renvoie les liaisons vers les copies de la page.
#[test]
fn duplicate_page_rebinds_bindings() {
    let mut d = Document::blank();
    let (_a, _b, _f) = linked_arrow(&mut d);
    let p = page(&d);
    d.apply(Command::DuplicatePage { page: p })
        .expect("dupliquer la page");
    let q = d.page_ids()[1].clone();
    let ids = d.element_ids(&q);
    let v = view(&d, &ids[2]);
    assert_eq!(v["shape"]["start"]["id"], ids[0].as_str());
    assert_eq!(v["shape"]["end"]["id"], ids[1].as_str());
}

/// n° 7 : SetText qui élargit un texte lié recale l'extrémité dans la même étape (deux annulations défont l'élargissement
/// puis la ligne : sous le mauvais patron, la ligne resterait après la seconde).
#[test]
fn text_box_change_moves_bound_end() {
    let mut d = Document::blank();
    let p = page(&d);
    let text = |d: &mut Document, id: Option<String>, w: f64| {
        d.apply(Command::SetText {
            page: p.clone(),
            id,
            x: 0.0,
            y: 0.0,
            content: "nœud".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: w,
            box_height: 50.0,
            spans: None,
            look: Look::default(),
        })
        .expect("texte")
    };
    let t = text(&mut d, None, 100.0).ids[0].clone();
    let line = LineInit {
        points: vec![],
        start: None,
        end: bind(&t, 1.0, 0.5),
    };
    let f = shape(&mut d, ShapeKind::Line, [300.0, 25.0, 100.0, 25.0], line).expect("ligne");
    assert!(
        near(world(&d, &f)[1], (105.0, 25.0)),
        "écart 5 + 0 pour un texte"
    );
    text(&mut d, Some(t.clone()), 200.0);
    assert!(near(world(&d, &f)[1], (205.0, 25.0)));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (105.0, 25.0)));
    assert!(d.undo());
    assert_eq!(
        d.element_ids(&p),
        vec![t.clone()],
        "la ligne défaite à la seconde"
    );
}

/// n° 17 : le plus petit objet qui contient le point passe devant ; près du contour : projeté ; ancres monde.
#[test]
fn bind_target_prefers_smaller_containing_and_projects_outline() {
    let mut d = Document::blank();
    let big = shape(
        &mut d,
        ShapeKind::Rect,
        [0.0, 0.0, 400.0, 400.0],
        LineInit::default(),
    )
    .expect("grand");
    let small = rect(&mut d, 100.0, 100.0); // (100,100)-(200,150)
    let p = page(&d);
    let h = d.bind_target(&p, 150.0, 120.0, 15.0).expect("cible");
    assert_eq!(h.id, small);
    assert!(!h.on_outline);
    let h = d.bind_target(&p, 395.0, 300.0, 15.0).expect("bord");
    assert_eq!(h.id, big);
    assert!(h.on_outline && (h.fixed[0] - 1.0).abs() < 1e-9 && (h.fixed[1] - 0.75).abs() < 1e-9);
    assert_eq!(h.anchors[1], [400.0, 200.0]);
    assert!(d.bind_target(&p, 900.0, 900.0, 15.0).is_none());
    let l = shape(
        &mut d,
        ShapeKind::Line,
        [600.0, 600.0, 700.0, 600.0],
        LineInit::default(),
    )
    .expect("ligne");
    assert!(
        d.bind_target(&p, 650.0, 600.0, 15.0)
            .is_none_or(|h| h.id != l),
        "une ligne n'est pas accrochable"
    );
    let json = serde_json::to_value(d.bind_target(&p, 395.0, 300.0, 15.0).unwrap()).unwrap();
    assert_eq!(json["onOutline"], true, "JSON camelCase");
}

/// S3, S5 : AddLinked à droite : copie à 100, flèche coudée liée aux deux, une étape ; place prise : glisse.
#[test]
fn add_linked_places_copy_and_elbow_arrow_in_one_step() {
    use roomboard_core::linear::LinkDir;
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let n0 = d.element_ids(&page(&d)).len();
    let ch = d
        .apply(Command::AddLinked {
            id: a.clone(),
            dir: LinkDir::Right,
        })
        .expect("relié");
    let (c, f) = (ch.ids[0].clone(), ch.ids[1].clone());
    assert_eq!(d.element_ids(&page(&d)).len(), n0 + 2);
    assert_eq!(view(&d, &c)["transform"][4], 200.0, "100 de large + 100");
    let v = view(&d, &f);
    assert_eq!(v["look"]["elbowed"], true);
    assert_eq!(v["shape"]["start"]["id"], a.as_str());
    assert_eq!(v["shape"]["end"]["id"], c.as_str());
    let w = world(&d, &f);
    assert!(orthogonal(&w), "orthogonale : {w:?}");
    let again = d
        .apply(Command::AddLinked {
            id: a.clone(),
            dir: LinkDir::Right,
        })
        .expect("encore");
    let y = view(&d, &again.ids[0])["transform"][5].as_f64().unwrap();
    assert!(y >= 150.0, "glissée sous la première copie : {y}");
    assert!(d.undo());
    assert_eq!(d.element_ids(&page(&d)).len(), n0 + 2, "une étape");
    let l = shape(
        &mut d,
        ShapeKind::Line,
        [0.0, 500.0, 10.0, 500.0],
        LineInit::default(),
    )
    .expect("ligne");
    assert_eq!(
        d.apply(Command::AddLinked {
            id: l,
            dir: LinkDir::Up
        }),
        Err(CommandError::BadShape)
    );
    assert_eq!(
        d.apply(Command::AddLinked {
            id: "absent".into(),
            dir: LinkDir::Up
        }),
        Err(CommandError::UnknownElement("absent".into()))
    );
    assert_eq!(LinkDir::parse("down"), Some(LinkDir::Down));
    assert_eq!(LinkDir::parse("nord"), None);
}

/// S3 : glisser le premier nœud reroute la coudée.
#[test]
fn moving_node_reroutes_elbow_arrow() {
    use roomboard_core::linear::LinkDir;
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    let ch = d
        .apply(Command::AddLinked {
            id: a.clone(),
            dir: LinkDir::Right,
        })
        .expect("relié");
    mv(&mut d, &[&a], 0.0, 300.0);
    let w = world(&d, &ch.ids[1]);
    assert!(near(w[0], (107.0, 325.0)), "départ suivi : {:?}", w[0]);
    assert!(orthogonal(&w), "{w:?}");
}

/// n° 12 c : passer à coudée reroute dans la même étape.
#[test]
fn set_style_elbowed_reroutes() {
    let mut d = Document::blank();
    let (_a, b, f) = linked_arrow(&mut d);
    mv(&mut d, &[&b], 0.0, 200.0);
    let before = view(&d, &f);
    d.apply(Command::SetStyle {
        ids: vec![f.clone()],
        patch: StylePatch {
            elbowed: Some(Some(true)),
            ..StylePatch::default()
        },
    })
    .expect("coudée");
    let w = world(&d, &f);
    assert!(w.len() >= 4, "route à angles droits : {w:?}");
    assert!(orthogonal(&w), "{w:?}");
    assert!(d.undo());
    assert_eq!(view(&d, &f), before, "une étape");
}

// ---------------------------------------------------------------------------------------------------------------------
// C1 (double relecture du lot 1).

/// C1 constat 1 : une flèche coudée créée par `AddShape` est routée dans la même étape. Glisser (200, 200)→(300, 300),
/// deux bouts libres : route en Z par x = 250. Sous le patron fautif (aucune route à la création), la flèche reste une
/// diagonale de deux points.
#[test]
fn add_shape_elbowed_is_routed_at_creation() {
    let mut d = Document::blank();
    let p = page(&d);
    let ch = d
        .apply(Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Arrow,
            x0: 200.0,
            y0: 200.0,
            x1: 300.0,
            y1: 300.0,
            style: pen(),
            fill: None,
            look: Look {
                elbowed: Some(true),
                ..Look::default()
            },
            line: LineInit::default(),
        })
        .expect("coudée");
    let f = ch.ids[0].clone();
    let w = world(&d, &f);
    let want = [(200.0, 200.0), (250.0, 200.0), (250.0, 300.0), (300.0, 300.0)];
    assert_eq!(w.len(), want.len(), "route en Z : {w:?}");
    assert!(w.iter().zip(want).all(|(a, b)| near(*a, b)), "{w:?}");
    assert!(d.undo());
    assert!(d.element_ids(&p).is_empty(), "une étape");
}

/// C1 constat 2 : une liaison vers un objet d'une autre page est refusée (`BadShape`), par `AddShape` comme par
/// `SetLinePoints`. Sous le patron fautif (`find_element` parcourt toutes les pages), les deux commandes passent.
#[test]
fn binding_to_other_page_is_refused() {
    let mut d = Document::blank();
    let p1 = page(&d);
    let p2 = d
        .apply(Command::AddPage {
            after: None,
            mode: None,
        })
        .expect("page")
        .pages[0]
        .clone();
    let r = d
        .apply(Command::AddShape {
            page: p2.clone(),
            shape: ShapeKind::Rect,
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 50.0,
            style: pen(),
            fill: None,
            look: Look::default(),
            line: LineInit::default(),
        })
        .expect("rectangle de la page 2")
        .ids[0]
        .clone();
    let line = LineInit {
        points: vec![],
        start: bind(&r, 1.0, 0.5),
        end: None,
    };
    assert_eq!(
        shape(&mut d, ShapeKind::Arrow, [200.0, 25.0, 400.0, 25.0], line),
        Err(CommandError::BadShape),
        "AddShape vers la page 2"
    );
    let f = shape(
        &mut d,
        ShapeKind::Arrow,
        [200.0, 25.0, 400.0, 25.0],
        LineInit::default(),
    )
    .expect("flèche libre");
    let before = view(&d, &f);
    assert_eq!(
        d.apply(Command::SetLinePoints {
            id: f.clone(),
            points: vec![200.0, 25.0, 400.0, 25.0],
            start: None,
            end: bind(&r, 0.0, 0.5),
        }),
        Err(CommandError::BadShape),
        "SetLinePoints vers la page 2"
    );
    assert_eq!(view(&d, &f), before, "rien d'écrit");
    // Même page : acceptée (le refus ne vient que de la page).
    let a = rect(&mut d, 0.0, 0.0);
    d.apply(Command::SetLinePoints {
        id: f.clone(),
        points: vec![200.0, 25.0, 400.0, 25.0],
        start: bind(&a, 1.0, 0.5),
        end: None,
    })
    .expect("même page");
    assert_eq!(view(&d, &f)["shape"]["start"]["id"], a.as_str());
    assert_eq!(d.element_ids(&p2), vec![r]);
    let _ = p1;
}

/// C1 constat 4 : `AddLinked` sur une source tournée de 90° : la flèche sort par le côté lié (local droit, monde bas),
/// donc verticalement. Sous le patron fautif (normale prise en coordonnées monde, `(1, 0)`), le premier segment est
/// horizontal : route en Z par x = 50.
#[test]
fn add_linked_on_rotated_source_leaves_through_bound_side() {
    use roomboard_core::linear::LinkDir;
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    d.apply(Command::Transform {
        ids: vec![a.clone()],
        matrix: [0.0, 1.0, -1.0, 0.0, 0.0, 0.0],
    })
    .expect("tourner");
    let ch = d
        .apply(Command::AddLinked {
            id: a.clone(),
            dir: LinkDir::Right,
        })
        .expect("relié");
    let w = world(&d, &ch.ids[1]);
    assert!(near(w[0], (-25.0, 107.0)), "départ au bas monde : {w:?}");
    assert!(near(w[1], (-25.0, 147.0)), "sortie verticale de 40 : {w:?}");
    assert!(orthogonal(&w), "{w:?}");
}

/// Tableau 2 × 2 de 100 × 25 en (0, 0), et une ligne dont la fin est liée au milieu de son côté droit : ancre (205, 25).
fn table_with_line(d: &mut Document) -> (String, String) {
    let p = page(d);
    let t = d
        .apply(Command::AddTable {
            page: p,
            x: 0.0,
            y: 0.0,
            cols: 2,
            rows: 2,
            col_width: 100.0,
            row_height: 25.0,
            color: "#000000".into(),
            size: 16.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let line = LineInit {
        points: vec![],
        start: None,
        end: bind(&t, 1.0, 0.5),
    };
    let f = shape(d, ShapeKind::Line, [400.0, 25.0, 200.0, 25.0], line).expect("ligne");
    assert!(near(world(d, &f)[1], (205.0, 25.0)), "{:?}", world(d, &f));
    (t, f)
}

/// C1 constat 3 : colonne ajoutée à un tableau lié : l'extrémité suit (305, 25), une étape (une annulation rend tout).
/// Sous le patron fautif (géométrie changée sans `follow`), elle reste en (205, 25).
#[test]
fn table_line_inserted_moves_bound_end_in_one_step() {
    use roomboard_core::table::TableAxis;
    let mut d = Document::blank();
    let (t, f) = table_with_line(&mut d);
    d.apply(Command::InsertTableLine {
        id: t.clone(),
        axis: TableAxis::Col,
        at: 2,
    })
    .expect("colonne");
    assert!(near(world(&d, &f)[1], (305.0, 25.0)), "{:?}", world(&d, &f));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (205.0, 25.0)), "une étape");
}

/// C1 constat 3 : tailles du tableau changées : l'extrémité suit, une étape.
#[test]
fn table_sizes_change_moves_bound_end() {
    let mut d = Document::blank();
    let (t, f) = table_with_line(&mut d);
    d.apply(Command::SetTableSizes {
        id: t.clone(),
        col_width: 150.0,
        row_height: 25.0,
    })
    .expect("tailles");
    assert!(near(world(&d, &f)[1], (305.0, 25.0)), "{:?}", world(&d, &f));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (205.0, 25.0)), "une étape");
}

/// C3 : ids des colonnes (`cols`) ou des lignes (`rows`) d'un tableau, lus dans sa vue.
fn table_lines(d: &Document, t: &str, axis: &str) -> Vec<String> {
    fn find<'a>(v: &'a serde_json::Value, k: &str) -> Option<&'a serde_json::Value> {
        match v {
            serde_json::Value::Object(m) => m.get(k).or_else(|| m.values().find_map(|x| find(x, k))),
            _ => None,
        }
    }
    let v = view(d, t);
    find(&v, axis)
        .and_then(|x| x.as_array())
        .expect("lignes du tableau")
        .iter()
        .map(|l| l["id"].as_str().expect("id").to_string())
        .collect()
}

/// C3 (même classe que C1 constat 3) : colonne retirée d'un tableau lié : l'extrémité suit (105, 25), une étape.
/// Sous le patron fautif (retrait sans `follow`), elle reste en (205, 25).
#[test]
fn table_line_removed_moves_bound_end_in_one_step() {
    use roomboard_core::table::TableAxis;
    let mut d = Document::blank();
    let (t, f) = table_with_line(&mut d);
    let cols = table_lines(&d, &t, "cols");
    d.apply(Command::RemoveTableLine {
        id: t.clone(),
        axis: TableAxis::Col,
        line: cols[1].clone(),
        to: None,
    })
    .expect("retrait");
    assert!(near(world(&d, &f)[1], (105.0, 25.0)), "{:?}", world(&d, &f));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (205.0, 25.0)), "une étape");
}

/// C3 : `SetTableCell` dont la hauteur exigée agrandit la ligne : le tableau passe à 100 de haut, l'extrémité liée au
/// milieu du bord droit suit (205, 50), une étape (texte et hauteur annulés ensemble).
#[test]
fn table_cell_row_height_moves_bound_end_in_one_step() {
    let mut d = Document::blank();
    let (t, f) = table_with_line(&mut d);
    let (rows, cols) = (table_lines(&d, &t, "rows"), table_lines(&d, &t, "cols"));
    d.apply(Command::SetTableCell {
        id: t.clone(),
        row: rows[0].clone(),
        col: cols[0].clone(),
        content: "a".into(),
        row_height: Some(75.0),
        spans: None,
    })
    .expect("cellule");
    assert!(near(world(&d, &f)[1], (205.0, 50.0)), "{:?}", world(&d, &f));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (205.0, 25.0)), "une étape");
}

/// C1 constat 3 : `SetStyle` qui épaissit la cible (écart 5 + 20 / 2) : le départ lié suit, une étape. `SetStyle` sur la
/// flèche seule ne rompt pas ses liaisons (la flèche n'est pas une cible : elle n'entre pas dans `moved`).
#[test]
fn set_style_width_on_target_moves_bound_end() {
    let mut d = Document::blank();
    let (a, _b, f) = linked_arrow(&mut d);
    d.apply(Command::SetStyle {
        ids: vec![a.clone(), f.clone()],
        patch: StylePatch {
            width: Some(20.0),
            ..StylePatch::default()
        },
    })
    .expect("épaisseur");
    let w = world(&d, &f);
    assert!(near(w[0], (115.0, 25.0)), "départ suivi : {w:?}");
    let v = view(&d, &f);
    assert_eq!(v["shape"]["start"]["id"], a.as_str(), "liaison gardée");
    assert!(v["shape"].get("end").is_some(), "liaison gardée");
    assert!(d.undo());
    assert!(near(world(&d, &f)[0], (107.0, 25.0)), "une étape");
}

/// C1 constat 6 : `FormatText` qui change `boxHeight` d'un texte lié : l'extrémité suit, une étape.
#[test]
fn format_text_box_height_moves_bound_end() {
    let mut d = Document::blank();
    let p = page(&d);
    let t = d
        .apply(Command::SetText {
            page: p,
            id: None,
            x: 0.0,
            y: 0.0,
            content: "nœud".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 100.0,
            box_height: 50.0,
            spans: None,
            look: Look::default(),
        })
        .expect("texte")
        .ids[0]
        .clone();
    let line = LineInit {
        points: vec![],
        start: None,
        end: bind(&t, 0.5, 1.0),
    };
    let f = shape(&mut d, ShapeKind::Line, [50.0, 300.0, 50.0, 50.0], line).expect("ligne");
    assert!(near(world(&d, &f)[1], (50.0, 55.0)), "{:?}", world(&d, &f));
    d.apply(Command::FormatText {
        id: t.clone(),
        start: 0,
        len: 0,
        attrs: vec![],
        box_height: Some(80.0),
    })
    .expect("hauteur");
    assert!(near(world(&d, &f)[1], (50.0, 85.0)), "{:?}", world(&d, &f));
    assert!(d.undo());
    assert!(near(world(&d, &f)[1], (50.0, 55.0)), "une étape");
}

/// C1 constat 5 : la copie d'`AddLinked` ne garde ni le lien ni la graine de la source (une graine neuve, comme un
/// groupe neuf). Sous le patron fautif (copie telle quelle), `link` et `seed` sont ceux de la source.
#[test]
fn add_linked_copy_drops_link_and_draws_new_seed() {
    use roomboard_core::linear::LinkDir;
    let mut d = Document::blank();
    let a = rect(&mut d, 0.0, 0.0);
    d.apply(Command::SetStyle {
        ids: vec![a.clone()],
        patch: StylePatch {
            roughness: Some(1),
            link: Some(Some("https://example.com/".into())),
            ..StylePatch::default()
        },
    })
    .expect("lien et tracé");
    let src = view(&d, &a);
    assert!(src["look"]["seed"].is_number(), "{src}");
    assert_eq!(src["look"]["link"], "https://example.com/");
    let ch = d
        .apply(Command::AddLinked {
            id: a.clone(),
            dir: LinkDir::Right,
        })
        .expect("relié");
    let c = view(&d, &ch.ids[0]);
    assert!(c["look"].get("link").is_none(), "lien retiré : {c}");
    assert!(c["look"]["seed"].is_number(), "graine gardée présente : {c}");
    assert_ne!(c["look"]["seed"], src["look"]["seed"], "graine neuve");
    assert_eq!(c["look"]["roughness"], 1, "le reste de l'aspect copié");
}
