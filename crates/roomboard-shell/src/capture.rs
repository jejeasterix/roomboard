//! C11b (P19, P21 à P26, DA1, DA2) : capture d'un écran sans nos fenêtres, découpe de la zone d'annotation, PNG RGBA,
//! fichier temporaire écrit dans un dossier privé, accordé à la page, puis retiré. Logique pure testable sans Tauri ;
//! adaptateurs par plateforme sous `#[cfg]` : `xcap` sous Windows et macOS, Xlib (`x11-dl`, chargée à l'exécution) sous
//! Linux X11, Wayland refusé sans essai. Aucun point d'encre ne passe ici.
use std::fmt;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use crate::annotation::{Rect, Session};
use crate::office::ensure_private_dir;
use crate::GrantedPaths;

/// Sous-dossier des captures dans la racine privée de la coque (cache de l'application, P24).
pub const CAPTURES_DIR: &str = "captures";
/// P22 : délai entre le masquage de nos fenêtres et la capture (ActCraft, `kHiddenWindowsSettleMs`).
pub const HIDDEN_SETTLE_MS: u64 = 250;
/// P24 : au lancement, un reste d'une autre instance plus vieux que ce délai est supprimé (une capture vit quelques ms).
pub const PURGE_AGE: Duration = Duration::from_secs(60);

/// Numéros essayés au plus pour une capture avant d'abandonner.
const MAX_ID_ATTEMPTS: u32 = 100;
static NEXT_CAPTURE: AtomicU64 = AtomicU64::new(1);

/// Image RGBA 8 bits, lignes contiguës (`width * 4` octets par ligne).
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Frame {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

/// Échec d'une capture ; `code()` est le rejet rendu à la page (P27).
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CaptureError {
    Denied,
    Wayland,
    Failed(String),
}

impl CaptureError {
    pub fn code(&self) -> &'static str {
        match self {
            CaptureError::Denied => "denied",
            CaptureError::Wayland => "wayland",
            CaptureError::Failed(_) => "failed",
        }
    }
}

impl fmt::Display for CaptureError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CaptureError::Failed(d) => write!(f, "failed : {d}"),
            other => f.write_str(other.code()),
        }
    }
}

fn failed(e: impl fmt::Display) -> CaptureError {
    CaptureError::Failed(e.to_string())
}

/// PNG accordé : `id` pour `release`, chemin canonique accordé, taille en octets, dimensions de l'image.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Captured {
    pub id: String,
    pub path: PathBuf,
    pub size: u64,
    pub width: u32,
    pub height: u32,
}

/// P21 : XWayland et Wayland natif refusés sans essai (la racine X d'XWayland ne voit pas les fenêtres Wayland).
pub fn allowed(session: Session) -> Result<(), CaptureError> {
    match session {
        Session::XWayland | Session::WaylandNative => Err(CaptureError::Wayland),
        Session::X11 | Session::Other => Ok(()),
    }
}

/// P23 : rectangle de `area` (px physiques du bureau) dans l'image de l'écran `monitor`, à l'échelle
/// `largeur image / largeur écran` (points macOS ou pixels physiques) ; borné à l'image ; vide : `None`.
pub fn area_in_frame(frame_w: u32, frame_h: u32, monitor: Rect, area: Rect) -> Option<Rect> {
    if monitor.w == 0 || monitor.h == 0 || frame_w == 0 || frame_h == 0 {
        return None;
    }
    let sx = f64::from(frame_w) / f64::from(monitor.w);
    let sy = f64::from(frame_h) / f64::from(monitor.h);
    let dx = f64::from(area.x) - f64::from(monitor.x);
    let dy = f64::from(area.y) - f64::from(monitor.y);
    let (fw, fh) = (f64::from(frame_w), f64::from(frame_h));
    let x0 = (dx * sx).round().clamp(0.0, fw);
    let y0 = (dy * sy).round().clamp(0.0, fh);
    let x1 = ((dx + f64::from(area.w)) * sx).round().clamp(0.0, fw);
    let y1 = ((dy + f64::from(area.h)) * sy).round().clamp(0.0, fh);
    if x1 <= x0 || y1 <= y0 {
        return None;
    }
    Some(Rect {
        x: x0 as i32,
        y: y0 as i32,
        w: (x1 - x0) as u32,
        h: (y1 - y0) as u32,
    })
}

