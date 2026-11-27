//! Liens d'éléments (T35, correctif de T18, H5) : schéma contrôlé, puis ouverture par l'application du système (crate
//! `open`, ShellExecuteW sous Windows, aucun shell ni plugin opener). Même règle que `valid_link` du cœur
//! (`crates/roomboard-core/src/element.rs`), prouvée par `tests/links.rs`.
use std::fmt;

/// Longueur maximale d'un lien, en caractères (`chars()`), comme le cœur.
pub const LINK_MAX_CHARS: usize = 2048;
const SCHEMES: [&str; 3] = ["http://", "https://", "mailto:"];

/// Lien admis : `http://`, `https://` ou `mailto:`, casse exacte, 2 048 caractères au plus, sans blanc, sans `"`, `<`,
/// `>`, `\` ni caractère de contrôle (même règle que le cœur).
pub fn valid_link(s: &str) -> bool {
    SCHEMES.iter().any(|p| s.starts_with(p))
        && s.chars().count() <= LINK_MAX_CHARS
        && !s
            .chars()
            .any(|c| c.is_whitespace() || c.is_control() || matches!(c, '"' | '<' | '>' | '\\'))
}

#[derive(Debug, PartialEq, Eq)]
pub enum LinkError {
    /// Schéma hors `http`, `https`, `mailto`, ou lien trop long : rien n'est ouvert.
    Refused,
    /// L'application du système n'a pas pu être lancée.
    Open(String),
}

impl fmt::Display for LinkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LinkError::Refused => write!(f, "lien refusé (http, https ou mailto seulement)"),
            LinkError::Open(m) => write!(f, "ouverture du lien impossible : {m}"),
        }
    }
}

impl std::error::Error for LinkError {}

/// Contrôle `url`, puis la passe telle quelle à `open` ; un lien refusé n'atteint jamais `open`.
pub fn open_link_with(
    url: &str,
    open: impl FnOnce(&str) -> std::io::Result<()>,
) -> Result<(), LinkError> {
    if !valid_link(url) {
        return Err(LinkError::Refused);
    }
    open(url).map_err(|e| LinkError::Open(e.to_string()))
}

/// Ouvre un lien admis dans le navigateur ou le client de messagerie du système, sans attendre.
pub fn open_link(url: &str) -> Result<(), LinkError> {
    open_link_with(url, |u| open::that_detached(u))
}
