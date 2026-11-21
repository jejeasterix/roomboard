//! Garde de compatibilité C16 (O18, S5) : `pdf-c12.roomboard` a été écrit une fois par le code de `main` 41342b0
//! (document d'un PDF importé par C12, aucune clé `original`). Il ne se régénère pas après C16 :
//! `ROOMBOARD_REGENERER_FIXTURES=1` seulement avec le code d'avant C16.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const PDF: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/pdf-c12.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn pdf_asset() -> AssetRef {
    AssetRef {
        id: PDF.into(),
        name: "cours.pdf".into(),
        mime: "application/pdf".into(),
        size: 1234.0,
    }
}

/// Document de C12 : deux pages (portrait puis paysage), fonds `pdf-page`.
fn c12_document() -> Document {
    Document::from_pdf_pages(&pdf_asset(), &[(612.0, 792.0), (792.0, 612.0)]).expect("pdf")
}

fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        std::fs::write(&path, save(&c12_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture pdf-c12.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c12 (code d'avant C16 seulement)",
    )
}

/// S5, O18 : le document PDF d'avant C16 s'ouvre (2 fonds `pdf-page`, l'asset cité) et se réenregistre à l'identique.
#[test]
fn pdf_c12_fixture_opens_without_original_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let kinds: Vec<Option<(String, Option<u32>)>> = d
        .page_ids()
        .iter()
        .map(|id| d.page(id).and_then(|p| p.backdrop).map(|b| (b.kind, b.page)))
        .collect();
    assert_eq!(
        kinds,
        vec![
            Some(("pdf-page".to_string(), Some(0))),
            Some(("pdf-page".to_string(), Some(1)))
        ]
    );
    assert_eq!(d.cited_assets(), vec![pdf_asset()]);
    assert!(
        d.page_ids()
            .iter()
            .all(|id| d.page(id).and_then(|p| p.backdrop).is_some_and(|b| b.original.is_none())),
        "aucun fond d'avant C16 n'a d'original"
    );
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C16 réenregistré à l'identique"
    );
}
