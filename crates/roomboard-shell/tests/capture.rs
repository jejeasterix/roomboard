//! C11b (P19, P21 à P26) : capture d'écran, découpe, PNG, fichier accordé, purge.
use roomboard_shell::annotation::{Rect, Session};
use roomboard_shell::capture::{
    allowed, area_in_frame, bgrx_to_rgba, capture_area, capture_monitor, crop, encode_png,
    authorized, inside_root, nearest, purge, purge_older, release, save_granted, CaptureError, Frame,
    CAPTURES_DIR, HIDDEN_SETTLE_MS, PURGE_AGE,
};
use roomboard_shell::{read_granted, GrantedPaths, MAX_CHUNK};
use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

fn r(x: i32, y: i32, w: u32, h: u32) -> Rect {
    Rect { x, y, w, h }
}

fn dir(name: &str) -> PathBuf {
    let d = std::env::temp_dir().join(format!("rb-capture-{}-{name}", std::process::id()));
    let _ = fs::remove_dir_all(&d);
    fs::create_dir_all(&d).unwrap();
    d
}

/// Image w × h dont chaque pixel vaut (rang, rang, rang, 255), rang = y * w + x (mod 256).
fn ramp(w: u32, h: u32) -> Frame {
    let mut rgba = Vec::new();
    for i in 0..w * h {
        let v = (i % 256) as u8;
        rgba.extend_from_slice(&[v, v, v, 255]);
    }
    Frame {
        width: w,
        height: h,
        rgba,
    }
}

#[test]
fn constantes_du_cadrage() {
    assert_eq!(HIDDEN_SETTLE_MS, 250);
    assert_eq!(CAPTURES_DIR, "captures");
    assert_eq!(PURGE_AGE, Duration::from_secs(60));
    assert_eq!(CaptureError::Denied.code(), "denied");
    assert_eq!(CaptureError::Wayland.code(), "wayland");
    assert_eq!(CaptureError::Failed("x".into()).code(), "failed");
}

#[test]
fn zone_a_l_echelle_1() {
    let m = r(0, 0, 1920, 1080);
    assert_eq!(
        area_in_frame(1920, 1080, m, r(0, 64, 1920, 1016)),
        Some(r(0, 64, 1920, 1016))
    );
}

#[test]
fn zone_a_l_echelle_2_points_macos() {
    // Écran décrit en points (1440 × 900), image en pixels (2880 × 1800).
    let m = r(0, 0, 1440, 900);
    assert_eq!(
        area_in_frame(2880, 1800, m, r(0, 0, 1380, 900)),
        Some(r(0, 0, 2760, 1800))
    );
}

#[test]
fn zone_sur_le_second_ecran() {
    let m = r(1920, 0, 2560, 1440);
    assert_eq!(
        area_in_frame(2560, 1440, m, r(1920, 48, 2560, 1392)),
        Some(r(0, 48, 2560, 1392))
    );
}

#[test]
fn zone_echelle_fractionnaire_bornee_a_l_image() {
    // RF4 (P23) : 150 %, arrondis ; la zone ne dépasse jamais l'image.
    let m = r(0, 0, 1707, 960);
    let z = area_in_frame(2560, 1440, m, r(0, 43, 1707, 917)).unwrap();
    assert!(z.x >= 0 && z.y >= 0);
    assert!(z.x as u32 + z.w <= 2560 && z.y as u32 + z.h <= 1440);
    assert_eq!((z.x, z.y, z.w, z.h), (0, 65, 2560, 1375));
}

#[test]
fn zone_hors_image_ou_vide() {
    let m = r(0, 0, 100, 100);
    assert_eq!(area_in_frame(100, 100, m, r(200, 200, 50, 50)), None);
    assert_eq!(area_in_frame(100, 100, m, r(0, 0, 0, 10)), None);
    assert_eq!(area_in_frame(0, 100, m, r(0, 0, 10, 10)), None);
    assert_eq!(
        area_in_frame(100, 100, r(0, 0, 0, 0), r(0, 0, 10, 10)),
        None
    );
    assert_eq!(
        area_in_frame(100, 100, m, r(90, 90, 50, 50)),
        Some(r(90, 90, 10, 10))
    );
}

