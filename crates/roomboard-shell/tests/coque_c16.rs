//! Coque C16 (O29) : src-tauri est hors du workspace et n'est pas construit sur la VM ; sa configuration est prouvée
//! par lecture : commandes Office enregistrées et minces, aucun plugin opener, aucune permission opener ni fs:*watch,
//! corps brut pour l'original, `open` en Rust avec ShellExecuteW sous Windows.
const MAIN_RS: &str = include_str!("../../../apps/desktop/src-tauri/src/main.rs");
const DESKTOP_TOML: &str = include_str!("../../../apps/desktop/src-tauri/Cargo.toml");
const CAPABILITIES: &str =
    include_str!("../../../apps/desktop/src-tauri/capabilities/default.json");
const SHELL_TOML: &str = include_str!("../Cargo.toml");
const COMMANDS: [&str; 5] = [
    "office_converter",
    "convert_office",
    "release_conversion",
    "open_original",
    "reimport_original",
];

#[test]
fn office_commands_are_registered_and_thin() {
    let handler = MAIN_RS
        .split("generate_handler![")
        .nth(1)
        .and_then(|s| s.split(']').next())
        .expect("generate_handler!");
    for c in COMMANDS {
        assert!(
            handler.split(',').any(|x| x.trim() == c),
            "{c} absente de generate_handler!"
        );
        assert!(
            MAIN_RS.contains(&format!("fn {c}(")),
            "fonction {c} absente"
        );
    }
    for needle in [
        "office::convert_granted(",
        "office::release_conversion(",
        "office::purge_conversions(",
        "originals::purge(",
        "spawn_blocking",
        "app_cache_dir",
    ] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
    for forbidden in ["Command::new", "safe_name", "\"sh\"", "powershell"] {
        assert!(
            !MAIN_RS.contains(forbidden),
            "{forbidden} dans main.rs (la logique vit dans roomboard-shell)"
        );
    }
}

#[test]
fn no_opener_plugin_nor_watch_permission() {
    assert!(!DESKTOP_TOML.contains("tauri-plugin-opener"));
    assert!(!DESKTOP_TOML.contains("\"watch\""));
    let caps: serde_json::Value = serde_json::from_str(CAPABILITIES).expect("default.json lisible");
    for p in caps["permissions"].as_array().expect("permissions") {
        let id = p
            .as_str()
            .or_else(|| p["identifier"].as_str())
            .unwrap_or("");
        assert!(!id.starts_with("opener:"), "{id}");
        assert!(!id.ends_with("watch"), "{id}");
    }
}

#[test]
fn open_original_takes_a_raw_body_and_opens_from_rust() {
    for needle in [
        "InvokeBody::Raw",
        "x-roomboard-name",
        "originals::decode_name",
        "originals::open_detached",
        "grant_and_emit(&app, &[path], None)",
        "roomboard://original-changed",
    ] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
}

#[test]
fn open_crate_uses_shellexecute_on_windows() {
    let line = SHELL_TOML
        .lines()
        .find(|l| l.trim_start().starts_with("open "))
        .expect("dépendance open");
    assert!(line.contains("default-features = false"), "{line}");
    assert!(line.contains("shellexecute-on-windows"), "{line}");
}

/// Source sans commentaires ni littéraux (chaînes, caractères) : reste le code.
fn code_only(src: &str) -> String {
    let b: Vec<char> = src.chars().collect();
    let mut out = String::new();
    let mut i = 0;
    while i < b.len() {
        if b[i] == '/' && b.get(i + 1) == Some(&'/') {
            while i < b.len() && b[i] != '\n' {
                i += 1;
            }
        } else if b[i] == '"' {
            i += 1;
            while i < b.len() && b[i] != '"' {
                i += if b[i] == '\\' { 2 } else { 1 };
            }
            i += 1;
            out.push(' ');
        } else {
            out.push(b[i]);
            i += 1;
        }
    }
    out
}

fn is_ident(c: char) -> bool {
    c.is_alphanumeric() || c == '_'
}

/// `src-tauri` est hors du workspace : un chemin `xxx::` de premier niveau dans `main.rs` doit être une dépendance
/// de son manifeste, `std`/`core`/`crate`/`super`/`self`, ou un nom importé ou déclaré dans le fichier.
#[test]
fn main_rs_paths_use_only_declared_crates() {
    let mut allowed: Vec<String> = ["std", "core", "alloc", "crate", "super", "self"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    let mut in_deps = false;
    for line in DESKTOP_TOML.lines() {
        let t = line.trim();
        if t.starts_with('[') {
            in_deps = t == "[dependencies]";
        } else if in_deps {
            if let Some((name, _)) = t.split_once('=') {
                allowed.push(name.trim().replace('-', "_"));
            }
        }
    }
    let code = code_only(MAIN_RS);
    let words = |text: &str| -> Vec<String> {
        text.split(|c: char| !is_ident(c))
            .filter(|w| !w.is_empty())
            .map(String::from)
            .collect()
    };
    for stmt in code.split(';') {
        let t = stmt.trim_start();
        let t = t.strip_prefix("pub ").unwrap_or(t);
        if t.starts_with("use ") {
            allowed.extend(words(t));
        }
    }
    let toks = words(&code.replace("::", " :: "));
    for (i, w) in toks.iter().enumerate() {
        if matches!(
            w.as_str(),
            "fn" | "mod" | "struct" | "enum" | "const" | "static" | "type" | "trait"
        ) {
            if let Some(n) = toks.get(i + 1) {
                allowed.push(n.clone());
            }
        }
    }
    let chars: Vec<char> = code.chars().collect();
    let mut bad = Vec::new();
    let mut i = 0;
    while i < chars.len() {
        if is_ident(chars[i]) && (i == 0 || (!is_ident(chars[i - 1]) && chars[i - 1] != ':')) {
            let start = i;
            while i < chars.len() && is_ident(chars[i]) {
                i += 1;
            }
            let word: String = chars[start..i].iter().collect();
            let first_lower = word.chars().next().is_some_and(|c| c.is_lowercase());
            if first_lower
                && chars.get(i) == Some(&':')
                && chars.get(i + 1) == Some(&':')
                && chars.get(i + 2) != Some(&'<')
                && !allowed.contains(&word)
            {
                bad.push(word);
            }
        } else {
            i += 1;
        }
    }
    assert!(
        bad.is_empty(),
        "chemins de main.rs hors des dépendances de src-tauri/Cargo.toml : {bad:?}"
    );
}
