//! Format natif `.roomboard` (D24, D25, DA3) : ZIP { manifest.json, document.ybin = état Yrs complet en v1 },
//! dossier `assets/` réservé (vide au socle). Dates des entrées ZIP fixes (1980-01-01) ; l'heure et la version de
//! l'application viennent de l'appelant. `formatVersion` = disposition du conteneur ; `schema` = schéma du document.
use std::io::{Cursor, Read, Write};

use serde::{Deserialize, Serialize};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, DateTime, ZipArchive, ZipWriter};

use crate::document::{DecodeError, Document};
use crate::element::SCHEMA;

pub const FORMAT: &str = "roomboard";
pub const FORMAT_VERSION: u32 = 1;
pub const EXTENSION: &str = "roomboard";
pub const MIME: &str = "application/x-roomboard";
pub const MANIFEST: &str = "manifest.json";
pub const DOCUMENT: &str = "document.ybin";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    pub format: String,
    pub format_version: u32,
    pub schema: u32,
    pub app_version: String,
    pub created: String,
    pub modified: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SaveMeta {
    pub app_version: String,
    /// RFC 3339, fourni par la page (le cœur n'a pas d'horloge).
    pub now: String,
    /// Date de création d'un fichier rouvert ; `None` = nouveau fichier.
    pub created: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum FormatError {
    NotRoomboard,
    NewerVersion { found: u32, supported: u32 },
    Corrupt(String),
}

impl std::fmt::Display for FormatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FormatError::NotRoomboard => write!(f, "ce fichier n'est pas un document RoomBoard"),
            FormatError::NewerVersion { found, supported } => write!(
                f,
                "document créé par une version plus récente de RoomBoard (version {found}, celle-ci lit jusqu'à la {supported})"
            ),
            FormatError::Corrupt(m) => write!(f, "document RoomBoard endommagé : {m}"),
        }
    }
}

impl std::error::Error for FormatError {}

/// Options de toute entrée écrite : deflate, date DOS fixe (1980-01-01 00:00) — jamais l'heure courante (D25).
fn options() -> SimpleFileOptions {
    SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .last_modified_time(DateTime::default())
}

fn zip_err(e: zip::result::ZipError) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

fn io_err(e: std::io::Error) -> FormatError {
    FormatError::Corrupt(e.to_string())
}

/// Enregistre `doc` : `schema` du manifeste recopié de `meta.schema` ; l'heure vient de `meta` (D24).
pub fn save(doc: &Document, meta: &SaveMeta) -> Result<Vec<u8>, FormatError> {
    let schema = doc
        .schema()
        .ok_or_else(|| FormatError::Corrupt("meta.schema absent".into()))? as u32;
    let manifest = Manifest {
        format: FORMAT.into(),
        format_version: FORMAT_VERSION,
        schema,
        app_version: meta.app_version.clone(),
        created: meta.created.clone().unwrap_or_else(|| meta.now.clone()),
        modified: meta.now.clone(),
    };
    let json =
        serde_json::to_vec_pretty(&manifest).map_err(|e| FormatError::Corrupt(e.to_string()))?;
    let mut w = ZipWriter::new(Cursor::new(Vec::new()));
    w.start_file(MANIFEST, options()).map_err(zip_err)?;
    w.write_all(&json).map_err(io_err)?;
    w.start_file(DOCUMENT, options()).map_err(zip_err)?;
    w.write_all(&doc.encode_v1()).map_err(io_err)?;
    Ok(w.finish().map_err(zip_err)?.into_inner())
}

pub fn load(bytes: &[u8]) -> Result<Document, FormatError> {
    load_with_manifest(bytes).map(|(doc, _)| doc)
}

fn read_entry(archive: &mut ZipArchive<Cursor<&[u8]>>, name: &str) -> Option<Vec<u8>> {
    let mut file = archive.by_name(name).ok()?;
    let mut out = Vec::new();
    file.read_to_end(&mut out).ok()?;
    Some(out)
}

