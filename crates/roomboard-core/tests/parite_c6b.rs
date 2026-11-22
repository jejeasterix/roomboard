//! Parité du faux cœur (OE43, reste d'OD91) : `image-c6b-brut.roomboard` porte des images aux champs bruts illisibles ou
//! neutres, écrits comme une autre version le ferait. Le contrat web (`wasm-core.contract.test.ts`, bloc « parité C6b »)
//! joue les mêmes commandes sur ce fichier et sur `image-c6b-brut.fake.json` ; ce test-ci fixe le comportement du cœur.
//! - `i1` : luminosité 500 et couleur transparente « blanc » (illisibles, cuites par un remplissage : `BAKED`).
//! - `i2` : rognage `[0, 0, 0, 5]` et `flipX: "oui"` (illisibles, géométrie gardée par un remplissage).
//! - `i3` : `sourceAsset: "illisible"` (lu absent, retiré par « Rétablir l'original », remplacé au premier remplissage).
//!
//! Toutes trois tournées d'un quart (lisible).
use std::path::PathBuf;

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::fill::FillTarget;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::ImageParamsInput;
use yrs::{Any, ArrayPrelim, Doc, In, Map, MapPrelim, ReadTxn, StateVector, Transact};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const I: [f64; 6] = [1.0, 0.0, 0.0, 1.0, 0.0, 0.0];

fn fixture() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/image-c6b-brut.roomboard")
}

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-22T00:00:00Z".into(),
        created: None,
    }
}

fn regenerate() -> bool {
    std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1")
}

fn image(id: &'static str, extra: Vec<(&'static str, In)>) -> In {
    let transform: Vec<Any> = I.into_iter().map(Any::from).collect();
    let mut fields: Vec<(&'static str, In)> = vec![
        ("id", In::from(id)),
        ("kind", In::from("image")),
        ("transform", In::Any(Any::Array(transform.into()))),
        ("asset", In::from(ABC)),
        ("w", In::from(640.0)),
        ("h", In::from(480.0)),
        ("quarterTurns", In::from(1.0)),
    ];
    fields.extend(extra);
    In::Map(MapPrelim::from_iter(fields))
}

fn brut_ybin() -> Vec<u8> {
    let doc = Doc::with_client_id(7);
    let meta = doc.get_or_insert_map("meta");
    let pages = doc.get_or_insert_array("pages");
    {
        let mut txn = doc.transact_mut();
        meta.insert(&mut txn, "schema", 1.0);
        let crop: Vec<Any> = [0.0, 0.0, 0.0, 5.0].into_iter().map(Any::from).collect();
        let elements = vec![
            image(
                "i1",
                vec![
                    ("brightness", In::from(500.0)),
                    ("transparent", In::from("blanc")),
                ],
            ),
            image(
                "i2",
                vec![
                    ("crop", In::Any(Any::Array(crop.into()))),
                    ("flipX", In::from("oui")),
                ],
            ),
            image("i3", vec![("sourceAsset", In::from("illisible"))]),
        ];
        let page = MapPrelim::from([
            ("id", In::from("p1")),
            ("width", In::from(1920.0)),
            ("height", In::from(1080.0)),
            ("background", In::from("#ffffff")),
            ("elements", In::Array(ArrayPrelim::from(elements))),
        ]);
        yrs::Array::push_back(&pages, &mut txn, page);
    }
    let txn = doc.transact();
    txn.encode_state_as_update_v1(&StateVector::default())
}

fn bytes() -> Vec<u8> {
    let path = fixture();
    if regenerate() {
        let doc = Document::from_update_v1(&brut_ybin()).expect("état");
        std::fs::write(&path, save(&doc, &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture image-c6b-brut.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test parite_c6b -- --test-threads=1",
    )
}

fn same(q: u8) -> ImageParamsInput {
    ImageParamsInput {
        quarter_turns: f64::from(q),
        ..Default::default()
    }
}

fn params(d: &mut Document, id: &str, restore: bool) -> bool {
    let v = d.version();
    d.apply(Command::SetImageParams {
        id: id.into(),
        params: same(1),
        matrix: I,
        restore,
    })
    .expect("réglages");
    d.version() != v
}

fn fill(d: &mut Document, id: &str) {
    d.apply(Command::Fill {
        page: "p1".into(),
        target: FillTarget::Image {
            id: id.into(),
            asset: AssetRef {
                id: "cd".repeat(32),
                name: "photo.png".into(),
                mime: "image/png".into(),
                size: 9.0,
            },
        },
        color: None,
    })
    .expect("remplissage");
}

#[test]
fn raw_fields_read_absent_and_survive_save() {
    let d = load(&bytes()).expect("ouverture");
    for id in ["i1", "i2", "i3"] {
        let im = d.element(id).and_then(|e| e.image).expect("image");
        assert_eq!(
            (im.crop, im.flip_x, im.quarter_turns, im.brightness, im.transparent, im.source_asset),
            (None, false, 1, 0, None, None),
            "{id}"
        );
    }
    let again = load(&save(&d, &meta()).expect("save")).expect("relu");
    for id in ["i1", "i2", "i3"] {
        assert_eq!(again.element(id), d.element(id), "{id} relu");
    }
}

#[test]
fn fill_removes_baked_raw_fields_and_keeps_raw_geometry() {
    let mut d = load(&bytes()).expect("ouverture");
    fill(&mut d, "i1");
    fill(&mut d, "i2");
    assert!(!params(&mut d, "i1", false), "i1 : pixels bruts retirés par le remplissage");
    assert!(params(&mut d, "i2", false), "i2 : géométrie brute gardée, retirée par les réglages");
    assert!(!params(&mut d, "i2", false));
}

#[test]
fn restore_removes_unreadable_source_asset_in_one_step() {
    let mut d = load(&bytes()).expect("ouverture");
    assert!(params(&mut d, "i3", true), "une étape");
    assert!(!params(&mut d, "i3", true), "plus rien à retirer");
    let im = d.element("i3").and_then(|e| e.image).expect("image");
    assert_eq!(im.asset, ABC);
}
