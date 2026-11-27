//! Garde de compatibilité C3 (Z14) : `socle-v1.roomboard` relu puis réécrit aux mêmes octets par le code de C3 ;
//! `fragment-v1.rbitem` (trait, forme, texte riche, tableau, groupe imbriqué) écrit une fois, puis relu et réécrit à
//! l'identique. Régénérer : `ROOMBOARD_REGENERER_FIXTURES=1` (jamais pour le socle).
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::element::{Look, StrokeStyle};
use roomboard_core::format::{load, load_fragment, save, save_fragment, SaveMeta, KIND_FRAGMENT};
use roomboard_core::rich_text::TextAttr;
use roomboard_core::shape::ShapeKind;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures")
        .join(name)
}
fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}
fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#1e40af".into(),
        width: 4.0,
    }
}

fn fragment_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let points: Vec<f32> = (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, 100.0, 0.5])
        .collect();
    let s = d
        .apply(Command::CommitStroke {
            page: p.clone(),
            points,
            style: pen(),
            look: Look::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    let r = d
        .apply(Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Rect,
            x0: 100.0,
            y0: 200.0,
            x1: 300.0,
            y1: 300.0,
            style: pen(),
            fill: None,
            look: Look::default(),
            line: roomboard_core::linear::LineInit::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    let t = d
        .apply(Command::SetText {
            page: p.clone(),
            id: None,
            x: 100.0,
            y: 400.0,
            content: "Bonjour".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 400.0,
            box_height: 45.0,
            spans: None,
            look: Look::default(),
        })
        .unwrap()
        .ids[0]
        .clone();
    d.apply(Command::FormatText {
        id: t.clone(),
        start: 0,
        len: 3,
        attrs: vec![TextAttr::Bold(true)],
        box_height: None,
    })
    .unwrap();
    let tb = d
        .apply(Command::AddTable {
            page: p.clone(),
            x: 500.0,
            y: 100.0,
            cols: 2,
            rows: 2,
            col_width: 100.0,
            row_height: 40.0,
            color: "#000000".into(),
            size: 24.0,
        })
        .unwrap()
        .ids[0]
        .clone();
    d.apply(Command::Group {
        ids: vec![s.clone(), r.clone()],
    })
    .unwrap();
    d.apply(Command::Group {
        ids: vec![s.clone(), r.clone(), t.clone()],
    })
    .unwrap();
    d.extract(&p, &[s, r, t, tb]).expect("extract")
}

fn fragment_bytes() -> Vec<u8> {
    let path = fixture("fragment-v1.rbitem");
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        std::fs::write(
            &path,
            save_fragment(&fragment_document(), &meta(), "Fixture C3").expect("save"),
        )
        .expect("écriture");
    }
    std::fs::read(&path)
        .expect("fixture fragment-v1.rbitem absente : la créer avec ROOMBOARD_REGENERER_FIXTURES=1")
}

#[test]
fn c3_socle_fixture_resaves_identically() {
    let bytes = std::fs::read(fixture("socle-v1.roomboard")).expect("socle");
    let doc = load(&bytes).expect("load");
    assert!(
        save(&doc, &meta()).expect("resave") == bytes,
        "C3 change les octets du socle"
    );
}

#[test]
fn c3_fragment_fixture_reads_groups_and_kinds() {
    let (f, m) = load_fragment(&fragment_bytes()).expect("lecture");
    assert_eq!(m.kind.as_deref(), Some(KIND_FRAGMENT));
    assert_eq!(m.name.as_deref(), Some("Fixture C3"));
    let ids = f.element_ids(&f.page_ids()[0]);
    let kinds: Vec<String> = ids.iter().map(|id| f.element(id).unwrap().kind).collect();
    assert_eq!(kinds, vec!["stroke", "shape", "text", "table"]);
    let g: Vec<Option<usize>> = ids
        .iter()
        .map(|id| f.element(id).unwrap().group.map(|g| g.len()))
        .collect();
    assert_eq!(g, vec![Some(2), Some(2), Some(1), None]);
    assert!(
        load(&fragment_bytes()).is_err(),
        "un fragment ne s'ouvre pas comme document"
    );
}

#[test]
fn c3_fragment_fixture_resaves_identically() {
    let bytes = fragment_bytes();
    let (f, m) = load_fragment(&bytes).expect("lecture");
    let meta = SaveMeta {
        created: Some(m.created.clone()),
        ..meta()
    };
    assert!(save_fragment(&f, &meta, m.name.as_deref().unwrap_or("")).expect("resave") == bytes);
}
