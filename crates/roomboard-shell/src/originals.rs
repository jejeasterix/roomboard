//! Copies des originaux ouverts par « Modifier dans l'application d'origine » (C16, O20, O21, O23, DA-O3, DA-O4) :
//! nom par liste blanche, extension et en-tête Office exigés, dossier privé, marque Internet sous Windows ; relevé de la
//! taille et de la date des seules copies écrites ici (aucun `watch`, aucune permission pour la page).
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

use crate::office::{
    ensure_private_dir, has_office_magic, io, office_extension, ConvertError, MAX_ID_TRIES,
    OFFICE_MAX_BYTES,
};

/// Longueur maximale d'un nom de copie, en caractères (O20).
pub const NAME_MAX_CHARS: usize = 120;
/// Noms réservés de Windows (sans tenir compte de la casse ni de l'extension).
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// Nom de copie sûr (O20) ; `None` s'il est vide ou réservé.
pub fn safe_name(name: &str) -> Option<String> {
    let mapped: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, '-' | '_' | '.' | ' ') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let mut s = mapped
        .trim_start_matches(['-', '.', ' '])
        .trim_end_matches(['.', ' '])
        .to_string();
    if s.chars().count() > NAME_MAX_CHARS {
        let (stem, ext) = match s.rfind('.') {
            Some(i) => (&s[..i], &s[i..]),
            None => (s.as_str(), ""),
        };
        let keep = NAME_MAX_CHARS.saturating_sub(ext.chars().count());
        let cut: String = stem.chars().take(keep).collect();
        s = format!("{}{ext}", cut.trim_end_matches(['.', ' ']));
    }
    if s.is_empty() {
        return None;
    }
    let stem = s
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end()
        .to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        return None;
    }
    Some(s)
}