/// Découpe de `r` dans `frame`, bornée à l'image (une image tronquée rend les lignes présentes).
pub fn crop(frame: &Frame, r: Rect) -> Frame {
    let x0 = u32::try_from(r.x.max(0)).unwrap_or(0).min(frame.width);
    let y0 = u32::try_from(r.y.max(0)).unwrap_or(0).min(frame.height);
    let w = r.w.min(frame.width - x0);
    let h = r.h.min(frame.height - y0);
    let stride = frame.width as usize * 4;
    let line = w as usize * 4;
    let mut rgba = Vec::with_capacity(line * h as usize);
    let mut rows = 0;
    for row in y0..y0 + h {
        let start = row as usize * stride + x0 as usize * 4;
        match frame.rgba.get(start..start + line) {
            Some(px) => {
                rgba.extend_from_slice(px);
                rows += 1;
            }
            None => break,
        }
    }
    Frame {
        width: w,
        height: if w == 0 { 0 } else { rows },
        rgba,
    }
}

/// Xlib (ZPixmap 32 bits, octets B, G, R, X) → RGBA opaque ; `stride` : octets par ligne de la source.
pub fn bgrx_to_rgba(src: &[u8], width: u32, height: u32, stride: usize) -> Vec<u8> {
    let (w, h) = (width as usize, height as usize);
    let mut out = Vec::with_capacity(w * h * 4);
    for y in 0..h {
        let Some(row) = src.get(y * stride..y * stride + w * 4) else {
            break;
        };
        for px in row.as_chunks::<4>().0 {
            out.extend_from_slice(&[px[2], px[1], px[0], 255]);
        }
    }
    out
}

/// P25 : PNG RGBA 8 bits, compression rapide.
pub fn encode_png(frame: &Frame) -> Result<Vec<u8>, CaptureError> {
    let expected = frame.width as usize * frame.height as usize * 4;
    if frame.width == 0 || frame.height == 0 || frame.rgba.len() != expected {
        return Err(CaptureError::Failed("image vide ou tronquée".into()));
    }
    let mut out = Vec::new();
    {
        let mut enc = png::Encoder::new(&mut out, frame.width, frame.height);
        enc.set_color(png::ColorType::Rgba);
        enc.set_depth(png::BitDepth::Eight);
        enc.set_compression(png::Compression::Fast);
        let mut w = enc.write_header().map_err(failed)?;
        w.write_image_data(&frame.rgba).map_err(failed)?;
        w.finish().map_err(failed)?;
    }
    Ok(out)
}

fn is_capture_id(id: &str) -> bool {
    let digits = |s: &str| !s.is_empty() && s.bytes().all(|b| b.is_ascii_digit());
    let mut parts = id.split('-');
    matches!((parts.next(), parts.next(), parts.next()), (Some(a), Some(b), None) if digits(a) && digits(b))
}

fn capture_path(root: &Path, id: &str) -> PathBuf {
    root.join(CAPTURES_DIR).join(format!("{id}.png"))
}

fn write_new(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    let mut o = fs::OpenOptions::new();
    o.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        o.mode(0o600);
    }
    let mut f = o.open(path)?;
    f.write_all(bytes)
}

