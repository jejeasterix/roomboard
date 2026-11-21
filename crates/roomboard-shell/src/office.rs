//! Conversion d'un document Office en PDF (C16, DA-O1) : extensions et en-têtes (O1, O2), recherche du convertisseur
//! (O6, O7), arguments en liste (O8), dossier de travail privé (O9), profil jetable (O10), erreurs (O14). Le lancement,
//! le délai et l'arbre de processus (O11, O12) suivent dans ce module ; la branche COM vit dans `office/com.rs`
//! (`cfg(windows)`). Aucun interpréteur de commandes, jamais une chaîne de commande assemblée.
use std::ffi::OsString;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

#[cfg(windows)]
pub mod com;

/// Extensions prises (O1), sans point, comparées sans tenir compte de la casse.
pub const OFFICE_EXTENSIONS: &[&str] = &[
    "docx", "doc", "odt", "xlsx", "xlsm", "xls", "ods", "pptx", "ppt", "odp",
];
/// Extensions dont le fichier est un ZIP (OOXML, ODF) ; les autres (`doc`, `xls`, `ppt`) sont des CFB (O2).
pub const ZIP_EXTENSIONS: &[&str] = &["docx", "odt", "xlsx", "xlsm", "ods", "pptx", "odp"];
pub const ZIP_MAGIC: [u8; 4] = [0x50, 0x4b, 0x03, 0x04];
pub const CFB_MAGIC: [u8; 8] = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/// Délai d'une conversion (O11, U35).
pub const CONVERT_TIMEOUT: Duration = Duration::from_secs(120);
/// Plafond d'un fichier converti (O14) : 100 Mio, comme `OFFICE_MAX_BYTES` de la page.
pub const OFFICE_MAX_BYTES: u64 = 100 * 1024 * 1024;
/// Octets de `soffice.err` gardés pour le message d'échec (O8).
pub const ERR_KEEP: usize = 2048;

/// Profil jetable (O10) : macros coupées, liens jamais mis à jour, formules jamais recalculées au chargement.
pub const PROFILE_XCU: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Writer/Content/Update"><prop oor:name="Link" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>1</value></prop></item>
<item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="ODFRecalcMode" oor:op="fuse"><value>1</value></prop></item>
</oor:items>
"#;

#[derive(Debug, PartialEq, Eq)]
pub enum ConvertError {
    NotOffice,
    NotGranted,
    TooLarge,
    NoProgram,
    Timeout,
    Failed(String),
    NoOutput,
    Io(String),
}

impl ConvertError {
    /// Code stable rendu à la page par la commande (O14).
    pub fn code(&self) -> &'static str {
        match self {
            ConvertError::NotOffice => "not-office",
            ConvertError::NotGranted => "not-granted",
            ConvertError::TooLarge => "too-large",
            ConvertError::NoProgram => "no-program",
            ConvertError::Timeout => "timeout",
            ConvertError::Failed(_) => "failed",
            ConvertError::NoOutput => "no-output",
            ConvertError::Io(_) => "io",
        }
    }
}

impl fmt::Display for ConvertError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConvertError::Failed(d) | ConvertError::Io(d) => write!(f, "{} : {d}", self.code()),
            _ => f.write_str(self.code()),
        }
    }
}

pub(crate) fn io(e: std::io::Error) -> ConvertError {
    ConvertError::Io(e.to_string())
}

/// Extension Office de `path`, en minuscules ; `None` si elle n'est pas dans `OFFICE_EXTENSIONS` (O1).
pub fn office_extension(path: &Path) -> Option<String> {
    let e = path.extension()?.to_str()?.to_ascii_lowercase();
    OFFICE_EXTENSIONS.contains(&e.as_str()).then_some(e)
}

/// Vrai si `head` porte l'en-tête attendu pour l'extension `ext` (O2) : ZIP pour OOXML et ODF, CFB sinon.
pub fn has_office_magic(ext: &str, head: &[u8]) -> bool {
    if ZIP_EXTENSIONS.contains(&ext) {
        head.starts_with(&ZIP_MAGIC)
    } else {
        head.starts_with(&CFB_MAGIC)
    }
}

