//! C11a (P9, P10, P11, P15, P16) : logique pure de l'annotation de bureau.
use roomboard_shell::annotation::{
    compat_env, cursor_in, detect_session, physical, pick_screen, relaunch_args, side_of, split, supported, Rect,
    Session, Side, Unsupported,
};
use std::collections::HashMap;
use std::ffi::OsString;

fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
    let m: HashMap<String, String> = pairs.iter().map(|(k, v)| ((*k).to_string(), (*v).to_string())).collect();
    move |k| m.get(k).cloned()
}

fn r(x: i32, y: i32, w: u32, h: u32) -> Rect {
    Rect { x, y, w, h }
}

fn disjoint(a: Rect, b: Rect) -> bool {
    let (ax1, ay1) = (i64::from(a.x) + i64::from(a.w), i64::from(a.y) + i64::from(a.h));
    let (bx1, by1) = (i64::from(b.x) + i64::from(b.w), i64::from(b.y) + i64::from(b.h));
    ax1 <= i64::from(b.x) || bx1 <= i64::from(a.x) || ay1 <= i64::from(b.y) || by1 <= i64::from(a.y)
}

#[test]
fn wayland_natif_sans_gdk_x11() {
    assert_eq!(detect_session("linux", env(&[("WAYLAND_DISPLAY", "wayland-0")])), Session::WaylandNative);
    assert_eq!(detect_session("linux", env(&[("XDG_SESSION_TYPE", "wayland")])), Session::WaylandNative);
    assert_eq!(supported(Session::WaylandNative), Err(Unsupported::Wayland));
}

#[test]
fn xwayland_quand_gdk_backend_x11() {
    let s = detect_session("linux", env(&[("WAYLAND_DISPLAY", "wayland-0"), ("GDK_BACKEND", "x11")]));
    assert_eq!(s, Session::XWayland);
    assert_eq!(supported(s), Ok(()));
    let liste = detect_session("linux", env(&[("XDG_SESSION_TYPE", "wayland"), ("GDK_BACKEND", "x11,wayland")]));
    assert_eq!(liste, Session::XWayland);
}

#[test]
fn x11_sans_wayland() {
    let s = detect_session("linux", env(&[("DISPLAY", ":0"), ("XDG_SESSION_TYPE", "x11")]));
    assert_eq!(s, Session::X11);
    assert_eq!(supported(s), Ok(()));
}

#[test]
fn wayland_display_vide_ne_compte_pas() {
    assert_eq!(detect_session("linux", env(&[("WAYLAND_DISPLAY", "")])), Session::X11);
}

#[test]
fn windows_et_macos_hors_linux() {
    for os in ["windows", "macos"] {
        let s = detect_session(os, env(&[("WAYLAND_DISPLAY", "wayland-0")]));
        assert_eq!(s, Session::Other);
        assert_eq!(supported(s), Ok(()));
    }
}

#[test]
fn split_quatre_cotes_disjoints() {
    let screen = r(0, 0, 1920, 1080);
    let cases = [
        (Side::Top, r(0, 0, 1920, 64), r(0, 64, 1920, 1016)),
        (Side::Bottom, r(0, 1016, 1920, 64), r(0, 0, 1920, 1016)),
        (Side::Left, r(0, 0, 64, 1080), r(64, 0, 1856, 1080)),
        (Side::Right, r(1856, 0, 64, 1080), r(0, 0, 1856, 1080)),
    ];
    for (side, bar, area) in cases {
        assert_eq!(split(screen, side, 64), (bar, area), "{side:?}");
        assert!(disjoint(bar, area), "{side:?}");
        let total = u64::from(bar.w) * u64::from(bar.h) + u64::from(area.w) * u64::from(area.h);
        assert_eq!(total, 1920 * 1080, "{side:?}");
    }
}

#[test]
fn split_deux_ecrans_echelles_differentes() {
    let second = r(1920, 0, 3840, 2160);
    let t = physical(48.0, 2.0);
    assert_eq!(t, 96);
    assert_eq!(split(second, Side::Top, t), (r(1920, 0, 3840, 96), r(1920, 96, 3840, 2064)));
    // 48,4 px CSS à 125 % = 60,5 px : arrondi au-dessus, la barre n'est jamais rognée.
    assert_eq!(physical(48.4, 1.25), 61);
    assert_eq!(physical(-3.0, 2.0), 0);
}

#[test]
fn split_epaisseur_plus_grande_que_l_ecran() {
    let (bar, area) = split(r(0, 0, 800, 600), Side::Top, 900);
    assert_eq!((bar.h, area.h), (600, 0));
    let (bar, area) = split(r(0, 0, 800, 600), Side::Right, 900);
    assert_eq!((bar.w, area.w), (800, 0));
}

#[test]
fn side_of_dock() {
    assert_eq!(side_of("top"), Side::Top);
    assert_eq!(side_of("bottom"), Side::Bottom);
    assert_eq!(side_of("left"), Side::Left);
    assert_eq!(side_of("right"), Side::Right);
    assert_eq!(side_of("floating"), Side::Top);
    assert_eq!(side_of("inconnu"), Side::Top);
}

#[test]
fn pick_screen_ecran_de_la_principale_ou_demande() {
    let screens = [r(0, 0, 1920, 1080), r(1920, 0, 3840, 2160)];
    assert_eq!(pick_screen(&screens, None, (2500, 400)), 1);
    assert_eq!(pick_screen(&screens, None, (100, 100)), 0);
    assert_eq!(pick_screen(&screens, Some(1), (100, 100)), 1);
    assert_eq!(pick_screen(&screens, Some(5), (2500, 400)), 1);
    assert_eq!(pick_screen(&screens, None, (-500, 100)), 0);
    assert_eq!(pick_screen(&[], None, (0, 0)), 0);
}

#[test]
fn cursor_in_relatif_a_la_fenetre() {
    let w = r(1920, 96, 3840, 2064);
    assert_eq!(cursor_in((2020.0, 296.0), w, 2.0), Some((50.0, 100.0)));
    assert_eq!(cursor_in((1919.0, 296.0), w, 2.0), None);
    assert_eq!(cursor_in((2020.0, 50.0), w, 2.0), None);
    assert_eq!(cursor_in((5760.0, 296.0), w, 2.0), None);
    assert_eq!(cursor_in((2020.0, 296.0), w, 0.0), None);
}

#[test]
fn relance_memes_arguments_et_gdk_x11() {
    let args = ["roomboard-desktop", "/tmp/a b.roomboard", "--x"].map(OsString::from);
    assert_eq!(
        relaunch_args(args.into_iter()),
        vec![OsString::from("/tmp/a b.roomboard"), OsString::from("--x")]
    );
    assert_eq!(compat_env(), [("GDK_BACKEND", "x11")]);
}

#[cfg(unix)]
#[test]
fn relance_garde_un_argument_non_utf8() {
    use std::os::unix::ffi::OsStringExt;
    let raw = OsString::from_vec(vec![0x66, 0xff, 0x6f]);
    assert_eq!(relaunch_args([OsString::from("rb"), raw.clone()].into_iter()), vec![raw]);
}
