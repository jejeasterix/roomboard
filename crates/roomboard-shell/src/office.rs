//! Conversion d'un document Office en PDF (C16, DA-O1) : extensions et en-têtes (O1, O2), recherche du convertisseur
//! (O6, O7), arguments en liste (O8), dossier de travail privé (O9), profil jetable (O10), erreurs (O14). Le lancement,
//! le délai et l'arbre de processus (O11, O12) suivent dans ce module ; la branche COM vit dans `office/com.rs`
//! (`cfg(windows)`). Aucun interpréteur de commandes, jamais une chaîne de commande assemblée.
use std::ffi::OsString;
use std::fmt;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, ExitStatus, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use crate::GrantedPaths;

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

/// Une conversion à la fois (O12) : la seconde attend la première ; le délai ne court que pendant le processus.
static CONVERT_LOCK: Mutex<()> = Mutex::new(());
/// Compteur des dossiers de conversion de ce processus (`<pid>-<n>`).
static NEXT_CONVERSION: AtomicU64 = AtomicU64::new(0);
const CONVERSIONS_DIR: &str = "conversions";
/// Sortie attendue dans le dossier de conversion (l'entrée y est copiée sous `source.<ext>`).
const OUTPUT_NAME: &str = "source.pdf";

/// PDF produit (O35) : `pdf` (chemin canonique) reste accordé jusqu'à `release_conversion(id)`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Converted {
    pub id: String,
    pub pdf: PathBuf,
    pub size: u64,
}

/// Supprime un dossier à la fin de sa portée (succès, erreur ou délai), sauf `keep`.
struct RemoveOnDrop(Option<PathBuf>);

impl RemoveOnDrop {
    fn keep(mut self) {
        self.0 = None;
    }
}

impl Drop for RemoveOnDrop {
    fn drop(&mut self) {
        if let Some(p) = self.0.take() {
            let _ = fs::remove_dir_all(p);
        }
    }
}

/// Identifiant de conversion : `<chiffres>-<chiffres>`, jamais un chemin.
fn is_conversion_id(id: &str) -> bool {
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let mut parts = id.split('-');
    matches!((parts.next(), parts.next(), parts.next()), (Some(a), Some(b), None) if digits(a) && digits(b))
}

/// Dossier neuf `<racine>/conversions/<pid>-<n>` créé par `create_dir` (échoue s'il existe) ; racine et `conversions/`
/// privées (O9).
fn new_conversion_dir(work_root: &Path) -> Result<(String, PathBuf), ConvertError> {
    if let Some(parent) = work_root.parent() {
        fs::create_dir_all(parent).map_err(io)?;
    }
    ensure_private_dir(work_root)?;
    let conversions = work_root.join(CONVERSIONS_DIR);
    ensure_private_dir(&conversions)?;
    let id = format!(
        "{}-{}",
        std::process::id(),
        NEXT_CONVERSION.fetch_add(1, Ordering::Relaxed)
    );
    let dir = conversions.join(&id);
    fs::create_dir(&dir).map_err(io)?;
    Ok((id, dir))
}

/// Copie au plus `max` octets de `src` vers `dst` ; un flux plus long est refusé (`TooLarge`).
fn copy_bounded(
    src: impl Read,
    dst: &mut impl std::io::Write,
    max: u64,
) -> Result<u64, ConvertError> {
    std::io::copy(&mut { src }, dst).map_err(io)
}

/// Arbre de processus d'une conversion (O11, DA-O5) : groupe de processus sous Unix (`process_group(0)` au lancement),
/// objet Job `KILL_ON_JOB_CLOSE` sous Windows (affecté juste après `spawn` ; un enfant lancé avant échappe au Job,
/// risque accepté, HO2-13).
#[cfg(unix)]
struct ProcessTree(libc::pid_t);

#[cfg(unix)]
impl ProcessTree {
    fn attach(child: &Child) -> Self {
        ProcessTree(child.id() as libc::pid_t)
    }

    fn kill(&self) {
        // SAFETY : signal envoyé au groupe créé par `process_group(0)` ; aucune mémoire partagée.
        unsafe {
            libc::kill(-self.0, libc::SIGKILL);
        }
    }
}

#[cfg(windows)]
struct ProcessTree(Option<windows::Win32::Foundation::HANDLE>);

