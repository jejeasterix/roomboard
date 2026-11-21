//! Copies des originaux (C16) : module en construction.
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};
use crate::office::ConvertError;

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
        assert_eq!(safe_name("Leçon 3 — été.pptx").as_deref(), Some("Leçon 3 _ été.pptx"));
        assert_eq!(safe_name("-x; $(touch pwn).docx").as_deref(), Some("x_ __touch pwn_.docx"));
        assert_eq!(safe_name(" ..cours.docx. ").as_deref(), Some("cours.docx"));
        for r in ["CON.docx", "con.DOCX", "Nul.xlsx", "COM1.pptx", "lpt9.doc", "AUX", "prn .odt"] {
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
        assert_eq!(decode_name("Le%C3%A7on%203.pptx").as_deref(), Some("Leçon 3.pptx"));
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
            assert_eq!(o.write(name, bytes).err(), Some(ConvertError::NotOffice), "{name}");
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
        assert_eq!(fs::metadata(d.join("originaux")).unwrap().permissions().mode() & 0o777, 0o700);
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
        assert!(o.changed().is_empty(), "premier relevé du changement : peut-être en cours d'écriture");
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
}
