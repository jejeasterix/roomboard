//! S4 au niveau du cœur (U3, K8, K15) : un élément d'un `kind` inconnu est lu sans erreur, gardé, déplaçable,
//! supprimable, jamais gommé ; la fixture est écrite par `format::save` (sans entrée `assets/`).
use std::path::PathBuf;

use roomboard_core::commands::{Command, EraseMode};
use roomboard_core::document::Document;
use roomboard_core::element::IDENTITY;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::query::Bounds;
use yrs::updates::decoder::Decode;
use yrs::{
    Any, Array, ArrayPrelim, Doc, In, Map, MapPrelim, Out, ReadTxn, StateVector, Transact, Update,
};

pub const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

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

/// État Yrs d'un fichier « d'une version plus récente » : `h1` porte des `Y.Map`, `Y.Array` imbriqués et un id d'asset
/// rangé dans un `Any::Array` ; `h2` n'a ni `transform` ni boîte.
fn hologram_ybin() -> Vec<u8> {
    let doc = Doc::with_client_id(7);
    let meta = doc.get_or_insert_map("meta");
    let pages = doc.get_or_insert_array("pages");
    {
        let mut txn = doc.transact_mut();
        meta.insert(&mut txn, "schema", 1.0);
        let layers = MapPrelim::from([(
            "a",
            In::Array(ArrayPrelim::from(vec![In::from(1.0), In::from(2.0)])),
        )]);
        let transform: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]
            .into_iter()
            .map(Any::from)
            .collect();
        let h1 = MapPrelim::from([
            ("id", In::from("h1")),
            ("kind", In::from("hologram")),
            ("transform", In::Any(Any::Array(transform.into()))),
            ("w", In::from(300.0)),
            ("h", In::from(200.0)),
            ("layers", In::Map(layers)),
            ("refs", In::Any(Any::Array(vec![Any::from(ABC)].into()))),
        ]);
        let h2 = MapPrelim::from([("id", In::from("h2")), ("kind", In::from("hologram"))]);
        let page = MapPrelim::from([
            ("id", In::from("p1")),
            ("width", In::from(1920.0)),
            ("height", In::from(1080.0)),
            ("background", In::from("#ffffff")),
            (
                "elements",
                In::Array(ArrayPrelim::from(vec![In::Map(h1), In::Map(h2)])),
            ),
        ]);
        pages.push_back(&mut txn, page);
    }
    let txn = doc.transact();
    txn.encode_state_as_update_v1(&StateVector::default())
}

pub fn unknown_bytes() -> Vec<u8> {
    let path = fixture("element-inconnu.roomboard");
    if regenerate() {
        let doc = Document::from_update_v1(&hologram_ybin()).expect("état");
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("dossier");
        std::fs::write(&path, save(&doc, &meta()).expect("save")).expect("écriture");
    }
    std::fs::read(&path).expect(
        "fixture element-inconnu.roomboard absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-core --test element_inconnu -- --test-threads=1",
    )
}

/// Champs bruts de `h1` relus dans un `Doc` yrs neuf : `w`, longueur de `layers.a`, contenu de `refs`.
fn raw_h1(d: &Document) -> (Option<f64>, Option<u32>, Option<Vec<String>>) {
    let raw = Doc::new();
    let pages = raw.get_or_insert_array("pages");
    raw.transact_mut()
        .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
        .expect("application");
    let txn = raw.transact();
    let Some(Out::YMap(page)) = pages.get(&txn, 0) else {
        panic!("page")
    };
    let Some(Out::YArray(els)) = page.get(&txn, "elements") else {
        panic!("éléments")
    };
    let Some(Out::YMap(h1)) = els.get(&txn, 0) else {
        panic!("h1")
    };
    let w = match h1.get(&txn, "w") {
        Some(Out::Any(Any::Number(n))) => n.as_f64(),
        _ => None,
    };
    let a = match h1.get(&txn, "layers") {
        Some(Out::YMap(l)) => match l.get(&txn, "a") {
            Some(Out::YArray(a)) => Some(a.len(&txn)),
            _ => None,
        },
        _ => None,
    };
    let refs = match h1.get(&txn, "refs") {
        Some(Out::Any(Any::Array(items))) => Some(
            items
                .iter()
                .map(|i| match i {
                    Any::String(s) => s.to_string(),
                    other => format!("{other:?}"),
                })
                .collect(),
        ),
        _ => None,
    };
    (w, a, refs)
}

