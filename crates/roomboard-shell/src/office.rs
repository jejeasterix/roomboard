//! Conversion Office en PDF (C16) : fondations.
use std::ffi::OsString;
use std::fs;
use std::path::{Path, PathBuf};

#[cfg(test)]
mod tests {
    use super::*;

    pub(super) fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-office-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[cfg(unix)]
    pub(super) fn executable(p: &Path, body: &str) -> PathBuf {
        use std::os::unix::fs::PermissionsExt;
        fs::write(p, body).unwrap();
        fs::set_permissions(p, fs::Permissions::from_mode(0o755)).unwrap();
        p.to_path_buf()
    }

    /// O1, O2, Review Focus 1 : extension en minuscules quelle que soit la casse ; en-tête ZIP pour OOXML et ODF, CFB
    /// pour `.doc`, `.xls`, `.ppt`.
    #[test]
    fn office_extension_and_magic() {
        assert_eq!(office_extension(Path::new("/x/COURS.DOCX")).as_deref(), Some("docx"));
        assert_eq!(office_extension(Path::new("notes.Xlsm")).as_deref(), Some("xlsm"));
        assert_eq!(office_extension(Path::new("x.pdf")), None);
        assert_eq!(office_extension(Path::new("docx")), None);
        assert!(has_office_magic("pptx", b"PK\x03\x04rest"));
        assert!(!has_office_magic("pptx", &CFB_MAGIC));
        assert!(has_office_magic("doc", &CFB_MAGIC));
        assert!(!has_office_magic("xls", b"PK\x03\x04"));
        assert!(!has_office_magic("docx", b"PK"));
        let mut all: Vec<&str> = OFFICE_EXTENSIONS.to_vec();
        all.sort_unstable();
        assert_eq!(all, ["doc", "docx", "odp", "ods", "odt", "ppt", "pptx", "xls", "xlsm", "xlsx"]);
    }

    /// O14 : codes rendus à la page, stables.
    #[test]
    fn error_codes_are_stable() {
        let all = [
            (ConvertError::NotOffice, "not-office"),
            (ConvertError::NotGranted, "not-granted"),
            (ConvertError::TooLarge, "too-large"),
            (ConvertError::NoProgram, "no-program"),
            (ConvertError::Timeout, "timeout"),
            (ConvertError::Failed("x".into()), "failed"),
            (ConvertError::NoOutput, "no-output"),
            (ConvertError::Io("y".into()), "io"),
        ];
        for (e, code) in all {
            assert_eq!(e.code(), code);
        }
        assert_eq!(ConvertError::Failed("Error: source".into()).to_string(), "failed : Error: source");
    }

    /// O7 (S2) : `soffice` du PATH d'abord, puis `libreoffice`, fichier ordinaire exécutable exigé ; puis les chemins
    /// connus ; rien : `None` (la commande rend alors `no-program`).
    #[cfg(unix)]
    #[test]
    fn find_converter_prefers_path_then_known_paths() {
        let d = dir("recherche");
        let (a, b, c) = (d.join("a"), d.join("b"), d.join("c"));
        for x in [&a, &b, &c] {
            fs::create_dir(x).unwrap();
        }
        fs::write(a.join("soffice"), b"#!/bin/sh\n").unwrap(); // non exécutable : ignoré
        let lo = executable(&b.join("libreoffice"), "#!/bin/sh\n");
        fs::create_dir(c.join("soffice")).unwrap(); // dossier : ignoré
        let path = std::env::join_paths([&a, &c, &b]).unwrap();
        let search = |path: Option<OsString>, known: Vec<PathBuf>| find_converter(&Search { path, known });
        assert_eq!(search(Some(path.clone()), vec![]), Some(Converter::LibreOffice(lo)));
        let so = executable(&b.join("soffice"), "#!/bin/sh\n");
        assert_eq!(search(Some(path), vec![]), Some(Converter::LibreOffice(so)));
        let known = executable(&d.join("connu"), "#!/bin/sh\n");
        let only_a = std::env::join_paths([&a]).unwrap();
        assert_eq!(
            search(Some(only_a.clone()), vec![d.join("absent"), c.join("soffice"), known.clone()]),
            Some(Converter::LibreOffice(known))
        );
        assert_eq!(search(Some(only_a), vec![d.join("absent")]), None);
        assert_eq!(search(None, vec![]), None);
    }