#[cfg(windows)]
impl ProcessTree {
    fn attach(child: &Child) -> Self {
        use std::os::windows::io::AsRawHandle;
        use windows::Win32::Foundation::{CloseHandle, HANDLE};
        use windows::Win32::System::JobObjects::{
            AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
            SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
            JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
        };
        // SAFETY : poignées possédées ; le Job est fermé par `kill` (KILL_ON_JOB_CLOSE tue l'arbre).
        unsafe {
            let Ok(job) = CreateJobObjectW(None, windows::core::PCWSTR::null()) else {
                return ProcessTree(None);
            };
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            let set = SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const core::ffi::c_void,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            );
            if set.is_err() || AssignProcessToJobObject(job, HANDLE(child.as_raw_handle())).is_err()
            {
                let _ = CloseHandle(job);
                return ProcessTree(None);
            }
            ProcessTree(Some(job))
        }
    }

    fn kill(&self) {
        use windows::Win32::Foundation::CloseHandle;
        use windows::Win32::System::JobObjects::TerminateJobObject;
        if let Some(job) = self.0 {
            // SAFETY : Job possédé, fermé une seule fois.
            unsafe {
                let _ = TerminateJobObject(job, 1);
                let _ = CloseHandle(job);
            }
        }
    }
}

/// Attend la fin par `try_wait` toutes les 50 ms ; au délai, après la fin, ou si l'attente échoue, tue l'arbre entier,
/// puis `wait()` (aucun zombie) ; au délai, `Timeout`.
fn wait_tree(mut child: Child, timeout: Duration) -> Result<ExitStatus, ConvertError> {
    let tree = ProcessTree::attach(&child);
    let start = Instant::now();
    let polled = loop {
        match child.try_wait() {
            Ok(Some(s)) => break Ok(s),
            Ok(None) if start.elapsed() >= timeout => break Err(ConvertError::Timeout),
            Ok(None) => std::thread::sleep(Duration::from_millis(50)),
            Err(e) => break Err(io(e)),
        }
    };
    tree.kill();
    if polled.is_err() {
        let _ = child.kill(); // repli si le Job n'a pas pu être posé (Windows)
    }
    let _ = child.wait();
    polled
}

/// Derniers `ERR_KEEP` octets d'un fichier de sortie, pour le message d'échec.
fn tail_of(p: &Path) -> String {
    let b = fs::read(p).unwrap_or_default();
    String::from_utf8_lossy(&b[b.len().saturating_sub(ERR_KEEP)..])
        .trim()
        .to_string()
}

/// Lance LibreOffice (O8, O10, O11) : profil jetable écrit avant, supprimé à la fin (garde) ; `stdin` nul, `stdout` et
/// `stderr` dans des fichiers du dossier (aucun tube qui se remplit) ; dossier courant = dossier de conversion.
fn run_libreoffice(
    program: &Path,
    input: &Path,
    dir: &Path,
    timeout: Duration,
) -> Result<(), ConvertError> {
    let profile = dir.join("profil");
    let _profile_guard = RemoveOnDrop(Some(profile.clone()));
    write_profile(&profile)?;
    let out = fs::File::create(dir.join("soffice.out")).map_err(io)?;
    let err = fs::File::create(dir.join("soffice.err")).map_err(io)?;
    let mut cmd = Command::new(program);
    cmd.args(libreoffice_args(input, dir, &profile))
        .current_dir(dir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(out))
        .stderr(Stdio::from(err));
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let child = cmd.spawn().map_err(io)?;
    let status = wait_tree(child, timeout)?;
    if !status.success() {
        let mut detail = tail_of(&dir.join("soffice.err"));
        if detail.is_empty() {
            detail = tail_of(&dir.join("soffice.out"));
        }
        return Err(ConvertError::Failed(detail));
    }
    Ok(())
}

/// `source.pdf` exigé fichier ordinaire (jamais un lien), directement sous le dossier canonique (O9).
fn checked_output(dir: &Path) -> Result<PathBuf, ConvertError> {
    let pdf = dir.join(OUTPUT_NAME);
    let Ok(m) = fs::symlink_metadata(&pdf) else {
        return Err(ConvertError::NoOutput);
    };
    if !m.file_type().is_file() {
        return Err(ConvertError::NoOutput);
    }
    let canon_dir = dir.canonicalize().map_err(io)?;
    let canon = pdf.canonicalize().map_err(io)?;
    if canon.parent() != Some(canon_dir.as_path()) {
        return Err(ConvertError::NoOutput);
    }
    Ok(canon)
}

