//! Fixture `tableau-4x3.roomboard` (C10a) : un 4 × 3 rempli et une cellule jaune, écrit par `format::save` après un
//! rechargement (aucun historique), pour C10b et les versions suivantes. Régénérée par
//! `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau -- --test-threads=1`.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const TEXTS: [&str; 12] = [
    "Lundi",
    "Mardi",
    "Mercredi",
    "Jeudi",
    "Maths",
    "Français",
    "Histoire",
    "Sport",
    "Anglais",
    "Musique",
    "Dessin",
    "Sciences",
];

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/tableau-4x3.roomboard")
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

fn build() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page: p,
            x: 100.0,
            y: 100.0,
            cols: 4,
            rows: 3,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    for (i, text) in TEXTS.iter().enumerate() {
        d.apply(Command::SetTableCell {
            id: id.clone(),
            row: t.rows[i / 4].id.clone(),
            col: t.cols[i % 4].id.clone(),
            content: (*text).into(),
            row_height: None,
        })
        .expect("cellule");
    }
    d.apply(Command::SetTableFill {
        id,
        row: t.rows[0].id.clone(),
        col: t.cols[0].id.clone(),
        to: None,
        fill: Some("#fef08a".into()),
    })
    .expect("jaune");
    d
}

fn bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        let once = load(&save(&build(), &meta()).expect("save")).expect("load");
        std::fs::write(&path, save(&once, &meta()).expect("resave")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture tableau-4x3.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau -- --test-threads=1",
    )
}

#[test]
fn table_fixture_resaves_identically() {
    let b = bytes();
    let d = load(&b).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == b);
}

#[test]
fn table_fixture_reads_as_a_filled_4x3() {
    let d = load(&bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let id = d
        .element_ids(&p)
        .into_iter()
        .find(|e| d.element(e).is_some_and(|v| v.kind == "table"))
        .expect("un tableau");
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    assert_eq!((t.cols.len(), t.rows.len()), (4, 3));
    assert_eq!(
        t.cells.iter().map(|c| c.text.as_str()).collect::<Vec<_>>(),
        TEXTS.to_vec()
    );
    assert_eq!(t.cells[0].fill.as_deref(), Some("#fef08a"));
}
