//! Binaire `roomboard-office` (cadrage cli-lot4, D50, D51, DA16) : conversion Office → PDF en ligne de commande, par le
//! même code que la coque (`find_converter`, `convert_granted`, `release_conversion`, `purge_conversions`). Lancé par la
//! CLI (`apps/cli/src/office-node.ts`) et par `scripts/essais/c16-office-navigateur.mjs`.
//! `roomboard-office --check` : 0 « convertisseur : <chemin> » puis « racine : <racine> » ; 3 sans convertisseur.
//! `roomboard-office <entrée> <sortie.pdf>` : 0 succès, 1 échec (code de `ConvertError` en premier mot de stderr),
//! 2 usage, 3 aucun convertisseur.
//! `ROOMBOARD_OFFICE_PATH_ONLY=1` : seul `PATH` cherche le convertisseur (essais ; builds de debug seulement).
//! Racine de travail : `$XDG_CACHE_HOME/roomboard-office` (absolu), sinon `$HOME/.cache/roomboard-office`, jamais
//! `temp_dir()` (partagé). Au démarrage, les conversions des processus morts sont purgées ; à la fin, seule la conversion
//! de ce lancement est libérée (une autre peut être en cours). Aucun gestionnaire de signal : LibreOffice vit dans son
//! propre groupe ; la CLI tue les restes après un Ctrl-C (D79).
use std::path::{Path, PathBuf};
use std::process::ExitCode;

#[cfg(not(windows))]
use roomboard_shell::office::purge_conversions;
use roomboard_shell::office::{
    convert_granted, find_converter, release_conversion, ConvertError, Converter, Search,
    CONVERT_TIMEOUT,
};
use roomboard_shell::GrantedPaths;

const USAGE: &str =
    "usage : roomboard-office --check | roomboard-office <entrée Office> <sortie.pdf>";
const NO_PROGRAM: &str = "no-program : installez LibreOffice ou Microsoft Office";

fn work_root() -> Option<PathBuf> {
    std::env::var_os("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".cache")))
        .map(|c| c.join("roomboard-office"))
}

fn describe(c: &Converter) -> String {
    match c {
        Converter::LibreOffice(p) => p.display().to_string(),
        #[cfg(windows)]
        Converter::MsOffice => "Microsoft Office (COM)".to_string(),
    }
}

fn check(c: Option<&Converter>, root: &Path) -> ExitCode {
    let Some(c) = c else {
        eprintln!("{NO_PROGRAM}");
        return ExitCode::from(3);
    };
    println!("convertisseur : {}", describe(c));
    println!("racine : {}", root.display());
    ExitCode::SUCCESS
}

fn convert(c: Option<&Converter>, input: &Path, output: &Path, root: &Path) -> ExitCode {
    let granted = GrantedPaths::default();
    granted.grant([input.to_path_buf()]);
    match convert_granted(&granted, input, c, root, CONVERT_TIMEOUT) {
        Ok(done) => {
            let copied = std::fs::copy(&done.pdf, output);
            release_conversion(&granted, root, &done.id);
            match copied {
                Ok(n) => {
                    println!("PDF : {} ({n} octets)", output.display());
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("{}", ConvertError::Io(e.to_string()));
                    ExitCode::from(1)
                }
            }
        }
        Err(ConvertError::NoProgram) => {
            eprintln!("{NO_PROGRAM}");
            ExitCode::from(3)
        }
        Err(e) => {
            eprintln!("{e}");
            ExitCode::from(1)
        }
    }
}

/// Recherche du convertisseur : `PATH`, puis les emplacements connus de la coque ; `ROOMBOARD_OFFICE_PATH_ONLY=1` ignore
/// ces derniers (essais du code 3 sur une machine où LibreOffice est installé).
fn search() -> Search {
    let mut s = Search::from_env();
    // Levier d'essai : absent des builds de release.
    #[cfg(debug_assertions)]
    if std::env::var_os("ROOMBOARD_OFFICE_PATH_ONLY").is_some_and(|v| v == "1") {
        s.known.clear();
    }
    s
}

fn main() -> ExitCode {
    let args: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    let Some(root) = work_root() else {
        eprintln!("io : ni XDG_CACHE_HOME ni HOME");
        return ExitCode::from(1);
    };
    // Windows : `process_alive` y rend toujours false (office.rs), la purge effacerait la conversion en cours d'un autre
    // processus ; elle n'y est donc pas faite (limite : sous Windows rien ne purge cette racine, les restes d'un plantage y demeurent jusqu'à un nettoyage manuel).
    #[cfg(not(windows))]
    purge_conversions(&root);
    match args.as_slice() {
        [flag] if flag.as_os_str() == "--check" => check(find_converter(&search()).as_ref(), &root),
        [input, output] => convert(find_converter(&search()).as_ref(), input, output, &root),
        _ => {
            eprintln!("{USAGE}");
            ExitCode::from(2)
        }
    }
}
