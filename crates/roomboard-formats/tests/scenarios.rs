//! Scénarios S1 à S4 du cadrage usage-c2-coeur, de la commande du cœur au fichier et retour.
use std::path::{Path, PathBuf};

use roomboard_core::asset::AssetRef;
use roomboard_core::commands::{BackdropInput, Command};
use roomboard_core::document::Document;
use roomboard_core::element::IDENTITY;
use roomboard_core::format::{self, SaveMeta};
use roomboard_formats::container::{self, sha256_hex, AssetBytes};

const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

fn meta() -> SaveMeta {
    SaveMeta { app_version: "0.1.0".into(), now: "2026-11-20T00:00:00Z".into(), created: None }
}

fn first(d: &Document) -> String {
    d.page_ids()[0].clone()
}

fn png(n: u8) -> Vec<u8> {
    let mut v = b"\x89PNG\r\n\x1a\n".to_vec();
    v.extend(std::iter::repeat_n(n, 64));
    v
}

fn image_ref(bytes: &[u8], name: &str) -> AssetRef {
    AssetRef { id: sha256_hex(bytes), name: name.into(), mime: "image/png".into(), size: bytes.len() as f64 }
}

/// Octets des assets cités, passés dans l'ordre inverse (le conteneur trie, K12).
fn pack(d: &Document, store: &[Vec<u8>]) -> Vec<u8> {
    let parts = format::save_parts(d, &meta()).expect("parts");
    let cited = d.cited_assets();
    let mut assets: Vec<AssetBytes<'_>> = cited
        .iter()
        .filter_map(|c| {
            store
                .iter()
                .find(|b| sha256_hex(b) == c.id)
                .map(|b| AssetBytes { id: &c.id, mime: &c.mime, bytes: b })
        })
        .collect();
    assets.reverse();
    container::write(&parts, &assets).expect("write")
}

fn unpack(file: &[u8]) -> (Document, Vec<(String, Vec<u8>)>) {
    let u = container::read(file).expect("read");
    assert!(u.warnings.is_empty(), "{:?}", u.warnings);
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    (d, u.assets)
}

#[test]
fn s1_image_round_trip() {
    let (a, b) = (png(1), png(2));
    let mut d = Document::blank();
    let p = first(&d);
    let ia = d
        .apply(Command::AddImage { page: p.clone(), asset: image_ref(&a, "a.png"), w: 64.0, h: 32.0, matrix: [1.0, 0.0, 0.0, 1.0, 10.0, 20.0] })
        .expect("image a")
        .ids[0]
        .clone();
    d.apply(Command::AddImage { page: p.clone(), asset: image_ref(&b, "b.png"), w: 8.0, h: 8.0, matrix: IDENTITY })
        .expect("image b");
    let store = vec![a.clone(), b.clone()];
    let file = pack(&d, &store);
    assert!(pack(&d, &store) == file, "deux enregistrements, deux fichiers différents");
    let (back, assets) = unpack(&file);
    let v = back.element(&ia).expect("image relue");
    let img = v.image.expect("vue image");
    assert_eq!((img.asset, img.w, img.h, v.transform), (sha256_hex(&a), 64.0, 32.0, [1.0, 0.0, 0.0, 1.0, 10.0, 20.0]));
    let mut want = vec![(sha256_hex(&a), a.clone()), (sha256_hex(&b), b.clone())];
    want.sort();
    assert_eq!(assets, want);
    let mut cur = file.clone();
    for i in 0..30 {
        let (r, _) = unpack(&cur);
        cur = pack(&r, &store);
        assert!(cur == file, "fichier différent au rechargement {i}");
    }
    assert!(d.undo() && d.undo());
    assert!(pack(&d, &store) == format::save(&d, &meta()).expect("save"), "sans image, le fichier est celui du cœur");
}

#[test]
fn s2_same_asset_twice_one_entry() {
    let a = png(3);
    let mut d = Document::blank();
    let p = first(&d);
    for _ in 0..2 {
        d.apply(Command::AddImage { page: p.clone(), asset: image_ref(&a, "a.png"), w: 4.0, h: 4.0, matrix: IDENTITY })
            .expect("image");
    }
    let (back, assets) = unpack(&pack(&d, &[a.clone()]));
    assert_eq!(back.element_ids(&p).len(), 2);
    assert_eq!(assets.len(), 1);
    assert_eq!(back.cited_assets().len(), 1);
}

