//! Ordre des objets d'une page (OG11, DA-2) : `Restack` minimal, en attendant les commandes d'ordre d'OG4.
//!
//! Un bloc d'ids d'une même page est posé au rang `to` (rang du bas du bloc après déplacement : 0 = arrière-plan,
//! `n - k` = premier plan), dans son ordre relatif, ids et champs gardés. Une seule transaction (une étape
//! d'annulation, D11) : plan en lecture, puis recopie de chaque élément du bloc (`AsPrelim`, la recopie de `copy.rs`),
//! retraits en indices décroissants et insertions aux rangs visés, comme la gomme. Ordre inchangé : aucune transaction,
//! aucune étape (D38). Les rangs comptent les entrées brutes du tableau `elements` de la page.
use std::collections::BTreeSet;

use yrs::types::AsPrelim;
use yrs::{Array, ArrayRef, MapPrelim};

use crate::commands::{Change, CommandError};
use crate::document::Document;

/// Plan d'un `Restack` lu sous une transaction de lecture.
struct Plan {
    page: String,
    elements: ArrayRef,
    /// Bloc en indices bruts croissants : indice, id, recopie de l'élément.
    block: Vec<(u32, String, MapPrelim)>,
}

impl Document {
    /// Page commune, ids connus, `to + k ≤ n` ; sinon `BadOrder`.
    fn restack_plan(&self, ids: &[String], to: u32) -> Result<Plan, CommandError> {
        let unique: BTreeSet<&String> = ids.iter().collect();
        if unique.is_empty() {
            return Err(CommandError::BadOrder);
        }
        let txn = self.read();
        let mut page: Option<(String, ArrayRef)> = None;
        let mut block = Vec::with_capacity(unique.len());
        for id in unique {
            let found = self.find_element(&txn, id).ok_or(CommandError::BadOrder)?;
            match &page {
                None => page = Some((found.page_id.clone(), found.elements.clone())),
                Some((p, _)) if *p != found.page_id => return Err(CommandError::BadOrder),
                Some(_) => {}
            }
            block.push((found.index, id.clone(), found.element.as_prelim(&txn)));
        }
        let (page, elements) = page.ok_or(CommandError::BadOrder)?;
        let n = elements.len(&txn);
        let k = block.len() as u32;
        if to.checked_add(k).is_none_or(|end| end > n) {
            return Err(CommandError::BadOrder);
        }
        block.sort_by_key(|(index, _, _)| *index);
        Ok(Plan {
            page,
            elements,
            block,
        })
    }

    pub(crate) fn cmd_restack(&mut self, ids: &[String], to: u32) -> Result<Change, CommandError> {
        let plan = self.restack_plan(ids, to)?;
        // Bloc déjà aux rangs `to..to + k` : même ordre, aucune étape.
        if plan
            .block
            .iter()
            .zip(to..)
            .all(|((index, _, _), rank)| *index == rank)
        {
            return Ok(self.unchanged());
        }
        let mut ids = Vec::with_capacity(plan.block.len());
        {
            let mut txn = self.transact_local();
            for (index, _, _) in plan.block.iter().rev() {
                plan.elements.remove(&mut txn, *index);
            }
            for ((_, id, prelim), rank) in plan.block.into_iter().zip(to..) {
                plan.elements.insert(&mut txn, rank, prelim);
                ids.push(id);
            }
        }
        Ok(self.done(Change {
            pages: vec![plan.page],
            ids,
            ..Default::default()
        }))
    }
}
