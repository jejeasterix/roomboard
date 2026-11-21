//! Conversion par Microsoft Office (C16, O13) : Word, Excel ou PowerPoint par COM, liaison tardive (`IDispatch`), sur
//! un fil STA dédié. Sous `cfg(windows)` seulement : prouvé par lecture sur la VM (aucune cible Windows installée),
//! essai réel sur le PC (R2). Avant toute ouverture : `AutomationSecurity = 3` (`msoAutomationSecurityForceDisable`),
//! alertes coupées ; ouverture en lecture seule, sans fenêtre, hors fichiers récents, liens non mis à jour. On ne ferme
//! que ce qu'on a ouvert ; on ne quitte l'application que si on l'a lancée ; au délai, seuls les processus Office
//! apparus pendant la conversion sont tués (une instance ouverte avant par l'utilisateur ne l'est jamais, HO2-5).
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;

use windows::core::{IUnknown, BSTR, GUID, HSTRING, PCWSTR};
use windows::Win32::Foundation::CloseHandle;
use windows::Win32::System::Com::{
    CLSIDFromProgID, CoCreateInstance, CoInitializeEx, CoUninitialize, IDispatch,
    CLSCTX_LOCAL_SERVER, COINIT_APARTMENTTHREADED, DISPATCH_FLAGS, DISPATCH_METHOD,
    DISPATCH_PROPERTYGET, DISPATCH_PROPERTYPUT, DISPPARAMS,
};
use windows::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W, TH32CS_SNAPPROCESS,
};
use windows::Win32::System::Ole::{GetActiveObject, DISPID_PROPERTYPUT};
use windows::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};
use windows::Win32::System::Variant::VARIANT;

use super::{office_extension, ConvertError};

/// `LOCALE_USER_DEFAULT`.
const LCID: u32 = 0x0400;
/// `msoAutomationSecurityForceDisable` : macros coupées pour les fichiers ouverts par programme.
const FORCE_DISABLE: i32 = 3;
const WD_FORMAT_PDF: i32 = 17;
const WD_DO_NOT_SAVE: i32 = 0;
const WD_ALERTS_NONE: i32 = 0;
const XL_TYPE_PDF: i32 = 0;
const XL_UPDATE_LINKS_NEVER: i32 = 0;
const PP_SAVE_AS_PDF: i32 = 32;
const PP_ALERTS_NONE: i32 = 1;
const MSO_TRUE: i32 = -1;
const MSO_FALSE: i32 = 0;

#[derive(Clone, Copy)]
enum App {
    Word,
    Excel,
    PowerPoint,
}

impl App {
    const ALL: [App; 3] = [App::Word, App::Excel, App::PowerPoint];

    fn of(input: &Path) -> Option<App> {
        match office_extension(input)?.as_str() {
            "docx" | "doc" | "odt" => Some(App::Word),
            "xlsx" | "xlsm" | "xls" | "ods" => Some(App::Excel),
            "pptx" | "ppt" | "odp" => Some(App::PowerPoint),
            _ => None,
        }
    }

    fn prog_id(self) -> &'static str {
        match self {
            App::Word => "Word.Application",
            App::Excel => "Excel.Application",
            App::PowerPoint => "PowerPoint.Application",
        }
    }

    fn image(self) -> &'static str {
        match self {
            App::Word => "WINWORD.EXE",
            App::Excel => "EXCEL.EXE",
            App::PowerPoint => "POWERPNT.EXE",
        }
    }
}

fn com_err(e: windows::core::Error) -> ConvertError {
    ConvertError::Failed(format!("COM : {e}"))
}

fn text(s: &str) -> VARIANT {
    VARIANT::from(BSTR::from(s))
}

fn path_text(p: &Path) -> VARIANT {
    text(&p.to_string_lossy())
}

/// Objet COM en liaison tardive.
struct Disp(IDispatch);