/// Convertit en PDF un fichier accordé (O8 à O12, O35). Refus dans l'ordre : non accordé, extension, taille, en-tête,
/// aucun convertisseur ; puis copie sous `source.<ext>` dans un dossier neuf, lancement, contrôle et accord de la
/// sortie. Tout échec supprime le dossier.
pub fn convert_granted(
    g: &GrantedPaths,
    path: &Path,
    c: Option<&Converter>,
    work_root: &Path,
    timeout: Duration,
) -> Result<Converted, ConvertError> {
    let src = g.granted_path(path).ok_or(ConvertError::NotGranted)?;
    let ext = office_extension(&src).ok_or(ConvertError::NotOffice)?;
    if fs::metadata(&src).map_err(io)?.len() > OFFICE_MAX_BYTES {
        return Err(ConvertError::TooLarge);
    }
    let mut head = Vec::new();
    fs::File::open(&src)
        .map_err(io)?
        .take(8)
        .read_to_end(&mut head)
        .map_err(io)?;
    if !has_office_magic(&ext, &head) {
        return Err(ConvertError::NotOffice);
    }
    let converter = c.ok_or(ConvertError::NoProgram)?;
    let _one = CONVERT_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    let (id, dir) = new_conversion_dir(work_root)?;
    let guard = RemoveOnDrop(Some(dir.clone()));
    let input = dir.join(format!("source.{ext}"));
    fs::copy(&src, &input).map_err(io)?;
    match converter {
        Converter::LibreOffice(program) => run_libreoffice(program, &input, &dir, timeout)?,
        #[cfg(windows)]
        Converter::MsOffice => com::convert(&input, &dir.join(OUTPUT_NAME), timeout)?,
    }
    let pdf = checked_output(&dir)?;
    let size = fs::metadata(&pdf).map_err(io)?.len();
    let pdf = g
        .grant([pdf])
        .into_iter()
        .next()
        .ok_or(ConvertError::NoOutput)?;
    guard.keep();
    Ok(Converted { id, pdf, size })
}

/// Retire l'accord du PDF et supprime le dossier de la conversion `id` (O35) ; tout autre identifiant est ignoré.
pub fn release_conversion(g: &GrantedPaths, work_root: &Path, id: &str) {
    if !is_conversion_id(id) {
        return;
    }
    let dir = work_root.join(CONVERSIONS_DIR).join(id);
    g.revoke(&dir.join(OUTPUT_NAME));
    let _ = fs::remove_dir_all(&dir);
}

#[cfg(unix)]
fn process_alive(pid: u32) -> bool {
    let Ok(p) = libc::pid_t::try_from(pid) else {
        return false;
    };
    if p <= 0 {
        return false;
    }
    // SAFETY : signal 0, sans effet ; seule l'existence du processus est testée.
    let r = unsafe { libc::kill(p, 0) };
    r == 0 || std::io::Error::last_os_error().raw_os_error() == Some(libc::EPERM)
}

/// Windows : la vie d'un PID n'est pas testée (PC9 du plan) ; les restes d'une autre session sont supprimés.
#[cfg(not(unix))]
fn process_alive(_pid: u32) -> bool {
    false
}

