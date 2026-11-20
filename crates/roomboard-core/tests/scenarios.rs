//! Scénarios S2, S3 et S4 du cadrage, au niveau du cœur (sans interface).
use roomboard_core::commands::{Command, CommandError, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::query::Bounds;
use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextAttr};
use roomboard_core::shape::ShapeKind;

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#1e40af".into(),
        width: 4.0,
    }
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-16T14:00:00Z".into(),
        created: None,
    }
}

fn hline(y: f32) -> Vec<f32> {
    (0..=40)
        .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.3 + i as f32 / 100.0])
        .collect()
}

fn commit(d: &mut Document, page: &str, pts: Vec<f32>) -> String {
    d.apply(Command::CommitStroke {
        page: page.into(),
        points: pts,
        style: pen(),
    })
    .expect("commit")
    .ids[0]
        .clone()
}

#[test]
fn s2_three_strokes_erase_undo_redo_save_load() {
    let mut d = Document::blank();
    assert!(!d.undo(), "Ctrl+Z sur un document neuf ne fait rien");
    assert_eq!(d.page_count(), 1);
    let p = d.page_ids()[0].clone();
    for y in [100.0, 200.0, 300.0] {
        commit(&mut d, &p, hline(y));
    }
    let erase = Command::Erase {
        page: p.clone(),
        path: vec![300.0, 150.0, 300.0, 250.0],
        radius: 10.0,
        mode: EraseMode::Partial,
    };
    d.apply(erase).expect("gomme");
    assert_eq!(d.element_ids(&p).len(), 4);
    assert!(d.undo());
    assert_eq!(d.element_ids(&p).len(), 3);
    assert!(d.redo());
    assert_eq!(d.element_ids(&p).len(), 4);

    let bytes = save(&d, &meta()).expect("save");
    let e = load(&bytes).expect("load");
    assert_eq!(e.page_ids(), vec![p.clone()]);
    assert_eq!(e.element_ids(&p), d.element_ids(&p));
    for id in d.element_ids(&p) {
        assert_eq!(e.element(&id), d.element(&id), "élément {id}");
        assert_eq!(e.stroke_points(&id), d.stroke_points(&id), "points {id}");
    }
    assert!(!e.can_undo());
}

#[test]
fn s3_pages_save_load_remove_undo() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d
        .apply(Command::AddPage {
            after: Some(p1.clone()),
        })
        .expect("p2")
        .pages[0]
        .clone();
    let p3 = d
        .apply(Command::AddPage {
            after: Some(p2.clone()),
        })
        .expect("p3")
        .pages[0]
        .clone();
    let s = commit(&mut d, &p2, hline(500.0));

    let mut e = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(e.page_ids(), vec![p1.clone(), p2.clone(), p3.clone()]);
    assert!(e.element_ids(&p1).is_empty() && e.element_ids(&p3).is_empty());
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);

    e.apply(Command::RemovePage { page: p2.clone() })
        .expect("suppression");
    assert_eq!(e.page_ids(), vec![p1.clone(), p3.clone()]);
    assert!(e.undo());
    assert_eq!(e.page_ids(), vec![p1, p2.clone(), p3]);
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);
    assert_eq!(e.stroke_points(&s), d.stroke_points(&s));
}

#[test]
fn s3_last_page_cannot_be_removed() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d.apply(Command::AddPage { after: None }).expect("p2").pages[0].clone();
    d.apply(Command::RemovePage { page: p1 })
        .expect("première suppression");
    assert_eq!(
        d.apply(Command::RemovePage { page: p2 }),
        Err(CommandError::LastPage)
    );
    assert_eq!(d.page_count(), 1);
}

#[test]
fn s3_text_stroke_shape_survive_save_load() {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    let p2 = d
        .apply(Command::AddPage {
            after: Some(p1.clone()),
        })
        .expect("p2")
        .pages[0]
        .clone();
    let p3 = d
        .apply(Command::AddPage {
            after: Some(p2.clone()),
        })
        .expect("p3")
        .pages[0]
        .clone();
    let t = d
        .apply(Command::SetText {
            page: p1.clone(),
            id: None,
            x: 200.0,
            y: 300.0,
            content: "Bonjour".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
        })
        .expect("texte")
        .ids[0]
        .clone();
    let s = commit(&mut d, &p2, hline(500.0));
    let r = d
        .apply(Command::AddShape {
            page: p3.clone(),
            shape: ShapeKind::Rect,
            x0: 100.0,
            y0: 100.0,
            x1: 400.0,
            y1: 300.0,
            style: pen(),
            fill: None,
        })
        .expect("rect")
        .ids[0]
        .clone();

    let mut e = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(e.page_ids(), vec![p1.clone(), p2.clone(), p3.clone()]);
    assert_eq!(e.element_ids(&p1), vec![t.clone()]);
    assert_eq!(e.element_ids(&p2), vec![s.clone()]);
    assert_eq!(e.element_ids(&p3), vec![r.clone()]);
    for id in [&t, &s, &r] {
        assert_eq!(e.element(id), d.element(id), "élément {id}");
    }
    assert_eq!(
        e.element(&t).and_then(|v| v.text).map(|x| x.content),
        Some("Bonjour".to_string())
    );
    e.apply(Command::RemovePage { page: p2.clone() })
        .expect("retrait");
    assert!(e.undo());
    assert_eq!(e.element_ids(&p2), vec![s]);
}