/// P24 : PNG écrit sous `<root>/captures/<pid>-<n>.png` (dossiers privés, fichier neuf en 0600), puis accordé à la page.
pub fn save_granted(
    g: &GrantedPaths,
    root: &Path,
    png: &[u8],
    width: u32,
    height: u32,
) -> Result<Captured, CaptureError> {
    if let Some(parent) = root.parent() {
        fs::create_dir_all(parent).map_err(failed)?;
    }
    ensure_private_dir(root).map_err(failed)?;
    ensure_private_dir(&root.join(CAPTURES_DIR)).map_err(failed)?;
    // `create_new` refuse un fichier existant (reste d'un plantage de même pid, jeune donc non purgé) : numéro
    // suivant essayé. Le fichier d'une autre instance n'est jamais écrasé ni supprimé.
    let mut attempt = 0;
    let (id, path) = loop {
        let id = format!(
            "{}-{}",
            std::process::id(),
            NEXT_CAPTURE.fetch_add(1, Ordering::Relaxed)
        );
        let path = capture_path(root, &id);
        match write_new(&path, png) {
            Ok(()) => break (id, path),
            Err(e)
                if e.kind() == std::io::ErrorKind::AlreadyExists && attempt < MAX_ID_ATTEMPTS =>
            {
                attempt += 1
            }
            Err(e) => return Err(failed(e)),
        }
    };
    let Some(granted) = g.grant([path.clone()]).into_iter().next() else {
        let _ = fs::remove_file(&path);
        return Err(CaptureError::Failed("capture non accordée".into()));
    };
    Ok(Captured {
        id,
        path: granted,
        size: png.len() as u64,
        width,
        height,
    })
}

/// P24 : accord retiré et fichier supprimé ; un identifiant qui n'est pas `<pid>-<n>` est ignoré (aucun chemin forgé).
pub fn release(g: &GrantedPaths, root: &Path, id: &str) {
    if !is_capture_id(id) {
        return;
    }
    let path = capture_path(root, id);
    g.revoke(&path);
    let _ = fs::remove_file(&path);
}

/// P24 : au lancement, restes d'un plantage supprimés (`PURGE_AGE`).
pub fn purge(root: &Path) {
    purge_older(root, PURGE_AGE);
}

/// Supprime de `<root>/captures/` les `<pid>-<n>.png` d'un autre processus plus vieux que `age` ; garde ceux de ce
/// processus, les fichiers récents d'une autre instance et tout fichier étranger.
pub fn purge_older(root: &Path, age: Duration) {
    let dir = root.join(CAPTURES_DIR);
    if !fs::symlink_metadata(&dir).is_ok_and(|m| m.is_dir()) {
        return;
    }
    let Ok(rd) = fs::read_dir(&dir) else {
        return;
    };
    let me = std::process::id().to_string();
    for e in rd.flatten() {
        let name = e.file_name();
        let Some(id) = name.to_str().and_then(|n| n.strip_suffix(".png")) else {
            continue;
        };
        if !is_capture_id(id) || id.split('-').next() == Some(me.as_str()) {
            continue;
        }
        let old = e
            .metadata()
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.elapsed().ok())
            .is_none_or(|a| a >= age);
        if old {
            let _ = fs::remove_file(e.path());
        }
    }
}

/// Rang du coin le plus proche de `at` (distance au carré) ; vide : `None`. Retrouve l'écran `xcap` (points sous macOS,
/// mis à l'échelle) qui correspond à l'écran de Tauri (pixels physiques), HC11b-16.
pub fn nearest(corners: &[(i64, i64)], at: (i32, i32)) -> Option<usize> {
    let (ax, ay) = (i64::from(at.0), i64::from(at.1));
    corners
        .iter()
        .enumerate()
        .min_by_key(|(_, c)| (c.0 - ax).pow(2) + (c.1 - ay).pow(2))
        .map(|(i, _)| i)
}

/// Linux X11 : rectangle non vide entièrement dans la racine (sinon `XGetImage` lèverait `BadMatch`, et le gestionnaire
/// d'erreurs Xlib par défaut terminerait le processus).
pub fn inside_root(root_w: u32, root_h: u32, r: Rect) -> bool {
    r.x >= 0
        && r.y >= 0
        && r.w > 0
        && r.h > 0
        && u64::from(r.x as u32) + u64::from(r.w) <= u64::from(root_w)
        && u64::from(r.y as u32) + u64::from(r.h) <= u64::from(root_h)
}

/// Capture de l'écran `monitor` (px physiques) ; Wayland refusé avant tout essai.
pub fn capture_monitor(session: Session, monitor: Rect) -> Result<Frame, CaptureError> {
    allowed(session)?;
    platform::capture(monitor)
}