#[test]
fn unknown_fixture_resaves_identically() {
    let bytes = unknown_bytes();
    let d = load(&bytes).expect("lecture sans erreur");
    assert!(save(&d, &meta()).expect("resave") == bytes);
}

#[test]
fn unknown_kind_view_has_box_and_no_style() {
    let d = load(&unknown_bytes()).expect("load");
    let before = d.encode_v1();
    let v = d.element("h1").expect("vue de h1");
    assert_eq!(v.kind, "unknown");
    assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
    assert_eq!(v.style, None);
    let u = v.unknown.expect("unknown");
    assert_eq!(
        (u.source_kind.as_str(), u.w, u.h),
        ("hologram", 300.0, 200.0)
    );
    assert!(
        d.encode_v1() == before,
        "la lecture a écrit dans le document"
    );
    assert!(!d.can_undo());
}

#[test]
fn unknown_without_transform_is_identity_selectable_deletable() {
    let mut d = load(&unknown_bytes()).expect("load");
    let before = d.encode_v1();
    let v = d.element("h2").expect("vue de h2");
    assert_eq!(v.transform, IDENTITY);
    let u = v.unknown.expect("unknown");
    assert_eq!((u.w, u.h), (100.0, 100.0));
    assert_eq!(d.hit_test("p1", 50.0, 50.0, 0.0), Some("h2".to_string()));
    assert_eq!(
        d.bounds(&["h2".to_string()]),
        Some(Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 100.0
        })
    );
    assert!(
        d.encode_v1() == before,
        "la lecture a écrit dans le document"
    );
    let v0 = d.version();
    let c = d
        .apply(Command::Transform {
            ids: vec!["h2".into()],
            matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
        })
        .expect("transform");
    assert_eq!(
        c.version, v0,
        "Transform doit ignorer un élément sans transform lisible"
    );
    let e = d
        .apply(Command::Erase {
            page: "p1".into(),
            path: vec![0.0, 50.0, 100.0, 50.0],
            radius: 10.0,
            mode: EraseMode::Object,
        })
        .expect("gomme");
    assert!(e.removed.is_empty(), "la gomme ne touche que les traits");
    let del = d
        .apply(Command::Delete {
            ids: vec!["h2".into()],
        })
        .expect("delete");
    assert_eq!(del.removed, vec!["h2".to_string()]);
    assert_eq!(d.element_ids("p1"), vec!["h1".to_string()]);
}

#[test]
fn unknown_kind_is_kept_moved_and_resaved() {
    let mut d = load(&unknown_bytes()).expect("load");
    assert_eq!(d.hit_test("p1", 150.0, 100.0, 0.0), Some("h1".to_string()));
    d.apply(Command::Transform {
        ids: vec!["h1".into()],
        matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 0.0],
    })
    .expect("transform");
    assert_eq!(
        d.element("h1").expect("vue").transform,
        [1.0, 0.0, 0.0, 1.0, 110.0, 50.0]
    );
    let reloaded = load(&save(&d, &meta()).expect("save")).expect("reload");
    assert_eq!(
        reloaded.element("h1").expect("vue").transform,
        [1.0, 0.0, 0.0, 1.0, 110.0, 50.0]
    );
    assert_eq!(
        raw_h1(&reloaded),
        (Some(300.0), Some(2), Some(vec![ABC.to_string()]))
    );
}

/// Patron écarté (K4, DAK2) : `h1` n'est ni une image ni un fond, son id d'asset est rangé dans un `Any::Array` ; un
/// lecteur du seul champ `asset` le perdrait au réenregistrement.
#[test]
fn unknown_fixture_cites_asset_in_any_array() {
    let d = load(&unknown_bytes()).expect("load");
    let before = d.encode_v1();
    let cited = d.cited_assets();
    assert_eq!(cited.len(), 1);
    assert_eq!(cited[0], roomboard_core::asset::AssetInfo::fallback(ABC));
    assert!(d.encode_v1() == before, "une lecture n'écrit rien");
}
