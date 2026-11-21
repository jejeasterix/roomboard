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
        "open::that_detached",
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
