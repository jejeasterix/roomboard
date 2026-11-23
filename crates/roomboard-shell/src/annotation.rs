//! C11a (P9, P10, P11, P15, P16, DA3, DA4) : logique pure de l'annotation de bureau, testable sans Tauri : session
//! graphique, découpe de l'écran en bande de barre et zone d'annotation disjointes, épaisseur physique, choix de l'écran,
//! curseur relatif à la fenêtre, relance en mode compatibilité. Ni machine d'états ni sondage : l'état vit dans la page.
use std::ffi::OsString;

/// Session graphique du poste (P16). `XWayland` : session Wayland avec `GDK_BACKEND=x11` (mode compatibilité).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Session {
    X11,
    XWayland,
    WaylandNative,
    Other,
}

/// Raison d'une annotation indisponible.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Unsupported {
    Wayland,
}

/// Rectangle en pixels physiques du bureau.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: u32,
    pub h: u32,
}

/// Côté de l'écran où se place la bande de la barre (P10).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Top,
    Bottom,
    Left,
    Right,
}

/// Wayland natif : `WAYLAND_DISPLAY` non vide ou `XDG_SESSION_TYPE=wayland`, sans `GDK_BACKEND` commençant par `x11`.
/// Hors Linux : `Other` (Windows et macOS ont l'annotation).
pub fn detect_session(os: &str, env: impl Fn(&str) -> Option<String>) -> Session {
    if os != "linux" {
        return Session::Other;
    }
    let wayland = env("WAYLAND_DISPLAY").is_some_and(|v| !v.is_empty())
        || env("XDG_SESSION_TYPE").is_some_and(|v| v.eq_ignore_ascii_case("wayland"));
    let forced_x11 =
        env("GDK_BACKEND").is_some_and(|v| v.split(',').next().is_some_and(|b| b.trim() == "x11"));
    match (wayland, forced_x11) {
        (true, true) => Session::XWayland,
        (true, false) => Session::WaylandNative,
        (false, _) => Session::X11,
    }
}

/// Seul Wayland natif refuse l'annotation (aucun code `layer-shell`, P16).
pub fn supported(s: Session) -> Result<(), Unsupported> {
    match s {
        Session::WaylandNative => Err(Unsupported::Wayland),
        _ => Ok(()),
    }
}

/// `dock` de la première barre `tools` ; `floating` et toute valeur inconnue : haut (P10).
pub fn side_of(dock: &str) -> Side {
    match dock {
        "bottom" => Side::Bottom,
        "left" => Side::Left,
        "right" => Side::Right,
        _ => Side::Top,
    }
}

/// (barre, annotation) : deux rectangles disjoints qui couvrent l'écran ; l'épaisseur est bornée par l'écran (DA4).
pub fn split(screen: Rect, side: Side, thickness: u32) -> (Rect, Rect) {
    let Rect { x, y, w, h } = screen;
    match side {
        Side::Top | Side::Bottom => {
            let t = thickness.min(h);
            let rest = h - t;
            let (bar_y, area_y) = if side == Side::Top {
                (y, y + t as i32)
            } else {
                (y + rest as i32, y)
            };
            (
                Rect {
                    x,
                    y: bar_y,
                    w,
                    h: t,
                },
                Rect {
                    x,
                    y: area_y,
                    w,
                    h: rest,
                },
            )
        }
        Side::Left | Side::Right => {
            let t = thickness.min(w);
            let rest = w - t;
            let (bar_x, area_x) = if side == Side::Left {
                (x, x + t as i32)
            } else {
                (x + rest as i32, x)
            };
            (
                Rect {
                    x: bar_x,
                    y,
                    w: t,
                    h,
                },
                Rect {
                    x: area_x,
                    y,
                    w: rest,
                    h,
                },
            )
        }
    }
}

/// Épaisseur mesurée dans la page (px CSS) en pixels physiques du moniteur, arrondie au-dessus.
pub fn physical(css: f64, scale: f64) -> u32 {
    (css.max(0.0) * scale).ceil() as u32
}

fn contains(r: &Rect, x: i32, y: i32) -> bool {
    let (x, y) = (i64::from(x), i64::from(y));
    x >= i64::from(r.x)
        && y >= i64::from(r.y)
        && x < i64::from(r.x) + i64::from(r.w)
        && y < i64::from(r.y) + i64::from(r.h)
}

fn dist2(r: &Rect, x: i32, y: i32) -> i64 {
    let cx = i64::from(r.x) + i64::from(r.w) / 2;
    let cy = i64::from(r.y) + i64::from(r.h) / 2;
    (cx - i64::from(x)).pow(2) + (cy - i64::from(y)).pow(2)
}

