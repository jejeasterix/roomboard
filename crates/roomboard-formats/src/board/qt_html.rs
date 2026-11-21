//! Texte d'OpenBoard (C13, D11) : HTML de Qt réduit en segments ; corps écrit par la tâche T8 du plan.
use super::{Rgb, Span};

/// Texte lu : segments, taille et couleur du `body` (celles de l'élément), `reduced` si une mise en forme a été perdue.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct QtText {
    pub spans: Vec<Span>,
    pub size: Option<f32>,
    pub color: Option<Rgb>,
    pub reduced: bool,
}

pub fn read_qt_html(_html: &str) -> QtText {
    QtText::default()
}
