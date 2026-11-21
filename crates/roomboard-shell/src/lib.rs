//! Logique de la coque testable sans Tauri (lot 5b, CL5b-13, CL5b-14) : fichiers accordés à la page (dépôt,
//! lancement), lecture bornée par morceaux, fichiers passés au lancement. Égalité stricte de chemins canoniques de
//! fichiers : jamais un dossier, jamais une recherche par préfixe (contrairement à la portée de tauri-plugin-fs).
use std::collections::HashSet;
use std::fmt;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::sync::Mutex;

pub mod office;
pub mod originals;

/// Taille maximale d'un morceau lu par `read_granted` (8 Mio).
pub const MAX_CHUNK: u64 = 8 * 1024 * 1024;
/// Extensions associées à RoomBoard (sans point, comparées sans tenir compte de la casse).
pub const ASSOCIATED_EXTENSIONS: &[&str] = &["roomboard", "rbitem", "rbpack"];
/// Extensions des médias (audio, vidéo) qu'on peut lier sans les copier.
pub const MEDIA_EXTENSIONS: &[&str] = &[
    "mp4", "m4v", "m4a", "mov", "webm", "mp3", "wav", "ogg", "oga", "ogv",
];
/// Taille des morceaux lus pour l'empreinte d'un média lié (8 Mio).
pub const HASH_CHUNK: usize = 8 * 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub enum ReadError {
    NotGranted,
    TooLarge,
    NotMedia,
    SizeMismatch,
    Io(String),
}

impl fmt::Display for ReadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ReadError::NotGranted => write!(f, "fichier non accordé"),
            ReadError::TooLarge => write!(f, "lecture trop grande (8 Mio au plus)"),
            ReadError::NotMedia => write!(f, "extension de média attendue"),
            ReadError::SizeMismatch => write!(f, "taille différente"),
            ReadError::Io(e) => write!(f, "lecture impossible : {e}"),
        }
    }
}

/// Ensemble des chemins canoniques de fichiers ordinaires que la page peut lire.
#[derive(Default)]
pub struct GrantedPaths {
    paths: Mutex<HashSet<PathBuf>>,
}

impl GrantedPaths {
    /// Accorde les fichiers ordinaires de `paths` et rend leurs chemins canoniques ; dossiers et absents ignorés.
    pub fn grant<I: IntoIterator<Item = PathBuf>>(&self, paths: I) -> Vec<PathBuf> {
        let mut set = self.paths.lock().unwrap_or_else(|e| e.into_inner());
        let mut kept = Vec::new();
        for p in paths {
            let Ok(c) = p.canonicalize() else { continue };
            if !c.is_file() {
                continue;
            }
            set.insert(c.clone());
            kept.push(c);
        }
        kept
    }

    /// Chemin canonique de `path` s'il est accordé (égalité stricte, aucune recherche par préfixe).
    pub fn granted_path(&self, path: &Path) -> Option<PathBuf> {
        let c = path.canonicalize().ok()?;
        self.paths
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .contains(&c)
            .then_some(c)
    }

    /// Retire l'accord de `path` (O35) : chemin canonique s'il se résout encore, et chemin reçu ; vrai si l'un des deux
    /// était accordé.
    pub fn revoke(&self, path: &Path) -> bool {
        let mut set = self.paths.lock().unwrap_or_else(|e| e.into_inner());
        let canonical = path.canonicalize().ok().is_some_and(|c| set.remove(&c));
        let raw = set.remove(path);
        canonical || raw
    }
}

fn io(e: std::io::Error) -> ReadError {
    ReadError::Io(e.to_string())
}

/// Lit au plus `len` octets à partir de `offset` dans un fichier accordé ; ouvre le chemin canonique vérifié, pas
/// le chemin reçu.
pub fn read_granted(
    g: &GrantedPaths,
    path: &Path,
    offset: u64,
    len: u64,
) -> Result<Vec<u8>, ReadError> {
    if len > MAX_CHUNK {
        return Err(ReadError::TooLarge);
    }
    let c = g.granted_path(path).ok_or(ReadError::NotGranted)?;
    let mut f = File::open(&c).map_err(io)?;
    f.seek(SeekFrom::Start(offset)).map_err(io)?;
    let mut buf = Vec::new();
    f.take(len).read_to_end(&mut buf).map_err(io)?;
    Ok(buf)
}

/// Taille d'un fichier accordé.
pub fn size_granted(g: &GrantedPaths, path: &Path) -> Result<u64, ReadError> {
    let c = g.granted_path(path).ok_or(ReadError::NotGranted)?;
    std::fs::metadata(&c).map(|m| m.len()).map_err(io)
}

