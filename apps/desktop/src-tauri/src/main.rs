#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use roomboard_shell::office::{self, Converter, Search, CONVERT_TIMEOUT};
use roomboard_shell::originals::{self, Originals};
use roomboard_shell::{
    check_linked_media, launch_paths, read_granted, sha256_granted, size_granted, GrantedPaths,
    ReadError, ASSOCIATED_EXTENSIONS,
};
use serde::Serialize;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, RunEvent, Runtime, State, WindowEvent};
use roomboard_shell::annotation::{self as ann, Rect as AnnRect, RestoreStep};
use tauri::{PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_fs::FsExt;

const DROPPED_EVENT: &str = "roomboard://dropped";
/// C11a (P13) : fenêtre d'annotation, créée à la première entrée.
const ANNOTATE: &str = "annotate";
/// Étiquette de la fenêtre principale.
const MAIN: &str = "main";
/// C11a (P13) : `CloseRequested` de `annotate` (Alt+F4, Cmd+W) traité comme Échap.
const EXIT_REQUEST_EVENT: &str = "roomboard://annotation-exit-request";
/// C16 (O21) : une copie d'original a été enregistrée dans l'application d'origine.
const ORIGINAL_CHANGED_EVENT: &str = "roomboard://original-changed";
/// C16 (O20) : nom de l'original, encodé en pourcentage par la page.
const NAME_HEADER: &str = "x-roomboard-name";
/// C16 (O23) : copies d'originaux gardées 7 jours.
const ORIGINALS_KEEP: Duration = Duration::from_secs(7 * 24 * 3600);
#[cfg(target_os = "macos")]
const QUIT_EVENT: &str = "roomboard://quit-requested";

#[derive(Clone, Copy, Serialize)]
struct Point {
    x: f64,
    y: f64,
}

#[derive(Clone, Serialize)]
struct DropPayload {
    paths: Vec<String>,
    position: Option<Point>,
}

/// Fichiers du lancement : rendus une fois à la page (`launch_files`) ; après, une ouverture passe par l'événement.
struct Launch(Mutex<(Vec<String>, bool)>);

fn strings(paths: &[PathBuf]) -> Vec<String> {
    paths
        .iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect()
}

/// `async` : la lecture d'un morceau (8 Mio au plus) ne bloque pas le fil principal de la fenêtre.
#[tauri::command]
async fn read_granted_file(
    granted: State<'_, GrantedPaths>,
    path: String,
    offset: u64,
    len: u64,
) -> Result<tauri::ipc::Response, String> {
    read_granted(&granted, &PathBuf::from(path), offset, len)
        .map(tauri::ipc::Response::new)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn granted_file_size(granted: State<'_, GrantedPaths>, path: String) -> Result<u64, String> {
    size_granted(&granted, &PathBuf::from(path)).map_err(|e| e.to_string())
}

/// Lie une vidéo : empreinte SHA-256 par morceaux (M27), puis accord du seul fichier au protocole d'assets (M28).
/// Un chemin choisi par le sélecteur de fichiers est dans la portée fs : il devient accordé ici.
#[tauri::command]
async fn link_media(
    app: AppHandle,
    granted: State<'_, GrantedPaths>,
    path: String,
) -> Result<String, String> {
    let p = PathBuf::from(path);
    if granted.granted_path(&p).is_none() && app.fs_scope().is_allowed(&p) {
        granted.grant([p.clone()]);
    }
    let hash = sha256_granted(&granted, &p).map_err(|e| e.to_string())?;
    let canonical = granted
        .granted_path(&p)
        .ok_or_else(|| ReadError::NotGranted.to_string())?;
    app.asset_protocol_scope()
        .allow_file(&canonical)
        .map_err(|e| e.to_string())?;
    Ok(hash)
}

/// Retrouve une vidéo liée à l'ouverture (M29) : même taille, extension de média ; introuvable : `false`.
#[tauri::command]
async fn relink_media(
    app: AppHandle,
    granted: State<'_, GrantedPaths>,
    path: String,
    size: u64,
) -> Result<bool, String> {
    let canonical = match check_linked_media(&PathBuf::from(path), size) {
        Ok(c) => c,
        Err(ReadError::Io(_)) => return Ok(false),
        Err(e) => return Err(e.to_string()),
    };
    granted.grant([canonical.clone()]);
    app.asset_protocol_scope()
        .allow_file(&canonical)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
fn launch_files(launch: State<'_, Launch>) -> Vec<String> {
    let mut l = launch.0.lock().unwrap_or_else(|e| e.into_inner());
    l.1 = true;
    std::mem::take(&mut l.0)
}

#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

/// État Office de la coque (C16) : racine de travail privée (cache de l'application, jamais `/tmp` partagé, O9),
/// convertisseur trouvé au lancement (O24), copies d'originaux surveillées (O21).
struct Office {
    root: PathBuf,
    converter: Option<Converter>,
    originals: Originals,
    watching: AtomicBool,
}

#[derive(Serialize)]
struct ConvertedPayload {
    id: String,
    pdf: String,
    size: u64,
}

#[derive(Clone, Serialize)]
struct OriginalChanged {
    id: String,
    path: String,
    name: String,
}

/// O24 : vrai si LibreOffice ou Microsoft Office a été trouvé au lancement.
#[tauri::command]
fn office_converter(office: State<'_, Office>) -> bool {
    office.converter.is_some()
}

/// O8 à O12, O35 : conversion hors du fil principal (jusqu'à 120 s, une à la fois) ; le PDF accordé est lu ensuite par
/// `read_granted_file`, puis libéré par `release_conversion`. Rejet : code stable (`no-program`, `timeout`, …).
#[tauri::command]
async fn convert_office(app: AppHandle, path: String) -> Result<ConvertedPayload, String> {
    let handle = app.clone();
    let done = tauri::async_runtime::spawn_blocking(move || {
        let office = handle.state::<Office>();
        let granted = handle.state::<GrantedPaths>();
        office::convert_granted(
            &granted,
            &PathBuf::from(path),
            office.converter.as_ref(),
            &office.root,
            CONVERT_TIMEOUT,
        )
    })
    .await
    .map_err(|e| e.to_string())?;
    if let Err(e) = &done {
        eprintln!("convert_office : {e}");
    }
    done.map(|c| ConvertedPayload {
        id: c.id,
        pdf: c.pdf.to_string_lossy().into_owned(),
        size: c.size,
    })
    .map_err(|e| e.code().to_string())
}

/// O35 : retire l'accord du PDF converti et supprime son dossier.
#[tauri::command]
fn release_conversion(office: State<'_, Office>, granted: State<'_, GrantedPaths>, id: String) {
    office::release_conversion(&granted, &office.root, &id);
}

/// O20 : octets de l'original en corps brut, nom dans l'en-tête `x-roomboard-name` ; copie contrôlée par
/// `roomboard_shell::originals`, ouverte depuis Rust (`open`, ShellExecuteW sous Windows) ; aucune permission pour la
/// page. Le fil de relevé part au premier appel. Rend l'id de la copie.
#[tauri::command]
async fn open_original(
    app: AppHandle,
    office: State<'_, Office>,
    request: tauri::ipc::Request<'_>,
) -> Result<String, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("corps brut attendu".into());
    };
    let name = request
        .headers()
        .get(NAME_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(originals::decode_name)
        .ok_or_else(|| "nom absent".to_string())?;
    let (id, path) = office
        .originals
        .write(&name, bytes)
        .map_err(|e| e.code().to_string())?;
    originals::open_detached(&path).map_err(|e| e.to_string())?;
    if !office.watching.swap(true, Ordering::SeqCst) {
        spawn_watch(app.clone());
    }
    Ok(id)
}

/// O21 : relevé chaque seconde des seules copies écrites par `open_original` ; un changement stable est émis.
fn spawn_watch(app: AppHandle) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_secs(1));
        let office = app.state::<Office>();
        for (id, path) in office.originals.changed() {
            let name = office.originals.name_of(&id).unwrap_or_default();
            let payload = OriginalChanged {
                id,
                path: path.to_string_lossy().into_owned(),
                name,
            };
            if let Err(e) = app.emit(ORIGINAL_CHANGED_EVENT, payload) {
                eprintln!("RoomBoard : modification de l'original non transmise ({e})");
            }
        }
    });
}

