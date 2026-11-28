//! Tri des commandes par un seul code de tri (OG35, taille du module Wasm). Chaque `sort_by` d'un type ou d'une
//! fermeture neuve recopie tout l'algorithme de tri (2 à 8 Ko de Wasm) : les tris des commandes, sur quelques éléments,
//! passent ici par une permutation d'indices triée une seule fois. Les tris des chemins chauds (zone du pot) n'y
//! passent pas.
use std::cmp::Ordering;

/// Indices `0..n` dans l'ordre de `cmp`, stable comme `sort_by` : deux indices égaux gardent leur ordre.
#[inline(never)]
pub(crate) fn sorted_indices(n: usize, cmp: &dyn Fn(usize, usize) -> Ordering) -> Vec<usize> {
    let mut order: Vec<usize> = (0..n).collect();
    order.sort_by(|&a, &b| cmp(a, b));
    order
}

/// `v` trié par `cmp`, stable comme `v.sort_by(cmp)`.
pub(crate) fn sort_stable_by<T>(v: &mut Vec<T>, cmp: impl Fn(&T, &T) -> Ordering) {
    let order = sorted_indices(v.len(), &|a, b| cmp(&v[a], &v[b]));
    let mut slots: Vec<Option<T>> = v.drain(..).map(Some).collect();
    v.extend(order.into_iter().filter_map(|i| slots[i].take()));
}

/// Ensemble des chaînes données, rempli par `insert` : `collect()` trierait d'abord un `Vec<String>` par son propre
/// tri (environ 5 Ko de Wasm), alors que `insert` est déjà dans le module.
pub(crate) fn string_set(
    items: impl Iterator<Item = String>,
) -> std::collections::BTreeSet<String> {
    let mut set = std::collections::BTreeSet::new();
    for s in items {
        set.insert(s);
    }
    set
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sorted_indices_is_stable() {
        let keys = [3, 1, 3, 0, 1];
        assert_eq!(
            sorted_indices(5, &|a, b| keys[a].cmp(&keys[b])),
            vec![3, 1, 4, 0, 2]
        );
        assert_eq!(
            sorted_indices(0, &|_, _| Ordering::Equal),
            Vec::<usize>::new()
        );
    }

    #[test]
    fn sort_stable_by_matches_sort_by() {
        let base: Vec<(u32, &str)> =
            vec![(2, "a"), (1, "b"), (2, "c"), (0, "d"), (1, "e"), (2, "f")];
        let mut want = base.clone();
        want.sort_by_key(|p| p.0);
        let mut got = base.clone();
        sort_stable_by(&mut got, |a, b| a.0.cmp(&b.0));
        assert_eq!(got, want);
        let mut rev = base;
        sort_stable_by(&mut rev, |a, b| b.0.cmp(&a.0));
        assert_eq!(
            rev,
            vec![(2, "a"), (2, "c"), (2, "f"), (1, "b"), (1, "e"), (0, "d")]
        );
    }
}
