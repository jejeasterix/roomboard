//! Garde de compatibilité C5 (I32, S4) : `image-c2.roomboard` a été écrit une fois par le code de `main` 0dd7f1a
//! (image de C2, aucun réglage d'image). Il ne se régénère pas après C5 : `ROOMBOARD_REGENERER_FIXTURES=1` seulement
//! avec le code d'avant C5.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/image-c2.roomboard")
}

pub fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

/// Document de C2 : une image 200 × 150 placée en (100, 80), étirée deux fois en x.
fn c2_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    d.apply(Command::AddImage {
        page: p,
        asset: AssetRef {
            id: ABC.into(),
            name: "anneau.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        },
        w: 200.0,
        h: 150.0,
        matrix: [2.0, 0.0, 0.0, 1.0, 100.0, 80.0],
    })
    .expect("image");
    d
}

pub fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        std::fs::write(&path, save(&c2_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture image-c2.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c5",
    )
}

#[test]
fn image_c2_fixture_opens_raw_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let p = d.page_ids()[0].clone();
    let ids = d.element_ids(&p);
    assert_eq!(ids.len(), 1);
    let v = d.element(&ids[0]).expect("vue");
    assert_eq!(v.kind, "image");
    assert_eq!(v.transform, [2.0, 0.0, 0.0, 1.0, 100.0, 80.0]);
    let i = v.image.expect("image");
    assert_eq!((i.asset.as_str(), i.w, i.h), (ABC, 200.0, 150.0));
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C5 réenregistré à l'identique"
    );
}

/// C5 (I4, I32) : l'image d'avant C5 n'a aucun réglage ; sa boîte affichée est sa taille source.
#[test]
fn image_c2_fixture_has_no_image_params() {
    let d = load(&fixture_bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let i = d
        .element(&d.element_ids(&p)[0])
        .and_then(|v| v.image)
        .expect("image");
    assert_eq!(i.params(), roomboard_core::image::ImageParams::default());
    assert_eq!(i.display_size(), (200.0, 150.0));
}
