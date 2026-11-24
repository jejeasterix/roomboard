//! Binaire `roomboard-office` (cadrage cli-lot4, D50 à D54, DA16, S1, S2) : lancé tel que construit par cargo
//! (`CARGO_BIN_EXE_roomboard-office`), racine de travail sous un `XDG_CACHE_HOME` jetable. LibreOffice exigé ; absent, les
//! tests réels échouent, sauf `ROOMBOARD_SANS_SOFFICE=1` (saut dit sur stderr), comme `office.rs` (O26).
use std::ffi::OsStr;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};

const BIN: &str = env!("CARGO_BIN_EXE_roomboard-office");

/// Dossier neuf sous `temp_dir()`, retiré à la fin de la portée.
struct Scratch(PathBuf);
impl Scratch {
    fn new(name: &str) -> Self {
        let p = std::env::temp_dir().join(format!(
            "roomboard-office-bin-{}-{name}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&p);
        fs::create_dir_all(&p).expect("dossier d'essai");
        Scratch(p)
    }
    fn cache(&self) -> PathBuf {
        self.0.join("cache")
    }
    fn root(&self) -> PathBuf {
        self.cache().join("roomboard-office")
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

fn fixture(name: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(name)
}

fn run(s: &Scratch, args: &[&OsStr]) -> Output {
    Command::new(BIN)
        .args(args)
        .env("XDG_CACHE_HOME", s.cache())
        .output()
        .expect("lancement de roomboard-office")
}

fn text(b: &[u8]) -> String {
    String::from_utf8_lossy(b).into_owned()
}

/// Vrai si LibreOffice est là ; sinon saut sous `ROOMBOARD_SANS_SOFFICE=1`, échec autrement.
fn soffice(s: &Scratch) -> bool {
    let out = run(s, &[OsStr::new("--check")]);
    if out.status.code() == Some(0) {
        return true;
    }
    if std::env::var("ROOMBOARD_SANS_SOFFICE").as_deref() == Ok("1") {
        let _ = std::io::stderr()
            .write_all(b"test saute : soffice introuvable et ROOMBOARD_SANS_SOFFICE=1\n");
        return false;
    }
    panic!("soffice introuvable : installez LibreOffice, ou posez ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test");
}

/// Processus vivants dont la ligne de commande contient `needle` (Linux : `/proc`) ; vide ailleurs.
fn processes_with(needle: &Path) -> Vec<String> {
    let needle = needle.to_string_lossy().into_owned();
    let Ok(rd) = fs::read_dir("/proc") else {
        return Vec::new();
    };
    rd.flatten()
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .bytes()
                .all(|b| b.is_ascii_digit())
        })
        .filter_map(|e| fs::read(e.path().join("cmdline")).ok())
        .map(|c| text(&c).replace('\0', " "))
        .filter(|c| c.contains(&needle))
        .collect()
}

#[test]
fn usage_is_2() {
    let s = Scratch::new("usage");
    let out = run(&s, &[]);
    assert_eq!(out.status.code(), Some(2));
    assert!(
        text(&out.stderr).starts_with("usage : roomboard-office --check"),
        "{}",
        text(&out.stderr)
    );
    let out = run(&s, &[OsStr::new("a"), OsStr::new("b"), OsStr::new("c")]);
    assert_eq!(out.status.code(), Some(2));
}

#[test]
fn check_prints_converter_and_root() {
    let s = Scratch::new("check");
    if !soffice(&s) {
        return;
    }
    let out = run(&s, &[OsStr::new("--check")]);
    let stdout = text(&out.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    assert_eq!(out.status.code(), Some(0));
    assert!(lines[0].starts_with("convertisseur : "), "{stdout}");
    assert_eq!(lines[1], format!("racine : {}", s.root().display()));
    assert!(text(&out.stderr).is_empty());
}

#[test]
fn converts_docx_then_releases_only_its_conversion() {
    let s = Scratch::new("docx");
    if !soffice(&s) {
        return;
    }
    // Conversion d'un autre processus vivant (le test lui-même) : jamais effacée par ce lancement (D51).
    let other = s
        .root()
        .join("conversions")
        .join(format!("{}-1", std::process::id()));
    fs::create_dir_all(&other).unwrap();
    let pdf = s.0.join("cours.pdf");
    let out = run(&s, &[fixture("cours.docx").as_os_str(), pdf.as_os_str()]);
    assert_eq!(out.status.code(), Some(0), "{}", text(&out.stderr));
    assert!(text(&out.stdout).starts_with(&format!("PDF : {} (", pdf.display())));
    assert!(fs::read(&pdf).unwrap().starts_with(b"%PDF-"));
    let left: Vec<String> = fs::read_dir(s.root().join("conversions"))
        .unwrap()
        .flatten()
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    assert_eq!(left, vec![format!("{}-1", std::process::id())]);
    assert_eq!(
        processes_with(&s.cache()),
        Vec::<String>::new(),
        "soffice encore vivant (G4)"
    );
}

#[test]
fn converts_pptx() {
    let s = Scratch::new("pptx");
    if !soffice(&s) {
        return;
    }
    let pdf = s.0.join("diapos.pdf");
    let out = run(&s, &[fixture("diapos.pptx").as_os_str(), pdf.as_os_str()]);
    assert_eq!(out.status.code(), Some(0), "{}", text(&out.stderr));
    assert!(fs::read(&pdf).unwrap().starts_with(b"%PDF-"));
    assert_eq!(processes_with(&s.cache()), Vec::<String>::new());
}

#[test]
fn purges_dead_conversions_at_start() {
    let s = Scratch::new("purge");
    // PID au-delà de pid_max (4 194 304 au plus sous Linux) : processus mort.
    let dead = s.root().join("conversions").join("999999999-1");
    fs::create_dir_all(&dead).unwrap();
    let _ = run(&s, &[]); // même l'usage purge : la purge précède la lecture des arguments
    assert!(!dead.exists(), "conversion morte non purgée");
}

#[test]
fn not_office_is_1_with_code_first() {
    let s = Scratch::new("notoffice");
    let txt = s.0.join("notes.docx");
    fs::write(&txt, b"pas un docx").unwrap();
    let out = run(&s, &[txt.as_os_str(), s.0.join("x.pdf").as_os_str()]);
    assert_eq!(out.status.code(), Some(1));
    assert_eq!(text(&out.stderr).trim_end(), "not-office");
    assert!(!s.0.join("x.pdf").exists());
}

/// H49 : sans convertisseur (`PATH` sur un dossier vide, emplacements connus ignorés), `--check` et la conversion rendent 3
/// avec « no-program » sur stderr, et rien n'est écrit.
#[test]
fn no_converter_is_3() {
    let s = Scratch::new("sans-programme");
    let empty = s.0.join("vide");
    fs::create_dir_all(&empty).unwrap();
    let pdf = s.0.join("x.pdf");
    let go = |args: &[&OsStr]| {
        Command::new(BIN)
            .args(args)
            .env("XDG_CACHE_HOME", s.cache())
            .env("PATH", &empty)
            .env("ROOMBOARD_OFFICE_PATH_ONLY", "1")
            .output()
            .expect("lancement de roomboard-office")
    };
    let docx = fixture("cours.docx");
    for args in [
        vec![OsStr::new("--check")],
        vec![docx.as_os_str(), pdf.as_os_str()],
    ] {
        let out = go(&args);
        assert_eq!(out.status.code(), Some(3), "{}", text(&out.stderr));
        assert!(
            text(&out.stderr).starts_with("no-program"),
            "{}",
            text(&out.stderr)
        );
    }
    assert!(!pdf.exists());
}
