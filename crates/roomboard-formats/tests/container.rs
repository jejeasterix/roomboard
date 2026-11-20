//! Conteneur `.roomboard` avec assets (U4, K11, K12, S1, S5).
use std::io::{Cursor, Write};

use roomboard_core::document::Document;
use roomboard_core::format::zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};
use roomboard_core::format::{self, FormatError, SaveMeta, DOCUMENT, MANIFEST};
use roomboard_formats::container::{self, sha256_hex, AssetBytes};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const EMPTY: &str = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
/// Relevé une fois par `sha256sum crates/roomboard-core/tests/fixtures/socle-v1.roomboard` (étape 4).
const SOCLE_SHA256: &str = "63cf821913427ad85e79859acf52f7ca084bfa329ac43fc330969b52eebefaad";
const SOCLE: &[u8] = include_bytes!("../../roomboard-core/tests/fixtures/socle-v1.roomboard");

fn meta() -> SaveMeta {
    SaveMeta {
        app_version: "0.1.0".into(),
        now: "2026-11-20T00:00:00Z".into(),
        created: None,
    }
}

fn parts() -> format::Parts {
    let mut d = Document::blank();
    d.add_page();
    format::save_parts(&d, &meta()).expect("parts")
}

fn names(file: &[u8]) -> Vec<String> {
    let a = ZipArchive::new(Cursor::new(file)).expect("zip");
    a.file_names()
        .map(|n| n.expect("nom").into_owned())
        .collect()
}

fn zip_of(entries: &[(&str, &[u8])]) -> Vec<u8> {
    let mut w = ZipWriter::new(Cursor::new(Vec::new()));
    for (name, bytes) in entries {
        w.start_file(*name, format::entry_options(false))
            .expect("entrée");
        w.write_all(bytes).expect("écriture");
    }
    w.finish().expect("fin").into_inner()
}

/// Patron écarté (arbitrage B1, carnet F1) : le conteneur ne réécrit ni l'ouverture du ZIP, ni l'écriture ou le
/// contrôle du manifeste et de `document.ybin` ; il passe par `format::write_parts` et `format::open`. Une copie
/// fidèle donnerait les mêmes octets et les mêmes erreurs : seul son code la distingue de la délégation.
#[test]
fn container_delegates_manifest_and_document_to_core() {
    let code = include_str!("../src/container.rs")
        .lines()
        .filter(|l| !l.trim_start().starts_with("//"))
        .collect::<Vec<_>>()
        .join("\n");
    for needed in [
        "format::write_parts(",
        "format::open(",
        "format::entry_options(",
    ] {
        assert!(
            code.contains(needed),
            "{needed} absent : le conteneur doit passer par le cœur"
        );
    }
    for banned in [
        "ZipWriter::new",
        "ZipArchive::new",
        "MANIFEST",
        "DOCUMENT",
        "manifest.json",
        "document.ybin",
        "check_manifest",
        "serde_json",
        "save_parts",
        "load_parts",
    ] {
        assert!(
            !code.contains(banned),
            "{banned} dans container.rs : lecture ou écriture du cœur recopiée"
        );
    }
    assert!(
        !include_str!("../Cargo.toml").contains("zip"),
        "dépendance zip propre au crate : prendre roomboard_core::format::zip"
    );
}

#[test]
fn sha256_hex_matches_common_vectors() {
    assert_eq!(sha256_hex(b"abc"), ABC);
    assert_eq!(sha256_hex(b""), EMPTY);
}

#[test]
fn container_without_assets_equals_core_save() {
    let mut d = Document::blank();
    d.add_page();
    let p = format::save_parts(&d, &meta()).expect("parts");
    assert!(container::write(&p, &[]).expect("write") == format::save(&d, &meta()).expect("save"));
}

#[test]
fn assets_are_sorted_typed_and_compressed_by_type() {
    let png = b"png-synthetique".to_vec();
    let svg = b"<svg xmlns='http://www.w3.org/2000/svg'/>".to_vec();
    let raw = b"octets".to_vec();
    let ids = [sha256_hex(&png), sha256_hex(&svg), sha256_hex(&raw)];
    let assets = [
        AssetBytes {
            id: &ids[0],
            mime: "image/png",
            bytes: &png,
        },
        AssetBytes {
            id: &ids[1],
            mime: "image/svg+xml",
            bytes: &svg,
        },
        AssetBytes {
            id: &ids[2],
            mime: "application/octet-stream",
            bytes: &raw,
        },
    ];
    let reversed: Vec<AssetBytes<'_>> = assets.iter().rev().copied().collect();
    let p = parts();
    let a = container::write(&p, &assets).expect("write");
    assert!(
        a == container::write(&p, &reversed).expect("write 2"),
        "l'ordre reçu change le fichier"
    );
    let mut expected: Vec<(String, &str, CompressionMethod)> = vec![
        (ids[0].clone(), "png", CompressionMethod::Stored),
        (ids[1].clone(), "svg", CompressionMethod::Deflated),
        (ids[2].clone(), "bin", CompressionMethod::Deflated),
    ];
    expected.sort_by(|x, y| x.0.cmp(&y.0));
    let mut want = vec![MANIFEST.to_string(), DOCUMENT.to_string()];
    want.extend(
        expected
            .iter()
            .map(|(id, ext, _)| format!("assets/{id}.{ext}")),
    );
    assert_eq!(names(&a), want);
    let mut z = ZipArchive::new(Cursor::new(a.as_slice())).expect("zip");
    for (id, ext, method) in &expected {
        let f = z.by_name(&format!("assets/{id}.{ext}")).expect("entrée");
        assert_eq!(f.compression(), *method, "{ext}");
        assert!(f.last_modified() == Some(DateTime::default()), "{ext} daté");
    }
}

