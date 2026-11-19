//! Logique de la coque testable sans Tauri (lot 5b, CL5b-13, CL5b-14) : fichiers accordés à la page (dépôt,
//! lancement), lecture bornée par morceaux, fichiers passés au lancement. Égalité stricte de chemins canoniques de
//! fichiers : jamais un dossier, jamais une recherche par préfixe (contrairement à la portée de tauri-plugin-fs).

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
        assert_eq!(read_granted(&GrantedPaths::default(), &f, 0, 1), Err(ReadError::NotGranted));
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
        assert_eq!(read_granted(&g, &f, 0, MAX_CHUNK + 1), Err(ReadError::TooLarge));
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
        assert_eq!(read_granted(&g, &d.join("x").join("..").join("f.roomboard"), 0, 2).unwrap(), b"ok");
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
        assert_eq!(size_granted(&GrantedPaths::default(), &f), Err(ReadError::NotGranted));
    }

    #[test]
    fn missing_path_is_not_granted() {
        let d = dir("missing");
        let g = GrantedPaths::default();
        assert!(g.grant([d.join("absent.roomboard")]).is_empty());
        assert_eq!(g.granted_path(&d.join("absent.roomboard")), None);
    }

    #[test]
    fn launch_paths_keeps_associated_extensions() {
        let args = ["--flag", "/x/Cours.RoomBoard", "/x/photo.png", "/x/b.roomboard"].map(String::from);
        assert_eq!(
            launch_paths(args, ASSOCIATED_EXTENSIONS),
            vec![PathBuf::from("/x/Cours.RoomBoard"), PathBuf::from("/x/b.roomboard")]
        );
    }
}
