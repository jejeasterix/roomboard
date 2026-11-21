//! Lecteur SVG commun (C13, D1, D8 à D16) : corps écrit par la tâche T7 du plan. Ce fichier ne porte que la signature,
//! pour que la liaison (T6) et l'écrivain (T9) compilent pendant que T7 travaille.
use super::{BoardError, BoardList, Dialect};

/// Lit un `content.xml` IWB, un `.iwb` en SVG brut ou une page `.ubz` ; `first_page` numérote les avertissements.
pub fn read_svg(_xml: &[u8], _dialect: Dialect, _first_page: u32) -> Result<BoardList, BoardError> {
    Err(BoardError::Broken("lecteur non branché".to_string()))
}
