//! C15 au niveau du cœur (S4, X8, X10, X31, X33) : un objet 3D survit à l'enregistrement ; un objet 3D mal formé est un
//! cadre inconnu gardé octet pour octet ; la copie garde ses fichiers liés ; la collision suit sa boîte.
use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::model3d::{Model3dFormat, DEFAULT_PITCH, DEFAULT_YAW};
use yrs::{Any, Array, ArrayPrelim, Doc, In, Map, MapPrelim, ReadTxn, StateVector, Transact};

const GLTF: &str = concat!(
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
);
const PNG: &str = concat!(
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
);
const TEX: &str = concat!(
    "cccccccccccccccccccccccccccccccc",
    "cccccccccccccccccccccccccccccccc"
);
const BIN: &str = concat!(
    "dddddddddddddddddddddddddddddddd",
    "dddddddddddddddddddddddddddddddd"
);
const WEBM: &str = concat!(
    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
);

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-21T00:00:00Z".into(),
        created: None,
    }
}

fn asset(id: &str, name: &str, mime: &str) -> AssetRef {
    AssetRef {
        id: id.into(),
        name: name.into(),
        mime: mime.into(),
        size: 1000.0,
    }
}

fn gltf() -> AssetRef {
    asset(GLTF, "chaise.gltf", "model/gltf+json")
}

fn linked() -> Vec<(String, AssetRef)> {
    vec![
        ("tex/bois.png".into(), asset(TEX, "bois.png", "image/png")),
        (
            "chaise.bin".into(),
            asset(BIN, "chaise.bin", "application/octet-stream"),
        ),
    ]
}

fn add(d: &mut Document, matrix: [f64; 6], snapshot: Option<AssetRef>) -> String {
    let p = d.page_ids()[0].clone();
    d.apply(Command::AddModel3d {
        page: p,
        asset: gltf(),
        format: Model3dFormat::Gltf,
        files: linked(),
        w: 640.0,
        h: 480.0,
        yaw: DEFAULT_YAW,
        pitch: DEFAULT_PITCH,
        snapshot,
        matrix,
    })
    .expect("objet 3D")
    .ids[0]
        .clone()
}

/// S4 : vue, fichiers liés et instantané relus à l'identique après enregistrement.
#[test]
fn model3d_survives_save_and_load_with_files_view_and_snapshot() {
    let mut d = Document::blank();
    let id = add(&mut d, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0], None);
    d.apply(Command::SetModel3dView {
        id: id.clone(),
        yaw: 1.0,
        pitch: -0.5,
        snapshot: Some(asset(PNG, "vue.png", "image/png")),
    })
    .expect("vue");
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    let before = d.element(&id).and_then(|v| v.model3d).expect("objet 3D");
    let after = r
        .element(&id)
        .and_then(|v| v.model3d)
        .expect("objet 3D relu");
    assert_eq!(after, before);
    assert_eq!((after.yaw, after.pitch), (1.0, -0.5));
    assert_eq!(after.snapshot.as_deref(), Some(PNG));
    assert_eq!(
        after
            .files
            .iter()
            .map(|f| f.path.as_str())
            .collect::<Vec<_>>(),
        ["tex/bois.png", "chaise.bin"]
    );
    assert_eq!(r.cited_assets(), d.cited_assets());
    assert_eq!(r.cited_assets().len(), 4);
}

/// État Yrs d'une version plus récente : `m1` a un `format` inconnu, `m2` n'a pas d'`asset`.
fn malformed_model3d_ybin() -> Vec<u8> {
    let doc = Doc::with_client_id(7);
    let meta = doc.get_or_insert_map("meta");
    let pages = doc.get_or_insert_array("pages");
    {
        let mut txn = doc.transact_mut();
        meta.insert(&mut txn, "schema", 1.0);
        let transform = || -> In {
            let t: Vec<Any> = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]
                .into_iter()
                .map(Any::from)
                .collect();
            In::Any(Any::Array(t.into()))
        };
        let m1 = MapPrelim::from([
            ("id", In::from("m1")),
            ("kind", In::from("model3d")),
            ("transform", transform()),
            ("asset", In::from(GLTF)),
            ("format", In::from("fbx")),
            ("w", In::from(640.0)),
            ("h", In::from(480.0)),
            ("yaw", In::from(0.5)),
            (
                "files",
                In::Array(ArrayPrelim::from(vec![In::Map(MapPrelim::from([
                    ("path", In::from("tex/bois.png")),
                    ("asset", In::from(TEX)),
                ]))])),
            ),
        ]);
        let m2 = MapPrelim::from([
            ("id", In::from("m2")),
            ("kind", In::from("model3d")),
            ("transform", transform()),
            ("format", In::from("glb")),
            ("w", In::from(640.0)),
            ("h", In::from(480.0)),
            ("snapshot", In::from(PNG)),
        ]);
        let page = MapPrelim::from([
            ("id", In::from("p1")),
            ("width", In::from(1920.0)),
            ("height", In::from(1080.0)),
            ("background", In::from("#ffffff")),
            (
                "elements",
                In::Array(ArrayPrelim::from(vec![In::Map(m1), In::Map(m2)])),
            ),
        ]);
        pages.push_back(&mut txn, page);
    }
    let txn = doc.transact();
    txn.encode_state_as_update_v1(&StateVector::default())
}