/// Lit un `.roomboard` : `format`, puis `formatVersion`, puis `schema` contrôlés **avant** de décoder
/// `document.ybin` ; `meta.schema` du document doit égaler le `schema` du manifeste (D24 : désaccord = `Corrupt`).
pub fn load_with_manifest(bytes: &[u8]) -> Result<(Document, Manifest), FormatError> {
    let mut archive = ZipArchive::new(Cursor::new(bytes)).map_err(|_| FormatError::NotRoomboard)?;
    let raw = read_entry(&mut archive, MANIFEST).ok_or(FormatError::NotRoomboard)?;
    let manifest: Manifest = serde_json::from_slice(&raw)
        .map_err(|e| FormatError::Corrupt(format!("manifeste illisible : {e}")))?;
    if manifest.format != FORMAT {
        return Err(FormatError::NotRoomboard);
    }
    if manifest.format_version > FORMAT_VERSION {
        return Err(FormatError::NewerVersion {
            found: manifest.format_version,
            supported: FORMAT_VERSION,
        });
    }
    if manifest.schema > SCHEMA {
        return Err(FormatError::NewerVersion {
            found: manifest.schema,
            supported: SCHEMA,
        });
    }
    let ybin = read_entry(&mut archive, DOCUMENT)
        .ok_or_else(|| FormatError::Corrupt(format!("{DOCUMENT} absent")))?;
    let (manifest, ybin) = migrate(manifest, ybin)?;
    let doc = Document::from_update_v1(&ybin).map_err(|e| match e {
        DecodeError::Update(m) => FormatError::Corrupt(format!("état illisible : {m}")),
        DecodeError::Schema { found } => FormatError::Corrupt(format!(
            "schéma du document {found:?} différent du manifeste ({})",
            manifest.schema
        )),
    })?;
    if doc.schema() != Some(f64::from(manifest.schema)) {
        return Err(FormatError::Corrupt(
            "schéma du document différent du manifeste".into(),
        ));
    }
    Ok((doc, manifest))
}

/// Migration (D24) : appelée pour toute version ≤ la version connue. Rien à migrer en v1 ; une version < 1 n'a
/// jamais existé : `Corrupt`.
pub fn migrate(manifest: Manifest, ybin: Vec<u8>) -> Result<(Manifest, Vec<u8>), FormatError> {
    if manifest.format_version < 1 || manifest.schema < 1 {
        return Err(FormatError::Corrupt(format!(
            "version inconnue : format {}, schéma {}",
            manifest.format_version, manifest.schema
        )));
    }
    Ok((manifest, ybin))
}

