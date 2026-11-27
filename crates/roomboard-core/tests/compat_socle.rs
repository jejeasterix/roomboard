//! Garde de compatibilité (K10, K15, S5) : `socle-v1.roomboard` est écrit une fois par le code de `main` (d71eda3).
//! La régénérer exige `ROOMBOARD_REGENERER_FIXTURES=1` ; T7 fige son SHA-256 : un octet changé fait échouer ce test-là.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::element::StrokeStyle;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::rich_text::{SpanAttrs, TextSpanView};
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

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

fn pen() -> StrokeStyle {
    StrokeStyle {
        color: "#1e40af".into(),
        width: 4.0,
    }
}

fn hline(y: f32) -> Vec<f32> {
    (0..=20)
        .flat_map(|i| [100.0 + i as f32 * 10.0, y, 0.5])
        .collect()
}

/// Document du socle : page 1 = trait, rectangle rempli, texte ; page 2 = trait.
fn socle_document() -> Document {
    let mut d = Document::blank();
    let p1 = d.page_ids()[0].clone();
    d.apply(Command::CommitStroke {
        page: p1.clone(),
        points: hline(100.0),
        style: pen(),
    })
    .expect("trait");
    d.apply(Command::AddShape {
        page: p1.clone(),
        shape: ShapeKind::Rect,
        x0: 100.0,
        y0: 200.0,
        x1: 400.0,
        y1: 350.0,
        style: pen(),
        fill: Some("#fde68a".into()),
    })
    .expect("forme");
    d.apply(Command::SetText {
        page: p1.clone(),
        id: None,
        x: 500.0,
        y: 500.0,
        content: "Bonjour RoomBoard".into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans: None,
    })
    .expect("texte");
    let p2 = d
        .apply(Command::add_page(Some(p1.clone())))
        .expect("page")
        .pages[0]
        .clone();
    d.apply(Command::CommitStroke {
        page: p2,
        points: hline(300.0),
        style: pen(),
    })
    .expect("trait 2");
    d
}

fn socle_bytes() -> Vec<u8> {
    let path = fixture("socle-v1.roomboard");
    if regenerate() {
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("création du dossier");
        std::fs::write(&path, save(&socle_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture socle-v1.roomboard absente : la régénérer avec ROOMBOARD_REGENERER_FIXTURES=1 sur le code de main",
    )
}

#[test]
fn socle_fixture_resaves_identically() {
    let bytes = socle_bytes();
    let doc = load(&bytes).expect("load");
    assert!(
        save(&doc, &meta()).expect("resave") == bytes,
        "réenregistrer le fichier du socle change ses octets"
    );
}

#[test]
fn socle_fixture_has_two_pages_and_three_kinds() {
    let doc = load(&socle_bytes()).expect("load");
    let pages = doc.page_ids();
    assert_eq!(pages.len(), 2);
    let kinds = |p: &str| -> Vec<String> {
        doc.element_ids(p)
            .iter()
            .map(|id| doc.element(id).expect("vue").kind)
            .collect()
    };
    assert_eq!(kinds(&pages[0]), vec!["stroke", "shape", "text"]);
    assert_eq!(kinds(&pages[1]), vec!["stroke"]);
}

/// S3 (C7, T12) : le texte du socle (troisième élément de la première page) est un seul segment sans attribut.
#[test]
fn socle_fixture_text_is_one_plain_span() {
    let doc = load(&socle_bytes()).expect("load");
    let p = doc.page_ids()[0].clone();
    let id = doc.element_ids(&p)[2].clone();
    let t = doc
        .element(&id)
        .and_then(|e| e.text)
        .expect("texte du socle");
    assert_eq!(
        t.spans,
        vec![TextSpanView {
            text: "Bonjour RoomBoard".into(),
            attrs: SpanAttrs::default()
        }]
    );
}

/// C9, S2 : le fichier du socle, écrit avant la grille, s'ouvre sans grille sur ses deux pages.
#[test]
fn socle_fixture_has_no_grid() {
    let doc = load(&socle_bytes()).expect("load");
    let pages = doc.page_ids();
    assert_eq!(pages.len(), 2);
    for p in pages {
        assert_eq!(doc.page(&p).expect("page").grid, None, "page {p}");
    }
}
