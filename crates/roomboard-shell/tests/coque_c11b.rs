//! Coque C11b (P22, P26, P27) : src-tauri est hors du workspace ; sa configuration est prouvée par lecture : commandes
//! de capture enregistrées et minces, géométrie partagée avec `annotation_enter`, fenêtres remontrées après la capture,
//! aucune bibliothèque de capture appelée depuis `main.rs`.
const MAIN_RS: &str = include_str!("../../../apps/desktop/src-tauri/src/main.rs");
const COMMANDS: [&str; 2] = ["annotation_capture", "release_capture"];

/// Corps de `fn name(` jusqu'à la première accolade fermante en colonne 0.
fn body_of(name: &str) -> &'static str {
    MAIN_RS
        .split(format!("fn {name}(").as_str())
        .nth(1)
        .and_then(|s| s.split("\n}\n").next())
        .unwrap_or_else(|| panic!("fonction {name} absente de main.rs"))
}

#[test]
fn capture_commands_are_registered_and_thin() {
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
        assert!(MAIN_RS.contains(&format!("fn {c}(")), "fonction {c} absente");
    }
    for needle in [
        "capture::allowed(",
        "capture::capture_area(",
        "capture::release(",
        "capture::purge(",
        "capture::composited()",
        "capture::HIDDEN_SETTLE_MS",
        "ann::transparency(",
    ] {
        assert!(MAIN_RS.contains(needle), "{needle} absent de main.rs");
    }
    for forbidden in ["xcap::", "x11_dl::", "XGetImage", "png::", "objc2", "Command::new"] {
        assert!(
            !MAIN_RS.contains(forbidden),
            "{forbidden} dans main.rs (la capture vit dans roomboard_shell::capture)"
        );
    }
}

#[test]
fn enter_and_capture_share_placement() {
    for f in ["annotation_enter", "annotation_capture"] {
        let body = body_of(f);
        assert!(body.contains("ann::placement("), "{f} doit passer par ann::placement");
        assert!(
            !body.contains("ann::split(") && !body.contains("ann::pick_screen("),
            "{f} recalcule la géométrie"
        );
    }
}

#[test]
fn capture_hides_then_shows_windows_after_the_blocking_capture() {
    let body = body_of("annotation_capture");
    let allowed = body.find("capture::allowed(").expect("capture::allowed(");
    let hide = body.find("main.hide()").expect("main.hide()");
    let blocking = body.find("spawn_blocking").expect("spawn_blocking");
    let show = body.find("main.show()").expect("main.show()");
    assert!(allowed < hide, "Wayland refusé avant de cacher les fenêtres");
    assert!(
        hide < blocking && blocking < show,
        "ordre attendu : cacher, capturer hors du fil principal, remontrer"
    );
}

#[test]
fn support_reports_transparency() {
    let s = MAIN_RS
        .split("struct AnnotationSupport")
        .nth(1)
        .and_then(|s| s.split('}').next())
        .expect("struct AnnotationSupport");
    assert!(s.contains("transparent: bool"), "annotation_support doit rendre transparent (P18)");
}

#[test]
fn capture_shows_windows_again_even_if_hiding_fails() {
    let body = body_of("annotation_capture");
    let hide_line = body
        .lines()
        .find(|l| l.contains("main.hide()"))
        .expect("main.hide()");
    assert!(
        !hide_line.contains(".map_err(") && !hide_line.trim_end().ends_with('?'),
        "un échec de hide() ne doit pas sortir avant le show() des fenêtres"
    );
    assert!(
        !body.contains("w.hide().map_err(capture_failed)?"),
        "annotate.hide() ne doit pas sortir avant le show()"
    );
}
