//! Index « culm » d'un `.flipchart` (entrée `.in`) : arbre des nœuds (numéro, sorte, stockage `<n>.io`, références).
//! Porté d'ActCraft (même auteur, U39, 0246), `bamboo.cpp` `parseIndex` : lecture itérative, sans récursion,
//! profondeur 256.

use super::stream::Reader;

const SIGNATURE: &[u8] = b"# culm #";
/// Signature, puis u16 1 u16 7.
const HEADER: usize = 12;
/// Profondeur maximale de l'arbre (ActCraft).
pub(crate) const MAX_DEPTH: usize = 256;

/// Nœud de l'index : la sorte est celle de `flipchart::ids`, le stockage nomme l'entrée `<storage_id>.io`.
#[derive(Clone, Debug, PartialEq)]
pub(crate) struct IndexNode {
    pub node_id: u32,
    pub kind: u32,
    pub storage_id: u32,
    pub refs: Vec<u32>,
    pub children: Vec<IndexNode>,
}

impl IndexNode {
    /// Entrée du flux d'objets de ce nœud.
    pub(crate) fn storage_name(&self) -> String {
        format!("{}.io", self.storage_id)
    }
}

/// Lit l'index : une seule racine, chaque nœud fermé, au plus [`MAX_DEPTH`] nœuds ouverts.
pub(crate) fn parse_index(data: &[u8]) -> Result<IndexNode, String> {
    if data.len() < HEADER || !data.starts_with(SIGNATURE) {
        return Err(String::from("signature d'index absente"));
    }
    let mut r = Reader::new(data, HEADER, data.len());
    let mut root = None;
    // Chemin de la racine au nœud ouvert ; un nœud fermé rejoint son parent.
    let mut open: Vec<IndexNode> = Vec::new();
    while let Some(tag) = r.peek() {
        let at = r.pos();
        r.u8()?;
        match tag {
            b'N' => {
                let node = (|| Ok::<_, String>((r.u32()?, r.u16()?, r.u32()?)))();
                let (node_id, kind, storage_id) =
                    node.map_err(|_| format!("nœud tronqué à l'octet {at}"))?;
                if open.is_empty() && root.is_some() {
                    return Err(String::from("plusieurs racines dans l'index"));
                }
                if open.len() >= MAX_DEPTH {
                    return Err(String::from("arbre d'index trop profond"));
                }
                let kind = u32::from(kind);
                open.push(IndexNode {
                    node_id,
                    kind,
                    storage_id,
                    refs: Vec::new(),
                    children: Vec::new(),
                });
            }
            b'S' => {
                let reference = (|| Ok::<_, String>((r.u32()?, r.u8()?)))();
                let Ok((id, b's')) = reference else {
                    return Err(format!("référence mal fermée à l'octet {at}"));
                };
                let node = open
                    .last_mut()
                    .ok_or_else(|| format!("référence hors nœud à l'octet {at}"))?;
                node.refs.push(id);
            }
            b'n' => {
                let node = open
                    .pop()
                    .ok_or_else(|| format!("'n' sans nœud ouvert à l'octet {at}"))?;
                match open.last_mut() {
                    Some(parent) => parent.children.push(node),
                    None => root = Some(node),
                }
            }
            _ => return Err(format!("balise d'index inconnue à l'octet {at}")),
        }
    }
    if !open.is_empty() {
        return Err(String::from("nœud non fermé en fin d'index"));
    }
    root.ok_or_else(|| String::from("index vide"))
}

#[cfg(test)]
mod tests {
    use super::super::writer::{index, Node};
    use super::*;

    fn leaf(id: u32, kind: u16, storage: u32) -> Node {
        Node::new(id, kind, storage, Vec::new(), Vec::new())
    }

    #[test]
    fn index_reads_nested_nodes_and_refs() {
        let page = Node::new(
            1003,
            2,
            1002,
            vec![leaf(1010, 3, 1009), leaf(1011, 18, 1012)],
            vec![1010, 1011],
        );
        let root = Node::new(1000, 1, 100, vec![page, leaf(1004, 2, 1005)], vec![7]);
        let tree = parse_index(&index(&root)).expect("index valide");
        assert_eq!(
            (tree.node_id, tree.kind, tree.storage_id, tree.refs.clone()),
            (1000, 1, 100, vec![7])
        );
        assert_eq!(tree.storage_name(), "100.io");
        assert_eq!(tree.children.len(), 2);
        let page = &tree.children[0];
        assert_eq!((page.node_id, page.kind, page.storage_id), (1003, 2, 1002));
        assert_eq!(page.refs, vec![1010, 1011]);
        let kids: Vec<(u32, u32, String)> = page
            .children
            .iter()
            .map(|c| (c.node_id, c.kind, c.storage_name()))
            .collect();
        assert_eq!(
            kids,
            vec![
                (1010, 3, "1009.io".to_string()),
                (1011, 18, "1012.io".to_string())
            ]
        );
        assert!(page
            .children
            .iter()
            .all(|c| c.children.is_empty() && c.refs.is_empty()));
        assert_eq!(tree.children[1].storage_name(), "1005.io");
    }

    #[test]
    fn index_refuses_bad_magic_unclosed_and_two_roots() {
        let good = index(&Node::new(1, 1, 10, vec![leaf(2, 2, 20)], vec![2]));
        assert!(parse_index(&good).is_ok());

        let mut bad_magic = good.clone();
        bad_magic[2] = b'X';
        assert!(parse_index(&bad_magic).unwrap_err().contains("signature"));
        assert!(parse_index(b"# culm").is_err());

        let unclosed = &good[..good.len() - 1];
        assert!(parse_index(unclosed).unwrap_err().contains("non fermé"));

        let mut two_roots = good.clone();
        two_roots.extend_from_slice(&good[12..]);
        assert!(parse_index(&two_roots)
            .unwrap_err()
            .contains("plusieurs racines"));

        // Chaque coupure de l'index valide est une erreur, jamais une panique.
        for cut in 0..good.len() {
            assert!(parse_index(&good[..cut]).is_err(), "coupure à {cut}");
        }

        let header = good[..12].to_vec();
        let mut stray_close = header.clone();
        stray_close.push(b'n');
        assert!(parse_index(&stray_close).is_err());
        let mut stray_ref = header.clone();
        stray_ref.extend_from_slice(&[b'S', 1, 0, 0, 0, b's']);
        assert!(parse_index(&stray_ref).unwrap_err().contains("hors nœud"));
        let mut unknown = header.clone();
        unknown.push(b'Z');
        assert!(parse_index(&unknown).unwrap_err().contains("inconnue"));
        assert!(parse_index(&header).unwrap_err().contains("vide"));

        // 256 nœuds ouverts passent, 257 sont refusés (ActCraft).
        let deep = |levels: usize| {
            let mut b = header.clone();
            for i in 0..levels {
                b.push(b'N');
                b.extend_from_slice(&u32::try_from(i).unwrap_or(0).to_le_bytes());
                b.extend_from_slice(&2u16.to_le_bytes());
                b.extend_from_slice(&7u32.to_le_bytes());
            }
            b.resize(b.len() + levels, b'n');
            b
        };
        assert!(parse_index(&deep(MAX_DEPTH)).is_ok());
        assert!(parse_index(&deep(MAX_DEPTH + 1))
            .unwrap_err()
            .contains("trop profond"));
    }
}