#[test]
fn decoupe_d_une_zone() {
    let c = crop(&ramp(4, 3), r(1, 1, 2, 2));
    assert_eq!((c.width, c.height), (2, 2));
    let firsts: Vec<u8> = c.rgba.as_chunks::<4>().0.iter().map(|p| p[0]).collect();
    assert_eq!(firsts, vec![5, 6, 9, 10]);
}

#[test]
fn decoupe_bornee_a_l_image() {
    let c = crop(&ramp(4, 3), r(3, 2, 10, 10));
    assert_eq!((c.width, c.height, c.rgba.len()), (1, 1, 4));
}

#[test]
fn bgrx_vers_rgba_avec_remplissage_de_ligne() {
    // 2 × 2, 12 octets par ligne (4 de remplissage).
    let src = [
        1, 2, 3, 0, 4, 5, 6, 0, 9, 9, 9, 9, 7, 8, 9, 0, 10, 11, 12, 0, 9, 9, 9, 9,
    ];
    assert_eq!(
        bgrx_to_rgba(&src, 2, 2, 12),
        vec![3, 2, 1, 255, 6, 5, 4, 255, 9, 8, 7, 255, 12, 11, 10, 255]
    );
    // Source tronquée : les lignes complètes seulement.
    assert_eq!(bgrx_to_rgba(&src[..12], 2, 2, 12).len(), 8);
}

#[test]
fn png_relu_a_l_identique() {
    let f = ramp(7, 5);
    let png = encode_png(&f).unwrap();
    assert_eq!(&png[..8], &[137, 80, 78, 71, 13, 10, 26, 10]);
    let mut reader = png::Decoder::new(std::io::Cursor::new(&png))
        .read_info()
        .unwrap();
    let mut buf = vec![0; reader.output_buffer_size().unwrap()];
    let info = reader.next_frame(&mut buf).unwrap();
    assert_eq!(
        (info.width, info.height, info.color_type),
        (7, 5, png::ColorType::Rgba)
    );
    assert_eq!(&buf[..info.buffer_size()], &f.rgba[..]);
}

#[test]
fn png_refuse_une_image_vide_ou_tronquee() {
    let vide = Frame {
        width: 0,
        height: 0,
        rgba: vec![],
    };
    assert!(matches!(encode_png(&vide), Err(CaptureError::Failed(_))));
    let tronquee = Frame {
        width: 2,
        height: 2,
        rgba: vec![0; 15],
    };
    assert!(matches!(
        encode_png(&tronquee),
        Err(CaptureError::Failed(_))
    ));
}