#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Doc, Map, ReadTxn, StateVector, Transact};

    fn meta() -> SaveMeta {
        SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-16T12:00:00Z".into(),
            created: None,
        }
    }

    fn zip_of(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        for (name, bytes) in entries {
            w.start_file(*name, entry_options(false)).expect("entrée");
            w.write_all(bytes).expect("écriture");
        }
        w.finish().expect("fin").into_inner()
    }

    fn manifest_json(format: &str, format_version: u32, schema: u32) -> Vec<u8> {
        serde_json::to_vec(&Manifest {
            format: format.into(),
            format_version,
            schema,
            app_version: "0.1.0".into(),
            created: "c".into(),
            modified: "m".into(),
        })
        .expect("json")
    }

    #[test]
    fn save_then_load_keeps_pages() {
        let mut d = Document::blank();
        d.add_page();
        let e = load(&save(&d, &meta()).expect("save")).expect("load");
        assert_eq!(e.page_ids(), d.page_ids());
    }

    #[test]
    fn manifest_fields_are_written() {
        let (_, m) =
            load_with_manifest(&save(&Document::blank(), &meta()).expect("save")).expect("load");
        assert_eq!(m.format, "roomboard");
        assert_eq!((m.format_version, m.schema), (1, 1));
        assert_eq!(m.app_version, "0.1.0");
        assert_eq!(
            (m.created.as_str(), m.modified.as_str()),
            ("2026-11-16T12:00:00Z", "2026-11-16T12:00:00Z")
        );
    }

    #[test]
    fn created_is_kept_when_given() {
        let m = SaveMeta {
            created: Some("2026-01-01T00:00:00Z".into()),
            ..meta()
        };
        let (_, man) =
            load_with_manifest(&save(&Document::blank(), &m).expect("save")).expect("load");
        assert_eq!(man.created, "2026-01-01T00:00:00Z");
        assert_eq!(man.modified, "2026-11-16T12:00:00Z");
    }

    #[test]
    fn manifest_json_is_camel_case() {
        let bytes = save(&Document::blank(), &meta()).expect("save");
        let mut a = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("zip");
        let mut s = String::new();
        a.by_name(MANIFEST)
            .expect("manifeste")
            .read_to_string(&mut s)
            .expect("lecture");
        assert!(
            s.contains("\"formatVersion\"") && s.contains("\"appVersion\""),
            "{s}"
        );
    }

    #[test]
    fn loaded_document_cannot_undo() {
        let mut d = Document::blank();
        d.add_page();
        let e = load(&save(&d, &meta()).expect("save")).expect("load");
        assert!(!e.can_undo());
    }

    #[test]
    fn garbage_is_not_roomboard() {
        assert_eq!(load(b"pas un zip").err(), Some(FormatError::NotRoomboard));
    }

    #[test]
    fn zip_without_manifest_is_not_roomboard() {
        assert_eq!(
            load(&zip_of(&[("autre.txt", b"x")])).err(),
            Some(FormatError::NotRoomboard)
        );
    }

    #[test]
    fn other_format_name_is_not_roomboard() {
        let z = zip_of(&[(MANIFEST, &manifest_json("flipx", 1, 1)), (DOCUMENT, b"")]);
        assert_eq!(load(&z).err(), Some(FormatError::NotRoomboard));
    }

    #[test]
    fn newer_format_version_is_refused() {
        let z = zip_of(&[
            (MANIFEST, &manifest_json("roomboard", 2, 1)),
            (DOCUMENT, b""),
        ]);
        let err = load(&z).err().expect("refus");
        assert_eq!(
            err,
            FormatError::NewerVersion {
                found: 2,
                supported: 1
            }
        );
        assert!(err.to_string().contains("plus récente"));
    }

    #[test]
    fn newer_schema_is_refused() {
        let z = zip_of(&[
            (MANIFEST, &manifest_json("roomboard", 1, 7)),
            (DOCUMENT, b""),
        ]);
        assert_eq!(
            load(&z).err(),
            Some(FormatError::NewerVersion {
                found: 7,
                supported: 1
            })
        );
    }

    #[test]
    fn format_version_zero_is_corrupt() {
        let z = zip_of(&[
            (MANIFEST, &manifest_json("roomboard", 0, 1)),
            (DOCUMENT, &Document::blank().encode_v1()),
        ]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn missing_document_is_corrupt() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 1, 1))]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn corrupt_ybin_is_corrupt() {
        let z = zip_of(&[
            (MANIFEST, &manifest_json("roomboard", 1, 1)),
            (DOCUMENT, &[0xff, 0x01, 0x02]),
        ]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    #[test]
    fn schema_mismatch_is_corrupt() {
        let doc = Doc::new();
        let m = doc.get_or_insert_map("meta");
        m.insert(&mut doc.transact_mut(), "schema", 2.0);
        let ybin = doc
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        let z = zip_of(&[
            (MANIFEST, &manifest_json("roomboard", 1, 1)),
            (DOCUMENT, &ybin),
        ]);
        assert!(matches!(load(&z).err(), Some(FormatError::Corrupt(_))));
    }

    fn with_strokes() -> Document {
        use crate::commands::Command;
        use crate::element::StrokeStyle;
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        for (k, w) in [2.0_f32, 4.0, 6.5].into_iter().enumerate() {
            let pts: Vec<f32> = (0..20)
                .flat_map(|i| [i as f32 * 5.0, 10.0 + k as f32 * 30.0, 0.5])
                .collect();
            d.apply(Command::CommitStroke {
                page: p.clone(),
                points: pts,
                style: StrokeStyle {
                    color: format!("#00{k}"),
                    width: w,
                },
            })
            .expect("trait");
        }
        d
    }

    #[test]
    fn save_is_deterministic() {
        let d = Document::blank();
        assert_eq!(save(&d, &meta()).expect("1"), save(&d, &meta()).expect("2"));
        let d = with_strokes();
        assert_eq!(save(&d, &meta()).expect("1"), save(&d, &meta()).expect("2"));
    }

    /// Garde D25 : chaque rechargement reconstruit les valeurs yrs ; un `Any::Map` (HashMap std, graine aléatoire)
    /// s'y réencoderait dans un autre ordre. Trente rechargements d'un document à traits donnent les mêmes octets.
    #[test]
    fn reload_with_strokes_keeps_bytes() {
        let d = with_strokes();
        let ybin = d.encode_v1();
        let file = save(&d, &meta()).expect("save");
        for i in 0..30 {
            let reloaded = load(&file).expect("load");
            assert!(
                reloaded.encode_v1() == ybin,
                "ybin différent au rechargement {i}"
            );
            assert!(
                save(&reloaded, &meta()).expect("resave") == file,
                "fichier différent au rechargement {i}"
            );
        }
    }

    /// Garde D25 : deux enregistrements dans la même fenêtre DOS de 2 s donnent les mêmes octets même avec une
    /// horloge ; seule la date relue de chaque entrée prouve qu'aucune heure courante n'entre dans le fichier.
    #[test]
    fn zip_entries_have_fixed_date() {
        let mut d = Document::blank();
        d.add_page();
        let bytes = save(&d, &meta()).expect("save");
        let mut a = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("zip");
        assert_eq!(a.len(), 2, "manifest.json et document.ybin seulement");
        for i in 0..a.len() {
            let f = a.by_index(i).expect("entrée");
            let date = f.last_modified();
            assert!(
                date == Some(DateTime::default()),
                "{} daté {}, attendu 1980-01-01 00:00:00",
                f.name().map(|n| n.to_string()).unwrap_or_default(),
                date.map(|x| x.to_string())
                    .unwrap_or_else(|| "sans date".into())
            );
        }
    }

    #[test]
    fn save_is_write_parts_of_save_parts() {
        let d = with_strokes();
        let parts = save_parts(&d, &meta()).expect("parts");
        let via = write_parts(&parts)
            .expect("écrivain")
            .finish()
            .expect("fin")
            .into_inner();
        assert!(via == save(&d, &meta()).expect("save"));
    }

    #[test]
    fn load_parts_reads_save_parts() {
        let d = with_strokes();
        let parts = save_parts(&d, &meta()).expect("parts");
        let (e, m) = load_parts(&parts.manifest, &parts.ybin).expect("load_parts");
        assert_eq!(e.page_ids(), d.page_ids());
        assert!(e.encode_v1() == d.encode_v1());
        assert_eq!((m.format_version, m.schema), (1, 1));
    }

    #[test]
    fn open_gives_checked_manifest_and_both_parts() {
        let d = with_strokes();
        let file = save(&d, &meta()).expect("save");
        let o = open(&file).expect("open");
        assert_eq!(o.parts, save_parts(&d, &meta()).expect("parts"));
        assert_eq!(o.manifest.format, FORMAT);
        assert_eq!(o.archive.len(), 2);
    }

    /// Arbitrage I1 : le manifeste est contrôlé avant de chercher `document.ybin` ; jamais `Corrupt` ici.
    #[test]
    fn newer_format_version_without_document_is_newer() {
        let z = zip_of(&[(MANIFEST, &manifest_json("roomboard", 2, 1))]);
        let newer = Some(FormatError::NewerVersion {
            found: 2,
            supported: 1,
        });
        assert_eq!(load(&z).err(), newer);
        assert_eq!(open(&z).err(), newer);
    }

    #[test]
    fn load_parts_checks_manifest_first() {
        assert_eq!(
            load_parts(&manifest_json("roomboard", 2, 1), b"").err(),
            Some(FormatError::NewerVersion {
                found: 2,
                supported: 1
            })
        );
        assert_eq!(
            load_parts(&manifest_json("flipx", 1, 1), b"").err(),
            Some(FormatError::NotRoomboard)
        );
        assert!(matches!(
            load_parts(b"{", b"").err(),
            Some(FormatError::Corrupt(_))
        ));
        assert!(matches!(
            load_parts(&manifest_json("roomboard", 1, 1), &[0xff, 0x01]).err(),
            Some(FormatError::Corrupt(_))
        ));
    }

    #[test]
    fn entry_options_sets_method_and_fixed_date() {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        w.start_file("a.png", entry_options(true)).expect("a");
        w.write_all(&[7u8; 300]).expect("écriture a");
        w.start_file("b.svg", entry_options(false)).expect("b");
        w.write_all(&[7u8; 300]).expect("écriture b");
        let bytes = w.finish().expect("fin").into_inner();
        let mut a = ZipArchive::new(Cursor::new(bytes.as_slice())).expect("zip");
        for (name, method) in [
            ("a.png", CompressionMethod::Stored),
            ("b.svg", CompressionMethod::Deflated),
        ] {
            let f = a.by_name(name).expect("entrée");
            assert_eq!(f.compression(), method, "{name}");
            assert!(f.last_modified() == Some(DateTime::default()), "{name}");
        }
    }
}