/// P22, P23 : capture de l'écran `monitor`, découpe de `area`, PNG, fichier accordé.
pub fn capture_area(
    g: &GrantedPaths,
    root: &Path,
    session: Session,
    monitor: Rect,
    area: Rect,
) -> Result<Captured, CaptureError> {
    let frame = capture_monitor(session, monitor)?;
    let zone = area_in_frame(frame.width, frame.height, monitor, area)
        .ok_or_else(|| CaptureError::Failed("zone d'annotation hors de l'image".into()))?;
    let cut = crop(&frame, zone);
    let png = encode_png(&cut)?;
    save_granted(g, root, &png, cut.width, cut.height)
}

/// P18 : Linux, un compositeur tient-il `_NET_WM_CM_S<écran>` ? Sonde en échec ou autre plateforme : `None`.
pub fn composited() -> Option<bool> {
    platform::composited()
}

/// P10 : autorisation de capturer l'écran ; vraie hors macOS. Sous macOS : sans autorisation, l'invite du système est
/// demandée (l'octroi ne vaut qu'après une relance) et le résultat est faux. À sonder avant de cacher nos fenêtres.
pub fn authorized() -> bool {
    platform::authorized()
}

#[cfg(target_os = "linux")]
mod platform {
    use super::{bgrx_to_rgba, failed, inside_root, CaptureError, Frame};
    use crate::annotation::Rect;
    use std::ffi::CString;
    use x11_dl::xlib::{self, Xlib};

    /// Connexion X propre à la capture, fermée au `Drop`.
    struct Conn<'a> {
        x: &'a Xlib,
        d: *mut xlib::Display,
    }

    impl Drop for Conn<'_> {
        fn drop(&mut self) {
            // SAFETY : `d` vient de `XOpenDisplay`, non nul, fermé une seule fois.
            unsafe { (self.x.XCloseDisplay)(self.d) };
        }
    }

    fn open(x: &Xlib) -> Option<Conn<'_>> {
        // SAFETY : pointeur nul = `$DISPLAY` ; le résultat est vérifié.
        let d = unsafe { (x.XOpenDisplay)(std::ptr::null()) };
        (!d.is_null()).then_some(Conn { x, d })
    }

    pub fn capture(monitor: Rect) -> Result<Frame, CaptureError> {
        let x = Xlib::open().map_err(failed)?;
        let c = open(&x).ok_or_else(|| CaptureError::Failed("affichage X11 introuvable".into()))?;
        // SAFETY : connexion ouverte ; écran par défaut.
        let (root, rw, rh) = unsafe {
            let s = (x.XDefaultScreen)(c.d);
            (
                (x.XDefaultRootWindow)(c.d),
                (x.XDisplayWidth)(c.d, s),
                (x.XDisplayHeight)(c.d, s),
            )
        };
        let (rw, rh) = (
            u32::try_from(rw).unwrap_or(0),
            u32::try_from(rh).unwrap_or(0),
        );
        if !inside_root(rw, rh, monitor) {
            return Err(CaptureError::Failed(format!(
                "écran hors de la racine X11 ({rw} × {rh})"
            )));
        }
        // SAFETY : rectangle dans la racine (vérifié) ; l'image rendue est détruite ci-dessous.
        let img = unsafe {
            (x.XGetImage)(
                c.d,
                root,
                monitor.x,
                monitor.y,
                monitor.w,
                monitor.h,
                (x.XAllPlanes)(),
                xlib::ZPixmap,
            )
        };
        if img.is_null() {
            return Err(CaptureError::Failed("XGetImage a échoué".into()));
        }
        // SAFETY : `img` non nul, lu pendant sa vie, puis détruit une seule fois par `XDestroyImage`.
        unsafe {
            let i = &*img;
            let ok = i.bits_per_pixel == 32
                && i.byte_order == xlib::LSBFirst
                && i.red_mask == 0x00ff_0000
                && i.green_mask == 0x0000_ff00
                && i.blue_mask == 0x0000_00ff
                && i.width > 0
                && i.height > 0
                && i.bytes_per_line >= i.width * 4
                && !i.data.is_null();
            let out = if ok {
                let (w, h, stride) = (i.width as u32, i.height as u32, i.bytes_per_line as usize);
                let src = std::slice::from_raw_parts(i.data as *const u8, stride * h as usize);
                Ok(Frame {
                    width: w,
                    height: h,
                    rgba: bgrx_to_rgba(src, w, h, stride),
                })
            } else {
                Err(CaptureError::Failed(format!(
                    "format X11 non pris en charge ({} bits par pixel)",
                    i.bits_per_pixel
                )))
            };
            (x.XDestroyImage)(img);
            out
        }
    }

    pub fn authorized() -> bool {
        true
    }

    pub fn composited() -> Option<bool> {
        let x = Xlib::open().ok()?;
        let c = open(&x)?;
        // SAFETY : connexion ouverte ; nom d'atome terminé par NUL, gardé vivant pendant l'appel.
        unsafe {
            let s = (x.XDefaultScreen)(c.d);
            let name = CString::new(format!("_NET_WM_CM_S{s}")).ok()?;
            let atom = (x.XInternAtom)(c.d, name.as_ptr(), 0);
            if atom == 0 {
                return None;
            }
            Some((x.XGetSelectionOwner)(c.d, atom) != 0)
        }
    }
}

