#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::PathBuf;
use std::sync::Mutex;

use roomboard_shell::{
    check_linked_media, launch_paths, read_granted, sha256_granted, size_granted, GrantedPaths,
    ReadError, ASSOCIATED_EXTENSIONS,
};
use serde::Serialize;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, RunEvent, Runtime, State, WindowEvent};
use tauri_plugin_fs::FsExt;

const DROPPED_EVENT: &str = "roomboard://dropped";
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
        } if app.get_webview_window("main").is_some() => {
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
        .invoke_handler(tauri::generate_handler![
            read_granted_file,
            granted_file_size,
            link_media,
            relink_media,
            launch_files,
            quit_app
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::DragDrop(DragDropEvent::Drop { paths, position }) = event {
                let at = Point {
                    x: position.x,
                    y: position.y,
                };
                grant_and_emit(window.app_handle(), paths, Some(at));
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building RoomBoard");
    app.run(on_run_event);
}
