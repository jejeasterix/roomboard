//! Garde de compatibilité C6b (B23, S4) : `image-c5.roomboard` a été écrit une fois par le code de `main` 458a90d
//! (image retouchée par C5 : rognage, luminosité, couleur transparente ; aucun `sourceAsset`). Il ne se régénère pas
//! après C6b : `ROOMBOARD_REGENERER_FIXTURES=1` seulement avec le code d'avant C6b.
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::{ImageParamsInput, TransparentInput};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const M: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 100.0, 80.0];

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/image-c5.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

/// Document de C5 : image 200 × 150 en (100, 80), rognée [10, 20, 160, 120], luminosité 20, blanc transparent
/// (tolérance 10, contigu). Même matrice à l'ajout et aux réglages : aucun champ `transform` remplacé.
fn c5_document() -> Document {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddImage {
            page: p,
            asset: AssetRef {
                id: ABC.into(),
                name: "anneau.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 150.0,
            matrix: M,
        })
        .expect("image")
        .ids[0]
        .clone();
    d.apply(Command::SetImageParams {
        id,
        params: ImageParamsInput {
            crop: Some([10.0, 20.0, 160.0, 120.0]),
            brightness: 20.0,
            transparent: Some(TransparentInput {
                color: "#ffffff".into(),
                tolerance: 10.0,
                soft: 0.0,
                contiguous: true,
            }),
            ..ImageParamsInput::default()
        },
        matrix: M,
        restore: false,
    })
    .expect("réglages");
    d
}

fn fixture_bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        std::fs::write(&path, save(&c5_document(), &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture image-c5.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test compat_c6b (code d'avant C6b seulement)",
    )
}

/// S4 : le fichier d'avant C6b s'ouvre retouché et se réenregistre aux mêmes octets.
#[test]
fn image_c5_fixture_opens_retouched_and_resaves_identically() {
    let bytes = fixture_bytes();
    let d = load(&bytes).expect("load");
    let p = d.page_ids()[0].clone();
    let ids = d.element_ids(&p);
    assert_eq!(ids.len(), 1);
    let i = d.element(&ids[0]).and_then(|v| v.image).expect("image");
    assert_eq!(
        (i.asset.as_str(), i.crop, i.brightness),
        (ABC, Some([10, 20, 160, 120]), 20)
    );
    assert_eq!(
        i.transparent.map(|t| (t.color, t.tolerance, t.contiguous)),
        Some(("#ffffff".to_string(), 10, true))
    );
    assert!(
        save(&d, &meta()).expect("resave") == bytes,
        "fichier d'avant C6b réenregistré à l'identique"
    );
}

/// S4 : l'image d'avant C6b n'a pas de `sourceAsset`.
#[test]
fn image_c5_fixture_has_no_source_asset() {
    let d = load(&fixture_bytes()).expect("load");
    let p = d.page_ids()[0].clone();
    let i = d
        .element(&d.element_ids(&p)[0])
        .and_then(|v| v.image)
        .expect("image");
    assert_eq!(i.source_asset, None);
}