/// O22 : la coque accorde la copie et émet un dépôt (patron `grant_and_emit`) : nouvel onglet par `importFiles` ; la
/// page ne nomme jamais un chemin.
#[tauri::command]
fn reimport_original(app: AppHandle, office: State<'_, Office>, id: String) -> Result<(), String> {
    let path = office
        .originals
        .path_of(&id)
        .ok_or_else(|| "original inconnu".to_string())?;
    grant_and_emit(&app, &[path], None);
    Ok(())
}

/// Accorde d'abord, émet ensuite (CL5b-13) : la page ne lit jamais un chemin pas encore accordé.
fn grant_and_emit<R: Runtime>(app: &AppHandle<R>, paths: &[PathBuf], position: Option<Point>) {
    let kept = app.state::<GrantedPaths>().grant(paths.iter().cloned());
    if kept.is_empty() {
        return;
    }
    let payload = DropPayload {
        paths: strings(&kept),
        position,
    };
    if let Err(e) = app.emit(DROPPED_EVENT, payload) {
        eprintln!("RoomBoard : dépôt non transmis ({e})");
    }
}

/// macOS : fichiers ouverts par le Finder (association), et Cmd+Q gardé (CL5b-15) : la page demande si un onglet
/// est modifié, puis appelle `quit_app`. Sans fenêtre `main` (dernière fenêtre fermée), personne ne répondrait :
/// la sortie n'est pas empêchée.
#[cfg(target_os = "macos")]
fn on_run_event<R: Runtime>(app: &AppHandle<R>, event: RunEvent) {
    match event {
        RunEvent::Opened { urls } => {
            let paths: Vec<PathBuf> = urls.iter().filter_map(|u| u.to_file_path().ok()).collect();
            let launch = app.state::<Launch>();
            let mut l = launch.0.lock().unwrap_or_else(|e| e.into_inner());
            if l.1 {
                drop(l);
                grant_and_emit(app, &paths, None);
            } else {
                let kept = app.state::<GrantedPaths>().grant(paths);
                l.0.extend(strings(&kept));
            }
        }
        RunEvent::ExitRequested {
            code: None, api, ..
        } if app.get_webview_window(MAIN).is_some() => {
            api.prevent_exit();
            if let Err(e) = app.emit(QUIT_EVENT, ()) {
                eprintln!("RoomBoard : demande de sortie non transmise ({e})");
            }
        }
        _ => {}
    }
}