#[test]
fn s4_transform_two_elements_then_undo_twice() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    commit(&mut d, &p, hline(100.0));
    d.apply(Command::AddShape {
        page: p.clone(),
        shape: ShapeKind::Rect,
        x0: 600.0,
        y0: 600.0,
        x1: 800.0,
        y1: 700.0,
        style: pen(),
        fill: None,
    })
    .expect("rect");
    let ids = d.ids_in_rect(
        &p,
        Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 1000.0,
            y1: 1000.0,
        },
    );
    assert_eq!(ids.len(), 2);
    let start = d.bounds(&ids).expect("bornes");
    d.apply(Command::Transform {
        ids: ids.clone(),
        matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 0.0],
    })
    .expect("déplacer");
    let moved = d.bounds(&ids).expect("bornes");
    assert!((moved.x0 - start.x0 - 100.0).abs() < 1e-6);
    d.apply(Command::Transform {
        ids: ids.clone(),
        matrix: [2.0, 0.0, 0.0, 2.0, -moved.x0, -moved.y0],
    })
    .expect("agrandir");
    let big = d.bounds(&ids).expect("bornes");
    assert!(((big.x1 - big.x0) - 2.0 * (moved.x1 - moved.x0)).abs() < 1e-6);
    assert!(d.undo());
    assert!(d.undo());
    assert_eq!(
        d.bounds(&ids),
        Some(start),
        "deux annulations : état de départ (une étape par geste)"
    );
}

/// S2 (C7) : six plages (gras, italique, souligné, couleur, taille 72, police « Georgia ») ; enregistrer, recharger :
/// mêmes segments, même contenu ; réenregistrer : mêmes octets.
#[test]
fn s2_rich_text_survives_save_load() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let t = d
        .apply(Command::SetText {
            page: p,
            id: None,
            x: 100.0,
            y: 100.0,
            content: "aa bb cc dd ee ff".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 90.0,
        })
        .expect("texte")
        .ids[0]
        .clone();
    let patches = [
        TextAttr::Bold(true),
        TextAttr::Italic(true),
        TextAttr::Underline(true),
        TextAttr::Color(Some("#ff0000".into())),
        TextAttr::Size(Some(72.0)),
        TextAttr::Font(Some("Georgia".into())),
    ];
    for (i, a) in patches.into_iter().enumerate() {
        d.apply(Command::FormatText {
            id: t.clone(),
            start: 3 * i as u32,
            len: 2,
            attrs: vec![a],
            box_height: None,
        })
        .expect("format");
    }
    let before = d.element(&t).and_then(|e| e.text).expect("vue");
    assert_eq!(before.spans.len(), 11);
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    let after = r.element(&t).and_then(|e| e.text).expect("vue rechargée");
    assert_eq!(after.spans, before.spans);
    assert_eq!(after.content, "aa bb cc dd ee ff");
    assert!(
        save(&r, &meta()).expect("resave") == file,
        "réenregistrer change les octets"
    );
}

/// C7b (S1, S5) : un texte mis en forme par `SetText` avec segments survit à l'aller-retour `.roomboard`.
#[test]
fn rich_text_set_text_round_trips() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let red_bold = SpanAttrs {
        bold: true,
        color: Some("#dc2626".into()),
        ..SpanAttrs::default()
    };
    let spans = vec![
        SpanInput {
            text: "Le ".into(),
            attrs: SpanAttrs::default(),
        },
        SpanInput {
            text: "chat".into(),
            attrs: red_bold.clone(),
        },
        SpanInput {
            text: " noir".into(),
            attrs: SpanAttrs::default(),
        },
    ];
    let id = d
        .apply(Command::SetText {
            page,
            id: None,
            x: 100.0,
            y: 200.0,
            content: "Le chat noir".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
            spans: Some(spans),
        })
        .expect("texte")
        .ids[0]
        .clone();
    let meta = SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    };
    let back = load(&save(&d, &meta).expect("save")).expect("load");
    let got = back.element(&id).and_then(|e| e.text).expect("texte").spans;
    assert_eq!(
        got.iter().map(|s| s.text.as_str()).collect::<Vec<_>>(),
        vec!["Le ", "chat", " noir"]
    );
    assert_eq!(got[1].attrs, red_bold);
}
