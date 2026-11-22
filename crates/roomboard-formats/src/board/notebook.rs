//! Ordre des pages d'un `.notebook` (N6) : `<resource identifier="pages">` de `imsmanifest.xml`, ses `<file href>` dans
//! l'ordre du document. Lecture par `read::parse_tree` (D16 : DOCTYPE ignoré, aucune entité externe).
use super::read::{parse_tree, Node, Notes};
use super::BoardError;
use std::collections::HashSet;

/// `href` normalisés (`\` en `/`, `./` retiré), sans doublon ; aucune ressource `pages` : `Ok(vec![])` (le repli
/// sur l'ordre des noms est celui de l'appelant). Un `href` illisible (entité inconnue) est sauté, comme dans `read.rs`.
pub fn notebook_order(manifest: &[u8]) -> Result<Vec<String>, BoardError> {
    let body = manifest
        .strip_prefix(&[0xEF, 0xBB, 0xBF][..])
        .unwrap_or(manifest);
    let text =
        std::str::from_utf8(body).map_err(|_| BoardError::Broken("manifeste non UTF-8".into()))?;
    let mut notes = Notes::default();
    let root = parse_tree(text, &mut notes)?;
    let mut out: Vec<String> = Vec::new();
    let mut seen: HashSet<String> = HashSet::new();
    if let Some(pages) = find_pages(&root) {
        for f in pages.nodes().filter(|n| n.name == "file") {
            if let Some(h) = f.attr("href") {
                let p = h.replace('\\', "/").trim_start_matches("./").to_string();
                if !p.is_empty() && seen.insert(p.clone()) {
                    out.push(p);
                }
            }
        }
    }
    Ok(out)
}

/// Première ressource `identifier="pages"` dans l'ordre du document (nom local, comme `read.rs`).
fn find_pages(n: &Node) -> Option<&Node> {
    if n.name == "resource" && n.attr("identifier") == Some("pages") {
        return Some(n);
    }
    n.nodes().find_map(find_pages)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Manifeste du scénario S1 (fabriqué) : la ressource `pages` place `page1.svg` avant `page0.svg` ; la ressource
    /// `group0_pages`, placée avant elle, garde l'ordre des noms et ne doit pas être prise.
    const S1: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="SMARTNotebook" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <organizations/>
  <resources>
    <resource identifier="group0_pages" href="page0.svg" type="webcontent" adlcp:scormType="asset">
      <file href="page0.svg"/>
      <file href="page1.svg"/>
    </resource>
    <resource identifier="pages" href="page1.svg" type="webcontent" adlcp:scormType="asset">
      <file href="page1.svg"/>
      <file href="page0.svg"/>
    </resource>
    <resource identifier="images" type="webcontent" adlcp:scormType="asset">
      <file href="images/a.png"/>
    </resource>
  </resources>
</manifest>"#;

    #[test]
    fn notebook_order_follows_the_pages_resource() {
        assert_eq!(
            notebook_order(S1.as_bytes()).expect("manifeste"),
            vec!["page1.svg", "page0.svg"]
        );
    }

    #[test]
    fn notebook_order_normalises_backslashes() {
        let xml = "\u{FEFF}<manifest><resources><resource identifier=\"pages\">\
            <file href=\"pages\\page2.svg\"/><file href=\"./page0.svg\"/><file href=\".\\page0.svg\"/>\
            </resource></resources></manifest>";
        assert_eq!(
            notebook_order(xml.as_bytes()).expect("manifeste"),
            vec!["pages/page2.svg", "page0.svg"]
        );
    }

    #[test]
    fn notebook_order_without_pages_resource_is_empty() {
        let xml = r#"<manifest><resources><resource identifier="group0_pages"><file href="page0.svg"/></resource>
            </resources></manifest>"#;
        assert_eq!(
            notebook_order(xml.as_bytes()).expect("manifeste"),
            Vec::<String>::new()
        );
    }

    /// Patron écarté (D16) : un second lecteur XML ici. `&x;` ne se résout pas, ne refuse pas le manifeste, et les
    /// autres pages restent lues ; un lecteur maison rendrait `Err` (`unescape_value`) ou `"&x;"` (valeur brute).
    #[test]
    fn notebook_order_ignores_doctype_and_external_entities() {
        let xml = r#"<?xml version="1.0"?>
<!DOCTYPE m [<!ENTITY x SYSTEM "file:///etc/passwd">]>
<manifest><resources><resource identifier="pages"><file href="&x;"/><file href="page0.svg"/></resource></resources></manifest>"#;
        let got =
            notebook_order(xml.as_bytes()).expect("DOCTYPE et entité ne refusent pas le manifeste");
        assert_eq!(got, vec!["page0.svg"]);
        assert!(
            got.iter()
                .all(|p| !p.contains("passwd") && !p.contains('&')),
            "{got:?}"
        );
    }

    #[test]
    fn notebook_order_refuses_non_utf8() {
        let xml = b"<manifest><resources><resource identifier=\"pages\"><file href=\"p\xff.svg\"/></resource></resources></manifest>";
        assert!(matches!(notebook_order(xml), Err(BoardError::Broken(_))));
    }

    /// Patron écarté : un lecteur du crate quick-xml écrit à la main ici contournerait la règle DOCTYPE et entités de
    /// `parse_tree` (`read.rs`, D16). Le manifeste passe par `parse_tree`, seul lecteur XML du module `board`.
    #[test]
    fn notebook_reads_the_manifest_through_parse_tree() {
        let src = include_str!("notebook.rs");
        assert!(
            !src.contains(concat!("quick", "_xml")),
            "notebook.rs lit du XML sans parse_tree (D16)"
        );
        assert!(
            src.contains(concat!("parse_tree", "(text")),
            "notebook.rs doit appeler parse_tree (D16)"
        );
    }
}