/// Linux et Windows : rien ne change (empêcher la sortie laisserait l'application sans fenêtre, CL5b-15).
#[cfg(not(target_os = "macos"))]
fn on_run_event<R: Runtime>(_app: &AppHandle<R>, _event: RunEvent) {}

/// C11a (P1) : position et taille de `main` avant l'annotation, rendues à la sortie.
#[derive(Default)]
struct SavedGeometry(Mutex<Option<Saved>>);

struct Saved {
    pos: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    maximized: bool,
}

#[derive(Serialize)]
struct AnnotationSupport {
    supported: bool,
    reason: Option<&'static str>,
    screens: usize,
}

fn err(e: impl std::fmt::Display) -> String {
    e.to_string()
}

fn main_window(app: &AppHandle) -> Result<tauri::WebviewWindow, String> {
    app.get_webview_window(MAIN).ok_or_else(|| "fenêtre principale absente".to_string())
}

fn rect_of(m: &tauri::Monitor) -> AnnRect {
    let (p, s) = (m.position(), m.size());
    AnnRect { x: p.x, y: p.y, w: s.width, h: s.height }
}

/// C11a (P16) : session détectée par l'environnement ; nombre d'écrans pour « Écran suivant » (P15).
#[tauri::command]
fn annotation_support(app: AppHandle) -> AnnotationSupport {
    let session = ann::detect_session(std::env::consts::OS, |k| std::env::var(k).ok());
    let screens = app.available_monitors().map(|m| m.len()).unwrap_or(1).max(1);
    match ann::supported(session) {
        Ok(()) => AnnotationSupport { supported: true, reason: None, screens },
        Err(ann::Unsupported::Wayland) => AnnotationSupport { supported: false, reason: Some("wayland"), screens },
    }
}