#[test]
fn duplicate_id_is_written_once() {
    let a = AssetBytes {
        id: ABC,
        mime: "image/png",
        bytes: b"abc",
    };
    let file = container::write(&parts(), &[a, a]).expect("write");
    assert_eq!(names(&file).len(), 3);
}

#[test]
fn mismatched_hash_refuses_write() {
    let err = container::write(
        &parts(),
        &[AssetBytes {
            id: ABC,
            mime: "image/png",
            bytes: b"abd",
        }],
    )
    .expect_err("refus");
    assert!(
        matches!(&err, FormatError::Corrupt(m) if m.contains("empreinte")),
        "{err}"
    );
}

#[test]
fn non_conforming_id_refuses_write() {
    let upper = ABC.to_uppercase();
    assert!(matches!(
        container::write(
            &parts(),
            &[AssetBytes {
                id: &upper,
                mime: "image/png",
                bytes: b"abc",
            }]
        ),
        Err(FormatError::Corrupt(_))
    ));
}

#[test]
fn extension_table_and_default() {
    for (mime, ext, stored) in [
        ("image/png", "png", true),
        ("image/jpeg", "jpg", true),
        ("image/gif", "gif", true),
        ("image/webp", "webp", true),
        ("image/bmp", "bmp", false),
        ("image/x-icon", "ico", false),
        ("image/vnd.microsoft.icon", "ico", false),
        ("image/svg+xml", "svg", false),
        ("image/avif", "avif", true),
        ("image/heic", "heic", true),
        ("image/tiff", "tif", false),
        ("application/pdf", "pdf", true),
        ("video/mp4", "mp4", true),
        ("video/webm", "webm", true),
        ("application/octet-stream", "bin", false),
        ("text/plain", "bin", false),
    ] {
        assert_eq!(container::extension(mime), (ext, stored), "{mime}");
    }
}

#[test]
fn read_round_trip_keeps_parts_and_bytes() {
    let p = parts();
    let file = container::write(
        &p,
        &[
            AssetBytes {
                id: EMPTY,
                mime: "image/jpeg",
                bytes: b"",
            },
            AssetBytes {
                id: ABC,
                mime: "image/png",
                bytes: b"abc",
            },
        ],
    )
    .expect("write");
    let u = container::read(&file).expect("read");
    assert_eq!(u.parts, p);
    assert_eq!(
        u.assets,
        vec![
            (ABC.to_string(), b"abc".to_vec()),
            (EMPTY.to_string(), Vec::new())
        ]
    );
    assert!(u.warnings.is_empty(), "{:?}", u.warnings);
    let rewritten = container::write(
        &u.parts,
        &[
            AssetBytes {
                id: ABC,
                mime: "image/png",
                bytes: b"abc",
            },
            AssetBytes {
                id: EMPTY,
                mime: "image/jpeg",
                bytes: b"",
            },
        ],
    )
    .expect("rewrite");
    assert!(rewritten == file);
}

#[test]
fn read_ignores_bad_asset_entries_with_warnings() {
    let p = parts();
    let wrong = format!("assets/{ABC}.png");
    let dup = format!("assets/{EMPTY}.jpg");
    let dup2 = format!("assets/{EMPTY}.bin");
    let sub = format!("assets/x/{ABC}.png");
    let file = zip_of(&[
        (MANIFEST, &p.manifest),
        (DOCUMENT, &p.ybin),
        (&wrong, b"pas abc"),
        ("assets/pasunhash.png", b"abc"),
        (&dup, b""),
        (&dup2, b""),
        (&sub, b"abc"),
        ("autre.txt", b"x"),
    ]);
    let u = container::read(&file).expect("la lecture ne doit pas échouer");
    assert_eq!(u.assets, vec![(EMPTY.to_string(), Vec::new())]);
    assert_eq!(u.warnings.len(), 4, "{:?}", u.warnings);
    assert!(
        u.warnings.iter().all(|w| w.contains("assets/")),
        "{:?}",
        u.warnings
    );
}

#[test]
fn read_newer_format_without_document_is_newer() {
    let manifest = br#"{"format":"roomboard","formatVersion":2,"schema":1,"appVersion":"9","created":"c","modified":"m"}"#;
    assert_eq!(
        container::read(&zip_of(&[(MANIFEST, manifest)])).err(),
        Some(FormatError::NewerVersion {
            found: 2,
            supported: 1
        })
    );
}

#[test]
fn socle_fixture_hash_is_pinned() {
    assert_eq!(
        sha256_hex(SOCLE),
        SOCLE_SHA256,
        "socle-v1.roomboard a changé : la garde S5 n'est plus celle de main"
    );
}

#[test]
fn socle_fixture_opens_by_read_and_load_parts() {
    let u = container::read(SOCLE).expect("read");
    assert!(u.assets.is_empty() && u.warnings.is_empty());
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    assert_eq!(d.page_count(), 2);
}

#[test]
fn core_load_ignores_assets() {
    let mut d = Document::blank();
    d.add_page();
    let file = container::write(
        &format::save_parts(&d, &meta()).expect("parts"),
        &[AssetBytes {
            id: ABC,
            mime: "image/png",
            bytes: b"abc",
        }],
    )
    .expect("write");
    assert_eq!(
        format::load(&file)
            .expect("Ouvrir des lots 5a et 5b")
            .page_ids(),
        d.page_ids()
    );
}
