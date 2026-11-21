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
use tauri_plugin_fs::FsExt;

const DROPPED_EVENT: &str = "roomboard://dropped";
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
    open::that_detached(&path).map_err(|e| e.to_string())?;
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
            reimport_original
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