/// Vrai si l'extension de `path` est celle d'un média, sans tenir compte de la casse.
pub fn has_media_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| MEDIA_EXTENSIONS.iter().any(|x| x.eq_ignore_ascii_case(e)))
}

/// Empreinte SHA-256 (hexadécimal minuscule) d'un média accordé, lue par morceaux de `HASH_CHUNK` ; ouvre le chemin
/// canonique vérifié, pas le chemin reçu.
pub fn sha256_granted(g: &GrantedPaths, path: &Path) -> Result<String, ReadError> {
    use sha2::{Digest, Sha256};
    let c = g.granted_path(path).ok_or(ReadError::NotGranted)?;
    if !has_media_extension(&c) {
        return Err(ReadError::NotMedia);
    }
    let mut f = File::open(&c).map_err(io)?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; HASH_CHUNK];
    loop {
        let n = f.read(&mut buf).map_err(io)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect())
}

/// Chemin canonique d'un média lié retrouvé : fichier ordinaire, extension de média, même taille que celle notée.
pub fn check_linked_media(path: &Path, size: u64) -> Result<PathBuf, ReadError> {
    let c = path.canonicalize().map_err(io)?;
    let meta = std::fs::metadata(&c).map_err(io)?;
    if !meta.is_file() {
        return Err(ReadError::Io("fichier ordinaire attendu".into()));
    }
    if !has_media_extension(&c) {
        return Err(ReadError::NotMedia);
    }
    if meta.len() != size {
        return Err(ReadError::SizeMismatch);
    }
    Ok(c)
}