#[test]
fn fichier_accorde_lisible_puis_retire() {
    let root = dir("accorde");
    let g = GrantedPaths::default();
    let png = encode_png(&ramp(3, 2)).unwrap();
    let c = save_granted(&g, &root, &png, 3, 2).unwrap();
    assert_eq!((c.size, c.width, c.height), (png.len() as u64, 3, 2));
    assert!(c
        .path
        .starts_with(root.canonicalize().unwrap().join(CAPTURES_DIR)));
    assert_eq!(read_granted(&g, &c.path, 0, MAX_CHUNK).unwrap(), png);
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        assert_eq!(
            fs::metadata(&c.path).unwrap().permissions().mode() & 0o777,
            0o600
        );
        let d = fs::metadata(root.join(CAPTURES_DIR)).unwrap();
        assert_eq!(d.permissions().mode() & 0o777, 0o700);
    }
    release(&g, &root, &c.id);
    assert!(g.granted_path(&c.path).is_none());
    assert!(!c.path.exists());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn deux_captures_deux_fichiers() {
    let root = dir("deux");
    let g = GrantedPaths::default();
    let a = save_granted(&g, &root, b"a", 1, 1).unwrap();
    let b = save_granted(&g, &root, b"b", 1, 1).unwrap();
    assert_ne!(a.id, b.id);
    assert_ne!(a.path, b.path);
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn release_ignore_un_identifiant_forge() {
    let root = dir("forge");
    let g = GrantedPaths::default();
    let c = save_granted(&g, &root, b"x", 1, 1).unwrap();
    let nested = format!("{}/x", c.id);
    for bad in ["../../etc/passwd", "", "1", "1-2-3", "a-1", nested.as_str()] {
        release(&g, &root, bad);
    }
    assert!(c.path.exists());
    assert!(g.granted_path(&c.path).is_some());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn purge_des_restes_d_une_autre_instance() {
    let root = dir("purge");
    purge(&root.join("absent")); // aucun dossier : rien, aucune panique
    let caps = root.join(CAPTURES_DIR);
    fs::create_dir_all(&caps).unwrap();
    let old = caps.join("1-1.png");
    let young = caps.join("2-1.png");
    let mine = caps.join(format!("{}-7.png", std::process::id()));
    let other = caps.join("notes.txt");
    for p in [&old, &young, &mine, &other] {
        fs::write(p, b"x").unwrap();
    }
    let past = SystemTime::now() - Duration::from_secs(3600);
    for p in [&old, &mine] {
        fs::File::options()
            .write(true)
            .open(p)
            .unwrap()
            .set_modified(past)
            .unwrap();
    }
    purge_older(&root, PURGE_AGE);
    assert!(!old.exists(), "reste d'un plantage supprimé");
    assert!(
        young.exists(),
        "capture récente d'une autre instance gardée"
    );
    assert!(mine.exists(), "capture de ce processus gardée");
    assert!(other.exists(), "fichier étranger gardé");
    purge_older(&root, Duration::ZERO);
    assert!(!young.exists());
    assert!(mine.exists());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn wayland_refuse_sans_essai() {
    for s in [Session::XWayland, Session::WaylandNative] {
        assert_eq!(allowed(s), Err(CaptureError::Wayland));
        assert_eq!(
            capture_monitor(s, r(0, 0, 10, 10)),
            Err(CaptureError::Wayland)
        );
        let root = dir("wayland");
        let g = GrantedPaths::default();
        assert_eq!(
            capture_area(&g, &root, s, r(0, 0, 10, 10), r(0, 0, 10, 10)),
            Err(CaptureError::Wayland)
        );
        assert!(!root.join(CAPTURES_DIR).exists(), "aucun fichier écrit");
        let _ = fs::remove_dir_all(&root);
    }
    assert_eq!(allowed(Session::X11), Ok(()));
    assert_eq!(allowed(Session::Other), Ok(()));
}

#[test]
fn ecran_le_plus_proche_et_racine_x11() {
    assert_eq!(nearest(&[(0, 0), (1920, 0)], (1920, 0)), Some(1));
    assert_eq!(nearest(&[(0, 0), (2880, 0)], (2879, 3)), Some(1));
    assert_eq!(nearest(&[], (0, 0)), None);
    assert!(inside_root(3840, 1080, r(1920, 0, 1920, 1080)));
    assert!(!inside_root(1920, 1080, r(1920, 0, 1920, 1080)));
    assert!(!inside_root(1920, 1080, r(-10, 0, 100, 100)));
    assert!(!inside_root(1920, 1080, r(0, 0, 0, 100)));
}

#[test]
#[ignore = "écran X11 réel : DISPLAY=:0 cargo test -p roomboard-shell --test capture -- --ignored"]
fn capture_x11_reelle() {
    let f = capture_monitor(Session::X11, r(0, 0, 64, 64)).expect("capture X11");
    assert_eq!((f.width, f.height, f.rgba.len()), (64, 64, 64 * 64 * 4));
    assert!(f.rgba.as_chunks::<4>().0.iter().all(|p| p[3] == 255));
}

#[test]
fn une_capture_existante_du_meme_pid_n_arrete_pas_la_suivante() {
    let root = dir("meme-pid");
    let g = GrantedPaths::default();
    let first = save_granted(&g, &root, b"a", 1, 1).unwrap();
    let n: u64 = first.id.rsplit('-').next().unwrap().parse().unwrap();
    // Reste d'un plantage de même pid : les prochains numéros sont déjà pris.
    for k in n + 1..=n + 20 {
        let p = root.join(CAPTURES_DIR).join(format!("{}-{k}.png", std::process::id()));
        fs::write(p, b"reste").unwrap();
    }
    let next = save_granted(&g, &root, b"b", 1, 1).expect("numéro suivant libre essayé");
    assert_ne!(next.id, first.id);
    assert_eq!(fs::read(&next.path).unwrap(), b"b");
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn autorisation_vraie_hors_macos() {
    if !cfg!(target_os = "macos") {
        assert!(authorized());
    }
}