/// Au lancement (O23) : supprime les dossiers de `conversions/` dont le processus n'existe plus (plantage).
pub fn purge_conversions(work_root: &Path) {
    let Ok(rd) = fs::read_dir(work_root.join(CONVERSIONS_DIR)) else {
        return;
    };
    for e in rd.flatten() {
        let name = e.file_name();
        let Some(name) = name.to_str() else { continue };
        if !is_conversion_id(name) {
            continue;
        }
        let pid: u32 = name
            .split('-')
            .next()
            .and_then(|p| p.parse().ok())
            .unwrap_or(0);
        if pid != std::process::id() && !process_alive(pid) {
            let _ = fs::remove_dir_all(e.path());
        }
    }
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

    use std::io::{Cursor, Write};
    use std::time::SystemTime;
    use zip::write::SimpleFileOptions;
    use zip::{CompressionMethod, ZipWriter};

    use crate::{read_granted, ReadError};

    const XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>"#;
    const CT: &str = "http://schemas.openxmlformats.org/package/2006/content-types";
    const PR: &str = "http://schemas.openxmlformats.org/package/2006/relationships";
    const R: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const A: &str = "http://schemas.openxmlformats.org/drawingml/2006/main";
    const P: &str = "http://schemas.openxmlformats.org/presentationml/2006/main";
    const DEFAULTS: &str = r#"<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>"#;

    fn zip_of(parts: &[(&str, String)]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        for (name, body) in parts {
            w.start_file(*name, o).expect("entrée");
            w.write_all(body.as_bytes()).expect("écriture");
        }
        w.finish().expect("zip").into_inner()
    }

    fn types(overrides: &[(&str, &str)]) -> String {
        let o: String = overrides
            .iter()
            .map(|(part, ct)| format!(r#"<Override PartName="{part}" ContentType="{ct}"/>"#))
            .collect();
        format!(r#"{XML}<Types xmlns="{CT}">{DEFAULTS}{o}</Types>"#)
    }

    fn rels(items: &[(&str, &str, &str)]) -> String {
        let r: String = items
            .iter()
            .map(|(id, kind, target)| {
                format!(r#"<Relationship Id="{id}" Type="{R}/{kind}" Target="{target}"/>"#)
            })
            .collect();
        format!(r#"{XML}<Relationships xmlns="{PR}">{r}</Relationships>"#)
    }

    /// `.docx` d'un paragraphe (O27).
    fn docx() -> Vec<u8> {
        zip_of(&[
            ("[Content_Types].xml", types(&[("/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml")])),
            ("_rels/.rels", rels(&[("rId1", "officeDocument", "word/document.xml")])),
            ("word/document.xml", format!(r#"{XML}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>RoomBoard cours</w:t></w:r></w:p></w:body></w:document>"#)),
        ])
    }

    /// `.xlsx` d'une feuille (O27, patron `roomboard-formats/src/sheet.rs:332`).
    fn xlsx() -> Vec<u8> {
        const S: &str = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        zip_of(&[
            ("[Content_Types].xml", types(&[
                ("/xl/workbook.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"),
                ("/xl/worksheets/sheet1.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"),
            ])),
            ("_rels/.rels", rels(&[("rId1", "officeDocument", "xl/workbook.xml")])),
            ("xl/workbook.xml", format!(r#"{XML}<workbook xmlns="{S}" xmlns:r="{R}"><sheets><sheet name="Notes" sheetId="1" r:id="rId1"/></sheets></workbook>"#)),
            ("xl/_rels/workbook.xml.rels", rels(&[("rId1", "worksheet", "worksheets/sheet1.xml")])),
            ("xl/worksheets/sheet1.xml", format!(r#"{XML}<worksheet xmlns="{S}"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Note</t></is></c><c r="B1"><v>12</v></c></row></sheetData></worksheet>"#)),
        ])
    }

    /// Thème minimal exigé par PowerPoint et LibreOffice Impress.
    fn theme() -> String {
        let scheme = r#"<a:clrScheme name="C"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme>"#;
        let fonts = r#"<a:fontScheme name="F"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>"#;
        let fill = r#"<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>"#;
        let line = format!(r#"<a:ln w="9525">{fill}</a:ln>"#);
        let effect = "<a:effectStyle><a:effectLst/></a:effectStyle>";
        format!(
            r#"{XML}<a:theme xmlns:a="{A}" name="T"><a:themeElements>{scheme}{fonts}<a:fmtScheme name="M"><a:fillStyleLst>{fill}{fill}{fill}</a:fillStyleLst><a:lnStyleLst>{line}{line}{line}</a:lnStyleLst><a:effectStyleLst>{effect}{effect}{effect}</a:effectStyleLst><a:bgFillStyleLst>{fill}{fill}{fill}</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>"#
        )
    }

    /// `.pptx` de 2 diapositives (O27 ; accepté par LibreOffice 26.2, pré-essai PC10 du plan).
    fn pptx() -> Vec<u8> {
        let ns = format!(r#"xmlns:a="{A}" xmlns:r="{R}" xmlns:p="{P}""#);
        let tree = |shapes: &str| {
            format!(
                r#"<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>{shapes}</p:spTree></p:cSld>"#
            )
        };
        let text = |t: &str| {
            format!(
                r#"<p:sp><p:nvSpPr><p:cNvPr id="2" name="T"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="914400" y="914400"/><a:ext cx="7315200" cy="1371600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:p><a:r><a:rPr lang="fr-FR" sz="4400"/><a:t>{t}</a:t></a:r></a:p></p:txBody></p:sp>"#
            )
        };
        let slide = |t: &str| {
            format!(
                r#"{XML}<p:sld {ns}>{}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"#,
                tree(&text(t))
            )
        };
        let master = format!(
            r#"{XML}<p:sldMaster {ns}>{}<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>"#,
            tree("")
        );
        let layout = format!(
            r#"{XML}<p:sldLayout {ns} type="blank">{}<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>"#,
            tree("")
        );
        let presentation = format!(
            r#"{XML}<p:presentation {ns}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>"#
        );
        let to_layout = rels(&[("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml")]);
        let pml = |kind: &str| {
            format!("application/vnd.openxmlformats-officedocument.presentationml.{kind}+xml")
        };
        let (pres_ct, master_ct, layout_ct, slide_ct) = (
            pml("presentation.main"),
            pml("slideMaster"),
            pml("slideLayout"),
            pml("slide"),
        );
        zip_of(&[
            (
                "[Content_Types].xml",
                types(&[
                    ("/ppt/presentation.xml", pres_ct.as_str()),
                    ("/ppt/slideMasters/slideMaster1.xml", master_ct.as_str()),
                    ("/ppt/slideLayouts/slideLayout1.xml", layout_ct.as_str()),
                    (
                        "/ppt/theme/theme1.xml",
                        "application/vnd.openxmlformats-officedocument.theme+xml",
                    ),
                    ("/ppt/slides/slide1.xml", slide_ct.as_str()),
                    ("/ppt/slides/slide2.xml", slide_ct.as_str()),
                ]),
            ),
            (
                "_rels/.rels",
                rels(&[("rId1", "officeDocument", "ppt/presentation.xml")]),
            ),
            ("ppt/presentation.xml", presentation),
            (
                "ppt/_rels/presentation.xml.rels",
                rels(&[
                    ("rId1", "slideMaster", "slideMasters/slideMaster1.xml"),
                    ("rId2", "slide", "slides/slide1.xml"),
                    ("rId3", "slide", "slides/slide2.xml"),
                    ("rId4", "theme", "theme/theme1.xml"),
                ]),
            ),
            ("ppt/slideMasters/slideMaster1.xml", master),
            (
                "ppt/slideMasters/_rels/slideMaster1.xml.rels",
                rels(&[
                    ("rId1", "slideLayout", "../slideLayouts/slideLayout1.xml"),
                    ("rId2", "theme", "../theme/theme1.xml"),
                ]),
            ),
            ("ppt/slideLayouts/slideLayout1.xml", layout),
            (
                "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
                rels(&[("rId1", "slideMaster", "../slideMasters/slideMaster1.xml")]),
            ),
            ("ppt/theme/theme1.xml", theme()),
            ("ppt/slides/slide1.xml", slide("Diapositive 1")),
            ("ppt/slides/_rels/slide1.xml.rels", to_layout.clone()),
            ("ppt/slides/slide2.xml", slide("Diapositive 2")),
            ("ppt/slides/_rels/slide2.xml.rels", to_layout),
        ])
    }

    /// Fixture commitée, relue par l'essai navigateur (O27) ; régénérée par `ROOMBOARD_REGENERER_FIXTURES=1`.
    fn fixture(name: &str, make: fn() -> Vec<u8>) -> Vec<u8> {
        let p = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join(name);
        if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
            fs::create_dir_all(p.parent().expect("dossier")).expect("dossier");
            fs::write(&p, make()).expect("écriture");
        }
        fs::read(&p).unwrap_or_else(|_| {
            panic!("fixture {name} absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-shell office")
        })
    }

    /// O26 : LibreOffice exigé ; absent, le test échoue, sauf `ROOMBOARD_SANS_SOFFICE=1` (saut dit sur stderr).
    fn soffice() -> Option<Converter> {
        match find_converter(&Search::from_env()) {
            Some(c) => Some(c),
            None if std::env::var("ROOMBOARD_SANS_SOFFICE").as_deref() == Ok("1") => {
                eprintln!("test sauté : soffice introuvable et ROOMBOARD_SANS_SOFFICE=1");
                None
            }
            None => panic!("soffice introuvable : installez LibreOffice, ou posez ROOMBOARD_SANS_SOFFICE=1 pour sauter ce test"),
        }
    }

    /// Faux convertisseur (script lancé directement, comme `soffice`) écrit sous `CONVERT_LOCK` : aucun lancement d'un
    /// autre test ne garde le fichier ouvert en écriture (ETXTBSY). `$d` = dossier du script.
    #[cfg(unix)]
    fn fake_converter(dir: &Path, body: &str) -> Converter {
        let _one = CONVERT_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        let script = format!("#!/bin/sh\nd=$(dirname \"$0\")\n{body}\n");
        Converter::LibreOffice(executable(&dir.join("faux-soffice"), &script))
    }

    fn granted(dir: &Path, name: &str, bytes: &[u8]) -> (GrantedPaths, PathBuf) {
        let p = dir.join(name);
        fs::write(&p, bytes).unwrap();
        let g = GrantedPaths::default();
        g.grant([p.clone()]);
        (g, p)
    }

    fn left_in(work: &Path) -> usize {
        fs::read_dir(work.join(CONVERSIONS_DIR))
            .map(|r| r.count())
            .unwrap_or(0)
    }

    /// Pages d'un PDF : objets `/Type/Page` ou `/Type /Page` (jamais `/Pages`).
    fn pdf_pages(b: &[u8]) -> usize {
        [&b"/Type/Page"[..], &b"/Type /Page"[..]]
            .iter()
            .map(|pat| {
                b.windows(pat.len() + 1)
                    .filter(|w| w.starts_with(pat) && w[pat.len()] != b's')
                    .count()
            })
            .sum()
    }

    /// S1 (O8, O28, O35) : `cours.docx`, `diapos.pptx` (2 diapositives) et `notes.xlsx` convertis par LibreOffice :
    /// PDF lus par l'accord, `%PDF-`, 2 pages pour le `.pptx`, profil supprimé ; après `release_conversion`, ni
    /// dossier sous `conversions/`, ni accord.
    #[cfg(unix)]
    #[test]
    fn real_libreoffice_converts_docx_pptx_xlsx() {
        let Some(conv) = soffice() else { return };
        let d = dir("reel");
        let work = d.join("travail");
        let cases = [
            ("cours.docx", fixture("cours.docx", docx), 1),
            ("diapos.pptx", fixture("diapos.pptx", pptx), 2),
            ("notes.xlsx", fixture("notes.xlsx", xlsx), 1),
        ];
        for (name, bytes, pages) in cases {
            let (g, src) = granted(&d, name, &bytes);
            let t = Instant::now();
            let c = convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT)
                .unwrap_or_else(|e| panic!("{name} : {e}"));
            // Durée par format, montrée avec `--nocapture` (rapport de T3).
            eprintln!("conversion {name} : {:?}, {} octets", t.elapsed(), c.size);
            let pdf = read_granted(&g, &c.pdf, 0, c.size).expect("PDF accordé");
            assert!(pdf.starts_with(b"%PDF-"), "{name} : %PDF- attendu");
            assert_eq!(pdf_pages(&pdf), pages, "{name} : pages");
            assert!(
                !c.pdf.parent().expect("dossier").join("profil").exists(),
                "{name} : profil supprimé"
            );
            release_conversion(&g, &work, &c.id);
            assert_eq!(read_granted(&g, &c.pdf, 0, 1), Err(ReadError::NotGranted));
            assert_eq!(left_in(&work), 0, "{name} : dossier de conversion supprimé");
        }
    }

    /// Processus absent ou zombie (état `Z` de `/proc/<pid>/stat`), attendu jusqu'à 2 s.
    #[cfg(target_os = "linux")]
    fn gone(pid: u32) -> bool {
        for _ in 0..40 {
            match fs::read_to_string(format!("/proc/{pid}/stat")) {
                Err(_) => return true,
                Ok(s)
                    if s.rsplit_once(") ")
                        .is_some_and(|(_, rest)| rest.starts_with('Z')) =>
                {
                    return true
                }
                Ok(_) => std::thread::sleep(Duration::from_millis(50)),
            }
        }
        false
    }

    /// S2 (O11, DA-O5) : un faux convertisseur lance un enfant puis attend ; délai de 2 s : `Timeout` moins de 4 s après
    /// son lancement (heure de `parent.pid` : l'attente du verrou ne compte pas), ni lui ni son enfant ne vivent, le
    /// dossier de conversion est supprimé.
    #[cfg(target_os = "linux")]
    #[test]
    fn timeout_kills_the_launcher_and_its_child() {
        let d = dir("delai");
        let conv = fake_converter(
            &d,
            "echo $$ > \"$d/parent.pid\"\nsleep 60 &\necho $! > \"$d/enfant.pid\"\nwait",
        );
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let work = d.join("travail");
        let r = convert_granted(&g, &src, Some(&conv), &work, Duration::from_secs(2));
        assert_eq!(r.err(), Some(ConvertError::Timeout));
        let started = fs::metadata(d.join("parent.pid"))
            .and_then(|m| m.modified())
            .expect("lancé");
        let took = SystemTime::now()
            .duration_since(started)
            .unwrap_or_default();
        assert!(took < Duration::from_secs(4), "délai : {took:?}");
        for f in ["parent.pid", "enfant.pid"] {
            let pid: u32 = fs::read_to_string(d.join(f))
                .expect(f)
                .trim()
                .parse()
                .expect("pid");
            assert!(gone(pid), "{f} ({pid}) encore vivant");
        }
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (O8, O9) : le nom d'origine n'atteint jamais les arguments ; l'entrée est copiée sous `source.docx`.
    #[cfg(unix)]
    #[test]
    fn hostile_name_never_reaches_the_arguments() {
        let d = dir("nom");
        let conv = fake_converter(
            &d,
            "for a in \"$@\"; do printf '%s\\n' \"$a\" >> \"$d/args.txt\"; done",
        );
        let (g, src) = granted(&d, "-x; $(touch pwn).docx", b"PK\x03\x04x");
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NoOutput)
        );
        let args = fs::read_to_string(d.join("args.txt")).expect("arguments");
        let lines: Vec<&str> = args.lines().collect();
        assert_eq!(lines.len(), 12, "{args}");
        assert_eq!(
            &lines[..6],
            &[
                "--headless",
                "--invisible",
                "--norestore",
                "--nolockcheck",
                "--nodefault",
                "--nologo"
            ]
        );
        assert!(lines[6].starts_with("-env:UserInstallation=file://"));
        assert!(lines[11].ends_with("/source.docx"));
        assert!(!args.contains("pwn") && !args.contains("-x;"));
        assert!(!d.join("pwn").exists());
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (O9) : une sortie `source.pdf` en lien symbolique est refusée (`NoOutput`), sa cible jamais accordée.
    #[cfg(unix)]
    #[test]
    fn symlinked_output_is_refused() {
        let d = dir("lien");
        fs::write(d.join("secret.txt"), b"s").unwrap();
        let conv = fake_converter(&d, "ln -s \"$d/secret.txt\" \"$(pwd)/source.pdf\"");
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NoOutput)
        );
        assert_eq!(
            read_granted(&g, &d.join("secret.txt"), 0, 1),
            Err(ReadError::NotGranted)
        );
        assert_eq!(left_in(&work), 0);
    }

    /// S2 (U24) : fichier non accordé : `NotGranted`, aucun processus lancé, aucun dossier de travail créé.
    #[cfg(unix)]
    #[test]
    fn ungranted_file_is_refused_before_any_process() {
        let d = dir("accord");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let src = d.join("cours.docx");
        fs::write(&src, b"PK\x03\x04x").unwrap();
        let work = d.join("travail");
        assert_eq!(
            convert_granted(
                &GrantedPaths::default(),
                &src,
                Some(&conv),
                &work,
                CONVERT_TIMEOUT
            )
            .err(),
            Some(ConvertError::NotGranted)
        );
        assert!(!d.join("lance").exists());
        assert!(!work.exists());
    }

    /// S2 (O2, O14) : plus de 100 Mio : `TooLarge` ; en-tête ou extension faux : `NotOffice` ; sans convertisseur :
    /// `NoProgram` ; aucun processus lancé.
    #[cfg(unix)]
    #[test]
    fn too_large_not_office_and_no_program_launch_nothing() {
        let d = dir("refus");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let work = d.join("travail");
        let big = d.join("gros.docx");
        fs::File::create(&big)
            .unwrap()
            .set_len(OFFICE_MAX_BYTES + 1)
            .unwrap();
        let g = GrantedPaths::default();
        g.grant([big.clone()]);
        assert_eq!(
            convert_granted(&g, &big, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::TooLarge)
        );
        let (g2, fake) = granted(&d, "faux.docx", b"MZ\x90\x00");
        assert_eq!(
            convert_granted(&g2, &fake, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NotOffice)
        );
        let (g3, pdf) = granted(&d, "cours.pdf", b"%PDF-");
        assert_eq!(
            convert_granted(&g3, &pdf, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NotOffice)
        );
        let (g4, ok) = granted(&d, "cours.docx", b"PK\x03\x04x");
        assert_eq!(
            convert_granted(&g4, &ok, None, &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::NoProgram)
        );
        assert!(!d.join("lance").exists());
    }

    /// S2 (O9) : racine de travail en lien symbolique : refusée, rien écrit dans la cible, aucun processus.
    #[cfg(unix)]
    #[test]
    fn symlinked_work_root_is_refused() {
        let d = dir("racine");
        let conv = fake_converter(&d, "touch \"$d/lance\"");
        let real = d.join("vraie");
        fs::create_dir(&real).unwrap();
        let link = d.join("racine-lien");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        assert!(matches!(
            convert_granted(&g, &src, Some(&conv), &link, CONVERT_TIMEOUT),
            Err(ConvertError::Io(_))
        ));
        assert!(!d.join("lance").exists());
        assert!(!real.join(CONVERSIONS_DIR).exists());
    }

    /// Review Focus 2 : `.docx` abîmé à en-tête ZIP valide : LibreOffice rend 1 (« source file could not be loaded »)
    /// → `Failed` (ou `NoOutput`), rien ne reste.
    #[cfg(unix)]
    #[test]
    fn corrupt_docx_fails_and_leaves_nothing() {
        let Some(conv) = soffice() else { return };
        let d = dir("abime");
        let (g, src) = granted(&d, "abime.docx", b"PK\x03\x04garbagegarbage");
        let work = d.join("travail");
        let r = convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT);
        assert!(
            matches!(
                r,
                Err(ConvertError::Failed(_)) | Err(ConvertError::NoOutput)
            ),
            "{r:?}"
        );
        assert_eq!(left_in(&work), 0);
    }

    /// O35, Review Focus 3 : seul un identifiant `<chiffres>-<chiffres>` est libéré ; `../x` ne supprime rien.
    #[test]
    fn release_conversion_ignores_foreign_ids() {
        let d = dir("liberer");
        let work = d.join("travail");
        fs::create_dir_all(work.join(CONVERSIONS_DIR).join("12-3")).unwrap();
        fs::write(work.join("secret"), b"s").unwrap();
        let g = GrantedPaths::default();
        for bad in ["../secret", "..", "12-3/..", "a-b", "12", "1-2-3", ""] {
            release_conversion(&g, &work, bad);
        }
        assert!(work.join("secret").exists());
        assert!(work.join(CONVERSIONS_DIR).join("12-3").exists());
        release_conversion(&g, &work, "12-3");
        assert!(!work.join(CONVERSIONS_DIR).join("12-3").exists());
    }

    /// O23 : au lancement, les dossiers d'un processus mort sont supprimés ; ceux du processus courant et les noms
    /// étrangers restent.
    #[cfg(unix)]
    #[test]
    fn purge_removes_conversions_of_dead_processes() {
        let d = dir("purge");
        let work = d.join("travail");
        let conversions = work.join(CONVERSIONS_DIR);
        let dead = conversions.join("4294967294-0");
        let mine = conversions.join(format!("{}-999", std::process::id()));
        let other = conversions.join("pas-un-id");
        for p in [&dead, &mine, &other] {
            fs::create_dir_all(p).unwrap();
        }
        purge_conversions(&work);
        assert!(!dead.exists());
        assert!(mine.exists() && other.exists());
    }
    /// Revue T12 (1) : une conversion réussie tue aussi les enfants laissés par le convertisseur ; après libération, le
    /// dossier de travail est vide.
    #[cfg(target_os = "linux")]
    #[test]
    fn success_kills_leftover_children() {
        let d = dir("enfant-reussi");
        let conv = fake_converter(
            &d,
            "sleep 60 &\necho $! > \"$d/enfant.pid\"\nprintf '%%PDF-1.4' > source.pdf\nexit 0",
        );
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let work = d.join("travail");
        let c = convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).expect("converti");
        let pid: u32 = fs::read_to_string(d.join("enfant.pid"))
            .expect("enfant.pid")
            .trim()
            .parse()
            .expect("pid");
        assert!(gone(pid), "enfant ({pid}) encore vivant après le succès");
        release_conversion(&g, &work, &c.id);
        assert_eq!(left_in(&work), 0);
    }

    /// Revue T12 (2) : un dossier `<pid>-<n>` déjà présent n'échoue pas la conversion : l'identifiant suivant est pris.
    #[test]
    fn conversion_dir_skips_existing_id() {
        let d = dir("collision-conv");
        let work = d.join("travail");
        let taken = work.join(CONVERSIONS_DIR).join(format!(
            "{}-{}",
            std::process::id(),
            NEXT_CONVERSION.load(Ordering::Relaxed)
        ));
        fs::create_dir_all(&taken).unwrap();
        let (id, dir) = new_conversion_dir(&work).expect("id suivant");
        assert!(dir.is_dir() && dir != taken, "{id}");
    }

    /// Revue T12 (3) : racine de travail relative : `--outdir`, l'entrée et le profil sont absolus.
    #[cfg(unix)]
    #[test]
    fn relative_work_root_gives_absolute_arguments() {
        let d = dir("racine-relative");
        let conv = fake_converter(
            &d,
            "printf '%s\\n' \"$@\" > \"$d/args\"\nprintf '%%PDF-1.4' > source.pdf",
        );
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        let rel = PathBuf::from(format!("rb-rel-{}", std::process::id()));
        let r = convert_granted(&g, &src, Some(&conv), &rel, CONVERT_TIMEOUT);
        let _ = fs::remove_dir_all(&rel);
        r.expect("converti");
        let args = fs::read_to_string(d.join("args")).unwrap();
        let lines: Vec<&str> = args.lines().collect();
        let after = |flag: &str| lines[lines.iter().position(|l| *l == flag).unwrap() + 1];
        assert!(Path::new(after("--outdir")).is_absolute(), "{args}");
        assert!(Path::new(lines.last().unwrap()).is_absolute(), "{args}");
        assert!(
            lines
                .iter()
                .any(|l| l.starts_with("-env:UserInstallation=file:///")),
            "{args}"
        );
    }

    /// Revue T12 (4) : un fichier d'un octet de plus que le plafond est refusé, sans dossier laissé.
    #[cfg(unix)]
    #[test]
    fn file_over_the_limit_is_refused() {
        let d = dir("trop-gros");
        let conv = fake_converter(&d, "exit 0");
        let (g, src) = granted(&d, "cours.docx", b"PK\x03\x04x");
        fs::OpenOptions::new()
            .write(true)
            .open(&src)
            .unwrap()
            .set_len(OFFICE_MAX_BYTES + 1)
            .unwrap();
        let work = d.join("travail");
        assert_eq!(
            convert_granted(&g, &src, Some(&conv), &work, CONVERT_TIMEOUT).err(),
            Some(ConvertError::TooLarge)
        );
        assert_eq!(left_in(&work), 0);
    }

    /// Revue T12 (4) : la copie bornée refuse un flux qui dépasse le plafond, même si la taille annoncée était bonne.
    #[test]
    fn bounded_copy_refuses_growth_past_the_limit() {
        let mut out = Vec::new();
        let src = std::io::repeat(0).take(OFFICE_MAX_BYTES + 5);
        assert_eq!(
            copy_bounded(src, &mut out, OFFICE_MAX_BYTES).err(),
            Some(ConvertError::TooLarge)
        );
        let mut ok = Vec::new();
        assert_eq!(copy_bounded(&b"abc"[..], &mut ok, 3), Ok(3));
    }

}
