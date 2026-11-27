//! OG23 (T10) : départ de la baguette (`transparent.x`, `transparent.y`, pixels source) par l'API publique du cœur.
//! Les deux ou aucun, entiers, dans l'image ; sinon `BadImageParams` à l'écriture et couleur lue absente (U3).
use roomboard_core::asset::AssetRef;
use roomboard_core::commands::{Change, Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::element::Transform;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::image::{ImageParamsInput, TransparentInput, TransparentView};

const ORIG: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const M: Transform = [1.0, 0.0, 0.0, 1.0, 100.0, 80.0];

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-27T00:00:00Z".into(),
        created: None,
    }
}

/// Image 200 × 150 sur la première page : son id.
fn add(d: &mut Document) -> String {
    let p = d.page_ids()[0].clone();
    d.apply(Command::AddImage {
        page: p,
        asset: AssetRef {
            id: ORIG.into(),
            name: "photo.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        },
        w: 200.0,
        h: 150.0,
        matrix: M,
    })
    .expect("image")
    .ids[0]
        .clone()
}

fn white(x: Option<f64>, y: Option<f64>) -> TransparentInput {
    TransparentInput {
        color: "#ffffff".into(),
        tolerance: 10.0,
        soft: 0.0,
        contiguous: true,
        x,
        y,
    }
}

fn set(d: &mut Document, id: &str, t: TransparentInput) -> Result<Change, CommandError> {
    d.apply(Command::SetImageParams {
        id: id.into(),
        params: ImageParamsInput {
            transparent: Some(t),
            ..ImageParamsInput::default()
        },
        matrix: M,
        restore: false,
    })
}

fn transparent(d: &Document, id: &str) -> Option<TransparentView> {
    d.element(id)
        .and_then(|e| e.image)
        .expect("image")
        .params()
        .transparent
}

#[test]
fn transparent_seed_out_of_image_refused() {
    let mut d = Document::blank();
    let id = add(&mut d);
    let v = d.version();
    for (x, y) in [
        (Some(200.0), Some(0.0)),
        (Some(0.0), Some(150.0)),
        (Some(-1.0), Some(0.0)),
        (Some(1.5), Some(0.0)),
        (Some(f64::NAN), Some(0.0)),
        (Some(3.0), None),
        (None, Some(3.0)),
    ] {
        let r = set(&mut d, &id, white(x, y));
        assert!(
            matches!(r, Err(CommandError::BadImageParams)),
            "{x:?} {y:?} : {r:?}"
        );
    }
    assert_eq!(d.version(), v, "aucun refus n'écrit");
    assert_eq!(transparent(&d, &id), None);
}

#[test]
fn transparent_seed_read_back() {
    let mut d = Document::blank();
    let id = add(&mut d);
    let c = set(&mut d, &id, white(Some(199.0), Some(149.0))).expect("départ");
    assert_eq!(c.ids, vec![id.clone()]);
    let want = Some(TransparentView {
        color: "#ffffff".into(),
        tolerance: 10,
        soft: 0,
        contiguous: true,
        x: Some(199),
        y: Some(149),
    });
    assert_eq!(transparent(&d, &id), want);
    let r = load(&save(&d, &meta()).expect("save")).expect("load");
    assert_eq!(transparent(&r, &id), want, "relu après un rechargement");
    let v = d.version();
    let same = set(&mut d, &id, white(Some(199.0), Some(149.0))).expect("même départ");
    assert_eq!(same.ids, Vec::<String>::new());
    assert_eq!(d.version(), v, "même départ : aucune étape");
    assert_eq!(
        serde_json::to_value(transparent(&d, &id).expect("vue")).expect("json"),
        serde_json::json!({
            "color": "#ffffff", "tolerance": 10, "soft": 0, "contiguous": true, "x": 199, "y": 149
        })
    );
    set(&mut d, &id, white(Some(0.0), Some(0.0))).expect("autre départ");
    let t = transparent(&d, &id).expect("vue");
    assert_eq!((t.x, t.y), (Some(0), Some(0)));
    set(&mut d, &id, white(None, None)).expect("sans départ");
    let t = transparent(&d, &id).expect("vue");
    assert_eq!((t.x, t.y), (None, None));
}

#[test]
fn transparent_without_seed_keeps_bytes() {
    let mut d = Document::blank();
    let id = add(&mut d);
    set(&mut d, &id, white(None, None)).expect("couleur");
    let a = save(&d, &meta()).expect("save");
    let mut r = load(&a).expect("load");
    assert_eq!(
        save(&r, &meta()).expect("resave"),
        a,
        "réenregistré : mêmes octets"
    );
    let v = r.version();
    set(&mut r, &id, white(None, None)).expect("même état");
    assert_eq!(r.version(), v, "lu sans départ : rien à réécrire");
    assert_eq!(save(&r, &meta()).expect("resave"), a);
    let json = serde_json::to_value(transparent(&r, &id).expect("vue")).expect("json");
    assert!(json.get("x").is_none() && json.get("y").is_none(), "{json}");
}