/// Convertisseur trouvé au lancement (O6) : LibreOffice d'abord, Microsoft Office par COM sous Windows ensuite.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Converter {
    LibreOffice(PathBuf),
    #[cfg(windows)]
    MsOffice,
}

/// Données de la recherche (O7), injectées pour les tests : PATH et chemins connus.
#[derive(Debug, Clone, Default)]
pub struct Search {
    pub path: Option<OsString>,
    pub known: Vec<PathBuf>,
}

impl Search {
    pub fn from_env() -> Self {
        Search {
            path: std::env::var_os("PATH"),
            known: known_paths(),
        }
    }
}

#[cfg(windows)]
const PROGRAM_NAMES: &[&str] = &["soffice.exe"];
#[cfg(not(windows))]
const PROGRAM_NAMES: &[&str] = &["soffice", "libreoffice"];

/// Chemins connus de LibreOffice (O7), essayés après le PATH : une application lancée du Finder n'a qu'un PATH minimal.
fn known_paths() -> Vec<PathBuf> {
    #[allow(unused_mut)]
    let mut v = Vec::new();
    #[cfg(target_os = "linux")]
    {
        v.push(PathBuf::from("/usr/lib/libreoffice/program/soffice"));
        if let Ok(rd) = fs::read_dir("/opt") {
            let mut opt: Vec<PathBuf> = rd
                .flatten()
                .filter(|e| e.file_name().to_string_lossy().starts_with("libreoffice"))
                .map(|e| e.path().join("program").join("soffice"))
                .collect();
            opt.sort();
            v.extend(opt);
        }
        v.push(PathBuf::from("/snap/bin/libreoffice"));
        v.push(PathBuf::from(
            "/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice",
        ));
    }
    #[cfg(target_os = "macos")]
    {
        let app = Path::new("LibreOffice.app/Contents/MacOS/soffice");
        v.push(Path::new("/Applications").join(app));
        if let Some(home) = std::env::var_os("HOME") {
            v.push(PathBuf::from(home).join("Applications").join(app));
        }
    }
    #[cfg(windows)]
    {
        for var in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Some(base) = std::env::var_os(var) {
                v.push(
                    PathBuf::from(base)
                        .join("LibreOffice")
                        .join("program")
                        .join("soffice.exe"),
                );
            }
        }
    }
    v
}

/// Fichier ordinaire (lien suivi : `/usr/bin/soffice` en est un) et exécutable sous Unix.
fn is_executable_file(p: &Path) -> bool {
    let Ok(m) = fs::metadata(p) else {
        return false;
    };
    if !m.is_file() {
        return false;
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        m.permissions().mode() & 0o111 != 0
    }
    #[cfg(not(unix))]
    {
        true
    }
}

/// O6, O7 : `soffice` puis `libreoffice` dans les dossiers absolus du PATH (recherche écrite ici, aucun `which`), puis
/// les chemins connus, puis (Windows) Word, Excel ou PowerPoint enregistrés pour COM.
pub fn find_converter(s: &Search) -> Option<Converter> {
    let dirs: Vec<PathBuf> = s
        .path
        .as_deref()
        .map(|p| {
            std::env::split_paths(p)
                .filter(|d| d.is_absolute())
                .collect()
        })
        .unwrap_or_default();
    for name in PROGRAM_NAMES {
        for d in &dirs {
            let c = d.join(name);
            if is_executable_file(&c) {
                return Some(Converter::LibreOffice(c));
            }
        }
    }
    if let Some(k) = s.known.iter().find(|k| is_executable_file(k)) {
        return Some(Converter::LibreOffice(k.clone()));
    }
    #[cfg(windows)]
    if com::available() {
        return Some(Converter::MsOffice);
    }
    None
}