impl Disp {
    /// `IDispatch::Invoke` par noms : méthode (ou propriété) puis arguments nommés ; pour `PROPERTYPUT`, la valeur seule
    /// avec `DISPID_PROPERTYPUT`. Arguments rangés à l'envers, comme l'exige `Invoke`.
    fn invoke(
        &self,
        name: &str,
        flags: DISPATCH_FLAGS,
        args: Vec<(&str, VARIANT)>,
    ) -> Result<VARIANT, ConvertError> {
        let put = flags == DISPATCH_PROPERTYPUT;
        let mut wanted = vec![name];
        if !put {
            wanted.extend(args.iter().map(|(n, _)| *n));
        }
        let wide: Vec<HSTRING> = wanted.iter().map(|n| HSTRING::from(*n)).collect();
        let names: Vec<PCWSTR> = wide.iter().map(|w| PCWSTR(w.as_ptr())).collect();
        let mut ids = vec![0i32; names.len()];
        // SAFETY : `names` et `ids` ont la même longueur et vivent pendant l'appel.
        unsafe {
            self.0.GetIDsOfNames(
                &GUID::zeroed(),
                names.as_ptr(),
                names.len() as u32,
                LCID,
                ids.as_mut_ptr(),
            )
        }
        .map_err(com_err)?;
        let mut named: Vec<i32> = if put {
            vec![DISPID_PROPERTYPUT]
        } else {
            ids[1..].iter().rev().copied().collect()
        };
        let mut values: Vec<VARIANT> = args.into_iter().map(|(_, v)| v).rev().collect();
        let params = DISPPARAMS {
            rgvarg: values.as_mut_ptr(),
            rgdispidNamedArgs: named.as_mut_ptr(),
            cArgs: values.len() as u32,
            cNamedArgs: if values.is_empty() {
                0
            } else {
                named.len() as u32
            },
        };
        let mut out = VARIANT::default();
        // SAFETY : `values` et `named` vivent jusqu'au retour d'`Invoke` ; `out` est possédé ici.
        unsafe {
            self.0.Invoke(
                ids[0],
                &GUID::zeroed(),
                LCID,
                flags,
                &params,
                Some(&mut out),
                None,
                None,
            )
        }
        .map_err(com_err)?;
        Ok(out)
    }

    fn value(&self, name: &str) -> Result<VARIANT, ConvertError> {
        self.invoke(name, DISPATCH_PROPERTYGET, vec![])
    }

    fn get(&self, name: &str) -> Result<Disp, ConvertError> {
        let v = self.value(name)?;
        IDispatch::try_from(&v).map(Disp).map_err(com_err)
    }

    fn put(&self, name: &str, v: VARIANT) -> Result<(), ConvertError> {
        self.invoke(name, DISPATCH_PROPERTYPUT, vec![("", v)])
            .map(|_| ())
    }

    fn call(&self, name: &str, args: Vec<(&str, VARIANT)>) -> Result<VARIANT, ConvertError> {
        self.invoke(
            name,
            DISPATCH_FLAGS(DISPATCH_METHOD.0 | DISPATCH_PROPERTYGET.0),
            args,
        )
    }

    fn object(&self, name: &str, args: Vec<(&str, VARIANT)>) -> Result<Disp, ConvertError> {
        let v = self.call(name, args)?;
        IDispatch::try_from(&v).map(Disp).map_err(com_err)
    }
}

/// Pose `AutomationSecurity` et les alertes avant toute ouverture, lance `work`, puis remet les valeurs d'origine
/// (instance déjà ouverte par l'utilisateur).
fn guarded(
    app: &Disp,
    alerts: VARIANT,
    work: impl FnOnce() -> Result<(), ConvertError>,
) -> Result<(), ConvertError> {
    let old_security = app.value("AutomationSecurity")?;
    let old_alerts = app.value("DisplayAlerts")?;
    app.put("AutomationSecurity", VARIANT::from(FORCE_DISABLE))?;
    app.put("DisplayAlerts", alerts)?;
    let r = work();
    let _ = app.put("DisplayAlerts", old_alerts);
    let _ = app.put("AutomationSecurity", old_security);
    r
}

fn export_word(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(WD_ALERTS_NONE), || {
        let doc = app.get("Documents")?.object(
            "Open",
            vec![
                ("FileName", path_text(input)),
                ("ConfirmConversions", VARIANT::from(false)),
                ("ReadOnly", VARIANT::from(true)),
                ("AddToRecentFiles", VARIANT::from(false)),
                ("PasswordDocument", text("")),
                ("Visible", VARIANT::from(false)),
            ],
        )?;
        let r = doc
            .call(
                "ExportAsFixedFormat",
                vec![
                    ("OutputFileName", path_text(out)),
                    ("ExportFormat", VARIANT::from(WD_FORMAT_PDF)),
                ],
            )
            .map(|_| ());
        let _ = doc.call(
            "Close",
            vec![("SaveChanges", VARIANT::from(WD_DO_NOT_SAVE))],
        );
        r
    })
}

fn export_excel(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(false), || {
        let book = app.get("Workbooks")?.object(
            "Open",
            vec![
                ("Filename", path_text(input)),
                ("UpdateLinks", VARIANT::from(XL_UPDATE_LINKS_NEVER)),
                ("ReadOnly", VARIANT::from(true)),
                ("Password", text("")),
                ("IgnoreReadOnlyRecommended", VARIANT::from(true)),
                ("Notify", VARIANT::from(false)),
                ("AddToMru", VARIANT::from(false)),
            ],
        )?;
        let r = book
            .call(
                "ExportAsFixedFormat",
                vec![
                    ("Type", VARIANT::from(XL_TYPE_PDF)),
                    ("Filename", path_text(out)),
                ],
            )
            .map(|_| ());
        let _ = book.call("Close", vec![("SaveChanges", VARIANT::from(false))]);
        r
    })
}