    /// O8 : URL du profil (espaces, `%`, `#`, non ASCII), lecteur Windows et préfixe `\\?\` de `canonicalize`.
    #[test]
    fn file_url_escapes_and_handles_windows_drives() {
        assert_eq!(file_url(Path::new("/tmp/a b/%#é")), "file:///tmp/a%20b/%25%23%C3%A9");
        assert_eq!(file_url(Path::new(r"C:\Users\a b\profil")), "file:///C:/Users/a%20b/profil");
        assert_eq!(file_url(Path::new(r"\\?\C:\x\profil")), "file:///C:/x/profil");
    }

    /// O8 : liste fixe, le profil en URL, l'entrée en dernier ; aucun nom d'origine (l'entrée est `source.<ext>`).
    #[cfg(unix)]
    #[test]
    fn libreoffice_args_are_a_fixed_list() {
        let a = libreoffice_args(
            Path::new("/w/1-0/source.docx"),
            Path::new("/w/1-0"),
            Path::new("/w/1-0/profil"),
        );
        let want = [
            "--headless",
            "--invisible",
            "--norestore",
            "--nolockcheck",
            "--nodefault",
            "--nologo",
            "-env:UserInstallation=file:///w/1-0/profil",
            "--convert-to",
            "pdf",
            "--outdir",
            "/w/1-0",
            "/w/1-0/source.docx",
        ];
        assert_eq!(a, want.map(OsString::from).to_vec());
    }

    /// O9 : dossier créé en 0700 ; un dossier existant plus ouvert est resserré.
    #[cfg(unix)]
    #[test]
    fn private_dir_is_created_0700_and_tightened() {
        use std::os::unix::fs::PermissionsExt;
        let d = dir("prive");
        let new = d.join("neuf");
        ensure_private_dir(&new).expect("créé");
        assert_eq!(fs::metadata(&new).unwrap().permissions().mode() & 0o777, 0o700);
        let open = d.join("ouvert");
        fs::create_dir(&open).unwrap();
        fs::set_permissions(&open, fs::Permissions::from_mode(0o755)).unwrap();
        ensure_private_dir(&open).expect("resserré");
        assert_eq!(fs::metadata(&open).unwrap().permissions().mode() & 0o777, 0o700);
    }

    /// O9 (S2) : un lien symbolique, un fichier, ou un dossier d'un autre propriétaire ne sert jamais de dossier de travail.
    #[cfg(unix)]
    #[test]
    fn private_dir_refuses_symlink_file_and_foreign_owner() {
        let d = dir("refus");
        let target = d.join("cible");
        fs::create_dir(&target).unwrap();
        let link = d.join("lien");
        std::os::unix::fs::symlink(&target, &link).unwrap();
        assert!(matches!(ensure_private_dir(&link), Err(ConvertError::Io(_))));
        let file = d.join("fichier");
        fs::write(&file, b"x").unwrap();
        assert!(matches!(ensure_private_dir(&file), Err(ConvertError::Io(_))));
        // Jamais sous root : le contrôle du propriétaire passerait et `/usr` serait resserré en 0700.
        // SAFETY : lecture de l'identifiant effectif, sans effet.
        if unsafe { libc::geteuid() } != 0 {
            assert!(
                matches!(ensure_private_dir(Path::new("/usr")), Err(ConvertError::Io(_))),
                "/usr appartient à root"
            );
        }
    }

    /// O10 (S1) : le profil écrit porte les six valeurs (macros coupées, liens jamais mis à jour, formules jamais
    /// recalculées au chargement).
    #[test]
    fn profile_has_the_six_values() {
        let d = dir("profil");
        write_profile(&d.join("profil")).expect("profil");
        let xcu = fs::read_to_string(d.join("profil").join("user").join("registrymodifications.xcu")).expect("xcu");
        for (path, name, value) in [
            ("/org.openoffice.Office.Common/Security/Scripting", "MacroSecurityLevel", "3"),
            ("/org.openoffice.Office.Common/Security/Scripting", "DisableMacrosExecution", "true"),
            ("/org.openoffice.Office.Calc/Content/Update", "Link", "1"),
            ("/org.openoffice.Office.Writer/Content/Update", "Link", "1"),
            ("/org.openoffice.Office.Calc/Formula/Load", "OOXMLRecalcMode", "1"),
            ("/org.openoffice.Office.Calc/Formula/Load", "ODFRecalcMode", "1"),
        ] {
            let item = format!(
                r#"<item oor:path="{path}"><prop oor:name="{name}" oor:op="fuse"><value>{value}</value></prop></item>"#
            );
            assert!(xcu.contains(&item), "{path} {name} = {value} absent");
        }
    }
}
