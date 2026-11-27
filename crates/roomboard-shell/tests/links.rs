//! T35 (correctif de T18, H5) : lien d'élément ouvert depuis Rust par la crate `open` (ShellExecuteW sous Windows),
//! après contrôle du schéma ; même règle que `valid_link` du cœur (http://, https://, mailto:, casse exacte, sans
//! espace devant, 2 048 caractères au plus, comptés en `chars()`).
use roomboard_shell::links::{open_link_with, valid_link, LinkError, LINK_MAX_CHARS};
use std::cell::RefCell;

/// Ouverture simulée : rend le résultat et les URL passées à l'ouvreur (jamais un vrai navigateur dans les tests).
fn try_open(url: &str) -> (Result<(), LinkError>, Vec<String>) {
    let seen = RefCell::new(Vec::new());
    let r = open_link_with(url, |u| {
        seen.borrow_mut().push(u.to_string());
        Ok(())
    });
    (r, seen.into_inner())
}

#[test]
fn javascript_refused_nothing_opened() {
    for bad in [
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        " javascript:alert(1)",
        "vbscript:x",
    ] {
        let (r, seen) = try_open(bad);
        assert_eq!(r, Err(LinkError::Refused), "{bad:?}");
        assert!(seen.is_empty(), "{bad:?}");
    }
}

#[test]
fn file_paths_and_other_schemes_refused() {
    for bad in [
        "file:///etc/passwd",
        "file://C:/Windows/System32/calc.exe",
        "C:\\Windows\\System32\\calc.exe",
        "/usr/bin/xterm",
        "data:text/html,x",
        "ftp://x",
        "smb://host/share",
        "HTTPS://x",
        " https://example.org",
        "https:x",
        "",
    ] {
        let (r, seen) = try_open(bad);
        assert_eq!(r, Err(LinkError::Refused), "{bad:?}");
        assert!(seen.is_empty(), "{bad:?}");
    }
}

#[test]
fn https_http_mailto_accepted_and_opened_as_is() {
    for ok in [
        "https://example.org/a?b=1",
        "http://example.org",
        "mailto:contact@example.org",
    ] {
        let (r, seen) = try_open(ok);
        assert_eq!(r, Ok(()), "{ok:?}");
        assert_eq!(seen, vec![ok.to_string()]);
    }
}

#[test]
fn same_rule_as_core_valid_link() {
    assert_eq!(LINK_MAX_CHARS, roomboard_core::element::LINK_MAX_CHARS);
    let at_max = format!("https://{}", "é".repeat(LINK_MAX_CHARS - 8));
    let over = format!("https://{}", "h".repeat(LINK_MAX_CHARS - 7));
    for s in [
        "http://x",
        "https://example.org",
        "mailto:a@example.org",
        at_max.as_str(),
        over.as_str(),
        "javascript:alert(1)",
        "JavaScript:alert(1)",
        "HTTPS://x",
        " https://x",
        "ftp://x",
        "file:///etc/passwd",
        "data:text/html,x",
        "https:x",
        "",
        "mailto:a@b\" /a \"C:\\x\"",
        "https://example.org/a b",
        "https://example.org/a\tb",
        "https://example.org/a\nb",
        "https://example.org/a\"b",
        "https://example.org/<b>",
        "https://example.org/a\\b",
        "https://example.org/a\u{7f}b",
        "https://example.org/a\u{0}b",
        "https://example.org/a%20b",
    ] {
        assert_eq!(
            valid_link(s),
            roomboard_core::element::valid_link(s),
            "{s:?}"
        );
    }
    assert!(valid_link(&at_max));
    assert_eq!(try_open(&over).0, Err(LinkError::Refused));
}

#[test]
fn blanks_quotes_brackets_backslash_and_controls_refused() {
    for bad in [
        "mailto:a@b\" /a \"C:\\x\"",
        "https://example.org/a b",
        "https://example.org/a\tb",
        "https://example.org/a\r\nb",
        "https://example.org/a\"b",
        "https://example.org/<b>",
        "https://example.org/a\\b",
        "https://example.org/a\u{7f}b",
        "https://example.org/a\u{0}b",
    ] {
        let (r, seen) = try_open(bad);
        assert_eq!(r, Err(LinkError::Refused), "{bad:?}");
        assert!(seen.is_empty(), "{bad:?}");
        assert!(!roomboard_core::element::valid_link(bad), "{bad:?}");
    }
    let (r, seen) = try_open("https://example.org/a%20b");
    assert_eq!(r, Ok(()));
    assert_eq!(seen, vec!["https://example.org/a%20b".to_string()]);
}

#[test]
fn opener_failure_is_reported() {
    let r = open_link_with("https://example.org", |_| {
        Err(std::io::Error::other("aucun navigateur"))
    });
    assert!(
        matches!(r, Err(LinkError::Open(ref m)) if m.contains("aucun navigateur")),
        "{r:?}"
    );
}