/// C11a (P1, P10, P11, P13, P15) : crée ou montre `annotate`, réduit `main` à la bande de la barre ; rend l'écran retenu.
/// `async` : un `WebviewWindowBuilder` dans une commande synchrone interbloque sous Windows (`webview_window.rs:58, 115`).
#[tauri::command]
async fn annotation_enter(
    app: AppHandle,
    saved: State<'_, SavedGeometry>,
    screen: Option<usize>,
    dock: String,
    thickness: f64,
) -> Result<usize, String> {
    let main = main_window(&app)?;
    let monitors = main.available_monitors().map_err(err)?;
    if monitors.is_empty() {
        return Err("aucun écran".into());
    }
    let rects: Vec<AnnRect> = monitors.iter().map(rect_of).collect();
    // Déjà réduite à la barre (réentrée) : la géométrie mémorisée reste celle d'avant la première entrée.
    let already = saved.0.lock().unwrap_or_else(|e| e.into_inner()).is_some();
    let maximized = main.is_maximized().map_err(err)?;
    if maximized && !already {
        main.unmaximize().map_err(err)?;
    }
    let pos = main.outer_position().map_err(err)?;
    let size = main.inner_size().map_err(err)?;
    {
        let mut s = saved.0.lock().unwrap_or_else(|e| e.into_inner());
        if s.is_none() {
            *s = Some(Saved { pos, size, maximized });
        }
    }
    let center = (pos.x + (size.width / 2) as i32, pos.y + (size.height / 2) as i32);
    let i = ann::pick_screen(&rects, screen, center);
    let px = ann::physical(thickness, monitors[i].scale_factor());
    let (bar, area) = ann::split(rects[i], ann::side_of(&dock), px);
    let annotate = match app.get_webview_window(ANNOTATE) {
        Some(w) => w,
        None => {
            let builder = WebviewWindowBuilder::new(&app, ANNOTATE, WebviewUrl::App("index.html?fenetre=annotation".into()))
                .title("RoomBoard — annotation")
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false);
            #[cfg(windows)]
            let builder = builder.drag_and_drop(false);
            builder.build().map_err(err)?
        }
    };
    main.set_decorations(false).map_err(err)?;
    main.set_always_on_top(true).map_err(err)?;
    main.set_position(PhysicalPosition::new(bar.x, bar.y)).map_err(err)?;
    main.set_size(PhysicalSize::new(bar.w, bar.h)).map_err(err)?;
    annotate.set_position(PhysicalPosition::new(area.x, area.y)).map_err(err)?;
    annotate.set_size(PhysicalSize::new(area.w, area.h)).map_err(err)?;
    annotate.show().map_err(err)?;
    Ok(i)
}

fn restore_main(app: &AppHandle, saved: &SavedGeometry) -> Result<(), String> {
    let Some(Saved { pos, size, maximized }) = saved.0.lock().unwrap_or_else(|e| e.into_inner()).take() else {
        return Ok(());
    };
    let main = main_window(app)?;
    for step in ann::restore_steps(maximized) {
        match step {
            RestoreStep::AlwaysOnTop(on) => main.set_always_on_top(on),
            RestoreStep::Decorations(on) => main.set_decorations(on),
            RestoreStep::Position => main.set_position(pos),
            RestoreStep::Size => main.set_size(size),
            RestoreStep::Maximize => main.maximize(),
        }
        .map_err(err)?;
    }
    Ok(())
}

/// C11a (P5) : `annotate` cachée (gardée pour la réentrée), `main` rendue à sa géométrie d'avant.
#[tauri::command]
fn annotation_exit(app: AppHandle, saved: State<'_, SavedGeometry>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(ANNOTATE) {
        w.set_ignore_cursor_events(false).map_err(err)?;
        w.hide().map_err(err)?;
    }
    restore_main(&app, &saved)
}

/// C11a (P13) : onglet d'annotation fermé : `annotate` détruite (sans `CloseRequested`).
#[tauri::command]
fn annotation_close(app: AppHandle, saved: State<'_, SavedGeometry>) -> Result<(), String> {
    if let Some(w) = app.get_webview_window(ANNOTATE) {
        w.destroy().map_err(err)?;
    }
    restore_main(&app, &saved)
}

