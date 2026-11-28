//! OG33 (lot 2b, morceau 3, choix 8) : texte d'un rectangle, d'un losange ou d'une ellipse, clé `label` de la forme. Le
//! texte lié d'Excalidraw (`containerId`, MIT) ramené à un seul élément : il suit déplacer, tourner, copier et supprimer
//! sans liaison à tenir. Lecture tolérante (U3) : une valeur qui n'est pas une chaîne non vide se lit absente.
use yrs::{Any, In, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, Change, CommandError};
use crate::document::Document;
use crate::shape::ShapeKind;

/// Plafond du texte d'une forme, en caractères.
pub const MAX_LABEL_CHARS: usize = 10_000;

const fn boxed(kind: ShapeKind) -> bool {
    matches!(
        kind,
        ShapeKind::Rect | ShapeKind::Diamond | ShapeKind::Ellipse
    )
}

/// Clé `label` d'une forme à boîte ; absente, vide, d'un autre type ou d'un autre genre : `None`.
pub(crate) fn read_label<T: ReadTxn>(txn: &T, e: &MapRef, kind: ShapeKind) -> Option<String> {
    if !boxed(kind) {
        return None;
    }
    match e.get(txn, "label") {
        Some(Out::Any(Any::String(s))) if !s.is_empty() => Some(s.to_string()),
        _ => None,
    }
}

impl Document {
    /// Refus, dans l'ordre : `BadText` (plus de 10 000 caractères), `UnknownElement`, `BadShape` (ni rectangle, ni
    /// losange, ni ellipse) ; même texte : aucune étape (D38) ; vide : clé retirée ; une transaction sinon.
    pub(crate) fn cmd_set_shape_label(
        &mut self,
        id: &str,
        label: &str,
    ) -> Result<Change, CommandError> {
        if label.chars().count() > MAX_LABEL_CHARS {
            return Err(CommandError::BadText);
        }
        let (e, page, same) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let s = read_shape(&txn, &found.element).ok_or(CommandError::BadShape)?;
            if !boxed(s.kind) {
                return Err(CommandError::BadShape);
            }
            let current = read_label(&txn, &found.element, s.kind).unwrap_or_default();
            (found.element, found.page_id, current == label)
        };
        if same {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            crate::fill::set_or_remove(
                &e,
                &mut txn,
                "label",
                (!label.is_empty()).then(|| In::Any(Any::from(label))),
            );
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
}
