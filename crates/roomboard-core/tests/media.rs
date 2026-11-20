//! C14 au niveau du cœur (S3, M7, M32) : un média survit à l'enregistrement ; un média mal formé est un cadre inconnu
//! gardé octet pour octet ; la copie d'un média garde ses assets et son lien.
use roomboard_core::asset::AssetRef;
use roomboard_core::commands::Command;
use roomboard_core::document::Document;
use roomboard_core::format::{load, save, SaveMeta};
use roomboard_core::media::{LinkedAsset, MediaType};
use yrs::{Any, Array, ArrayPrelim, Doc, In, Map, MapPrelim, ReadTxn, StateVector, Transact};

const WEBM: &str = concat!(
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
);
const JPG: &str = concat!(
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
);
const MP3: &str = concat!(
    "cccccccccccccccccccccccccccccccc",
    "cccccccccccccccccccccccccccccccc"
);

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
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

fn add(
    d: &mut Document,
    a: AssetRef,
    linked: Option<&str>,
    media_type: MediaType,
    poster: Option<AssetRef>,
) -> String {
    let p = d.page_ids()[0].clone();
    d.apply(Command::AddMedia {
        page: p,
        asset: a,
        linked: linked.map(String::from),
        media_type,
        w: 320.0,
        h: 180.0,
        duration: 2.5,
        poster,
        matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 50.0],
    })
    .expect("média")
    .ids[0]
        .clone()
}

/// S3 : réglages, poster et lien relus à l'identique après enregistrement.
#[test]
fn media_survives_save_and_load_with_settings_poster_and_link() {
    let mut d = Document::blank();
    let id = add(
        &mut d,
        asset(WEBM, "clip.webm", "video/webm"),
        Some("clips/clip.webm"),
        MediaType::Video,
        Some(asset(JPG, "clip.jpg", "image/jpeg")),
    );
    d.apply(Command::SetMedia {
        id: id.clone(),
        trim_start: 0.5,
        trim_end: Some(2.0),
        looped: true,
        volume: 0.4,
    })
    .expect("réglages");
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    let before = d.element(&id).and_then(|v| v.media).expect("média");
    let after = r.element(&id).and_then(|v| v.media).expect("média relu");
    assert_eq!(after, before);
    assert_eq!(
        (after.trim_start, after.trim_end, after.looped, after.volume),
        (0.5, Some(2.0), true, 0.4)
    );
    assert_eq!(after.poster.as_deref(), Some(JPG));
    assert_eq!(r.cited_assets(), d.cited_assets());
    assert_eq!(
        r.linked_assets(),
        vec![LinkedAsset {
            id: WEBM.into(),
            path: "clips/clip.webm".into()
        }]
    );
}

/// État Yrs d'une version plus récente : `m1` a un `mediaType` inconnu, `m2` n'a pas d'`asset`.
fn malformed_media_ybin() -> Vec<u8> {
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
            ("kind", In::from("media")),
            ("transform", transform()),
            ("asset", In::from(WEBM)),
            ("mediaType", In::from("hologram")),
            ("w", In::from(320.0)),
            ("h", In::from(180.0)),
            ("duration", In::from(2.5)),
            ("trimStart", In::from(0.5)),
        ]);
        let m2 = MapPrelim::from([
            ("id", In::from("m2")),
            ("kind", In::from("media")),
            ("transform", transform()),
            ("mediaType", In::from("video")),
            ("w", In::from(320.0)),
            ("h", In::from(180.0)),
            ("loop", In::from(true)),
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

/// M7 : un média mal formé est un cadre inconnu de sa boîte (jamais invisible), réenregistré octet pour octet.
#[test]
fn malformed_media_is_an_unknown_frame_kept_byte_for_byte() {
    let d = Document::from_update_v1(&malformed_media_ybin()).expect("état");
    for id in ["m1", "m2"] {
        let v = d.element(id).expect("jamais invisible");
        assert_eq!(v.kind, "unknown", "{id}");
        assert_eq!(v.media, None, "{id}");
        assert_eq!(
            v.unknown.map(|u| (u.source_kind, u.w, u.h)),
            Some(("media".to_string(), 320.0, 180.0)),
            "{id}"
        );
        assert_eq!(v.transform, [1.0, 0.0, 0.0, 1.0, 100.0, 50.0]);
        assert!(d.bounds(&[id.to_string()]).is_some(), "boîte de {id}");
    }
    assert_eq!(d.element_ids("p1"), vec!["m1".to_string(), "m2".to_string()]);
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
        Some("media".to_string())
    );
}

/// M32 : extraire un média inclus garde média et poster cités, avec leur métadonnée ; un média lié garde son lien.
#[test]
fn copying_an_included_media_keeps_media_and_poster_meta() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let included = add(
        &mut d,
        asset(WEBM, "clip.webm", "video/webm"),
        None,
        MediaType::Video,
        Some(asset(JPG, "clip.jpg", "image/jpeg")),
    );
    let linked = add(
        &mut d,
        asset(MP3, "voix.mp3", "audio/mpeg"),
        Some("sons/voix.mp3"),
        MediaType::Audio,
        None,
    );
    let f = d.extract(&p, &[included.clone()]).expect("extrait");
    assert_eq!(
        f.cited_assets(),
        vec![
            asset(WEBM, "clip.webm", "video/webm"),
            asset(JPG, "clip.jpg", "image/jpeg")
        ]
    );
    assert!(f.linked_assets().is_empty());
    let fp = f.page_ids()[0].clone();
    let fid = f.element_ids(&fp)[0].clone();
    assert_eq!(
        f.element(&fid).and_then(|v| v.media),
        d.element(&included).and_then(|v| v.media)
    );
    let g = d.extract(&p, &[linked]).expect("extrait lié");
    assert_eq!(
        g.cited_assets(),
        vec![asset(MP3, "voix.mp3", "audio/mpeg")]
    );
    assert_eq!(
        g.linked_assets(),
        vec![LinkedAsset {
            id: MP3.into(),
            path: "sons/voix.mp3".into()
        }]
    );
}