/// URL `file://` d'un chemin (O8, `-env:UserInstallation=`) : séparateurs Windows en `/`, préfixe `\\?\` retiré, tout
/// octet hors `A-Z a-z 0-9 - . _ ~ / :` encodé en pourcentage.
pub fn file_url(path: &Path) -> String {
    let raw = path.to_string_lossy();
    let s = raw.strip_prefix(r"\\?\").unwrap_or(&raw).replace('\\', "/");
    let mut out = String::from("file://");
    if !s.starts_with('/') {
        out.push('/');
    }
    for b in s.bytes() {
        if b.is_ascii_alphanumeric() || matches!(b, b'-' | b'.' | b'_' | b'~' | b'/' | b':') {
            out.push(char::from(b));
        } else {
            out.push_str(&format!("%{b:02X}"));
        }
    }
    out
}

/// Arguments de LibreOffice (O8), en liste ; l'entrée est toujours `<dossier>/source.<ext>` (le nom d'origine n'y
/// arrive jamais).
pub fn libreoffice_args(input: &Path, outdir: &Path, profile: &Path) -> Vec<OsString> {
    let mut a: Vec<OsString> = [
        "--headless",
        "--invisible",
        "--norestore",
        "--nolockcheck",
        "--nodefault",
        "--nologo",
    ]
    .into_iter()
    .map(OsString::from)
    .collect();
    a.push(OsString::from(format!(
        "-env:UserInstallation={}",
        file_url(profile)
    )));
    a.push(OsString::from("--convert-to"));
    a.push(OsString::from("pdf"));
    a.push(OsString::from("--outdir"));
    a.push(outdir.as_os_str().to_owned());
    a.push(input.as_os_str().to_owned());
    a
}

/// Dossier privé (O9) : créé en 0700 s'il manque (le parent doit exister) ; existant, il doit être un vrai dossier (pas
/// un lien), à l'utilisateur courant (Unix), puis il est resserré en 0700.
pub fn ensure_private_dir(p: &Path) -> Result<(), ConvertError> {
    match fs::symlink_metadata(p) {
        Ok(m) => {
            if m.file_type().is_symlink() || !m.is_dir() {
                return Err(ConvertError::Io(format!(
                    "dossier privé attendu : {}",
                    p.display()
                )));
            }
            #[cfg(unix)]
            {
                use std::os::unix::fs::{MetadataExt, PermissionsExt};
                // SAFETY : lecture de l'identifiant effectif, sans effet.
                if m.uid() != unsafe { libc::geteuid() } {
                    return Err(ConvertError::Io(format!(
                        "propriétaire différent : {}",
                        p.display()
                    )));
                }
                fs::set_permissions(p, fs::Permissions::from_mode(0o700)).map_err(io)?;
            }
            Ok(())
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let mut b = fs::DirBuilder::new();
            #[cfg(unix)]
            {
                use std::os::unix::fs::DirBuilderExt;
                b.mode(0o700);
            }
            b.create(p).map_err(io)
        }
        Err(e) => Err(io(e)),
    }
}

/// Écrit le profil jetable `<profil>/user/registrymodifications.xcu` (O10) avant le lancement.
pub fn write_profile(profile: &Path) -> Result<(), ConvertError> {
    let user = profile.join("user");
    fs::create_dir_all(&user).map_err(io)?;
    fs::write(user.join("registrymodifications.xcu"), PROFILE_XCU).map_err(io)
}

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
        assert_eq!(
            office_extension(Path::new("/x/COURS.DOCX")).as_deref(),
            Some("docx")
        );
        assert_eq!(
            office_extension(Path::new("notes.Xlsm")).as_deref(),
            Some("xlsm")
        );
        assert_eq!(office_extension(Path::new("x.pdf")), None);
        assert_eq!(office_extension(Path::new("docx")), None);
        assert!(has_office_magic("pptx", b"PK\x03\x04rest"));
        assert!(!has_office_magic("pptx", &CFB_MAGIC));
        assert!(has_office_magic("doc", &CFB_MAGIC));
        assert!(!has_office_magic("xls", b"PK\x03\x04"));
        assert!(!has_office_magic("docx", b"PK"));
        let mut all: Vec<&str> = OFFICE_EXTENSIONS.to_vec();
        all.sort_unstable();
        assert_eq!(
            all,
            ["doc", "docx", "odp", "ods", "odt", "ppt", "pptx", "xls", "xlsm", "xlsx"]
        );
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
        assert_eq!(
            ConvertError::Failed("Error: source".into()).to_string(),
            "failed : Error: source"
        );
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
        let search =
            |path: Option<OsString>, known: Vec<PathBuf>| find_converter(&Search { path, known });
        assert_eq!(
            search(Some(path.clone()), vec![]),
            Some(Converter::LibreOffice(lo))
        );
        let so = executable(&b.join("soffice"), "#!/bin/sh\n");
        assert_eq!(search(Some(path), vec![]), Some(Converter::LibreOffice(so)));
        let known = executable(&d.join("connu"), "#!/bin/sh\n");
        let only_a = std::env::join_paths([&a]).unwrap();
        assert_eq!(
            search(
                Some(only_a.clone()),
                vec![d.join("absent"), c.join("soffice"), known.clone()]
            ),
            Some(Converter::LibreOffice(known))
        );
        assert_eq!(search(Some(only_a), vec![d.join("absent")]), None);
        assert_eq!(search(None, vec![]), None);
    }

    /// O8 : URL du profil (espaces, `%`, `#`, non ASCII), lecteur Windows et préfixe `\\?\` de `canonicalize`.
    #[test]
    fn file_url_escapes_and_handles_windows_drives() {
        assert_eq!(
            file_url(Path::new("/tmp/a b/%#é")),
            "file:///tmp/a%20b/%25%23%C3%A9"
        );
        assert_eq!(
            file_url(Path::new(r"C:\Users\a b\profil")),
            "file:///C:/Users/a%20b/profil"
        );
        assert_eq!(
            file_url(Path::new(r"\\?\C:\x\profil")),
            "file:///C:/x/profil"
        );
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
        assert_eq!(
            fs::metadata(&new).unwrap().permissions().mode() & 0o777,
            0o700
        );
        let open = d.join("ouvert");
        fs::create_dir(&open).unwrap();
        fs::set_permissions(&open, fs::Permissions::from_mode(0o755)).unwrap();
        ensure_private_dir(&open).expect("resserré");
        assert_eq!(
            fs::metadata(&open).unwrap().permissions().mode() & 0o777,
            0o700
        );
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
        assert!(matches!(
            ensure_private_dir(&link),
            Err(ConvertError::Io(_))
        ));
        let file = d.join("fichier");
        fs::write(&file, b"x").unwrap();
        assert!(matches!(
            ensure_private_dir(&file),
            Err(ConvertError::Io(_))
        ));
        // Jamais sous root : le contrôle du propriétaire passerait et `/usr` serait resserré en 0700.
        // SAFETY : lecture de l'identifiant effectif, sans effet.
        if unsafe { libc::geteuid() } != 0 {
            assert!(
                matches!(
                    ensure_private_dir(Path::new("/usr")),
                    Err(ConvertError::Io(_))
                ),
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
        let xcu = fs::read_to_string(
            d.join("profil")
                .join("user")
                .join("registrymodifications.xcu"),
        )
        .expect("xcu");
        for (path, name, value) in [
            (
                "/org.openoffice.Office.Common/Security/Scripting",
                "MacroSecurityLevel",
                "3",
            ),
            (
                "/org.openoffice.Office.Common/Security/Scripting",
                "DisableMacrosExecution",
                "true",
            ),
            ("/org.openoffice.Office.Calc/Content/Update", "Link", "1"),
            ("/org.openoffice.Office.Writer/Content/Update", "Link", "1"),
            (
                "/org.openoffice.Office.Calc/Formula/Load",
                "OOXMLRecalcMode",
                "1",
            ),
            (
                "/org.openoffice.Office.Calc/Formula/Load",
                "ODFRecalcMode",
                "1",
            ),
        ] {
            let item = format!(
                r#"<item oor:path="{path}"><prop oor:name="{name}" oor:op="fuse"><value>{value}</value></prop></item>"#
            );
            assert!(xcu.contains(&item), "{path} {name} = {value} absent");
        }
    }
}