/// C11a (P8, P9) : clic à travers `annotate` (tout ou rien par fenêtre).
#[tauri::command]
fn annotation_ignore(app: AppHandle, ignore: bool) -> Result<(), String> {
    match app.get_webview_window(ANNOTATE) {
        Some(w) => w.set_ignore_cursor_events(ignore).map_err(err),
        None => Ok(()),
    }
}

/// C11a (P9, DA5) : curseur en px CSS relatifs à la fenêtre appelante (`annotate`), ou `null` hors d'elle.
#[tauri::command]
fn annotation_cursor(window: tauri::WebviewWindow) -> Option<(f64, f64)> {
    let c = window.cursor_position().ok()?;
    let p = window.inner_position().ok()?;
    let s = window.inner_size().ok()?;
    let scale = window.scale_factor().ok()?;
    ann::cursor_in((c.x, c.y), AnnRect { x: p.x, y: p.y, w: s.width, h: s.height }, scale)
}

/// C11a (P16) : même exécutable, mêmes arguments, `GDK_BACKEND=x11` ; puis sortie (rien n'est modifié au démarrage).
#[tauri::command]
fn relaunch_compat(app: AppHandle) -> Result<(), String> {
    // `$APPIMAGE` sous AppImage : `current_exe()` pointerait dans un montage temporaire qui disparaît à la sortie.
    let exe = tauri::process::current_binary(&app.env()).map_err(err)?;
    let args = ann::relaunch_args(std::env::args_os());
    ann::relaunch(&exe, &args, &ann::compat_env())
        .map_err(|e| format!("relance impossible : {e}"))?;
    app.exit(0);
    Ok(())
}

fn main() {
    let granted = GrantedPaths::default();
    // Arguments non UTF-8 ignorés (`args()` paniquerait) : ils ne pourraient pas être relus par la page.
    let args = std::env::args_os()
        .skip(1)
        .filter_map(|a| a.into_string().ok());
    let at_launch = granted.grant(launch_paths(args, ASSOCIATED_EXTENSIONS));
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(granted)
        .manage(Launch(Mutex::new((strings(&at_launch), false))))
        .manage(SavedGeometry::default())
        // C16 (O9, O23, O24) : racine privée dans le cache de l'application ; restes purgés ; convertisseur cherché une fois.
        .setup(|app| {
            let root = app.path().app_cache_dir()?;
            std::fs::create_dir_all(&root)?;
            office::purge_conversions(&root);
            originals::purge(&root.join("originaux"), ORIGINALS_KEEP);
            app.manage(Office {
                converter: office::find_converter(&Search::from_env()),
                originals: Originals::new(root.join("originaux")),
                root,
                watching: AtomicBool::new(false),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_granted_file,
            granted_file_size,
            link_media,
            relink_media,
            launch_files,
            quit_app,
            office_converter,
            convert_office,
            release_conversion,
            open_original,
            reimport_original,
            annotation_support,
            annotation_enter,
            annotation_exit,
            annotation_close,
            annotation_ignore,
            annotation_cursor,
            relaunch_compat
        ])
        .on_window_event(|window, event| match event {
            // C11a (P18) : seuls les dépôts de `main` (réduite à la barre en annotation) sont accordés et émis.
            WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) if window.label() == MAIN => {
                let at = Point {
                    x: position.x,
                    y: position.y,
                };
                grant_and_emit(window.app_handle(), paths, Some(at));
            }
            // C11a (P13) : Alt+F4 ou Cmd+W sur `annotate` : comme Échap, la page principale sort de l'annotation.
            WindowEvent::CloseRequested { api, .. } if window.label() == ANNOTATE => {
                api.prevent_close();
                if let Err(e) = window.app_handle().emit_to(MAIN, EXIT_REQUEST_EVENT, ()) {
                    eprintln!("RoomBoard : demande de sortie de l'annotation non transmise ({e})");
                }
            }
            // C11a (P13) : `main` détruite : `annotate` aussi, aucun processus caché ne reste.
            WindowEvent::Destroyed if window.label() == MAIN => {
                if let Some(w) = window.app_handle().get_webview_window(ANNOTATE) {
                    let _ = w.destroy();
                }
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while building RoomBoard");
    app.run(on_run_event);
}
