//! Binaire `roomboard-office` (cadrage cli-lot4, D50, D51, DA16) : conversion Office → PDF en ligne de commande, par le
//! même code que la coque (`find_converter`, `convert_granted`, `release_conversion`, `purge_conversions`). Lancé par la
//! CLI (`apps/cli/src/office-node.ts`) et par `scripts/essais/c16-office-navigateur.mjs`.
//! `roomboard-office --check` : 0 « convertisseur : <chemin> » puis « racine : <racine> » ; 3 sans convertisseur.
//! `roomboard-office <entrée> <sortie.pdf>` : 0 succès, 1 échec (code de `ConvertError` en premier mot de stderr),
//! 2 usage, 3 aucun convertisseur.
//! Racine de travail : `$XDG_CACHE_HOME/roomboard-office` (absolu), sinon `$HOME/.cache/roomboard-office`, jamais
//! `temp_dir()` (partagé). Au démarrage, les conversions des processus morts sont purgées ; à la fin, seule la conversion
//! de ce lancement est libérée (une autre peut être en cours). Aucun gestionnaire de signal : LibreOffice vit dans son
//! propre groupe ; la CLI tue les restes après un Ctrl-C (D79).
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use roomboard_shell::office::{
    convert_granted, find_converter, purge_conversions, release_conversion, ConvertError,
    Converter, Search, CONVERT_TIMEOUT,
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

fn main() -> ExitCode {
    let args: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    let Some(root) = work_root() else {
        eprintln!("io : ni XDG_CACHE_HOME ni HOME");
        return ExitCode::from(1);
    };
    purge_conversions(&root);
    match args.as_slice() {
        [flag] if flag.as_os_str() == "--check" => {
            check(find_converter(&Search::from_env()).as_ref(), &root)
        }
        [input, output] => convert(
            find_converter(&Search::from_env()).as_ref(),
            input,
            output,
            &root,
        ),
        _ => {
            eprintln!("{USAGE}");
            ExitCode::from(2)
        }
    }
}
