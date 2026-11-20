//! Fixture `tableau-fusion-ombrage.roomboard` (C10b, F30) : un 4 × 3, « Lundi » fusionné sur deux colonnes, la
//! troisième colonne ombrée, écrit par `format::save` après un rechargement (aucun historique). Régénérée par
//! `ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau_fusion -- --test-threads=1`.
use std::path::PathBuf;

use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/tableau-fusion-ombrage.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
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
    let (r, c) = (
        t.rows.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
        t.cols.iter().map(|x| x.id.clone()).collect::<Vec<_>>(),
    );
    d.apply(Command::SetTableCell {
        id: id.clone(),
        row: r[0].clone(),
        col: c[0].clone(),
        content: "Lundi".into(),
        row_height: None,
    })
    .expect("texte");
    d.apply(Command::MergeTableCells {
        id: id.clone(),
        from: (r[0].clone(), c[0].clone()),
        to: (r[0].clone(), c[1].clone()),
    })
    .expect("fusion");
    d.apply(Command::SetTableShade {
        id,
        from: (r[0].clone(), c[2].clone()),
        to: (r[2].clone(), c[2].clone()),
        shade: Some("#94a3b8".into()),
    })
    .expect("ombre");
    d
}

fn bytes() -> Vec<u8> {
    let path = fixture();
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        let once = load(&save(&build(), &meta()).expect("save")).expect("load");
        std::fs::write(&path, save(&once, &meta()).expect("resave")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture tableau-fusion-ombrage.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test tableau_fusion -- --test-threads=1",
    )
}

#[test]
fn fusion_fixture_resaves_identically() {
    let b = bytes();
    let d = load(&b).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == b);
}

#[test]
fn fusion_fixture_reads_one_merge_and_three_shades() {
    let d = load(&bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let id = d
        .element_ids(&p)
        .into_iter()
        .find(|e| d.element(e).is_some_and(|v| v.kind == "table"))
        .expect("un tableau");
    let t = d.element(&id).and_then(|v| v.table).expect("vue");
    assert_eq!((t.cols.len(), t.rows.len(), t.merges.len()), (4, 3, 1));
    assert_eq!((t.merges[0].rows, t.merges[0].cols), (1, 2));
    assert_eq!(t.cells.iter().filter(|c| c.shade.is_some()).count(), 3);
    assert_eq!(t.cells[0].text, "Lundi");
}
