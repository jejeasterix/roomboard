//! Numéros des sortes d'objets du `.flipchart` : u16 après la balise `O` d'un flux et dans chaque nœud de l'index.
//! Recopiés à la main de `flipchartids.h:14-41` d'ActCraft, sous des noms à nous (aucun nom de classe d'origine).
//! Porté d'ActCraft (même auteur, U39, 0246).

/// Le paperboard lui-même.
pub(crate) const DOCUMENT: u16 = 1;
/// Une page.
pub(crate) const PAGE: u16 = 2;
/// Trait d'encre.
pub(crate) const STROKE: u16 = 3;
/// Ligne brisée.
pub(crate) const LINE: u16 = 5;
/// Forme à polygones.
pub(crate) const SHAPE: u16 = 7;
/// Image.
pub(crate) const IMAGE: u16 = 9;
/// Texte riche.
pub(crate) const TEXT: u16 = 11;
/// Grille de la page.
pub(crate) const GRID: u16 = 13;
/// Un niveau de la grille.
pub(crate) const GRID_LEVEL: u16 = 14;
/// Groupe par références.
pub(crate) const GROUP: u16 = 18;
/// Fond de la page.
pub(crate) const BACKGROUND: u16 = 29;
/// Action sur un texte.
pub(crate) const TEXT_ACTION: u16 = 50;
/// Connecteur entre deux objets.
pub(crate) const CONNECTOR: u16 = 52;
/// Étiquette (légende) d'un objet.
pub(crate) const TAG: u16 = 53;
/// Son ou vidéo.
pub(crate) const MEDIA: u16 = 253;
/// Équation (MathML brut).
pub(crate) const MATHML: u16 = 460;
/// Action : lancer une mini-application.
pub(crate) const LAUNCH_ACTION: u16 = 463;
/// Texte de haut en bas.
pub(crate) const VERTICAL_TEXT: u16 = 469;

/// Les actions (N12 : 22 à 28, 50, 463), non lues, averties par sorte.
pub(crate) fn is_action(kind: u16) -> bool {
    matches!(kind, 22..=28 | TEXT_ACTION | LAUNCH_ACTION)
}

/// La grille et ses niveaux (13, 14).
pub(crate) fn is_grid(kind: u16) -> bool {
    matches!(kind, GRID | GRID_LEVEL)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_have_the_kinds_of_n12() {
        let read = [(STROKE, 3), (LINE, 5), (SHAPE, 7), (IMAGE, 9), (TEXT, 11), (GROUP, 18)];
        for (id, n) in read {
            assert_eq!(id, n);
        }
        assert_eq!((DOCUMENT, PAGE, BACKGROUND), (1, 2, 29));
        let unread = [(CONNECTOR, 52), (TAG, 53), (MEDIA, 253), (MATHML, 460), (VERTICAL_TEXT, 469)];
        for (id, n) in unread {
            assert_eq!(id, n);
        }
        for k in [22, 23, 24, 25, 26, 27, 28, 50, 463] {
            assert!(is_action(k), "{k} est une action");
        }
        for k in [1, 2, 3, 5, 7, 9, 11, 13, 14, 18, 21, 29, 49, 51, 52, 53, 253, 460, 462, 464, 469] {
            assert!(!is_action(k), "{k} n'est pas une action");
        }
        assert!(is_grid(13) && is_grid(14) && !is_grid(12) && !is_grid(15));
    }
}