#[test]
fn s3_backdrop_asset_is_written() {
    let fond = png(4);
    let mut d = Document::blank();
    let p = first(&d);
    d.apply(Command::SetBackdrop {
        page: p.clone(),
        backdrop: Some(BackdropInput { asset: image_ref(&fond, "fond.png"), w: 1000.0, h: 500.0, fit: "width".into() }),
    })
    .expect("fond");
    let file = pack(&d, &[fond.clone()]);
    let (back, assets) = unpack(&file);
    assert_eq!(assets, vec![(sha256_hex(&fond), fond.clone())]);
    let b = back.page(&p).expect("page").backdrop.expect("fond relu");
    assert_eq!(b.rect.map(|r| (r.x1, r.y1)), Some((1920.0, 960.0)));
    assert!(pack(&back, &[fond]) == file, "recharger garde les octets");
}

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures").join(name)
}

#[test]
fn s4_unknown_with_asset_round_trip() {
    let path = fixture("element-inconnu-avec-asset.roomboard");
    if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
        let core = std::fs::read(
            Path::new(env!("CARGO_MANIFEST_DIR")).join("../roomboard-core/tests/fixtures/element-inconnu.roomboard"),
        )
        .expect("fixture du cœur");
        let opened = container::read(&core).expect("read");
        let file = container::write(&opened.parts, &[AssetBytes { id: ABC, mime: "image/png", bytes: b"abc" }]).expect("write");
        std::fs::create_dir_all(path.parent().expect("dossier")).expect("dossier");
        std::fs::write(&path, file).expect("écriture");
    }
    let file = std::fs::read(&path).expect(
        "fixture absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats --test scenarios",
    );
    let u = container::read(&file).expect("read");
    assert_eq!(u.assets, vec![(ABC.to_string(), b"abc".to_vec())]);
    let again: Vec<AssetBytes<'_>> = u.assets.iter().map(|(id, b)| AssetBytes { id, mime: "image/png", bytes: b }).collect();
    assert!(container::write(&u.parts, &again).expect("rewrite") == file, "sans geste, mêmes octets");
    let (d, _) = format::load_parts(&u.parts.manifest, &u.parts.ybin).expect("load_parts");
    assert_eq!(d.element("h1").expect("h1").kind, "unknown");
    assert_eq!(d.cited_assets().into_iter().map(|a| a.id).collect::<Vec<_>>(), vec![ABC.to_string()]);
    let store = vec![b"abc".to_vec()];
    let resaved = container::read(&pack(&d, &store)).expect("read");
    assert_eq!(resaved.assets, vec![(ABC.to_string(), b"abc".to_vec())], "l'asset de l'élément inconnu est gardé");
}

fn mime_of(p: &Path) -> &'static str {
    match p.extension().and_then(|e| e.to_str()).map(str::to_ascii_lowercase).as_deref() {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("avif") => "image/avif",
        Some("heic") => "image/heic",
        _ => "application/octet-stream",
    }
}

/// Essai réel (K15, Q6) : `ROOMBOARD_EXEMPLES=~/telechargements-roomboard/images`. Rien de ce dossier n'est commité.
#[test]
#[ignore = "essai réel : ROOMBOARD_EXEMPLES=<dossier d'images>"]
fn real_images_round_trip() {
    let dir = std::env::var("ROOMBOARD_EXEMPLES").expect("ROOMBOARD_EXEMPLES");
    let mut files: Vec<PathBuf> = std::fs::read_dir(&dir)
        .expect("dossier")
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_file())
        .collect();
    files.sort();
    assert!(!files.is_empty(), "aucun fichier dans {dir}");
    let mut d = Document::blank();
    let p = first(&d);
    let mut store = Vec::new();
    for f in &files {
        let bytes = std::fs::read(f).expect("lecture");
        let asset = AssetRef {
            id: sha256_hex(&bytes),
            name: f.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default(),
            mime: mime_of(f).into(),
            size: bytes.len() as f64,
        };
        d.apply(Command::AddImage { page: p.clone(), asset, w: 100.0, h: 100.0, matrix: IDENTITY }).expect("image");
        store.push(bytes);
    }
    let file = pack(&d, &store);
    let (back, assets) = unpack(&file);
    for b in &store {
        assert_eq!(assets.iter().find(|(id, _)| *id == sha256_hex(b)).map(|(_, x)| x), Some(b));
    }
    assert!(pack(&back, &store) == file);
    println!(
        "essai réel : {} fichiers, {} assets distincts, fichier de {} octets, aller-retour octet pour octet OK",
        files.len(),
        assets.len(),
        file.len()
    );
}