/// Arguments du lancement (sans le programme) dont l'extension est associée ; options (`-…`) ignorées.
pub fn launch_paths<I: IntoIterator<Item = String>>(args: I, extensions: &[&str]) -> Vec<PathBuf> {
    args.into_iter()
        .filter(|a| !a.starts_with('-'))
        .map(PathBuf::from)
        .filter(|p| {
            p.extension()
                .and_then(|e| e.to_str())
                .is_some_and(|e| extensions.iter().any(|x| x.eq_ignore_ascii_case(e)))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn dir(name: &str) -> PathBuf {
        let d = std::env::temp_dir().join(format!("rb-shell-{}-{name}", std::process::id()));
        let _ = fs::remove_dir_all(&d);
        fs::create_dir_all(&d).unwrap();
        d
    }

    #[test]
    fn granted_file_reads_range() {
        let d = dir("range");
        let f = d.join("a.roomboard");
        fs::write(&f, b"0123456789").unwrap();
        let g = GrantedPaths::default();
        assert_eq!(g.grant([f.clone()]).len(), 1);
        assert_eq!(read_granted(&g, &f, 2, 3).unwrap(), b"234");
        assert_eq!(read_granted(&g, &f, 8, 10).unwrap(), b"89");
    }

    #[test]
    fn ungranted_file_is_refused() {
        let d = dir("refused");
        let f = d.join("b.roomboard");
        fs::write(&f, b"x").unwrap();
        assert_eq!(
            read_granted(&GrantedPaths::default(), &f, 0, 1),
            Err(ReadError::NotGranted)
        );
    }

    /// Distingue le patron interdit (portée par dossier de tauri-plugin-fs, `scope_dropped_paths`) : un dossier
    /// déposé n'est jamais accordé, et rien de ce qu'il contient ne devient lisible.
    #[test]
    fn directory_is_never_granted() {
        let d = dir("folder");
        let inner = d.join("c.roomboard");
        fs::write(&inner, b"x").unwrap();
        let g = GrantedPaths::default();
        assert!(g.grant([d.clone()]).is_empty());
        assert_eq!(read_granted(&g, &inner, 0, 1), Err(ReadError::NotGranted));
        assert_eq!(size_granted(&g, &inner), Err(ReadError::NotGranted));
    }

    /// Distingue une comparaison par préfixe de chaîne : le nom d'un fichier accordé, prolongé, n'est pas accordé.
    #[test]
    fn granted_name_is_not_a_prefix() {
        let d = dir("prefix");
        let f = d.join("h.roomboard");
        fs::write(&f, b"ok").unwrap();
        let longer = d.join("h.roomboard.secret");
        fs::write(&longer, b"s").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(read_granted(&g, &longer, 0, 1), Err(ReadError::NotGranted));
    }

    #[test]
    fn chunk_over_limit_is_refused() {
        let d = dir("chunk");
        let f = d.join("d.roomboard");
        fs::write(&f, b"x").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(
            read_granted(&g, &f, 0, MAX_CHUNK + 1),
            Err(ReadError::TooLarge)
        );
        assert_eq!(read_granted(&g, &f, 0, MAX_CHUNK).unwrap(), b"x");
    }

    #[test]
    fn offset_past_end_reads_empty() {
        let d = dir("past");
        let f = d.join("e.roomboard");
        fs::write(&f, b"abc").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert!(read_granted(&g, &f, 10, 5).unwrap().is_empty());
    }

    #[test]
    fn dotdot_path_resolves_to_the_granted_file() {
        let d = dir("dotdot");
        fs::create_dir_all(d.join("x")).unwrap();
        let f = d.join("f.roomboard");
        fs::write(&f, b"ok").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(
            read_granted(&g, &d.join("x").join("..").join("f.roomboard"), 0, 2).unwrap(),
            b"ok"
        );
    }

    #[cfg(unix)]
    #[test]
    fn symlink_to_ungranted_file_is_refused() {
        let d = dir("link");
        let secret = d.join("secret.txt");
        fs::write(&secret, b"s").unwrap();
        let granted = d.join("g.roomboard");
        fs::write(&granted, b"g").unwrap();
        let g = GrantedPaths::default();
        g.grant([granted.clone()]);
        let link = d.join("l.roomboard");
        std::os::unix::fs::symlink(&secret, &link).unwrap();
        assert_eq!(read_granted(&g, &link, 0, 1), Err(ReadError::NotGranted));
    }

    /// Distingue un ensemble de chemins reçus (non canoniques) : un lien accordé puis redirigé vers un autre fichier
    /// ne donne pas accès à sa nouvelle cible ; seul le fichier canonique accordé reste lisible.
    #[cfg(unix)]
    #[test]
    fn retargeted_symlink_is_refused() {
        let d = dir("retarget");
        let doc = d.join("doc.roomboard");
        fs::write(&doc, b"d").unwrap();
        let secret = d.join("secret.txt");
        fs::write(&secret, b"s").unwrap();
        let link = d.join("link.roomboard");
        std::os::unix::fs::symlink(&doc, &link).unwrap();
        let g = GrantedPaths::default();
        assert_eq!(g.grant([link.clone()]), vec![doc.canonicalize().unwrap()]);
        fs::remove_file(&link).unwrap();
        std::os::unix::fs::symlink(&secret, &link).unwrap();
        assert_eq!(read_granted(&g, &link, 0, 1), Err(ReadError::NotGranted));
        assert_eq!(read_granted(&g, &doc, 0, 1).unwrap(), b"d");
    }

    #[test]
    fn size_granted_reports_length() {
        let d = dir("size");
        let f = d.join("g.roomboard");
        fs::write(&f, b"12345").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert_eq!(size_granted(&g, &f), Ok(5));
        assert_eq!(
            size_granted(&GrantedPaths::default(), &f),
            Err(ReadError::NotGranted)
        );
    }

    #[test]
    fn missing_path_is_not_granted() {
        let d = dir("missing");
        let g = GrantedPaths::default();
        assert!(g.grant([d.join("absent.roomboard")]).is_empty());
        assert_eq!(g.granted_path(&d.join("absent.roomboard")), None);
    }

    /// C16 (O35) : le PDF converti, accordé le temps de sa lecture, ne l'est plus après `revoke` ; un chemin jamais
    /// accordé rend faux.
    #[test]
    fn revoke_removes_the_grant() {
        let d = dir("revoke");
        let f = d.join("source.pdf");
        fs::write(&f, b"%PDF-").unwrap();
        let g = GrantedPaths::default();
        g.grant([f.clone()]);
        assert!(g.revoke(&f));
        assert_eq!(read_granted(&g, &f, 0, 1), Err(ReadError::NotGranted));
        assert!(!g.revoke(&f));
        assert!(!g.revoke(&d.join("absent.pdf")));
    }

    #[test]
    fn launch_paths_keeps_associated_extensions() {
        let args = [
            "--flag",
            "/x/Cours.RoomBoard",
            "/x/photo.png",
            "/x/b.roomboard",
            "/x/objet.RBITEM",
            "/x/Fractions.rbpack",
        ]
        .map(String::from);
        assert_eq!(
            launch_paths(args, ASSOCIATED_EXTENSIONS),
            vec![
                PathBuf::from("/x/Cours.RoomBoard"),
                PathBuf::from("/x/b.roomboard"),
                PathBuf::from("/x/objet.RBITEM"),
                PathBuf::from("/x/Fractions.rbpack")
            ]
        );
    }

    #[test]
    fn tauri_conf_associations_match_associated_extensions() {
        let raw = include_str!("../../../apps/desktop/src-tauri/tauri.conf.json");
        let conf: serde_json::Value = serde_json::from_str(raw).expect("tauri.conf.json lisible");
        let mut exts: Vec<String> = conf["bundle"]["fileAssociations"]
            .as_array()
            .expect("fileAssociations")
            .iter()
            .flat_map(|a| a["ext"].as_array().cloned().unwrap_or_default())
            .filter_map(|e| e.as_str().map(String::from))
            .collect();
        exts.sort();
        let mut expected: Vec<String> = ASSOCIATED_EXTENSIONS
            .iter()
            .map(|s| s.to_string())
            .collect();
        expected.sort();
        assert_eq!(exts, expected);
        let pack = conf["bundle"]["fileAssociations"]
            .as_array()
            .unwrap()
            .iter()
            .find(|a| a["ext"][0] == "rbpack")
            .expect("association rbpack");
        assert_eq!(pack["mimeType"], "application/x-roomboard-pack");
        assert_eq!(pack["name"], "Paquet RoomBoard");
    }

    #[test]
    fn capabilities_grant_library_folder_only() {
        let raw = include_str!("../../../apps/desktop/src-tauri/capabilities/default.json");
        let caps: serde_json::Value = serde_json::from_str(raw).expect("default.json lisible");
        let perms = caps["permissions"].as_array().expect("permissions");
        // Moindre privilège (C5, C8) : exactement ces permissions fs, ni `fs:default`, ni `fs:allow-home-*`, ni
        // `fs:allow-exists` (jamais appelée), et une seule portée fs.
        let mut names: Vec<&str> = perms
            .iter()
            .filter_map(|p| p.as_str())
            .filter(|p| p.starts_with("fs:"))
            .collect();
        names.sort_unstable();
        assert_eq!(
            names,
            vec![
                "fs:allow-mkdir",
                "fs:allow-read-dir",
                "fs:allow-read-file",
                "fs:allow-remove",
                "fs:allow-write-file",
            ]
        );
        let scopes: Vec<&serde_json::Value> = perms
            .iter()
            .filter(|p| {
                p["identifier"]
                    .as_str()
                    .is_some_and(|i| i.starts_with("fs:"))
            })
            .collect();
        assert_eq!(scopes.len(), 1, "une seule entrée fs objet");
        let scope = scopes[0];
        assert_eq!(scope["identifier"], "fs:scope");
        let allow: Vec<&str> = scope["allow"]
            .as_array()
            .expect("allow")
            .iter()
            .filter_map(|a| a["path"].as_str())
            .collect();
        assert_eq!(
            allow,
            vec![
                "$DOCUMENT/RoomBoard/Ressources",
                "$DOCUMENT/RoomBoard/Ressources/**"
            ]
        );
    }

    #[test]
    fn sha256_granted_hashes_in_chunks() {
        use sha2::{Digest, Sha256};
        let d = dir("sha");
        let big = d.join("a.webm");
        let data: Vec<u8> = (0..HASH_CHUNK + 3).map(|i| (i % 251) as u8).collect();
        fs::write(&big, &data).unwrap();
        let abc = d.join("b.mp3");
        fs::write(&abc, b"abc").unwrap();
        let g = GrantedPaths::default();
        g.grant([big.clone(), abc.clone()]);
        let want: String = Sha256::digest(&data)
            .iter()
            .map(|b| format!("{b:02x}"))
            .collect();
        assert_eq!(sha256_granted(&g, &big).unwrap(), want);
        assert_eq!(
            sha256_granted(&g, &abc).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn sha256_granted_refuses_ungranted_and_non_media() {
        let d = dir("sharef");
        let v = d.join("a.webm");
        fs::write(&v, b"x").unwrap();
        let t = d.join("a.txt");
        fs::write(&t, b"x").unwrap();
        let g = GrantedPaths::default();
        assert_eq!(sha256_granted(&g, &v), Err(ReadError::NotGranted));
        g.grant([t.clone()]);
        assert_eq!(sha256_granted(&g, &t), Err(ReadError::NotMedia));
    }

    #[test]
    fn check_linked_media_needs_media_extension_and_same_size() {
        let d = dir("check");
        let v = d.join("a.mp4");
        fs::write(&v, b"12345").unwrap();
        let t = d.join("a.txt");
        fs::write(&t, b"12345").unwrap();
        assert_eq!(
            check_linked_media(&v, 5).unwrap(),
            v.canonicalize().unwrap()
        );
        assert_eq!(check_linked_media(&v, 6), Err(ReadError::SizeMismatch));
        assert_eq!(check_linked_media(&t, 5), Err(ReadError::NotMedia));
        assert!(matches!(
            check_linked_media(&d.join("absent.mp4"), 5),
            Err(ReadError::Io(_))
        ));
    }

    #[test]
    fn media_extensions_ignore_case() {
        assert!(has_media_extension(Path::new("/x/A.WEBM")));
        assert!(has_media_extension(Path::new("b.Mp4")));
        assert!(!has_media_extension(Path::new("c.txt")));
        assert!(!has_media_extension(Path::new("webm")));
    }
}