/// Nom reçu dans l'en-tête `x-roomboard-name`, encodé en pourcentage ; `None` si l'encodage ou l'UTF-8 est faux.
pub fn decode_name(header: &str) -> Option<String> {
    let b = header.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' {
            let hex = header.get(i + 1..i + 3)?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            i += 3;
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    String::from_utf8(out).ok()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Stamp {
    len: u64,
    modified: Option<SystemTime>,
}

fn stamp_of(p: &Path) -> Option<Stamp> {
    let m = fs::metadata(p).ok()?;
    Some(Stamp {
        len: m.len(),
        modified: m.modified().ok(),
    })
}

struct Watched {
    name: String,
    path: PathBuf,
    /// Dernier état dit (ou celui de l'écriture).
    base: Option<Stamp>,
    /// État du relevé précédent.
    seen: Option<Stamp>,
}

/// Copies écrites par la coque et leur relevé (O20, O21).
pub struct Originals {
    root: PathBuf,
    next: AtomicU64,
    files: Mutex<HashMap<String, Watched>>,
}

impl Originals {
    pub fn new(root: PathBuf) -> Self {
        Originals {
            root,
            next: AtomicU64::new(0),
            files: Mutex::new(HashMap::new()),
        }
    }

    fn files(&self) -> std::sync::MutexGuard<'_, HashMap<String, Watched>> {
        self.files.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Écrit `<racine>/<id>/<nom assaini>` (O20) : nom sûr, extension Office, en-tête ZIP ou CFB, 100 Mio au plus ;
    /// racine privée ; marque Internet sous Windows (mode protégé d'Office, HO1-7). Rend l'id et le chemin.
    pub fn write(&self, name: &str, bytes: &[u8]) -> Result<(String, PathBuf), ConvertError> {
        let safe = safe_name(name).ok_or(ConvertError::NotOffice)?;
        let ext = office_extension(Path::new(&safe)).ok_or(ConvertError::NotOffice)?;
        if !has_office_magic(&ext, bytes) {
            return Err(ConvertError::NotOffice);
        }
        if bytes.len() as u64 > OFFICE_MAX_BYTES {
            return Err(ConvertError::TooLarge);
        }
        if let Some(parent) = self.root.parent() {
            fs::create_dir_all(parent).map_err(io)?;
        }
        ensure_private_dir(&self.root)?;
        let mut made = None;
        for _ in 0..MAX_ID_TRIES {
            let id = format!(
                "{}-{}",
                std::process::id(),
                self.next.fetch_add(1, Ordering::Relaxed)
            );
            let dir = self.root.join(&id);
            match fs::create_dir(&dir) {
                Ok(()) => {
                    made = Some((id, dir));
                    break;
                }
                Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(e) => return Err(io(e)),
            }
        }
        let (id, dir) =
            made.ok_or_else(|| ConvertError::Io("aucun identifiant d'original libre".into()))?;
        let path = dir.join(&safe);
        fs::write(&path, bytes).map_err(io)?;
        #[cfg(windows)]
        mark_internet(&path);
        let stamp = stamp_of(&path);
        self.files().insert(
            id.clone(),
            Watched {
                name: safe,
                path: path.clone(),
                base: stamp,
                seen: stamp,
            },
        );
        Ok((id, path))
    }

    pub fn path_of(&self, id: &str) -> Option<PathBuf> {
        self.files().get(id).map(|w| w.path.clone())
    }

    pub fn name_of(&self, id: &str) -> Option<String> {
        self.files().get(id).map(|w| w.name.clone())
    }

    /// Relevé (O21) : copies dont la taille ou la date a changé et n'a plus bougé depuis le relevé précédent ; chaque
    /// changement est dit une fois. Trié par id.
    pub fn changed(&self) -> Vec<(String, PathBuf)> {
        let mut out = Vec::new();
        for (id, w) in self.files().iter_mut() {
            let now = stamp_of(&w.path);
            if now.is_some() && now != w.base && now == w.seen {
                w.base = now;
                out.push((id.clone(), w.path.clone()));
            }
            w.seen = now;
        }
        out.sort();
        out
    }
}

/// Windows : flux `Zone.Identifier` (`ZoneId=3`, Internet) sur la copie.
#[cfg(windows)]
fn mark_internet(path: &Path) {
    let mut ads = path.as_os_str().to_owned();
    ads.push(":Zone.Identifier");
    let _ = fs::write(PathBuf::from(ads), "[ZoneTransfer]\r\nZoneId=3\r\n");
}

/// Au lancement (O23) : supprime les dossiers de copies plus vieux que `older_than` (date du dossier, mise à jour par
/// chaque enregistrement qui y crée ou renomme un fichier).
pub fn purge(root: &Path, older_than: Duration) {
    let Ok(rd) = fs::read_dir(root) else {
        return;
    };
    let now = SystemTime::now();
    for e in rd.flatten() {
        let Ok(m) = fs::symlink_metadata(e.path()) else {
            continue;
        };
        if !m.is_dir() {
            continue;
        }
        let old = m
            .modified()
            .ok()
            .and_then(|t| now.duration_since(t).ok())
            .is_some_and(|age| age > older_than);
        if old {
            let _ = fs::remove_dir_all(e.path());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-originals-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    /// O20 (S2) : liste blanche, têtes et fins nettoyées, noms réservés de Windows refusés (casse et extension
    /// ignorées), 120 caractères au plus en gardant l'extension.
    #[test]
    fn safe_name_whitelist_reserved_and_length() {
        assert_eq!(safe_name("a/../b<>.docx").as_deref(), Some("a_.._b__.docx"));
        assert_eq!(
            safe_name("Leçon 3 — été.pptx").as_deref(),
            Some("Leçon 3 _ été.pptx")
        );
        assert_eq!(
            safe_name("-x; $(touch pwn).docx").as_deref(),
            Some("x_ __touch pwn_.docx")
        );
        assert_eq!(safe_name(" ..cours.docx. ").as_deref(), Some("cours.docx"));
        for r in [
            "CON.docx",
            "con.DOCX",
            "Nul.xlsx",
            "COM1.pptx",
            "lpt9.doc",
            "AUX",
            "prn .odt",
        ] {
            assert_eq!(safe_name(r), None, "{r}");
        }
        assert_eq!(safe_name(""), None);
        assert_eq!(safe_name("..."), None);
        assert_eq!(safe_name("CONSOLE.docx").as_deref(), Some("CONSOLE.docx"));
        let long = format!("{}.docx", "é".repeat(200));
        let s = safe_name(&long).expect("tronqué");
        assert_eq!(s.chars().count(), NAME_MAX_CHARS);
        assert!(s.ends_with(".docx"));
    }

    /// O20 : l'en-tête `x-roomboard-name` est encodé en pourcentage par la page (`encodeURIComponent`).
    #[test]
    fn decode_name_reads_percent_encoding() {
        assert_eq!(
            decode_name("Le%C3%A7on%203.pptx").as_deref(),
            Some("Leçon 3.pptx")
        );
        assert_eq!(decode_name("cours.docx").as_deref(), Some("cours.docx"));
        assert_eq!(decode_name("bad%2"), None);
        assert_eq!(decode_name("%zz"), None);
        assert_eq!(decode_name("%FF"), None);
    }

    /// O20 (S2, DA-O4) : extension Office et en-tête exigés ; un `.exe`, un `.docx` à en-tête MZ, un `.doc` à en-tête
    /// ZIP ou un nom réservé est refusé ; le nom écrit est le nom assaini.
    #[test]
    fn write_needs_office_extension_and_magic() {
        let d = dir("ecrire");
        let o = Originals::new(d.join("originaux"));
        for (name, bytes) in [
            ("virus.exe", &b"PK\x03\x04"[..]),
            ("cours.docx", &b"MZ\x90\x00"[..]),
            ("vieux.doc", &b"PK\x03\x04"[..]),
            ("CON.docx", &b"PK\x03\x04"[..]),
            ("cours.docx.exe", &b"PK\x03\x04"[..]),
        ] {
            assert_eq!(
                o.write(name, bytes).err(),
                Some(ConvertError::NotOffice),
                "{name}"
            );
        }
        let (id, path) = o.write("a/../cours.docx", b"PK\x03\x04x").expect("écrit");
        assert_eq!(path, d.join("originaux").join(&id).join("a_.._cours.docx"));
        assert_eq!(fs::read(&path).unwrap(), b"PK\x03\x04x");
        assert_eq!(o.path_of(&id), Some(path));
        assert_eq!(o.name_of(&id).as_deref(), Some("a_.._cours.docx"));
        assert_eq!(o.path_of("../x"), None);
    }

    /// O9, O20 : `originaux/` créé en 0700 ; une racine en lien symbolique est refusée, rien n'est écrit dans sa cible.
    #[cfg(unix)]
    #[test]
    fn originals_root_is_private() {
        use std::os::unix::fs::PermissionsExt;
        let d = dir("prive");
        let o = Originals::new(d.join("originaux"));
        o.write("cours.docx", b"PK\x03\x04").expect("écrit");
        assert_eq!(
            fs::metadata(d.join("originaux"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
        let real = d.join("vrai");
        fs::create_dir(&real).unwrap();
        std::os::unix::fs::symlink(&real, d.join("lien")).unwrap();
        assert!(matches!(
            Originals::new(d.join("lien")).write("cours.docx", b"PK\x03\x04"),
            Err(ConvertError::Io(_))
        ));
        assert_eq!(fs::read_dir(&real).unwrap().count(), 0);
    }

    /// O21, Review Focus 5 : un changement est dit après deux relevés égaux, une seule fois ; un second
    /// enregistrement est dit à nouveau ; un enregistrement par fichier temporaire puis renommage est vu.
    #[test]
    fn changed_reports_each_stable_save_once() {
        let d = dir("releve");
        let o = Originals::new(d.join("originaux"));
        let (id, path) = o.write("cours.docx", b"PK\x03\x04v1").expect("écrit");
        assert!(o.changed().is_empty());
        fs::write(&path, b"PK\x03\x04version 2").unwrap();
        assert!(
            o.changed().is_empty(),
            "premier relevé du changement : peut-être en cours d'écriture"
        );
        assert_eq!(o.changed(), vec![(id.clone(), path.clone())]);
        assert!(o.changed().is_empty(), "déjà dit");
        let tmp = path.with_file_name("~cours.tmp");
        fs::write(&tmp, b"PK\x03\x04troisieme version").unwrap();
        fs::rename(&tmp, &path).unwrap();
        assert!(o.changed().is_empty());
        assert_eq!(o.changed(), vec![(id, path)]);
    }

    /// O21 : un fichier absent pendant un renommage n'est pas un changement ; un id inconnu n'a ni chemin ni nom.
    #[test]
    fn changed_ignores_unknown_and_missing_files() {
        let d = dir("absent");
        let o = Originals::new(d.join("originaux"));
        let (id, path) = o.write("notes.xlsx", b"PK\x03\x04").expect("écrit");
        fs::remove_file(&path).unwrap();
        assert!(o.changed().is_empty());
        assert!(o.changed().is_empty());
        fs::write(&path, b"PK\x03\x04").unwrap();
        assert!(o.changed().is_empty());
        assert_eq!(o.name_of("9-9"), None);
        assert!(o.path_of(&id).is_some());
    }

    /// O23 : copies purgées au lancement au-delà de 7 jours ; les récentes restent.
    #[cfg(unix)]
    #[test]
    fn purge_removes_old_copies_only() {
        let d = dir("purge");
        let root = d.join("originaux");
        let (old, recent) = (root.join("1-0"), root.join("1-1"));
        for p in [&old, &recent] {
            fs::create_dir_all(p).unwrap();
        }
        let week = Duration::from_secs(7 * 24 * 3600);
        fs::File::open(&old)
            .unwrap()
            .set_modified(SystemTime::now() - week - Duration::from_secs(3600))
            .unwrap();
        purge(&root, week);
        assert!(!old.exists());
        assert!(recent.exists());
    }
    /// Revue T12 (2) : un dossier `<pid>-<n>` déjà présent n'échoue pas l'écriture : l'identifiant suivant est pris.
    #[test]
    fn write_skips_existing_id() {
        let d = dir("collision");
        let o = Originals::new(d.join("originaux"));
        let taken = format!("{}-{}", std::process::id(), o.next.load(Ordering::Relaxed));
        fs::create_dir_all(d.join("originaux").join(&taken)).unwrap();
        let (id, path) = o.write("cours.docx", b"PK\x03\x04x").expect("id suivant");
        assert_ne!(id, taken);
        assert!(path.is_file());
    }
}