/// X8, X33 : un objet 3D mal formé est un cadre inconnu de sa boîte (jamais invisible), réenregistré octet pour octet.
#[test]
fn malformed_model3d_is_an_unknown_frame_kept_byte_for_byte() {
    let d = Document::from_update_v1(&malformed_model3d_ybin()).expect("état");
    for id in ["m1", "m2"] {
        let v = d.element(id).expect("jamais invisible");
        assert_eq!(v.kind, "unknown", "{id}");
        assert_eq!(v.model3d, None, "{id}");
        assert_eq!(
            v.unknown.map(|u| (u.source_kind, u.w, u.h)),
            Some(("model3d".to_string(), 640.0, 480.0)),
            "{id}"
        );
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert!(d.bounds(&[id.to_string()]).is_some(), "boîte de {id}");
    }
    assert_eq!(
        d.element_ids("p1"),
        vec!["m1".to_string(), "m2".to_string()]
    );
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    assert!(
        save(&r, &meta()).expect("resave") == file,
        "réenregistré octet pour octet"
    );
    assert_eq!(
        r.element("m1")
            .and_then(|v| v.unknown)
            .map(|u| u.source_kind),
        Some("model3d".to_string())
    );
}

/// X31 : extraire un objet 3D garde le principal, les liés et l'instantané cités, avec leurs métadonnées.
#[test]
fn copying_a_model3d_keeps_linked_files_meta() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let png = asset(PNG, "vue.png", "image/png");
    let id = add(&mut d, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0], Some(png.clone()));
    let f = d.extract(&p, std::slice::from_ref(&id)).expect("extrait");
    let expected = vec![
        gltf(),
        png,
        asset(TEX, "bois.png", "image/png"),
        asset(BIN, "chaise.bin", "application/octet-stream"),
    ];
    assert_eq!(f.cited_assets(), expected);
    assert_eq!(d.cited_assets(), expected);
    for a in &expected {
        assert_eq!(f.asset(&a.id), Some(a.clone()), "métadonnée de {}", a.name);
    }
    let fp = f.page_ids()[0].clone();
    let fid = f.element_ids(&fp)[0].clone();
    assert_eq!(
        f.element(&fid).and_then(|v| v.model3d),
        d.element(&id).and_then(|v| v.model3d)
    );
}

/// X10 : objet 3D et média touchés dans leur boîte ; hors des boîtes, rien ; un objet 3D mal formé est touché dans sa
/// boîte inconnue.
#[test]
fn model3d_and_media_are_hit_by_their_box() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let model = add(&mut d, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0], None);
    let media = d
        .apply(Command::AddMedia {
            page: p.clone(),
            asset: asset(WEBM, "clip.webm", "video/webm"),
            linked: None,
            media_type: roomboard_core::media::MediaType::Video,
            w: 320.0,
            h: 180.0,
            duration: 2.5,
            poster: None,
            matrix: [1.0, 0.0, 0.0, 1.0, 1000.0, 50.0],
        })
        .expect("média")
        .ids[0]
        .clone();
    assert_eq!(d.hit_test(&p, 420.0, 290.0, 0.0), Some(model.clone()));
    // Boîte 100..740 × 50..530 : touchée près de deux coins opposés, manquée juste à droite.
    assert_eq!(d.hit_test(&p, 110.0, 60.0, 0.0), Some(model.clone()));
    assert_eq!(d.hit_test(&p, 730.0, 520.0, 0.0), Some(model.clone()));
    assert_eq!(d.hit_test(&p, 745.0, 290.0, 0.0), None);
    assert_eq!(d.hit_test(&p, 1160.0, 140.0, 0.0), Some(media));
    assert_eq!(d.hit_test(&p, 900.0, 700.0, 0.0), None);
    assert_eq!(d.hit_test(&p, 50.0, 20.0, 0.0), None);
    let broken = Document::from_update_v1(&malformed_model3d_ybin()).expect("état");
    assert_eq!(
        broken.hit_test("p1", 420.0, 290.0, 0.0),
        Some("m2".to_string()),
        "le dessus de la pile, touché dans sa boîte inconnue"
    );
    assert_eq!(broken.hit_test("p1", 900.0, 700.0, 0.0), None);
}
