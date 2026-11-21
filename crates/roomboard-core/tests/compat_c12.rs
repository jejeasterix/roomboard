//! Garde de compatibilité C16 (O18, S5) : `pdf-c12.roomboard` a été écrit une fois par le code de `main` 41342b0
//! (document d'un PDF importé par C12, aucune clé `original`). Il ne se régénère jamais avec le code C16.
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

/// Octets de la fixture : le document de C12, deux pages (portrait puis paysage), fonds `pdf-page`.
fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    std::fs::read(&path)
        .expect("fixture pdf-c12.roomboard absente (écrite une fois par le code d'avant C16)")
}

/// S5, O18 : le document PDF d'avant C16 s'ouvre (2 fonds `pdf-page`, l'asset cité) et se réenregistre à l'identique.
#[test]
fn pdf_c12_fixture_opens_without_original_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let kinds: Vec<Option<(String, Option<u32>)>> = d
        .page_ids()
        .iter()
        .map(|id| {
            d.page(id)
                .and_then(|p| p.backdrop)
                .map(|b| (b.kind, b.page))
        })
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
        d.page_ids().iter().all(|id| d
            .page(id)
            .and_then(|p| p.backdrop)
            .is_some_and(|b| b.original.is_none())),
        "aucun fond d'avant C16 n'a d'original"
    );
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C16 réenregistré à l'identique"
    );
}

/// HO2-10 : un document AVEC original (C16) recharge sans perte, octet pour octet.
#[test]
fn reloading_a_document_with_original_keeps_the_bytes() {
    let docx = AssetRef {
        id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".into(),
        name: "cours.docx".into(),
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document".into(),
        size: 4321.0,
    };
    let d = Document::from_pdf_pages(&pdf_asset(), &[(612.0, 792.0), (792.0, 612.0)], Some(&docx))
        .expect("pdf converti");
    let first = save(&d, &meta()).expect("save");
    let back = load(&first).expect("load");
    assert_eq!(back.cited_assets(), vec![pdf_asset(), docx]);
    assert!(
        save(&back, &meta()).expect("resave") == first,
        "recharger garde les octets"
    );
}
