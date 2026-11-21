//! Conversion en ligne de commande (C16, O28, S4) : même code que la coque (`convert_granted`). Usage :
//! `cargo run -p roomboard-shell --example convertir_office -- <entrée Office> <sortie.pdf>`.
use std::path::PathBuf;
use std::process::ExitCode;

use roomboard_shell::office::{
    convert_granted, find_converter, release_conversion, Converter, Search, CONVERT_TIMEOUT,
};
use roomboard_shell::GrantedPaths;

fn main() -> ExitCode {
    let args: Vec<PathBuf> = std::env::args_os().skip(1).map(PathBuf::from).collect();
    let [input, output] = args.as_slice() else {
        eprintln!("usage : convertir_office <entrée Office> <sortie.pdf>");
        return ExitCode::from(2);
    };
    let Some(converter) = find_converter(&Search::from_env()) else {
        eprintln!("no-program : installez LibreOffice ou Microsoft Office");
        return ExitCode::from(1);
    };
    match &converter {
        Converter::LibreOffice(p) => println!("convertisseur : {}", p.display()),
        #[cfg(windows)]
        Converter::MsOffice => println!("convertisseur : Microsoft Office (COM)"),
    }
    let granted = GrantedPaths::default();
    granted.grant([input.clone()]);
    // Dossier privé sous le cache de l'utilisateur, jamais sous `temp_dir()` (partagé).
    let cache = std::env::var_os("XDG_CACHE_HOME")
        .map(PathBuf::from)
        .filter(|p| p.is_absolute())
        .or_else(|| std::env::var_os("HOME").map(|h| PathBuf::from(h).join(".cache")));
    let Some(cache) = cache else {
        eprintln!("io : ni XDG_CACHE_HOME ni HOME");
        return ExitCode::from(1);
    };
    let root = cache.join("roomboard-essai");
    let code = match convert_granted(&granted, input, Some(&converter), &root, CONVERT_TIMEOUT) {
        Ok(c) => {
            let copied = std::fs::copy(&c.pdf, output);
            release_conversion(&granted, &root, &c.id);
            match copied {
                Ok(n) => {
                    println!("PDF : {} ({n} octets)", output.display());
                    0
                }
                Err(e) => {
                    eprintln!("io : {e}");
                    1
                }
            }
        }
        Err(e) => {
            eprintln!("{e}");
            1
        }
    };
    let _ = std::fs::remove_dir_all(root.join("conversions"));
    ExitCode::from(code)
}
