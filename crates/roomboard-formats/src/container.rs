//! Conteneur `.roomboard` avec assets (U4, K11, K12, DAK1) : n'écrit et ne lit que les entrées
//! `assets/<sha256>.<ext>` ; le manifeste et `document.ybin` passent par le cœur (`format::write_parts`,
//! `format::open`), jamais recopiés ici.
use std::collections::BTreeMap;
use std::io::{Read, Write};

use roomboard_core::asset::is_asset_id;
use roomboard_core::format::{self, FormatError, Parts};
use sha2::{Digest, Sha256};

pub const ASSETS_DIR: &str = "assets/";

/// (type MIME, extension, stored) : « stored » pour les contenus déjà compressés (K12).
const TYPES: [(&str, &str, bool); 14] = [
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
];

#[derive(Debug, Clone, Copy)]
pub struct AssetBytes<'a> {
    pub id: &'a str,
    pub mime: &'a str,
    pub bytes: &'a [u8],
}

#[derive(Debug, Clone, PartialEq)]
pub struct Unpacked {
    pub parts: Parts,
    /// Triés par empreinte.
    pub assets: Vec<(String, Vec<u8>)>,
    /// Entrées `assets/` ignorées, en français (K11, HK3).
    pub warnings: Vec<String>,
}

/// Empreinte SHA-256 en hexadécimal minuscule (64 caractères).
pub fn sha256_hex(bytes: &[u8]) -> String {
    Sha256::digest(bytes)
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

/// Extension et méthode d'une entrée ; `bin` et deflate pour un type inconnu.
pub fn extension(mime: &str) -> (&'static str, bool) {
    TYPES
        .iter()
        .find(|(m, _, _)| *m == mime)
        .map_or(("bin", false), |(_, ext, stored)| (*ext, *stored))
}

fn corrupt<E: std::fmt::Display>(e: E) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

/// Écrit `parts` puis les assets triés par empreinte, chacun une fois ; empreinte recalculée : un écart refuse
/// l'enregistrement (arbitrage I2), jamais un fichier qui perdrait l'asset à la relecture.
pub fn write(parts: &Parts, assets: &[AssetBytes<'_>]) -> Result<Vec<u8>, FormatError> {
    let mut sorted: BTreeMap<&str, AssetBytes<'_>> = BTreeMap::new();
    for a in assets {
        if !is_asset_id(a.id) {
            return Err(FormatError::Corrupt(format!(
                "empreinte d'asset invalide : {}",
                a.id
            )));
        }
        if sha256_hex(a.bytes) != a.id {
            return Err(FormatError::Corrupt(format!(
                "le contenu de l'asset {} ne correspond pas à son empreinte",
                a.id
            )));
        }
        // Doublon : le plus petit type MIME gagne, quel que soit l'ordre reçu.
        sorted
            .entry(a.id)
            .and_modify(|cur| {
                if a.mime < cur.mime {
                    *cur = *a;
                }
            })
            .or_insert(*a);
    }
    let mut w = format::write_parts(parts)?;
    for (id, a) in sorted {
        let (ext, stored) = extension(a.mime);
        w.start_file(
            format!("{ASSETS_DIR}{id}.{ext}"),
            format::entry_options(stored),
        )
        .map_err(corrupt)?;
        w.write_all(a.bytes).map_err(corrupt)?;
    }
    Ok(w.finish().map_err(corrupt)?.into_inner())
}

/// Lit un `.roomboard` : `format::open` (manifeste contrôlé avant `document.ybin`), puis les seules entrées
/// `assets/<id>.<ext>` ; empreinte recalculée ; écart, nom invalide, sous-dossier ou doublon : ignoré avec un
/// avertissement ; autres entrées ignorées (HK9).
pub fn read(file: &[u8]) -> Result<Unpacked, FormatError> {
    let format::Opened {
        mut archive, parts, ..
    } = format::open(file)?;
    let names: Vec<String> = archive
        .file_names()
        .filter_map(|n| n.ok().map(|n| n.into_owned()))
        .filter(|n| n.starts_with(ASSETS_DIR))
        .collect();
    let mut assets: BTreeMap<String, Vec<u8>> = BTreeMap::new();
    let mut warnings = Vec::new();
    for name in names {
        let rest = &name[ASSETS_DIR.len()..];
        let id = rest.split_once('.').map_or(rest, |(id, _)| id);
        if rest.contains('/') || !is_asset_id(id) {
            warnings.push(format!("entrée ignorée : {name} (nom d'asset invalide)"));
            continue;
        }
        let mut bytes = Vec::new();
        let read_ok = archive
            .by_name(&name)
            .map_err(|e| e.to_string())
            .and_then(|mut f| f.read_to_end(&mut bytes).map_err(|e| e.to_string()));
        if let Err(e) = read_ok {
            warnings.push(format!("asset ignoré : {name} (illisible : {e})"));
            continue;
        }
        if sha256_hex(&bytes) != id {
            warnings.push(format!(
                "asset ignoré : {name} (contenu différent de son empreinte)"
            ));
            continue;
        }
        if assets.contains_key(id) {
            warnings.push(format!("asset ignoré : {name} (empreinte en double)"));
            continue;
        }
        assets.insert(id.to_string(), bytes);
    }
    Ok(Unpacked {
        parts,
        assets: assets.into_iter().collect(),
        warnings,
    })
}