fn export_powerpoint(app: &Disp, input: &Path, out: &Path) -> Result<(), ConvertError> {
    guarded(app, VARIANT::from(PP_ALERTS_NONE), || {
        let pres = app.get("Presentations")?.object(
            "Open",
            vec![
                ("FileName", path_text(input)),
                ("ReadOnly", VARIANT::from(MSO_TRUE)),
                ("Untitled", VARIANT::from(MSO_TRUE)),
                ("WithWindow", VARIANT::from(MSO_FALSE)),
            ],
        )?;
        let r = pres
            .call(
                "SaveAs",
                vec![
                    ("FileName", path_text(out)),
                    ("FileFormat", VARIANT::from(PP_SAVE_AS_PDF)),
                ],
            )
            .map(|_| ());
        let _ = pres.call("Close", vec![]);
        r
    })
}

/// Corps du fil STA : application obtenue par `CoCreateInstance` ; `Quit` seulement si elle ne tournait pas avant.
fn run_app(app: App, input: &Path, out: &Path) -> Result<(), ConvertError> {
    // SAFETY : appels COM sur ce fil, initialisé STA par `sta`.
    let clsid = unsafe { CLSIDFromProgID(&HSTRING::from(app.prog_id())) }.map_err(com_err)?;
    let mut active: Option<IUnknown> = None;
    // SAFETY : `active` reçoit une référence comptée, libérée à la sortie de portée.
    let running = unsafe { GetActiveObject(&clsid, None, &mut active) }.is_ok();
    drop(active);
    // SAFETY : création hors processus (serveur local) ; l'interface est libérée avec `d`.
    let disp: IDispatch =
        unsafe { CoCreateInstance(&clsid, None, CLSCTX_LOCAL_SERVER) }.map_err(com_err)?;
    let d = Disp(disp);
    let r = match app {
        App::Word => export_word(&d, input, out),
        App::Excel => export_excel(&d, input, out),
        App::PowerPoint => export_powerpoint(&d, input, out),
    };
    if !running {
        let _ = d.call("Quit", vec![]);
    }
    r
}

fn sta(app: App, input: &Path, out: &Path) -> Result<(), ConvertError> {
    // SAFETY : fil dédié, initialisé STA ici et désinitialisé avant de rendre ; tout objet COM est libéré avant.
    unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) }
        .ok()
        .map_err(com_err)?;
    let r = run_app(app, input, out);
    // SAFETY : pendant de `CoInitializeEx` ci-dessus.
    unsafe { CoUninitialize() };
    r
}

/// PID des processus `image` (sans tenir compte de la casse).
fn pids_of(image: &str) -> HashSet<u32> {
    let mut out = HashSet::new();
    // SAFETY : instantané possédé, fermé avant de rendre ; `dwSize` posé avant le premier appel.
    unsafe {
        let Ok(snap) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return out;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut ok = Process32FirstW(snap, &mut entry).is_ok();
        while ok {
            let len = entry
                .szExeFile
                .iter()
                .position(|&c| c == 0)
                .unwrap_or(entry.szExeFile.len());
            if String::from_utf16_lossy(&entry.szExeFile[..len]).eq_ignore_ascii_case(image) {
                out.insert(entry.th32ProcessID);
            }
            ok = Process32NextW(snap, &mut entry).is_ok();
        }
        let _ = CloseHandle(snap);
    }
    out
}

fn kill(pid: u32) {
    // SAFETY : poignée ouverte puis fermée ici ; seul un processus Office apparu pendant la conversion est visé.
    unsafe {
        if let Ok(h) = OpenProcess(PROCESS_TERMINATE, false, pid) {
            let _ = TerminateProcess(h, 1);
            let _ = CloseHandle(h);
        }
    }
}

/// Vrai si Word, Excel ou PowerPoint est enregistré pour COM (O7).
pub fn available() -> bool {
    App::ALL
        .iter()
        // SAFETY : lecture du registre COM, sans effet.
        .any(|a| unsafe { CLSIDFromProgID(&HSTRING::from(a.prog_id())) }.is_ok())
}

/// Convertit `input` en `out` (même dossier de conversion, O9) par l'application de son extension ; au délai, rend
/// `Timeout` après avoir tué les seuls processus de cette application apparus pendant la conversion.
pub fn convert(input: &Path, out: &Path, timeout: Duration) -> Result<(), ConvertError> {
    let app = App::of(input).ok_or(ConvertError::NotOffice)?;
    let before = pids_of(app.image());
    let (tx, rx) = mpsc::channel();
    let (i, o): (PathBuf, PathBuf) = (input.to_path_buf(), out.to_path_buf());
    std::thread::spawn(move || {
        let _ = tx.send(sta(app, &i, &o));
    });
    match rx.recv_timeout(timeout) {
        Ok(r) => r,
        Err(_) => {
            for pid in pids_of(app.image()).difference(&before) {
                kill(*pid);
            }
            Err(ConvertError::Timeout)
        }
    }
}