#[cfg(any(windows, target_os = "macos"))]
mod platform {
    use super::{failed, nearest, CaptureError, Frame};
    use crate::annotation::Rect;

    /// Coordonnées `xcap` → pixels physiques de Tauri : points sous macOS (× échelle), pixels sous Windows.
    fn corner(m: &xcap::Monitor) -> (i64, i64) {
        let s = if cfg!(target_os = "macos") {
            f64::from(m.scale_factor().unwrap_or(1.0))
        } else {
            1.0
        };
        let x = (f64::from(m.x().unwrap_or(0)) * s).round() as i64;
        let y = (f64::from(m.y().unwrap_or(0)) * s).round() as i64;
        (x, y)
    }

    pub fn capture(monitor: Rect) -> Result<Frame, CaptureError> {
        #[cfg(target_os = "macos")]
        authorize()?;
        let all = xcap::Monitor::all().map_err(failed)?;
        let corners: Vec<(i64, i64)> = all.iter().map(corner).collect();
        let m = nearest(&corners, (monitor.x, monitor.y))
            .and_then(|i| all.get(i))
            .ok_or_else(|| CaptureError::Failed("aucun écran".into()))?;
        let img = m.capture_image().map_err(failed)?;
        let (width, height) = (img.width(), img.height());
        Ok(Frame {
            width,
            height,
            rgba: img.into_raw(),
        })
    }

    /// P10, HC11b-7 : `xcap` ne vérifie pas l'autorisation (sans elle, l'image ne montre que le fond d'écran). Première
    /// demande : invite du système, refus rendu ; l'octroi ne vaut qu'après une relance.
    #[cfg(target_os = "macos")]
    fn authorize() -> Result<(), CaptureError> {
        if objc2_core_graphics::CGPreflightScreenCaptureAccess() {
            return Ok(());
        }
        let _ = objc2_core_graphics::CGRequestScreenCaptureAccess();
        Err(CaptureError::Denied)
    }

    pub fn composited() -> Option<bool> {
        None
    }

    #[cfg(target_os = "macos")]
    pub fn authorized() -> bool {
        authorize().is_ok()
    }

    #[cfg(not(target_os = "macos"))]
    pub fn authorized() -> bool {
        true
    }
}

#[cfg(not(any(windows, target_os = "macos", target_os = "linux")))]
mod platform {
    use super::{CaptureError, Frame};
    use crate::annotation::Rect;

    pub fn capture(_monitor: Rect) -> Result<Frame, CaptureError> {
        Err(CaptureError::Failed(
            "capture non prise en charge sur cette plateforme".into(),
        ))
    }

    pub fn authorized() -> bool {
        true
    }

    pub fn composited() -> Option<bool> {
        None
    }
}