/// Écran demandé s'il existe, sinon celui qui contient le centre de la fenêtre principale, sinon le plus proche (P15).
pub fn pick_screen(screens: &[Rect], wanted: Option<usize>, main_center: (i32, i32)) -> usize {
    if let Some(i) = wanted.filter(|&i| i < screens.len()) {
        return i;
    }
    let (cx, cy) = main_center;
    if let Some(i) = screens.iter().position(|r| contains(r, cx, cy)) {
        return i;
    }
    screens
        .iter()
        .enumerate()
        .min_by_key(|(_, r)| dist2(r, cx, cy))
        .map_or(0, |(i, _)| i)
}

/// C11b (P22, P23) : écran retenu, bande de la barre et zone d'annotation (px physiques), rectangle de l'écran.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct Placement {
    pub index: usize,
    pub bar: Rect,
    pub area: Rect,
    pub monitor: Rect,
}

/// C11b (P22) : géométrie de l'entrée C11a (`pick_screen`, `physical`, `split`) en une fonction, partagée par
/// `annotation_enter` et `annotation_capture`. `screens` : rectangle et facteur d'échelle de chaque écran. Liste vide :
/// tout à zéro (l'appelant refuse « aucun écran » avant).
pub fn placement(
    screens: &[(Rect, f64)],
    wanted: Option<usize>,
    main_center: (i32, i32),
    dock: &str,
    thickness_css: f64,
) -> Placement {
    let rects: Vec<Rect> = screens.iter().map(|(r, _)| *r).collect();
    let index = pick_screen(&rects, wanted, main_center);
    let Some(&(monitor, scale)) = screens.get(index) else {
        return Placement::default();
    };
    let (bar, area) = split(monitor, side_of(dock), physical(thickness_css, scale));
    Placement {
        index,
        bar,
        area,
        monitor,
    }
}

/// C11b (P18) : la transparence de `annotate` se peint-elle ? Session X11 (XWayland compris) : non seulement quand la
/// sonde dit qu'aucun compositeur ne tient `_NET_WM_CM_S<écran>` (`Some(false)`) ; sonde en échec (`None`) : oui.
/// Wayland natif (annotation refusée), Windows et macOS : oui.
pub fn transparency(session: Session, composited: Option<bool>) -> bool {
    match session {
        Session::X11 | Session::XWayland => composited != Some(false),
        Session::WaylandNative | Session::Other => true,
    }
}

/// Curseur du bureau (px physiques) en px CSS relatifs au coin de la fenêtre ; `None` hors de la fenêtre (P9).
pub fn cursor_in(cursor: (f64, f64), window: Rect, scale: f64) -> Option<(f64, f64)> {
    let dx = cursor.0 - f64::from(window.x);
    let dy = cursor.1 - f64::from(window.y);
    if scale <= 0.0
        || dx < 0.0
        || dy < 0.0
        || dx >= f64::from(window.w)
        || dy >= f64::from(window.h)
    {
        return None;
    }
    Some((dx / scale, dy / scale))
}

/// Environnement de la relance en mode compatibilité (XWayland, P16).
pub fn compat_env() -> [(&'static str, &'static str); 1] {
    [("GDK_BACKEND", "x11")]
}

/// Mêmes arguments que le lancement, sans le nom du programme (le fichier passé au lancement est repris, P16).
pub fn relaunch_args(args: impl Iterator<Item = OsString>) -> Vec<OsString> {
    args.skip(1).collect()
}

/// Lance `exe` avec `args` et l'environnement `env`, sans attendre sa fin (relance P16).
pub fn relaunch(
    exe: &std::path::Path,
    args: &[OsString],
    env: &[(&str, &str)],
) -> std::io::Result<()> {
    let mut cmd = std::process::Command::new(exe);
    cmd.args(args);
    for (k, v) in env {
        cmd.env(k, v);
    }
    cmd.spawn().map(|_| ())
}

/// Action de restauration de la fenêtre principale à la sortie de l'annotation.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RestoreStep {
    AlwaysOnTop(bool),
    Decorations(bool),
    Position,
    Size,
    Maximize,
}

/// Actions de restauration selon l'état mémorisé à l'entrée : position avant taille (même ordre qu'à l'entrée, la
/// taille serait recalculée sous Windows entre écrans d'échelles différentes), puis maximisation si elle l'était.
pub fn restore_steps(was_maximized: bool) -> Vec<RestoreStep> {
    let mut steps = vec![
        RestoreStep::AlwaysOnTop(false),
        RestoreStep::Decorations(true),
        RestoreStep::Position,
        RestoreStep::Size,
    ];
    if was_maximized {
        steps.push(RestoreStep::Maximize);
    }
    steps
}
